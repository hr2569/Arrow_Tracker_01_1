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
import cv2
import numpy as np

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

class PerspectiveCropRequest(BaseModel):
    image_base64: str
    corners: List[dict]  # [{x, y}, {x, y}, {x, y}, {x, y}] - TL, TR, BR, BL
    output_size: int = 800  # Output image size (square)

# ============== Image Processing Functions ==============

def perspective_crop(image_base64: str, corners: List[dict], output_size: int = 800) -> str:
    """Perform perspective crop on an image given 4 corners"""
    try:
        logger.info(f"Perspective crop started. Image length: {len(image_base64)}, Corners: {corners}")
        
        # Check if we received an empty or invalid image
        if not image_base64 or len(image_base64) < 100:
            raise ValueError(f"Image data too short: {len(image_base64)} chars")
        
        # Decode base64 image - handle both data URI and raw base64
        base64_data = image_base64
        if ',' in image_base64:
            parts = image_base64.split(',')
            if len(parts) >= 2:
                base64_data = parts[1]
            else:
                raise ValueError("Invalid data URI format")
        
        logger.info(f"Base64 after split: {len(base64_data)} chars, starts with: {base64_data[:50]}...")
        
        # Validate base64 string
        try:
            image_data = base64.b64decode(base64_data)
        except Exception as e:
            raise ValueError(f"Failed to decode base64: {str(e)}")
        
        logger.info(f"Decoded image data: {len(image_data)} bytes")
        
        if len(image_data) < 100:
            raise ValueError(f"Decoded image data too small: {len(image_data)} bytes")
        
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            # Log more details about the data
            logger.error(f"cv2.imdecode failed. First 50 bytes of image_data: {image_data[:50]}")
            raise ValueError("Failed to decode image - cv2.imdecode returned None. The image data may be corrupted or in an unsupported format.")
        
        height, width = img.shape[:2]
        logger.info(f"Image dimensions: {width}x{height}")
        
        # Convert normalized coordinates to pixel coordinates
        # Corners order: top-left, top-right, bottom-right, bottom-left
        src_points = np.float32([
            [corners[0]['x'] * width, corners[0]['y'] * height],  # TL
            [corners[1]['x'] * width, corners[1]['y'] * height],  # TR
            [corners[2]['x'] * width, corners[2]['y'] * height],  # BR
            [corners[3]['x'] * width, corners[3]['y'] * height],  # BL
        ])
        
        logger.info(f"Source points: {src_points}")
        
        # Destination points (square output)
        dst_points = np.float32([
            [0, 0],
            [output_size, 0],
            [output_size, output_size],
            [0, output_size],
        ])
        
        # Calculate perspective transform matrix
        matrix = cv2.getPerspectiveTransform(src_points, dst_points)
        
        # Apply the transformation
        result = cv2.warpPerspective(img, matrix, (output_size, output_size))
        
        # Encode result to base64
        _, buffer = cv2.imencode('.jpg', result, [cv2.IMWRITE_JPEG_QUALITY, 90])
        result_base64 = base64.b64encode(buffer).decode('utf-8')
        
        logger.info(f"Crop successful. Result size: {len(result_base64)} chars")
        return f"data:image/jpeg;base64,{result_base64}"
        
    except Exception as e:
        logger.error(f"Perspective crop error: {e}")
        raise e

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
            system_message="""You are an expert archery target analyzer. You analyze images of archery targets to detect the WHITE TARGET PAPER boundaries and the colored ring structure.

Your task:
1. Find the 4 corners of the WHITE TARGET PAPER (the square/rectangular paper the target is printed on)
2. Find the CENTER of the colored target rings (yellow bullseye center)
3. Calculate the RADIUS of the outermost ring relative to the paper size

The target has colored rings from outside to inside:
- White (rings 1-2) - outermost
- Black (rings 3-4)
- Blue (rings 5-6)
- Red (rings 7-8)
- Yellow/Gold (rings 9-10) - center/bullseye

Return coordinates as normalized values (0-1) where (0,0) is top-left and (1,1) is bottom-right of the IMAGE.

Respond ONLY in JSON format:
{
  "detected": true,
  "paper_corners": [
    {"x": 0.1, "y": 0.1, "position": "top-left"},
    {"x": 0.9, "y": 0.1, "position": "top-right"},
    {"x": 0.9, "y": 0.9, "position": "bottom-right"},
    {"x": 0.1, "y": 0.9, "position": "bottom-left"}
  ],
  "target_center": {"x": 0.5, "y": 0.5},
  "target_radius": 0.35,
  "confidence": 0.95,
  "message": "Target detected successfully"
}

If no target paper is detected:
{"detected": false, "message": "No archery target paper found in image"}"""
        ).with_model("openai", "gpt-4o")
        
        # Clean base64 string
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        # Create image content - use file_contents parameter (not image_contents)
        image_content = ImageContent(image_base64=image_base64)
        
        user_message = UserMessage(
            text="Analyze this archery target image. Find the 4 corners of the WHITE TARGET PAPER, the center of the bullseye (yellow area), and estimate the radius of the colored target rings relative to the image. Return coordinates in JSON format.",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        logger.info(f"Target analysis response: {response}")
        
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
            
            if result.get('detected', False):
                return {
                    "success": True,
                    "corners": result.get('paper_corners', []),
                    "center": result.get('target_center', {"x": 0.5, "y": 0.5}),
                    "radius": result.get('target_radius', 0.4),
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
            system_message=f"""You are an expert archery target scorer. You analyze images of archery targets with arrows and detect the EXACT POSITION where each arrow PIERCED THE PAPER (entry point).

CRITICAL SCORING RULE:
- The score is determined by WHERE THE ARROW SHAFT ENTERS THE TARGET PAPER
- DO NOT use the fletching (feathers/vanes) position - that's at the back of the arrow
- DO NOT use the nock position - that's the very end
- FIND the point where the arrow shaft pierces/enters the target face
- If the arrow shaft touches a line between two rings, score the HIGHER ring value

The target has 10 scoring rings with these colors (from outside to inside):
- Rings 1-2: White (outermost)
- Rings 3-4: Black
- Rings 5-6: Blue
- Rings 7-8: Red
- Rings 9-10: Yellow/Gold (center bullseye, ring 10 is the innermost X-ring)

The target center is at approximately ({target_center.get('x', 0.5)}, {target_center.get('y', 0.5)}) in normalized coordinates.
The target radius is approximately {target_radius} in normalized coordinates.

For each arrow you detect:
1. Identify the arrow by its fletching (feathers/vanes visible at the back)
2. Trace the arrow shaft FORWARD toward the target to find where it ENTERS the paper
3. Report the coordinates of the ENTRY POINT (not the fletching!)
4. Determine which ring the entry point is in based on the colors
5. Assign the correct score (1-10, with 10 being bullseye center)

Respond ONLY in JSON format:
{{
  "detected": true,
  "arrows": [
    {{"x": 0.52, "y": 0.48, "ring": 9, "confidence": 0.9}},
    {{"x": 0.45, "y": 0.55, "ring": 7, "confidence": 0.85}}
  ],
  "message": "Detected 2 arrows"
}}

If no arrows found:
{{"detected": false, "arrows": [], "message": "No arrows detected"}}"""
        ).with_model("openai", "gpt-4o")
        
        # Clean base64 string
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        # Create image content - use file_contents parameter (not image_contents)
        image_content = ImageContent(image_base64=image_base64)
        
        user_message = UserMessage(
            text=f"""Analyze this archery target image and detect all arrows.

IMPORTANT: For each arrow, find the ENTRY POINT where the arrow shaft pierces the paper - NOT the fletching position!

The target center is at ({target_center.get('x', 0.5)}, {target_center.get('y', 0.5)}) with radius {target_radius}.

For each arrow:
1. Locate the fletching (feathers) to identify the arrow
2. Trace the shaft FORWARD to find where it enters the target
3. Report that entry point's coordinates and which ring (1-10) it's in

Ring colors: White=1-2, Black=3-4, Blue=5-6, Red=7-8, Yellow/Gold=9-10 (center)""",
            file_contents=[image_content]
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

@api_router.post("/perspective-crop")
async def perspective_crop_endpoint(request: PerspectiveCropRequest):
    """Perform perspective crop on an image"""
    try:
        cropped_image = perspective_crop(
            request.image_base64,
            request.corners,
            request.output_size
        )
        return {
            "success": True,
            "cropped_image": cropped_image,
            "message": "Image cropped successfully"
        }
    except Exception as e:
        logger.error(f"Perspective crop error: {e}")
        return {
            "success": False,
            "cropped_image": None,
            "message": str(e)
        }

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
