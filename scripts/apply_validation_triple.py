"""
Auto-Apply Triple Validation
=============================
Wendet Änderungen aus Triple GPT-4o Validation automatisch an.
"""

import json
import shutil
from pathlib import Path
from datetime import datetime

class TripleValidationApplier:
    """Wendet Triple-Validation Ergebnisse an."""

    def __init__(self, validation_report_path: str, questions_path: str):
        self.validation_report_path = Path(validation_report_path)
        self.questions_path = Path(questions_path)

        with open(self.validation_report_path, 'r', encoding='utf-8') as f:
            self.report = json.load(f)

        with open(self.questions_path, 'r', encoding='utf-8') as f:
            self.questions_data = json.load(f)

        self.questions = {q['id']: q for q in self.questions_data.get('questions', [])}

    def analyze_changes(self):
        """Analysiert welche Änderungen angewendet werden können."""
        auto_apply = (
            self.report.get('very_high_confidence', []) +
            self.report.get('high_confidence', [])
        )

        changes = {
            'incorrect_answers': [],
            'topic_changes': [],
            'difficulty_changes': [],
            'explanation_improvements': [],
            'very_high_confidence_changes': 0,
            'high_confidence_changes': 0
        }

        for validation in auto_apply:
            q_id = validation['original_question']['id']
            current = validation['original_question']
            majority = validation['majority_vote']
            confidence = majority.get('confidence')

            # Fehlerhafte Antworten
            if majority.get('is_correct') == False:
                changes['incorrect_answers'].append({
                    'id': q_id,
                    'question': current['question'][:60],
                    'old_answer': current['current_answer'],
                    'new_answer': majority['correct_answer_indices'],
                    'confidence': confidence
                })
                if confidence == 'very_high':
                    changes['very_high_confidence_changes'] += 1
                else:
                    changes['high_confidence_changes'] += 1

            # Topic-Änderungen
            new_topic = majority.get('suggested_topic')
            if new_topic and new_topic != current['current_topic']:
                changes['topic_changes'].append({
                    'id': q_id,
                    'old_topic': current['current_topic'],
                    'new_topic': new_topic,
                    'confidence': confidence
                })

            # Difficulty-Änderungen
            new_difficulty = majority.get('suggested_difficulty')
            if new_difficulty and new_difficulty != current['current_difficulty']:
                changes['difficulty_changes'].append({
                    'id': q_id,
                    'old_difficulty': current['current_difficulty'],
                    'new_difficulty': new_difficulty,
                    'confidence': confidence
                })

            # Erklärungen verbessern
            improved = majority.get('improved_explanation')
            if improved and improved.strip():
                changes['explanation_improvements'].append({
                    'id': q_id,
                    'new_explanation': improved,
                    'confidence': confidence
                })

        return changes

    def preview_changes(self, changes):
        """Zeigt Preview der Änderungen."""
        print("\n" + "="*70)
        print("PREVIEW: ÄNDERUNGEN")
        print("="*70)
        print(f"\n📊 ZUSAMMENFASSUNG:")
        print(f"   ❌ Fehlerhafte Antworten:     {len(changes['incorrect_answers'])}")
        print(f"      🟢 Sehr hohe Confidence:   {changes['very_high_confidence_changes']}")
        print(f"      🟡 Hohe Confidence:        {changes['high_confidence_changes']}")
        print(f"   📂 Topic-Änderungen:          {len(changes['topic_changes'])}")
        print(f"   📊 Schwierigkeit-Änderungen:  {len(changes['difficulty_changes'])}")
        print(f"   📝 Erklärung-Verbesserungen:  {len(changes['explanation_improvements'])}")

        if changes['incorrect_answers']:
            print(f"\n❌ FEHLERHAFTE ANTWORTEN (erste 5):")
            for change in changes['incorrect_answers'][:5]:
                print(f"\n   {change['id']}: {change['question']}...")
                print(f"   Alt: {change['old_answer']} → Neu: {change['new_answer']}")

        print("\n" + "="*70)

    def apply_changes(self, changes, create_backup=True):
        """Wendet Änderungen an."""
        if create_backup:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = self.questions_path.parent / f"questions_backup_{timestamp}.json"
            shutil.copy2(self.questions_path, backup_path)
            print(f"\n💾 Backup erstellt: {backup_path}")

        # Antworten korrigieren
        for change in changes['incorrect_answers']:
            if change['id'] in self.questions:
                self.questions[change['id']]['correctAnswer'] = change['new_answer']

        # Topics ändern
        for change in changes['topic_changes']:
            if change['id'] in self.questions:
                self.questions[change['id']]['topic'] = change['new_topic']

        # Schwierigkeit ändern
        for change in changes['difficulty_changes']:
            if change['id'] in self.questions:
                self.questions[change['id']]['difficulty'] = change['new_difficulty']

        # Erklärungen verbessern
        for change in changes['explanation_improvements']:
            if change['id'] in self.questions:
                self.questions[change['id']]['explanation'] = change['new_explanation']

        # Speichern
        self.questions_data['questions'] = list(self.questions.values())

        with open(self.questions_path, 'w', encoding='utf-8') as f:
            json.dump(self.questions_data, f, indent=2, ensure_ascii=False)

        print(f"\n✅ Änderungen angewendet: {self.questions_path}")

        total_changes = (
            len(changes['incorrect_answers']) +
            len(changes['topic_changes']) +
            len(changes['difficulty_changes']) +
            len(changes['explanation_improvements'])
        )
        print(f"\n📊 ANGEWENDET: {total_changes} Änderungen")


def main():
    """Hauptfunktion."""
    print("="*70)
    print("AUTO-APPLY TRIPLE VALIDATION ÄNDERUNGEN")
    print("="*70)

    base_dir = Path(__file__).parent.parent
    validation_report = base_dir / 'data' / 'ai_validation_triple.json'
    questions_file = base_dir / 'src' / 'data' / 'questions.json'

    if not validation_report.exists():
        print(f"\n❌ Validation Report nicht gefunden: {validation_report}")
        print("   Führe zuerst aus: python scripts\\ai_validator_triple.py")
        return

    if not questions_file.exists():
        print(f"❌ Fragen-Datei nicht gefunden: {questions_file}")
        return

    applier = TripleValidationApplier(str(validation_report), str(questions_file))
    changes = applier.analyze_changes()

    applier.preview_changes(changes)

    total_changes = (
        len(changes['incorrect_answers']) +
        len(changes['topic_changes']) +
        len(changes['difficulty_changes']) +
        len(changes['explanation_improvements'])
    )

    if total_changes == 0:
        print("\n✅ Keine Änderungen erforderlich! Alle Fragen sind korrekt.")
        return

    print(f"\n⚠️  ACHTUNG: {total_changes} Änderungen werden angewendet")
    confirm = input("\n   Fortfahren? [y/N]: ").lower()
    if confirm != 'y':
        print("❌ Abgebrochen")
        return

    applier.apply_changes(changes, create_backup=True)

    print("\n✅ FERTIG!")
    print(f"\n📝 NÄCHSTE SCHRITTE:")
    print(f"   1. Prüfe die Änderungen in: {questions_file}")
    print(f"   2. Teste die App: npm run dev")


if __name__ == '__main__':
    main()
