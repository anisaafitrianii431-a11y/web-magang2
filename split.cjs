const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split(/\r?\n/);

const headIndex = lines.indexOf('<<<<<<< HEAD');
const sepIndex = lines.indexOf('=======');
const tailIndex = lines.findIndex(line => line.startsWith('>>>>>>>'));

if (headIndex !== -1 && sepIndex !== -1 && tailIndex !== -1) {
    let userCode = lines.slice(headIndex + 1, sepIndex).join('\n');
    userCode = userCode.replace(/function App\(\) {/g, 'function Tugas() {');
    // Replace export default if it exists
    userCode = userCode.replace(/export default App;/g, 'export default Tugas;');
    // Add default export if not there
    if (!userCode.includes('export default Tugas')) {
        userCode += '\nexport default Tugas;\n';
    }
    
    // Make sure pages directory exists
    if (!fs.existsSync('src/pages')) {
        fs.mkdirSync('src/pages', { recursive: true });
    }
    fs.writeFileSync('src/pages/Tugas.jsx', userCode);
    
    let friendCode = lines.slice(sepIndex + 1, tailIndex).join('\n');
    
    friendCode = friendCode.replace('import Dashboard from "./pages/Dashboard";', 'import Dashboard from "./pages/Dashboard";\nimport Tugas from "./pages/Tugas";');
    friendCode = friendCode.replace('<Route path="/dashboard" element={<Dashboard />} />', '<Route path="/dashboard" element={<Dashboard />} />\n                <Route path="/tugas" element={<Tugas />} />');
    
    fs.writeFileSync('src/App.jsx', friendCode);
    console.log("Successfully split App.jsx");
} else {
    console.log("Conflict markers not found");
}
