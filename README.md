# AI-First CRM Healthcare Professional (HCP) Module

An AI-first Customer Relationship Management (CRM) system specializing in the Healthcare Professional (HCP) module. It features a split-screen design: a structured form on the left, and an AI conversational chat assistant on the right. Both panels sync in real-time.

## Key Features

- **Conversational Logging**: Enter natural, unstructured paragraphs (e.g. *"Met Dr. Jenkins today, discussed CardioCare..."*) in the AI assistant. The LangGraph agent extracts entities and populates form fields.
- **Structured Entries**: Log and edit interactions via standard forms.
- **Two-Way Synchronization**: Typing in the chat updates the form; manually selecting options or updating fields in the form informs subsequent chat actions.
- **AI Recommendations**: Recommends clinical follow-up actions dynamically based on meeting context.
- **CRUD Operations**: Review, edit, and delete logged interactions in a persistent database history.
- **Voice Note Simulation**: Request simulated transcription of voice notes with user consent.

---

## Tech Stack

- **Frontend**: React 18, Vite, Redux Toolkit, Vanilla CSS (Premium glassmorphism, Inter font).
- **Backend**: Python 3.9, FastAPI, SQLAlchemy ORM.
- **AI Agent Framework**: LangGraph, LangChain.
- **LLM Provider**: Groq API (`gemma2-9b-it`).
- **Database**: MySQL.

---

## Configuration & Credentials Setup

All configurations are loaded from `backend/.env`.

### 1. Database Connection String
Set `DATABASE_URL` in `backend/.env`. The format is:
```env
DATABASE_URL=mysql+pymysql://<user>:<password>@<host>:<port>/hcp_crm
```
*Example (default root, blank password on localhost)*:
```env
DATABASE_URL=mysql+pymysql://root:@localhost:3306/hcp_crm
```

### 2. Groq LLM API Key
To use the live LangGraph agent completions, add your Groq API key to the environment file.
Run this secure PowerShell command to input it without printing the value to terminal history:
```powershell
$val = Read-Host -AsSecureString -Prompt "Enter GROQ_API_KEY"; $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($val); $PlainVal = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR); Add-Content -Path "backend\.env" -Value "`nGROQ_API_KEY=$PlainVal"; echo "Saved."
```

If `GROQ_API_KEY` is missing or invalid, the backend automatically transitions to a rule-based NLP extraction parser so all functionalities remain responsive.

---

## Running the Application

### Prerequisites
1. Ensure your MySQL service (e.g. `MYSQL80`) is running.
2. If the database `hcp_crm` does not exist, the Python backend will attempt to create it automatically on connection. Alternatively, execute the provided [database_setup.sql](file:///e:/hcp_crm3/backend/database_setup.sql) script in your MySQL client:
   ```bash
   mysql -u root -p < backend/database_setup.sql
   ```

### 1. Start Backend Server
Navigate to the `backend/` directory:
```bash
# Activate virtual environment
.\venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Run seed script to populate tables
python app/seed.py

# Start FastAPI
uvicorn app.main:app --reload
```
The API documentation will be available at `http://127.0.0.1:8000/docs`.

### 2. Start Frontend Server
Navigate to the `frontend/` directory:
```bash
# Install NPM packages
npm install

# Start Vite dev server
npm run dev
```
Open the app in Chrome at `http://localhost:5173`.

---

## Verification & Tests

To run automated backend validation tests checking CRUD, search, chat extraction, and suggestions, execute the following from the `backend/` folder (requires the MySQL service to be online):
```bash
python test_app.py
```
