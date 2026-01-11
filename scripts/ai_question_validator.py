"""
KI-basierter CCNA Fragen-Validator
====================================
Nutzt Claude API um alle Fragen automatisch zu validieren.

Für jede Frage prüft die KI:
1. Ist die markierte Antwort korrekt? (gegen CCNA-Wissen)
2. Welches Topic passt besser?
3. Wie schwierig ist die Frage aus Anfänger-Sicht?
4. Ist die Erklärung ausreichend/korrekt?
5. Verbesserungsvorschläge
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional
import time

try:
    import anthropic
except ImportError:
    print("❌ Anthropic SDK nicht installiert!")
    print("   Installiere mit: pip install anthropic")
    sys.exit(1)

# Offizielle CCNA Topics
CCNA_TOPICS = [
    'Network Fundamentals',
    'Network Access',
    'IP Connectivity',
    'IP Services',
    'Security Fundamentals',
    'Automation and Programmability'
]

VALIDATION_PROMPT_TEMPLATE = """Du bist ein CCNA (Cisco Certified Network Associate) 200-301 Experte.
Deine Aufgabe ist es, eine Prüfungsfrage auf Korrektheit zu überprüfen.

FRAGE:
{question}

ANTWORTMÖGLICHKEITEN:
{options}

AKTUELL MARKIERT ALS RICHTIG:
{marked_correct}

AKTUELLES TOPIC: {topic}
AKTUELLE SCHWIERIGKEIT: {difficulty}
AKTUELLE ERKLÄRUNG: {explanation}

BITTE PRÜFE:
1. Ist die markierte Antwort KORREKT? (Ja/Nein + Begründung)
2. Wenn FALSCH: Welche Antwort(en) sind richtig?
3. Passt das Topic "{topic}"? Wenn nein, welches passt besser?
4. Ist die Schwierigkeit "{difficulty}" angemessen aus Sicht eines Anfängers?
5. Ist die Erklärung vollständig und korrekt?

ANTWORTE NUR IM FOLGENDEN JSON-FORMAT:
{{
  "is_correct": true/false,
  "correct_answer_indices": [0, 1, 2...],
  "explanation_why": "Warum diese Antwort richtig/falsch ist",
  "suggested_topic": "Network Fundamentals",
  "topic_reasoning": "Warum dieses Topic besser passt",
  "suggested_difficulty": "easy/medium/hard",
  "difficulty_reasoning": "Warum diese Schwierigkeit",
  "explanation_quality": "good/needs_improvement/poor",
  "improved_explanation": "Verbesserte Erklärung (wenn nötig)",
  "confidence": "high/medium/low"
}}

WICHTIG: Antworte NUR mit dem JSON, keine zusätzlichen Texte!"""

class AIQuestionValidator:
    def __init__(self, api_key: Optional[str] = None):
        """Initialisiert den Validator mit Claude API."""
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY nicht gefunden! Setze Umgebungsvariable oder übergebe api_key.")

        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.results = []

    def validate_question(self, question: Dict) -> Dict:
        """Validiert eine einzelne Frage mit Claude."""

        # Bereite Antwortoptionen auf
        options_text = "\n".join([
            f"{i}. {opt}" for i, opt in enumerate(question.get('options', []))
        ])

        # Markierte korrekte Antworten
        correct_indices = question.get('correctAnswer', [])
        marked_correct = "\n".join([
            f"- {question['options'][i]} (Index {i})"
            for i in correct_indices if i < len(question.get('options', []))
        ])

        # Erstelle Prompt
        prompt = VALIDATION_PROMPT_TEMPLATE.format(
            question=question.get('question', 'N/A'),
            options=options_text,
            marked_correct=marked_correct or "KEINE",
            topic=question.get('topic', 'N/A'),
            difficulty=question.get('difficulty', 'N/A'),
            explanation=question.get('explanation', 'N/A')
        )

        try:
            # API-Aufruf
            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )

            # Extrahiere Antwort
            response_text = message.content[0].text.strip()

            # Parse JSON (entferne Markdown-Code-Blocks falls vorhanden)
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
                response_text = response_text.strip()

            validation_result = json.loads(response_text)

            # Füge Original-Frage hinzu
            validation_result['original_question'] = {
                'id': question.get('id'),
                'question': question.get('question'),
                'current_answer': correct_indices,
                'current_topic': question.get('topic'),
                'current_difficulty': question.get('difficulty')
            }

            return validation_result

        except json.JSONDecodeError as e:
            print(f"⚠️  JSON Parse Error bei Frage {question.get('id')}: {e}")
            print(f"   Antwort war: {response_text[:200]}...")
            return {
                'error': 'json_parse_error',
                'original_question': {'id': question.get('id')},
                'raw_response': response_text[:500]
            }
        except Exception as e:
            print(f"❌ Fehler bei Frage {question.get('id')}: {e}")
            return {
                'error': str(e),
                'original_question': {'id': question.get('id')}
            }

    def validate_all_questions(self, questions: List[Dict],
                               delay: float = 1.0,
                               max_questions: Optional[int] = None) -> List[Dict]:
        """Validiert alle Fragen (mit Rate-Limiting)."""

        total = min(len(questions), max_questions) if max_questions else len(questions)
        results = []

        print(f"\n🔍 Starte Validierung von {total} Fragen...")
        print(f"   (Rate Limit: {delay}s zwischen Anfragen)\n")

        for i, question in enumerate(questions[:total], 1):
            print(f"[{i}/{total}] Validiere: {question.get('id')} - {question.get('question', '')[:60]}...")

            result = self.validate_question(question)
            results.append(result)

            # Rate Limiting
            if i < total:
                time.sleep(delay)

            # Fortschritt alle 10 Fragen
            if i % 10 == 0:
                correct_count = sum(1 for r in results if r.get('is_correct', False))
                print(f"\n   ✅ Fortschritt: {i}/{total} | {correct_count} korrekt, {i-correct_count} mit Problemen\n")

        return results

    def generate_report(self, results: List[Dict], output_path: str):
        """Erstellt einen detaillierten Report."""

        # Statistiken
        total = len(results)
        correct = sum(1 for r in results if r.get('is_correct', False))
        incorrect = total - correct

        high_confidence = sum(1 for r in results if r.get('confidence') == 'high')

        needs_topic_change = sum(
            1 for r in results
            if r.get('suggested_topic') != r.get('original_question', {}).get('current_topic')
        )

        needs_difficulty_change = sum(
            1 for r in results
            if r.get('suggested_difficulty') != r.get('original_question', {}).get('current_difficulty')
        )

        # Gruppiere fehlerhafte Fragen
        incorrect_questions = [r for r in results if not r.get('is_correct', False)]
        topic_changes = [
            r for r in results
            if r.get('suggested_topic') != r.get('original_question', {}).get('current_topic')
        ]

        report = {
            "validation_summary": {
                "total_questions": total,
                "correct_answers": correct,
                "incorrect_answers": incorrect,
                "accuracy_rate": f"{(correct/total*100):.1f}%" if total > 0 else "0%",
                "high_confidence_validations": high_confidence,
                "needs_topic_change": needs_topic_change,
                "needs_difficulty_change": needs_difficulty_change
            },
            "incorrect_questions": incorrect_questions,
            "topic_change_suggestions": topic_changes,
            "all_validations": results
        }

        # Speichern
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        # Konsolen-Output
        print("\n" + "="*70)
        print("VALIDIERUNGS-REPORT")
        print("="*70)
        print(f"\n📊 STATISTIK:")
        print(f"   Gesamt:               {total} Fragen")
        print(f"   ✅ Korrekt:           {correct} ({(correct/total*100):.1f}%)")
        print(f"   ❌ Fehlerhaft:        {incorrect} ({(incorrect/total*100):.1f}%)")
        print(f"   🎯 Hohe Konfidenz:    {high_confidence}")
        print(f"   📂 Topic ändern:      {needs_topic_change}")
        print(f"   🎚️  Schwierigkeit:     {needs_difficulty_change}")

        if incorrect_questions:
            print(f"\n❌ FEHLERHAFTE FRAGEN (erste 5):")
            for r in incorrect_questions[:5]:
                q = r.get('original_question', {})
                print(f"\n   ID: {q.get('id')}")
                print(f"   Frage: {q.get('question', '')[:60]}...")
                print(f"   ❌ Falsch markiert: {q.get('current_answer')}")
                print(f"   ✅ Richtig wäre: {r.get('correct_answer_indices')}")
                print(f"   Grund: {r.get('explanation_why', '')[:100]}...")

        print(f"\n💾 Vollständiger Report gespeichert: {output_path}")
        print("="*70)


def main():
    """Hauptfunktion."""

    # Pfade
    base_dir = Path(__file__).parent.parent
    questions_file = base_dir / 'src' / 'data' / 'questions.json'
    output_file = base_dir / 'data' / 'ai_validation_report.json'

    # Erstelle data-Verzeichnis falls nicht vorhanden
    output_file.parent.mkdir(exist_ok=True)

    # API-Key prüfen
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        print("❌ ANTHROPIC_API_KEY nicht gesetzt!")
        print("\n📝 Setze den API-Key:")
        print("   Windows: set ANTHROPIC_API_KEY=sk-ant-...")
        print("   Linux/Mac: export ANTHROPIC_API_KEY=sk-ant-...")
        print("\n   Oder erstelle eine .env Datei im Projektordner:")
        print("   ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)

    # Fragen laden
    if not questions_file.exists():
        print(f"❌ Fragen-Datei nicht gefunden: {questions_file}")
        sys.exit(1)

    print(f"📖 Lade Fragen von: {questions_file}")
    with open(questions_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    questions = data.get('questions', [])
    if not questions:
        print("❌ Keine Fragen gefunden!")
        sys.exit(1)

    print(f"   ✅ {len(questions)} Fragen geladen")

    # Test-Modus?
    test_mode = input("\n🧪 Test-Modus (nur erste 10 Fragen)? [y/N]: ").lower() == 'y'
    max_questions = 10 if test_mode else None

    # Validator erstellen
    print("\n🤖 Initialisiere KI-Validator (Claude)...")
    validator = AIQuestionValidator(api_key=api_key)

    # Validierung starten
    results = validator.validate_all_questions(
        questions,
        delay=1.0,  # 1 Sekunde zwischen Anfragen
        max_questions=max_questions
    )

    # Report erstellen
    validator.generate_report(results, str(output_file))

    print(f"\n✅ FERTIG!")
    print(f"\n📋 NÄCHSTE SCHRITTE:")
    print(f"   1. Öffne: {output_file}")
    print(f"   2. Review die 'incorrect_questions' Liste")
    print(f"   3. Nutze das Review-Interface um Korrekturen anzuwenden")


if __name__ == '__main__':
    main()
