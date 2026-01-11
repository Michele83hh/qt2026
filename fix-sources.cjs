const fs = require('fs');

// Read questions.json
const filePath = './src/data/questions.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('=== BEFORE ===');
const manualBefore = data.questions.filter(q => q.source === 'manual').length;
const standardBefore = data.questions.filter(q => q.source === 'standard').length;
console.log(`Manual: ${manualBefore}`);
console.log(`Standard: ${standardBefore}`);

// Set all to "standard"
data.questions = data.questions.map(q => ({
  ...q,
  source: 'standard'
}));

// Update lastUpdated
data.lastUpdated = new Date().toISOString();

// Write back
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

console.log('\n=== AFTER ===');
const manualAfter = data.questions.filter(q => q.source === 'manual').length;
const standardAfter = data.questions.filter(q => q.source === 'standard').length;
console.log(`Manual: ${manualAfter}`);
console.log(`Standard: ${standardAfter}`);
console.log('\n✅ Alle Fragen auf source: "standard" gesetzt!');
