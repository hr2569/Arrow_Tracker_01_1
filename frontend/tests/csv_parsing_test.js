/**
 * CSV Parsing Unit Tests for Arrow Tracker Score Keeping
 * Tests the parseMultiArcherCSV and parseCSVLine functions
 */

// Helper function to parse a CSV line properly (handles quoted values)
const parseCSVLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  
  // Don't forget the last value
  values.push(current.trim().replace(/^["']|["']$/g, ''));
  
  return values;
};

// Parse multi-archer CSV
const parseMultiArcherCSV = (content) => {
  try {
    // Normalize line endings (handle Windows CRLF, Mac CR, Unix LF)
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedContent.trim().split('\n');
    
    console.log('CSV Import Debug:');
    console.log('- Total lines:', lines.length);
    console.log('- First line (header):', lines[0]);
    if (lines.length > 1) console.log('- Second line (first data):', lines[1]);
    
    if (lines.length < 2) {
      console.log('CSV has less than 2 lines, returning empty');
      return [];
    }

    // Parse header - handle BOM and extra whitespace
    const headerLine = lines[0].replace(/^\uFEFF/, ''); // Remove BOM if present
    const header = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const results = [];

    // Find column indices - support multiple header formats
    const dateIdx = header.findIndex(h => h === 'date' || h.includes('date'));
    const nameIdx = header.findIndex(h => h === 'name' || h.includes('name') || h.includes('archer') || h === 'session');
    const bowIdx = header.findIndex(h => h === 'bowtype' || h === 'bow type' || h.includes('bow'));
    const scoreIdx = header.findIndex(h => h === 'totalscore' || h === 'total score' || h === 'score' || h.includes('score') || h.includes('total') || h.includes('points'));

    console.log('CSV Header parsed:', header);
    console.log('Column indices - date:', dateIdx, 'name:', nameIdx, 'bow:', bowIdx, 'score:', scoreIdx);

    // If no name column found, try positional parsing
    const usePositional = nameIdx === -1;
    if (usePositional) {
      console.log('No name column found, using positional parsing');
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV values properly (handle quoted values with commas)
      const values = parseCSVLine(line);
      if (values.length < 2) {
        console.log(`Row ${i}: Skipping - less than 2 values`);
        continue;
      }

      // Get values based on found indices or fallback to positional
      let date, name, bowType, score;
      
      if (usePositional) {
        // Positional: assume Date,Name,BowType,Score format
        date = values[0] || new Date().toLocaleDateString();
        name = values[1] || '';
        bowType = values[2] || '';
        score = parseInt(values[3] || values[values.length - 1]) || 0;
      } else {
        date = dateIdx !== -1 ? values[dateIdx] : values[0] || new Date().toLocaleDateString();
        name = nameIdx !== -1 ? values[nameIdx] : values[1] || values[0];
        bowType = bowIdx !== -1 ? values[bowIdx] : values[2] || '';
        const scoreStr = scoreIdx !== -1 ? values[scoreIdx] : values[values.length - 1];
        score = parseInt(scoreStr) || 0;
      }

      console.log(`Row ${i}: name="${name}", bowType="${bowType}", score=${score}`);

      if (name && name.length > 0 && score > 0) {
        results.push({
          id: `imported-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
          archerName: name,
          bowType: bowType,
          distance: '',
          rounds: [{ roundNumber: 1, scores: [score], total: score }],
          totalScore: score,
          date: date,
        });
      } else {
        console.log(`Row ${i}: Skipping - name empty or score <= 0`);
      }
    }

    console.log('CSV Import: Parsed', results.length, 'entries');
    return results;
  } catch (error) {
    console.error('Multi-archer CSV parsing error:', error);
    return [];
  }
};

// Test framework helpers
let passCount = 0;
let failCount = 0;

function assertEquals(actual, expected, testName) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✓ PASS: ${testName}`);
    passCount++;
    return true;
  } else {
    console.log(`✗ FAIL: ${testName}`);
    console.log(`  Expected: ${JSON.stringify(expected)}`);
    console.log(`  Actual:   ${JSON.stringify(actual)}`);
    failCount++;
    return false;
  }
}

function assertLength(arr, length, testName) {
  if (arr.length === length) {
    console.log(`✓ PASS: ${testName}`);
    passCount++;
    return true;
  } else {
    console.log(`✗ FAIL: ${testName}`);
    console.log(`  Expected length: ${length}`);
    console.log(`  Actual length:   ${arr.length}`);
    failCount++;
    return false;
  }
}

console.log('======================================');
console.log('CSV PARSING UNIT TESTS');
console.log('======================================\n');

// Test 1: parseCSVLine basic functionality
console.log('TEST 1: parseCSVLine - Basic CSV line parsing');
const line1 = '01/15/2025,John Smith,Recurve,285';
const result1 = parseCSVLine(line1);
assertEquals(result1, ['01/15/2025', 'John Smith', 'Recurve', '285'], 'Basic comma-separated values');

// Test 2: parseCSVLine with quoted values
console.log('\nTEST 2: parseCSVLine - Quoted values with commas');
const line2 = '01/15/2025,"Smith, John",Compound,300';
const result2 = parseCSVLine(line2);
assertEquals(result2, ['01/15/2025', 'Smith, John', 'Compound', '300'], 'Quoted value with comma inside');

// Test 3: parseCSVLine with empty values
console.log('\nTEST 3: parseCSVLine - Empty values');
const line3 = '01/15/2025,Jane Doe,,250';
const result3 = parseCSVLine(line3);
assertEquals(result3, ['01/15/2025', 'Jane Doe', '', '250'], 'Empty bow type');

// Test 4: parseMultiArcherCSV with standard format (Date,Name,BowType,TotalScore)
console.log('\nTEST 4: parseMultiArcherCSV - Standard format (Date,Name,BowType,TotalScore)');
const csv4 = `Date,Name,BowType,TotalScore
01/15/2025,John Smith,Recurve,285
01/15/2025,Jane Doe,Compound,300
01/16/2025,Bob Johnson,Barebow,250`;
const result4 = parseMultiArcherCSV(csv4);
assertLength(result4, 3, 'Should parse 3 archers');
assertEquals(result4[0].archerName, 'John Smith', 'First archer name');
assertEquals(result4[0].bowType, 'Recurve', 'First archer bow type');
assertEquals(result4[0].totalScore, 285, 'First archer score');
assertEquals(result4[1].archerName, 'Jane Doe', 'Second archer name');
assertEquals(result4[1].totalScore, 300, 'Second archer score');
assertEquals(result4[2].archerName, 'Bob Johnson', 'Third archer name');
assertEquals(result4[2].totalScore, 250, 'Third archer score');

// Test 5: parseMultiArcherCSV with different header format
console.log('\nTEST 5: parseMultiArcherCSV - Alternative header names');
const csv5 = `Session,Archer Name,Bow,Score
Practice 1,Alice,Traditional,220
Practice 2,Charlie,Longbow,195`;
const result5 = parseMultiArcherCSV(csv5);
assertLength(result5, 2, 'Should parse 2 archers');
assertEquals(result5[0].archerName, 'Alice', 'First archer name with alt header');
assertEquals(result5[0].bowType, 'Traditional', 'First archer bow type');
assertEquals(result5[0].totalScore, 220, 'First archer score');

// Test 6: parseMultiArcherCSV with Windows line endings (CRLF)
console.log('\nTEST 6: parseMultiArcherCSV - Windows line endings (CRLF)');
const csv6 = 'Date,Name,BowType,TotalScore\r\n01/15/2025,Mike,Recurve,275\r\n01/15/2025,Sarah,Compound,310';
const result6 = parseMultiArcherCSV(csv6);
assertLength(result6, 2, 'Should parse 2 archers with CRLF');
assertEquals(result6[0].archerName, 'Mike', 'First archer name with CRLF');
assertEquals(result6[1].archerName, 'Sarah', 'Second archer name with CRLF');

// Test 7: parseMultiArcherCSV with BOM character
console.log('\nTEST 7: parseMultiArcherCSV - BOM character handling');
const csv7 = '\uFEFFDate,Name,BowType,TotalScore\n01/15/2025,TestArcher,Recurve,260';
const result7 = parseMultiArcherCSV(csv7);
assertLength(result7, 1, 'Should parse 1 archer with BOM');
assertEquals(result7[0].archerName, 'TestArcher', 'Archer name with BOM');

// Test 8: parseMultiArcherCSV with empty rows
console.log('\nTEST 8: parseMultiArcherCSV - Empty rows handling');
const csv8 = `Date,Name,BowType,TotalScore
01/15/2025,Valid Archer,Recurve,280

01/16/2025,Another Archer,Compound,290`;
const result8 = parseMultiArcherCSV(csv8);
assertLength(result8, 2, 'Should skip empty rows');

// Test 9: parseMultiArcherCSV with score = 0 (should be skipped)
console.log('\nTEST 9: parseMultiArcherCSV - Zero score handling');
const csv9 = `Date,Name,BowType,TotalScore
01/15/2025,Valid Archer,Recurve,280
01/15/2025,Zero Score,Recurve,0`;
const result9 = parseMultiArcherCSV(csv9);
assertLength(result9, 1, 'Should skip zero scores');

// Test 10: parseMultiArcherCSV with minimal data (no header recognized)
console.log('\nTEST 10: parseMultiArcherCSV - Positional parsing fallback');
const csv10 = `Col1,Col2,Col3,Col4
01/15/2025,Positional Test,Unknown,265`;
const result10 = parseMultiArcherCSV(csv10);
// Without name header, it falls back to positional parsing
assertLength(result10, 1, 'Should parse with positional fallback');
assertEquals(result10[0].archerName, 'Positional Test', 'Name from positional parsing');
assertEquals(result10[0].bowType, 'Unknown', 'Bow type from positional parsing');
assertEquals(result10[0].totalScore, 265, 'Score from positional parsing');

// Test 11: parseMultiArcherCSV with only header (no data)
console.log('\nTEST 11: parseMultiArcherCSV - Header only (no data)');
const csv11 = 'Date,Name,BowType,TotalScore';
const result11 = parseMultiArcherCSV(csv11);
assertLength(result11, 0, 'Should return empty array for header-only');

// Test 12: parseMultiArcherCSV with single line (no header)
console.log('\nTEST 12: parseMultiArcherCSV - Single line (no data)');
const csv12 = 'single line without comma';
const result12 = parseMultiArcherCSV(csv12);
assertLength(result12, 0, 'Should return empty for single line');

// Test 13: Case-insensitive header matching
console.log('\nTEST 13: parseMultiArcherCSV - Case-insensitive headers');
const csv13 = `DATE,NAME,BOWTYPE,TOTALSCORE
01/15/2025,Uppercase Test,Recurve,295`;
const result13 = parseMultiArcherCSV(csv13);
assertLength(result13, 1, 'Should parse with uppercase headers');
assertEquals(result13[0].archerName, 'Uppercase Test', 'Name from uppercase header');

// Test 14: Whitespace handling
console.log('\nTEST 14: parseMultiArcherCSV - Whitespace handling');
const csv14 = `  Date  ,  Name  ,  BowType  ,  TotalScore  
  01/15/2025  ,  Whitespace Test  ,  Recurve  ,  275  `;
const result14 = parseMultiArcherCSV(csv14);
assertLength(result14, 1, 'Should parse with extra whitespace');
assertEquals(result14[0].archerName, 'Whitespace Test', 'Name trimmed correctly');

// Print Summary
console.log('\n======================================');
console.log('TEST SUMMARY');
console.log('======================================');
console.log(`Total Tests: ${passCount + failCount}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
console.log('======================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
