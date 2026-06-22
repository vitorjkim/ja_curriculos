const fs = require('fs');
const filePath = 'src/pages/Profile.jsx';
let t = fs.readFileSync(filePath, 'utf8');

const oldCond = "((user?.type === 'candidate' && !id) || (profile?.type === 'candidate'))";
const newCond = "((user?.type === 'candidate' && !id) || (profile?.type === 'candidate') || !!id)";

const count = t.split(oldCond).length - 1;
console.log('Occurrences to replace:', count);

t = t.split(oldCond).join(newCond);

const after = t.split(newCond).length - 1;
console.log('Occurrences after:', after);
fs.writeFileSync(filePath, t, 'utf8');
console.log('Done.');
