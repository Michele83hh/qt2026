"""
Multi-Provider KI-basierter CCNA Fragen-Validator
===================================================
Unterstützt: OpenAI, Groq, Ollama

Wähle den Provider basierend auf deinen API-Keys/Verfügbarkeit.
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional
import time

# Provider-Checks
AVAILABLE_PROVIDERS = []

try:
    import openai
    AVAILABLE_PROVIDERS.append('openai')
except ImportError:
    pass

try:
    from groq import Groq
    AVAILABLE_PROVIDERS.append('groq')
except ImportError:
    pass

try:
    import requests
    AVAILABLE_PROVIDERS.append('ollama')
except ImportError:
    pass

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


class OllamaValidator:
    """Validator mit Ollama (Lokal)."""

    def __init__(self, model: str = "llama3.1:70b"):
        self.model = model
        self.base_url = "http://localhost:11434"

    def validate(self, prompt: str) -> str:
        response = requests.post(
            f"{self.base_url}/api/generate",
            json={
                "model": self.model,
                "prompt": f"System: Du bist ein CCNA-Experte. Antworte NUR mit JSON!\n\nUser: {prompt}",
                "stream": False,
                "options": {
                    "temperature": 0.1
                }
            }
        )
        if response.status_code != 200:
            raise Exception(f"Ollama API Error: {response.status_code}")

        return response.json()['response']


class AIQuestionValidator:
    """Haupt-Validator mit Multi-Provider Support."""

    def __init__(self, provider: str, api_key: Optional[str] = None):
        self.provider = provider
        self.results = []

        print(f"\n🤖 Initialisiere {provider.upper()} Validator...")

        if provider == 'openai':
            if not api_key:
                api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise ValueError("OPENAI_API_KEY nicht gefunden!")
            self.validator = OpenAIValidator(api_key)
            print("   ✅ OpenAI GPT-4o-mini bereit")

        elif provider == 'groq':
            if not api_key:
                api_key = os.getenv('GROQ_API_KEY')
            if not api_key:
                raise ValueError("GROQ_API_KEY nicht gefunden!")
            self.validator = GroqValidator(api_key)
            print("   ✅ Groq Llama 3.3 70B bereit")

        elif provider == 'ollama':
            self.validator = OllamaValidator()
            print("   ✅ Ollama (lokal) bereit")

        else:
            raise ValueError(f"Unknown provider: {provider}")

    def validate_question(self, question: Dict) -> Dict:
        """Validiert eine einzelne Frage."""

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
        prompt = VALIDATION_PROMPT.format(
            question=question.get('question', 'N/A'),
            options=options_text,
            marked_correct=marked_correct or "KEINE",
            topic=question.get('topic', 'N/A'),
            difficulty=question.get('difficulty', 'N/A'),
            explanation=question.get('explanation', 'N/A')
        )

        try:
            # API-Aufruf
            response_text = self.validator.validate(prompt).strip()

            # Parse JSON (entferne Markdown-Code-Blocks falls vorhanden)
            if '```' in response_text:
                # Extrahiere JSON aus Code-Block
                parts = response_text.split('```')
                for part in parts:
                    if part.strip().startswith('{'):
                        response_text = part.strip()
                        break
                    elif 'json' in part.lower():
                        # Nächster Part ist wahrscheinlich das JSON
                        continue

            # Entferne "json" wenn am Anfang
            if response_text.startswith('json'):
                response_text = response_text[4:].strip()

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
            print(f"⚠️  JSON Parse Error bei Frage {question.get('id')}")
            print(f"   Antwort: {response_text[:200]}...")
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

        # Delay anpassen je nach Provider
        if self.provider == 'groq':
            delay = max(delay, 2.0)  # Groq: 30 req/min = 2s delay
        elif self.provider == 'ollama':
            delay = 0.1  # Lokal, kein Limit

        print(f"\n🔍 Starte Validierung von {total} Fragen...")
        print(f"   Provider: {self.provider.upper()}")
        print(f"   Delay: {delay}s zwischen Anfragen\n")

        for i, question in enumerate(questions[:total], 1):
            q_text = question.get('question', '')[:60]
            print(f"[{i}/{total}] {question.get('id')} - {q_text}...")

            result = self.validate_question(question)
            results.append(result)

            # Rate Limiting
            if i < total:
                time.sleep(delay)

            # Fortschritt
            if i % 10 == 0:
                correct = sum(1 for r in results if r.get('is_correct', False))
                errors = sum(1 for r in results if 'error' in r)
                print(f"\n   📊 Stand: {i}/{total} | ✅ {correct} korrekt | ❌ {i-correct-errors} falsch | ⚠️  {errors} Fehler\n")

        return results

    def generate_report(self, results: List[Dict], output_path: str):
        """Erstellt Report."""
        total = len(results)
        errors = [r for r in results if 'error' in r]
        valid_results = [r for r in results if 'error' not in r]

        correct = sum(1 for r in valid_results if r.get('is_correct', False))
        incorrect = len(valid_results) - correct

        needs_topic_change = sum(
            1 for r in valid_results
            if r.get('suggested_topic') != r.get('original_question', {}).get('current_topic')
        )

        # Report
        report = {
            "validation_summary": {
                "provider": self.provider,
                "total_questions": total,
                "valid_results": len(valid_results),
                "errors": len(errors),
                "correct_answers": correct,
                "incorrect_answers": incorrect,
                "accuracy_rate": f"{(correct/len(valid_results)*100):.1f}%" if valid_results else "0%",
                "needs_topic_change": needs_topic_change
            },
            "incorrect_questions": [r for r in valid_results if not r.get('is_correct', False)],
            "errors": errors,
            "all_validations": results
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        # Konsolen-Output
        print("\n" + "="*70)
        print(f"VALIDIERUNGS-REPORT ({self.provider.upper()})")
        print("="*70)
        print(f"\n📊 STATISTIK:")
        print(f"   Gesamt:           {total}")
        print(f"   Erfolgreich:      {len(valid_results)}")
        print(f"   ✅ Korrekt:       {correct} ({(correct/len(valid_results)*100):.1f}%)" if valid_results else "   ✅ Korrekt: 0")
        print(f"   ❌ Fehlerhaft:    {incorrect}")
        print(f"   📂 Topic ändern:  {needs_topic_change}")
        print(f"   ⚠️  API-Fehler:    {len(errors)}")

        if incorrect > 0:
            print(f"\n❌ FEHLERHAFTE FRAGEN (erste 3):")
            for r in [r for r in valid_results if not r.get('is_correct', False)][:3]:
                q = r.get('original_question', {})
                print(f"\n   {q.get('id')}: {q.get('question', '')[:50]}...")
                print(f"   Aktuell: {q.get('current_answer')} | Richtig: {r.get('correct_answer_indices')}")

        print(f"\n💾 Report: {output_path}")
        print("="*70)


def main():
    """Hauptfunktion."""

    print("="*70)
    print("KI-BASIERTE CCNA FRAGEN-VALIDIERUNG")
    print("="*70)

    # Verfügbare Provider anzeigen
    print(f"\n📦 Installierte Provider: {', '.join(AVAILABLE_PROVIDERS) if AVAILABLE_PROVIDERS else 'KEINE'}")

    if not AVAILABLE_PROVIDERS:
        print("\n❌ Keine Provider verfügbar!")
        print("\n📝 Installiere mindestens einen:")
        print("   pip install openai      # OpenAI GPT")
        print("   pip install groq        # Groq (kostenlos)")
        print("   pip install requests    # Ollama (lokal)")
        sys.exit(1)

    # Provider wählen
    print("\n🎯 Wähle Provider:")
    for i, provider in enumerate(AVAILABLE_PROVIDERS, 1):
        costs = {
            'openai': '~$0.05 für alle Fragen',
            'groq': 'KOSTENLOS (Rate Limit: 30/min)',
            'ollama': 'KOSTENLOS (lokal, langsam)'
        }
        print(f"   {i}. {provider.upper()} ({costs.get(provider, 'kostenlos')})")

    choice = input(f"\nWahl [1-{len(AVAILABLE_PROVIDERS)}]: ").strip()
    try:
        provider = AVAILABLE_PROVIDERS[int(choice) - 1]
    except (ValueError, IndexError):
        print("❌ Ungültige Wahl!")
        sys.exit(1)

    # API-Key
    api_key = None
    if provider in ['openai', 'groq']:
        key_name = f"{provider.upper()}_API_KEY"
        api_key = os.getenv(key_name)
        if not api_key:
            api_key = input(f"\n🔑 {key_name} eingeben: ").strip()
            if not api_key:
                print(f"❌ {key_name} erforderlich!")
                sys.exit(1)

    # Fragen laden
    base_dir = Path(__file__).parent.parent
    questions_file = base_dir / 'src' / 'data' / 'questions.json'
    output_file = base_dir / 'data' / f'ai_validation_{provider}.json'
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

    # Validierung
    validator = AIQuestionValidator(provider, api_key)
    results = validator.validate_all_questions(questions, max_questions=max_questions)
    validator.generate_report(results, str(output_file))

    print(f"\n✅ FERTIG! Report: {output_file}")


if __name__ == '__main__':
    main()
