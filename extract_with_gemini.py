import os
import json
import sys
import time
from pathlib import Path
from datetime import datetime
import argparse
import google.generativeai as genai
from google.api_core import exceptions
from PIL import Image

# --- KONFIGURATION ---
BASE_DIR = Path(__file__).parent
QUESTIONS_DIR = BASE_DIR / "Fragen"
OUTPUT_DIR = BASE_DIR / "data"
OUTPUT_DIR.mkdir(exist_ok=True)

# API Key Prüfung
API_KEY = os.getenv("GOOGLE_API_KEY")
if not API_KEY:
    print("❌ ERROR: GOOGLE_API_KEY nicht gesetzt!")
    sys.exit(1)

# Gemini Konfiguration
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# --- THEMEN-LOGIK (ORIGINAL) ---
def categorize_from_topic(topic_ref: str, question_text: str) -> str:
    """Ordnet die Frage basierend auf Topic-Referenz oder Textinhalt zu"""
    if not topic_ref:
        text_lower = question_text.lower()
        if any(word in text_lower for word in ["vlan", "switch", "trunk", "stp", "wireless", "etherchannel"]):
            return "Network Access"
        elif any(word in text_lower for word in ["routing", "ospf", "eigrp", "rip", "hsrp", "vrrp"]):
            return "IP Connectivity"
        elif any(word in text_lower for word in ["dhcp", "nat", "pat", "ntp", "snmp", "syslog"]):
            return "IP Services"
        elif any(word in text_lower for word in ["security", "acl", "firewall", "aaa", "password", "encryption"]):
            return "Security Fundamentals"
        elif any(word in text_lower for word in ["api", "json", "python", "automation", "rest", "sdn"]):
            return "Automation and Programmability"
        return "Network Fundamentals"

    try:
        parts = topic_ref.split()
        if len(parts) >= 2:
            topic_num = parts[1].split('.')[0]
            topic_map = {
                "1": "Network Fundamentals", "2": "Network Access",
                "3": "IP Connectivity", "4": "IP Services",
                "5": "Security Fundamentals", "6": "Automation and Programmability"
            }
            return topic_map.get(topic_num, "Network Fundamentals")
    except: pass
    return "Network Fundamentals"

# --- EXTRACTION PROMPT (ORIGINAL) ---
EXTRACTION_PROMPT = """You are extracting CCNA exam questions from a screenshot. 
CRITICAL: BLUE background + white checkmark = CORRECT. Gray background = WRONG.

Return ONLY valid JSON in this format:
{
  "questionText": "...",
  "options": ["...", "..."],
  "correctAnswerIndexes": [index],
  "multipleAnswers": false,
  "explanation": "...",
  "topicReference": "Topic 1.8.0",
  "difficulty": "medium",
  "extractionConfidence": "high"
}"""

# --- HILFSFUNKTIONEN ---
def save_checkpoint(questions, filename, total_files_count):
    """Speichert den aktuellen Stand inklusive Metadaten"""
    output_path = OUTPUT_DIR / filename
    output_data = {
        "version": "1.0",
        "extractionDate": datetime.now().isoformat(),
        "totalQuestions": len(questions),
        "successRate": f"{(len(questions)/total_files_count)*100:.1f}%" if total_files_count > 0 else "0%",
        "questions": questions
    }
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

def extract_single_image(image_path, q_num):
    """Verarbeitet ein Bild mit automatischer Wiederholung bei Limits"""
    for attempt in range(3):
        try:
            img = Image.open(image_path)
            response = model.generate_content([EXTRACTION_PROMPT, img])
            res_text = response.text.strip()

            # Bereinige JSON-Antwort (entferne Markdown-Blöcke)
            if "```" in res_text:
                res_text = res_text.split("```")[1].replace("json", "").strip()
            
            data = json.loads(res_text)

            # Kategorisierung & Bereinigung (deine Original-Logik)
            topic = categorize_from_topic(data.get("topicReference", ""), data["questionText"])
            explanation = data["explanation"]
            if explanation.startswith("Correct\n") or explanation.startswith("Correct "):
                explanation = explanation[8:]
            explanation = explanation.replace("\n", " ").strip()

            return {
                "id": f"ext-{str(q_num).zfill(3)}",
                "source": "manual",
                "topic": topic,
                "subtopic": data.get("topicReference", ""),
                "difficulty": data.get("difficulty", "medium"),
                "type": "multiple-choice-multiple" if data["multipleAnswers"] else "multiple-choice-single",
                "question": data["questionText"],
                "options": data["options"],
                "correctAnswer": data["correctAnswerIndexes"],
                "explanation": explanation,
                "references": [data["topicReference"]] if data.get("topicReference") else [],
                "tags": [],
                "_extractionConfidence": data.get("extractionConfidence", "medium"),
                "_needsReview": data.get("extractionConfidence", "medium") != "high"
            }
        except exceptions.ResourceExhausted:
            wait_time = 20 * (attempt + 1)
            print(f" ⚠️ Limit erreicht. Pause {wait_time}s...", end="")
            time.sleep(wait_time)
        except Exception as e:
            print(f" ❌ Fehler: {str(e)[:50]}...", end="")
            break
    return None

# --- MAIN SCHLEIFE ---
def main():
    parser = argparse.ArgumentParser(description="CCNA Question Extractor")
    parser.add_argument("--test", action="store_true", help="Test mit ersten 10 Bildern")
    parser.add_argument("--full", action="store_true", help="Alle Bilder extrahieren")
    parser.add_argument("--start", type=int, default=0, help="Start-Index")
    parser.add_argument("--end", type=int, help="End-Index")
    args = parser.parse_args()

    # Dateien laden
    png_files = sorted(list(QUESTIONS_DIR.glob("*.png")))
    if not png_files:
        print(f"❌ Keine PNG-Dateien in {QUESTIONS_DIR} gefunden!")
        return

    # Bereich festlegen
    if args.test:
        files_to_process = png_files[:10]
        out_name = "test_extraction.json"
    else:
        end_idx = args.end if args.end else len(png_files)
        files_to_process = png_files[args.start:end_idx]
        out_name = "full_extraction.json"

    print(f"🚀 Starte Extraktion von {len(files_to_process)} Bildern...")
    results = []

    for i, f_path in enumerate(files_to_process):
        # Fortschrittsberechnung
        current_num = args.start + i + 1
        print(f"[{current_num}/{len(png_files)}] {f_path.name}...", end="", flush=True)
        
        res = extract_single_image(f_path, current_num)
        
        if res:
            results.append(res)
            print(" ✅", end="")
        else:
            print(" ❌", end="")
        
        # Sicherheits-Pause für API-Limits (Tier 1)
        time.sleep(2.5)
        
        # Alle 10 Bilder Checkpoint speichern
        if (i + 1) % 10 == 0:
            save_checkpoint(results, out_name, len(files_to_process))
            print(f" (Zwischenstand gespeichert)", end="")
        
        print("")

    # Finales Speichern
    save_checkpoint(results, out_name, len(files_to_process))
    print(f"\n✅ Fertig! {len(results)} Fragen gespeichert in: data/{out_name}")

if __name__ == "__main__":
    main()