"""
Cross-Validation CCNA Fragen-Validator
=======================================
Validiert jede Frage mit ZWEI KIs (Groq + OpenAI) und vergleicht die Ergebnisse.

Strategie:
- Übereinstimmung → Hohe Confidence, kann automatisch übernommen werden
- Widerspruch → Niedrige Confidence, manuelle Prüfung erforderlich
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import time

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

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


class OpenAIValidator:
    """Validator mit OpenAI GPT-4o-mini."""

    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
        self.model = "gpt-4o-mini"
        self.name = "OpenAI"

    def validate(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{
                "role": "system",
                "content": "Du bist ein CCNA-Experte. Antworte NUR mit JSON, kein Markdown!"
            }, {
                "role": "user",
                "content": prompt
            }],
            temperature=0.1,
            max_tokens=1000
        )
        return response.choices[0].message.content


class GroqValidator:
    """Validator mit Groq (Llama 3.3 70B)."""

    def __init__(self, api_key: str):
        self.client = Groq(api_key=api_key)
        self.model = "llama-3.3-70b-versatile"
        self.name = "Groq"

    def validate(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{
                "role": "system",
                "content": "Du bist ein CCNA-Experte. Antworte NUR mit JSON!"
            }, {
                "role": "user",
                "content": prompt
            }],
            temperature=0.1,
            max_tokens=1000
        )
        return response.choices[0].message.content


class CrossValidator:
    """Cross-Validation mit 2 KIs."""

    def __init__(self, openai_key: str, groq_key: str):
        print("\n🤖 Initialisiere Cross-Validator...")

        if not OPENAI_AVAILABLE or not GROQ_AVAILABLE:
            raise ValueError("Beide Packages müssen installiert sein: pip install openai groq")

        self.openai = OpenAIValidator(openai_key)
        self.groq = GroqValidator(groq_key)

        print("   ✅ OpenAI GPT-4o-mini bereit")
        print("   ✅ Groq Llama 3.3 70B bereit")

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

    def _compare_results(self, openai_result: Dict, groq_result: Dict) -> Dict:
        """Vergleicht zwei Validierungsergebnisse."""

        # Kern-Felder vergleichen
        is_correct_match = openai_result.get('is_correct') == groq_result.get('is_correct')

        # Korrekte Antworten vergleichen (als Sets, da Reihenfolge egal)
        openai_answers = set(openai_result.get('correct_answer_indices', []))
        groq_answers = set(groq_result.get('correct_answer_indices', []))
        answers_match = openai_answers == groq_answers

        # Topic vergleichen
        topic_match = openai_result.get('suggested_topic') == groq_result.get('suggested_topic')

        # Schwierigkeit vergleichen
        difficulty_match = openai_result.get('suggested_difficulty') == groq_result.get('suggested_difficulty')

        # Gesamte Übereinstimmung
        full_consensus = is_correct_match and answers_match

        return {
            'consensus': full_consensus,
            'is_correct_match': is_correct_match,
            'answers_match': answers_match,
            'topic_match': topic_match,
            'difficulty_match': difficulty_match,
            'needs_manual_review': not full_consensus
        }

    def validate_question(self, question: Dict) -> Dict:
        """Validiert eine Frage mit beiden KIs."""

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

        # OpenAI validieren
        try:
            openai_raw = self.openai.validate(prompt)
            openai_parsed = self._parse_json(openai_raw)
            if openai_parsed:
                results['openai'] = openai_parsed
            else:
                results['openai_error'] = 'json_parse_error'
                results['openai_raw'] = openai_raw[:500]
        except Exception as e:
            results['openai_error'] = str(e)

        # Rate Limiting für Groq (30/min = 2s)
        time.sleep(2.1)

        # Groq validieren
        try:
            groq_raw = self.groq.validate(prompt)
            groq_parsed = self._parse_json(groq_raw)
            if groq_parsed:
                results['groq'] = groq_parsed
            else:
                results['groq_error'] = 'json_parse_error'
                results['groq_raw'] = groq_raw[:500]
        except Exception as e:
            results['groq_error'] = str(e)

        # Vergleiche Ergebnisse
        if 'openai' in results and 'groq' in results:
            comparison = self._compare_results(results['openai'], results['groq'])
            results['comparison'] = comparison

            # Consensus-Daten (was beide sagen)
            if comparison['consensus']:
                results['consensus_validation'] = {
                    'is_correct': results['openai']['is_correct'],
                    'correct_answer_indices': results['openai']['correct_answer_indices'],
                    'confidence': 'high',
                    'can_auto_apply': True
                }
            else:
                results['consensus_validation'] = {
                    'confidence': 'low',
                    'can_auto_apply': False,
                    'reason': 'KIs widersprechen sich'
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
        """Validiert alle Fragen mit Cross-Validation."""

        total = min(len(questions), max_questions) if max_questions else len(questions)
        results = []

        print(f"\n🔍 Starte Cross-Validation mit {total} Fragen...")
        print(f"   Strategie: Groq + OpenAI parallel")
        print(f"   Delay: 2.1s pro Frage (Groq Rate Limit)\n")

        for i, question in enumerate(questions[:total], 1):
            q_text = question.get('question', '')[:60]
            print(f"[{i}/{total}] {question.get('id')} - {q_text}...")

            result = self.validate_question(question)
            results.append(result)

            # Fortschritt
            if i % 10 == 0:
                consensus_count = sum(1 for r in results if r.get('comparison', {}).get('consensus', False))
                conflicts = sum(1 for r in results if r.get('comparison', {}).get('needs_manual_review', False))
                print(f"\n   📊 Stand: {i}/{total} | ✅ {consensus_count} Konsens | ⚠️  {conflicts} Konflikte\n")

        return results

    def generate_report(self, results: List[Dict], output_path: str):
        """Erstellt Cross-Validation Report."""

        # Statistiken
        total = len(results)
        has_comparison = [r for r in results if 'comparison' in r]
        consensus = [r for r in has_comparison if r['comparison']['consensus']]
        conflicts = [r for r in has_comparison if r['comparison']['needs_manual_review']]

        # Auto-apply fähige Änderungen
        auto_apply_incorrect = [
            r for r in consensus
            if r.get('consensus_validation', {}).get('is_correct') == False
        ]

        # Report-Struktur
        report = {
            "cross_validation_summary": {
                "total_questions": total,
                "successful_validations": len(has_comparison),
                "consensus_count": len(consensus),
                "consensus_rate": f"{(len(consensus)/len(has_comparison)*100):.1f}%" if has_comparison else "0%",
                "conflicts_count": len(conflicts),
                "auto_apply_ready": len(auto_apply_incorrect),
                "manual_review_needed": len(conflicts)
            },
            "consensus_validations": consensus,
            "conflicts": conflicts,
            "auto_apply_candidates": auto_apply_incorrect,
            "all_validations": results
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        # Konsolen-Output
        print("\n" + "="*70)
        print("CROSS-VALIDATION REPORT (Groq + OpenAI)")
        print("="*70)
        print(f"\n📊 STATISTIK:")
        print(f"   Gesamt:              {total}")
        print(f"   Erfolgreich:         {len(has_comparison)}")
        print(f"   ✅ Konsens:          {len(consensus)} ({(len(consensus)/len(has_comparison)*100):.1f}%)" if has_comparison else "   ✅ Konsens: 0")
        print(f"   ⚠️  Konflikte:        {len(conflicts)}")
        print(f"   🤖 Auto-Apply OK:    {len(auto_apply_incorrect)} (fehlerhafte Fragen, beide KIs einig)")
        print(f"   👤 Manuell prüfen:   {len(conflicts)}")

        if auto_apply_incorrect:
            print(f"\n🤖 AUTO-APPLY BEREIT (erste 5):")
            for r in auto_apply_incorrect[:5]:
                q = r['original_question']
                consensus = r['consensus_validation']
                print(f"\n   {q['id']}: {q['question'][:50]}...")
                print(f"   Aktuell: {q['current_answer']} → Richtig: {consensus['correct_answer_indices']}")

        if conflicts:
            print(f"\n⚠️  KONFLIKTE - MANUELLE PRÜFUNG (erste 3):")
            for r in conflicts[:3]:
                q = r['original_question']
                openai_ans = r.get('openai', {}).get('correct_answer_indices', '?')
                groq_ans = r.get('groq', {}).get('correct_answer_indices', '?')
                print(f"\n   {q['id']}: {q['question'][:50]}...")
                print(f"   OpenAI: {openai_ans} | Groq: {groq_ans}")

        print(f"\n💾 Report: {output_path}")
        print("="*70)


def main():
    """Hauptfunktion."""

    print("="*70)
    print("CROSS-VALIDATION CCNA FRAGEN (Groq + OpenAI)")
    print("="*70)

    if not (OPENAI_AVAILABLE and GROQ_AVAILABLE):
        print("\n❌ Beide Packages müssen installiert sein!")
        print("\n📝 Installiere:")
        print("   pip install openai groq")
        sys.exit(1)

    # API Keys
    openai_key = os.getenv('OPENAI_API_KEY')
    groq_key = os.getenv('GROQ_API_KEY')

    if not openai_key:
        openai_key = input("\n🔑 OPENAI_API_KEY eingeben: ").strip()
    if not groq_key:
        groq_key = input("🔑 GROQ_API_KEY eingeben: ").strip()

    if not (openai_key and groq_key):
        print("❌ Beide API-Keys erforderlich!")
        sys.exit(1)

    # Fragen laden
    base_dir = Path(__file__).parent.parent
    questions_file = base_dir / 'src' / 'data' / 'questions.json'
    output_file = base_dir / 'data' / 'ai_validation_cross.json'
    output_file.parent.mkdir(exist_ok=True)

    if not questions_file.exists():
        print(f"❌ Datei nicht gefunden: {questions_file}")
        sys.exit(1)

    with open(questions_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    questions = data.get('questions', [])
    print(f"\n📖 {len(questions)} Fragen geladen")

    # Test-Modus
    test_mode = input("\n🧪 Test-Modus (nur 10 Fragen)? [y/N]: ").lower() == 'y'
    max_questions = 10 if test_mode else None

    # Kosten-Warnung
    if not test_mode:
        estimated_cost = len(questions) * 0.00008  # ~$0.00008 pro Frage
        print(f"\n💰 Geschätzte Kosten: ~${estimated_cost:.2f} (nur OpenAI)")
        confirm = input("   Fortfahren? [y/N]: ").lower()
        if confirm != 'y':
            print("❌ Abgebrochen")
            sys.exit(0)

    # Cross-Validation
    validator = CrossValidator(openai_key, groq_key)
    results = validator.validate_all_questions(questions, max_questions=max_questions)
    validator.generate_report(results, str(output_file))

    print(f"\n✅ FERTIG! Report: {output_file}")


if __name__ == '__main__':
    main()
