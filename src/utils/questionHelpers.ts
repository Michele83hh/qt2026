/**
 * Extrahiert die erwartete Anzahl an Antworten aus dem Fragetext
 * Sucht nach Patterns wie "Choose two", "Select three", etc.
 */
export function getExpectedAnswerCount(questionText: string): number | null {
  const lowerText = questionText.toLowerCase();

  // Patterns für "choose/select X"
  const patterns = [
    /choose\s+(\w+)/i,
    /select\s+(\w+)/i,
  ];

  const numberWords: { [key: string]: number } = {
    'one': 1,
    'two': 2,
    'three': 3,
    'four': 4,
    'five': 5,
  };

  for (const pattern of patterns) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      const word = match[1].toLowerCase();
      if (numberWords[word]) {
        return numberWords[word];
      }
    }
  }

  return null;
}
