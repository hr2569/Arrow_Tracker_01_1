// Test the CSV parsing logic
const testCSV = `Date,Name,BowType,TotalScore
2/24/2026,John Smith,Recurve,285
2/24/2026,Jane Doe,Compound,310
2/25/2026,Bob Wilson,Barebow,245`;

function parseMultiArcherCSV(content) {
    try {
        const lines = content.trim().split('\n');
        if (lines.length < 2) return [];

        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const results = [];

        // Find column indices - support multiple header formats
        const dateIdx = header.findIndex(h => h === 'date' || h.includes('date'));
        const nameIdx = header.findIndex(h => h === 'name' || h.includes('name') || h.includes('archer') || h === 'session');
        const bowIdx = header.findIndex(h => h === 'bowtype' || h === 'bow type' || h.includes('bow'));
        const scoreIdx = header.findIndex(h => h === 'totalscore' || h === 'total score' || h === 'score' || h.includes('score') || h.includes('total') || h.includes('points'));

        console.log('CSV Header:', header);
        console.log('Indices - date:', dateIdx, 'name:', nameIdx, 'bow:', bowIdx, 'score:', scoreIdx);

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            if (values.length < 2) continue;

            // Get values based on found indices or fallback to positional
            const date = dateIdx !== -1 ? values[dateIdx] : values[0] || new Date().toLocaleDateString();
            const name = nameIdx !== -1 ? values[nameIdx] : values[1] || values[0];
            const bowType = bowIdx !== -1 ? values[bowIdx] : values[2] || '';
            const scoreStr = scoreIdx !== -1 ? values[scoreIdx] : values[values.length - 1];
            const score = parseInt(scoreStr) || 0;

            console.log(`Row ${i}: name="${name}", bowType="${bowType}", score=${score}, raw values:`, values);

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
            }
        }

        console.log('Parsed results:', results.length);
        return results;
    } catch (error) {
        console.error('Multi-archer CSV parsing error:', error);
        return [];
    }
}

const result = parseMultiArcherCSV(testCSV);
console.log('\nFinal parsed data:');
console.log(JSON.stringify(result, null, 2));
