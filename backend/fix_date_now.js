const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('default(Date.now())')) {
        const newContent = content.replace(/default\(Date\.now\(\)\)/g, 'default(Date.now)');
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Fixed ${file}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src', 'models'));
