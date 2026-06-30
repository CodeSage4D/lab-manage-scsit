const fs = require('fs');

const content = fs.readFileSync('src/app/page.tsx', 'utf8');

// Simple brackets matcher
let curly = 0;
let paren = 0;
let bracket = 0;

for (let i = 0; i < content.length; i++) {
  const c = content[i];
  if (c === '{') curly++;
  else if (c === '}') curly--;
  else if (c === '(') paren++;
  else if (c === ')') paren--;
  else if (c === '[') bracket++;
  else if (c === ']') bracket--;
}

console.log('Brackets counts (ideal is 0):');
console.log('Curly braces imbalance (nested {}):', curly);
console.log('Parentheses imbalance (nested ()):', paren);
console.log('Square brackets imbalance (nested []):', bracket);

// Let's also count tags
const tags = ['div', 'main', 'header', 'footer', 'button', 'input', 'select', 'span', 'p', 'label', 'a', 'img'];
tags.forEach(tag => {
  const openCount = (content.match(new RegExp('<' + tag + '(\\s|>)', 'g')) || []).length;
  const closeCount = (content.match(new RegExp('</' + tag + '>', 'g')) || []).length;
  console.log(`Tag <${tag}>: Open = ${openCount}, Close = ${closeCount}, Diff = ${openCount - closeCount}`);
});
