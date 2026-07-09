from sqlalchemy import Column, Integer, String, Text, ForeignKey, Date
from sqlalchemy.orm import relationship
from .database import Base
import json

class HCP(Base):
    __tablename__ = "hcps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    specialty = Column(String(100), nullable=False)
    clinic = Column(String(150))
    email = Column(String(100))
    phone = Column(String(50))
    last_interaction_date = Column(String(50)) # String for easy formatting and DB independence

    interactions = relationship("Interaction", back_populates="hcp", cascade="all, delete-orphan")

class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    type = Column(String(50)) # e.g. "PDF Brochure", "Clinical Paper", "Slide Deck"
    description = Column(Text)

class Sample(Base):
    __tablename__ = "samples"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    dosage = Column(String(50)) # e.g. "10mg", "50ml"
    stock_quantity = Column(Integer, default=0)

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_id = Column(Integer, ForeignKey("hcps.id", ondelete="CASCADE"), nullable=False)
    date = Column(String(50), nullable=False)
    time = Column(String(50), nullable=False)
    interaction_type = Column(String(50), nullable=False) # e.g. "Meeting", "Call", "Email", "Video Conference"
    attendees = Column(Text) # JSON string of attendee names
    topics_discussed = Column(Text)
    materials_shared = Column(Text) # JSON string of shared materials (ID and name)
    samples_distributed = Column(Text) # JSON string of samples (ID, name, and quantity)
    sentiment = Column(String(20)) # e.g. "Positive", "Neutral", "Negative"
    outcomes = Column(Text)
    follow_up_actions = Column(Text)
    ai_suggested_followups = Column(Text) # JSON string of recommended next steps

    hcp = relationship("HCP", back_populates="interactions")
    tasks = relationship("FollowUpTask", back_populates="interaction", cascade="all, delete-orphan")

class FollowUpTask(Base):
    __tablename__ = "follow_up_tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    due_date = Column(String(50), nullable=False)
    status = Column(String(50), default="Pending") # "Pending", "Completed"
    interaction_id = Column(Integer, ForeignKey("interactions.id", ondelete="CASCADE"), nullable=False)

    interaction = relationship("Interaction", back_populates="tasks")
