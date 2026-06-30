const fs = require('fs');

const logPath = 'C:\\Users\\karan\\.gemini\\antigravity-ide\\brain\\d3929d3c-2744-4a94-b1b0-9183dfb8e093\\.system_generated\\logs\\transcript_full.jsonl';
const lines = fs.readFileSync(logPath, 'utf8').split('\n');

const lineMap = {};

lines.forEach((line, idx) => {
  if (!line.trim()) return;
  try {
    const obj = JSON.parse(line);
    // Strict checks: type VIEW_FILE, path is page.tsx, and step index is before step 200 (to avoid transcript viewing)
    if (
      obj.type && 
      obj.type.toUpperCase() === 'VIEW_FILE' && 
      obj.content && 
      obj.content.includes('File Path: `file:///d:/SUAS%20Data/src/app/page.tsx`') &&
      obj.step_index < 200
    ) {
      console.log('Found valid page.tsx view step:', obj.step_index);
      const linesOfContent = obj.content.split('\n');
      linesOfContent.forEach(l => {
        const match = l.match(/^(\d+):\s(.*)$/);
        if (match) {
          const lineNum = parseInt(match[1]);
          const lineVal = match[2];
          lineMap[lineNum] = lineVal;
        }
      });
    }
  } catch (err) {
  }
});

const sortedKeys = Object.keys(lineMap).map(Number).sort((a,b) => a - b);
console.log('Total unique lines for page.tsx:', sortedKeys.length);
if (sortedKeys.length > 0) {
  console.log('Min line:', sortedKeys[0], 'Max line:', sortedKeys[sortedKeys.length - 1]);
  let output = '';
  const maxLine = sortedKeys[sortedKeys.length - 1];
  for (let i = 1; i <= maxLine; i++) {
    if (lineMap[i] !== undefined) {
      output += lineMap[i] + '\n';
    } else {
      output += '// MISSING LINE ' + i + '\n';
    }
  }
  fs.writeFileSync('src/app/page.reconstructed.tsx', output);
  console.log('Saved strictly reconstructed lines to src/app/page.reconstructed.tsx');
}
