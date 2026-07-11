import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { messages as messagesAPI, interactions as interactionsAPI, applications as applicationsAPI, resumes as resumesAPI } from '@/lib/api';
import { Bot, Bell, MessageSquare, CheckCircle2, X, ChevronDown, ChevronUp, Circle, Lightbulb, Upload, FileText, Star, Calendar, Clock } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// Pequeno assistente para alunos: avisa novas mensagens e respostas das empresas.
// Nome do robô (padrão pode ser personalizado via localStorage 'assistant.name')
const getAssistantName = () => {
  try { return localStorage.getItem('assistant.name') || 'DARA'; } catch { return 'DARA'; }
};

const storageKey = (userId) => `assistant.lastSeenDecisionAt:${userId}`;

export default function StudentAssistant(){
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  
  // Esconder DARA na página de mensagens para não bloquear o input
  const isMessagesPage = location.pathname === '/my-messages' || location.pathname.includes('/messages');
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({ messages: 0, interactions: 0, decisions: 0, interviews: 0 });
  const [latestDecisionAt, setLatestDecisionAt] = useState(null);
  const [assistantName] = useState(getAssistantName());
  const [tab, setTab] = useState('notifications'); // 'notifications' | 'guide'
  const [guideLoading, setGuideLoading] = useState(false);
  const [guide, setGuide] = useState({ steps: [], progress: 0, tip: '' });
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [guideLoaded, setGuideLoaded] = useState(false);
  
  // Drag & position
  const [position, setPosition] = useState({ bottom: 20, right: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, startBottom: 20, startRight: 20 });
  const containerRef = React.useRef(null);

  const total = useMemo(() => (counts.messages + counts.interactions + counts.decisions + counts.interviews), [counts]);

  // Recuperar posição salva no localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dara.position');
      if (saved) {
        const parsed = JSON.parse(saved);
        setPosition(parsed);
      }
    } catch {}
  }, []);

  // Salvar posição no localStorage
  const savePosition = useCallback((newPos) => {
    try {
      localStorage.setItem('dara.position', JSON.stringify(newPos));
    } catch {}
  }, []);

  // Mouse down no botão FAB
  const handleMouseDown = (e) => {
    if (open) return; // Não arrastar se o painel estiver aberto
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startBottom: position.bottom,
      startRight: position.right
    });
    e.preventDefault();
  };

  // Mouse move global
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      let newBottom = dragStart.startBottom - deltaY;
      let newRight = dragStart.startRight - deltaX;

      // Limites da tela (com margem)
      const minPos = 20;
      const maxBottom = window.innerHeight - 70 - minPos;
      const maxRight = window.innerWidth - 70 - minPos;

      newBottom = Math.max(minPos, Math.min(newBottom, maxBottom));
      newRight = Math.max(minPos, Math.min(newRight, maxRight));

      setPosition({ bottom: newBottom, right: newRight });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      savePosition({ bottom: position.bottom, right: position.right });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, position, savePosition]);

  const fetchData = useCallback(async () => {
    if (!user || user.type !== 'candidate') return;
    setLoading(true);
    try {
      // Unread messages
      let msg = 0; let inter = 0; let dec = 0; let interviews = 0; let latest = null;
      try {
        const r = await messagesAPI.getUnreadCount();
        msg = Number(r?.count || 0);
      } catch {}
      // Unread interactions (fallback if available)
      try {
        const r2 = await interactionsAPI.unreadCount();
        inter = Number(r2?.count || 0);
      } catch {}
      // New decisions since last seen
      try {
        const appsResp = await applicationsAPI.list();
        const apps = Array.isArray(appsResp?.applications) ? appsResp.applications : [];
        const lastSeenStr = localStorage.getItem(storageKey(user.id));
        const lastSeen = lastSeenStr ? new Date(lastSeenStr) : null;
        let c = 0; let latestFound = null;
        for (const a of apps) {
          if ((a.status === 'approved' || a.status === 'rejected') && a.decision_at) {
            const d = parseDecisionDate(a.decision_at);
            if (d) {
              if (!latestFound || d > latestFound) latestFound = d;
              if (!lastSeen || d > lastSeen) c += 1;
            }
          }
        }
        dec = c; latest = latestFound;
      } catch {}
      // Pending interviews (to be confirmed)
      try {
        const interviewsResp = await applicationsAPI.listInterviews();
        const upcoming = Array.isArray(interviewsResp?.upcoming) ? interviewsResp.upcoming : [];
        // Count pending interviews (not yet confirmed)
        interviews = upcoming.filter(i => !i.interview_confirmed && i.interview_date).length;
      } catch {}
      setCounts({ messages: msg, interactions: inter, decisions: dec, interviews });
      setLatestDecisionAt(latest ? latest.toISOString() : null);
      setDataLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(()=>{ if (!dataLoaded) fetchData(); }, [fetchData, dataLoaded]);
  // Poll a cada 30s e ao voltar o foco
  useEffect(()=>{
    if (!user || user.type !== 'candidate') return;
    const t = setInterval(fetchData, 30000);
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return ()=>{ clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [user, fetchData]);

  // Carregar dados do guia quando abrir o painel na aba guia
  const loadGuide = useCallback(async () => {
    if (!user || user.type !== 'candidate') return;
    setGuideLoading(true);
    try {
      // Coletas paralelas simples
      const [resumesResp, appsResp, unreadMsgResp, interviewsResp] = await Promise.allSettled([
        resumesAPI.list(),
        applicationsAPI.list(),
        messagesAPI.getUnreadCount(),
        applicationsAPI.listInterviews()
      ]);
      const resumes = resumesResp.status === 'fulfilled' ? (resumesResp.value?.resumes || resumesResp.value || []) : [];
      const apps = appsResp.status === 'fulfilled' ? (appsResp.value?.applications || []) : [];
      const unreadMsgs = unreadMsgResp.status === 'fulfilled' ? Number(unreadMsgResp.value?.count || 0) : 0;
      const interviews = interviewsResp.status === 'fulfilled' ? (interviewsResp.value?.interviews || []) : [];

      // Heurísticas de conclusão
      const hasProfileBasics = Boolean(user?.name) && Boolean(user?.phone);
      const hasResume = Array.isArray(resumes) && resumes.length > 0;
      let hasDefaultResume = false;
      try {
        const def = await resumesAPI.getDefault();
        hasDefaultResume = !!def?.resume?.id;
      } catch { hasDefaultResume = false; }
      const hasApplied = Array.isArray(apps) && apps.length > 0;
      const hasInterview = Array.isArray(interviews) && interviews.length > 0;
      const hasConfirmedInterview = hasInterview && interviews.some(i => i.interview_confirmed);

      const steps = [
        {
          id: 'profile',
          title: 'Complete seu perfil',
          desc: 'Adicione nome e telefone; foto e bio são um plus! Isso ajuda empresas a conhecer você.',
          done: hasProfileBasics,
          action: { label: 'Ir para Perfil', href: '/profile' }
        },
        {
          id: 'resume',
          title: 'Crie seu currículo',
          desc: 'Monte um currículo bonito em minutos — escolha um modelo e personalize.',
          done: hasResume,
          action: { label: hasResume ? 'Ver meus currículos' : 'Criar currículo', href: hasResume ? '/my-resumes' : '/create-resume' }
        },
        {
          id: 'default',
          title: 'Defina um currículo padrão',
          desc: 'Escolha qual currículo será usado por padrão ao se candidatar.',
          done: hasDefaultResume,
          action: { label: 'Escolher currículo padrão', href: '/my-resumes' }
        },
        {
          id: 'jobs',
          title: 'Explore vagas e se candidate',
          desc: 'Encontre oportunidades e envie sua candidatura com um clique.',
          done: hasApplied,
          action: { label: hasApplied ? 'Ver minhas candidaturas' : 'Explorar vagas', href: hasApplied ? '/applications' : '/jobs' }
        },
        {
          id: 'alerts',
          title: 'Ative alertas de vagas',
          desc: 'Receba notificações de novas vagas no seu perfil — não perca oportunidades!',
          done: false,
          action: { label: 'Configurar alertas', href: '/smart-search' }
        },
        {
          id: 'interview',
          title: 'Confirme entrevistas',
          desc: 'Se uma empresa marcar entrevista, confirme presença por aqui.',
          done: hasConfirmedInterview,
          action: { label: 'Ver entrevistas', href: '/dashboard' }
        },
        {
          id: 'chat',
          title: 'Converse com empresas',
          desc: 'Tire dúvidas e acompanhe respostas por mensagem.',
          done: unreadMsgs === 0 && hasApplied, // heurística: se já aplicou e não tem pendências de leitura
          action: { label: 'Abrir mensagens', href: '/my-messages' }
        }
      ];

      const doneCount = steps.filter(s => s.done).length;
      const progress = Math.round((doneCount / steps.length) * 100);

      const tips = [
        'Dica: Foque nos primeiros 2–3 itens do seu currículo — eles são os mais lidos.',
        'Dica: Use um título de currículo claro, ex.: “Desenvolvedor Front-end Júnior”.',
        'Dica: Ajuste seu currículo ao tipo de vaga para aumentar suas chances.',
        'Dica: Mensagens curtas e objetivas geram respostas mais rápidas.',
        'Dica: Não esqueça de revisar ortografia antes de enviar.'
      ];
      const tip = tips[Math.floor(Math.random() * tips.length)];

      setGuide({ steps, progress, tip });
      setGuideLoaded(true);
    } finally {
      setGuideLoading(false);
    }
  }, [user]);

  useEffect(()=>{
    if (open && tab === 'guide' && !guideLoaded) {
      loadGuide();
    }
  }, [open, tab, loadGuide, guideLoaded]);

  // Fechar o painel do robô quando o tour iniciar
  useEffect(() => {
    if (tourActive) setOpen(false);
  }, [tourActive]);

  if (!user || user.type !== 'candidate') return null;

  const markDecisionsSeen = () => {
    // Marca a última decisão conhecida como vista
    if (latestDecisionAt) {
      localStorage.setItem(storageKey(user.id), latestDecisionAt);
      setCounts(prev => ({ ...prev, decisions: 0 }));
    }
  };

  // Não mostrar na página de mensagens
  if (isMessagesPage) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed z-50 select-none flex flex-col items-end transition-all duration-75"
      style={{
        bottom: `${position.bottom}px`,
        right: `${position.right}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      {/* Painel */}
      {open && (
        <div className="mb-3 w-72 max-w-[90vw] rounded-2xl shadow-lg border border-gray-200 bg-white overflow-hidden self-end">
          <div className="px-3 py-2.5 bg-blue-600 text-white flex items-center justify-between rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Bot className="w-4 h-4"/></div>
              <div className="leading-tight">
                <div className="text-xs font-bold">{assistantName}</div>
                <div className="text-[10px] text-blue-100">Seu assistente</div>
              </div>
            </div>
            <button onClick={()=> setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-all duration-300"><X className="w-3.5 h-3.5"/></button>
          </div>
          {/* Tabs */}
          <div className="px-3 pt-3">
            <div className="relative flex bg-gray-100 rounded-xl p-1" role="tablist">
              {/* Slider animado */}
              <div
                className="absolute inset-1 w-[calc(50%-4px)] rounded-xl bg-blue-600 shadow-sm transition-all duration-300 ease-out"
                style={{ 
                  left: tab === 'notifications' ? '4px' : 'calc(50% + 0px)',
                }}
              />
              <button 
                onClick={()=> setTab('notifications')} 
                className={`relative flex-1 text-[11px] px-2 py-2 rounded-xl font-semibold transition-colors duration-200 z-10 ${tab==='notifications' ? 'text-white' : 'text-gray-600 hover:text-blue-600'}`}
                role="tab"
                aria-selected={tab==='notifications'}
              >
                Notificações
              </button>
              <button 
                onClick={()=> setTab('guide')} 
                className={`relative flex-1 text-[11px] px-2 py-2 rounded-xl font-semibold transition-colors duration-200 z-10 ${tab==='guide' ? 'text-white' : 'text-gray-600 hover:text-blue-600'}`}
                role="tab"
                aria-selected={tab==='guide'}
              >
                Guia da DARA
              </button>
            </div>
          </div>
          <div className={`p-3 bg-gray-50 ${tab === 'guide' ? 'rounded-b-2xl' : ''}`}>
            {tab === 'notifications' ? (
              loading ? (
                <div className="text-sm text-gray-600 py-6 text-center">Carregando...</div>
              ) : (
                <div className="space-y-2">
                  {/* Mensagens */}
                  <Link to="/my-messages" className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white hover:bg-blue-50 transition-all duration-200 group">
                    <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-3.5 h-3.5 text-white"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 group-hover:text-blue-600">Mensagens</div>
                      <div className="text-[10px] text-gray-500">{counts.messages > 0 ? `${counts.messages} novas` : 'Sem novas'}</div>
                    </div>
                    {counts.messages > 0 && <BadgePill count={counts.messages}/>}                
                  </Link>

                  {/* Respostas das empresas */}
                  <Link to="/applications" onClick={markDecisionsSeen} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white hover:bg-green-50 transition-all duration-200 group">
                    <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 group-hover:text-green-600">Respostas de candidaturas</div>
                      <div className="text-[10px] text-gray-500">{counts.decisions > 0 ? `${counts.decisions} nova(s)` : 'Sem novas'}</div>
                    </div>
                    {counts.decisions > 0 && <BadgePill count={counts.decisions} color="emerald"/>}
                  </Link>

                  {/* Entrevistas Agendadas */}
                  <Link to="/dashboard" className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white hover:bg-orange-50 transition-all duration-200 group">
                    <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-white"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 group-hover:text-orange-600">Entrevistas Agendadas</div>
                      <div className="text-[10px] text-gray-500">{counts.interviews > 0 ? `${counts.interviews} para confirmar` : 'Nenhuma pendente'}</div>
                    </div>
                    {counts.interviews > 0 && <BadgePill count={counts.interviews} color="orange"/>}
                  </Link>

                  {/* Interações (opcional) */}
                  <Link to="/dashboard" className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white hover:bg-purple-50 transition-all duration-200 group">
                    <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-3.5 h-3.5 text-white"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 group-hover:text-purple-600">Outras notificações</div>
                      <div className="text-[10px] text-gray-500">{counts.interactions > 0 ? `${counts.interactions} novas` : 'Em dia'}</div>
                    </div>
                    {counts.interactions > 0 && <BadgePill count={counts.interactions} color="violet"/>}
                  </Link>
                </div>
              )
            ) : (
              guideLoading ? (
                <div className="text-sm text-gray-600 py-6 text-center">Preparando seu guia...</div>
              ) : (
                <div className="space-y-2">
                  {/* EXACT guide items requested by user */}
                  <div className="pb-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-gray-800">Seu progresso</span>
                      <span className="text-xs font-bold text-blue-600">{guide.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${guide.progress}%` }} />
                    </div>
                  </div>

                  <Link to="/my-resumes" className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white hover:bg-blue-50 transition-all duration-200 group">
                    <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 group-hover:text-blue-600">Currículo adicionado</div>
                      <div className="text-[10px] text-gray-500">Ótimo! Você já tem currículo.</div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </Link>

                  <Link to="/applications" className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white hover:bg-green-50 transition-all duration-200 group">
                    <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 group-hover:text-green-600">Primeira candidatura</div>
                      <div className="text-[10px] text-gray-500">Excelente! Continue aplicando.</div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </Link>

                  <Link to="/candidate-journey" className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white hover:bg-amber-50 transition-all duration-200 group">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-3.5 h-3.5 text-white"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 group-hover:text-amber-600">Jornada do candidato</div>
                      <div className="text-[10px] text-gray-500">Progresso: 0%</div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              )
            )}
          </div>
          {tab === 'notifications' && (
            <div className="px-3 pb-2.5 flex justify-end border-t border-gray-100 pt-2">
              <button onClick={fetchData} className="flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-700 font-semibold">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Atualizar
              </button>
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        aria-label="Assistente de notificações"
        onClick={()=> setOpen(o=>!o)}
        onMouseDown={handleMouseDown}
        className="relative h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all duration-300 hover:shadow-xl active:shadow-md"
        style={{ cursor: open ? 'default' : isDragging ? 'grabbing' : 'grab' }}
      >
        <Bot className="w-6 h-6"/>
        {total > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-[11px] flex items-center justify-center border-2 border-white font-bold">
            {total > 9 ? '9+' : total}
          </span>
        )}
        <span className="sr-only">{assistantName}</span>
      </button>
    </div>
  );
}

function BadgePill({ count, color='indigo' }){
  const map = {
    indigo: 'bg-blue-100 text-blue-700 border border-blue-200',
    emerald: 'bg-green-100 text-green-700 border border-green-200',
    violet: 'bg-purple-100 text-purple-700 border border-purple-200',
    orange: 'bg-orange-100 text-orange-700 border border-orange-200'
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${map[color] || map.indigo}`}>{count > 99 ? '99+' : count}</span>
  );
}

function parseDecisionDate(s){
  if(!s) return null;
  const cleaned = String(s).replace('T',' ').trim();
  const m = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if(!m) return new Date(s);
  const [,Y,M,D,H,Min,Sec] = m;
  return new Date(Number(Y), Number(M)-1, Number(D), Number(H), Number(Min), Number(Sec||0));
}

// Simple Tour overlay component
// useNavigate and useLocation already imported at the top

function TourOverlay({ stepIndex, onClose, onFinish, onRequestStepChange }){
  const navigate = useNavigate();
  const location = useLocation();
  const [rect, setRect] = React.useState(null);
  const [currentEl, setCurrentEl] = React.useState(null);
  const [waitState, setWaitState] = React.useState({ waiting: false, message: '' });
  const popRef = React.useRef(null);
  const [popPos, setPopPos] = React.useState({ left: 12, top: 12, place: 'bottom' });

  const steps = React.useMemo(() => ([
    { id: 'dashboard', route: '/dashboard', selector: '[data-tour="dashboard"]', title: 'Dashboard', desc: 'Seu painel principal com atalhos e status.' },
    { id: 'qa.section', route: '/dashboard', selector: '[data-tour="qa.section"]', title: 'Ações Rápidas', desc: 'Atalhos para ir direto ao que importa.' },
    { id: 'qa.createResume', route: '/dashboard', selector: '[data-tour="qa.createResume"]', title: 'Criar Currículo', desc: 'Monte seu currículo profissional em minutos.' },
    { id: 'resume.form', route: '/create-resume', selector: '[data-tour="resume.form"]', title: 'Montando seu currículo', desc: 'Preencha o título, escolha um template e adicione suas informações.' },
    { id: 'resume.noexp', route: '/create-resume', selector: '[data-tour="resume.noexp"]', title: 'Sem experiência?', desc: 'Marque se você ainda não tem experiência profissional.' },
    { id: 'resume.preview', route: '/create-resume', selector: '[data-tour="resume.preview"]', title: 'Prévia em tempo real', desc: 'Veja como seu currículo está ficando antes de salvar.' },
    { id: 'resume.save', route: '/create-resume', selector: '[data-tour="resume.save"]', title: 'Salvar currículo', desc: 'Quando terminar, clique em Salvar para usar nas candidaturas.' },
    { id: 'qa.profile', route: '/dashboard', selector: '[data-tour="qa.profile"]', title: 'Meu Perfil', desc: 'Clique aqui para abrir seu perfil e o painel “Seu Progresso”.' },
    { id: 'profile.progress', route: '/profile', selector: '[data-tour="profile.progress"]', title: 'Seu Progresso', desc: 'Aqui você acompanha a conclusão do seu perfil e as próximas ações recomendadas.' },
    { id: 'jobs.types', route: '/jobs', selector: '[data-tour="jobs.types"]', title: 'Tipos de vagas', desc: 'Veja os tipos de vagas com exemplos visuais.' }
  ]), []);

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;

  // Navigate to route when needed
  React.useEffect(() => {
    if (!step) return;
    const wants = step.route;
    const isWildcard = wants.endsWith('/*');
    const base = isWildcard ? wants.slice(0, -2) : wants;
    const onRoute = isWildcard ? location.pathname.startsWith(base) : (location.pathname === wants);
    if (!onRoute) {
      setWaitState({ waiting: true, message: 'Indo para a página correta…' });
      navigate(isWildcard ? base : wants);
    }
  }, [stepIndex, step, navigate, location.pathname]);

  // Wait for element to appear and highlight
  React.useEffect(() => {
    if (!step) return;
    let tries = 0;
    let raf;
    const find = () => {
      const el = step.selector ? document.querySelector(step.selector) : null;
      if (el) {
        setCurrentEl(el);
        const r = el.getBoundingClientRect();
        setRect(r);
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
        setWaitState({ waiting: false, message: '' });
      } else if (tries < 180) { // wait up to ~3s for heavy pages
        tries += 1;
        raf = requestAnimationFrame(find);
      } else {
        setCurrentEl(null);
        setRect(null);
        setWaitState({ waiting: false, message: '' });
      }
    };
    setWaitState({ waiting: true, message: 'Preparando passo do tour…' });
    raf = requestAnimationFrame(find);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [stepIndex, step, location.pathname]);

  // Track scroll/resize to keep highlight aligned and reposition popover
  React.useEffect(() => {
    if (!currentEl) return;
    let frame;
    const update = () => {
      const r = currentEl.getBoundingClientRect();
      setRect(r);
      // Compute popover placement with clamping
      const preferredW = step?.id === 'jobs.types' ? 380 : (step?.id === 'apply.choose' ? 420 : 340);
      const bubbleW = Math.min(preferredW, window.innerWidth - 16);
      const bubbleH = popRef.current ? popRef.current.offsetHeight : 160;
      const gap = 12;
      const canPlaceBottom = r.bottom + gap + bubbleH <= window.innerHeight - 8;
      const place = canPlaceBottom ? 'bottom' : 'top';
      const top = place === 'bottom' ? (r.bottom + gap) : Math.max(8, r.top - gap - bubbleH);
      // Center horizontally under the target (better for small chips like "Tipos de vagas")
      const centerX = r.left + (r.width / 2);
      const desiredLeft = Math.max(8, Math.min(window.innerWidth - bubbleW - 8, centerX - (bubbleW / 2)));
      setPopPos({ left: desiredLeft, top, place });
    };
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    const onResize = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [currentEl]);

  const goPrev = () => onRequestStepChange(Math.max(0, stepIndex - 1));
  const goNext = () => {
    // Aciona automaticamente o clique em "Candidatar-se" para abrir o modal antes do próximo passo
    if (step?.id === 'job.apply') {
      try {
        const btn = document.querySelector('[data-tour="job.apply"]');
        if (btn) btn.click();
      } catch {}
    }
    // Abra a vaga automaticamente ao avançar do botão "Ver Vaga"
    if (step?.id === 'jobs.viewButton') {
      try {
        const btn = document.querySelector('[data-tour="jobs.viewButton"]');
        if (btn) btn.click();
      } catch {}
    }
    // Ao avançar da opção de criar currículo, navegue automaticamente
    if (step?.id === 'apply.createLink') {
      try {
        const link = document.querySelector('[data-tour="apply.createResume"]');
        if (link) link.click();
      } catch {}
    }
    onRequestStepChange(Math.min(steps.length - 1, stepIndex + 1));
  };

  // Garantir que o modal esteja aberto ao entrar na etapa de escolha
  React.useEffect(() => {
    if (step?.id === 'apply.uploadTab' || step?.id === 'apply.createLink') {
      const exists = document.querySelector('[data-tour="apply.createResume"], [data-tour="apply.uploadResume"]');
      if (!exists) {
        try {
          const btn = document.querySelector('[data-tour="job.apply"]');
          if (btn) btn.click();
        } catch {}
      }
    }
  }, [step?.id]);

  return (
    <div className="fixed inset-0 z-60">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {currentEl && rect ? (
        <>
          <div style={{ position: 'fixed', left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16, borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)', pointerEvents: 'none', border: '2px solid rgba(99,102,241,0.9)' }} />
          <div ref={popRef} style={{ position: 'fixed', left: popPos.left, top: popPos.top, width: Math.min(step?.id === 'jobs.types' ? 380 : 340, window.innerWidth - 16), background: 'white', borderRadius: 12, padding: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
            {/* Pointer arrow */}
            {(() => {
              const bubbleW = Math.min(step?.id === 'jobs.types' ? 380 : 340, window.innerWidth - 16);
              const targetCenter = rect.left + rect.width / 2;
              const arrowLeft = Math.max(10, Math.min(bubbleW - 10, targetCenter - popPos.left));
              if (popPos.place === 'top') {
                return <div style={{ position: 'absolute', left: arrowLeft - 6, bottom: -6, width: 12, height: 12, background: 'white', transform: 'rotate(45deg)', borderLeft: '1px solid rgba(203,213,225,1)', borderBottom: '1px solid rgba(203,213,225,1)' }} />;
              }
              return <div style={{ position: 'absolute', left: arrowLeft - 6, top: -6, width: 12, height: 12, background: 'white', transform: 'rotate(45deg)', borderTop: '1px solid rgba(203,213,225,1)', borderRight: '1px solid rgba(203,213,225,1)' }} />;
            })()}
            <div className="text-sm font-semibold text-gray-900">{step.title}</div>
            <div className="text-xs text-gray-600 mt-1 whitespace-pre-line">{step.desc}</div>
            {/* Exemplos visuais para Tipos de vagas */}
            {step.id === 'jobs.types' && (
              <div className="mt-3 space-y-2">
                <ExampleRow label="Vaga normal (Interna)" badgeClass="bg-blue-100 text-blue-800 border-blue-200" badgeText="Interna" />
                <ExampleRow label="Destaque da Empresa" badgeClass="bg-blue-50 text-blue-800 border-blue-200" badgeText="Destaque da Empresa" />
                <ExampleRow label="Destaque da Escola" badgeClass="bg-amber-50 text-amber-800 border-amber-200" badgeText="Destaque da Escola" />
                <ExampleRow label="Vaga da Comunidade" badgeClass="bg-emerald-50 text-emerald-800 border-emerald-200" badgeText="Comunidade" />
                <ExampleRow label="Vaga Externa (fora do site)" badgeClass="bg-indigo-50 text-indigo-800 border-indigo-200" badgeText="Externa" />
              </div>
            )}
            {/* Dicas compactas para cada escolha */}
            {step.id === 'apply.uploadTab' && (
              <div className="mt-2 text-[11px] text-blue-900">
                Dica: depois de escolher o arquivo, você confirma a candidatura no botão “Confirmar Candidatura”.
              </div>
            )}
            {step.id === 'apply.createLink' && (
              <div className="mt-2 text-[11px] text-amber-900">
                Dica: criar um currículo editável aumenta suas chances, pois você pode personalizar para cada vaga.
              </div>
            )}
            {/* Final criativo ao chegar no criador de currículo */}
            {step.id === 'apply.finishCreate' && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="w-4 h-4"/></div>
                  Pronto para brilhar
                </div>
                <div className="mt-1 text-[12px] text-emerald-900">
                  Preencha seu currículo com calma. Ao salvar, volte para a vaga e confirme a candidatura.
                </div>
                <div className="mt-3 flex justify-end">
                  <button onClick={onFinish} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Finalizar tour</button>
                </div>
              </div>
            )}
            <div className="mt-3 flex justify-between">
              <div className="flex items-center gap-2">
                <button onClick={goPrev} className="text-xs text-gray-600 px-2 py-1 rounded bg-gray-100">Anterior</button>
                {!isLast ? <button onClick={goNext} className="text-xs text-white px-2 py-1 rounded bg-indigo-600">Próximo</button> : <button onClick={onFinish} className="text-xs text-white px-2 py-1 rounded bg-emerald-600">Finalizar</button>}
              </div>
              <button onClick={onClose} className="text-xs text-gray-500">Pular</button>
            </div>
          </div>
          {/* Always-visible bottom controller as fallback */}
          <div className="fixed bottom-4 right-4 z-[100000] flex gap-2">
            <button onClick={goPrev} className="px-2 py-1 rounded-md text-xs bg-white/90 shadow border border-gray-200 text-gray-700">Anterior</button>
            {!isLast ? (
              <button onClick={goNext} className="px-2 py-1 rounded-md text-xs bg-indigo-600 text-white shadow">Próximo</button>
            ) : (
              <button onClick={onFinish} className="px-2 py-1 rounded-md text-xs bg-emerald-600 text-white shadow">Finalizar</button>
            )}
          </div>
        </>
      ) : (
        <div style={{ position: 'absolute', left: '50%', top: '20%', transform: 'translateX(-50%)', width: 340, background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
          <div className="text-sm font-semibold text-gray-900">{step?.title || 'Tour'}</div>
          <div className="text-xs text-gray-600 mt-1">{waitState.waiting ? waitState.message : (step?.desc || 'Mostrando a parte do site')}</div>
          {/* Quando não houver cards visíveis, mostre exemplos sintéticos */}
          {step?.id === 'jobs.firstCard' && !currentEl && (
            <div className="mt-3">
              <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                <div className="text-sm font-semibold text-gray-900">Exemplo: Designer Jr.</div>
                <div className="text-[11px] text-gray-600">Empresa Exemplo • São Paulo/SP</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 border border-blue-200">Interna</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-800 border border-amber-200">Destaque da Escola</span>
                </div>
                <div className="mt-3">
                  <button className="text-xs px-2 py-1 rounded bg-indigo-600 text-white">Abrir vaga (exemplo)</button>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-gray-600">Sem vagas? Use a busca externa ou volte depois — novas oportunidades chegam sempre.</div>
            </div>
          )}
          <div className="mt-3 flex justify-between">
            <div className="flex items-center gap-2">
              <button onClick={goPrev} className="text-xs text-gray-600 px-2 py-1 rounded bg-gray-100">Anterior</button>
              {!isLast ? <button onClick={goNext} className="text-xs text-white px-2 py-1 rounded bg-indigo-600">Próximo</button> : <button onClick={onFinish} className="text-xs text-white px-2 py-1 rounded bg-emerald-600">Finalizar</button>}
            </div>
            <button onClick={onClose} className="text-xs text-gray-500">Pular</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Linha de exemplo de tipo de vaga no popover do tour
function ExampleRow({ label, badgeText, badgeClass }){
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5">
      <span className="text-[12px] text-gray-800">{label}</span>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>{badgeText}</span>
    </div>
  );
}
