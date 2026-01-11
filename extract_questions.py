"""
CCNA Question Extractor - Triple Pass with Maximum Accuracy
Extracts all 628 CCNA questions from PNG screenshots using OCR
"""

import os
import json
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple
from datetime import datetime
import base64

try:
    from PIL import Image
    import pytesseract
except ImportError:
    print("Installing required packages...")
    os.system("pip install pillow pytesseract")
    from PIL import Image
    import pytesseract

# Try to use Anthropic Claude for better OCR if available
USE_CLAUDE_OCR = True
try:
    import anthropic
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
    if ANTHROPIC_API_KEY:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    else:
        USE_CLAUDE_OCR = False
        print("ANTHROPIC_API_KEY not found, using fallback OCR")
except ImportError:
    USE_CLAUDE_OCR = False
    print("Anthropic package not installed, using fallback OCR")

BASE_DIR = Path(r"C:\Users\mjoan\Desktop\ccna-exam-app")
QUESTIONS_DIR = BASE_DIR / "Fragen"
DATA_DIR = BASE_DIR / "data"

# Ensure data directory exists
DATA_DIR.mkdir(exist_ok=True)

def categorize_question(topic_ref: str, question_text: str) -> str:
    """Auto-categorize based on topic and content"""
    topic_text = f"{topic_ref} {question_text}".lower()

    # Topic-based categorization
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

    # Content-based categorization as fallback
    if any(word in topic_text for word in ["vlan", "switch", "trunk", "stp", "wireless", "port security"]):
        return "network-access"
    elif any(word in topic_text for word in ["routing", "ospf", "eigrp", "static route", "rip"]):
        return "ip-connectivity"
    elif any(word in topic_text for word in ["dhcp", "nat", "pat", "ntp", "snmp", "syslog"]):
        return "ip-services"
    elif any(word in topic_text for word in ["security", "acl", "firewall", "aaa", "vpn"]):
        return "security-fundamentals"
    elif any(word in topic_text for word in ["api", "json", "python", "automation", "rest", "netconf"]):
        return "automation-programmability"
    elif any(word in topic_text for word in ["osi", "tcp", "model", "cable", "topology", "ethernet"]):
        return "network-fundamentals"

    return "network-fundamentals"  # Default

def extract_with_claude(image_path: Path) -> Dict[str, Any]:
    """Extract question data using Claude Vision API"""
    try:
        with open(image_path, 'rb') as f:
            image_data = base64.standard_b64encode(f.read()).decode('utf-8')

        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": image_data
                        }
                    },
                    {
                        "type": "text",
                        "text": """Extract the CCNA exam question from this screenshot with MAXIMUM ACCURACY. Return ONLY valid JSON with this exact structure:

{
  "questionNumber": <number from "Question X" header>,
  "questionText": "<exact question text, word-for-word>",
  "options": ["<option 1>", "<option 2>", "<option 3>", "<option 4>"],
  "correctAnswerIndexes": [<0-based index of correct answer(s), blue background with checkmark>],
  "multipleAnswers": <true if question contains "(Choose two)" or "(Choose three)", else false>,
  "explanation": "<exact explanation text from 'Correct' section>",
  "topicReference": "<e.g. 'Topic 1.8.0' from explanation>",
  "extractionConfidence": "<high/medium/low>"
}

CRITICAL:
- Extract text EXACTLY as shown, including any typos
- Options with BLUE background and checkmark are correct
- Look for "(Choose two)" or "(Choose three)" in question text
- Extract topic reference from explanation (e.g., "Topic 1.8.0")
- Return ONLY the JSON object, no other text"""
                    }
                ]
            }]
        )

        response_text = message.content[0].text.strip()
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            response_text = re.sub(r'^```json?\s*', '', response_text)
            response_text = re.sub(r'\s*```$', '', response_text)

        data = json.loads(response_text)
        data["extractionMethod"] = "claude-vision"
        return data

    except Exception as e:
        print(f"Claude extraction failed for {image_path.name}: {e}")
        return None

def extract_with_tesseract(image_path: Path) -> Dict[str, Any]:
    """Fallback extraction using Tesseract OCR"""
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)

        # Parse the text (basic implementation)
        lines = [line.strip() for line in text.split('\n') if line.strip()]

        # Extract question number
        question_num = 0
        for line in lines[:3]:
            match = re.search(r'Question\s+(\d+)', line, re.IGNORECASE)
            if match:
                question_num = int(match.group(1))
                break

        # Basic parsing (this is a simplified fallback)
        question_text = ""
        options = []
        explanation = ""

        # This is a very basic parser - Claude Vision is much better
        return {
            "questionNumber": question_num,
            "questionText": question_text or "EXTRACTION FAILED - NEEDS MANUAL REVIEW",
            "options": options or ["Option extraction failed"],
            "correctAnswerIndexes": [],
            "multipleAnswers": False,
            "explanation": explanation or "Explanation extraction failed",
            "topicReference": "",
            "extractionConfidence": "low",
            "extractionMethod": "tesseract-ocr"
        }

    except Exception as e:
        print(f"Tesseract extraction failed for {image_path.name}: {e}")
        return None

def extract_question(image_path: Path, pass_number: int) -> Dict[str, Any]:
    """Extract a single question with retry logic"""

    # Try Claude Vision first (best accuracy)
    if USE_CLAUDE_OCR:
        data = extract_with_claude(image_path)
        if data:
            # Add metadata
            question_text = data.get("questionText", "")
            topic_ref = data.get("topicReference", "")

            data["id"] = f"q{data['questionNumber']:03d}"
            data["category"] = categorize_question(topic_ref, question_text)
            data["needsReview"] = data.get("extractionConfidence", "low") != "high"

            return data

    # Fallback to Tesseract
    data = extract_with_tesseract(image_path)
    if data:
        question_text = data.get("questionText", "")
        topic_ref = data.get("topicReference", "")

        data["id"] = f"q{data['questionNumber']:03d}"
        data["category"] = categorize_question(topic_ref, question_text)
        data["needsReview"] = True  # Always needs review for tesseract

        return data

    return None

def run_extraction_pass(pass_number: int) -> List[Dict[str, Any]]:
    """Run a complete extraction pass on all 628 questions"""
    print(f"\n{'='*80}")
    print(f"EXTRACTION PASS {pass_number}")
    print(f"{'='*80}\n")

    # Get all PNG files sorted by name
    image_files = sorted(QUESTIONS_DIR.glob("*.png"))
    total_files = len(image_files)

    print(f"Found {total_files} image files")
    print(f"Starting extraction at {datetime.now().strftime('%H:%M:%S')}\n")

    questions = []
    failed = []

    for idx, image_path in enumerate(image_files, 1):
        try:
            print(f"[{idx}/{total_files}] Processing {image_path.name}...", end=" ")

            question_data = extract_question(image_path, pass_number)

            if question_data:
                questions.append(question_data)
                conf = question_data.get("extractionConfidence", "unknown")
                print(f"✓ Q{question_data['questionNumber']} ({conf})")
            else:
                failed.append(image_path.name)
                print(f"✗ FAILED")

        except Exception as e:
            print(f"✗ ERROR: {e}")
            failed.append(image_path.name)

    print(f"\n{'='*80}")
    print(f"PASS {pass_number} COMPLETE")
    print(f"{'='*80}")
    print(f"Successfully extracted: {len(questions)}/{total_files}")
    print(f"Failed: {len(failed)}")
    if failed:
        print(f"Failed files: {', '.join(failed[:10])}")
        if len(failed) > 10:
            print(f"... and {len(failed) - 10} more")

    return questions

def save_pass_results(pass_number: int, questions: List[Dict[str, Any]]):
    """Save extraction pass results to JSON file"""
    output_file = DATA_DIR / f"extraction-pass{pass_number}.json"

    database = {
        "version": "1.0.0",
        "passNumber": pass_number,
        "extractedAt": datetime.now().isoformat(),
        "totalQuestions": len(questions),
        "questions": questions
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(database, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Saved to {output_file}")

    # Statistics
    confidence_counts = {"high": 0, "medium": 0, "low": 0}
    for q in questions:
        conf = q.get("extractionConfidence", "low")
        confidence_counts[conf] = confidence_counts.get(conf, 0) + 1

    print(f"\nConfidence Distribution:")
    print(f"  High:   {confidence_counts['high']}")
    print(f"  Medium: {confidence_counts['medium']}")
    print(f"  Low:    {confidence_counts['low']}")

def compare_passes():
    """Compare all three extraction passes"""
    print(f"\n{'='*80}")
    print(f"COMPARING ALL THREE PASSES")
    print(f"{'='*80}\n")

    # Load all three passes
    pass1 = json.load(open(DATA_DIR / "extraction-pass1.json", encoding='utf-8'))
    pass2 = json.load(open(DATA_DIR / "extraction-pass2.json", encoding='utf-8'))
    pass3 = json.load(open(DATA_DIR / "extraction-pass3.json", encoding='utf-8'))

    questions1 = {q["id"]: q for q in pass1["questions"]}
    questions2 = {q["id"]: q for q in pass2["questions"]}
    questions3 = {q["id"]: q for q in pass3["questions"]}

    all_ids = set(questions1.keys()) | set(questions2.keys()) | set(questions3.keys())

    comparison = {
        "comparedAt": datetime.now().isoformat(),
        "totalQuestions": len(all_ids),
        "allThreeMatch": [],
        "twoOfThreeMatch": [],
        "allThreeDiffer": [],
        "missingInPasses": []
    }

    for qid in sorted(all_ids):
        q1 = questions1.get(qid)
        q2 = questions2.get(qid)
        q3 = questions3.get(qid)

        # Check if present in all passes
        present = [q1 is not None, q2 is not None, q3 is not None]
        if not all(present):
            comparison["missingInPasses"].append({
                "questionId": qid,
                "presentInPass1": present[0],
                "presentInPass2": present[1],
                "presentInPass3": present[2]
            })
            continue

        # Compare key fields
        def compare_questions(qa, qb):
            """Return similarity score between two questions"""
            score = 0
            if qa["questionText"] == qb["questionText"]:
                score += 3
            if qa["options"] == qb["options"]:
                score += 2
            if qa["correctAnswerIndexes"] == qb["correctAnswerIndexes"]:
                score += 2
            if qa["explanation"] == qb["explanation"]:
                score += 1
            return score

        score12 = compare_questions(q1, q2)
        score13 = compare_questions(q1, q3)
        score23 = compare_questions(q2, q3)

        max_score = 8
        threshold_match = 6  # 75% similarity

        matches = sum([score12 >= threshold_match, score13 >= threshold_match, score23 >= threshold_match])

        if matches == 3:
            comparison["allThreeMatch"].append({
                "questionId": qid,
                "questionNumber": q1["questionNumber"],
                "confidence": "high"
            })
        elif matches >= 1:
            comparison["twoOfThreeMatch"].append({
                "questionId": qid,
                "questionNumber": q1["questionNumber"],
                "confidence": "medium",
                "similarities": {"pass1-2": score12, "pass1-3": score13, "pass2-3": score23}
            })
        else:
            comparison["allThreeDiffer"].append({
                "questionId": qid,
                "questionNumber": q1["questionNumber"],
                "confidence": "low",
                "needsManualReview": True
            })

    # Save comparison
    output_file = DATA_DIR / "extraction-comparison.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(comparison, f, indent=2, ensure_ascii=False)

    print(f"✓ Saved comparison to {output_file}\n")
    print(f"Results:")
    print(f"  All 3 passes match:  {len(comparison['allThreeMatch'])} questions (high confidence)")
    print(f"  2 of 3 passes match: {len(comparison['twoOfThreeMatch'])} questions (medium confidence)")
    print(f"  All 3 differ:        {len(comparison['allThreeDiffer'])} questions (needs review)")
    print(f"  Missing in passes:   {len(comparison['missingInPasses'])} questions")

    return comparison

def create_final_database():
    """Create final questions-full.json with best data from all passes"""
    print(f"\n{'='*80}")
    print(f"CREATING FINAL DATABASE")
    print(f"{'='*80}\n")

    # Load all three passes
    pass1 = json.load(open(DATA_DIR / "extraction-pass1.json", encoding='utf-8'))
    pass2 = json.load(open(DATA_DIR / "extraction-pass2.json", encoding='utf-8'))
    pass3 = json.load(open(DATA_DIR / "extraction-pass3.json", encoding='utf-8'))
    comparison = json.load(open(DATA_DIR / "extraction-comparison.json", encoding='utf-8'))

    questions1 = {q["id"]: q for q in pass1["questions"]}
    questions2 = {q["id"]: q for q in pass2["questions"]}
    questions3 = {q["id"]: q for q in pass3["questions"]}

    final_questions = []

    # For questions where all 3 match, use pass1 (arbitrary choice)
    for item in comparison["allThreeMatch"]:
        qid = item["questionId"]
        final_questions.append(questions1[qid])

    # For questions where 2/3 match, pick the best one
    for item in comparison["twoOfThreeMatch"]:
        qid = item["questionId"]
        sims = item.get("similarities", {})

        # Pick the question with highest average similarity
        q1 = questions1.get(qid)
        q2 = questions2.get(qid)
        q3 = questions3.get(qid)

        candidates = [q for q in [q1, q2, q3] if q]
        if candidates:
            # Prefer higher confidence
            best = max(candidates, key=lambda q: (
                {"high": 3, "medium": 2, "low": 1}.get(q.get("extractionConfidence", "low"), 0)
            ))
            final_questions.append(best)

    # For questions where all differ, mark for review and pick best confidence
    for item in comparison["allThreeDiffer"]:
        qid = item["questionId"]
        candidates = [q for q in [questions1.get(qid), questions2.get(qid), questions3.get(qid)] if q]
        if candidates:
            best = max(candidates, key=lambda q: (
                {"high": 3, "medium": 2, "low": 1}.get(q.get("extractionConfidence", "low"), 0)
            ))
            best["needsReview"] = True
            best["extractionConfidence"] = "low"
            final_questions.append(best)

    # Sort by question number
    final_questions.sort(key=lambda q: q["questionNumber"])

    # Create final database
    database = {
        "version": "1.0.0",
        "lastUpdated": datetime.now().isoformat(),
        "totalQuestions": len(final_questions),
        "extractionMethod": "triple-pass-with-comparison",
        "questions": final_questions
    }

    output_file = DATA_DIR / "questions-full.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(database, f, indent=2, ensure_ascii=False)

    print(f"✓ Created final database: {output_file}")
    print(f"\nFinal Statistics:")
    print(f"  Total questions: {len(final_questions)}")

    # Category distribution
    category_counts = {}
    for q in final_questions:
        cat = q["category"]
        category_counts[cat] = category_counts.get(cat, 0) + 1

    print(f"\nCategory Distribution:")
    for cat, count in sorted(category_counts.items()):
        print(f"  {cat}: {count}")

    # Confidence distribution
    conf_counts = {"high": 0, "medium": 0, "low": 0}
    needs_review = 0
    for q in final_questions:
        conf = q.get("extractionConfidence", "low")
        conf_counts[conf] = conf_counts.get(conf, 0) + 1
        if q.get("needsReview", False):
            needs_review += 1

    print(f"\nConfidence Distribution:")
    print(f"  High:   {conf_counts['high']}")
    print(f"  Medium: {conf_counts['medium']}")
    print(f"  Low:    {conf_counts['low']}")
    print(f"\nNeeds Review: {needs_review} questions")

def main():
    """Main extraction workflow"""
    print("\n" + "="*80)
    print("CCNA QUESTION EXTRACTOR - TRIPLE PASS")
    print("="*80)
    print(f"Source: {QUESTIONS_DIR}")
    print(f"Output: {DATA_DIR}")
    print(f"OCR Method: {'Claude Vision API' if USE_CLAUDE_OCR else 'Tesseract OCR'}")

    # Pass 1
    questions_pass1 = run_extraction_pass(1)
    save_pass_results(1, questions_pass1)

    # Pass 2
    questions_pass2 = run_extraction_pass(2)
    save_pass_results(2, questions_pass2)

    # Pass 3
    questions_pass3 = run_extraction_pass(3)
    save_pass_results(3, questions_pass3)

    # Comparison
    compare_passes()

    # Final database
    create_final_database()

    print(f"\n{'='*80}")
    print("EXTRACTION COMPLETE!")
    print(f"{'='*80}\n")

if __name__ == "__main__":
    main()
