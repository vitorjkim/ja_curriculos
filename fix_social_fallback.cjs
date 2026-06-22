const fs = require('fs');
const filePath = 'src/pages/Profile.jsx';
let t = fs.readFileSync(filePath, 'utf8');

// Remove fallback cinza do Instagram
t = t.replace(
  /\) : \(\s*<div className="w-11 h-11 rounded-xl bg-gray-200 flex items-center justify-center" title="Instagram não informado">\s*<Instagram className="w-5 h-5 text-gray-400" \/>\s*<\/div>\s*\)}/,
  ') : null}'
);

// Remove fallback cinza do LinkedIn
t = t.replace(
  /\) : \(\s*<div className="w-11 h-11 rounded-xl bg-gray-200 flex items-center justify-center" title="LinkedIn não informado">\s*<Linkedin className="w-5 h-5 text-gray-400" \/>\s*<\/div>\s*\)}/,
  ') : null}'
);

// Remove fallback cinza do GitHub
t = t.replace(
  /\) : \(\s*<div className="w-11 h-11 rounded-xl bg-gray-200 flex items-center justify-center" title="GitHub não informado">\s*<Github className="w-5 h-5 text-gray-400" \/>\s*<\/div>\s*\)}/,
  ') : null}'
);

// Remove fallback cinza do Link Extra
t = t.replace(
  /\) : \(\s*<div className="w-11 h-11 rounded-xl bg-gray-200 flex items-center justify-center" title="Link extra não informado">\s*<Link2 className="w-5 h-5 text-gray-400" \/>\s*<\/div>\s*\)}/,
  ') : null}'
);

fs.writeFileSync(filePath, t, 'utf8');
console.log('Done. Fallbacks removed.');
