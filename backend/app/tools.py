from langchain_core.tools import tool
from .database import SessionLocal
from . import models
import json
from typing import List, Optional

@tool
def search_hcp(query: str) -> str:
    """
    Search the HCP database by name or specialty.
    Args:
        query: Name or specialty of the HCP (e.g. 'Sarah', 'Cardiology').
    Returns:
        JSON string containing success state, message, and matching HCP profiles with their 5 most recent interactions.
    """
    db = SessionLocal()
    try:
        hcps = db.query(models.HCP).filter(
            (models.HCP.name.ilike(f"%{query}%")) | 
            (models.HCP.specialty.ilike(f"%{query}%"))
        ).all()
        
        result = []
        for hcp in hcps:
            hcp_info = {
                "id": hcp.id,
                "name": hcp.name,
                "specialty": hcp.specialty,
                "clinic": hcp.clinic,
                "email": hcp.email,
                "last_interaction_date": hcp.last_interaction_date,
                "recent_interactions": []
            }
            # Retrieve up to the latest 5 interactions (increased from 2)
            last_interactions = db.query(models.Interaction).filter(
                models.Interaction.hcp_id == hcp.id
            ).order_by(models.Interaction.id.desc()).limit(5).all()
            
            for inter in last_interactions:
                hcp_info["recent_interactions"].append({
                    "id": inter.id,
                    "date": inter.date,
                    "type": inter.interaction_type,
                    "topics": inter.topics_discussed,
                    "sentiment": inter.sentiment,
                    "outcomes": inter.outcomes
                })
            result.append(hcp_info)
            
        return json.dumps({
            "success": True,
            "message": f"Found {len(result)} HCPs matching query '{query}'",
            "data": result
        }, indent=2)
    except Exception as e:
        db.rollback()
        return json.dumps({
            "success": False,
            "error": f"Failed to search HCPs: {str(e)}"
        })
    finally:
        db.close()

@tool
def get_marketing_materials_and_samples() -> str:
    """
    Retrieve lists of available drug samples (dosage and stock quantity) and 
    marketing/promotional materials (such as PDFs, trial brochures, or sheets).
    Returns:
        JSON string containing success state and catalog lists.
    """
    db = SessionLocal()
    try:
        materials = db.query(models.Material).all()
        samples = db.query(models.Sample).all()
        
        m_list = [{"id": m.id, "name": m.name, "type": m.type, "description": m.description} for m in materials]
        s_list = [{"id": s.id, "name": s.name, "dosage": s.dosage, "stock": s.stock_quantity} for s in samples]
        
        return json.dumps({
            "success": True,
            "message": "Fetched materials and samples successfully.",
            "data": {
                "available_materials": m_list,
                "available_samples": s_list
            }
        }, indent=2)
    except Exception as e:
        db.rollback()
        return json.dumps({
            "success": False,
            "error": f"Failed to retrieve catalog: {str(e)}"
        })
    finally:
        db.close()

@tool
def create_followup_task(
    title: str = "Send clinical materials",
    due_date: str = "2026-07-24",
    interaction_id: Optional[int] = None
) -> str:
    """
    Schedules a follow-up action or task for a given date.
    Args:
        title: The description/title of the task.
        due_date: The date by which it should be done (YYYY-MM-DD).
        interaction_id: The ID of the interaction this task is tied to.
    Returns:
        JSON string confirming task creation success or failure.
    """
    if interaction_id is None:
        return json.dumps({
            "success": False,
            "error": "Missing required parameter: interaction_id. A task must be scheduled for an existing logged interaction."
        })

    db = SessionLocal()
    try:
        # 1. Validate interaction exists
        interaction = db.query(models.Interaction).filter(models.Interaction.id == interaction_id).first()
        if not interaction:
            return json.dumps({
                "success": False,
                "error": f"Interaction with ID {interaction_id} not found. Cannot schedule task."
            })
            
        # 2. Prevent duplicate tasks with the same title for the same interaction
        existing = db.query(models.FollowUpTask).filter(
            models.FollowUpTask.interaction_id == interaction_id,
            models.FollowUpTask.title == title
        ).first()
        if existing:
            return json.dumps({
                "success": False,
                "error": f"A task with the title '{title}' is already scheduled for interaction #{interaction_id}."
            })
            
        # 3. Create task
        new_task = models.FollowUpTask(
            title=title,
            due_date=due_date,
            status="Pending",
            interaction_id=interaction_id
        )
        db.add(new_task)
        db.commit()
        db.refresh(new_task)
        
        return json.dumps({
            "success": True,
            "message": f"Successfully scheduled follow-up task: '{title}'",
            "data": {
                "id": new_task.id,
                "title": new_task.title,
                "due_date": new_task.due_date,
                "status": new_task.status,
                "interaction_id": new_task.interaction_id
            }
        })
    except Exception as e:
        db.rollback()
        return json.dumps({
            "success": False,
            "error": f"Failed to create task: {str(e)}"
        })
    finally:
        db.close()

@tool
def log_interaction(
    hcp_id: int,
    date: str,
    time: str,
    interaction_type: str,
    attendees: List[str],
    topics_discussed: str,
    materials_shared: List[dict],
    samples_distributed: List[dict],
    sentiment: str,
    outcomes: str,
    follow_up_actions: str,
    ai_suggested_followups: List[str]
) -> str:
    """
    Saves a new interaction log into the database with all captured details.
    
    Args:
        hcp_id: ID of the HCP.
        date: Date of interaction (YYYY-MM-DD).
        time: Time of interaction (HH:MM).
        interaction_type: Type of interaction (e.g. 'Meeting', 'Call').
        attendees: List of attendee names.
        topics_discussed: Summary of what was discussed.
        materials_shared: List of shared materials, where each dict has 'id' and 'name'.
        samples_distributed: List of distributed samples, where each dict has 'id', 'name', and 'quantity'.
        sentiment: Sentiment of HCP ('Positive', 'Neutral', 'Negative').
        outcomes: Agreed key outcomes.
        follow_up_actions: Next steps defined by the representative.
        ai_suggested_followups: Suggested items for follow-up.
    Returns:
        JSON string containing success status, message, and form state details.
    """
    db = SessionLocal()
    try:
        # 1. Validate HCP exists
        hcp = db.query(models.HCP).filter(models.HCP.id == hcp_id).first()
        if not hcp:
            return json.dumps({
                "success": False,
                "error": f"HCP with ID {hcp_id} does not exist in the database."
            })
            
        # 2. Validate every sample exists and check stock BEFORE making any database updates
        for sample_item in samples_distributed:
            sample_id = sample_item.get("id")
            qty = sample_item.get("quantity", 0)
            if not sample_id:
                return json.dumps({
                    "success": False,
                    "error": "Invalid drug sample details: missing 'id'."
                })
            
            db_sample = db.query(models.Sample).filter(models.Sample.id == sample_id).first()
            if not db_sample:
                return json.dumps({
                    "success": False,
                    "error": f"Drug sample with ID {sample_id} not found in catalog."
                })
                
            if qty < 0:
                return json.dumps({
                    "success": False,
                    "error": f"Cannot distribute negative quantity of sample '{db_sample.name}'."
                })
                
            if db_sample.stock_quantity < qty:
                return json.dumps({
                    "success": False,
                    "error": f"Insufficient stock for sample '{db_sample.name}' (dosage: {db_sample.dosage}). Requested: {qty}, Available: {db_sample.stock_quantity}."
                })

        # 3. Deduct sample stock (safe since all validations passed)
        for sample_item in samples_distributed:
            sample_id = sample_item.get("id")
            qty = sample_item.get("quantity", 0)
            db_sample = db.query(models.Sample).filter(models.Sample.id == sample_id).first()
            db_sample.stock_quantity -= qty

        # 4. Update HCP last interaction date
        hcp.last_interaction_date = date
        
        # 5. Create Interaction
        new_interaction = models.Interaction(
            hcp_id=hcp_id,
            date=date,
            time=time,
            interaction_type=interaction_type,
            attendees=json.dumps(attendees),
            topics_discussed=topics_discussed,
            materials_shared=json.dumps(materials_shared),
            samples_distributed=json.dumps(samples_distributed),
            sentiment=sentiment,
            outcomes=outcomes,
            follow_up_actions=follow_up_actions,
            ai_suggested_followups=json.dumps(ai_suggested_followups)
        )
        
        db.add(new_interaction)
        db.commit()
        db.refresh(new_interaction)
        
        return json.dumps({
            "success": True,
            "message": f"Successfully logged interaction with {hcp.name} (ID: {new_interaction.id})",
            "interaction_id": new_interaction.id,
            "form_state": {
                "id": new_interaction.id,
                "hcp_id": new_interaction.hcp_id,
                "date": new_interaction.date,
                "time": new_interaction.time,
                "interaction_type": new_interaction.interaction_type,
                "attendees": attendees,
                "topics_discussed": new_interaction.topics_discussed,
                "materials_shared": materials_shared,
                "samples_distributed": samples_distributed,
                "sentiment": new_interaction.sentiment,
                "outcomes": new_interaction.outcomes,
                "follow_up_actions": new_interaction.follow_up_actions,
                "ai_suggested_followups": ai_suggested_followups
            }
        })
    except Exception as e:
        db.rollback()
        return json.dumps({
            "success": False,
            "error": f"Failed to log interaction: {str(e)}"
        })
    finally:
        db.close()

@tool
def edit_interaction(
    interaction_id: int,
    date: Optional[str] = None,
    time: Optional[str] = None,
    interaction_type: Optional[str] = None,
    attendees: Optional[List[str]] = None,
    topics_discussed: Optional[str] = None,
    materials_shared: Optional[List[dict]] = None,
    samples_distributed: Optional[List[dict]] = None,
    sentiment: Optional[str] = None,
    outcomes: Optional[str] = None,
    follow_up_actions: Optional[str] = None,
    ai_suggested_followups: Optional[List[str]] = None
) -> str:
    """
    Modifies an existing logged interaction, adjusting inventory stock consistently.
    
    Args:
        interaction_id: The database ID of the interaction to edit.
        date: Optional updated date.
        time: Optional updated time.
        interaction_type: Optional updated interaction type.
        attendees: Optional updated list of attendee names.
        topics_discussed: Optional updated topics.
        materials_shared: Optional updated list of dicts.
        samples_distributed: Optional updated list of distributed samples.
        sentiment: Optional updated sentiment.
        outcomes: Optional updated outcomes.
        follow_up_actions: Optional updated actions.
        ai_suggested_followups: Optional updated suggestions.
    Returns:
        JSON string confirming modification results.
    """
    db = SessionLocal()
    try:
        # 1. Fetch existing interaction
        interaction = db.query(models.Interaction).filter(models.Interaction.id == interaction_id).first()
        if not interaction:
            return json.dumps({
                "success": False,
                "error": f"Interaction with ID {interaction_id} not found."
            })
            
        # 2. Handle sample stocks adjustments consistently
        if samples_distributed is not None:
            # Parse old distributed samples
            old_samples = []
            if interaction.samples_distributed:
                try:
                    old_samples = json.loads(interaction.samples_distributed)
                except:
                    pass
            
            # Step A: Restore old stocks temporarily in this transaction
            for old_item in old_samples:
                oid = old_item.get("id")
                oqty = old_item.get("quantity", 0)
                if oid:
                    db_sample = db.query(models.Sample).filter(models.Sample.id == oid).first()
                    if db_sample:
                        db_sample.stock_quantity += oqty
            
            # Step B: Validate new stocks sufficiency
            for new_item in samples_distributed:
                nid = new_item.get("id")
                nqty = new_item.get("quantity", 0)
                if not nid:
                    return json.dumps({
                        "success": False,
                        "error": "Invalid new drug sample details: missing 'id'."
                    })
                
                db_sample = db.query(models.Sample).filter(models.Sample.id == nid).first()
                if not db_sample:
                    return json.dumps({
                        "success": False,
                        "error": f"Drug sample with ID {nid} not found in catalog."
                    })
                
                if nqty < 0:
                    return json.dumps({
                        "success": False,
                        "error": f"Cannot distribute negative quantity of sample '{db_sample.name}'."
                    })
                    
                if db_sample.stock_quantity < nqty:
                    return json.dumps({
                        "success": False,
                        "error": f"Insufficient stock to complete update for sample '{db_sample.name}'. Available: {db_sample.stock_quantity}, Requested: {nqty}."
                    })
            
            # Step C: Deduct new stocks
            for new_item in samples_distributed:
                nid = new_item.get("id")
                nqty = new_item.get("quantity", 0)
                db_sample = db.query(models.Sample).filter(models.Sample.id == nid).first()
                db_sample.stock_quantity -= nqty
                
            interaction.samples_distributed = json.dumps(samples_distributed)

        # 3. Apply updates to other fields
        if date is not None:
            interaction.date = date
            if interaction.hcp:
                interaction.hcp.last_interaction_date = date
        if time is not None:
            interaction.time = time
        if interaction_type is not None:
            interaction.interaction_type = interaction_type
        if attendees is not None:
            interaction.attendees = json.dumps(attendees)
        if topics_discussed is not None:
            interaction.topics_discussed = topics_discussed
        if materials_shared is not None:
            interaction.materials_shared = json.dumps(materials_shared)
        if sentiment is not None:
            interaction.sentiment = sentiment
        if outcomes is not None:
            interaction.outcomes = outcomes
        if follow_up_actions is not None:
            interaction.follow_up_actions = follow_up_actions
        if ai_suggested_followups is not None:
            interaction.ai_suggested_followups = json.dumps(ai_suggested_followups)
            
        db.commit()
        
        hcp_name = interaction.hcp.name if interaction.hcp else "HCP"
        
        return json.dumps({
            "success": True,
            "message": f"Successfully updated interaction ID {interaction_id} for {hcp_name}",
            "interaction_id": interaction.id,
            "form_state": {
                "id": interaction.id,
                "hcp_id": interaction.hcp_id,
                "date": interaction.date,
                "time": interaction.time,
                "interaction_type": interaction.interaction_type,
                "attendees": json.loads(interaction.attendees) if interaction.attendees else [],
                "topics_discussed": interaction.topics_discussed,
                "materials_shared": json.loads(interaction.materials_shared) if interaction.materials_shared else [],
                "samples_distributed": json.loads(interaction.samples_distributed) if interaction.samples_distributed else [],
                "sentiment": interaction.sentiment,
                "outcomes": interaction.outcomes,
                "follow_up_actions": interaction.follow_up_actions,
                "ai_suggested_followups": json.loads(interaction.ai_suggested_followups) if interaction.ai_suggested_followups else []
            }
        })
    except Exception as e:
        db.rollback()
        return json.dumps({
            "success": False,
            "error": f"Failed to edit interaction: {str(e)}"
        })
    finally:
        db.close()
