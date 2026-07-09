import os
import sys

# Ensure backend directory is in path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from app.database import SessionLocal, Base, engine
from app import models

def seed_database():
    print("Initialising database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Checking if seeding is required...")
        # Seed HCPs
        if db.query(models.HCP).count() == 0:
            print("Seeding HCPs...")
            hcps = [
                models.HCP(name="Dr. Sarah Jenkins", specialty="Cardiology", clinic="Heart Care Clinic, NY", email="sarah.jenkins@heartcare.org", phone="555-0199", last_interaction_date="2026-06-15"),
                models.HCP(name="Dr. Robert Chen", specialty="Oncology", clinic="Metropolitan Oncology Center", email="r.chen@metonc.com", phone="555-0144", last_interaction_date="2026-06-20"),
                models.HCP(name="Dr. Emily Taylor", specialty="Endocrinology", clinic="Diabetes & Thyroid Center", email="emily.taylor@diabetestc.org", phone="555-0177", last_interaction_date="2026-05-10"),
                models.HCP(name="Dr. James Patel", specialty="Cardiology", clinic="Cardiovascular Associates", email="j.patel@cardioassoc.com", phone="555-0122", last_interaction_date="2026-07-01"),
            ]
            db.add_all(hcps)
            db.commit()
            
        # Seed Materials
        if db.query(models.Material).count() == 0:
            print("Seeding Materials...")
            materials = [
                models.Material(name="OncoBoost Phase III Clinical Trial Results PDF", type="Clinical Paper", description="Comprehensive study on efficacy and side effects of OncoBoost in oncology patients."),
                models.Material(name="CardioCare Efficacy Brochure", type="PDF Brochure", description="Visual patient benefits, dosage charts, and cardiovascular safety profile of CardioCare."),
                models.Material(name="ThyroGlow Prescribing Information", type="Slide Deck", description="Full prescribing guide, indications, contraindications, and dose titration guidelines for ThyroGlow."),
            ]
            db.add_all(materials)
            db.commit()

        # Seed Samples
        if db.query(models.Sample).count() == 0:
            print("Seeding Samples...")
            samples = [
                models.Sample(name="OncoBoost", dosage="10mg", stock_quantity=100),
                models.Sample(name="CardioCare", dosage="20mg", stock_quantity=250),
                models.Sample(name="ThyroGlow", dosage="50mcg", stock_quantity=150),
            ]
            db.add_all(samples)
            db.commit()
            
        print("Database seeding completed successfully!")
    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
