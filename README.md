# 🩺 AI-First CRM Healthcare Professional (HCP) Module

[![React](https://img.shields.io/badge/React-20232a?style=flat-square&logo=react&logoColor=61dafb)](https://react.dev/)
[![Redux](https://img.shields.io/badge/Redux%20Toolkit-764abc?style=flat-square&logo=redux&logoColor=white)](https://redux-toolkit.js.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![MySQL](https://img.shields.io/badge/MySQL-00758f?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-orange?style=flat-square&logo=chainlink&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![Netlify](https://img.shields.io/badge/Netlify-00c896?style=flat-square&logo=netlify&logoColor=white)](https://www.netlify.com/)
[![Railway](https://img.shields.io/badge/Railway-130f30?style=flat-square&logo=railway&logoColor=white)](https://railway.app/)

An **AI-first Customer Relationship Management (CRM) system** specializing in the **Healthcare Professional (HCP) module**. This application features a premium, synchronized split-screen design: a high-fidelity structured form on the left, and an AI conversational chat assistant on the right. Both panels sync dynamically in real-time to streamline healthcare field operations.

---

## 🚀 Live Demo

* **Frontend (Netlify)**: [https://ai-first-crm-hcp-module.netlify.app](https://ai-first-crm-hcp-module.netlify.app)
* **Backend API (Railway)**: [https://ai-first-crm-hcp-module-production-0ddc.up.railway.app](https://ai-first-crm-hcp-module-production-0ddc.up.railway.app)
* **Interactive Swagger API Docs**: [https://ai-first-crm-hcp-module-production-0ddc.up.railway.app/docs](https://ai-first-crm-hcp-module-production-0ddc.up.railway.app/docs)

---

## 📋 Project Overview

This project was built for the assignment submission to demonstrate an **AI-First UX pattern** in medical sales operations. Instead of manually filling out tedious database forms, representatives can enter unstructured narrative notes (e.g. *"Had a friendly meeting with Dr. Jenkins today at Heart Care Clinic. We discussed CardioCare samples and I left 5 units. She was highly receptive."*). 

The backend agent—implemented using a formal **LangGraph StateGraph workflow**—parses this input, queries the database to match entities, validates inventories, auto-populates the forms, and suggests appropriate follow-up actions using the Groq `gemma2-9b-it` LLM.

---

## 🛠️ Tech Stack

* **Frontend**: React (Vite), Redux Toolkit (state sync), Vanilla CSS (Glassmorphism layout).
* **Backend**: FastAPI, SQLAlchemy ORM, PyMySQL (MySQL driver).
* **AI Orchestration**: LangGraph `StateGraph` workflow engine.
* **LLM Engine**: Groq Cloud API (`gemma2-9b-it`).
* **Database**: MySQL Server.
* **Deployment**: Netlify (Frontend SPA), Railway (Backend containerized API & MySQL).

---

## ✨ Features

- **HCP Management & Search**: Real-time lookup of medical professionals, specialties, and clinics.
- **AI-First Conversational Logging**: Natural-language logging that auto-populates structured fields.
- **Dynamic Entity Extraction**: Resolves target HCPs and maps sample distributions automatically.
- **Interactive Edit & Sync**: Changes in the conversational assistant update the form; manual form adjustments inform subsequent chat context.
- **Double-Sided Stock Transaction Safeguards**: Validates inventory stock levels on logging, restores old stock during edits, and prevents negative stock values.
- **Follow-up Task Scheduling**: Prevents duplicate follow-ups and records next-step tasks automatically.
- **Marketing Materials & Sample Catalog**: Keeps track of available medical brochures, drug samples, and live stock volumes.
- **Fully-Documented CRUD Rest APIs**: Includes self-documenting Swagger/OpenAPI endpoints.

---

## 💻 Running the Application

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

## 🧪 Verification & Tests

To run automated backend validation tests checking CRUD, search, chat extraction, and suggestions, execute the following from the `backend/` folder (requires the MySQL service to be online):
```bash
python test_app.py
```
