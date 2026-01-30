from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import json
import firebase_admin
from firebase_admin import credentials, firestore

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Firebase initialization
firebase_creds = os.environ.get('FIREBASE_CREDENTIALS')
if firebase_creds:
    cred_dict = json.loads(firebase_creds)
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)
else:
    # For local development with service account file
    cred = credentials.Certificate(ROOT_DIR / 'firebase-credentials.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()

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
    x: float
    y: float
    ring: int
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
    target_type: Optional[str] = "wa_standard"
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
    created_at: Optional[str] = None

class Bow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    bow_type: str
    draw_weight: Optional[float] = None
    draw_length: Optional[float] = None
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
    shots: List[dict]

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
    session_dict['created_at'] = session_dict['created_at'].isoformat()
    session_dict['updated_at'] = session_dict['updated_at'].isoformat()
    
    # Convert rounds' created_at to string
    for round_data in session_dict['rounds']:
        if isinstance(round_data.get('created_at'), datetime):
            round_data['created_at'] = round_data['created_at'].isoformat()
    
    db.collection('sessions').document(session.id).set(session_dict)
    return session_dict

@api_router.get("/sessions")
async def get_sessions():
    """Get all scoring sessions"""
    sessions_ref = db.collection('sessions').order_by('created_at', direction=firestore.Query.DESCENDING).limit(100)
    sessions = []
    for doc in sessions_ref.stream():
        sessions.append(doc.to_dict())
    return sessions

@api_router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get a specific session"""
    doc = db.collection('sessions').document(session_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Session not found")
    return doc.to_dict()

@api_router.post("/sessions/{session_id}/rounds")
async def add_round(session_id: str, request: AddRoundRequest):
    """Add a round to a session"""
    doc_ref = db.collection('sessions').document(session_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = doc.to_dict()
    
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
    
    while len(shots) < 3:
        shots.append(Shot(x=0, y=0, ring=0, confirmed=True))
    
    new_round = Round(
        round_number=request.round_number,
        shots=[s.dict() for s in shots],
        total_score=round_total
    )
    
    new_round_dict = new_round.dict()
    new_round_dict['created_at'] = new_round_dict['created_at'].isoformat()
    
    session['rounds'].append(new_round_dict)
    session['total_score'] = sum(r['total_score'] for r in session['rounds'])
    session['updated_at'] = datetime.utcnow().isoformat()
    
    doc_ref.set(session)
    return session

@api_router.put("/sessions/{session_id}/rounds/{round_id}")
async def update_round(session_id: str, round_id: str, request: UpdateRoundRequest):
    """Update a specific round"""
    doc_ref = db.collection('sessions').document(session_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = doc.to_dict()
    
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
            
            while len(shots) < 3:
                shots.append(Shot(x=0, y=0, ring=0, confirmed=True))
            
            session['rounds'][i]['shots'] = [s.dict() for s in shots]
            session['rounds'][i]['total_score'] = round_total
            break
    
    if not round_found:
        raise HTTPException(status_code=404, detail="Round not found")
    
    session['total_score'] = sum(r['total_score'] for r in session['rounds'])
    session['updated_at'] = datetime.utcnow().isoformat()
    
    doc_ref.set(session)
    return session

@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session"""
    doc_ref = db.collection('sessions').document(session_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Session not found")
    doc_ref.delete()
    return {"message": "Session deleted"}

@api_router.put("/sessions/{session_id}")
async def update_session(session_id: str, request: UpdateSessionRequest):
    """Update a session's details"""
    doc_ref = db.collection('sessions').document(session_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = doc.to_dict()
    
    if request.name is not None:
        session['name'] = request.name
    if request.bow_id is not None:
        session['bow_id'] = request.bow_id
    if request.bow_name is not None:
        session['bow_name'] = request.bow_name
    if request.distance is not None:
        session['distance'] = request.distance
    if request.target_type is not None:
        session['target_type'] = request.target_type
    if request.created_at is not None:
        try:
            parsed_date = datetime.fromisoformat(request.created_at.replace('Z', '+00:00'))
            session['created_at'] = parsed_date.isoformat()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    
    session['updated_at'] = datetime.utcnow().isoformat()
    
    doc_ref.set(session)
    return session

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
    
    db.collection('bows').document(bow.id).set(bow_dict)
    return bow_dict

@api_router.get("/bows")
async def get_bows():
    """Get all bows"""
    bows_ref = db.collection('bows').order_by('created_at', direction=firestore.Query.DESCENDING).limit(100)
    bows = []
    for doc in bows_ref.stream():
        bows.append(doc.to_dict())
    return bows

@api_router.get("/bows/{bow_id}")
async def get_bow(bow_id: str):
    """Get a specific bow"""
    doc = db.collection('bows').document(bow_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Bow not found")
    return doc.to_dict()

@api_router.put("/bows/{bow_id}")
async def update_bow(bow_id: str, request: UpdateBowRequest):
    """Update a bow"""
    doc_ref = db.collection('bows').document(bow_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Bow not found")
    
    bow = doc.to_dict()
    
    if request.name is not None:
        bow['name'] = request.name
    if request.bow_type is not None:
        bow['bow_type'] = request.bow_type
    if request.draw_weight is not None:
        bow['draw_weight'] = request.draw_weight
    if request.draw_length is not None:
        bow['draw_length'] = request.draw_length
    if request.notes is not None:
        bow['notes'] = request.notes
    
    bow['updated_at'] = datetime.utcnow().isoformat()
    
    doc_ref.set(bow)
    return bow

@api_router.delete("/bows/{bow_id}")
async def delete_bow(bow_id: str):
    """Delete a bow"""
    doc_ref = db.collection('bows').document(bow_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Bow not found")
    doc_ref.delete()
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
