const fs = require('fs');
const filePath = 'src/pages/Profile.jsx';
let t = fs.readFileSync(filePath, 'utf8');

const oldStr = `          linkedinUrl: profile.linkedin_url || undefined,
          instagramUrl: profile.instagram_url || undefined,
          githubUrl: profile.github_url || undefined,
          customUrl: profile.custom_url || undefined`;

const newStr = `          linkedinUrl: profile.linkedin_url || null,
          instagramUrl: profile.instagram_url || null,
          githubUrl: profile.github_url || null,
          customUrl: profile.custom_url || null`;

if (t.includes(oldStr)) {
    t = t.replace(oldStr, newStr);
    fs.writeFileSync(filePath, t, 'utf8');
    console.log('Fixed: social URLs now send null instead of undefined when empty.');
} else {
    // try CRLF
    const oldCrlf = oldStr.replace(/\n/g, '\r\n');
    const newCrlf = newStr.replace(/\n/g, '\r\n');
    if (t.includes(oldCrlf)) {
        t = t.replace(oldCrlf, newCrlf);
        fs.writeFileSync(filePath, t, 'utf8');
        console.log('Fixed (CRLF): social URLs now send null instead of undefined when empty.');
    } else {
        console.log('Not found. Let me check...');
        const idx = t.indexOf('linkedinUrl: profile.linkedin_url');
        console.log(JSON.stringify(t.substring(idx - 10, idx + 200)));
    }
}
