import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, Building2, LogOut, FileText, Search, Zap, Users, UserPlus, MessageSquare, Home, BookOpen, ClipboardList, GraduationCap, PlusCircle, LayoutPanelLeft, Orbit } from 'lucide-react';
import { interactionsAPI, chatAPI, applications as applicationsAPI, resumesAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Logo from './Logo';
import MessageIndicator from './MessageIndicator';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState(null);
  const [avatarShape, setAvatarShape] = useState('circle');
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout, isCompany, isAdmin, isSchool, updateUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [interviewsCount, setInterviewsCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [newApplicationsCount, setNewApplicationsCount] = useState(0);
  const [newPreApprovedCount, setNewPreApprovedCount] = useState(0);
  const [hasResumes, setHasResumes] = useState(true); // Assume true inicialmente para não piscar
  const navigate = useNavigate();
  const location = useLocation();
  
  // Verificar se estamos na página de empresas
  const isOnCompanyPage = location.pathname === '/company-landing' || location.pathname.includes('/company');
  
  // Detectar scroll para tornar navbar transparente
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Helper para cache-busting em URLs http(s)
  const cacheBust = (url) => {
    try {
      if (!url || typeof url !== 'string') return url;
      if (!/^https?:\/\//i.test(url)) return url;
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}v=${Date.now()}`;
    } catch { return url; }
  };

  // Carregar avatar do usuário - APENAS do backend (fonte única)
  useEffect(() => {
    if (user) {
      // Usar APENAS o avatar do backend
      const backendAvatar = user.profileImage || user.profile_image || null;
      const avatarWithCacheBust = backendAvatar ? cacheBust(backendAvatar) : null;
      
      // Atualizar sempre que o user mudar
      setUserAvatar(avatarWithCacheBust);

      // Ler preferência de forma do avatar
      try {
        if (user.type === 'company') {
          const key = `company_avatar_shape_${user.id}`;
          setAvatarShape(localStorage.getItem(key) || 'square');
        } else {
          // Forçar círculo para alunos/escolas
          setAvatarShape('circle');
        }
      } catch {
        setAvatarShape('circle');
      }
    } else {
      // Limpar avatar quando não há usuário
      setUserAvatar(null);
    }
  }, [user?.id, user?.profileImage, user?.profile_image]);

  // Listener para atualização do avatar
  useEffect(() => {
    const handleAvatarUpdate = (event) => {
      const { userId, avatar } = event.detail || {};
      if (!user || String(userId) !== String(user.id)) return;
      const final = cacheBust(avatar || '');
      setUserAvatar(final || null);
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
    };
  }, [user]);

  // Poll de mensagens não lidas (candidate_messages + chat) somente para candidato
  useEffect(() => {
    let interval;
    const fetchUnread = async () => {
      if (!(user && user.type === 'candidate')) {
        setUnreadCount(0);
        return;
      }
      try {
        const [interactionRes, conversations] = await Promise.all([
          interactionsAPI.unreadCount().catch(()=>({ count:0 })),
          chatAPI.getConversations().catch(()=>[])
        ]);
        const chatUnread = Array.isArray(conversations) ? conversations.reduce((acc,c)=> acc + (c.unreadCount || 0), 0) : 0;
        const total = (interactionRes?.count || 0) + chatUnread;
        setUnreadCount(total);
      } catch (e) {
        // silencioso
      }
    };
    fetchUnread();
    if (user && user.type === 'candidate') {
      interval = setInterval(fetchUnread, 60000); // 60s
      // Listener para refresh manual (ex: após ler mensagens)
      const handler = () => fetchUnread();
      window.addEventListener('refreshUnread', handler);
      return () => { clearInterval(interval); window.removeEventListener('refreshUnread', handler); };
    }
    return () => interval && clearInterval(interval);
  }, [user]);

  // Carregar contagem de entrevistas/aprovados para empresas (para exibir na navbar)
  useEffect(() => {
    const loadInterviewStats = async () => {
      if (!(user && user.type === 'company')) {
        setInterviewsCount(0);
        setApprovedCount(0);
        setNewApplicationsCount(0);
        return;
      }
      try {
        const applicationsResponse = await applicationsAPI.getCompanyApplications();
        const companyApplications = applicationsResponse.applications || [];
        const interviews = companyApplications.filter(a => a.status === 'interview' || a.interview_date);
        const approved = companyApplications.filter(a => a.status === 'approved');
        setInterviewsCount(interviews.length);
        setApprovedCount(approved.length);
        
        // Calcular novas candidaturas não visualizadas
        const lastSeenKey = `company_applications_last_seen_${user.id}`;
        const lastSeenTimestamp = localStorage.getItem(lastSeenKey);
        const lastSeen = lastSeenTimestamp ? new Date(lastSeenTimestamp) : new Date(0);
        
        const newApps = companyApplications.filter(a => {
          const appliedAt = new Date(a.applied_at || a.created_at);
          return appliedAt > lastSeen;
        });
        setNewApplicationsCount(newApps.length);
        
        // Calcular novos pré-aprovados não visualizados (para o Painel)
        const preApprovedLastSeenKey = `company_preapproved_last_seen_${user.id}`;
        const preApprovedLastSeenTimestamp = localStorage.getItem(preApprovedLastSeenKey);
        const preApprovedLastSeen = preApprovedLastSeenTimestamp ? new Date(preApprovedLastSeenTimestamp) : new Date(0);
        
        const newPreApproved = companyApplications.filter(a => {
          // Pré-aprovados: status aprovado, não final_approved, e sem entrevista ativa
          const isPreApproved = a.status === 'approved' && !a.final_approved && (!a.interview_date || a.interview_canceled_by_company || a.interview_rejected_by_candidate);
          if (!isPreApproved) return false;
          const preApprovedAt = new Date(a.pre_approved_at || a.decision_at || a.updated_at || a.created_at);
          return preApprovedAt > preApprovedLastSeen;
        });
        setNewPreApprovedCount(newPreApproved.length);
      } catch (e) {
        setInterviewsCount(0);
        setApprovedCount(0);
        setNewApplicationsCount(0);
        setNewPreApprovedCount(0);
      }
    };
    loadInterviewStats();
    
    // Atualizar a cada 30 segundos para empresas
    let interval;
    if (user && user.type === 'company') {
      interval = setInterval(loadInterviewStats, 30000);
      // Listener para quando empresa visualiza candidaturas
      const handler = () => loadInterviewStats();
      window.addEventListener('applicationsViewed', handler);
      return () => { 
        clearInterval(interval); 
        window.removeEventListener('applicationsViewed', handler); 
      };
    }
    return () => interval && clearInterval(interval);
  }, [user]);

  // Verificar se candidato tem currículos
  useEffect(() => {
    const checkResumes = async () => {
      if (!(user && user.type === 'candidate')) {
        setHasResumes(true);
        return;
      }
      try {
        const response = await resumesAPI.list();
        const resumes = response.resumes || response.data || response || [];
        setHasResumes(Array.isArray(resumes) && resumes.length > 0);
      } catch (e) {
        setHasResumes(true); // Em caso de erro, assume que tem para não mostrar botão errado
      }
    };
    checkResumes();
    // Listener para atualizar quando criar currículo
    const handler = () => checkResumes();
    window.addEventListener('resume-created', handler);
    window.addEventListener('resume-deleted', handler);
    return () => {
      window.removeEventListener('resume-created', handler);
      window.removeEventListener('resume-deleted', handler);
    };
  }, [user]);
  
  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  let menuItems = [];
  if (user) {
    if (isAdmin) {
      menuItems = [
        { label: 'Dashboard Admin', path: '/admin-dashboard', icon: Users },
        { label: 'Cadastrar Usuário', path: '/admin/register', icon: UserPlus },
        { label: 'Vagas Admin', path: '/admin/jobs', icon: ClipboardList },
        { label: 'Criar Vaga da Comunidade', path: '/admin/create-community-job', icon: PlusCircle }
      ];
    } else if (isCompany) {
      menuItems = [
        { label: 'Dashboard', path: '/company-dashboard', icon: Home },
        ...(!user?.isAgency ? [
          { label: newPreApprovedCount > 0 ? `Painel (${newPreApprovedCount})` : 'Painel', path: '/company-interviews', icon: LayoutPanelLeft, highlight: newPreApprovedCount > 0 },
          { label: newApplicationsCount > 0 ? `Vagas (${newApplicationsCount})` : 'Vagas', path: '/my-jobs', icon: Search, highlight: newApplicationsCount > 0 }
        ] : []),
        { label: 'Social', path: '/social', icon: Orbit },
        ...(user?.isAgency ? [{ label: 'Portal Agência', path: '/agency-portal', icon: BookOpen }] : []),
        { label: 'Escolas', path: '/company/schools', icon: GraduationCap },
        { label: 'Perfil', path: `/company/${user.id}`, icon: Building2 },
        { label: 'Mensagens', path: '/company-messages', icon: MessageSquare }
      ];
    } else if (isSchool) {
      menuItems = [
        { label: 'Dashboard', path: '/school-dashboard', icon: Home },
        { label: 'Perfil', path: '/school/profile', icon: Building2 },
        { label: 'Alunos', path: '/school/students', icon: Users },
  { label: 'Turmas', path: '/school/classes', icon: GraduationCap },
    { label: 'Vagas', path: '/jobs', icon: Search },
        { label: 'Social', path: '/social', icon: Orbit },
        { label: 'Mensagens', path: '/school-messages', icon: MessageSquare }
      ];
    } else {
      menuItems = [
        { label: 'Vagas', path: '/jobs', icon: Search },
        { label: 'Social', path: '/social', icon: Orbit },
        { label: unreadCount > 0 ? `Mensagens (${unreadCount})` : 'Mensagens', path: '/my-messages', icon: MessageSquare, highlight: unreadCount > 0 },
  // Grupos integrados na lista de conversas de /my-messages
        { label: 'Dashboard', path: '/dashboard', icon: Home },
        hasResumes 
          ? { label: 'Meus Currículos', path: '/my-resumes', icon: FileText }
          : { label: 'Criar Currículo', path: '/create-resume', icon: FileText, special: 'create-resume' },
        { label: 'Jornada', path: '/candidate-journey', icon: Zap }
      ];
    }
  }

  // Definir cor do background da navbar baseado na página
  const isHomePage = location.pathname === '/';
  const navbarBgColor = isHomePage ? 'bg-blue-50' : 'bg-gray-50';

  return (
    <motion.nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-700 ${
        isScrolled ? 'pointer-events-none' : navbarBgColor
      } ${!isScrolled ? 'border-b border-gray-200/60' : ''}`}
      initial={false}
      animate={{
        paddingTop: isScrolled ? 12 : 0,
        paddingBottom: isScrolled ? 12 : 0,
        paddingLeft: isScrolled ? 16 : 0,
        paddingRight: isScrolled ? 16 : 0,
        backgroundColor: isScrolled ? 'rgba(255,255,255,0)' : (isHomePage ? 'rgb(239,246,255)' : 'rgb(249,250,251)')
      }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.div 
        className={`mx-auto transition-all duration-700 ${isScrolled ? 'flex justify-center' : ''}`}
        animate={{
          maxWidth: isScrolled ? 'none' : 1280,
          paddingLeft: isScrolled ? 0 : 24,
          paddingRight: isScrolled ? 0 : 24
        }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.div 
          className={`pointer-events-auto ${isScrolled ? 'backdrop-blur-md shadow-lg' : ''}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          animate={{
            borderRadius: isScrolled ? 9999 : 0,
            backgroundColor: isScrolled ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0)',
            paddingLeft: isScrolled ? 20 : 0,
            paddingRight: isScrolled ? 20 : 0,
            paddingTop: isScrolled ? 10 : 0,
            paddingBottom: isScrolled ? 10 : 0,
            scale: isScrolled ? (isHovered ? 1 : 0.95) : 1,
            opacity: isScrolled ? (isHovered ? 1 : 0.9) : 1,
            borderWidth: isScrolled ? 1 : 0,
            borderColor: isScrolled ? 'rgba(229,231,235,0.5)' : 'rgba(229,231,235,0)'
          }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ borderStyle: 'solid' }}
        >
          <motion.div 
            className="flex items-center"
            animate={{
              height: isScrolled ? 'auto' : 64,
              gap: isScrolled ? 16 : 0,
              justifyContent: isScrolled ? 'center' : 'space-between'
            }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Logo */}
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              transition={{ type: "spring", stiffness: 300 }}
              className="flex-shrink-0"
            >
              <Link to="/" className="flex items-center h-full group">
                <motion.img 
                  src="/logo.png" 
                  alt="CurrículoJá" 
                  className="rounded-xl shadow-sm ring-1 ring-blue-200 group-hover:scale-105 transition-transform duration-300 object-contain" 
                  animate={{ width: isScrolled ? 36 : 36, height: isScrolled ? 36 : 36 }}
                  transition={{ duration: 0.5 }}
                  onError={(e)=>{ e.currentTarget.style.display='none'; }} 
                />
              </Link>
            </motion.div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2 ml-2">
              {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || 
                               (item.path === '/my-jobs' && location.pathname.includes('/candidates/')) ||
                               (item.path === '/my-resume' && location.pathname.includes('/resume/')) ||
                               (item.path === '/admin-dashboard' && location.pathname.includes('/admin')) ||
                               (item.path === '/candidate-journey' && location.pathname.startsWith('/journey/'));
                
                const isJourneyPage = item.path === '/candidate-journey';
                const isSocialPage = item.path === '/social';
                
                return (
                  <motion.div key={item.path} whileHover={{ y: -2 }}>
                    <Link 
                      to={item.path} 
                      className={`group flex items-center rounded-full transition-all duration-300 font-medium ${
                        isScrolled ? 'px-3 py-2.5 text-base' : 'px-3 lg:px-5 py-2 text-base lg:text-lg'
                      } ${
                        isActive 
                          ? isJourneyPage 
                            ? 'text-yellow-600 bg-yellow-50 shadow-sm border-2 border-yellow-200'
                            : isSocialPage
                              ? 'text-purple-600 bg-purple-50 shadow-sm border-2 border-purple-200'
                              : 'text-blue-600 bg-blue-50 shadow-sm border-2 border-blue-200'
                          : isJourneyPage
                            ? 'text-gray-600 hover:text-yellow-600 hover:bg-yellow-50'
                            : isSocialPage
                              ? 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                              : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <div className="relative">
                        <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-700 ${isSocialPage ? 'group-hover:rotate-180' : ''} ${item.highlight ? 'text-blue-700' : ''}`} />
                        {item.highlight && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
                      </div>
                      {/* Texto - sempre visível quando não scrolled, hover quando scrolled */}
                      <motion.span 
                        className={`whitespace-nowrap overflow-hidden ${isScrolled ? 'text-sm' : ''}`}
                        animate={{
                          width: isScrolled ? 0 : 'auto',
                          marginLeft: isScrolled ? 0 : 8,
                          opacity: isScrolled ? 0 : 1
                        }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      >
                        <span className={isScrolled ? '' : 'hidden lg:inline'}>{item.label}</span>
                      </motion.span>
                      {/* Texto hover quando scrolled */}
                      {isScrolled && (
                        <span 
                          className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[150px] group-hover:ml-2 ml-0 text-sm"
                          style={{
                            transition: 'max-width 600ms ease-out, margin-left 600ms ease-out',
                            transitionDelay: '300ms'
                          }}
                        >
                          {item.label.split(' ').pop()}
                        </span>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* User Actions */}
            <motion.div 
              className="hidden md:flex items-center space-x-2 ml-2"
              animate={{
                borderLeftWidth: isScrolled ? 0 : 1,
                borderLeftColor: isScrolled ? 'rgba(229,231,235,0)' : 'rgba(229,231,235,1)',
                paddingLeft: isScrolled ? 0 : 16
              }}
              transition={{ duration: 0.5 }}
              style={{ borderLeftStyle: 'solid' }}
            >
              {user ? (
                <div className="flex items-center space-x-2">
                  <Link to={isCompany ? `/company/${user.id}` : isSchool ? '/school/profile' : '/profile'} className="group relative">
                    <motion.div 
                      className={`bg-white ${avatarShape==='circle'?'rounded-full':'rounded-xl'} flex items-center justify-center text-gray-700 text-sm font-semibold overflow-hidden`}
                      animate={{ width: isScrolled ? 40 : 48, height: isScrolled ? 40 : 48 }}
                      transition={{ duration: 0.5 }}
                    >
                      {userAvatar ? (
                        <img src={userAvatar} alt="Avatar" className={`w-full h-full ${isCompany ? 'object-contain p-0.5 bg-white' : 'object-cover'}`} />
                      ) : (
                        (user.name || user.companyName || 'U').charAt(0).toUpperCase()
                      )}
                    </motion.div>
                  </Link>
                  <button 
                    onClick={handleLogout} 
                    className={`group flex items-center rounded-full border border-red-200 bg-red-500/5 text-[12px] font-bold text-red-600 shadow-sm shadow-red-100 hover:border-red-400 hover:bg-red-500 hover:text-white hover:shadow-md hover:shadow-red-200 transition-all duration-300 ${isScrolled ? 'p-2' : 'gap-1.5 px-3.5 py-2'}`}
                    title="Sair"
                  >
                    <LogOut className="w-4 h-4" />
                    {!isScrolled && <span className="hidden lg:inline">Sair</span>}
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  {isOnCompanyPage ? (
                    <Link to="/" className="group flex items-center px-3 py-2.5 rounded-full text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 font-semibold">
                      <User className="w-5 h-5" />
                      <motion.span 
                        className="whitespace-nowrap overflow-hidden"
                        animate={{
                          width: isScrolled ? 0 : 'auto',
                          marginLeft: isScrolled ? 0 : 8,
                          opacity: isScrolled ? 0 : 1
                        }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      >
                        <span className="hidden lg:inline">Sou um aluno</span>
                      </motion.span>
                      {isScrolled && (
                        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[100px] group-hover:ml-2 transition-all duration-700 delay-[275ms] ease-out text-sm">Aluno</span>
                      )}
                    </Link>
                  ) : (
                    <Link to="/company-landing" className="group flex items-center px-3 py-2.5 rounded-full text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 font-semibold">
                      <Building2 className="w-5 h-5" />
                      <motion.span 
                        className="whitespace-nowrap overflow-hidden"
                        animate={{
                          width: isScrolled ? 0 : 'auto',
                          marginLeft: isScrolled ? 0 : 8,
                          opacity: isScrolled ? 0 : 1
                        }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      >
                        <span className="hidden lg:inline">Para Empresas</span>
                      </motion.span>
                      {isScrolled && (
                        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[100px] group-hover:ml-2 transition-all duration-700 delay-[275ms] ease-out text-sm">Empresas</span>
                      )}
                    </Link>
                  )}
                  <Link to="/login">
                    <Button variant="outline" size="sm" className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white px-4">
                      Entrar
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-3 ml-4">
              {user && (
                <Link to={isCompany ? `/company/${user.id}` : isSchool ? '/school/profile' : '/profile'} className={`w-10 h-10 bg-white ${avatarShape==='circle'?'rounded-full':'rounded-xl'} flex items-center justify-center text-gray-700 text-sm font-semibold overflow-hidden border-2 border-blue-200 flex-shrink-0`}>
                  {userAvatar ? (
                    <img src={userAvatar} alt="Avatar" className={`w-full h-full ${isCompany ? 'object-contain p-0.5 bg-white' : 'object-cover'}`} />
                  ) : (
                    (user.name || user.companyName || 'U').charAt(0).toUpperCase()
                  )}
                </Link>
              )}
              <motion.button onClick={() => setIsOpen(!isOpen)} className="text-gray-600 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50" whileTap={{ scale: 0.95 }}>
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`md:hidden pointer-events-auto ${isScrolled ? 'mx-4 mt-2' : 'mx-0 mt-0'} bg-white/95 backdrop-blur-md ${isScrolled ? 'rounded-2xl shadow-lg' : ''} border-t border-gray-200/50 overflow-hidden`}
          >
            <div className="px-3 py-3 space-y-1">
              {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path ||
                               (item.path === '/my-jobs' && location.pathname.includes('/candidates/')) ||
                               (item.path === '/my-resume' && location.pathname.includes('/resume/')) ||
                               (item.path === '/admin-dashboard' && location.pathname.includes('/admin')) ||
                               (item.path === '/candidate-journey' && location.pathname.startsWith('/journey/'));
                const isJourneyPage = item.path === '/candidate-journey';
                const isSocialPage = item.path === '/social';
                return (
                  <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)} className={`group flex items-center space-x-2 px-3 py-2 rounded-xl transition-colors ${isActive ? (isJourneyPage ? 'text-yellow-600 bg-yellow-50' : isSocialPage ? 'text-purple-600 bg-purple-50' : 'text-blue-600 bg-blue-50') : (isJourneyPage ? 'text-gray-600 hover:bg-yellow-50 hover:text-yellow-600' : isSocialPage ? 'text-gray-600 hover:bg-purple-50 hover:text-purple-600' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600')}`}>
                    <Icon className={`w-5 h-5 transition-transform duration-700 ${isSocialPage ? 'group-hover:rotate-180' : ''}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
              {user ? (
                <div className="border-t border-gray-200 pt-3 mt-2">
                  <button 
                    onClick={handleLogout} 
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full border border-red-200 bg-red-500/5 text-sm font-bold text-red-600 shadow-sm shadow-red-100 hover:border-red-400 hover:bg-red-500 hover:text-white hover:shadow-md hover:shadow-red-200 transition-all duration-300"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                  </button>
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                  <Link to="/login" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-xl text-sm font-medium">
                    Entrar
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;