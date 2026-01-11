"""
Batch extraction script - processes screenshots in batches
Run this with: python batch_extract.py
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime
import base64

# Configuration
BASE_DIR = Path(r"C:\Users\mjoan\Desktop\ccna-exam-app")
QUESTIONS_DIR = BASE_DIR / "Fragen"
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

def categorize_question(topic_ref: str, question_text: str) -> str:
    """Auto-categorize based on topic and content"""
    topic_text = f"{topic_ref} {question_text}".lower()

    if topic_ref:
        topic_num = topic_ref.split()[1] if len(topic_ref.split()) > 1 else ""
        if topic_num.startswith("1."):
            return "network-fundamentals"
        elif topic_num.startswith("2."):
            return "network-access"
        elif topic_num.startswith("3."):
            return "ip-connectivity"
        elif topic_num.startswith("4."):
            return "ip-services"
        elif topic_num.startswith("5."):
            return "security-fundamentals"
        elif topic_num.startswith("6."):
            return "automation-programmability"

    # Content-based fallback
    if any(word in topic_text for word in ["vlan", "switch", "trunk", "stp", "wireless"]):
        return "network-access"
    elif any(word in topic_text for word in ["routing", "ospf", "eigrp", "rip"]):
        return "ip-connectivity"
    elif any(word in topic_text for word in ["dhcp", "nat", "ntp", "snmp"]):
        return "ip-services"
    elif any(word in topic_text for word in ["security", "acl", "firewall", "aaa"]):
        return "security-fundamentals"
    elif any(word in topic_text for word in ["api", "json", "python", "automation"]):
        return "automation-programmability"

    return "network-fundamentals"

def get_all_screenshots():
    """Get all PNG files sorted"""
    return sorted(QUESTIONS_DIR.glob("*.png"))

def create_extraction_template():
    """Create template for manual extraction"""
    files = get_all_screenshots()
    print(f"Found {len(files)} screenshots")

    template = {
        "version": "1.0.0",
        "totalScreenshots": len(files),
        "extractionInstructions": "Process each screenshot and fill in the question data",
        "screenshots": []
    }

    for idx, file in enumerate(files, 1):
        template["screenshots"].append({
            "index": idx,
            "filename": file.name,
            "path": str(file),
            "extracted": False,
            "questionData": None
        })

    output_file = DATA_DIR / "extraction-template.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(template, f, indent=2)

    print(f"Created template: {output_file}")
    return template

def save_batch_results(batch_num: int, questions: list):
    """Save a batch of extracted questions"""
    output_file = DATA_DIR / f"batch-{batch_num:03d}.json"

    data = {
        "batchNumber": batch_num,
        "extractedAt": datetime.now().isoformat(),
        "questionCount": len(questions),
        "questions": questions
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Saved batch {batch_num}: {len(questions)} questions to {output_file}")

def merge_all_batches():
    """Merge all batch files into final database"""
    batch_files = sorted(DATA_DIR.glob("batch-*.json"))

    if not batch_files:
        print("No batch files found!")
        return

    all_questions = []

    for batch_file in batch_files:
        with open(batch_file, 'r', encoding='utf-8') as f:
            batch_data = json.load(f)
            all_questions.extend(batch_data["questions"])

    # Sort by question number
    all_questions.sort(key=lambda q: q["questionNumber"])

    # Create final database
    database = {
        "version": "1.0.0",
        "lastUpdated": datetime.now().isoformat(),
        "totalQuestions": len(all_questions),
        "questions": all_questions
    }

    output_file = DATA_DIR / "questions-full.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(database, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Created final database: {output_file}")
    print(f"  Total questions: {len(all_questions)}")

    # Statistics
    categories = {}
    for q in all_questions:
        cat = q["category"]
        categories[cat] = categories.get(cat, 0) + 1

    print(f"\nCategory Distribution:")
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count}")

if __name__ == "__main__":
    print("CCNA Question Batch Extractor")
    print("="*60)

    # Create template
    create_extraction_template()

    # Check for existing batches
    batch_files = list(DATA_DIR.glob("batch-*.json"))
    if batch_files:
        print(f"\nFound {len(batch_files)} existing batch files")
        merge_all_batches()
