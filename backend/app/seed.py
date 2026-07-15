import os
import sys

# Ensure backend directory is in path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from sqlalchemy import text
from app.database import SessionLocal, Base, engine
from app import models

def seed_database():
    db = SessionLocal()
    try:
        print("Disabling foreign key checks...")
        db.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        db.commit()
        
        print("Dropping existing tables if any...")
        tables_to_drop = ["followups", "follow_up_tasks", "interactions", "hcps", "materials", "samples"]
        for table in tables_to_drop:
            db.execute(text(f"DROP TABLE IF EXISTS {table};"))
        db.commit()
        
        print("Re-enabling foreign key checks...")
        db.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        db.commit()
        
        print("Initialising new database tables...")
        Base.metadata.create_all(bind=engine)
        
        print("Seeding data...")
        # 1. Seed HCPs
        hcps = [
            models.HCP(name="Dr Sarah Jenkins", specialty="Cardiology", clinic="Heart Care Clinic, NY", email="sarah.jenkins@heartcare.org", phone="555-0199", last_interaction_date="2026-06-15"),
            models.HCP(name="Dr Michael Brown", specialty="Oncology", clinic="Metropolitan Oncology Center", email="m.brown@cancercenter.org", phone="555-0211", last_interaction_date="2026-06-20"),
            models.HCP(name="Dr Priya Sharma", specialty="Endocrinology", clinic="Diabetes Clinic", email="priya.sharma@diabetes.org", phone="555-0344", last_interaction_date="2026-05-10"),
            models.HCP(name="Dr Amit Verma", specialty="Cardiology", clinic="Cardiac Care Associates", email="amit.verma@cardiaccare.org", phone="555-0455", last_interaction_date="2026-07-01"),
            models.HCP(name="Dr Neha Kapoor", specialty="Pediatrics", clinic="Children's Health Center", email="neha.kapoor@childrens.org", phone="555-0566", last_interaction_date="2026-07-05"),
        ]
        db.add_all(hcps)
        db.commit()
        print(f"Seeded {len(hcps)} HCPs.")
        
        # 2. Seed Materials
        materials = [
            models.Material(name="OncoBoost Brochure", type="Brochure", description="Marketing brochure for OncoBoost therapy."),
            models.Material(name="Cardiology Flyer", type="Flyer", description="Safety guidelines and dosing options for cardiology drugs."),
            models.Material(name="Clinical Trial PDF", type="PDF", description="Clinical efficacy and side effect studies."),
            models.Material(name="Safety Guide", type="Document", description="Safe usage instructions and prescription guidelines."),
        ]
        db.add_all(materials)
        db.commit()
        print(f"Seeded {len(materials)} Materials.")

        # 3. Seed Samples
        samples = [
            models.Sample(name="OncoBoost 10mg", dosage="10mg", stock_quantity=100),
            models.Sample(name="CardioX", dosage="20mg", stock_quantity=250),
            models.Sample(name="NeuroCare", dosage="50mg", stock_quantity=150),
            models.Sample(name="PainRelief", dosage="500mg", stock_quantity=300),
        ]
        db.add_all(samples)
        db.commit()
        print(f"Seeded {len(samples)} Samples.")
            
        print("Database seeding completed successfully!")
    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
