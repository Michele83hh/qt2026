const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./src/data/questions.json', 'utf8'));

const dragDropQuestions = data.questions.filter(q => q.type === 'drag-and-drop');
const matchingQuestions = data.questions.filter(q => q.type === 'matching');

console.log('=== SPECIAL QUESTION TYPES ===');
console.log('Drag & Drop:', dragDropQuestions.length);
console.log('Matching:', matchingQuestions.length);

if (dragDropQuestions.length > 0) {
  console.log('\n=== Erste Drag & Drop Frage ===');
  const first = dragDropQuestions[0];
  console.log('ID:', first.id);
  console.log('Question:', first.question.substring(0, 80) + '...');
  console.log('DragDropData:', JSON.stringify(first.dragDropData, null, 2));
}

if (matchingQuestions.length > 0) {
  console.log('\n=== Erste Matching Frage ===');
  const first = matchingQuestions[0];
  console.log('ID:', first.id);
  console.log('Question:', first.question.substring(0, 80) + '...');
  console.log('MatchingData:', JSON.stringify(first.matchingData, null, 2));
}
