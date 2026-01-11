"""
Quick analysis of question topic distribution
"""
import json
from collections import Counter

# Load questions
with open('src/data/questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

questions = data.get('questions', [])

print(f"\n{'='*70}")
print(f"Question Topic Distribution Analysis")
print(f"{'='*70}\n")
print(f"Total Questions: {len(questions)}\n")

# Count by topic
topic_counts = Counter(q['topic'] for q in questions)

print("Current Distribution:")
print(f"{'Topic':<40} {'Count':>8} {'%':>8}")
print("-" * 70)
for topic, count in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True):
    percentage = (count / len(questions)) * 100
    print(f"{topic:<40} {count:>8} {percentage:>7.1f}%")

print("\n" + "="*70)
print("Target CCNA Distribution:")
print("-" * 70)
target = {
    'Network Fundamentals': 20,
    'Network Access': 20,
    'IP Connectivity': 25,
    'IP Services': 10,
    'Security Fundamentals': 15,
    'Automation and Programmability': 10
}

for topic, target_pct in target.items():
    current_count = topic_counts.get(topic, 0)
    current_pct = (current_count / len(questions)) * 100 if len(questions) > 0 else 0
    target_count = int(len(questions) * target_pct / 100)
    diff = current_count - target_count

    status = "✓" if abs(diff) <= 5 else "⚠" if abs(diff) <= 20 else "✗"

    print(f"{status} {topic:<40} Current: {current_count:>3} ({current_pct:>5.1f}%) | Target: {target_count:>3} ({target_pct:>2}%) | Diff: {diff:>+4}")

print("="*70 + "\n")

# Check for questions with unexpected topics
known_topics = set(target.keys())
unknown_topics = set(topic_counts.keys()) - known_topics

if unknown_topics:
    print("⚠ Questions with non-standard topics:")
    for topic in unknown_topics:
        count = topic_counts[topic]
        print(f"  - {topic}: {count} questions")
    print()
