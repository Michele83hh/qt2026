const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./src/data/questions.json', 'utf8'));

const multipleAnswerQuestions = data.questions.filter(q =>
  q.type === 'multiple-choice-multiple'
);

console.log('=== MULTIPLE-CHOICE-MULTIPLE FRAGEN ===');
console.log('Total:', multipleAnswerQuestions.length);

if (multipleAnswerQuestions.length > 0) {
  console.log('\n=== Erste 3 Beispiele ===');
  multipleAnswerQuestions.slice(0, 3).forEach((q, idx) => {
    console.log(`\n${idx + 1}. ID: ${q.id}`);
    console.log(`   Question: ${q.question.substring(0, 80)}...`);
    console.log(`   Correct Answers: ${q.correctAnswer.length} (${q.correctAnswer.join(', ')})`);
    console.log(`   Hat "Choose TWO/THREE" in Frage: ${q.question.includes('Choose') || q.question.includes('Select')}`);
  });
}
