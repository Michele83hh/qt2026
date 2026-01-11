"""
Auto-Apply Validation Skript
=============================
Wendet validierte Änderungen aus dem Cross-Validation Report automatisch an.

Sicherheitsregeln:
- Nur Änderungen mit KONSENS (beide KIs einig) werden übernommen
- Backup der Original-Datei wird erstellt
- User kann Preview sehen bevor Apply
- Konflikte werden NICHT automatisch übernommen
"""

import json
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List


class ValidationApplier:
    """Wendet Validierungs-Ergebnisse auf questions.json an."""

    def __init__(self, validation_report_path: str, questions_path: str):
        self.validation_report_path = Path(validation_report_path)
        self.questions_path = Path(questions_path)

        # Lade Daten
        with open(self.validation_report_path, 'r', encoding='utf-8') as f:
            self.report = json.load(f)

        with open(self.questions_path, 'r', encoding='utf-8') as f:
            self.questions_data = json.load(f)

        self.questions = {q['id']: q for q in self.questions_data.get('questions', [])}

    def analyze_changes(self) -> Dict:
        """Analysiert welche Änderungen angewendet werden können."""

        auto_apply_candidates = self.report.get('auto_apply_candidates', [])
        conflicts = self.report.get('conflicts', [])

        changes = {
            'incorrect_answers': [],
            'topic_changes': [],
            'difficulty_changes': [],
            'explanation_improvements': [],
            'conflicts_skipped': len(conflicts)
        }

        for validation in auto_apply_candidates:
            q_id = validation['original_question']['id']
            current = validation['original_question']
            consensus = validation['consensus_validation']

            # Fehlerhafte Antworten
            if not consensus['is_correct']:
                changes['incorrect_answers'].append({
                    'id': q_id,
                    'question': current['question'][:60],
                    'old_answer': current['current_answer'],
                    'new_answer': consensus['correct_answer_indices']
                })

        # Auch Konsens-Validierungen für Topic/Difficulty prüfen
        for validation in self.report.get('consensus_validations', []):
            q_id = validation['original_question']['id']
            current = validation['original_question']

            openai_result = validation.get('openai', {})
            groq_result = validation.get('groq', {})

            # Topic-Änderungen (wenn beide einig)
            if openai_result.get('suggested_topic') == groq_result.get('suggested_topic'):
                new_topic = openai_result.get('suggested_topic')
                if new_topic != current['current_topic']:
                    changes['topic_changes'].append({
                        'id': q_id,
                        'question': current['question'][:60],
                        'old_topic': current['current_topic'],
                        'new_topic': new_topic,
                        'reasoning': openai_result.get('topic_reasoning', '')
                    })

            # Difficulty-Änderungen (wenn beide einig)
            if openai_result.get('suggested_difficulty') == groq_result.get('suggested_difficulty'):
                new_difficulty = openai_result.get('suggested_difficulty')
                if new_difficulty != current['current_difficulty']:
                    changes['difficulty_changes'].append({
                        'id': q_id,
                        'question': current['question'][:60],
                        'old_difficulty': current['current_difficulty'],
                        'new_difficulty': new_difficulty,
                        'reasoning': openai_result.get('difficulty_reasoning', '')
                    })

            # Erklärungen verbessern (wenn beide "needs_improvement" sagen)
            if (openai_result.get('explanation_quality') in ['needs_improvement', 'poor'] and
                groq_result.get('explanation_quality') in ['needs_improvement', 'poor']):
                # Nehme OpenAI Erklärung (meist besser formuliert)
                if openai_result.get('improved_explanation'):
                    changes['explanation_improvements'].append({
                        'id': q_id,
                        'question': current['question'][:60],
                        'new_explanation': openai_result['improved_explanation']
                    })

        return changes

    def preview_changes(self, changes: Dict):
        """Zeigt Preview der Änderungen."""

        print("\n" + "="*70)
        print("PREVIEW: ÄNDERUNGEN DIE ANGEWENDET WERDEN")
        print("="*70)

        print(f"\n📊 ZUSAMMENFASSUNG:")
        print(f"   ❌ Fehlerhafte Antworten:     {len(changes['incorrect_answers'])}")
        print(f"   📂 Topic-Änderungen:          {len(changes['topic_changes'])}")
        print(f"   📊 Schwierigkeit-Änderungen:  {len(changes['difficulty_changes'])}")
        print(f"   📝 Erklärung-Verbesserungen:  {len(changes['explanation_improvements'])}")
        print(f"   ⚠️  Konflikte (übersprungen): {changes['conflicts_skipped']}")

        # Fehlerhafte Antworten
        if changes['incorrect_answers']:
            print(f"\n❌ FEHLERHAFTE ANTWORTEN (erste 5):")
            for change in changes['incorrect_answers'][:5]:
                print(f"\n   {change['id']}: {change['question']}...")
                print(f"   Alt: {change['old_answer']} → Neu: {change['new_answer']}")

        # Topic-Änderungen
        if changes['topic_changes']:
            print(f"\n📂 TOPIC-ÄNDERUNGEN (erste 5):")
            for change in changes['topic_changes'][:5]:
                print(f"\n   {change['id']}: {change['question']}...")
                print(f"   Alt: {change['old_topic']} → Neu: {change['new_topic']}")
                print(f"   Grund: {change['reasoning'][:60]}...")

        # Schwierigkeit
        if changes['difficulty_changes']:
            print(f"\n📊 SCHWIERIGKEIT-ÄNDERUNGEN (erste 5):")
            for change in changes['difficulty_changes'][:5]:
                print(f"\n   {change['id']}: {change['question']}...")
                print(f"   Alt: {change['old_difficulty']} → Neu: {change['new_difficulty']}")

        print("\n" + "="*70)

    def apply_changes(self, changes: Dict, create_backup: bool = True):
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

        # Statistik
        total_changes = (
            len(changes['incorrect_answers']) +
            len(changes['topic_changes']) +
            len(changes['difficulty_changes']) +
            len(changes['explanation_improvements'])
        )
        print(f"\n📊 ANGEWENDET:")
        print(f"   Gesamt: {total_changes} Änderungen")
        print(f"   - Antworten korrigiert:  {len(changes['incorrect_answers'])}")
        print(f"   - Topics geändert:       {len(changes['topic_changes'])}")
        print(f"   - Schwierigkeit:         {len(changes['difficulty_changes'])}")
        print(f"   - Erklärungen:           {len(changes['explanation_improvements'])}")


def main():
    """Hauptfunktion."""

    print("="*70)
    print("AUTO-APPLY VALIDATION ÄNDERUNGEN")
    print("="*70)

    # Pfade
    base_dir = Path(__file__).parent.parent
    validation_report = base_dir / 'data' / 'ai_validation_cross.json'
    questions_file = base_dir / 'src' / 'data' / 'questions.json'

    if not validation_report.exists():
        print(f"\n❌ Validation Report nicht gefunden: {validation_report}")
        print("   Führe zuerst aus: python scripts/ai_validator_cross.py")
        return

    if not questions_file.exists():
        print(f"❌ Fragen-Datei nicht gefunden: {questions_file}")
        return

    # Lade und analysiere
    applier = ValidationApplier(str(validation_report), str(questions_file))
    changes = applier.analyze_changes()

    # Preview
    applier.preview_changes(changes)

    # Bestätigung
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
    print("   (Backup wird automatisch erstellt)")

    confirm = input("\n   Fortfahren? [y/N]: ").lower()
    if confirm != 'y':
        print("❌ Abgebrochen - Keine Änderungen vorgenommen")
        return

    # Apply
    applier.apply_changes(changes, create_backup=True)

    print("\n✅ FERTIG!")
    print(f"\n📝 NÄCHSTE SCHRITTE:")
    print(f"   1. Prüfe die Änderungen in: {questions_file}")
    print(f"   2. Prüfe Konflikte manuell im Report: {validation_report}")
    print(f"   3. Teste die App: npm run dev")


if __name__ == '__main__':
    main()
