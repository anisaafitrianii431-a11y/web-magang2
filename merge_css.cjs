const fs = require('fs');

const content = fs.readFileSync('src/index.css', 'utf8');
const lines = content.split(/\r?\n/);

const headIndex = lines.indexOf('<<<<<<< HEAD');
const sepIndex = lines.indexOf('=======');
const tailIndex = lines.findIndex(line => line.startsWith('>>>>>>>'));

if (headIndex !== -1 && sepIndex !== -1 && tailIndex !== -1) {
    const userCode = lines.slice(headIndex + 1, sepIndex).join('\n');
    const friendCode = lines.slice(sepIndex + 1, tailIndex).join('\n');
    
    fs.writeFileSync('src/index.css', userCode + '\n\n' + friendCode);
    console.log("Successfully merged index.css");
} else {
    console.log("Conflict markers not found in index.css");
}
