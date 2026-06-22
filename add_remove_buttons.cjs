const fs = require('fs');
const filePath = 'src/pages/Profile.jsx';
let t = fs.readFileSync(filePath, 'utf8');

// Fragmento com os botoes de fechar para os inputs de redes sociais
const updatedInputs = `                      {/* Input Instagram */}
                      <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-11 rounded-l-xl bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center">
                          <Instagram className="w-5 h-5 text-white" />      
                        </div>
                        <input
                          value={profile.instagram_url || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, instagram_url: e.target.value }))}
                          placeholder="@seu.usuario"
                          className="w-full h-11 pl-14 pr-10 rounded-xl border-2 border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 transition-all"
                        />
                        {profile.instagram_url && (
                          <button onClick={() => setProfile(prev => ({ ...prev, instagram_url: '' }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors p-1">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {/* Input LinkedIn */}
                      <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-11 rounded-l-xl bg-[#0077B5] flex items-center justify-center">
                          <Linkedin className="w-5 h-5 text-white" />       
                        </div>
                        <input
                          value={profile.linkedin_url || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, linkedin_url: e.target.value }))}
                          placeholder="linkedin.com/in/seu-perfil"
                          className="w-full h-11 pl-14 pr-10 rounded-xl border-2 border-sky-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 transition-all"
                        />
                        {profile.linkedin_url && (
                          <button onClick={() => setProfile(prev => ({ ...prev, linkedin_url: '' }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors p-1">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {/* Input GitHub */}
                      <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-11 rounded-l-xl bg-[#333] flex items-center justify-center">
                          <Github className="w-5 h-5 text-white" />
                        </div>
                        <input
                          value={profile.github_url || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, github_url: e.target.value }))}
                          placeholder="github.com/seu-usuario"
                          className="w-full h-11 pl-14 pr-10 rounded-xl border-2 border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 transition-all"
                        />
                        {profile.github_url && (
                          <button onClick={() => setProfile(prev => ({ ...prev, github_url: '' }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors p-1">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {/* Input Link Extra */}
                      <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-11 rounded-l-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <Link2 className="w-5 h-5 text-white" />
                        </div>
                        <input
                          value={profile.custom_url || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, custom_url: e.target.value }))}
                          placeholder="seu-portfolio.com ou qualquer link"  
                          className="w-full h-11 pl-14 pr-10 rounded-xl border-2 border-indigo-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 transition-all"
                        />
                        {profile.custom_url && (
                          <button onClick={() => setProfile(prev => ({ ...prev, custom_url: '' }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors p-1">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>`;

const searchString = "                      {/* Input Instagram */}\r\n" +
"                      <div className=\"relative\">\r\n" +
"                        <div className=\"absolute left-0 top-0 bottom-0 w-11 rounded-l-xl bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center\">\r\n" +
"                          <Instagram className=\"w-5 h-5 text-white\" />      \r\n" +
"                        </div>\r\n" +
"                        <input\r\n" +
"                          value={profile.instagram_url}\r\n" +
"                          onChange={(e) => setProfile(prev => ({ ...prev, instagram_url: e.target.value }))}\r\n" +
"                          placeholder=\"@seu.usuario\"\r\n" +
"                          className=\"w-full h-11 pl-14 pr-4 rounded-xl border-2 border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 transition-all\"\r\n" +
"                        />\r\n" +
"                      </div>\r\n" +
"                      {/* Input LinkedIn */}\r\n" +
"                      <div className=\"relative\">\r\n" +
"                        <div className=\"absolute left-0 top-0 bottom-0 w-11 rounded-l-xl bg-[#0077B5] flex items-center justify-center\">\r\n" +
"                          <Linkedin className=\"w-5 h-5 text-white\" />       \r\n" +
"                        </div>\r\n" +
"                        <input\r\n" +
"                          value={profile.linkedin_url}\r\n" +
"                          onChange={(e) => setProfile(prev => ({ ...prev, linkedin_url: e.target.value }))}\r\n" +
"                          placeholder=\"linkedin.com/in/seu-perfil\"\r\n" +
"                          className=\"w-full h-11 pl-14 pr-4 rounded-xl border-2 border-sky-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 transition-all\"\r\n" +
"                        />\r\n" +
"                      </div>\r\n" +
"                      {/* Input GitHub */}\r\n" +
"                      <div className=\"relative\">\r\n" +
"                        <div className=\"absolute left-0 top-0 bottom-0 w-11 rounded-l-xl bg-[#333] flex items-center justify-center\">\r\n" +
"                          <Github className=\"w-5 h-5 text-white\" />\r\n" +
"                        </div>\r\n" +
"                        <input\r\n" +
"                          value={profile.github_url}\r\n" +
"                          onChange={(e) => setProfile(prev => ({ ...prev, github_url: e.target.value }))}\r\n" +
"                          placeholder=\"github.com/seu-usuario\"\r\n" +
"                          className=\"w-full h-11 pl-14 pr-4 rounded-xl border-2 border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 transition-all\"\r\n" +
"                        />\r\n" +
"                      </div>\r\n" +
"                      {/* Input Link Extra */}\r\n" +
"                      <div className=\"relative\">\r\n" +
"                        <div className=\"absolute left-0 top-0 bottom-0 w-11 rounded-l-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center\">\r\n" +
"                          <Link2 className=\"w-5 h-5 text-white\" />\r\n" +
"                        </div>\r\n" +
"                        <input\r\n" +
"                          value={profile.custom_url}\r\n" +
"                          onChange={(e) => setProfile(prev => ({ ...prev, custom_url: e.target.value }))}\r\n" +
"                          placeholder=\"seu-portfolio.com ou qualquer link\"  \r\n" +
"                          className=\"w-full h-11 pl-14 pr-4 rounded-xl border-2 border-indigo-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 transition-all\"\r\n" +
"                        />\r\n" +
"                      </div>";

if (t.includes(searchString)) {
    t = t.replace(searchString, updatedInputs.replace(/\n/g, '\r\n'));
    fs.writeFileSync(filePath, t, 'utf8');
    console.log('Successfully added removal buttons to social inputs.');
} else {
    // Tentar sem \r para compatibilidade
    const searchStringNoR = searchString.replace(/\r/g, '');
    if (t.includes(searchStringNoR)) {
        t = t.replace(searchStringNoR, updatedInputs);
        fs.writeFileSync(filePath, t, 'utf8');
        console.log('Successfully added removal buttons (no-R mode).');
    } else {
        console.log('Target inputs not found for modification.');
    }
}
