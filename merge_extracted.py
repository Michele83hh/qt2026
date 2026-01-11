"""
Merge extracted questions into questions.json

This script:
1. Loads extracted questions from data/full_extraction.json
2. Loads current questions.json
3. Checks for duplicates (by question text)
4. Adds new questions with unique IDs
5. Creates backup
6. Saves updated questions.json

Usage:
    python merge_extracted.py
    python merge_extracted.py --input data/test_extraction.json
    python merge_extracted.py --dry-run  # Preview without saving
"""

import json
import argparse
from pathlib import Path
from datetime import datetime
import shutil

# Paths
BASE_DIR = Path(__file__).parent
QUESTIONS_FILE = BASE_DIR / "src" / "data" / "questions.json"
BACKUP_DIR = BASE_DIR / "src" / "data" / "backup"
BACKUP_DIR.mkdir(exist_ok=True)

def load_json(file_path):
    """Load JSON file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(file_path, data):
    """Save JSON file"""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def normalize_text(text):
    """Normalize text for comparison"""
    return ' '.join(text.lower().split())

def find_duplicates(existing_questions, new_questions):
    """Find duplicate questions based on question text"""
    existing_texts = {normalize_text(q['question']): q['id'] for q in existing_questions}
    duplicates = []
    unique = []

    for q in new_questions:
        norm_text = normalize_text(q['question'])
        if norm_text in existing_texts:
            duplicates.append({
                'new_id': q['id'],
                'existing_id': existing_texts[norm_text],
                'text': q['question'][:100] + '...'
            })
        else:
            unique.append(q)

    return unique, duplicates

def get_next_id(existing_questions, prefix="ext"):
    """Get next available ID"""
    existing_ids = [q['id'] for q in existing_questions if q['id'].startswith(prefix)]

    if not existing_ids:
        return f"{prefix}-001"

    # Extract numbers
    numbers = []
    for qid in existing_ids:
        try:
            num = int(qid.split('-')[1])
            numbers.append(num)
        except:
            pass

    if numbers:
        next_num = max(numbers) + 1
        return f"{prefix}-{str(next_num).zfill(3)}"

    return f"{prefix}-001"

def merge_questions(input_file, dry_run=False):
    """Merge extracted questions into questions.json"""

    print("=" * 70)
    print("CCNA Questions Merger")
    print("=" * 70)

    # Check if input file exists
    if not input_file.exists():
        print(f"ERROR: Input file not found: {input_file}")
        print("\nDid you run the extraction first?")
        print("  python extract_with_gemini.py --test")
        return False

    # Check if questions.json exists
    if not QUESTIONS_FILE.exists():
        print(f"ERROR: questions.json not found: {QUESTIONS_FILE}")
        print("\nThe centralized database file is missing!")
        return False

    print(f"Input file: {input_file}")
    print(f"Target file: {QUESTIONS_FILE}")
    print()

    # Load files
    print("Loading files...")
    extracted_data = load_json(input_file)
    current_data = load_json(QUESTIONS_FILE)

    extracted_questions = extracted_data.get('questions', [])
    current_questions = current_data.get('questions', [])

    print(f"  Current questions: {len(current_questions)}")
    print(f"  Extracted questions: {len(extracted_questions)}")
    print()

    # Find duplicates
    print("Checking for duplicates...")
    unique_questions, duplicates = find_duplicates(current_questions, extracted_questions)

    print(f"  OK Unique questions: {len(unique_questions)}")
    print(f"  ! Duplicates found: {len(duplicates)}")

    if duplicates:
        print("\n  Duplicate questions (will be skipped):")
        for i, dup in enumerate(duplicates[:5], 1):  # Show first 5
            print(f"    {i}. {dup['new_id']} -> {dup['existing_id']}: {dup['text']}")
        if len(duplicates) > 5:
            print(f"    ... and {len(duplicates) - 5} more")
    print()

    if not unique_questions:
        print("No new questions to add!")
        return True

    # Assign new IDs
    print("Assigning IDs to new questions...")
    for q in unique_questions:
        old_id = q['id']
        new_id = get_next_id(current_questions + unique_questions[:unique_questions.index(q)])
        q['id'] = new_id
        print(f"  {old_id} -> {new_id}")
    print()

    # Calculate stats
    print("Statistics:")
    topics_count = {}
    confidence_count = {"high": 0, "medium": 0, "low": 0}

    for q in unique_questions:
        topic = q.get('topic', 'Unknown')
        topics_count[topic] = topics_count.get(topic, 0) + 1

        conf = q.get('_extractionConfidence', 'medium')
        confidence_count[conf] = confidence_count.get(conf, 0) + 1

    print("\n  By Topic:")
    for topic, count in sorted(topics_count.items()):
        print(f"    {topic}: {count}")

    print("\n  By Confidence:")
    for conf, count in confidence_count.items():
        print(f"    {conf}: {count} ({count/len(unique_questions)*100:.1f}%)")
    print()

    # Preview
    print("-" * 70)
    print("PREVIEW:")
    print(f"  Current: {len(current_questions)} questions")
    print(f"  Adding: {len(unique_questions)} new questions")
    print(f"  Total after merge: {len(current_questions) + len(unique_questions)} questions")
    print("-" * 70)
    print()

    if dry_run:
        print("DRY RUN - No changes made")
        return True

    # Confirm
    response = input("Proceed with merge? (yes/no): ").strip().lower()
    if response not in ['yes', 'y']:
        print("Merge cancelled")
        return False

    # Create backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = BACKUP_DIR / f"questions_{timestamp}.json"

    print(f"\nCreating backup: {backup_file}")
    shutil.copy2(QUESTIONS_FILE, backup_file)

    # Merge
    print("Merging questions...")
    merged_questions = current_questions + unique_questions

    # Update metadata
    current_data['questions'] = merged_questions
    current_data['totalQuestions'] = len(merged_questions)
    current_data['lastUpdated'] = datetime.now().isoformat()

    # Add extraction info if not present
    if 'extractionInfo' not in current_data:
        current_data['extractionInfo'] = []

    current_data['extractionInfo'].append({
        'date': datetime.now().isoformat(),
        'method': extracted_data.get('extractionMethod', 'unknown'),
        'questionsAdded': len(unique_questions),
        'sourceFile': str(input_file)
    })

    # Save
    print(f"Saving to: {QUESTIONS_FILE}")
    save_json(QUESTIONS_FILE, current_data)

    print()
    print("=" * 70)
    print("MERGE COMPLETE!")
    print("=" * 70)
    print(f"Total questions: {len(merged_questions)}")
    print(f"Backup saved: {backup_file}")
    print()
    print("Next steps:")
    print("  1. Reload the app (F5 in browser)")
    print("  2. Check Admin → Question Database")
    print("  3. Review questions with medium/low confidence")
    print()

    # Questions needing review
    needs_review = [q for q in unique_questions if q.get('_needsReview', False)]
    if needs_review:
        print(f"! {len(needs_review)} questions need manual review:")
        for q in needs_review[:10]:
            print(f"  - {q['id']}: {q['question'][:80]}...")
        if len(needs_review) > 10:
            print(f"  ... and {len(needs_review) - 10} more")

    return True

def main():
    parser = argparse.ArgumentParser(description="Merge extracted questions into questions.json")
    parser.add_argument("--input", type=str, default="data/full_extraction.json",
                        help="Input file with extracted questions")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview without making changes")

    args = parser.parse_args()

    input_file = Path(args.input)
    merge_questions(input_file, args.dry_run)

if __name__ == "__main__":
    main()
