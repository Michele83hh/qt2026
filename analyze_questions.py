import json
import os
from collections import defaultdict

# Pfade zu den JSON-Dateien
data_dir = r"C:\Users\mjoan\Desktop\ccna-exam-app\src\data"
questions_dir = os.path.join(data_dir, "questions")
test_batch_file = os.path.join(data_dir, "questions-test-batch.json")

# Statistiken sammeln
stats = {
    'file_counts': {},
    'total_questions': 0,
    'all_ids': [],
    'duplicate_ids': [],
    'duplicate_texts': [],
    'types': defaultdict(int),
    'category_questions': [],
    'questions_by_file': {}
}

def analyze_json_file(filepath, filename):
    """Analysiert eine einzelne JSON-Datei"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Prüfe ob es direkt eine Liste ist oder ein Object mit questions array
        if isinstance(data, list):
            questions = data
        elif isinstance(data, dict) and 'questions' in data:
            questions = data['questions']
        else:
            print(f"WARNUNG: Unbekanntes Format in {filename}")
            return []

        return questions
    except Exception as e:
        print(f"FEHLER beim Lesen von {filename}: {e}")
        return []

# 1. Analysiere alle Dateien im questions-Ordner
print("=" * 80)
print("ANALYSE DER CCNA FRAGENDATENBANK")
print("=" * 80)
print("\n1. FRAGENANZAHL PRO DATEI:\n")

question_files = [
    "automation-programmability.json",
    "ip-connectivity.json",
    "ip-services.json",
    "network-access.json",
    "network-fundamentals.json",
    "security-fundamentals.json"
]

all_questions = []
text_to_id = {}  # Für Duplikatserkennung nach Text

for filename in question_files:
    filepath = os.path.join(questions_dir, filename)
    if os.path.exists(filepath):
        questions = analyze_json_file(filepath, filename)
        count = len(questions)
        stats['file_counts'][filename] = count
        stats['questions_by_file'][filename] = questions
        all_questions.extend(questions)
        print(f"  {filename:<40} {count:>3} Fragen")

# Test-Batch Datei
if os.path.exists(test_batch_file):
    questions = analyze_json_file(test_batch_file, "questions-test-batch.json")
    count = len(questions)
    stats['file_counts']['questions-test-batch.json'] = count
    stats['questions_by_file']['questions-test-batch.json'] = questions
    all_questions.extend(questions)
    print(f"  {'questions-test-batch.json':<40} {count:>3} Fragen")

stats['total_questions'] = len(all_questions)
print(f"\n  {'GESAMT':<40} {stats['total_questions']:>3} Fragen")

# 2. Duplikate nach ID prüfen
print("\n" + "=" * 80)
print("2. DUPLIKATE NACH ID:\n")

id_counts = defaultdict(int)
id_locations = defaultdict(list)

for filename, questions in stats['questions_by_file'].items():
    for q in questions:
        qid = q.get('id', 'NO_ID')
        id_counts[qid] += 1
        id_locations[qid].append(filename)
        stats['all_ids'].append(qid)

duplicates_found = False
for qid, count in id_counts.items():
    if count > 1:
        duplicates_found = True
        stats['duplicate_ids'].append(qid)
        locations = ", ".join(id_locations[qid])
        print(f"  ID '{qid}' kommt {count}x vor in: {locations}")

if not duplicates_found:
    print("  Keine Duplikate nach ID gefunden.")

# 3. Duplikate nach Fragentext prüfen
print("\n" + "=" * 80)
print("3. DUPLIKATE NACH FRAGENTEXT:\n")

text_counts = defaultdict(list)
for filename, questions in stats['questions_by_file'].items():
    for q in questions:
        text = q.get('questionText', q.get('question', '')).strip()
        if text:
            text_counts[text].append((q.get('id', 'NO_ID'), filename))

text_duplicates_found = False
for text, occurrences in text_counts.items():
    if len(occurrences) > 1:
        text_duplicates_found = True
        print(f"  Text-Duplikat gefunden ({len(occurrences)}x):")
        print(f"    Text: {text[:80]}...")
        for qid, fname in occurrences:
            print(f"      - ID '{qid}' in {fname}")
        print()

if not text_duplicates_found:
    print("  Keine Duplikate nach Fragentext gefunden.")

# 4. Alle verwendeten Types
print("\n" + "=" * 80)
print("4. VERWENDETE FRAGETYPEN:\n")

for filename, questions in stats['questions_by_file'].items():
    for q in questions:
        qtype = q.get('type', 'KEIN_TYPE')
        stats['types'][qtype] += 1

for qtype, count in sorted(stats['types'].items(), key=lambda x: -x[1]):
    print(f"  {qtype:<35} {count:>3}x")

# 5. Fragen mit "category" oder "kategorie" Type
print("\n" + "=" * 80)
print("5. FRAGEN MIT TYPE 'category' ODER 'kategorie':\n")

category_found = False
for filename, questions in stats['questions_by_file'].items():
    for q in questions:
        qtype = q.get('type', '').lower()
        if 'categor' in qtype or 'kategorie' in qtype:
            category_found = True
            qid = q.get('id', 'NO_ID')
            text = q.get('questionText', q.get('question', ''))[:60]
            print(f"  ID: {qid:<15} File: {filename:<40}")
            print(f"      Type: {q.get('type')}")
            print(f"      Text: {text}...")
            print()
            stats['category_questions'].append((qid, filename))

if not category_found:
    print("  Keine Fragen mit Type 'category' oder 'kategorie' gefunden.")

# 6. Liste aller eindeutigen IDs
print("\n" + "=" * 80)
print("6. ALLE EINDEUTIGEN FRAGE-IDs:\n")

unique_ids = sorted(set(stats['all_ids']))
print(f"  Anzahl eindeutiger IDs: {len(unique_ids)}")
print("\n  IDs nach Präfix gruppiert:")

# Gruppiere nach Präfix
id_prefixes = defaultdict(list)
for qid in unique_ids:
    if qid == 'NO_ID':
        id_prefixes['NO_ID'].append(qid)
        continue

    # Extrahiere Präfix (z.B. "nf" aus "nf-001")
    parts = qid.split('-')
    if len(parts) >= 1:
        prefix = parts[0]
        id_prefixes[prefix].append(qid)
    else:
        id_prefixes['OTHER'].append(qid)

for prefix in sorted(id_prefixes.keys()):
    ids = id_prefixes[prefix]
    print(f"\n  {prefix.upper()}: {len(ids)} Fragen")

    # Zeige die IDs in Gruppen von 10
    for i in range(0, len(ids), 10):
        batch = ids[i:i+10]
        print(f"    {', '.join(batch)}")

# 7. Zusammenfassung
print("\n" + "=" * 80)
print("7. ZUSAMMENFASSUNG:\n")

print(f"  Gesamtanzahl Fragen: {stats['total_questions']}")
print(f"  Eindeutige IDs: {len(unique_ids)}")
print(f"  Duplikate nach ID: {len(stats['duplicate_ids'])}")
print(f"  Duplikate nach Text: {len([t for t, o in text_counts.items() if len(o) > 1])}")
print(f"  Fragen mit Category-Type: {len(stats['category_questions'])}")
print(f"  Verschiedene Fragetypen: {len(stats['types'])}")

print("\n" + "=" * 80)
print("\nAnalyse abgeschlossen!")
print("=" * 80)
