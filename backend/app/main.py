from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from .database import engine, Base, get_db, SessionLocal
from . import models
from . import schemas
from .agent import InteractionAgent

# Initialize DB tables
Base.metadata.create_all(bind=engine)

# Auto-seed database tables on startup if empty
db = SessionLocal()
try:
    if db.query(models.HCP).count() == 0:
        hcps = [
            models.HCP(name="Dr. Sarah Jenkins", specialty="Cardiology", clinic="Heart Care Clinic, NY", email="sarah.jenkins@heartcare.org", phone="555-0199", last_interaction_date="2026-06-15"),
            models.HCP(name="Dr. Robert Chen", specialty="Oncology", clinic="Metropolitan Oncology Center", email="r.chen@metonc.com", phone="555-0144", last_interaction_date="2026-06-20"),
            models.HCP(name="Dr. Emily Taylor", specialty="Endocrinology", clinic="Diabetes & Thyroid Center", email="emily.taylor@diabetestc.org", phone="555-0177", last_interaction_date="2026-05-10"),
            models.HCP(name="Dr. James Patel", specialty="Cardiology", clinic="Cardiovascular Associates", email="j.patel@cardioassoc.com", phone="555-0122", last_interaction_date="2026-07-01"),
        ]
        db.add_all(hcps)
        
    if db.query(models.Material).count() == 0:
        materials = [
            models.Material(name="OncoBoost Phase III Clinical Trial Results PDF", type="Clinical Paper", description="Comprehensive study on efficacy and side effects of OncoBoost in oncology patients."),
            models.Material(name="CardioCare Efficacy Brochure", type="PDF Brochure", description="Visual patient benefits, dosage charts, and cardiovascular safety profile of CardioCare."),
            models.Material(name="ThyroGlow Prescribing Information", type="Slide Deck", description="Full prescribing guide, indications, contraindications, and dose titration guidelines for ThyroGlow."),
        ]
        db.add_all(materials)

    if db.query(models.Sample).count() == 0:
        samples = [
            models.Sample(name="OncoBoost", dosage="10mg", stock_quantity=100),
            models.Sample(name="CardioCare", dosage="20mg", stock_quantity=250),
            models.Sample(name="ThyroGlow", dosage="50mcg", stock_quantity=150),
        ]
        db.add_all(samples)
        
    db.commit()
    print("Database initialized and auto-seeded successfully!")
except Exception as e:
    db.rollback()
    print(f"Failed to auto-seed database on startup: {e}")
finally:
    db.close()

app = FastAPI(title="AI-First CRM HCP Module Backend")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = InteractionAgent()

# ----------------- DB Seeding Endpoint -----------------
@app.post("/init-db")
def initialize_database(db: Session = Depends(get_db)):
    """
    Seeds initial HCPs, Materials, and Samples if they don't exist.
    """
    # Seed HCPs
    if db.query(models.HCP).count() == 0:
        hcps = [
            models.HCP(name="Dr. Sarah Jenkins", specialty="Cardiology", clinic="Heart Care Clinic, NY", email="sarah.jenkins@heartcare.org", phone="555-0199", last_interaction_date="2026-06-15"),
            models.HCP(name="Dr. Robert Chen", specialty="Oncology", clinic="Metropolitan Oncology Center", email="r.chen@metonc.com", phone="555-0144", last_interaction_date="2026-06-20"),
            models.HCP(name="Dr. Emily Taylor", specialty="Endocrinology", clinic="Diabetes & Thyroid Center", email="emily.taylor@diabetestc.org", phone="555-0177", last_interaction_date="2026-05-10"),
            models.HCP(name="Dr. James Patel", specialty="Cardiology", clinic="Cardiovascular Associates", email="j.patel@cardioassoc.com", phone="555-0122", last_interaction_date="2026-07-01"),
        ]
        db.add_all(hcps)
        
    # Seed Materials
    if db.query(models.Material).count() == 0:
        materials = [
            models.Material(name="OncoBoost Phase III Clinical Trial Results PDF", type="Clinical Paper", description="Comprehensive study on efficacy and side effects of OncoBoost in oncology patients."),
            models.Material(name="CardioCare Efficacy Brochure", type="PDF Brochure", description="Visual patient benefits, dosage charts, and cardiovascular safety profile of CardioCare."),
            models.Material(name="ThyroGlow Prescribing Information", type="Slide Deck", description="Full prescribing guide, indications, contraindications, and dose titration guidelines for ThyroGlow."),
        ]
        db.add_all(materials)

    # Seed Samples
    if db.query(models.Sample).count() == 0:
        samples = [
            models.Sample(name="OncoBoost", dosage="10mg", stock_quantity=100),
            models.Sample(name="CardioCare", dosage="20mg", stock_quantity=250),
            models.Sample(name="ThyroGlow", dosage="50mcg", stock_quantity=150),
        ]
        db.add_all(samples)

    db.commit()
    return {"message": "Database initialized with seed data successfully!"}

# ----------------- HCP Endpoints -----------------
@app.get("/hcps", response_model=List[schemas.HCP])
def get_hcps(query: Optional[str] = None, db: Session = Depends(get_db)):
    if query:
        return db.query(models.HCP).filter(
            (models.HCP.name.ilike(f"%{query}%")) |
            (models.HCP.specialty.ilike(f"%{query}%"))
        ).all()
    return db.query(models.HCP).all()

@app.post("/hcps", response_model=schemas.HCP)
def create_hcp(hcp: schemas.HCPCreate, db: Session = Depends(get_db)):
    db_hcp = models.HCP(**hcp.model_dump())
    db.add(db_hcp)
    db.commit()
    db.refresh(db_hcp)
    return db_hcp

# ----------------- Materials & Samples Endpoints -----------------
@app.get("/materials-samples")
def get_materials_and_samples_endpoint(db: Session = Depends(get_db)):
    materials = db.query(models.Material).all()
    samples = db.query(models.Sample).all()
    return {
        "materials": [schemas.Material.model_validate(m) for m in materials],
        "samples": [schemas.Sample.model_validate(s) for s in samples]
    }

# ----------------- Interaction CRUD Endpoints -----------------
@app.get("/interactions")
def get_interactions(db: Session = Depends(get_db)):
    interactions = db.query(models.Interaction).order_by(models.Interaction.id.desc()).all()
    result = []
    for inter in interactions:
        result.append({
            "id": inter.id,
            "hcp_id": inter.hcp_id,
            "hcp_name": inter.hcp.name if inter.hcp else "Unknown",
            "date": inter.date,
            "time": inter.time,
            "interaction_type": inter.interaction_type,
            "attendees": json.loads(inter.attendees) if inter.attendees else [],
            "topics_discussed": inter.topics_discussed,
            "materials_shared": json.loads(inter.materials_shared) if inter.materials_shared else [],
            "samples_distributed": json.loads(inter.samples_distributed) if inter.samples_distributed else [],
            "sentiment": inter.sentiment,
            "outcomes": inter.outcomes,
            "follow_up_actions": inter.follow_up_actions,
            "ai_suggested_followups": json.loads(inter.ai_suggested_followups) if inter.ai_suggested_followups else []
        })
    return result

@app.post("/interactions")
def create_interaction(interaction: schemas.InteractionCreate, db: Session = Depends(get_db)):
    # Verify HCP
    hcp = db.query(models.HCP).filter(models.HCP.id == interaction.hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")

    # Validate stock before making any updates
    for sample_item in interaction.samples_distributed:
        db_sample = db.query(models.Sample).filter(models.Sample.id == sample_item.id).first()
        if not db_sample:
            raise HTTPException(status_code=400, detail=f"Sample with ID {sample_item.id} not found in catalog")
        if sample_item.quantity < 0:
            raise HTTPException(status_code=400, detail="Sample quantity cannot be negative")
        if db_sample.stock_quantity < sample_item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for sample '{db_sample.name}'. Requested: {sample_item.quantity}, Available: {db_sample.stock_quantity}")

    # Deduct Sample Stock (safe since all validations passed)
    for sample_item in interaction.samples_distributed:
        db_sample = db.query(models.Sample).filter(models.Sample.id == sample_item.id).first()
        db_sample.stock_quantity -= sample_item.quantity

    db_inter = models.Interaction(
        hcp_id=interaction.hcp_id,
        date=interaction.date,
        time=interaction.time,
        interaction_type=interaction.interaction_type,
        attendees=json.dumps(interaction.attendees),
        topics_discussed=interaction.topics_discussed,
        materials_shared=json.dumps([m.model_dump() for m in interaction.materials_shared]),
        samples_distributed=json.dumps([s.model_dump() for s in interaction.samples_distributed]),
        sentiment=interaction.sentiment,
        outcomes=interaction.outcomes,
        follow_up_actions=interaction.follow_up_actions,
        ai_suggested_followups=json.dumps(interaction.ai_suggested_followups)
    )
    db.add(db_inter)
    hcp.last_interaction_date = interaction.date
    db.commit()
    db.refresh(db_inter)
    
    return {"message": "Interaction logged successfully via Form", "id": db_inter.id}

@app.put("/interactions/{id}")
def update_interaction(id: int, interaction: schemas.InteractionCreate, db: Session = Depends(get_db)):
    db_inter = db.query(models.Interaction).filter(models.Interaction.id == id).first()
    if not db_inter:
        raise HTTPException(status_code=404, detail="Interaction not found")

    # Step A: Restore old stocks temporarily in this transaction
    old_samples = []
    if db_inter.samples_distributed:
        try:
            old_samples = json.loads(db_inter.samples_distributed)
        except:
            pass
            
    for old_item in old_samples:
        oid = old_item.get("id")
        oqty = old_item.get("quantity", 0)
        if oid:
            db_sample = db.query(models.Sample).filter(models.Sample.id == oid).first()
            if db_sample:
                db_sample.stock_quantity += oqty

    # Step B: Validate new stocks sufficiency
    for new_item in interaction.samples_distributed:
        db_sample = db.query(models.Sample).filter(models.Sample.id == new_item.id).first()
        if not db_sample:
            raise HTTPException(status_code=400, detail=f"Sample with ID {new_item.id} not found in catalog")
        if new_item.quantity < 0:
            raise HTTPException(status_code=400, detail="Sample quantity cannot be negative")
        if db_sample.stock_quantity < new_item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for sample '{db_sample.name}' during update. Available: {db_sample.stock_quantity}, Requested: {new_item.quantity}")

    # Step C: Deduct new stocks
    for new_item in interaction.samples_distributed:
        db_sample = db.query(models.Sample).filter(models.Sample.id == new_item.id).first()
        db_sample.stock_quantity -= new_item.quantity

    db_inter.hcp_id = interaction.hcp_id
    db_inter.date = interaction.date
    db_inter.time = interaction.time
    db_inter.interaction_type = interaction.interaction_type
    db_inter.attendees = json.dumps(interaction.attendees)
    db_inter.topics_discussed = interaction.topics_discussed
    db_inter.materials_shared = json.dumps([m.model_dump() for m in interaction.materials_shared])
    db_inter.samples_distributed = json.dumps([s.model_dump() for s in interaction.samples_distributed])
    db_inter.sentiment = interaction.sentiment
    db_inter.outcomes = interaction.outcomes
    db_inter.follow_up_actions = interaction.follow_up_actions
    db_inter.ai_suggested_followups = json.dumps(interaction.ai_suggested_followups)
    
    db.commit()
    return {"message": "Interaction updated successfully via Form", "id": id}

@app.delete("/interactions/{id}")
def delete_interaction(id: int, db: Session = Depends(get_db)):
    db_inter = db.query(models.Interaction).filter(models.Interaction.id == id).first()
    if not db_inter:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    # Restore sample stocks on deletion
    old_samples = []
    if db_inter.samples_distributed:
        try:
            old_samples = json.loads(db_inter.samples_distributed)
        except:
            pass
            
    for old_item in old_samples:
        oid = old_item.get("id")
        oqty = old_item.get("quantity", 0)
        if oid:
            db_sample = db.query(models.Sample).filter(models.Sample.id == oid).first()
            if db_sample:
                db_sample.stock_quantity += oqty
                
    db.delete(db_inter)
    db.commit()
    return {"message": f"Interaction {id} deleted successfully"}

# ----------------- AI Chat Endpoint -----------------
@app.post("/chat", response_model=schemas.ChatResponse)
def chat_with_agent(req: schemas.ChatRequest):
    # If the frontend passes current form state, we extract it.
    form_dict = {}
    if req.current_form_state:
        form_dict = {
            "hcp_id": req.current_form_state.hcp_id,
            "date": req.current_form_state.date,
            "time": req.current_form_state.time,
            "interaction_type": req.current_form_state.interaction_type,
            "attendees": req.current_form_state.attendees,
            "topics_discussed": req.current_form_state.topics_discussed,
            "materials_shared": [m.model_dump() for m in req.current_form_state.materials_shared],
            "samples_distributed": [s.model_dump() for s in req.current_form_state.samples_distributed],
            "sentiment": req.current_form_state.sentiment,
            "outcomes": req.current_form_state.outcomes,
            "follow_up_actions": req.current_form_state.follow_up_actions,
            "ai_suggested_followups": req.current_form_state.ai_suggested_followups
        }
    
    result = agent.run_agent(req.message, form_dict, req.session_id)
    
    # Map raw form dict back to schemas.InteractionBase
    f_state = result.get("form_state")
    pydantic_form = None
    if f_state:
        # Load hcp if hcp_id is set
        pydantic_form = schemas.InteractionBase(
            hcp_id=f_state.get("hcp_id") or 0,
            date=f_state.get("date") or "",
            time=f_state.get("time") or "",
            interaction_type=f_state.get("interaction_type") or "Meeting",
            attendees=f_state.get("attendees") or [],
            topics_discussed=f_state.get("topics_discussed") or "",
            materials_shared=[schemas.SharedMaterial(**m) for m in f_state.get("materials_shared", [])],
            samples_distributed=[schemas.DistributedSample(**s) for s in f_state.get("samples_distributed", [])],
            sentiment=f_state.get("sentiment") or "Neutral",
            outcomes=f_state.get("outcomes") or "",
            follow_up_actions=f_state.get("follow_up_actions") or "",
            ai_suggested_followups=f_state.get("ai_suggested_followups") or []
        )
        
    return schemas.ChatResponse(
        reply=result.get("reply"),
        session_id=result.get("session_id"),
        form_state=pydantic_form,
        tools_called=result.get("tools_called", [])
    )
