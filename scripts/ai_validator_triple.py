"""
Triple GPT-4o Validation - MAXIMUM QUALITY
===========================================
Validiert jede Frage 3x mit GPT-4o und nutzt Majority Vote für maximale Sicherheit.

Strategie:
- 3 unabhängige Validierungen mit GPT-4o
- Leicht unterschiedliche Temperatures (0.1, 0.15, 0.2) für Diversität
- Majority Vote: Mindestens 2 von 3 müssen übereinstimmen
- 3/3 Übereinstimmung = SEHR HOHE Confidence → Auto-Apply
- 2/3 Übereinstimmung = HOHE Confidence → Auto-Apply mit Warnung
- Keine Mehrheit = NIEDRIGE Confidence → Manuelle Prüfung

Kosten: ~$12.60 für 600 Fragen
Qualität: MAXIMUM - Nahezu perfekte Validierung
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import time
from collections import Counter

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("❌ OpenAI Package nicht installiert!")
    print("   Installiere: pip install openai")
    sys.exit(1)

VALIDATION_PROMPT = """Du bist ein CCNA (Cisco Certified Network Associate) 200-301 Experte.
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

ANTWORTE NUR IM FOLGENDEN JSON-FORMAT (ohne Markdown):
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

WICHTIG: Antworte NUR mit dem JSON, keine zusätzlichen Texte, kein Markdown!"""


class GPT4oValidator:
    """Validator mit OpenAI GPT-4o."""

    def __init__(self, api_key: str, run_id: int = 1, temperature: float = 0.1):
        self.client = openai.OpenAI(api_key=api_key)
        self.model = "gpt-4o"
        self.run_id = run_id
        self.temperature = temperature
        self.name = f"GPT-4o (Run {run_id}, temp={temperature})"

    def validate(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{
                "role": "system",
                "content": "Du bist ein CCNA-Experte. Antworte NUR mit reinem JSON. NIEMALS ```json Code-Blocks verwenden. Nur { ... } ohne Markdown!"
            }, {
                "role": "user",
                "content": prompt
            }],
            temperature=self.temperature,
            max_tokens=2500
        )
        return response.choices[0].message.content


class TripleValidator:
    """Triple-Validation mit 3x GPT-4o."""

    def __init__(self, api_key: str):
        print("\n🤖 Initialisiere Triple-Validator (MAXIMUM QUALITY)...")

        # 3 Validatoren mit unterschiedlichen Temperatures
        self.validators = [
            GPT4oValidator(api_key, run_id=1, temperature=0.1),
            GPT4oValidator(api_key, run_id=2, temperature=0.15),
            GPT4oValidator(api_key, run_id=3, temperature=0.2)
        ]

        print("   ✅ GPT-4o Validator 1 bereit (temperature=0.1)")
        print("   ✅ GPT-4o Validator 2 bereit (temperature=0.15)")
        print("   ✅ GPT-4o Validator 3 bereit (temperature=0.2)")
        print("\n   💰 Geschätzte Kosten: ~$12.60 für 600 Fragen")
        print("   🎯 Strategie: Majority Vote (min. 2/3 Übereinstimmung)")

    def _parse_json(self, response_text: str) -> Optional[Dict]:
        """Parst JSON aus KI-Antwort (entfernt Markdown wenn nötig)."""
        response_text = response_text.strip()

        # Entferne Code-Blocks
        if '```' in response_text:
            parts = response_text.split('```')
            for part in parts:
                if part.strip().startswith('{'):
                    response_text = part.strip()
                    break

        # Entferne "json" am Anfang
        if response_text.startswith('json'):
            response_text = response_text[4:].strip()

        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            return None

    def _majority_vote(self, results: List[Dict]) -> Dict:
        """Berechnet Majority Vote aus 3 Validierungen."""

        # is_correct Voting
        is_correct_votes = [r.get('is_correct') for r in results if 'is_correct' in r]
        is_correct_count = Counter(is_correct_votes)
        majority_is_correct = is_correct_count.most_common(1)[0][0] if is_correct_count else None

        # correct_answer_indices Voting (als Tuple für Hashability)
        answer_votes = [
            tuple(sorted(r.get('correct_answer_indices', [])))
            for r in results if 'correct_answer_indices' in r
        ]
        answer_count = Counter(answer_votes)
        majority_answers = list(answer_count.most_common(1)[0][0]) if answer_count else []

        # Topic Voting
        topic_votes = [r.get('suggested_topic') for r in results if 'suggested_topic' in r]
        topic_count = Counter(topic_votes)
        majority_topic = topic_count.most_common(1)[0][0] if topic_count else None

        # Difficulty Voting
        difficulty_votes = [r.get('suggested_difficulty') for r in results if 'suggested_difficulty' in r]
        difficulty_count = Counter(difficulty_votes)
        majority_difficulty = difficulty_count.most_common(1)[0][0] if difficulty_count else None

        # Übereinstimmungs-Level berechnen
        is_correct_consensus = is_correct_count.most_common(1)[0][1] if is_correct_count else 0
        answer_consensus = answer_count.most_common(1)[0][1] if answer_count else 0
        topic_consensus = topic_count.most_common(1)[0][1] if topic_count else 0
        difficulty_consensus = difficulty_count.most_common(1)[0][1] if difficulty_count else 0

        # Confidence Level
        if is_correct_consensus == 3 and answer_consensus == 3:
            confidence = "very_high"
            can_auto_apply = True
            reason = "Alle 3 Validierungen stimmen überein"
        elif is_correct_consensus >= 2 and answer_consensus >= 2:
            confidence = "high"
            can_auto_apply = True
            reason = f"{is_correct_consensus}/3 Validierungen stimmen überein"
        else:
            confidence = "low"
            can_auto_apply = False
            reason = "Keine klare Mehrheit - manuelle Prüfung erforderlich"

        # Kombiniere Erklärungen (längste/beste nehmen)
        explanations = [r.get('explanation_why', '') for r in results]
        best_explanation = max(explanations, key=len) if explanations else ""

        improved_explanations = [r.get('improved_explanation', '') for r in results if r.get('improved_explanation')]
        best_improved = max(improved_explanations, key=len) if improved_explanations else ""

        return {
            "is_correct": majority_is_correct,
            "correct_answer_indices": majority_answers,
            "suggested_topic": majority_topic,
            "suggested_difficulty": majority_difficulty,
            "explanation_why": best_explanation,
            "improved_explanation": best_improved,
            "confidence": confidence,
            "can_auto_apply": can_auto_apply,
            "consensus_reason": reason,
            "vote_breakdown": {
                "is_correct": f"{is_correct_consensus}/3",
                "answers": f"{answer_consensus}/3",
                "topic": f"{topic_consensus}/3",
                "difficulty": f"{difficulty_consensus}/3"
            }
        }

    def validate_question(self, question: Dict) -> Dict:
        """Validiert eine Frage mit allen 3 Validatoren."""

        # Bereite Prompt vor
        options_text = "\n".join([
            f"{i}. {opt}" for i, opt in enumerate(question.get('options', []))
        ])

        correct_indices = question.get('correctAnswer', [])
        marked_correct = "\n".join([
            f"- {question['options'][i]} (Index {i})"
            for i in correct_indices if i < len(question.get('options', []))
        ])

        prompt = VALIDATION_PROMPT.format(
            question=question.get('question', 'N/A'),
            options=options_text,
            marked_correct=marked_correct or "KEINE",
            topic=question.get('topic', 'N/A'),
            difficulty=question.get('difficulty', 'N/A'),
            explanation=question.get('explanation', 'N/A')
        )

        results = {}
        parsed_results = []

        # 3 Validierungen durchführen
        for i, validator in enumerate(self.validators, 1):
            try:
                raw_response = validator.validate(prompt)
                parsed = self._parse_json(raw_response)

                if parsed:
                    results[f'run{i}'] = parsed
                    parsed_results.append(parsed)
                else:
                    results[f'run{i}_error'] = 'json_parse_error'
                    results[f'run{i}_raw'] = raw_response[:500]

            except Exception as e:
                results[f'run{i}_error'] = str(e)

            # Kleiner Delay zwischen Runs (optional, GPT-4o hat keine Rate Limits)
            if i < 3:
                time.sleep(0.5)

        # Majority Vote berechnen
        if len(parsed_results) >= 2:  # Mindestens 2 erfolgreiche Validierungen
            majority = self._majority_vote(parsed_results)
            results['majority_vote'] = majority
        else:
            results['majority_vote'] = {
                'confidence': 'low',
                'can_auto_apply': False,
                'consensus_reason': 'Zu wenige erfolgreiche Validierungen'
            }

        # Original-Frage hinzufügen
        results['original_question'] = {
            'id': question.get('id'),
            'question': question.get('question'),
            'current_answer': correct_indices,
            'current_topic': question.get('topic'),
            'current_difficulty': question.get('difficulty')
        }

        return results

    def validate_all_questions(self, questions: List[Dict], max_questions: Optional[int] = None) -> List[Dict]:
        """Validiert alle Fragen mit Triple-Validation."""

        total = min(len(questions), max_questions) if max_questions else len(questions)
        results = []

        print(f"\n🔍 Starte Triple-Validation mit {total} Fragen...")
        print(f"   Jede Frage wird 3x mit GPT-4o validiert\n")

        for i, question in enumerate(questions[:total], 1):
            q_text = question.get('question', '')[:60]
            print(f"[{i}/{total}] {question.get('id')} - {q_text}...")

            result = self.validate_question(question)
            results.append(result)

            # Fortschritt
            if i % 10 == 0:
                very_high = sum(1 for r in results if r.get('majority_vote', {}).get('confidence') == 'very_high')
                high = sum(1 for r in results if r.get('majority_vote', {}).get('confidence') == 'high')
                low = sum(1 for r in results if r.get('majority_vote', {}).get('confidence') == 'low')
                print(f"\n   📊 Stand: {i}/{total} | 🟢 {very_high} sehr hoch | 🟡 {high} hoch | 🔴 {low} niedrig\n")

        return results

    def generate_report(self, results: List[Dict], output_path: str):
        """Erstellt Triple-Validation Report."""

        # Statistiken
        total = len(results)
        very_high = [r for r in results if r.get('majority_vote', {}).get('confidence') == 'very_high']
        high = [r for r in results if r.get('majority_vote', {}).get('confidence') == 'high']
        low = [r for r in results if r.get('majority_vote', {}).get('confidence') == 'low']

        auto_apply = [r for r in results if r.get('majority_vote', {}).get('can_auto_apply')]
        manual_review = [r for r in results if not r.get('majority_vote', {}).get('can_auto_apply')]

        # Fehlerhafte Fragen (wo Mehrheit sagt is_correct=false)
        incorrect = [
            r for r in auto_apply
            if r.get('majority_vote', {}).get('is_correct') == False
        ]

        # Report-Struktur
        report = {
            "triple_validation_summary": {
                "total_questions": total,
                "very_high_confidence": len(very_high),
                "high_confidence": len(high),
                "low_confidence": len(low),
                "auto_apply_ready": len(auto_apply),
                "manual_review_needed": len(manual_review),
                "incorrect_answers_found": len(incorrect)
            },
            "very_high_confidence": very_high,
            "high_confidence": high,
            "low_confidence": low,
            "auto_apply_candidates": incorrect,
            "all_validations": results
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        # Konsolen-Output
        print("\n" + "="*70)
        print("TRIPLE-VALIDATION REPORT (3x GPT-4o - MAXIMUM QUALITY)")
        print("="*70)
        print(f"\n📊 STATISTIK:")
        print(f"   Gesamt:                  {total}")
        print(f"   🟢 Sehr hohe Confidence: {len(very_high)} (3/3 Übereinstimmung)")
        print(f"   🟡 Hohe Confidence:      {len(high)} (2/3 Übereinstimmung)")
        print(f"   🔴 Niedrige Confidence:  {len(low)} (keine Mehrheit)")
        print(f"   🤖 Auto-Apply bereit:    {len(auto_apply)}")
        print(f"   👤 Manuelle Prüfung:     {len(manual_review)}")
        print(f"   ❌ Fehlerhafte Antworten:{len(incorrect)}")

        if incorrect:
            print(f"\n❌ FEHLERHAFTE ANTWORTEN (erste 5):")
            for r in incorrect[:5]:
                q = r['original_question']
                mv = r['majority_vote']
                print(f"\n   {q['id']}: {q['question'][:50]}...")
                print(f"   Aktuell: {q['current_answer']} → Richtig: {mv['correct_answer_indices']}")
                print(f"   Konsens: {mv['vote_breakdown']['answers']} | {mv['consensus_reason']}")

        if manual_review:
            print(f"\n🔴 MANUELLE PRÜFUNG NÖTIG (erste 3):")
            for r in manual_review[:3]:
                q = r['original_question']
                mv = r.get('majority_vote', {})
                print(f"\n   {q['id']}: {q['question'][:50]}...")
                print(f"   Grund: {mv.get('consensus_reason', 'N/A')}")

        print(f"\n💾 Report: {output_path}")
        print("="*70)


def main():
    """Hauptfunktion."""

    print("="*70)
    print("TRIPLE GPT-4o VALIDATION - MAXIMUM QUALITY")
    print("="*70)

    if not OPENAI_AVAILABLE:
        print("\n❌ OpenAI Package nicht installiert!")
        print("   pip install openai")
        sys.exit(1)

    # API Key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        api_key = input("\n🔑 OPENAI_API_KEY eingeben: ").strip()

    if not api_key:
        print("❌ OPENAI_API_KEY erforderlich!")
        sys.exit(1)

    # Fragen laden
    base_dir = Path(__file__).parent.parent
    questions_file = base_dir / 'src' / 'data' / 'questions.json'
    output_file = base_dir / 'data' / 'ai_validation_triple.json'
    output_file.parent.mkdir(exist_ok=True)

    if not questions_file.exists():
        print(f"❌ Datei nicht gefunden: {questions_file}")
        sys.exit(1)

    with open(questions_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    questions = data.get('questions', [])
    print(f"\n📖 {len(questions)} Fragen geladen")

    # Test-Modus
    test_mode = input("\n🧪 Test-Modus (nur 5 Fragen)? [y/N]: ").lower() == 'y'
    max_questions = 5 if test_mode else None

    # Kosten-Warnung
    if not test_mode:
        total_questions = len(questions)
        # GPT-4o: $5/1M input tokens, $15/1M output tokens
        # Pro Frage: ~500 input + 300 output = $0.007 pro Frage/Durchgang
        # 3 Durchgänge: ~$0.021 pro Frage
        estimated_cost = total_questions * 0.021
        print(f"\n💰 Geschätzte Kosten: ~${estimated_cost:.2f} (3x GPT-4o)")
        print(f"   Pro Frage: ~$0.021 (3 Validierungen)")
        print(f"   Qualität: MAXIMUM")
        confirm = input("\n   Fortfahren? [y/N]: ").lower()
        if confirm != 'y':
            print("❌ Abgebrochen")
            sys.exit(0)

    # Triple-Validation
    validator = TripleValidator(api_key)
    results = validator.validate_all_questions(questions, max_questions=max_questions)
    validator.generate_report(results, str(output_file))

    print(f"\n✅ FERTIG! Report: {output_file}")
    print(f"\n📝 NÄCHSTE SCHRITTE:")
    print(f"   1. Führe aus: python scripts/apply_validation_triple.py")
    print(f"   2. Prüfe manuelle Review-Fälle im Report")


if __name__ == '__main__':
    main()
