from pydantic import BaseModel, Field
from typing import List, Optional, Any

# HCP Schemas
class HCPBase(BaseModel):
    name: str
    specialty: str
    clinic: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    last_interaction_date: Optional[str] = None

class HCPCreate(HCPBase):
    pass

class HCP(HCPBase):
    id: int

    class Config:
        from_attributes = True

class MaterialBase(BaseModel):
    name: str
    type: str
    description: Optional[str] = None

class MaterialCreate(MaterialBase):
    pass

class Material(MaterialBase):
    id: int

    class Config:
        from_attributes = True

# Sample Schemas
class SampleBase(BaseModel):
    name: str
    dosage: str
    stock_quantity: int

class SampleCreate(SampleBase):
    pass

class Sample(SampleBase):
    id: int

    class Config:
        from_attributes = True

# Inner components for Interaction
class SharedMaterial(BaseModel):
    id: int
    name: str

class DistributedSample(BaseModel):
    id: int
    name: str
    quantity: int

# Interaction Schemas
class InteractionBase(BaseModel):
    hcp_id: int
    date: str
    time: str
    interaction_type: str
    attendees: List[str] = []
    topics_discussed: Optional[str] = ""
    materials_shared: List[SharedMaterial] = []
    samples_distributed: List[DistributedSample] = []
    sentiment: str = "Neutral"
    outcomes: Optional[str] = ""
    follow_up_actions: Optional[str] = ""
    ai_suggested_followups: List[str] = []

class InteractionCreate(InteractionBase):
    pass

class Interaction(BaseModel):
    id: int
    hcp_id: int
    date: str
    time: str
    interaction_type: str
    attendees: List[str] = []
    topics_discussed: Optional[str] = ""
    materials_shared: List[SharedMaterial] = []
    samples_distributed: List[DistributedSample] = []
    sentiment: str = "Neutral"
    outcomes: Optional[str] = ""
    follow_up_actions: Optional[str] = ""
    ai_suggested_followups: List[str] = []
    hcp: Optional[HCP] = None

    class Config:
        from_attributes = True

# Followup Schemas
class FollowupBase(BaseModel):
    title: str
    due_date: str
    status: str = "Pending"
    interaction_id: int

class FollowupCreate(FollowupBase):
    pass

class Followup(FollowupBase):
    id: int

    class Config:
        from_attributes = True

# Chat Schemas
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    # The current state of the form in the frontend so the agent can reference it or update it.
    current_form_state: Optional[InteractionBase] = None

class ChatResponse(BaseModel):
    reply: str
    session_id: str
    form_state: Optional[InteractionBase] = None
    # We return the list of tools run during this call for UI visualization.
    tools_called: List[str] = []
