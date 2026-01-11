const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./src/data/questions.json', 'utf8'));

const manual = data.questions.filter(q => q.source === 'manual');
const standard = data.questions.filter(q => q.source === 'standard');
const none = data.questions.filter(q => !q.source);

console.log('=== QUESTION SOURCES ===');
console.log('Total questions:', data.questions.length);
console.log('Standard:', standard.length);
console.log('Manual:', manual.length);
console.log('Ohne source:', none.length);

if (none.length > 0) {
  console.log('\n=== Fragen ohne source (erste 5) ===');
  none.slice(0, 5).forEach(q => {
    console.log(`- ${q.id}: ${q.question.substring(0, 60)}...`);
  });
}

if (manual.length > 0) {
  console.log('\n=== Manual Fragen (erste 5) ===');
  manual.slice(0, 5).forEach(q => {
    console.log(`- ${q.id}: ${q.question.substring(0, 60)}...`);
  });
}
