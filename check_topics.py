import json
from collections import Counter

with open('src/data/questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

topics = [q['topic'] for q in data['questions']]
topic_counts = Counter(topics)

print("\nTopic-Verteilung:")
print("=" * 50)
for topic, count in sorted(topic_counts.items()):
    percentage = (count / len(topics)) * 100
    print(f"{topic:35} {count:4} ({percentage:5.1f}%)")
print("=" * 50)
print(f"{'Gesamt':35} {len(topics):4} (100.0%)")

# Check for questions without proper topics
no_topic = [q['id'] for q in data['questions'] if not q.get('topic')]
if no_topic:
    print(f"\n⚠️  Fragen ohne Topic: {len(no_topic)}")
    print(no_topic[:10])
