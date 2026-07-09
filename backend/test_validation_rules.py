import json
import requests
import sys

# Ensure stdout supports UTF-8 emojis on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

API_BASE = "https://ai-first-crm-hcp-module-production-0ddc.up.railway.app"

def test_production_rules():
    print("==================================================")
    print("STARTING ADVANCED DATABASE VALIDATIONS TESTS")
    print("==================================================")

    # Step 1: Create a baseline interaction
    print("\n--- Step 1: Creating Baseline Interaction ---")
    payload = {
        "hcp_id": 1,
        "date": "2026-07-09",
        "time": "14:00",
        "interaction_type": "Meeting",
        "attendees": [],
        "topics_discussed": "Discussed CardioCare",
        "materials_shared": [],
        "samples_distributed": [{"id": 2, "name": "CardioCare", "quantity": 10}], # Distribute 10
        "sentiment": "Neutral",
        "outcomes": "None",
        "follow_up_actions": "",
        "ai_suggested_followups": []
    }
    
    # We query the current stock of CardioCare first
    # Seed CardioCare stock is 250
    res = requests.get(f"{API_BASE}/materials-samples")
    samples = res.json()["samples"]
    cardiocare_stock_before = next(s["stock_quantity"] for s in samples if s["id"] == 2)
    print(f"CardioCare stock before distribution: {cardiocare_stock_before}")

    # Log interaction
    res = requests.post(f"{API_BASE}/interactions", json=payload)
    assert res.status_code == 200
    inter_id = res.json()["id"]
    print(f"Logged baseline interaction #{inter_id}")

    # Verify stock decremented by 10
    res = requests.get(f"{API_BASE}/materials-samples")
    samples = res.json()["samples"]
    cardiocare_stock_after = next(s["stock_quantity"] for s in samples if s["id"] == 2)
    print(f"CardioCare stock after distributing 10: {cardiocare_stock_after}")
    assert cardiocare_stock_before - cardiocare_stock_after == 10

    # Step 2: Test duplicate follow-up task prevention
    print("\n--- Step 2: Testing Duplicate Follow-up Task Prevention ---")
    # First, let's call the chat agent to create a task
    chat_payload = {
        "message": f"Create follow-up task 'Send CardioCare brochure' due on 2026-07-20 for interaction {inter_id}"
    }
    res = requests.post(f"{API_BASE}/chat", json=chat_payload)
    print("First task creation response:")
    print(res.json()["reply"])
    assert "Scheduled" in res.json()["reply"] or "✅" in res.json()["reply"]

    # Try creating the exact same task again
    res = requests.post(f"{API_BASE}/chat", json=chat_payload)
    print("Second task creation response (duplicate):")
    print(res.json()["reply"])
    assert "Failed" in res.json()["reply"] or "❌" in res.json()["reply"]
    print("Success! Duplicate task was blocked.")

    # Step 3: Test Insufficient Stock Prevention
    print("\n--- Step 3: Testing Insufficient Stock Prevention ---")
    # CardioCare current stock is ~240. Let's try distributing 1000 units.
    chat_payload_exceeded = {
        "message": "I met Dr. Sarah Jenkins and gave her 1000 samples of CardioCare. Log this interaction."
    }
    res = requests.post(f"{API_BASE}/chat", json=chat_payload_exceeded)
    print("Log interaction with insufficient stock response:")
    print(res.json()["reply"])
    assert "Log Failed" in res.json()["reply"] or "❌" in res.json()["reply"]
    assert "Insufficient stock" in res.json()["reply"]
    print("Success! Insufficient stock logging was blocked.")

    # Step 4: Test Stock Restoration on Edit
    print("\n--- Step 4: Testing Stock Restoration & Adjustment on Edit ---")
    # Interaction has 10 CardioCare. Let's update it to distribute 15 CardioCare.
    # Stock should restore 10 (returns to 250) and deduct 15 (ends at 235).
    # We call edit_interaction via chat or direct PUT
    update_payload = payload.copy()
    update_payload["samples_distributed"] = [{"id": 2, "name": "CardioCare", "quantity": 15}]
    
    res = requests.put(f"{API_BASE}/interactions/{inter_id}", json=update_payload)
    assert res.status_code == 200
    print("Updated interaction details successfully.")

    # Verify final stock
    res = requests.get(f"{API_BASE}/materials-samples")
    samples = res.json()["samples"]
    cardiocare_stock_final = next(s["stock_quantity"] for s in samples if s["id"] == 2)
    print(f"CardioCare stock after editing distribution to 15: {cardiocare_stock_final}")
    assert cardiocare_stock_before - cardiocare_stock_final == 15
    print("Success! Stock was correctly restored and adjusted during edit.")

    # Cleanup
    requests.delete(f"{API_BASE}/interactions/{inter_id}")
    print("\nCleaned up test interaction.")
    
    print("\n==================================================")
    print("ALL PRODUCTION-GRADE VALIDATION CHECKS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    test_production_rules()
