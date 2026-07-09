import requests
import json

API_BASE = "http://127.0.0.1:8000"

def run_tests():
    print("==================================================")
    print("STARTING BACKEND INTEGRATION TESTS")
    print("==================================================")

    # Test 1: Retrieve HCPs
    print("\n--- Test 1: Fetching HCPs ---")
    res = requests.get(f"{API_BASE}/hcps")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    hcps = res.json()
    print(f"Success! Retrieved {len(hcps)} HCPs:")
    for hcp in hcps:
        print(f" - {hcp['name']} ({hcp['specialty']})")

    # Test 2: Search HCPs
    print("\n--- Test 2: Searching HCP 'Sarah' ---")
    res = requests.get(f"{API_BASE}/hcps", params={"query": "Sarah"})
    assert res.status_code == 200
    search_results = res.json()
    print(f"Success! Found {len(search_results)} matching HCPs:")
    for hcp in search_results:
         print(f" - {hcp['name']} at {hcp['clinic']}")

    # Test 3: Get Materials & Samples
    print("\n--- Test 3: Fetching Materials & Samples Catalog ---")
    res = requests.get(f"{API_BASE}/materials-samples")
    assert res.status_code == 200
    catalog = res.json()
    print(f"Success! Retrieved {len(catalog['materials'])} materials and {len(catalog['samples'])} samples.")

    # Test 4: Create Interaction via Form (Structured Log)
    print("\n--- Test 4: Creating Interaction via Form (Structured Log) ---")
    payload = {
        "hcp_id": 2, # Dr. Robert Chen
        "date": "2026-07-08",
        "time": "14:30",
        "interaction_type": "Meeting",
        "attendees": ["Nurse Kelly"],
        "topics_discussed": "Discussed oncology treatment plans and side effect profile of OncoBoost.",
        "materials_shared": [{"id": 1, "name": "OncoBoost Phase III Clinical Trial Results PDF"}],
        "samples_distributed": [{"id": 1, "name": "OncoBoost", "quantity": 2}],
        "sentiment": "Positive",
        "outcomes": "Doctor agreed to prescribe OncoBoost for next 3 eligible patients.",
        "follow_up_actions": "Send additional brochures.",
        "ai_suggested_followups": ["Schedule follow-up meeting in 2 weeks"]
    }
    res = requests.post(f"{API_BASE}/interactions", json=payload)
    assert res.status_code == 200, res.text
    create_data = res.json()
    print(f"Success! Response: {json.dumps(create_data, indent=2)}")
    interaction_id = create_data["id"]

    # Test 5: Fetch Interactions List (Read operation)
    print("\n--- Test 5: Fetching Logged Interactions List (Read) ---")
    res = requests.get(f"{API_BASE}/interactions")
    assert res.status_code == 200
    interactions = res.json()
    print(f"Success! Retrieved {len(interactions)} logged records in CRM database.")
    # Confirm our newly created interaction is in the list
    matching = [i for i in interactions if i["id"] == interaction_id]
    assert len(matching) > 0, "Created interaction not found in history"
    print(f"Confirmed interaction #{interaction_id} exists in DB logs.")

    # Test 6: AI Chat Logging and Entity Extraction
    print("\n--- Test 6: Testing Conversational AI agent (Entity Extraction & Summarization) ---")
    chat_payload = {
        "message": "I had a call with Dr. Jenkins today. We discussed CardioCare dosing and safety. She was positive. I gave her 3 samples of CardioCare and shared the CardioCare brochure.",
        "current_form_state": {
            "hcp_id": 0,
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
    }
    res = requests.post(f"{API_BASE}/chat", json=chat_payload)
    assert res.status_code == 200, res.text
    chat_response = res.json()
    print("Agent Reply:")
    print(chat_response["reply"])
    print("Tools Executed by Agent:")
    print(chat_response["tools_called"])
    print("Extracted Form State:")
    print(json.dumps(chat_response["form_state"], indent=2))
    
    extracted_form = chat_response["form_state"]
    assert extracted_form["hcp_id"] == 1, f"Expected hcp_id 1 (Dr. Jenkins), got {extracted_form['hcp_id']}"
    assert extracted_form["sentiment"] == "Positive", f"Expected sentiment Positive, got {extracted_form['sentiment']}"
    assert len(extracted_form["samples_distributed"]) > 0, "Expected samples distributed to be extracted"
    print("Success! Conversational extraction correct.")

    # Test 7: Direct Edit Interaction (Update operation)
    print("\n--- Test 7: Updating Interaction via Form (Update) ---")
    update_payload = payload.copy()
    update_payload["outcomes"] = "Updated outcome for Dr. Robert Chen."
    res = requests.put(f"{API_BASE}/interactions/{interaction_id}", json=update_payload)
    assert res.status_code == 200, res.text
    update_data = res.json()
    print(f"Success! Response: {json.dumps(update_data, indent=2)}")

    # Verify update in DB
    res = requests.get(f"{API_BASE}/interactions")
    interactions = res.json()
    matching = [i for i in interactions if i["id"] == interaction_id][0]
    assert matching["outcomes"] == "Updated outcome for Dr. Robert Chen.", f"Got outcomes: {matching['outcomes']}"
    print("Confirmed update reflected in DB successfully.")

    # Test 8: Delete Interaction (Delete operation)
    print("\n--- Test 8: Deleting Interaction (Delete) ---")
    res = requests.delete(f"{API_BASE}/interactions/{interaction_id}")
    assert res.status_code == 200
    delete_data = res.json()
    print(f"Success! Response: {json.dumps(delete_data, indent=2)}")

    # Verify deletion in DB
    res = requests.get(f"{API_BASE}/interactions")
    interactions = res.json()
    matching = [i for i in interactions if i["id"] == interaction_id]
    assert len(matching) == 0, "Interaction was not deleted from DB"
    print("Confirmed deletion reflected in DB successfully.")

    print("\n==================================================")
    print("ALL API AND AGENT INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
