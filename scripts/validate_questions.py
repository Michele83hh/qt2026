"""
CCNA Question Validation & Review Tool
========================================
Dieses Skript hilft bei der systematischen Überprüfung aller Fragen.

Funktionen:
1. Zeigt Frage für Frage zur manuellen Überprüfung an
2. Markiert verdächtige Fragen (leere Erklärungen, falsche Kategorien, etc.)
3. Exportiert Fragen zur Überarbeitung in eine Review-Datei
4. Ermöglicht direktes Korrigieren der Antworten
"""

import json
import sys
from pathlib import Path
from typing import Dict, List

# CCNA Topic Distribution (Official Exam Blueprint)
OFFICIAL_TOPICS = {
    'Network Fundamentals': 0.20,
    'Network Access': 0.20,
    'IP Connectivity': 0.25,
    'IP Services': 0.10,
    'Security Fundamentals': 0.15,
    'Automation and Programmability': 0.10
}

# Subtopic-Kategorien für bessere Zuordnung
TOPIC_KEYWORDS = {
    'Network Fundamentals': [
        'osi model', 'tcp/ip', 'network topology', 'cable', 'fiber',
        'ethernet', 'lan', 'wan', 'switch basic', 'router basic',
        'ipv4 address', 'ipv6 address', 'subnet', 'wireless basic'
    ],
    'Network Access': [
        'vlan', 'trunk', 'dtp', 'stp', 'rstp', 'etherchannel',
        'port security', 'switch config', 'layer 2'
    ],
    'IP Connectivity': [
        'routing', 'static route', 'default route', 'rip', 'ospf', 'eigrp',
        'layer 3', 'routing table', 'routing protocol', 'gateway'
    ],
    'IP Services': [
        'nat', 'pat', 'dhcp', 'dns', 'ntp', 'snmp', 'syslog',
        'tftp', 'ftp', 'qos'
    ],
    'Security Fundamentals': [
        'acl', 'access list', 'security', 'authentication', 'authorization',
        'aaa', 'vpn', 'firewall', 'ips', 'threat', 'vulnerability'
    ],
    'Automation and Programmability': [
        'api', 'rest', 'json', 'xml', 'python', 'ansible', 'netconf',
        'restconf', 'controller', 'sdn', 'automation'
    ]
}

def load_questions(file_path: str) -> Dict:
    """Lädt die Fragen aus der JSON-Datei."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def suggest_topic(question_text: str, subtopic: str) -> str:
    """Schlägt ein Topic basierend auf Keywords vor."""
    text_lower = (question_text + ' ' + subtopic).lower()

    scores = {}
    for topic, keywords in TOPIC_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in text_lower)
        scores[topic] = score

    suggested = max(scores, key=scores.get)
    if scores[suggested] == 0:
        return "❓ UNCLEAR"
    return suggested

def analyze_question_quality(q: Dict) -> List[str]:
    """Analysiert die Qualität einer Frage und gibt Warnungen zurück."""
    warnings = []

    # Überprüfe Pflichtfelder
    if not q.get('explanation'):
        warnings.append("⚠️ KEINE ERKLÄRUNG")
    elif len(q['explanation']) < 50:
        warnings.append("⚠️ ERKLÄRUNG ZU KURZ (< 50 Zeichen)")

    if not q.get('correctAnswer') or len(q['correctAnswer']) == 0:
        warnings.append("🚨 KEINE RICHTIGE ANTWORT DEFINIERT")

    if not q.get('options') or len(q['options']) < 2:
        warnings.append("🚨 ZU WENIG ANTWORTMÖGLICHKEITEN")

    # Topic-Überprüfung
    if q.get('topic') == 'Network Fundamentals':
        suggested = suggest_topic(q.get('question', ''), q.get('subtopic', ''))
        if suggested != 'Network Fundamentals' and suggested != "❓ UNCLEAR":
            warnings.append(f"❓ TOPIC MÖGLICHERWEISE FALSCH → Vorschlag: {suggested}")

    # Schwierigkeit-Plausibilität
    if q.get('difficulty') == 'easy' and len(q.get('explanation', '')) > 200:
        warnings.append("❓ 'EASY' aber lange Erklärung → evtl. 'medium'?")

    return warnings

def export_review_file(questions: List[Dict], output_path: str):
    """Exportiert Fragen für manuelle Review in eine strukturierte Datei."""

    review_data = {
        "review_metadata": {
            "total_questions": len(questions),
            "created_at": "2026-01-05",
            "status": "NEEDS_REVIEW",
            "instructions": "Überprüfe jede Frage und markiere 'reviewed': true wenn korrekt"
        },
        "questions_to_review": []
    }

    for q in questions:
        warnings = analyze_question_quality(q)
        suggested_topic = suggest_topic(q.get('question', ''), q.get('subtopic', ''))

        review_entry = {
            "id": q.get('id'),
            "current_topic": q.get('topic'),
            "suggested_topic": suggested_topic,
            "question": q.get('question'),
            "options": q.get('options', []),
            "current_correct_answer": q.get('correctAnswer', []),
            "current_explanation": q.get('explanation', ''),
            "warnings": warnings,
            "reviewed": False,
            "corrections": {
                "correct_answer": None,  # Füge hier die richtigen Indices ein
                "explanation": None,     # Verbesserte Erklärung
                "topic": None,           # Korrigiertes Topic
                "difficulty": None       # Korrigierte Schwierigkeit
            }
        }

        review_data["questions_to_review"].append(review_entry)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(review_data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Review-Datei erstellt: {output_path}")
    print(f"   {len(questions)} Fragen exportiert zur manuellen Überprüfung")

def print_question_summary(questions: List[Dict]):
    """Zeigt eine Zusammenfassung der Fragenqualität."""

    print("\n" + "="*70)
    print("FRAGEN-QUALITÄTSANALYSE")
    print("="*70)

    total = len(questions)
    topic_distribution = {}
    difficulty_distribution = {}
    questions_with_issues = []

    for q in questions:
        # Topic-Verteilung
        topic = q.get('topic', 'UNKNOWN')
        topic_distribution[topic] = topic_distribution.get(topic, 0) + 1

        # Schwierigkeit-Verteilung
        diff = q.get('difficulty', 'UNKNOWN')
        difficulty_distribution[diff] = difficulty_distribution.get(diff, 0) + 1

        # Probleme
        warnings = analyze_question_quality(q)
        if warnings:
            questions_with_issues.append({
                'id': q.get('id'),
                'question': q.get('question', '')[:60] + '...',
                'warnings': warnings
            })

    print(f"\n📊 GESAMT: {total} Fragen")

    print(f"\n📂 TOPIC-VERTEILUNG:")
    for topic, count in sorted(topic_distribution.items(), key=lambda x: -x[1]):
        percentage = (count / total) * 100
        official_pct = OFFICIAL_TOPICS.get(topic, 0) * 100
        status = "✅" if abs(percentage - official_pct) < 5 else "⚠️"
        print(f"   {status} {topic:35} {count:4} ({percentage:5.1f}% | Soll: {official_pct:5.1f}%)")

    print(f"\n🎯 SCHWIERIGKEIT:")
    for diff, count in sorted(difficulty_distribution.items()):
        percentage = (count / total) * 100
        print(f"   {diff:10} {count:4} ({percentage:5.1f}%)")

    print(f"\n⚠️  PROBLEMATISCHE FRAGEN: {len(questions_with_issues)}")
    if questions_with_issues:
        print("\nErste 10 Fragen mit Problemen:")
        for item in questions_with_issues[:10]:
            print(f"\n   ID: {item['id']}")
            print(f"   Q:  {item['question']}")
            for warning in item['warnings']:
                print(f"       {warning}")

    print("\n" + "="*70)

def main():
    # Pfad zur Fragen-Datei
    questions_file = Path(__file__).parent.parent / 'src' / 'data' / 'questions.json'

    if not questions_file.exists():
        print(f"❌ Datei nicht gefunden: {questions_file}")
        return

    # Lade Fragen
    print(f"📖 Lade Fragen von: {questions_file}")
    data = load_questions(str(questions_file))
    questions = data.get('questions', [])

    if not questions:
        print("❌ Keine Fragen gefunden!")
        return

    # Analyse
    print_question_summary(questions)

    # Export für Review
    review_file = Path(__file__).parent.parent / 'data' / 'questions_review.json'
    review_file.parent.mkdir(exist_ok=True)

    export_review_file(questions, str(review_file))

    print(f"\n📝 NÄCHSTE SCHRITTE:")
    print(f"   1. Öffne: {review_file}")
    print(f"   2. Überprüfe jede Frage manuell")
    print(f"   3. Fülle das 'corrections' Objekt aus für fehlerhafte Fragen")
    print(f"   4. Setze 'reviewed': true für geprüfte Fragen")
    print(f"   5. Führe apply_corrections.py aus um Korrekturen anzuwenden")

if __name__ == '__main__':
    main()
