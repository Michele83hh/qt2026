"""
Quick-Start Wrapper für AI Validation
======================================
Führt dich durch Setup und startet die Validierung.
"""

import os
import sys
from pathlib import Path

def main():
    print("="*70)
    print("CCNA FRAGEN-VALIDIERUNG - GROQ SETUP")
    print("="*70)

    # Prüfe ob GROQ_API_KEY gesetzt ist
    api_key = os.getenv('GROQ_API_KEY')

    if not api_key:
        print("\n⚠️  GROQ_API_KEY nicht gefunden!")
        print("\n📝 SETUP (2 Minuten):")
        print("   1. Öffne: https://console.groq.com/keys")
        print("   2. Erstelle Account (kostenlos)")
        print("   3. Klicke 'Create API Key'")
        print("   4. Kopiere den Key (beginnt mit gsk_...)")
        print("\n💡 Dann führe aus:")
        print("   set GROQ_API_KEY=gsk_dein-key-hier")
        print("   python scripts\\run_validation.py")
        print("\nODER gib den Key jetzt hier ein (wird nicht gespeichert):\n")

        api_key = input("GROQ_API_KEY: ").strip()

        if not api_key or not api_key.startswith('gsk_'):
            print("\n❌ Ungültiger Key! Muss mit 'gsk_' beginnen.")
            sys.exit(1)

        # Setze temporär für diese Session
        os.environ['GROQ_API_KEY'] = api_key
        print("\n✅ API-Key gesetzt (nur für diese Session)")

    # Importiere und starte Validierung
    print("\n🚀 Starte AI-Validierung...")

    # Füge scripts-Verzeichnis zum Python-Path hinzu
    scripts_dir = Path(__file__).parent
    sys.path.insert(0, str(scripts_dir))

    try:
        from ai_validator_multi import AIQuestionValidator, main as validator_main

        # Rufe Haupt-Validierung auf
        # Aber mit automatischer Groq-Auswahl
        import json
        from pathlib import Path

        base_dir = Path(__file__).parent.parent
        questions_file = base_dir / 'src' / 'data' / 'questions.json'
        output_file = base_dir / 'data' / 'ai_validation_groq.json'
        output_file.parent.mkdir(exist_ok=True)

        if not questions_file.exists():
            print(f"❌ Datei nicht gefunden: {questions_file}")
            sys.exit(1)

        with open(questions_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        questions = data.get('questions', [])
        print(f"\n📖 {len(questions)} Fragen geladen")

        # Test-Modus
        test_mode = input("\n🧪 Test-Modus (nur 10 Fragen)? [Y/n]: ").lower()
        test_mode = test_mode != 'n'  # Default: Ja
        max_questions = 10 if test_mode else None

        # Validierung
        validator = AIQuestionValidator('groq', api_key)
        results = validator.validate_all_questions(questions, max_questions=max_questions)
        validator.generate_report(results, str(output_file))

        print(f"\n✅ FERTIG! Report: {output_file}")

    except ImportError as e:
        print(f"\n❌ Fehler beim Import: {e}")
        print("\nStelle sicher, dass ai_validator_multi.py im scripts-Ordner ist!")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Fehler: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
