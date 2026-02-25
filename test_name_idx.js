// Test the improved nameIdx finder

const testHeaders = [
  // Format: [header array, expected nameIdx, description]
  [['date', 'name', 'bowtype', 'totalscore'], 1, 'Standard format'],
  [['date', 'archer name', 'bow', 'score'], 1, 'Archer Name format'],
  [['session', 'archer', 'bow type', 'total'], 1, 'Session with Archer'],
  [['date', 'session', 'bow', 'score'], 1, 'Session as name (no archer)'],
  [['timestamp', 'playername', 'equipment', 'points'], 1, 'PlayerName includes "name"'],
];

testHeaders.forEach(([header, expectedIdx, desc]) => {
  // Name column: prioritize 'archer' matches, then 'name', then 'session'
  let nameIdx = header.findIndex(h => h.includes('archer'));
  if (nameIdx === -1) nameIdx = header.findIndex(h => h === 'name' || (h.includes('name') && h !== 'bowname'));
  if (nameIdx === -1) nameIdx = header.findIndex(h => h === 'session');
  
  const result = nameIdx === expectedIdx ? 'PASS' : 'FAIL';
  console.log(`${result}: ${desc} - expected ${expectedIdx}, got ${nameIdx}`);
});
