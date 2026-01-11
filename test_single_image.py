"""
Test Gemini extraction with a single image - DEBUG MODE

This helps diagnose extraction issues by showing the full API response.

Usage:
    python test_single_image.py
"""

import os
import sys
from pathlib import Path
from PIL import Image

try:
    import google.generativeai as genai
except ImportError:
    print("ERROR: Missing dependencies!")
    print("Please run: pip install google-generativeai pillow")
    sys.exit(1)

# Configuration
BASE_DIR = Path(__file__).parent
QUESTIONS_DIR = BASE_DIR / "Fragen"

# Check API key
API_KEY = os.getenv("GOOGLE_API_KEY")
if not API_KEY:
    print("ERROR: GOOGLE_API_KEY not set!")
    print("\nPlease set your API key:")
    print("  Windows PowerShell: $env:GOOGLE_API_KEY=\"your-key-here\"")
    sys.exit(1)

print("=" * 70)
print("Gemini Single Image Test - DEBUG MODE")
print("=" * 70)
print(f"API Key: {API_KEY[:10]}...{API_KEY[-4:]}")
print()

# Configure Gemini
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Get first PNG
png_files = sorted(QUESTIONS_DIR.glob("*.png"))
if not png_files:
    print(f"ERROR: No PNG files found in {QUESTIONS_DIR}")
    sys.exit(1)

test_image = png_files[0]
print(f"Test image: {test_image.name}")
print()

# Simple prompt
prompt = """Extract the CCNA exam question from this screenshot.

Return ONLY valid JSON (no markdown, no explanation):

{
  "questionText": "the complete question...",
  "options": ["option 1", "option 2", "option 3", "option 4"],
  "correctAnswerIndexes": [2],
  "explanation": "the explanation text..."
}

The correct answer has a BLUE background with white checkmark."""

print("Sending to Gemini...")
print("-" * 70)

try:
    # Load and send image
    img = Image.open(test_image)
    response = model.generate_content([prompt, img])

    print("✓ Response received!")
    print()
    print("RAW RESPONSE:")
    print("=" * 70)
    print(response.text)
    print("=" * 70)
    print()

    # Try to parse as JSON
    import json
    response_text = response.text.strip()

    # Remove markdown if present
    if response_text.startswith("```"):
        print("⚠️  Response contains markdown code blocks, removing...")
        lines = response_text.split("\n")
        response_text = "\n".join(lines[1:-1]) if len(lines) > 2 else response_text
        response_text = response_text.replace("```json", "").replace("```", "").strip()
        print()

    print("CLEANED RESPONSE:")
    print("=" * 70)
    print(response_text)
    print("=" * 70)
    print()

    # Parse JSON
    data = json.loads(response_text)
    print("✓ Valid JSON!")
    print()
    print("PARSED DATA:")
    print(f"  Question: {data.get('questionText', 'N/A')[:100]}...")
    print(f"  Options: {len(data.get('options', []))} options")
    print(f"  Correct: {data.get('correctAnswerIndexes', [])}")
    print()
    print("=" * 70)
    print("✓ SUCCESS - Extraction works!")
    print("=" * 70)

except Exception as e:
    print()
    print("=" * 70)
    print("✗ ERROR")
    print("=" * 70)
    print(f"Type: {type(e).__name__}")
    print(f"Message: {e}")
    print()

    if "API_KEY" in str(e):
        print("Possible cause: Invalid API key")
        print("Check: https://aistudio.google.com/apikey")
    elif "quota" in str(e).lower():
        print("Possible cause: API quota exceeded")
        print("Wait a few minutes or check your quota")
    elif "JSON" in str(e):
        print("Possible cause: Gemini didn't return valid JSON")
        print("The prompt might need adjustment")
    else:
        print("Check the error message above for details")

    print()
    sys.exit(1)
