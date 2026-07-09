import os
import pymysql
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

# Default to MySQL as the required database.
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost:3306/hcp_crm")

# Auto-create MySQL database if it does not exist
if DATABASE_URL.startswith("mysql"):
    url = urlparse(DATABASE_URL)
    host = url.hostname or "localhost"
    port = url.port or 3306
    user = url.username or "root"
    password = url.password or ""
    # Handle cases where password is none
    if password is None:
        password = ""
    db_name = url.path.lstrip('/')
    
    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password
        )
        try:
            with conn.cursor() as cursor:
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
            conn.commit()
            print(f"MySQL database '{db_name}' verified or created.")
        finally:
            conn.close()
    except Exception as e:
        print(f"\n[WARNING] Direct MySQL database creation/verification failed: {e}")
        print("Proceeding to establish connection via SQLAlchemy engine...\n")

# Create engine for MySQL
engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
