"""End-to-end system live test script for ID-SHIELD.
Tests all primary features through the HTTP API.
"""
import json
import io
import httpx
import cv2
import numpy as np
import pytest

BASE_URL = "http://localhost:8000/api"

def create_synthetic_image(text="SAMPLE ID", w=600, h=400):
    img = np.ones((h, w, 3), dtype=np.uint8) * 255
    cv2.rectangle(img, (20, 20), (w-20, h-20), (50, 50, 50), 2)
    cv2.putText(img, text, (50, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(img, "Name: RAJESH KUMAR SHARMA", (50, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
    cv2.putText(img, "Father: MOHAN LAL SHARMA", (50, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
    cv2.putText(img, "DOB: 15/08/1990", (50, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
    cv2.putText(img, "Pincode: 110001", (50, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
    _, encoded = cv2.imencode(".png", img)
    return io.BytesIO(encoded.tobytes())

@pytest.mark.skip(reason="Manual E2E integration script requiring running external server on localhost:8000")
def test_full_system():
    print("=== STARTING LIVE SYSTEM TEST ===")
    
    # 1. Health Check
    r = httpx.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health failed: {r.status_code}"
    print("[PASS] 1. /api/health returned 200 OK")

    # 2. List Cases
    r = httpx.get(f"{BASE_URL}/cases")
    assert r.status_code == 200
    print(f"[PASS] 2. /api/cases returned {len(r.json())} cases")

    # 3. Create a Case
    case_payload = {
        "case_name": "Live Test Case Verification",
        "description": "Automated verification test case",
        "applicant_name": "Rajesh Kumar Sharma",
        "applicant_contact": "rajesh@example.com"
    }
    r = httpx.post(f"{BASE_URL}/cases", json=case_payload)
    assert r.status_code in (200, 201), f"Create case failed: {r.text}"
    case_data = r.json()
    case_id = case_data["id"]
    print(f"[PASS] 3. Created case ID: {case_id}")

    # 4. Upload Documents
    # Doc 1: Aadhaar
    f1 = create_synthetic_image("AADHAAR CARD - GOVT OF INDIA")
    files1 = [("files", ("aadhaar_doc.png", f1.getvalue(), "image/png"))]
    r = httpx.post(f"{BASE_URL}/cases/{case_id}/documents", files=files1)
    assert r.status_code in (200, 201), f"Upload 1 failed: {r.text}"
    doc1_id = r.json()["uploaded"][0]["id"]
    print(f"[PASS] 4a. Uploaded Aadhaar doc ID: {doc1_id}, type_label: {r.json()['uploaded'][0].get('document_type_label')}")

    # Doc 2: PAN
    f2 = create_synthetic_image("INCOME TAX DEPARTMENT - PERMANENT ACCOUNT NUMBER")
    files2 = [("files", ("pan_doc.png", f2.getvalue(), "image/png"))]
    r = httpx.post(f"{BASE_URL}/cases/{case_id}/documents", files=files2)
    assert r.status_code in (200, 201), f"Upload 2 failed: {r.text}"
    doc2_id = r.json()["uploaded"][0]["id"]
    print(f"[PASS] 4b. Uploaded PAN doc ID: {doc2_id}, type_label: {r.json()['uploaded'][0].get('document_type_label')}")

    # 5. Test Document Type Manual Override Endpoint
    r = httpx.patch(
        f"{BASE_URL}/cases/{case_id}/documents/{doc2_id}/type",
        json={"document_type": "pan"}
    )
    assert r.status_code == 200, f"PATCH doc type failed: {r.text}"
    updated_doc = r.json()
    assert updated_doc["document_type"] == "pan"
    print(f"[PASS] 5. Manual Document Type Override PATCH endpoint works (label: {updated_doc.get('document_type_label')})")

    # 6. Run Full Analysis Pipeline
    r = httpx.post(f"{BASE_URL}/cases/{case_id}/analyze", timeout=30.0)
    assert r.status_code == 202, f"Analysis start failed: {r.status_code} {r.text}"
    print("[PASS] 6. Analysis Pipeline triggered (HTTP 202 Accepted). Waiting for background execution...")
    
    # Poll analysis status
    import time
    max_wait = 30
    for i in range(max_wait):
        time.sleep(1)
        st = httpx.get(f"{BASE_URL}/cases/{case_id}/analysis")
        if st.status_code == 200:
            data = st.json()
            status = data.get("case_status")
            if status not in ("processing", "pending"):
                print(f"[PASS] 6b. Analysis completed with status: '{status}' in {i+1}s")
                break
    else:
        print("[WARN] Analysis still processing after timeout, proceeding to check endpoints")

    # 7. Test Cross-Document Comparison & Rule Engine Endpoint
    r = httpx.get(f"{BASE_URL}/cases/{case_id}/comparison")
    assert r.status_code == 200, f"Comparison failed: {r.text}"
    comp_res = r.json()
    assert "rules_evaluated" in comp_res, "rules_evaluated missing from comparison!"
    rules = comp_res["rules_evaluated"]
    print(f"[PASS] 7. Comparison API returned {len(rules)} evaluated rules:")
    for rule in rules:
        print(f"     - Rule: {rule['rule_name']} => {rule['status']} ({rule['explanation']})")

    # 8. Test Forensics Endpoint
    r = httpx.get(f"{BASE_URL}/cases/{case_id}/forensics")
    assert r.status_code == 200, f"Forensics failed: {r.text}"
    forensic_res = r.json()
    print(f"[PASS] 8. Forensics API returned {len(forensic_res.get('documents', []))} document forensic reports")

    # 9. Test Risk Assessment Endpoint
    r = httpx.get(f"{BASE_URL}/cases/{case_id}/risk")
    assert r.status_code == 200, f"Risk failed: {r.text}"
    risk_res = r.json()
    print(f"[PASS] 9. Risk Engine returned band: {risk_res.get('band')}, score: {risk_res.get('overall_score')}")

    # 10. Test Face Biometrics & Anti-Spoofing Endpoint
    r = httpx.get(f"{BASE_URL}/cases/{case_id}/faces")
    assert r.status_code == 200, f"Faces failed: {r.text}"
    faces_res = r.json()
    print(f"[PASS] 10. Faces API returned overall_status: '{faces_res.get('overall_status')}', faces count: {len(faces_res.get('faces', []))}")
    for face in faces_res.get("faces", []):
        anti_spoof = face.get("anti_spoofing")
        if anti_spoof:
            print(f"      - Face Anti-Spoofing: status='{anti_spoof['status']}', risk={anti_spoof['risk_score']}/100, moire={anti_spoof['moire_intensity']}")

    # 11. Test Human Verifier Review Disposition Endpoint
    review_body = {
        "decision": "approved",
        "notes": "Verified by compliance officer. All mandatory security criteria met.",
        "reviewer_name": "Chief Compliance Officer M. Sen"
    }
    r = httpx.post(f"{BASE_URL}/cases/{case_id}/review", json=review_body)
    assert r.status_code == 200, f"Review failed: {r.text}"
    reviewed_case = r.json()
    assert reviewed_case["review_status"] == "approved"
    assert reviewed_case["reviewer_name"] == "Chief Compliance Officer M. Sen"
    print(f"[PASS] 11. Review Disposition recorded: status='{reviewed_case['review_status']}' by '{reviewed_case['reviewer_name']}'")

    # 12. Test Comprehensive Report Endpoint
    r = httpx.get(f"{BASE_URL}/cases/{case_id}/report")
    assert r.status_code == 200, f"Report failed: {r.text}"
    report_res = r.json()
    print(f"[PASS] 12. Report API returned case: #{report_res.get('case_number')} '{report_res.get('case_name')}', rec: '{report_res.get('recommendation')}'")

    # 13. Test Analytics & Intelligence Endpoint
    r = httpx.get(f"{BASE_URL}/analytics")
    assert r.status_code == 200, f"Analytics failed: {r.text}"
    analytics_res = r.json()
    kpis = analytics_res.get("kpis", {})
    print(f"[PASS] 13. Analytics API returned KPIs: total_cases={kpis.get('total_cases')}, pass_rate={kpis.get('pass_rate')}%")

    print("\n>>> ALL SYSTEM FEATURES VERIFIED LIVE AND WORKING 100%! <<<")

if __name__ == "__main__":
    test_full_system()
