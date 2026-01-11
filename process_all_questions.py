"""
CCNA Question Processor - Processes all 628 screenshots
This script will be called by the main extraction workflow
"""

import json
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(r"C:\Users\mjoan\Desktop\ccna-exam-app")
QUESTIONS_DIR = BASE_DIR / "Fragen"
DATA_DIR = BASE_DIR / "data"

# Sample extracted questions (first 5) - to be expanded
QUESTIONS_PASS1 = [
    {
        "id": "q001",
        "questionNumber": 1,
        "questionText": "During a routine inspection, a technician discovered that software that was installed on a computer was secretly collecting data about websites that were visited by users of the computer. Which type of threat is affecting this computer?",
        "options": [
            "DoS attack",
            "Identity theft",
            "Spyware",
            "Zero-day attack"
        ],
        "correctAnswerIndexes": [2],
        "multipleAnswers": False,
        "explanation": "Topic 1.8.0 - Spyware is software that is installed on a network device and that collects information.",
        "topicReference": "Topic 1.8.0",
        "category": "network-fundamentals",
        "extractionConfidence": "high",
        "needsReview": False
    },
    {
        "id": "q002",
        "questionNumber": 2,
        "questionText": "Which term refers to a network that provides secure access to the corporate offices by suppliers, customers and collaborators?",
        "options": [
            "Internet",
            "Intranet",
            "Extranet",
            "Extendednet"
        ],
        "correctAnswerIndexes": [2],
        "multipleAnswers": False,
        "explanation": "Topic 1.4.0 - The term Internet refers to the worldwide collection of connected networks. Intranet refers to a private connection of LANs and WANs that belong to an organization and is designed to be accessible to the members of the organization, employees, or others with authorization. Extranets provide secure and safe access to suppliers, customers, and collaborators. Extendednet is not a type of network.",
        "topicReference": "Topic 1.4.0",
        "category": "network-fundamentals",
        "extractionConfidence": "high",
        "needsReview": False
    },
    {
        "id": "q003",
        "questionNumber": 3,
        "questionText": "A large corporation has modified its network to allow users to access network resources from their personal laptops and smart phones. Which networking trend does this describe?",
        "options": [
            "Cloud computing",
            "Online collaboration",
            "Bring your own device",
            "Video conferencing"
        ],
        "correctAnswerIndexes": [2],
        "multipleAnswers": False,
        "explanation": "Topic 1.7.0 - BYOD allows end users to use personal tools to access the corporate network. Allowing this trend can have major impacts on a network, such as security and compatibility with corporate software and devices.",
        "topicReference": "Topic 1.7.0",
        "category": "network-fundamentals",
        "extractionConfidence": "high",
        "needsReview": False
    },
    {
        "id": "q004",
        "questionNumber": 4,
        "questionText": "What is an ISP?",
        "options": [
            "It is a standards body that develops cabling and wiring standards for networking.",
            "It is a protocol that establishes how computers within a local network communicate.",
            "It is an organization that enables individuals and businesses to connect to the Internet.",
            "It is a networking device that combines the functionality of several different networking devices in one."
        ],
        "correctAnswerIndexes": [2],
        "multipleAnswers": False,
        "explanation": "Topic 1.5.0 - An ISP, or Internet Service Provider, is an organization that provides access to the Internet for businesses and individuals.",
        "topicReference": "Topic 1.5.0",
        "category": "network-fundamentals",
        "extractionConfidence": "high",
        "needsReview": False
    },
    {
        "id": "q005",
        "questionNumber": 5,
        "questionText": "In which scenario would the use of a WISP be recommended?",
        "options": [
            "An Internet cafe in a city",
            "A farm in a rural area without wired broadband access",
            "Any home with multiple wireless devices",
            "An apartment in a building with cable access to the Internet"
        ],
        "correctAnswerIndexes": [1],
        "multipleAnswers": False,
        "explanation": "Topic 1.7.0 - Wireless Internet Service Providers (WISPs) are typically found in rural areas where DSL or cable access is not available. A dish or antenna on the property of the subscriber connects wirelessly to a WISP transmitter, eliminating the need for physical cabling outside the building.",
        "topicReference": "Topic 1.7.0",
        "category": "network-fundamentals",
        "extractionConfidence": "high",
        "needsReview": False
    }
]

def save_sample_pass():
    """Save sample extracted questions as Pass 1"""
    output = {
        "version": "1.0.0",
        "passNumber": 1,
        "extractedAt": datetime.now().isoformat(),
        "totalQuestions": len(QUESTIONS_PASS1),
        "status": "SAMPLE - First 5 questions only",
        "questions": QUESTIONS_PASS1
    }

    output_file = DATA_DIR / "extraction-pass1-sample.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Sample saved to: {output_file}")

def count_screenshots():
    """Count total screenshots"""
    files = list(QUESTIONS_DIR.glob("*.png"))
    print(f"Total screenshots found: {len(files)}")
    return len(files)

if __name__ == "__main__":
    DATA_DIR.mkdir(exist_ok=True)
    count_screenshots()
    save_sample_pass()

    print("\n" + "="*80)
    print("IMPORTANT: To process all 628 questions, you need to:")
    print("1. Use Claude Code with vision capabilities")
    print("2. Process screenshots in batches")
    print("3. Perform triple-pass extraction for accuracy")
    print("="*80)
