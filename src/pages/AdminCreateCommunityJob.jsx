import React, { useEffect, useMemo, useState } from 'react';
import Tesseract from 'tesseract.js';
import { useNavigate } from 'react-router-dom';
import { jobs as jobsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';

const Input = (props) => <input {...props} className={`w-full border rounded-md p-2 ${props.className||''}`} />;
const Textarea = (props) => <textarea {...props} className={`w-full border rounded-md p-2 min-h-[100px] ${props.className||''}`} />;

const AdminCreateCommunityJob = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.type === 'admin' || user?.isAdmin;

  const [form, setForm] = useState({
    company_name: '',
    title: '',
    area: '',
    subarea: '',
    location: '',
    description: '',
    requirements: '',
    no_experience_required: false,
    salary_type: 'hidden',
    salary_min: '',
    salary_max: '',
    salary_fixed: '',
    contract_type: '',
    experience_level: '',
    work_type: '',
    benefits: '',
    submission: '',
    submissions: [],
    contact: '',
    contacts: []
  });

  // OCR state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [processedPreview, setProcessedPreview] = useState('');
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [pastedText, setPastedText] = useState('');

  // Taxonomia de áreas/subáreas (usada para popular selects)
  const [taxonomy, setTaxonomy] = useState({});
  const [areas, setAreas] = useState([]);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(true);
  const [taxonomyError, setTaxonomyError] = useState('');

  // Label amigável: snake_case -> Title Case (sem acentos)
  const labelize = (s) => (
    s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : ''
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoadingTaxonomy(true);
        const data = await jobsAPI.getTaxonomy();
        if (!active) return;
        const tx = data?.taxonomy || {};
        const ar = data?.areas || Object.keys(tx);
        setTaxonomy(tx);
        setAreas(ar);
        setTaxonomyError('');
      } catch (e) {
        console.error('Falha ao carregar taxonomia:', e);
        setTaxonomyError('Não foi possível carregar áreas e subáreas.');
      } finally {
        if (active) setLoadingTaxonomy(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const subareasForSelectedArea = useMemo(() => {
    if (!form.area) return [];
    const list = taxonomy?.[form.area];
    return Array.isArray(list) ? list : [];
  }, [form.area, taxonomy]);

  if (!isAdmin) {
    return <div className="max-w-3xl mx-auto p-6">Acesso restrito ao administrador.</div>;
  }

  const addSubmission = () => {
    const v = form.submission?.trim();
    if (!v) return;
    setForm(p=>({ ...p, submissions: [...p.submissions, v], submission: '' }));
  };
  const removeSubmission = (idx) => setForm(p=>({ ...p, submissions: p.submissions.filter((_,i)=> i!==idx) }));
  const addContact = () => {
    const v = form.contact?.trim();
    if (!v) return;
    setForm(p=>({ ...p, contacts: [...p.contacts, v], contact: '' }));
  };
  const removeContact = (idx) => setForm(p=>({ ...p, contacts: p.contacts.filter((_,i)=> i!==idx) }));

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'area') {
      // Ao trocar a área, resetar subárea
      setForm((p) => ({ ...p, area: value, subarea: '' }));
      return;
    }
    setForm(p=>({ ...p, [name]: type==='checkbox' ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    // Consolidar itens pendentes digitados (se usuário esqueceu de clicar "Adicionar")
    const pendingSubmission = (form.submission || '').trim();
    const pendingContact = (form.contact || '').trim();
    const submissionsFinal = [...form.submissions];
    const contactsFinal = [...form.contacts];
    if (pendingSubmission) submissionsFinal.push(pendingSubmission);
    if (pendingContact) contactsFinal.push(pendingContact);

    // Validar mínimos
    if (!form.company_name || !form.title || !form.area || !form.location || !form.description || !form.requirements || submissionsFinal.length===0) {
      toast({ title:'Campos obrigatórios', description:'Preencha os campos marcados com * e pelo menos uma forma de envio do currículo.', variant:'destructive' });
      return;
    }
    try {
      const payload = {
        company_name: form.company_name,
        title: form.title,
        area: form.area,
        subarea: form.subarea || undefined,
        location: form.location,
        description: form.description,
        requirements: form.requirements,
        no_experience_required: !!form.no_experience_required,
        salary_type: form.salary_type || 'hidden',
        salary_min: form.salary_type==='range' ? Number(form.salary_min||0) : undefined,
        salary_max: form.salary_type==='range' ? Number(form.salary_max||0) : undefined,
        salary_fixed: form.salary_type==='fixed' ? Number(form.salary_fixed||0) : undefined,
        contract_type: form.contract_type ? String(form.contract_type).toLowerCase() : undefined,
        experience_level: form.experience_level ? String(form.experience_level).toLowerCase() : undefined,
        work_type: form.work_type ? String(form.work_type).toLowerCase() : undefined,
        benefits: form.benefits || undefined,
        submission_methods: submissionsFinal,
        contact_methods: contactsFinal
      };
      const r = await jobsAPI.createCommunity(payload);
      toast({ title:'Vaga criada', description:'A vaga da comunidade foi criada com sucesso.' });
      navigate(`/job/${r.job.id}`);
    } catch (e) {
      toast({ title:'Erro ao criar vaga', description:e.message||'Tente novamente.', variant:'destructive' });
    }
  };

  // Helpers to parse extracted text heuristically (pt-br focus, naive patterns)
  const parseFromText = (raw) => {
    if (!raw) return {};
    // Basic cleanup to reduce OCR artifacts
    const text = raw
      .replace(/\r/g,'')
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
      .replace(/[|¦]+/g, '|')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Lines to help find fields
    const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const lower = text.toLowerCase();

    const out = {};

    // Helpers: email extraction and list cleanup
    const findDomainEnd = (domain) => {
      const endings = ['.com.br','.org.br','.net.br','.edu.br','.gov.br','.mil.br','.ind.br','.com','.org','.net','.edu','.gov','.mil','.br'];
      let best = -1, bestLen = -1;
      for (const end of endings) {
        const idx = domain.toLowerCase().indexOf(end);
        if (idx !== -1) {
          const endIdx = idx + end.length;
          if (best === -1 || endIdx < best) { best = endIdx; bestLen = end.length; }
        }
      }
      return best !== -1 ? best : domain.length;
    };
    const extractEmailsSmart = (t) => {
      const set = new Set();
      const tokens = t.split(/\s+/).filter(x => x.includes('@'));
      for (const tok of tokens) {
        const stripped = tok.replace(/[()<>\[\]{}'",;]+/g, '');
        const at = stripped.indexOf('@');
        if (at <= 0) continue;
        const left = stripped.slice(0, at);
        const right = stripped.slice(at+1);
        const localMatch = left.match(/[A-Z0-9._%+-]+$/i);
        const local = (localMatch ? localMatch[0] : left).replace(/[^A-Z0-9._%+-]/gi,'');
        if (!local) continue;
        const endIdx = findDomainEnd(right);
        const domain = right.slice(0, endIdx).replace(/[^A-Z0-9.-]/gi,'');
        if (!domain.includes('.')) continue;
        const email = `${local}@${domain}`.toLowerCase();
        if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) set.add(email);
      }
      // Fallback broad regex if nothing found
      if (set.size === 0) {
        const broad = Array.from(t.matchAll(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi)).map(m=>m[1].toLowerCase());
        broad.forEach(x => set.add(x));
      }
      return Array.from(set);
    };
    const cleanList = (s) => (s||'')
      .split(/\n+/)
      .map(l => l
        .replace(/^\s*[+•·*]\s*/,'* ')
        .replace(/[)\]»“”]+$/g,'')
        .replace(/\s{2,}/g,' ')
        .trim())
      .filter(l => l && /[a-zA-Zá-úÁ-Ú]/.test(l))
      .join('\n');

    // Company name: try explicit label; else infer from email domain; else first meaningful line
    const companyLine = lines.find(l => /empresa\s*[:\-]/i.test(l));
    if (companyLine) {
      const m = companyLine.match(/empresa\s*[:\-]\s*(.+)/i);
      out.company_name = (m?.[1] || '').slice(0,120);
    }

    // Title: prefer big uppercase lines without digits and not promotional headers
    let titleCandidate = null;
  const uppercaseLines = lines.filter(l => l.length>=10 && /[A-ZÁÉÍÓÚÊÂÔÃÕÇ]/.test(l) && l === l.toUpperCase());
  titleCandidate = uppercaseLines.find(l => !/TEMOS|VAGAS|RESPONSABILIDADES|REQUISITOS|INFORMA/i.test(l)) || null;
    const titleLine = lines.find(l => /(vaga|t[ií]tulo|cargo)\s*[:\-]/i.test(l));
    if (titleLine) {
      const m = titleLine.match(/(?:vaga|t[ií]tulo|cargo)\s*[:\-]\s*(.+)/i);
      out.title = (m?.[1] || '').slice(0,140);
    } else if (titleCandidate) {
      out.title = titleCandidate.slice(0,140);
    } else {
      out.title = out.title || lines[1];
    }

    // Location extraction: support multiple labels and raw patterns
    const normLocation = (s='') => s
      .replace(/[|¦]/g, ' ')
      .replace(/\s{2,}/g,' ')
      .replace(/^[\-:\s]+/, '')
      .replace(/\s*[,;].*$/,'') // stop at trailing punctuation
      .trim()
      .slice(0,140);

    const locLabels = [
      /local\s+de\s+trabalho\s*[:\-]\s*([^\n]+)/i,
      /localiza[cç][aã]o\s*[:\-]\s*([^\n]+)/i,
      /localidade\s*[:\-]\s*([^\n]+)/i,
      /cidade\s*[:\-]\s*([^\n]+)/i,
      /local\s*[:\-]\s*([^\n]+)/i
    ];
    for (const re of locLabels) {
      if (out.location) break;
      const m = text.match(re);
      if (m) out.location = normLocation(m[1]);
    }
    if (!out.location) {
      // raw City/UF like 'Sertaozinho/SP' or 'Sertãozinho - SP'
      const m2 = text.match(/\b([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:[\s\-][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç]+)*?)\s*[\/-]\s*([A-Z]{2})\b/);
      if (m2) out.location = normLocation(`${m2[1]}/${m2[2]}`);
    }
    if (!out.location && /remoto/i.test(text)) out.location = 'Remoto';

    // Experience: "sem experiência", "primeiro emprego", or explicit level
    if (/sem\s+experi[êe]ncia|primeiro\s+emprego/i.test(lower)) {
      out.no_experience_required = true;
    }
    if (/j[úu]nior|junior/i.test(lower)) out.experience_level = 'junior';
    else if (/pleno/i.test(lower)) out.experience_level = 'pleno';
    else if (/s[ée]nior|senior/i.test(lower)) out.experience_level = 'senior';
    else if (/est[áa]gio/i.test(lower)) out.experience_level = 'estagio';

    // Work type: presencial, remoto, híbrido
    if (/presencial/i.test(lower)) out.work_type = 'presencial';
    if (/remoto/i.test(lower)) out.work_type = 'remoto';
    if (/h[ií]brido/i.test(lower)) out.work_type = 'hibrido';

    // Contract type: CLT, PJ, Estágio, Temporário
    if (/\bclt\b/i.test(text)) out.contract_type = 'clt';
    if (/\bpj\b/i.test(text)) out.contract_type = 'pj';
    if (/est[áa]gio/i.test(lower)) out.contract_type = 'estagio';
    if (/tempor[áa]rio/i.test(lower)) out.contract_type = 'temporario';

    // Salary: detect range or fixed
    const salRange = text.match(/(sal[áa]rio|remunera[çc][aã]o).{0,40}?(?:de\s*)?(\d{3,5}[\.,]?\d{0,2}).{0,15}(?:a|\-|\–|\até|\s+at[eé])\s*(\d{3,5}[\.,]?\d{0,2})/i);
    const salFixed = text.match(/(sal[áa]rio|remunera[çc][aã]o).{0,40}?\b(\d{3,6}[\.,]?\d{0,2})\b/i);
    if (salRange) {
      out.salary_type = 'range';
      const toNum = v => Number(String(v).replace(/\./g,'').replace(',', '.'));
      out.salary_min = toNum(salRange[2]);
      out.salary_max = toNum(salRange[3]);
    } else if (salFixed) {
      out.salary_type = 'fixed';
      const toNum = v => Number(String(v).replace(/\./g,'').replace(',', '.'));
      out.salary_fixed = toNum(salFixed[2]);
    } else {
      out.salary_type = 'hidden';
    }

    // Description/Requirements/Benefits: segmentation by known headers
    const descIdx = lower.search(/responsabilidades|descri[cç][aã]o\s*[:\-]?/);
    const reqIdx = lower.search(/requisitos?\s*[:\-]?/);
    const benIdx = lower.search(/informa[cç][oõ]es\s+adicionais|benef[ií]cios?\s*[:\-]?/);
    const end = text.length;
    const slice = (start, stop) => start>=0 ? text.slice(start, (stop>start?stop:end)).replace(/^[^\n]*?:\s*/,'').trim() : '';
    if (descIdx >= 0) {
      const stop = reqIdx >=0 ? reqIdx : (benIdx>=0 ? benIdx : end);
      let desc = slice(descIdx, stop).slice(0, 3000);
      // Remove header words
      desc = desc.replace(/^responsabilidades\s*/i,'').trim();
      out.description = cleanList(desc);
    }
    if (reqIdx >= 0) {
      const stop = benIdx >=0 ? benIdx : end;
      let req = slice(reqIdx, stop).slice(0, 3000);
      req = req.replace(/^requisitos\s*/i,'').trim();
      out.requirements = cleanList(req);
    }
    if (benIdx >= 0) {
      const infoBlock = slice(benIdx, end);
      // Try to isolate only Benefícios line
      const mBen = infoBlock.match(/benef[ií]cios\s*:\s*([^\n]+)/i);
      if (mBen) {
        out.benefits = mBen[1].trim().slice(0, 2000);
      } else {
        // fallback to whole block but stop at contacts cues
        out.benefits = infoBlock.split(/envie\s+seu\s+curr[ií]culo|assunto\s*:/i)[0].trim().slice(0, 2000);
      }
      // Location can also appear here; prefer explicit value
      if (!out.location) {
        const mLoc2 = infoBlock.match(/local\s+de\s+trabalho\s*[:\-]\s*([^\n]+)/i);
        if (mLoc2) out.location = mLoc2[1].trim().slice(0,140);
      }
    }

    // Contacts: e-mails and whatsapp-like numbers
  const emails = extractEmailsSmart(text);
    const phones = Array.from(text.matchAll(/\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[\-\s]?\d{4}\b/g)).map(m=>m[0]);
    // Normalize phones: remove duplicates and format basic
    const normPhones = Array.from(new Set(phones.map(p => {
      const digits = p.replace(/\D/g,'');
      if (digits.length >= 10) {
        const ddd = digits.slice(-11, -9) || digits.slice(0,2);
        const part1 = digits.slice(-9, -4);
        const part2 = digits.slice(-4);
        return `(${ddd}) ${part1}-${part2}`;
      }
      return p;
    })));
    const contacts = [...emails, ...normPhones];
    if (contacts.length) {
      out.submission_methods = contacts.slice(0,3);
      out.contact_methods = contacts.slice(0,3);
    }

    // If company not set, infer from email domain
    if (!out.company_name && emails.length) {
      try {
        const domain = emails[0].split('@')[1] || '';
        const base = domain.split('.')[0] || '';
        if (base) out.company_name = base.toUpperCase();
      } catch {}
    }

    return out;
  };

  const mapAreaGuess = (lowerText) => {
    // Try to guess area by keywords
    const pairs = [
      ['vendas', 'vendas'],
      ['comercial', 'vendas'],
      ['atendente', 'vendas'],
      ['tecnologia', 'tecnologia'],
      ['desenvolvedor', 'tecnologia'],
      ['marketing', 'marketing'],
      ['logistica', 'logistica'],
      ['logística', 'logistica'],
      ['administrativo', 'administrativo'],
      ['financeiro', 'financeiro'],
      ['servi[cç]os gerais', 'servicos_gerais'],
      ['limpeza', 'servicos_gerais'],
      ['manuten[cç][aã]o', 'servicos_gerais']
    ];
    for (const [kw, area] of pairs) {
      if (lowerText.includes(kw)) return area;
    }
    return '';
  };

  const applyParsedToForm = (parsed) => {
    if (!parsed) return;
    // Area must be in taxonomy; fallback guess
    let area = parsed.area || '';
    if (!area) {
      area = mapAreaGuess((extractedText||'').toLowerCase());
    }
    if (area && taxonomy && !taxonomy[area]) {
      // try exact key match by lower
      const found = Object.keys(taxonomy).find(a => a.toLowerCase() === area.toLowerCase());
      if (found) area = found; else area = '';
    }

    setForm(p => ({
      ...p,
      company_name: parsed.company_name || p.company_name,
      title: parsed.title || p.title,
      area: area || p.area,
      // keep subarea empty unless we can map safely
      location: parsed.location || p.location,
      description: parsed.description || p.description,
      requirements: parsed.requirements || p.requirements,
      benefits: parsed.benefits || p.benefits,
      no_experience_required: parsed.no_experience_required ?? p.no_experience_required,
      salary_type: parsed.salary_type || p.salary_type,
      salary_min: parsed.salary_min ?? p.salary_min,
      salary_max: parsed.salary_max ?? p.salary_max,
      salary_fixed: parsed.salary_fixed ?? p.salary_fixed,
      contract_type: parsed.contract_type || p.contract_type,
      experience_level: parsed.experience_level || p.experience_level,
      work_type: parsed.work_type || p.work_type,
      submissions: parsed.submission_methods?.length ? Array.from(new Set([...(p.submissions||[]), ...parsed.submission_methods])) : p.submissions,
      contacts: parsed.contact_methods?.length ? Array.from(new Set([...(p.contacts||[]), ...parsed.contact_methods])) : p.contacts
    }));
  };

  const runOcr = async () => {
    if (!imageFile) {
      toast({ title:'Selecione uma imagem', description:'Envie uma imagem com a vaga (screenshot/foto nítida).', variant:'destructive' });
      return;
    }
    setOcrRunning(true);
    setOcrProgress(0);
    setExtractedText('');
    try {
      const toRecognize = processedPreview || imagePreview || URL.createObjectURL(imageFile);
      const { data } = await Tesseract.recognize(toRecognize, 'por+eng', {
        logger: (m) => {
          if (m.progress != null) {
            setOcrProgress(Math.max(0, Math.round(m.progress * 100)));
          }
        },
        preserve_interword_spaces: '1',
        tessedit_pageseg_mode: '4',
        user_defined_dpi: '300'
      });
      const text = data?.text || '';
      setExtractedText(text);
      const parsed = parseFromText(text);
      applyParsedToForm(parsed);
      toast({ title:'Texto extraído', description:'Campos preenchidos automaticamente. Revise antes de publicar.' });
    } catch (e) {
      console.error('OCR error', e);
      toast({ title:'Falha no OCR', description:e.message || 'Não foi possível ler o texto da imagem.', variant:'destructive' });
    } finally {
      setOcrRunning(false);
    }
  };

  const preprocessImage = async (file) => {
    // Resize, grayscale and binarize to improve OCR
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1600;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * (scale || 1));
        const h = Math.round(img.height * (scale || 1));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const d = imageData.data;
        // grayscale + contrast + threshold
        const contrast = 1.2; // 20% boost
        // compute mean luminance for simple adaptive threshold
        let sum = 0;
        for (let i=0;i<d.length;i+=4){
          const lum = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
          sum += lum;
        }
        const mean = sum / (d.length/4);
        const thresh = mean * 0.95; // slightly below mean
        for (let i=0;i<d.length;i+=4){
          let lum = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
          lum = ((lum - 128)*contrast) + 128;
          const v = lum > thresh ? 255 : 0;
          d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
        }
        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const onImageChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    const url = URL.createObjectURL(f);
    setImagePreview(url);
    try {
      const processed = await preprocessImage(f);
      setProcessedPreview(processed);
    } catch {}
  };

  const runTextAutofill = () => {
    const t = (pastedText || '').trim();
    if (!t) {
      toast({ title: 'Cole o texto da vaga', description: 'Insira o conteúdo e clique em Preencher pelo texto.', variant: 'destructive' });
      return;
    }
    try {
      const parsed = parseFromText(t);
      applyParsedToForm(parsed);
      setExtractedText(t); // opcional: permite inspecionar o texto colado
      toast({ title: 'Campos preenchidos', description: 'Preenchido a partir do texto. Revise antes de publicar.' });
    } catch (e) {
      toast({ title: 'Falha ao processar', description: e.message || 'Não foi possível interpretar o texto.', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Cadastrar Vaga da Comunidade (Admin)</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dados da vaga</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Ingestão por imagem (OCR) e por texto colado */}
          <div className="mb-6 border rounded-md p-3 bg-gray-50">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="font-medium">Preencher a partir de uma imagem</div>
                <p className="text-sm text-gray-600">Envie um print/foto da vaga. Vamos ler o texto e preencher os campos automaticamente. Você pode revisar e editar antes de publicar.</p>
                <input type="file" accept="image/*" onChange={onImageChange} />
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="mt-2 max-h-48 rounded border" />
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Button type="button" onClick={runOcr} disabled={ocrRunning}>
                    {ocrRunning ? `Lendo imagem… ${ocrProgress}%` : 'Ler imagem e preencher'}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-medium">Preencher a partir de um texto</div>
                <p className="text-sm text-gray-600">Cole aqui o conteúdo da vaga (copiado do site/anúncio) e clique para preencher automaticamente.</p>
                <textarea
                  value={pastedText}
                  onChange={(e)=> setPastedText(e.target.value)}
                  className="w-full border rounded-md p-2 min-h-[120px]"
                  placeholder="Cole o texto da vaga aqui..."
                />
                <div className="flex items-center gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={runTextAutofill}>Preencher pelo texto</Button>
                  {extractedText && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-gray-700">Ver texto usado</summary>
                      <pre className="whitespace-pre-wrap bg-white border rounded p-2 max-h-48 overflow-auto mt-1 text-gray-800">{extractedText}</pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nome da empresa *</label>
                <Input name="company_name" value={form.company_name} onChange={onChange} placeholder="Ex.: Padaria do Bairro" />
              </div>
              <div>
                <label className="text-sm font-medium">Título da Vaga *</label>
                <Input name="title" value={form.title} onChange={onChange} placeholder="Ex.: Atendente de Loja" />
              </div>
              <div>
                <label className="text-sm font-medium">Área *</label>
                {loadingTaxonomy ? (
                  <select className="w-full border rounded-md p-2" disabled>
                    <option>Carregando...</option>
                  </select>
                ) : taxonomyError ? (
                  // Fallback para input caso a taxonomia falhe
                  <Input name="area" value={form.area} onChange={onChange} placeholder="Ex.: vendas, tecnologia, direito..." />
                ) : (
                  <select name="area" value={form.area} onChange={onChange} className="w-full border rounded-md p-2" required>
                    <option value="">-- Selecione --</option>
                    {areas.map((a) => (
                      <option key={a} value={a}>{labelize(a)}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Sub-área</label>
                {loadingTaxonomy ? (
                  <select className="w-full border rounded-md p-2" disabled>
                    <option>Carregando...</option>
                  </select>
                ) : taxonomyError ? (
                  <Input name="subarea" value={form.subarea} onChange={onChange} placeholder="Opcional" />
                ) : (
                  <select name="subarea" value={form.subarea} onChange={onChange} className="w-full border rounded-md p-2" disabled={!form.area}>
                    <option value="">-- Selecione --</option>
                    {subareasForSelectedArea.map((sa) => (
                      <option key={sa} value={sa}>{labelize(sa)}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Localização *</label>
                <Input name="location" value={form.location} onChange={onChange} placeholder="Cidade / Bairro / Remoto" />
              </div>
              <div>
                <label className="text-sm font-medium">Aceita primeiro emprego</label>
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" name="no_experience_required" checked={form.no_experience_required} onChange={onChange} />
                  <span className="text-sm text-gray-600">Não exige experiência</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Tipo de Salário</label>
                <select name="salary_type" value={form.salary_type} onChange={onChange} className="w-full border rounded-md p-2">
                  <option value="hidden">Valor não informado</option>
                  <option value="range">Faixa (mín-máx)</option>
                  <option value="fixed">Fixo</option>
                </select>
              </div>
              {form.salary_type==='range' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">Faixa mínima</label>
                    <Input name="salary_min" type="number" value={form.salary_min} onChange={onChange} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Faixa máxima</label>
                    <Input name="salary_max" type="number" value={form.salary_max} onChange={onChange} />
                  </div>
                </div>
              )}
              {form.salary_type==='fixed' && (
                <div>
                  <label className="text-sm font-medium">Valor fixo</label>
                  <Input name="salary_fixed" type="number" value={form.salary_fixed} onChange={onChange} />
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Tipo de Contrato (opcional)</label>
                <select name="contract_type" value={form.contract_type} onChange={onChange} className="w-full border rounded-md p-2">
                  <option value="">-- Selecione --</option>
                  <option value="clt">CLT</option>
                  <option value="pj">PJ</option>
                  <option value="estagio">Estágio</option>
                  <option value="temporario">Temporário</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Nível de Experiência (opcional)</label>
                <select name="experience_level" value={form.experience_level} onChange={onChange} className="w-full border rounded-md p-2">
                  <option value="">-- Selecione --</option>
                  <option value="junior">Junior</option>
                  <option value="pleno">Pleno</option>
                  <option value="senior">Sênior</option>
                  <option value="estagio">Estágio</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Modalidade (opcional)</label>
                <select name="work_type" value={form.work_type} onChange={onChange} className="w-full border rounded-md p-2">
                  <option value="">-- Selecione --</option>
                  <option value="presencial">Presencial</option>
                  <option value="remoto">Remoto</option>
                  <option value="hibrido">Híbrido</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Descrição da Vaga *</label>
              <Textarea name="description" value={form.description} onChange={onChange} />
            </div>
            <div>
              <label className="text-sm font-medium">Requisitos *</label>
              <Textarea name="requirements" value={form.requirements} onChange={onChange} />
            </div>
            <div>
              <label className="text-sm font-medium">Benefícios (opcional)</label>
              <Textarea name="benefits" value={form.benefits} onChange={onChange} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Formas de envio do currículo *</label>
                <div className="flex gap-2 mt-1">
                  <Input name="submission" value={form.submission} onChange={onChange} placeholder="WhatsApp (número) ou E-mail" onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); addSubmission(); } }} />
                  <Button type="button" onClick={addSubmission}>Adicionar</Button>
                </div>
                <ul className="mt-2 text-sm space-y-1">
                  {form.submissions.map((s, idx)=>(
                    <li key={idx} className="flex items-center justify-between border rounded p-2">
                      <span>{s}</span>
                      <button type="button" onClick={()=> removeSubmission(idx)} className="text-red-600 text-xs">remover</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <label className="text-sm font-medium">Formas de contato da empresa (opcional)</label>
                <div className="flex gap-2 mt-1">
                  <Input name="contact" value={form.contact} onChange={onChange} placeholder="WhatsApp (número) ou E-mail" onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); addContact(); } }} />
                  <Button type="button" onClick={addContact}>Adicionar</Button>
                </div>
                <ul className="mt-2 text-sm space-y-1">
                  {form.contacts.map((s, idx)=>(
                    <li key={idx} className="flex items-center justify-between border rounded p-2">
                      <span>{s}</span>
                      <button type="button" onClick={()=> removeContact(idx)} className="text-red-600 text-xs">remover</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={()=> navigate(-1)}>Cancelar</Button>
              <Button type="submit">Publicar vaga</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCreateCommunityJob;
