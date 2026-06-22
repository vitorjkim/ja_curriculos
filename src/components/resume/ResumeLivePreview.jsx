import React from 'react';
import { Mail, Phone, Calendar, User, GraduationCap, Briefcase, Award, Layers, Lightbulb, MapPin, Linkedin, Github, Globe } from 'lucide-react';

const TEMPLATES = {
  default: {
    page: 'bg-[#0d1117] text-gray-200',
    card: 'bg-[#161b22] border border-[#30363d] rounded-2xl',
    divider: 'border-[#30363d]',
    title: 'text-amber-400',
  },
  modern: {
    page: 'bg-gradient-to-b from-white via-blue-50 to-indigo-50 text-slate-800',
    card: 'bg-white/80 backdrop-blur border border-black/5 rounded-2xl shadow-md',
    divider: 'border-black/10',
    title: 'text-teal-600',
  },
  classic: {
    page: 'bg-stone-100 text-stone-800',
    card: 'bg-stone-50 border border-stone-200 rounded-xl shadow',
    divider: 'border-stone-200',
    title: 'text-stone-800',
  },
  minimal: {
    page: 'bg-white text-black',
    card: 'bg-white border border-gray-200 rounded-lg',
    divider: 'border-gray-200',
    title: 'text-black',
  },
  professional: {
    page: 'bg-slate-50/80 text-slate-800',
    card: 'bg-white/95 backdrop-blur-sm border-2 border-slate-200 rounded-[24px] shadow-[0_16px_40px_rgba(15,23,42,0.06)]',
    divider: 'border-slate-100',
    title: 'text-slate-900',
    isProfessional: true,
  },
  colorful: {
    page: 'bg-gradient-to-br from-slate-50 via-white to-blue-50/40 text-slate-800',
    card: 'bg-white border border-slate-200 rounded-2xl shadow-sm',
    divider: 'border-slate-100',
    title: 'text-slate-800',
  }
};

const DEFAULT_SECTION_ACCENTS = {
  area: 'teal',
  education: 'blue',
  experience: 'orange',
  projects: 'purple',
  courses: 'green',
  languages: 'yellow',
};

const ACCENT_STYLES_LIGHT = {
  blue: {
    title: 'text-blue-600',
    icon: 'text-blue-500',
    divider: 'border-blue-100',
    label: 'text-blue-600',
    marker: 'marker:text-blue-500',
    pill: 'border border-sky-100 bg-sky-50/60 text-sky-700',
  },
  teal: {
    title: 'text-teal-600',
    icon: 'text-teal-500',
    divider: 'border-teal-100',
    label: 'text-teal-600',
    marker: 'marker:text-teal-500',
    pill: 'border border-cyan-100 bg-cyan-50/60 text-cyan-700',
  },
  orange: {
    title: 'text-orange-600',
    icon: 'text-orange-500',
    divider: 'border-orange-100',
    label: 'text-orange-600',
    marker: 'marker:text-orange-500',
    pill: 'border border-amber-100 bg-amber-50/60 text-amber-700',
  },
  red: {
    title: 'text-red-600',
    icon: 'text-red-500',
    divider: 'border-red-100',
    label: 'text-red-600',
    marker: 'marker:text-red-500',
    pill: 'border border-rose-100 bg-rose-50/60 text-rose-700',
  },
  purple: {
    title: 'text-purple-600',
    icon: 'text-purple-500',
    divider: 'border-purple-100',
    label: 'text-purple-600',
    marker: 'marker:text-purple-500',
    pill: 'border border-violet-100 bg-violet-50/60 text-violet-700',
  },
  green: {
    title: 'text-emerald-600',
    icon: 'text-emerald-500',
    divider: 'border-emerald-100',
    label: 'text-emerald-600',
    marker: 'marker:text-emerald-500',
    pill: 'border border-emerald-100 bg-emerald-50/60 text-emerald-700',
  },
  gray: {
    title: 'text-gray-600',
    icon: 'text-gray-500',
    divider: 'border-gray-200',
    label: 'text-gray-600',
    marker: 'marker:text-gray-500',
    pill: 'border border-slate-200 bg-slate-50 text-slate-700',
  },
  yellow: {
    title: 'text-amber-600',
    icon: 'text-amber-500',
    divider: 'border-amber-100',
    label: 'text-amber-600',
    marker: 'marker:text-amber-500',
    pill: 'border border-amber-100 bg-amber-50/60 text-amber-700',
  },
  default: {
    title: 'text-gray-600',
    icon: 'text-gray-500',
    divider: 'border-gray-200',
    label: 'text-gray-600',
    marker: 'marker:text-gray-500',
    pill: 'border border-slate-200 bg-slate-50 text-slate-700',
  },
};

const ACCENT_STYLES_DARK = {
  blue: {
    title: 'text-[#58a6ff]',
    icon: 'text-[#58a6ff]',
    divider: 'border-[#1f6feb]/40',
    label: 'text-[#58a6ff]',
    marker: 'marker:text-[#58a6ff]',
  },
  teal: {
    title: 'text-teal-300',
    icon: 'text-teal-300',
    divider: 'border-teal-500/40',
    label: 'text-teal-300',
    marker: 'marker:text-teal-300',
  },
  orange: {
    title: 'text-orange-300',
    icon: 'text-orange-300',
    divider: 'border-orange-500/40',
    label: 'text-orange-300',
    marker: 'marker:text-orange-300',
  },
  red: {
    title: 'text-red-300',
    icon: 'text-red-300',
    divider: 'border-red-500/40',
    label: 'text-red-300',
    marker: 'marker:text-red-300',
  },
  purple: {
    title: 'text-purple-300',
    icon: 'text-purple-300',
    divider: 'border-purple-500/40',
    label: 'text-purple-300',
    marker: 'marker:text-purple-300',
  },
  green: {
    title: 'text-emerald-300',
    icon: 'text-emerald-300',
    divider: 'border-emerald-500/40',
    label: 'text-emerald-300',
    marker: 'marker:text-emerald-300',
  },
  gray: {
    title: 'text-gray-300',
    icon: 'text-gray-300',
    divider: 'border-gray-600/50',
    label: 'text-gray-300',
    marker: 'marker:text-gray-400',
  },
  yellow: {
    title: 'text-amber-300',
    icon: 'text-amber-300',
    divider: 'border-amber-500/40',
    label: 'text-amber-300',
    marker: 'marker:text-amber-300',
  },
  default: {
    title: 'text-gray-200',
    icon: 'text-gray-200',
    divider: 'border-[#30363d]',
    label: 'text-gray-200',
    marker: 'marker:text-gray-200',
  },
};

const resolveAccentKey = (accents, section) => {
  if (accents && typeof accents[section] === 'string') {
    return accents[section];
  }
  return DEFAULT_SECTION_ACCENTS[section] || 'gray';
};

const pickAccentStyles = (visual, accentKey) => {
  // In the classic template, keep a neutral, stone-based style (no bright accent colors)
  if (visual === 'classic') {
    return {
      title: 'text-stone-800',
      icon: 'text-stone-700',
      divider: 'border-stone-200',
      label: 'text-stone-700',
      marker: 'marker:text-stone-500',
    };
  }
  const palette = visual === 'default' ? ACCENT_STYLES_DARK : ACCENT_STYLES_LIGHT;
  return palette[accentKey] || palette.default;
};

const Section = ({ icon: Icon, title, children, visual, size, accent }) => {
  const s = TEMPLATES[visual] || TEMPLATES.default;
  const accentStyles = accent || {};
  const isProfessional = s.isProfessional;
  
  return (
    <div className={`${s.card} ${size==='compact'?'p-2.5':'p-5 md:p-6'}`}>
      <div className={`flex items-center gap-2 ${size==='compact'?'pb-2 mb-2':'pb-4 mb-4'} ${isProfessional ? '' : `border-b ${accentStyles.divider || s.divider}`}`}>
        {isProfessional ? (
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-medium ${accentStyles.pill || 'border border-slate-200 bg-slate-50 text-slate-700'}`}>
            <Icon className={`${size==='compact'?'w-3 h-3':'w-4 h-4'}`} />
            <span>{title}</span>
          </div>
        ) : (
          <>
            <Icon className={`${size==='compact'?'w-3.5 h-3.5':'w-5 h-5'} ${accentStyles.icon || ''}`} />
            <h3 className={`font-bold ${size==='compact'?'text-xs':'text-base'} ${accentStyles.title || s.title}`}>{title}</h3>
          </>
        )}
      </div>
      {children}
    </div>
  );
};

const Line = ({ label, value, size, accent }) => (
  <div className={`flex items-center gap-1.5 ${size==='compact'?'text-[11px]':'text-sm'}`}>
    <span className={`font-semibold ${size==='compact'?'min-w-[80px]':'min-w-[120px]'} ${accent?.label || ''}`}>{label}:</span>
    <span className="flex-1 break-words">{value || '—'}</span>
  </div>
);

const ResumeLivePreview = ({ data, visual = 'default', size, accents }) => {
  const s = TEMPLATES[visual] || TEMPLATES.default;
  const isProfessional = s.isProfessional;
  const ageText = data?.age ? `${data.age} anos` : '';
  const accentFor = (section) => pickAccentStyles(visual, resolveAccentKey(accents, section));
  const areaAccent = accentFor('area');
  const educationAccent = accentFor('education');
  const experienceAccent = accentFor('experience');
  const coursesAccent = accentFor('courses');
  const projectsAccent = accentFor('projects');
  const languagesAccent = accentFor('languages');
  // Header icon colorization: only for 'default' (dark) and 'modern' (light). Others stay neutral.
  const headerIconColor = visual === 'default'
    ? 'text-[#58a6ff]'
    : (visual === 'modern' || visual === 'professional' || visual === 'colorful' ? 'text-sky-600' : 'opacity-70');
  const headerIconCls = `${size==='compact'?'w-3 h-3':'w-4 h-4'} ${headerIconColor}`;
  return (
    <div className={`${size==='compact'?'p-3':'p-6'} ${s.page}`}>
      <div className="max-w-[780px] mx-auto space-y-4">
        {/* Header */}
        <div className={`${s.card} ${size==='compact'?'p-2.5':'p-6 md:p-8'} ${isProfessional ? 'relative overflow-hidden' : ''}`}>
          {isProfessional && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500"></div>
          )}
          <div className={`flex items-start ${size==='compact'?'gap-2.5':'gap-5'} ${isProfessional ? 'pt-3' : ''}`}>
            <div className="flex-shrink-0">
              <div className={`${size==='compact'?'w-14 h-14':'w-24 h-24 md:w-28 md:h-28'} ${data?.photoShape==='square'?'rounded-2xl':'rounded-full'} overflow-hidden border-2 ${isProfessional ? 'border-slate-200 shadow-xl' : (visual==='default'?'border-[#30363d]':'border-black/10')} bg-white flex items-center justify-center`}>
                {data?.photo ? (
                  <img src={data.photo} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <User className={`${size==='compact'?'w-7 h-7':'w-12 h-12'} opacity-40 text-slate-400`} />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`${size==='compact'?'text-base font-semibold':'text-2xl md:text-3xl font-bold tracking-tight'} truncate ${isProfessional ? 'text-slate-900' : ''}`}>{data?.name || 'Seu nome aqui'}</h2>
              <div className={`mt-3 flex flex-wrap gap-2 ${size==='compact'?'text-[11px]':'text-sm'}`}>
                <div className={`flex items-center gap-1.5 ${isProfessional ? 'border border-sky-100 bg-sky-50/60 text-sky-700 rounded-full px-3 py-1.5' : ''}`}><Mail className={headerIconCls} /><span className="break-words truncate">{data?.email || 'email@exemplo.com'}</span></div>
                <div className={`flex items-center gap-1.5 ${isProfessional ? 'border border-sky-100 bg-sky-50/60 text-sky-700 rounded-full px-3 py-1.5' : ''}`}><Phone className={headerIconCls} /><span className="truncate">{data?.phone || '(00) 00000-0000'}</span></div>
                <div className={`flex items-center gap-1.5 ${isProfessional ? 'border border-slate-200 bg-slate-50/60 text-slate-700 rounded-full px-3 py-1.5' : ''}`}><Calendar className={headerIconCls} /><span className="truncate">{ageText || 'Idade'}</span></div>
                {(data?.city || data?.address) && (
                  <div className={`flex items-center gap-1.5 ${isProfessional ? 'border border-slate-200 bg-slate-50/60 text-slate-700 rounded-full px-3 py-1.5' : ''}`}>
                    <MapPin className={headerIconCls} />
                    <span className="break-words whitespace-normal">
                      {data?.city || ''}{data?.city && data?.address ? ' • ' : ''}{data?.address || ''}
                    </span>
                  </div>
                )}
                {data?.linkedin_url && (
                  <a href={data.linkedin_url.startsWith('http') ? data.linkedin_url : `https://${data.linkedin_url}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 ${isProfessional ? 'border border-blue-100 bg-blue-50/60 text-blue-700 rounded-full px-3 py-1.5' : ''}`}>
                    <Linkedin className={headerIconCls} /><span className="truncate">{data.linkedin_url.replace(/^https?:\/\//,'')}</span>
                  </a>
                )}
                {data?.github_url && (
                  <a href={data.github_url.startsWith('http') ? data.github_url : `https://${data.github_url}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 ${isProfessional ? 'border border-slate-200 bg-slate-50/60 text-slate-700 rounded-full px-3 py-1.5' : ''}`}>
                    <Github className={headerIconCls} /><span className="truncate">{data.github_url.replace(/^https?:\/\//,'')}</span>
                  </a>
                )}
                {data?.custom_url && (
                  <a href={data.custom_url.startsWith('http') ? data.custom_url : `https://${data.custom_url}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 ${isProfessional ? 'border border-emerald-100 bg-emerald-50/60 text-emerald-700 rounded-full px-3 py-1.5' : ''}`}>
                    <Globe className={headerIconCls} /><span className="truncate">{data.custom_url.replace(/^https?:\/\//,'')}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`space-y-${size==='compact'?'2':'4'}`}>
          {/* Área de atuação */}
          <Section visual={visual} icon={Layers} title="Área de Atuação" size={size} accent={areaAccent}>
            <div className={`space-y-1 ${size==='compact'?'text-[11px]':'text-sm'}`}>
              <Line label="Área" value={data?.area || 'Selecione a área no formulário'} size={size} accent={areaAccent} />
              <Line label="Sub-área" value={data?.subarea || '—'} size={size} accent={areaAccent} />
            </div>
          </Section>

          {/* Educação */}
          <Section visual={visual} icon={GraduationCap} title="Educação" size={size} accent={educationAccent}>
            {Array.isArray(data?.education) && data.education.length > 0 ? (
              data.education.map((e, i) => (
                <div key={i} className={`${size==='compact'?'text-[11px] py-1':'text-sm py-1.5'}`}>
                  <div className={`font-semibold ${educationAccent.label || ''}`}>{e.course || 'Curso'}</div>
                  <div className="opacity-80">{e.school || 'Instituição'}{e.period ? ` • ${e.period}` : ''}</div>
                </div>
              ))
            ) : typeof data?.education === 'string' && data.education.trim() ? (
              <p className={`${size==='compact'?'text-[11px]':'text-sm'} leading-relaxed whitespace-pre-line`}>{data.education.trim()}</p>
            ) : (
              [{ school:'Escola/Instituição', course:'Curso', period:'Período' }].map((e, i) => (
                <div key={i} className={`${size==='compact'?'text-[11px] py-1':'text-sm py-1.5'}`}>
                  <div className={`font-semibold ${educationAccent.label || ''}`}>{e.course}</div>
                  <div className="opacity-80">{e.school}{e.period ? ` • ${e.period}` : ''}</div>
                </div>
              ))
            )}
          </Section>

          {/* Experiência */}
          {data?.experiences && data.experiences.length > 0 && (
            <Section visual={visual} icon={Briefcase} title="Experiência" size={size} accent={experienceAccent}>
              {data.experiences.map((xp,i)=> (
                <div key={i} className={`${size==='compact'?'text-[11px] py-1':'text-sm py-1.5'}`}>
                  <div className={`font-semibold ${experienceAccent.label || ''}`}>{xp.position || 'Cargo'}</div>
                  <div className="opacity-80">{xp.company || 'Empresa'}{xp.period ? ` • ${xp.period}` : ''}</div>
                  {xp.description && <div className="mt-1 whitespace-pre-wrap break-words opacity-90 line-clamp-2">{xp.description}</div>}
                </div>
              ))}
            </Section>
          )}

          {/* Cursos */}
          <Section visual={visual} icon={Award} title="Cursos" size={size} accent={coursesAccent}>
            <ul className={`list-disc ${size==='compact'?'pl-3 text-[11px]':'pl-5 text-sm'} ${coursesAccent.marker || ''}`}>
              {(data?.courses?.length ? data.courses : [{ name:'Curso (ex.: Excel)', institution:'Instituição', year:'' }]).map((c,i)=> (
                <li key={i}>
                  <span className={`font-semibold ${coursesAccent.label || ''}`}>{c.name || c.title || 'Curso'}</span>
                  {c.institution?` – ${c.institution}`:''}{c.year?` • ${c.year}`:''}{c.period?` • ${c.period}`:''}
                </li>
              ))}
            </ul>
          </Section>

          {/* Projetos e Atividades Extracurriculares */}
          <Section visual={visual} icon={Lightbulb} title="Projetos e Atividades Extracurriculares" size={size} accent={projectsAccent}>
            <div className={`space-y-${size==='compact'?'1':'2'}`}>
              {(data?.projects?.length ? data.projects : [{ title:'Projeto', period:'2025', description:'Descrição breve do projeto, tecnologias e resultado.' }]).map((p,i)=> (
                <div key={i} className={`${size==='compact'?'text-[11px]':'text-sm'}`}>
                  <div className={`font-semibold ${projectsAccent.label || ''}`}>
                    {(p.title || 'Projeto')}{p.period ? ` • ${p.period}` : ''}
                  </div>
                  {p.description && <div className={`whitespace-pre-wrap break-words opacity-90 ${size==='compact'?'line-clamp-2':'line-clamp-3'}`}>{p.description}</div>}
                </div>
              ))}
            </div>
          </Section>

          {/* Idiomas (simplificado) */}
          {data?.languages && data.languages.length>0 && (
            <Section visual={visual} icon={Layers} title="Idiomas" size={size} accent={languagesAccent}>
              <ul className={`list-disc ${size==='compact'?'pl-3 text-[11px]':'pl-5 text-sm'} ${languagesAccent.marker || ''}`}>
                {data.languages.map((l,i)=> (
                  <li key={i}>
                    <span className={`font-semibold ${languagesAccent.label || ''}`}>{l.language || 'Idioma'}</span>
                    {l.level?` – ${l.level}`:''}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeLivePreview;
