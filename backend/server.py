from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== Models ==============

class Shot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    x: float  # Normalized position (0-1) from center
    y: float  # Normalized position (0-1) from center
    ring: int  # 1-10 points
    confirmed: bool = False

class Round(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    round_number: int
    shots: List[Shot] = []
    total_score: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    bow_id: Optional[str] = None
    bow_name: Optional[str] = None
    distance: Optional[str] = None
    target_type: Optional[str] = "wa_standard"  # wa_standard, vegas_3spot, nfaa_indoor
    rounds: List[Round] = []
    total_score: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CreateSessionRequest(BaseModel):
    name: Optional[str] = ""
    bow_id: Optional[str] = None
    bow_name: Optional[str] = None
    distance: Optional[str] = None
    target_type: Optional[str] = "wa_standard"

class UpdateSessionRequest(BaseModel):
    name: Optional[str] = None
    bow_id: Optional[str] = None
    bow_name: Optional[str] = None
    distance: Optional[str] = None
    target_type: Optional[str] = None
    created_at: Optional[str] = None  # ISO format date string

# Bow model for equipment tracking
class Bow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    bow_type: str  # recurve, compound, longbow, barebow, etc.
    draw_weight: Optional[float] = None  # in pounds
    draw_length: Optional[float] = None  # in inches
    notes: Optional[str] = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CreateBowRequest(BaseModel):
    name: str
    bow_type: str
    draw_weight: Optional[float] = None
    draw_length: Optional[float] = None
    notes: Optional[str] = ""

class UpdateBowRequest(BaseModel):
    name: Optional[str] = None
    bow_type: Optional[str] = None
    draw_weight: Optional[float] = None
    draw_length: Optional[float] = None
    notes: Optional[str] = None

class AddRoundRequest(BaseModel):
    round_number: int
    shots: List[dict]  # [{x, y, ring}, ...]

class UpdateRoundRequest(BaseModel):
    shots: List[dict]

# ============== API Routes ==============

@api_router.get("/")
async def root():
    return {"message": "Archery Target Scoring API"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Session Management Endpoints
@api_router.post("/sessions")
async def create_session(request: CreateSessionRequest):
    """Create a new scoring session"""
    session = Session(
        name=request.name or f"Session {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
        bow_id=request.bow_id,
        bow_name=request.bow_name,
        distance=request.distance,
        target_type=request.target_type or "wa_standard"
    )
    session_dict = session.dict()
    # Convert datetime to ISO string for JSON serialization
    session_dict['created_at'] = session_dict['created_at'].isoformat()
    session_dict['updated_at'] = session_dict['updated_at'].isoformat()
    await db.sessions.insert_one(session_dict)
    # Remove MongoDB _id from response
    session_dict.pop('_id', None)
    return session_dict

@api_router.get("/sessions")
async def get_sessions():
    """Get all scoring sessions"""
    sessions = await db.sessions.find().sort("created_at", -1).to_list(100)
    # Remove MongoDB _id from response
    for session in sessions:
        session.pop('_id', None)
    return sessions

@api_router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get a specific session"""
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.pop('_id', None)
    return session

@api_router.post("/sessions/{session_id}/rounds")
async def add_round(session_id: str, request: AddRoundRequest):
    """Add a round to a session"""
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Create shots with proper scoring
    shots = []
    round_total = 0
    for shot_data in request.shots:
        shot = Shot(
            x=shot_data.get('x', 0),
            y=shot_data.get('y', 0),
            ring=shot_data.get('ring', 0),
            confirmed=True
        )
        shots.append(shot)
        round_total += shot.ring
    
    # Ensure minimum 3 shots per round (add 0-score shots if needed)
    while len(shots) < 3:
        shots.append(Shot(x=0, y=0, ring=0, confirmed=True))
    
    new_round = Round(
        round_number=request.round_number,
        shots=[s.dict() for s in shots],
        total_score=round_total
    )
    
    # Update session
    new_round_dict = new_round.dict()
    new_round_dict['created_at'] = new_round_dict['created_at'].isoformat()
    
    session['rounds'].append(new_round_dict)
    session['total_score'] = sum(r['total_score'] for r in session['rounds'])
    session['updated_at'] = datetime.utcnow().isoformat()
    
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": session}
    )
    
    session.pop('_id', None)
    return session

@api_router.put("/sessions/{session_id}/rounds/{round_id}")
async def update_round(session_id: str, round_id: str, request: UpdateRoundRequest):
    """Update a specific round"""
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Find and update the round
    round_found = False
    for i, round_data in enumerate(session['rounds']):
        if round_data['id'] == round_id:
            round_found = True
            shots = []
            round_total = 0
            for shot_data in request.shots:
                shot = Shot(
                    x=shot_data.get('x', 0),
                    y=shot_data.get('y', 0),
                    ring=shot_data.get('ring', 0),
                    confirmed=True
                )
                shots.append(shot)
                round_total += shot.ring
            
            # Ensure minimum 3 shots
            while len(shots) < 3:
                shots.append(Shot(x=0, y=0, ring=0, confirmed=True))
            
            session['rounds'][i]['shots'] = [s.dict() for s in shots]
            session['rounds'][i]['total_score'] = round_total
            break
    
    if not round_found:
        raise HTTPException(status_code=404, detail="Round not found")
    
    # Recalculate total
    session['total_score'] = sum(r['total_score'] for r in session['rounds'])
    session['updated_at'] = datetime.utcnow().isoformat()
    
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": session}
    )
    
    session.pop('_id', None)
    return session

@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session"""
    result = await db.sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted"}

@api_router.put("/sessions/{session_id}")
async def update_session(session_id: str, request: UpdateSessionRequest):
    """Update a session's details including date"""
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    update_data = {}
    if request.name is not None:
        update_data['name'] = request.name
    if request.bow_id is not None:
        update_data['bow_id'] = request.bow_id
    if request.bow_name is not None:
        update_data['bow_name'] = request.bow_name
    if request.distance is not None:
        update_data['distance'] = request.distance
    if request.target_type is not None:
        update_data['target_type'] = request.target_type
    if request.created_at is not None:
        # Parse ISO format date string
        try:
            parsed_date = datetime.fromisoformat(request.created_at.replace('Z', '+00:00'))
            update_data['created_at'] = parsed_date.isoformat()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    
    update_data['updated_at'] = datetime.utcnow().isoformat()
    
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": update_data}
    )
    
    updated_session = await db.sessions.find_one({"id": session_id})
    updated_session.pop('_id', None)
    return updated_session

# ============== Bow Management Endpoints ==============

@api_router.post("/bows")
async def create_bow(request: CreateBowRequest):
    """Create a new bow"""
    bow = Bow(
        name=request.name,
        bow_type=request.bow_type,
        draw_weight=request.draw_weight,
        draw_length=request.draw_length,
        notes=request.notes or ""
    )
    bow_dict = bow.dict()
    bow_dict['created_at'] = bow_dict['created_at'].isoformat()
    bow_dict['updated_at'] = bow_dict['updated_at'].isoformat()
    await db.bows.insert_one(bow_dict)
    bow_dict.pop('_id', None)
    return bow_dict

@api_router.get("/bows")
async def get_bows():
    """Get all bows"""
    bows = await db.bows.find().sort("created_at", -1).to_list(100)
    for bow in bows:
        bow.pop('_id', None)
    return bows

@api_router.get("/bows/{bow_id}")
async def get_bow(bow_id: str):
    """Get a specific bow"""
    bow = await db.bows.find_one({"id": bow_id})
    if not bow:
        raise HTTPException(status_code=404, detail="Bow not found")
    bow.pop('_id', None)
    return bow

@api_router.put("/bows/{bow_id}")
async def update_bow(bow_id: str, request: UpdateBowRequest):
    """Update a bow"""
    bow = await db.bows.find_one({"id": bow_id})
    if not bow:
        raise HTTPException(status_code=404, detail="Bow not found")
    
    update_data = {}
    if request.name is not None:
        update_data['name'] = request.name
    if request.bow_type is not None:
        update_data['bow_type'] = request.bow_type
    if request.draw_weight is not None:
        update_data['draw_weight'] = request.draw_weight
    if request.draw_length is not None:
        update_data['draw_length'] = request.draw_length
    if request.notes is not None:
        update_data['notes'] = request.notes
    
    update_data['updated_at'] = datetime.utcnow().isoformat()
    
    await db.bows.update_one(
        {"id": bow_id},
        {"$set": update_data}
    )
    
    updated_bow = await db.bows.find_one({"id": bow_id})
    updated_bow.pop('_id', None)
    return updated_bow

@api_router.delete("/bows/{bow_id}")
async def delete_bow(bow_id: str):
    """Delete a bow"""
    result = await db.bows.delete_one({"id": bow_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bow not found")
    return {"message": "Bow deleted"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
