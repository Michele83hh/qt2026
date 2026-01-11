// Quick test to verify shuffle logic
function testShuffle() {
  // Original question
  const original = {
    options: ["A - Wrong", "B - Correct", "C - Wrong", "D - Wrong"],
    correctAnswer: [1] // "B - Correct"
  };

  // Simulate shuffle: [2, 0, 3, 1]
  const indices = [2, 0, 3, 1];
  const shuffledOptions = indices.map(i => original.options[i]);
  const shuffledCorrectAnswer = original.correctAnswer.map(oldIndex =>
    indices.indexOf(oldIndex)
  );

  console.log("=== SHUFFLE TEST ===");
  console.log("Original:");
  console.log("  Options:", original.options);
  console.log("  Correct:", original.correctAnswer, "→", original.options[1]);

  console.log("\nAfter Shuffle:");
  console.log("  Options:", shuffledOptions);
  console.log("  Correct:", shuffledCorrectAnswer, "→", shuffledOptions[shuffledCorrectAnswer[0]]);

  // Verify
  const success = shuffledOptions[shuffledCorrectAnswer[0]] === "B - Correct";
  console.log("\n✓ Test:", success ? "PASSED" : "FAILED");
  console.log(success ?
    "Die richtige Antwort ist korrekt gemappt!" :
    "FEHLER: Die Antwort stimmt nicht mehr!"
  );
}

testShuffle();
