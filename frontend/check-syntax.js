const fs = require('fs');
const src = fs.readFileSync('src/pages/JobsPage.jsx', 'utf8');

let braceCount = 0;
let parenCount = 0;
let braceHistory = []; // [{line, count}]
let parenHistory = [];
let inString = false;
let stringChar = '';
let inComment = false;
let inMultilineComment = false;
let inJSX = 0;
let lineNum = 1;

for (let i = 0; i < src.length; i++) {
  const ch = src[i];
  const prev = i > 0 ? src[i - 1] : '';
  const next = i < src.length - 1 ? src[i + 1] : '';

  if (inMultilineComment) {
    if (prev === '*' && ch === '/') inMultilineComment = false;
    continue;
  }
  if (inComment) {
    if (ch === '\n') inComment = false;
    continue;
  }

  // Handle strings
  if (!inJSX) {
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = true;
      stringChar = ch;
      continue;
    } else if (inString && ch === stringChar && prev !== '\\') {
      inString = false;
      continue;
    }
    if (inString) continue;
  }

  // Comments
  if (!inString && prev === '/' && ch === '/' && src[i - 2] !== ':') { inComment = true; continue; }
  if (!inString && prev === '/' && ch === '*') { inMultilineComment = true; continue; }

  // JSX tracking (rough)
  if (!inString) {
    if (ch === '<' && next && /[a-zA-Z]/.test(next)) {
      const ahead = src.substring(i, i + 5);
      if (!/^<!--/.test(ahead)) inJSX++;
    }
    if (ch === '>' && inJSX > 0) {
      if (prev !== '/') inJSX--;
      else inJSX = Math.max(0, inJSX - 1);
    }
  }

  if (!inString) {
    if (ch === '{') { braceCount++; }
    if (ch === '}') { braceCount--; braceHistory.push({ line: lineNum, count: braceCount }); }
    if (ch === '(') { parenCount++; }
    if (ch === ')') { parenCount--; parenHistory.push({ line: lineNum, count: parenCount }); }
  }

  if (ch === '\n') lineNum++;
}

console.log('Final brace count ({}):', braceCount);
console.log('Final paren count ():', parenCount);
console.log('\nFirst } with negative count:');
const neg = braceHistory.filter(h => h.count < 0);
if (neg.length) console.log(neg[0]);
else console.log('  None');
console.log('\nFirst ) with negative count:');
const negP = parenHistory.filter(h => h.count < 0);
if (negP.length) console.log(negP[0]);
else console.log('  None');
