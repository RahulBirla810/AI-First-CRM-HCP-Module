import os
import json
import re
from typing import List, Optional, Dict, Any, TypedDict
from dotenv import load_dotenv

# LangGraph imports
from langgraph.graph import StateGraph, END, START

# Database and Tools
from .database import SessionLocal
from . import models
from . import tools

load_dotenv()

# Define the LangGraph State
class AgentState(TypedDict):
    user_message: str
    session_id: str
    form_state: Dict[str, Any]
    reply: str
    tools_called: List[str]
    # Internal agent signaling variables
    execute_tool: Optional[str]
    tool_params: Dict[str, Any]
    use_llm: bool

# ----------------- 1. NODE: Entity Extraction -----------------
def extract_entities_node(state: AgentState) -> Dict[str, Any]:
    """
    Node that parses the user's plain text message to extract interaction entities
    (HCP selection, sentiment, materials, samples, topics discussed).
    """
    message = state["user_message"]
    current_form = state["form_state"]
    use_llm = state["use_llm"]
    
    updated_form = dict(current_form) if current_form else {
        "hcp_id": None,
        "date": "",
        "time": "",
        "interaction_type": "Meeting",
        "attendees": [],
        "topics_discussed": "",
        "materials_shared": [],
        "samples_distributed": [],
        "sentiment": "Neutral",
        "outcomes": "",
        "follow_up_actions": "",
        "ai_suggested_followups": []
    }
    
    execute_tool = None
    tool_params = {}
    reply = ""
    tools_called = list(state.get("tools_called", []))
    
    if use_llm:
        try:
            # Connect to Groq
            from groq import Groq
            client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
            
            with SessionLocal() as db:
                hcps = db.query(models.HCP).all()
                materials = db.query(models.Material).all()
                samples = db.query(models.Sample).all()
                
                hcp_ctx = [{"id": h.id, "name": h.name, "specialty": h.specialty} for h in hcps]
                mat_ctx = [{"id": m.id, "name": m.name, "type": m.type} for m in materials]
                sam_ctx = [{"id": s.id, "name": s.name, "dosage": s.dosage} for s in samples]

            system_prompt = f"""
You are an AI CRM Assistant for pharmaceutical sales representatives. Your goal is to help them log and manage interactions with Healthcare Professionals (HCPs).
You have access to the following database context:
- Available HCPs: {json.dumps(hcp_ctx)}
- Available Materials: {json.dumps(mat_ctx)}
- Available Samples: {json.dumps(sam_ctx)}

Current structured form state of this interaction:
{json.dumps(updated_form, indent=2)}

Guidelines:
1. Parse the user's chat input to extract details: HCP name, date, time, topics discussed, materials shared, samples distributed, sentiment, outcomes, and follow-up actions.
2. If the user tells you details of a meeting/interaction, map them to the database context:
   - Match HCP name to the closest ID in the HCP list.
   - Match materials shared to the ID in the Materials list.
   - Match samples distributed to the ID and dosage in the Samples list.
3. Automatically generate a list of "AI Suggested Follow-ups" based on the topics discussed.
4. Output your response as a JSON object containing:
   - "reply": A friendly, professional markdown reply to the representative.
   - "form_state": The updated/extracted fields of the interaction form (must match the InteractionBase schema).
   - "execute_tool": Optional action like "log_interaction" or "edit_interaction".
   - "tool_params": Parameters for that action.

Response JSON format:
{{
  "reply": "Assistant response string...",
  "form_state": {{
    "hcp_id": int_or_null,
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "interaction_type": "Meeting" | "Call" | "Email" | "Video Conference",
    "attendees": ["Name1"],
    "topics_discussed": "Text summary...",
    "materials_shared": [ {{"id": 1, "name": "MaterialName"}} ],
    "samples_distributed": [ {{"id": 1, "name": "SampleName", "quantity": 2}} ],
    "sentiment": "Positive" | "Neutral" | "Negative",
    "outcomes": "Text summary...",
    "follow_up_actions": "Text summary...",
    "ai_suggested_followups": ["Action Item 1"]
  }},
  "execute_tool": "log_interaction" | "edit_interaction" | "create_followup_task" | null,
  "tool_params": {{ ... }}
}}
Ensure your output is STRICTLY valid JSON.
"""
            model_name = os.getenv("GROQ_MODEL", "gemma2-9b-it")
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                model=model_name,
                response_format={"type": "json_object"}
            )
            
            result_data = json.loads(chat_completion.choices[0].message.content)
            reply = result_data.get("reply", "")
            updated_form = result_data.get("form_state", updated_form)
            execute_tool = result_data.get("execute_tool")
            tool_params = result_data.get("tool_params", {})
            
        except Exception as e:
            print(f"Extraction Node: LLM failure, falling back to mock extraction: {e}")
            # Reset flag and continue to mock logic below
            use_llm = False

    # Mock Extraction Logic (NLP Fallback)
    if not use_llm:
        with SessionLocal() as db:
            hcps = db.query(models.HCP).all()
            materials = db.query(models.Material).all()
            samples = db.query(models.Sample).all()

        message_lower = message.lower()
        extracted_indicators = []
        
        # 1. Match HCP
        matched_hcp = None
        for hcp in hcps:
            parts = hcp.name.lower().split()
            if hcp.name.lower() in message_lower or any(len(p) > 3 and p in message_lower for p in parts):
                matched_hcp = hcp
                break
        if matched_hcp:
            updated_form["hcp_id"] = matched_hcp.id
            updated_form["hcp_name"] = matched_hcp.name
            extracted_indicators.append(f"Detected HCP: **{matched_hcp.name}** (Specialty: {matched_hcp.specialty}).")
            tools_called.append("search_hcp")

        # 2. Extract Sentiment
        if any(w in message_lower for w in ["positive", "happy", "excited", "liked", "great", "agree", "impressed"]):
            updated_form["sentiment"] = "Positive"
        elif any(w in message_lower for w in ["negative", "unhappy", "disliked", "concern", "complained", "difficult"]):
            updated_form["sentiment"] = "Negative"
        else:
            updated_form["sentiment"] = "Neutral"

        # 3. Extract Interaction Type
        if "call" in message_lower or "phone" in message_lower:
            updated_form["interaction_type"] = "Call"
        elif "email" in message_lower or "wrote" in message_lower:
            updated_form["interaction_type"] = "Email"
        elif "video" in message_lower or "zoom" in message_lower or "teams" in message_lower:
            updated_form["interaction_type"] = "Video Conference"
        else:
            updated_form["interaction_type"] = "Meeting"

        # 4. Extract Materials
        tools_called.append("get_marketing_materials_and_samples")
        extracted_materials = list(updated_form.get("materials_shared", []))
        for mat in materials:
            if mat.name.lower() in message_lower or ("pdf" in message_lower and "pdf" in mat.name.lower()) or ("brochure" in message_lower and "brochure" in mat.name.lower()):
                if not any(m["id"] == mat.id for m in extracted_materials):
                    extracted_materials.append({"id": mat.id, "name": mat.name})
                    extracted_indicators.append(f"Added shared material: *{mat.name}*.")
        updated_form["materials_shared"] = extracted_materials

        # 5. Extract Samples
        extracted_samples = list(updated_form.get("samples_distributed", []))
        for sam in samples:
            if sam.name.lower() in message_lower:
                qty = 1
                match = re.search(r"(\d+)\s*(?:samples|boxes|units|packs|of|\s)*" + re.escape(sam.name.lower()), message_lower)
                if match:
                    qty = int(match.group(1))
                else:
                    word_numbers = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5}
                    for name, val in word_numbers.items():
                        if name + " " in message_lower and sam.name.lower() in message_lower:
                            qty = val
                            break
                existing = next((s for s in extracted_samples if s["id"] == sam.id), None)
                if existing:
                    existing["quantity"] = qty
                else:
                    extracted_samples.append({"id": sam.id, "name": sam.name, "quantity": qty})
                extracted_indicators.append(f"Distributed sample: *{sam.name}* (Qty: {qty}).")
        updated_form["samples_distributed"] = extracted_samples

        # 6. Extract Date & Time
        from datetime import datetime
        now = datetime.now()
        if not updated_form.get("date"):
            updated_form["date"] = now.strftime("%Y-%m-%d")
        if not updated_form.get("time"):
            updated_form["time"] = now.strftime("%H:%M")

        # 7. Extract Topics & Outcomes
        if "discuss" in message_lower or "talked about" in message_lower:
            topics_match = re.search(r"(?:discuss|talked about|discussed)\s+([^.\n]+)", message_lower)
            if topics_match:
                updated_form["topics_discussed"] = topics_match.group(1).strip().capitalize()
            else:
                updated_form["topics_discussed"] = message
        else:
            updated_form["topics_discussed"] = message if not updated_form.get("topics_discussed") else updated_form["topics_discussed"]
            
        if not updated_form.get("outcomes"):
            updated_form["outcomes"] = "HCP requested clinical literature."

        # 8. Follow-up Recommendations
        suggestions = []
        if "oncoboost" in message_lower or "cancer" in message_lower:
            suggestions.append("Send OncoBoost Phase III PDF")
            suggestions.append("Schedule follow-up meeting in 2 weeks")
        if "cardiocare" in message_lower or "heart" in message_lower or "cardio" in message_lower:
            suggestions.append("Send CardioCare Efficacy brochure")
            suggestions.append("Call next week to review patient feedback")
        if "advisory" in message_lower or "board" in message_lower or "opinion" in message_lower:
            suggestions.append("Add to advisory board invite list")
            
        if not suggestions:
            suggestions = ["Schedule follow-up meeting in 2 weeks", "Send latest clinical study documentation"]
        updated_form["ai_suggested_followups"] = suggestions

        # 9. Signaling for Log or Task Actions
        is_logging = any(w in message_lower for w in ["log this", "log interaction", "save this", "save interaction", "submit"])
        is_task_creation = "follow-up task" in message_lower or "create task" in message_lower
        
        if is_task_creation:
            # Extract title, due date, interaction id from command
            # e.g., Create follow-up task 'Send brochure' due on 2026-07-20 for interaction 4
            title_match = re.search(r"task\s+'([^']+)'", message)
            date_match = re.search(r"due on\s+([\d-]+)", message_lower)
            id_match = re.search(r"interaction\s+(\d+)", message_lower)
            
            title = title_match.group(1) if title_match else "Send clinical materials"
            due_date = date_match.group(1) if date_match else "2026-07-15"
            inter_id = int(id_match.group(1)) if id_match else 1
            
            execute_tool = "create_followup_task"
            tool_params = {
                "title": title,
                "due_date": due_date,
                "interaction_id": inter_id
            }
        elif is_logging:
            execute_tool = "log_interaction"
            tool_params = updated_form
        else:
            indicator_text = ", ".join(extracted_indicators)
            reply = f"I've updated the interaction form with the details extracted from your message.\n\n"
            if extracted_indicators:
                reply += f"**Extracted entities:** {indicator_text}\n\n"
            reply += "You can modify any of the fields in the form directly, or type **'Log interaction'** when you are ready to save it to the CRM database."

    # Standardize form keys to prevent null issues
    for key in ["attendees", "materials_shared", "samples_distributed", "ai_suggested_followups"]:
        if key not in updated_form or updated_form[key] is None:
            updated_form[key] = []

    return {
        "form_state": updated_form,
        "execute_tool": execute_tool,
        "tool_params": tool_params,
        "reply": reply,
        "tools_called": tools_called
    }

# ----------------- 2. NODE: Execute Tools -----------------
def execute_tools_node(state: AgentState) -> Dict[str, Any]:
    """
    Node that runs the requested database tool (like log_interaction, edit_interaction).
    """
    execute_tool = state["execute_tool"]
    tool_params = state["tool_params"]
    updated_form = state["form_state"]
    tools_called = list(state.get("tools_called", []))
    reply = state.get("reply", "")

    if not execute_tool:
        return {}

    if execute_tool == "log_interaction":
        tools_called.append("log_interaction")
        if not updated_form.get("hcp_id"):
            reply = "I'm ready to log this interaction, but I couldn't identify the HCP. Could you please specify which HCP you met (e.g. 'Dr. Sarah Jenkins')?"
        else:
            tool_res = tools.log_interaction.invoke({
                "hcp_id": int(updated_form["hcp_id"]),
                "date": updated_form["date"],
                "time": updated_form["time"],
                "interaction_type": updated_form["interaction_type"],
                "attendees": updated_form.get("attendees", []),
                "topics_discussed": updated_form["topics_discussed"],
                "materials_shared": updated_form["materials_shared"],
                "samples_distributed": updated_form["samples_distributed"],
                "sentiment": updated_form["sentiment"],
                "outcomes": updated_form["outcomes"],
                "follow_up_actions": updated_form.get("follow_up_actions", "Follow up with clinical materials"),
                "ai_suggested_followups": updated_form["ai_suggested_followups"]
            })
            tool_data = json.loads(tool_res)
            if not tool_data.get("success", True):
                reply = f"❌ **Log Failed**: {tool_data.get('error')}"
            else:
                updated_form = tool_data.get("form_state", updated_form)
                updated_form["id"] = tool_data.get("interaction_id")
                reply = f"✅ **Logged Successfully**: {tool_data.get('message')}"

    elif execute_tool == "edit_interaction" and tool_params.get("interaction_id"):
        tools_called.append("edit_interaction")
        tool_params.update(updated_form)
        tool_res = tools.edit_interaction.invoke(tool_params)
        tool_data = json.loads(tool_res)
        if not tool_data.get("success", True):
            reply = f"❌ **Update Failed**: {tool_data.get('error')}"
        else:
            updated_form = tool_data.get("form_state", updated_form)
            updated_form["id"] = tool_data.get("interaction_id")
            reply = f"✅ **Updated Successfully**: {tool_data.get('message')}"

    elif execute_tool == "create_followup_task":
        tools_called.append("create_followup_task")
        tool_res = tools.create_followup_task.invoke(tool_params)
        tool_data = json.loads(tool_res)
        if not tool_data.get("success", True):
            reply = f"❌ **Task Scheduling Failed**: {tool_data.get('error')}"
        else:
            reply = f"✅ **Task Scheduled**: {tool_data.get('message')}"

    return {
        "form_state": updated_form,
        "reply": reply,
        "tools_called": tools_called,
        "execute_tool": None # Reset tool execution signal
    }

# ----------------- 3. NODE: Response Generation -----------------
def response_generation_node(state: AgentState) -> Dict[str, Any]:
    """
    Node that reviews final replies and completes the turn.
    """
    # Simply returns the reply established in extraction/tool nodes.
    return {
        "reply": state["reply"]
    }

# ----------------- ROUTING DECISION -----------------
def route_after_extraction(state: AgentState) -> str:
    """
    Conditional routing edge to determine if tools should be executed.
    """
    if state.get("execute_tool"):
        return "execute_tools"
    return "generate_response"

# ----------------- GRAPH COMPILATION -----------------
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("extract_entities", extract_entities_node)
workflow.add_node("execute_tools", execute_tools_node)
workflow.add_node("generate_response", response_generation_node)

# Add Entry point
workflow.add_edge(START, "extract_entities")

# Add Conditional Edges
workflow.add_conditional_edges(
    "extract_entities",
    route_after_extraction,
    {
        "execute_tools": "execute_tools",
        "generate_response": "generate_response"
    }
)

# Add standard transitions
workflow.add_edge("execute_tools", "generate_response")
workflow.add_edge("generate_response", END)

# Compile Graph
graph_app = workflow.compile()

# ----------------- INTERACTION AGENT WRAPPER -----------------
class InteractionAgent:
    def __init__(self):
        groq_key = os.getenv("GROQ_API_KEY", "")
        self.use_real_llm = bool(groq_key)
        
        # Test Groq library availability
        if self.use_real_llm:
            try:
                import groq
            except Exception as e:
                print(f"Groq library not installed, falling back to mock mode: {e}")
                self.use_real_llm = False

    def run_agent(self, message: str, current_form: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        """
        Runs the compiled LangGraph StateGraph workflow via graph.invoke()
        """
        # Define initial state
        initial_state: AgentState = {
            "user_message": message,
            "session_id": session_id,
            "form_state": current_form or {},
            "reply": "",
            "tools_called": [],
            "execute_tool": None,
            "tool_params": {},
            "use_llm": self.use_real_llm
        }
        
        # Execute workflow
        final_state = graph_app.invoke(initial_state)
        
        return {
            "reply": final_state["reply"],
            "form_state": final_state["form_state"],
            "session_id": final_state["session_id"],
            "tools_called": final_state["tools_called"]
        }
