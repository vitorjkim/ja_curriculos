import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Download, Mail, Phone, Calendar, GraduationCap, Briefcase, Award, Globe, User, MapPin, Layers, Lightbulb, Linkedin, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '@/contexts/AuthContext';
import { resumes } from '@/lib/api';
import ResumeScoreCard from '@/components/resume/ResumeScoreCard';

// Helpers to parse and format birthdate and age
const parseBirthdate = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  // Try ISO: YYYY-MM-DD
  let m = s.match(/^\d{4}-\d{2}-\d{2}$/);
  if (m) {
    const d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }
  // Try DD/MM/YYYY
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  // Fallback Date parse (last resort)
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const formatDateBR = (d) => {
  if (!(d instanceof Date)) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const diffYears = (d) => {
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
};

const getBirthdateInfo = (personal) => {
  const raw = personal?.birthdate || personal?.birthDate || personal?.birthday || personal?.date_of_birth || personal?.data_nascimento || personal?.nascimento;
  const bd = parseBirthdate(raw);
  if (!bd) return null;
  return { date: formatDateBR(bd), age: diffYears(bd) };
};

// Deep search helpers for City/Address when keys are unknown or nested
const normalizeKey = (k) => (k || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
const deepFindStringByKeys = (obj, keyList, maxDepth = 3) => {
  const targets = keyList.map(normalizeKey);
  const seen = new Set();
  const dfs = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > maxDepth || seen.has(node)) return undefined;
    seen.add(node);
    for (const [rawKey, val] of Object.entries(node)) {
      const nk = normalizeKey(rawKey);
      if (targets.includes(nk)) {
        if (typeof val === 'string' && val.trim()) return val.trim();
        if (typeof val === 'number') return String(val);
      }
    }
    for (const [rawKey, val] of Object.entries(node)) {
      if (val && typeof val === 'object') {
        const found = dfs(val, depth + 1);
        if (found) return found;
      } else if (Array.isArray(val)) {
        for (const item of val) {
          const found = dfs(item, depth + 1);
          if (found) return found;
        }
      }
    }
    return undefined;
  };
  return dfs(obj, 0);
};

const findCityAddress = (personal, resumeAll, userObj) => {
  const pick = (...vals) => vals.find(v => typeof v === 'string' && v.trim().length > 0)?.trim();
  const cityKeys = ['city','cidade','municipio','city_name','cityname','town','localidade','location_city','location','locality'];
  const streetKeys = ['address','endereco','logradouro','rua','street','address_line','addressline','address_line1','address1','address_text','address_full','endereco_completo','full_address','location_address'];
  const numberKeys = ['number','numero','house_number'];
  const complementKeys = ['complement','complemento','compl','apartment','apt','bloco','block'];
  const neighborhoodKeys = ['neighborhood','bairro','district'];

  const city = pick(
    deepFindStringByKeys(personal, cityKeys),
    deepFindStringByKeys(resumeAll, cityKeys),
    deepFindStringByKeys(userObj, cityKeys)
  );
  const street = pick(
    deepFindStringByKeys(personal, streetKeys),
    deepFindStringByKeys(resumeAll, streetKeys),
    deepFindStringByKeys(userObj, streetKeys)
  );
  const number = pick(
    deepFindStringByKeys(personal, numberKeys),
    deepFindStringByKeys(resumeAll, numberKeys),
    deepFindStringByKeys(userObj, numberKeys)
  );
  const complement = pick(
    deepFindStringByKeys(personal, complementKeys),
    deepFindStringByKeys(resumeAll, complementKeys),
    deepFindStringByKeys(userObj, complementKeys)
  );
  const neighborhood = pick(
    deepFindStringByKeys(personal, neighborhoodKeys),
    deepFindStringByKeys(resumeAll, neighborhoodKeys),
    deepFindStringByKeys(userObj, neighborhoodKeys)
  );

  const address = street ? [number ? `${street}, ${number}` : street, complement, neighborhood].filter(Boolean).join(', ') : undefined;

  // Debug in console to help discover keys when missing
  if (!(city || address)) {
    try {
      // eslint-disable-next-line no-console
      console.log('[ViewResume] Nenhuma cidade/endereço encontrado. personal_info keys:', Object.keys(personal || {}), 'resume keys:', Object.keys(resumeAll || {}), 'user keys:', Object.keys(userObj || {}));
    } catch {}
  }
  return { city, address };
};

const Header = ({ personal, visual, resumeAll, userObj }) => {
  const isDark = visual === 'moderno';
  const isColorful = visual === 'colorido';
  const iconColor = isDark ? '#58a6ff' : '#2563eb';
  const birth = getBirthdateInfo(personal);
  const { city, address } = findCityAddress(personal, resumeAll, userObj);
  const rowCls = 'flex items-center gap-2';
  const locRowCls = 'flex items-start gap-2';
  const iconCls = 'w-4 h-4 shrink-0 translate-y-[1px]';
  return (
    <div className={isDark ? 'bg-[#161b22] border border-[#30363d] rounded-2xl p-6' : isColorful ? 'bg-white border-[3px] border-indigo-300 rounded-[24px] overflow-hidden' : 'bg-white border border-black/5 rounded-2xl shadow-md p-6'}>
      {isColorful && (
        <div className="bg-indigo-50/70 border-b-[3px] border-indigo-300 px-6 py-3 flex items-center gap-2 rounded-t-[22px]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 border-2 border-indigo-300 flex items-center justify-center text-indigo-600">
            <User className="w-4.5 h-4.5 stroke-[2.5]" />
          </div>
          <span className="font-semibold text-base text-indigo-900">Informações Pessoais</span>
        </div>
      )}
      <div className={`flex items-start gap-4 ${isColorful ? 'p-6' : ''}`}>
        <div className="flex-shrink-0">
          {personal?.photo ? (
            <img src={personal.photo} alt={`Foto de ${personal.name}`} className={`w-24 h-24 md:w-28 md:h-28 ${personal?.photoShape === 'square' ? 'rounded-md' : 'rounded-full'} object-cover ${isDark ? 'border border-[#30363d]' : isColorful ? 'border-2 border-indigo-200' : 'border border-black/5'}`} />
          ) : (
            <div className={`w-24 h-24 md:w-28 md:h-28 ${isDark ? 'bg-white/10 border border-[#30363d] text-gray-300' : isColorful ? 'bg-indigo-50/50 border-2 border-indigo-200 text-indigo-400' : 'bg-gray-100 border border-black/5 text-gray-500'} rounded-full flex items-center justify-center`}>
              <User className="w-10 h-10 md:w-12 md:h-12" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className={`${isDark ? 'text-amber-400' : 'text-gray-900'} text-3xl md:text-4xl font-bold mb-4 md:mb-6 break-words`}>{personal?.name || 'Nome não informado'}</h1>
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm leading-5 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            <div className={rowCls}><Mail className={iconCls} style={{color: iconColor}} /><span className="break-words">{personal?.email || 'Email não informado'}</span></div>
            <div className={rowCls}><Phone className={iconCls} style={{color: iconColor}} /><span className="break-words">{personal?.phone || 'Telefone não informado'}</span></div>
            <div className={rowCls}><Calendar className={iconCls} style={{color: iconColor}} />
              <span className="break-words">
                {birth ? `${birth.date} • ${birth.age} anos` : (personal?.age ? `${personal.age} anos` : 'Idade não informada')}
              </span>
            </div>
            {(city || address) && (
              <div className={`${locRowCls} md:col-span-2`}>
                <MapPin className={iconCls} style={{color: iconColor}} />
                <span className="break-words whitespace-normal">{city || ''}{city && address ? ' • ' : ''}{address || ''}</span>
              </div>
            )}
            {personal?.linkedin_url && (
              <div className={rowCls}>
                <Linkedin className={iconCls} style={{color: '#0a66c2'}} />
                <a href={personal.linkedin_url.startsWith('http') ? personal.linkedin_url : `https://${personal.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="break-words text-blue-600 hover:underline">{personal.linkedin_url.replace(/^https?:\/\//,'')}</a>
              </div>
            )}
            {personal?.github_url && (
              <div className={rowCls}>
                <Github className={iconCls} style={{color: isDark ? '#e6edf3' : '#24292f'}} />
                <a href={personal.github_url.startsWith('http') ? personal.github_url : `https://${personal.github_url}`} target="_blank" rel="noopener noreferrer" className={`break-words hover:underline ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{personal.github_url.replace(/^https?:\/\//,'')}</a>
              </div>
            )}
            {personal?.custom_url && (
              <div className={rowCls}>
                <Globe className={iconCls} style={{color: '#059669'}} />
                <a href={personal.custom_url.startsWith('http') ? personal.custom_url : `https://${personal.custom_url}`} target="_blank" rel="noopener noreferrer" className="break-words text-emerald-600 hover:underline">{personal.custom_url.replace(/^https?:\/\//,'')}</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Sections = ({ resume, visual }) => {
  const isDark = visual === 'moderno';
  const isColorful = visual === 'colorido';
  const accents = isDark
    ? {
        area: { title:'text-teal-300', icon:'text-teal-300', divider:'border-teal-500/40', card:'bg-[#161b22] border border-[#30363d]' },
        education: { title:'text-[#58a6ff]', icon:'text-[#58a6ff]', divider:'border-[#1f6feb]/40', card:'bg-[#161b22] border border-[#30363d]' },
        experience: { title:'text-orange-300', icon:'text-orange-300', divider:'border-orange-500/40', card:'bg-[#161b22] border border-[#30363d]' },
        courses: { title:'text-purple-300', icon:'text-purple-300', divider:'border-purple-500/40', card:'bg-[#161b22] border border-[#30363d]' },
        projects: { title:'text-red-300', icon:'text-red-300', divider:'border-red-500/40', card:'bg-[#161b22] border border-[#30363d]' },
        languages: { title:'text-emerald-300', icon:'text-emerald-300', divider:'border-emerald-500/40', card:'bg-[#161b22] border border-[#30363d]' },
      }
    : isColorful
    ? {
        area: { title:'text-teal-900', icon:'text-teal-600', divider:'border-b-[3px] border-teal-300', headerBg:'bg-teal-50/70', card:'bg-white border-[3px] border-teal-300' },
        education: { title:'text-blue-900', icon:'text-blue-600', divider:'border-b-[3px] border-blue-300', headerBg:'bg-blue-50/70', card:'bg-white border-[3px] border-blue-300' },
        experience: { title:'text-violet-900', icon:'text-violet-600', divider:'border-b-[3px] border-violet-300', headerBg:'bg-violet-50/70', card:'bg-white border-[3px] border-violet-300' },
        courses: { title:'text-amber-900', icon:'text-amber-600', divider:'border-b-[3px] border-amber-300', headerBg:'bg-amber-50/70', card:'bg-white border-[3px] border-amber-300' },
        projects: { title:'text-rose-900', icon:'text-rose-600', divider:'border-b-[3px] border-rose-300', headerBg:'bg-rose-50/70', card:'bg-white border-[3px] border-rose-300' },
        languages: { title:'text-emerald-900', icon:'text-emerald-600', divider:'border-b-[3px] border-emerald-300', headerBg:'bg-emerald-50/70', card:'bg-white border-[3px] border-emerald-300' },
      }
    : {
        area: { title:'text-teal-600', icon:'text-teal-500', divider:'border-teal-100', card:'bg-white border border-black/5 shadow-md' },
        education: { title:'text-blue-600', icon:'text-blue-500', divider:'border-blue-100', card:'bg-white border border-black/5 shadow-md' },
        experience: { title:'text-orange-600', icon:'text-orange-500', divider:'border-orange-100', card:'bg-white border border-black/5 shadow-md' },
        courses: { title:'text-purple-600', icon:'text-purple-500', divider:'border-purple-100', card:'bg-white border border-black/5 shadow-md' },
        projects: { title:'text-red-600', icon:'text-red-500', divider:'border-red-100', card:'bg-white border border-black/5 shadow-md' },
        languages: { title:'text-emerald-600', icon:'text-emerald-500', divider:'border-emerald-100', card:'bg-white border border-black/5 shadow-md' },
      };

  const SectionCard = ({ icon:Icon, title, accentKey, children }) => {
    const a = accents[accentKey] || accents.education;
    return (
      <section className={`${a.card} rounded-[24px] overflow-hidden`}>
        <div className={`flex items-center gap-2 px-5 py-3 ${isColorful ? `${a.headerBg || ''} ${a.divider}` : `border-b ${a.divider}`}`}>
          {isColorful ? (
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-white/80 to-white/40 border-2 flex items-center justify-center ${a.icon}`}>
              <Icon className="w-4.5 h-4.5 stroke-[2.5]" />
            </div>
          ) : (
            <Icon className={`w-5 h-5 ${a.icon}`} />
          )}
          <h2 className={`font-semibold text-base ${a.title}`}>{title}</h2>
        </div>
        <div className="px-5 py-4">
          {children}
        </div>
      </section>
    );
  };

  return (
    <main className="space-y-4">
      {(resume.area || resume.subarea) && (
        <SectionCard icon={Layers} title="Área de Atuação" accentKey="area">
          <div className="text-sm space-y-1">
            <div><span className="font-semibold">Área: </span><span>{resume.area || '—'}</span></div>
            <div><span className="font-semibold">Sub-área: </span><span>{resume.subarea || '—'}</span></div>
          </div>
        </SectionCard>
      )}

      {resume.education && (
        <SectionCard icon={GraduationCap} title="Educação" accentKey="education">
          <div className="space-y-2">
            {Array.isArray(resume.education) ? resume.education.map((edu, index) => {
              const course = edu.course || edu.degree || 'Curso';
              const school = edu.school || edu.institution || 'Instituição';
              const period = edu.period || edu.year || '';
              return (
                <div key={index} className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  <div className="font-semibold">{course}</div>
                  <div className="opacity-80">{school}{period ? ` • ${period}` : ''}</div>
                  {edu.description && <div className="mt-1 opacity-90 whitespace-pre-wrap break-words">{edu.description}</div>}
                </div>
              );
            }) : (
              <p className={`text-sm whitespace-pre-line ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{typeof resume.education === 'string' ? resume.education : ''}</p>
            )}
          </div>
        </SectionCard>
      )}

      {resume.experience && resume.experience.length > 0 && (
        <SectionCard icon={Briefcase} title="Experiência" accentKey="experience">
          <div className="space-y-2">
            {resume.experience.map((exp, index) => (
              <div key={index} className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                <div className="font-semibold">{exp.position || 'Cargo'}</div>
                <div className="opacity-80">{exp.company || 'Empresa'}{exp.period ? ` • ${exp.period}` : ''}</div>
                {exp.description && <div className="mt-1 opacity-90 whitespace-pre-wrap break-words">{exp.description}</div>}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {resume.courses && resume.courses.length > 0 && (
        <SectionCard icon={Award} title="Cursos" accentKey="courses">
          <ul className={`list-disc pl-5 text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            {resume.courses.map((course, index) => (
              <li key={index} className="mb-1">
                <span className="font-semibold">{course.name || course.title || 'Curso'}</span>
                {course.institution ? ` – ${course.institution}` : ''}
                {course.year ? ` • ${course.year}` : ''}
                {course.period ? ` • ${course.period}` : ''}
                {course.description && (<div className="mt-1 opacity-90 whitespace-pre-wrap break-words">{course.description}</div>)}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {resume.projects && resume.projects.length > 0 && (
        <SectionCard icon={Lightbulb} title="Projetos e Atividades Extracurriculares" accentKey="projects">
          <div className="space-y-2">
            {resume.projects.map((p, i) => (
              <div key={i} className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                <div className="font-semibold">{(p.title || 'Projeto')}{p.period ? ` • ${p.period}` : ''}</div>
                {p.description && <div className="opacity-90 whitespace-pre-wrap break-words mt-1">{p.description}</div>}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {resume.languages && resume.languages.length > 0 && (
        <SectionCard icon={Globe} title="Idiomas" accentKey="languages">
          <ul className={`list-disc pl-5 text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            {resume.languages.filter(l => l.language).map((l, i) => (
              <li key={i}><span className="font-semibold">{l.language}</span>{l.level ? ` – ${l.level}` : ''}</li>
            ))}
          </ul>
        </SectionCard>
      )}
    </main>
  );
};

const ViewResume = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('padrao');
  const [isInternalFixedTemplate, setIsInternalFixedTemplate] = useState(false);
  const resumeRef = useRef();

  const mapResume = (r) => ({
    area: r?.area || r?.personal_info?.area,
    subarea: r?.subarea || r?.personal_info?.subarea,
    education: r?.education,
    experience: r?.experience,
    courses: r?.courses,
    projects: r?.projects,
    languages: r?.languages,
  });

  const handleDownloadPDF = async () => {
    if (!resumeRef.current) return;
    try {
      // Toast de progresso para feedback imediato
  toast({ title: 'Gerando PDF...', description: 'Estamos preparando seu arquivo. Isso pode levar alguns segundos.', duration: 2500, variant: 'info' });
      const pdfBg = selectedTemplate === 'moderno' ? '#0d1117' : selectedTemplate === 'colorido' ? null : '#ffffff';
      const canvas = await html2canvas(resumeRef.current, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: pdfBg, logging: false, onclone: (doc)=>{ doc.querySelectorAll('.no-print').forEach(el=> el.style.display='none'); } });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; const pageHeight = 295; const imgHeight = (canvas.height * imgWidth) / canvas.width; let heightLeft = imgHeight; let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight); heightLeft -= pageHeight;
      while (heightLeft >= 0) { position = heightLeft - imgHeight; pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight); heightLeft -= pageHeight; }
      const fileName = `curriculo-${resume.personal_info?.name?.replace(/\s+/g, '-').toLowerCase() || 'curriculo'}.pdf`;
  pdf.save(fileName); toast({ title: 'Sucesso!', description: 'PDF baixado com sucesso!', variant: 'success' });
    } catch (error) {
  console.error('Erro ao gerar PDF:', error);
  toast({ title: 'Erro', description: 'Erro ao gerar PDF. Tente novamente.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    const fetchResume = async () => {
      try {
        setLoading(true);
        // Tenta buscar sem token primeiro (para visualização pública)
        let data;
        try {
          const response = await resumes.getById(id);
          data = response.resume || response;
        } catch (error) {
          // Se falhar, tenta com token (para o dono ou empresa)
          if (error.response && error.response.status === 401 && localStorage.getItem('curriculoja_token')) {
            console.log('Acesso público falhou, tentando com token...');
            const response = await resumes.getById(id, true); // Passa `true` para forçar o uso do token
            data = response.resume || response;
          } else {
            throw error; // Se não for 401 ou não tiver token, relança o erro
          }
        }

        setResume(data);
        const isUploaded = !!data.original_file_path || data.template === 'uploaded';
        if (!isUploaded) {
          const map = { 'default':'padrao','padrao':'padrao','moderno':'moderno','modern':'moderno','classico':'classico','classic':'classico','minimal':'minimalista','minimalista':'minimalista','colorful':'colorido','colorido':'colorido' };
          setSelectedTemplate(map[data.template] || 'padrao');
          setIsInternalFixedTemplate(true);
        } else {
          setIsInternalFixedTemplate(false);
          setSelectedTemplate('padrao');
        }
      } catch (error) {
        console.error('Erro ao buscar currículo:', error);
        toast({ title: 'Erro ao carregar currículo', description: 'Não foi possível carregar o currículo. Verifique sua conexão ou se o servidor está ativo.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchResume();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando currículo...</p>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl border border-black/5 shadow-md overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                {/* Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2zM14 3.5 18.5 8H14V3.5zM8 11h8v1.5H8V11zm0 4h8v1.5H8V15z"/></svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Currículo não encontrado</h2>
              <p className="text-gray-600 mb-6">O currículo que você procura não existe, foi removido ou está privado.</p>
              <div className="flex items-center justify-center gap-3">
                <Link to="/search-jobs">
                  <Button className="bg-white text-gray-700 border border-black/10 hover:bg-gray-50 rounded-2xl px-5">Explorar vagas</Button>
                </Link>
                <Link to="/dashboard">
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl px-6">Voltar ao Dashboard</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const userType = user?.type || user?.role;
  const isOwner = user && resume.user_id && String(resume.user_id) === String(user.id);
  const isPrivileged = ['admin','company','school'].includes(userType || '');
  if (user && resume.user_id && !isOwner && !isPrivileged) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Acesso Negado</h2>
              <p className="text-gray-600 mb-4">Você não tem permissão para visualizar este currículo.</p>
              <p className="text-xs text-gray-400 mb-4">Debug: User ID: {user?.id} | Resume User ID: {resume.user_id} | Type: {userType}</p>
              <Link to="/dashboard"><Button>Voltar ao Dashboard</Button></Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{resume?.personal_info?.name || resume?.title || 'Currículo'} - CurriculoJá</title>
        <meta name="description" content={`Visualize o currículo profissional de ${resume?.personal_info?.name || resume?.title || 'candidato'}.`} />
      </Helmet>

      <div className="min-h-screen py-8 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex justify-between items-center mb-8 no-print">
              <h1 className="text-3xl font-bold">Visualizar <span className="gradient-text">Currículo</span></h1>
              <Button onClick={handleDownloadPDF} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-3">
                <Download className="w-5 h-5 mr-2" />
                Baixar PDF
              </Button>
            </div>

            {/* AI Resume Score Card - exibir quando há análise disponível */}
            <div className="mb-8 no-print">
              <ResumeScoreCard 
                resumeId={id}
                initialAnalysis={resume.ai_analysis
                  ? (typeof resume.ai_analysis === 'string' ? JSON.parse(resume.ai_analysis) : resume.ai_analysis)
                  : null
                }
              />
            </div>

            {!isInternalFixedTemplate && (
              <div className="mb-6 no-print">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Escolha um Template:</h3>
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: 'padrao', label: 'Padrão', color: 'bg-blue-500' },
                    { key: 'moderno', label: 'Moderno', color: 'bg-purple-500' },
                    { key: 'classico', label: 'Clássico', color: 'bg-gray-600' },
                    { key: 'minimalista', label: 'Minimalista', color: 'bg-green-500' }
                  ].map((template) => (
                    <button key={template.key} onClick={() => setSelectedTemplate(template.key)} className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${selectedTemplate === template.key ? `${template.color} text-white shadow-lg transform scale-105` : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={resumeRef}>
              {selectedTemplate === 'moderno' ? (
                <div className="bg-[#0d1117] text-gray-200 rounded-2xl overflow-hidden">
                  <div className="p-8">
                    <Header personal={resume.personal_info} visual="moderno" resumeAll={resume} userObj={user} />
                    <div className="mt-6"><Sections resume={mapResume(resume)} visual="moderno" /></div>
                  </div>
                </div>
              ) : selectedTemplate === 'colorido' ? (
                <div className="bg-white text-slate-800 rounded-2xl overflow-hidden border-[3px] border-slate-200">
                  <div className="p-8">
                    <Header personal={resume.personal_info} visual="colorido" resumeAll={resume} userObj={user} />
                    <div className="mt-6"><Sections resume={mapResume(resume)} visual="colorido" /></div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-md">
                  <div className="p-8">
                    <Header personal={resume.personal_info} visual="padrao" resumeAll={resume} userObj={user} />
                    <div className="mt-6"><Sections resume={mapResume(resume)} visual="padrao" /></div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default ViewResume;