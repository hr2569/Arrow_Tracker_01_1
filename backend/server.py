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
import base64
import json
import asyncio

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
    rounds: List[Round] = []
    total_score: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CreateSessionRequest(BaseModel):
    name: Optional[str] = ""

class ImageAnalysisRequest(BaseModel):
    image_base64: str

class TargetAnalysisResponse(BaseModel):
    success: bool
    corners: Optional[List[dict]] = None  # [{x, y}, ...] 4 corners
    message: str = ""

class ArrowDetectionResponse(BaseModel):
    success: bool
    arrows: List[dict] = []  # [{x, y, ring, confidence}, ...]
    message: str = ""

class AddRoundRequest(BaseModel):
    round_number: int
    shots: List[dict]  # [{x, y, ring}, ...]

class UpdateRoundRequest(BaseModel):
    shots: List[dict]

# ============== AI Analysis Functions ==============

async def analyze_target_corners(image_base64: str) -> dict:
    """Use AI to detect target corners in the image"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        api_key = os.environ.get('EMERGENT_LLM_KEY', '')
        if not api_key:
            return {"success": False, "message": "API key not configured"}
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"target-analysis-{uuid.uuid4()}",
            system_message="""You are an expert archery target analyzer. You analyze images of archery targets and detect the four corners of the target face.
            
Your task is to identify the bounding corners of the circular target. Return the corners as normalized coordinates (0-1) where (0,0) is top-left and (1,1) is bottom-right of the image.

Respond ONLY in JSON format like this:
{
  "detected": true,
  "corners": [
    {"x": 0.1, "y": 0.1, "position": "top-left"},
    {"x": 0.9, "y": 0.1, "position": "top-right"},
    {"x": 0.9, "y": 0.9, "position": "bottom-right"},
    {"x": 0.1, "y": 0.9, "position": "bottom-left"}
  ],
  "center": {"x": 0.5, "y": 0.5},
  "radius": 0.4,
  "confidence": 0.95,
  "message": "Target detected successfully"
}

If no target is detected, respond:
{"detected": false, "message": "No archery target found in image"}"""
        ).with_model("openai", "gpt-4o")
        
        # Clean base64 string
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        image_content = ImageContent(image_base64=image_base64)
        
        user_message = UserMessage(
            text="Analyze this archery target image. Detect the four corners of the target face (the bounding box around the circular target). Return the coordinates in JSON format.",
            image_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        logger.info(f"Target analysis response: {response}")
        
        # Parse JSON from response
        try:
            # Try to extract JSON from response
            response_text = response.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            result = json.loads(response_text.strip())
            
            if result.get('detected', False):
                return {
                    "success": True,
                    "corners": result.get('corners', []),
                    "center": result.get('center', {"x": 0.5, "y": 0.5}),
                    "radius": result.get('radius', 0.4),
                    "confidence": result.get('confidence', 0.8),
                    "message": result.get('message', 'Target detected')
                }
            else:
                return {"success": False, "message": result.get('message', 'No target detected')}
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}, response: {response}")
            return {"success": False, "message": f"Failed to parse AI response: {str(e)}"}
            
    except Exception as e:
        logger.error(f"Target analysis error: {e}")
        return {"success": False, "message": str(e)}

async def detect_arrows(image_base64: str, target_center: dict, target_radius: float) -> dict:
    """Use AI to detect arrow positions in the target image"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        api_key = os.environ.get('EMERGENT_LLM_KEY', '')
        if not api_key:
            return {"success": False, "message": "API key not configured"}
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"arrow-detection-{uuid.uuid4()}",
            system_message="""You are an expert archery target scorer. You analyze images of archery targets with arrows and detect the position of each arrow hit.

The target has 10 scoring rings:
- Ring 10 (innermost, gold/yellow): X (center dot)
- Ring 9 (gold/yellow): Inner gold
- Ring 8 (red): Inner red
- Ring 7 (red): Outer red  
- Ring 6 (blue): Inner blue
- Ring 5 (blue): Outer blue
- Ring 4 (black): Inner black
- Ring 3 (black): Outer black
- Ring 2 (white): Inner white
- Ring 1 (white): Outer white

For each arrow you detect, determine which ring it hit based on its position from the center.

Respond ONLY in JSON format:
{
  "detected": true,
  "arrows": [
    {"x": 0.52, "y": 0.48, "ring": 9, "confidence": 0.9},
    {"x": 0.45, "y": 0.55, "ring": 7, "confidence": 0.85}
  ],
  "message": "Detected 2 arrows"
}

Coordinates are normalized (0-1) relative to the image. If no arrows found:
{"detected": false, "arrows": [], "message": "No arrows detected"}"""
        ).with_model("openai", "gpt-4o")
        
        # Clean base64 string
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        image_content = ImageContent(image_base64=image_base64)
        
        user_message = UserMessage(
            text=f"Analyze this archery target image and detect all arrow hits. The target center is approximately at ({target_center.get('x', 0.5)}, {target_center.get('y', 0.5)}) with radius {target_radius}. For each arrow, determine its position and which scoring ring (1-10) it hit.",
            image_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        logger.info(f"Arrow detection response: {response}")
        
        # Parse JSON from response
        try:
            response_text = response.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            result = json.loads(response_text.strip())
            
            return {
                "success": True,
                "arrows": result.get('arrows', []),
                "message": result.get('message', 'Analysis complete')
            }
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            return {"success": False, "arrows": [], "message": f"Failed to parse AI response: {str(e)}"}
            
    except Exception as e:
        logger.error(f"Arrow detection error: {e}")
        return {"success": False, "arrows": [], "message": str(e)}

# ============== API Routes ==============

@api_router.get("/")
async def root():
    return {"message": "Archery Target Scoring API"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Target Analysis Endpoints
@api_router.post("/analyze-target")
async def analyze_target(request: ImageAnalysisRequest):
    """Analyze image to detect target corners"""
    result = await analyze_target_corners(request.image_base64)
    return result

@api_router.post("/detect-arrows")
async def detect_arrows_endpoint(request: ImageAnalysisRequest):
    """Detect arrow positions in target image"""
    # First analyze target to get center and radius
    target_result = await analyze_target_corners(request.image_base64)
    
    if not target_result.get('success'):
        return {"success": False, "arrows": [], "message": "Could not detect target in image"}
    
    center = target_result.get('center', {"x": 0.5, "y": 0.5})
    radius = target_result.get('radius', 0.4)
    
    # Now detect arrows
    result = await detect_arrows(request.image_base64, center, radius)
    return result

# Session Management Endpoints
@api_router.post("/sessions")
async def create_session(request: CreateSessionRequest):
    """Create a new scoring session"""
    session = Session(
        name=request.name or f"Session {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
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
    session['rounds'].append(new_round.dict())
    session['total_score'] = sum(r['total_score'] for r in session['rounds'])
    session['updated_at'] = datetime.utcnow()
    
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": session}
    )
    
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
    session['updated_at'] = datetime.utcnow()
    
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": session}
    )
    
    return session

@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session"""
    result = await db.sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted"}

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
