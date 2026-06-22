const fs = require('fs');
const filePath = 'src/pages/Profile.jsx';
let t = fs.readFileSync(filePath, 'utf8');

const oldStr = `                if (typeof s.is_featured !== 'undefined') setIsHighlightedStudent(!!s.is_featured);
                return;`;

const newStr = `                if (typeof s.is_featured !== 'undefined') setIsHighlightedStudent(!!s.is_featured);
                // Carregar seções do backend (resume_sections) para visualização da escola
                if (s.resume_sections && typeof s.resume_sections === 'object') {
                  setProfileSections(prev => ({ ...prev, ...s.resume_sections }));
                }
                return;`;

if (t.includes(oldStr)) {
    t = t.replace(oldStr, newStr);
    fs.writeFileSync(filePath, t, 'utf8');
    console.log('Fixed: resume_sections now loaded in school branch.');
} else {
    const oldCrlf = oldStr.replace(/\n/g, '\r\n');
    const newCrlf = newStr.replace(/\n/g, '\r\n');
    if (t.includes(oldCrlf)) {
        t = t.replace(oldCrlf, newCrlf);
        fs.writeFileSync(filePath, t, 'utf8');
        console.log('Fixed (CRLF): resume_sections now loaded in school branch.');
    } else {
        console.log('Not found. Checking raw:');
        const idx = t.indexOf('setIsHighlightedStudent(!!s.is_featured)');
        console.log(JSON.stringify(t.substring(idx - 10, idx + 100)));
    }
}
