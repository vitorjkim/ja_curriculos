import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { ImagePlus, Heart, MessageCircle, Share2, Trash2, Eye, FileText, Briefcase, Calendar, Download, ExternalLink, Clock, User, Mail, Phone, CreditCard, GraduationCap, Star, X, ChevronRight, Instagram, Linkedin, MessageSquare, Plus, Globe, Award, Lightbulb, Target, ChevronDown, ChevronUp, Pencil, Layers, Github, Link2, Save } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { usersAPI, resumesAPI as resumes, applicationsAPI as applications, chatAPI, studentPostsAPI, profileViewsAPI, jobsAPI } from '@/lib/api';
import { schoolApi } from '@/lib/schoolApi';
import { formatCPF, formatPhone, validateCPFFormat, validatePhoneFormat } from '@/lib/formatters';
import ImageCropper from '@/components/ImageCropper';
// Reintroduzido cropper para alunos: recorte obrigatório e formato circular

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', cpf: '', class_name: '', avatar: null, school_avatar: null, status: '', life_status: '', linkedin_url: '', instagram_url: '', github_url: '', custom_url: '' });
  const [isHighlightedStudent, setIsHighlightedStudent] = useState(false);
  const [errors, setErrors] = useState({ phone: '', cpf: '' });
  const [stats, setStats] = useState({ resumes: 0, applications: 0 });
  const [recentResumes, setRecentResumes] = useState([]);
  const canDownloadResumes = !!(user && (user.type==='school' || user.type==='company' || user.isAdmin));
  const [recentApplications, setRecentApplications] = useState([]);
  // Avatar
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [newAvatar, setNewAvatar] = useState(null); // DataURL selecionado
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarShape, setAvatarShape] = useState(() => {
    try { return localStorage.getItem('avatar_shape_'+(user?.id||'')) || 'circle'; } catch { return 'circle'; }
  });
  const [cropImage, setCropImage] = useState(null); // DataURL bruto para o cropper
  // Student posts (igual ao fluxo da escola)
  const [posts, setPosts] = useState([]);
  const [creatingPost, setCreatingPost] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [postImages, setPostImages] = useState([]); // Array de DataURLs
  const [showPostForm, setShowPostForm] = useState(false); // Controla visibilidade do formulário
  const [commentInputs, setCommentInputs] = useState({}); // postId -> text
  const [replyInputs, setReplyInputs] = useState({}); // commentId -> text
  const [replyOpen, setReplyOpen] = useState({}); // commentId -> boolean
  // Journey and composite completeness for "Seu Progresso"
  const [journeyProgress, setJourneyProgress] = useState(0);
  const [journeyCompleted, setJourneyCompleted] = useState(false);
  // Profile views (companies)
  const [views, setViews] = useState({ count: 0, companies: [] });

  // === NOVAS SEÇÕES DO PERFIL (estilo currículo) ===
  const [profileSections, setProfileSections] = useState({});
  // Taxonomy para área de atuação
  const [taxonomy, setTaxonomy] = useState({});
  const [areasList, setAreasList] = useState([]);
  const [subareasList, setSubareasList] = useState([]);
  // Checkbox "não tenho experiência"
  const [hasNoExperience, setHasNoExperience] = useState(false);
  // Tracking de seções com alterações não salvas
  const [profileSectionsDirty, setProfileSectionsDirty] = useState(new Set());
  
  const [expandedSections, setExpandedSections] = useState({
    education: false,
    experience: false,
    projects: false,
    courses: false,
    languages: false,
    area: false
  });
  const [editingSections, setEditingSections] = useState({
    education: false,
    experience: false,
    projects: false,
    courses: false,
    languages: false,
    area: false
  });

  // Toggle seção expandida
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Toggle modo edição de seção
  const toggleEditSection = (section) => {
    setEditingSections(prev => ({ ...prev, [section]: !prev[section] }));
    if (!expandedSections[section]) {
      setExpandedSections(prev => ({ ...prev, [section]: true }));
    }
  };

  // Adicionar item em array (experiências, projetos, cursos, idiomas)
  const addItem = (section) => {
    const defaults = {
      experiences: { id: Date.now(), company: '', position: '', period: '', description: '' },
      projects: { id: Date.now(), title: '', period: '', description: '' },
      courses: { id: Date.now(), name: '', institution: '', year: '' },
      languages: { id: Date.now(), language: '', level: '' }
    };
    setProfileSections(prev => ({
      ...prev,
      [section]: [...prev[section], defaults[section]]
    }));
  };

  // Remover item de array
  const removeItem = (section, id) => {
    setProfileSections(prev => ({
      ...prev,
      [section]: prev[section].filter(item => item.id !== id)
    }));
  };

  // Atualizar item de array
  const updateItem = (section, id, field, value) => {
    setProfileSections(prev => ({
      ...prev,
      [section]: prev[section].map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  // Marcar seção como alterada (dirty)
  const markDirty = (section) => {
    setProfileSectionsDirty(prev => new Set(prev).add(section));
  };

  // Salvar seção imediatamente (usado ao remover itens)
  const saveSectionImmediate = (section, value) => {
    try {
      const key = `profile_section_${section}_${user?.id || 'guest'}`;
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Erro ao salvar seção:', e);
    }
    // Limpar dirty flag dessa seção
    setProfileSectionsDirty(prev => { const n = new Set(prev); n.delete(section); return n; });
  };

  // Salvar seção (placeholder - pode integrar com API depois)
  const saveSection = (section) => {
    setEditingSections(prev => ({ ...prev, [section]: false }));
    // Salvar no localStorage por enquanto
    try {
      const key = `profile_section_${section}_${user?.id || 'guest'}`;
      localStorage.setItem(key, JSON.stringify(profileSections[section]));
    } catch (e) {
      console.warn('Erro ao salvar seção:', e);
    }
  };

  // Salvar TODAS as seções dirty de uma vez
  const saveAllDirtySections = async () => {
    try {
      await usersAPI.update(user.id, { resumeSections: profileSections });
      // Também persistir no localStorage como cache
      Object.keys(profileSections).forEach(section => {
        try {
          const key = `profile_section_${section}_${user.id}`;
          localStorage.setItem(key, JSON.stringify(profileSections[section]));
        } catch (e) {}
      });
      setProfileSectionsDirty(new Set());
      toast({ title: 'Seções salvas', description: 'Suas informações foram atualizadas.' });
    } catch (e) {
      console.error('Erro ao salvar seções:', e);
      toast({ title: 'Erro ao salvar', description: 'Não foi possível salvar as seções.', variant: 'destructive' });
    }
  };

  // Carregar seções do localStorage ao montar
  useEffect(() => {
    if (!user?.id) return;
    const sections = ['education', 'experiences', 'projects', 'courses', 'languages', 'area', 'subarea'];
    const loaded = {};
    sections.forEach(section => {
      try {
        const key = `profile_section_${section}_${user.id}`;
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          // Não carregar seções vazias (string vazia ou array vazio)
          if (Array.isArray(parsed) && parsed.length === 0) return;
          if (parsed === '' || parsed === null) return;
          loaded[section] = parsed;
        }
      } catch (e) {
        // ignore
      }
    });
    if (Object.keys(loaded).length > 0) {
      setProfileSections(prev => ({ ...prev, ...loaded }));
    }
  }, [user?.id]);

  // Carregar taxonomy para área de atuação
  useEffect(() => {
    const loadTaxonomy = async () => {
      try {
        const data = await jobsAPI.getTaxonomy();
        if (data) {
          setTaxonomy(data);
          setAreasList(Object.keys(data).map(a => ({ value: a, label: a })));
        }
      } catch (e) {
        console.warn('Erro ao carregar taxonomy:', e);
      }
    };
    loadTaxonomy();
  }, []);

  // Atualizar sub-áreas quando área muda
  useEffect(() => {
    if (profileSections.area && taxonomy[profileSections.area]) {
      setSubareasList(taxonomy[profileSections.area].map(s => ({ value: s, label: s })));
    } else {
      setSubareasList([]);
    }
  }, [profileSections.area, taxonomy]);

  // Helper: obter avatar de um usuário (aluno) - APENAS do backend
  const getUserAvatar = (uid) => {
    if (!uid) return null;
    // Não usar localStorage - apenas backend quando disponível no objeto user
    return null;
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('completedJourneySteps');
      const arr = Array.isArray(JSON.parse(raw || '[]')) ? JSON.parse(raw || '[]') : [];
      const TOTAL = 10; // Deve refletir CandidateJourney.jsx
      const pct = Math.max(0, Math.min(100, Math.round((arr.length / TOTAL) * 100)));
      setJourneyProgress(pct);
      setJourneyCompleted(arr.length >= TOTAL);
    } catch (_) {
      setJourneyProgress(0);
      setJourneyCompleted(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
  if (id) {
          let res;
          if (user && user.type === 'school') {
            try {
              const s = await schoolApi.getStudent(id);
              if (s) {
                const avatar = s.profileImage || s.profile_image || null;
                const schoolAvatar = s.school_avatar || user.profileImage || user.profile_image || null;
                setProfile({ name: s.name || '', email: s.email || '', phone: s.phone || '', cpf: s.cpf || '', class_name: s.class_name || s.class || '', avatar, school_avatar: schoolAvatar, status: s.status || '', life_status: s.life_status || '', linkedin_url: s.linkedin_url || '', instagram_url: s.instagram_url || '', github_url: s.github_url || '', custom_url: s.custom_url || '', type: s.type || 'candidate' });
                setAvatarUrl(avatar);
                // Setar se é aluno destacado
                if (typeof s.is_featured !== 'undefined') setIsHighlightedStudent(!!s.is_featured);
                // Carregar seções do perfil
                if (s.resume_sections && typeof s.resume_sections === 'object') {
                  setProfileSections(prev => ({ ...prev, ...s.resume_sections }));
                }
                return;
              }
            } catch (e) {
              console.warn('Fallback para usersAPI.get:', e);
            }
          }
            res = await usersAPI.get(id);
            if (res?.user) {
              const avatar = res.user.profileImage || res.user.profile_image || null;
              const schoolAvatar = res.student?.school_avatar || null;
              setProfile(prev => ({ ...prev, name: res.user.name || '', email: res.user.email || '', phone: res.user.phone || '', cpf: res.user.cpf || '', class_name: res.student?.class_name || res.student?.class || res.user.class_name || '', avatar, school_avatar: schoolAvatar, status: res.student?.status || '', life_status: res.user.life_status || '', linkedin_url: res.user.linkedin_url || '', instagram_url: res.user.instagram_url || '', github_url: res.user.github_url || '', custom_url: res.user.custom_url || '', type: res.user.type || '' }));
              setAvatarUrl(avatar);
              if (res.student && typeof res.student.is_featured !== 'undefined') {
                setIsHighlightedStudent(!!res.student.is_featured);
              }
              // Carregar seções do backend (perfil de outro candidato)
              if (res.user.resume_sections && typeof res.user.resume_sections === 'object') {
                setProfileSections(prev => ({ ...prev, ...res.user.resume_sections }));
              }
            }
        } else if (user) {
          if(user.type === 'candidate') {
            try {
              const resSelf = await usersAPI.get(user.id);
                if(resSelf?.student){
                  const avatar = resSelf.user.profileImage || resSelf.user.profile_image || null;
                  const schoolAvatar = resSelf.student?.school_avatar || null;
                  setProfile({ name: resSelf.user.name || '', email: resSelf.user.email || '', phone: resSelf.user.phone || '', cpf: resSelf.user.cpf || '', class_name: resSelf.student.class_name || '', avatar, school_avatar: schoolAvatar, status: resSelf.student?.status || '', life_status: resSelf.user.life_status || '', linkedin_url: resSelf.user.linkedin_url || '', instagram_url: resSelf.user.instagram_url || '', github_url: resSelf.user.github_url || '', custom_url: resSelf.user.custom_url || '' });
                  setAvatarUrl(avatar);
                  if (typeof resSelf.student.is_featured !== 'undefined') setIsHighlightedStudent(!!resSelf.student.is_featured);
                  // Carregar seções do backend
                  if (resSelf.user.resume_sections && typeof resSelf.user.resume_sections === 'object') {
                    setProfileSections(prev => ({ ...prev, ...resSelf.user.resume_sections }));
                  }
              } else {
                const avatar = user.profileImage || user.profile_image || null;
                setProfile({ name: user.name || '', email: user.email || '', phone: user.phone || '', cpf: user.cpf || '', class_name: '', avatar, linkedin_url: user.linkedin_url || '', instagram_url: user.instagram_url || '', github_url: user.github_url || '', custom_url: user.custom_url || '' });
                setAvatarUrl(avatar);
              }
            } catch(err){
              const avatar = user.profileImage || user.profile_image || null;
              setProfile({ name: user.name || '', email: user.email || '', phone: user.phone || '', cpf: user.cpf || '', class_name:'', avatar, linkedin_url: user.linkedin_url || '', instagram_url: user.instagram_url || '', github_url: user.github_url || '', custom_url: user.custom_url || '' });
              setAvatarUrl(avatar);
            }
          } else {
            const avatar = user.profileImage || user.profile_image || null;
            setProfile({ name: user.name || '', email: user.email || '', phone: user.phone || '', cpf: user.cpf || '', class_name: user.class_name || user.class || '', avatar, linkedin_url: user.linkedin_url || '', instagram_url: user.instagram_url || '', github_url: user.github_url || '', custom_url: user.custom_url || '' });
            setAvatarUrl(avatar);
          }
        }
        // Placeholder lógica: se existir localStorage flag highlight_students contendo este id
    // Removido placeholder localStorage: agora dependemos de is_featured vindo do backend
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
        // Se token ausente ou expirado, redirecionar para login para reautenticar
        const msg = err?.message || '';
        if (msg.includes('Token de acesso') || msg.includes('TOKEN_REQUIRED') || msg.includes('Unauthorized')) {
          toast({ title: 'Sessão inválida', description: 'Faça login novamente para acessar este perfil.', variant: 'destructive' });
          // small delay para permitir ao usuário ler o toast
          setTimeout(() => navigate('/login'), 600);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    // carregar estatísticas/read-only: currículos e candidaturas recentes
    const loadStats = async () => {
      try {
        let r, a;
        // If viewing another user's profile and viewer is school/admin, fetch by-user
  // Se visualizando outro usuário e o viewer é escola, admin ou empresa, usar rotas by-user
  if (id && user && (user.type === 'school' || user.type === 'company' || user.isAdmin || user.type === 'admin')) {
          r = await resumes.listByUser(id);
          a = await applications.listByUser(id);
        } else {
          r = await resumes.list();
          a = await applications.list();
        }
        const userResumes = (r?.resumes || r?.data || [])
          .map(x => (x.resume ? x.resume : x))
          .slice(0, 3);
        const userApps = (a?.applications || a?.data || [])
          .slice(0, 3);

  setStats({ resumes: (r?.resumes || r?.data || []).length || (r?.length || 0), applications: (a?.applications || a?.data || []).length || (a?.length || 0) });
        setRecentResumes(userResumes);
        setRecentApplications(userApps);
      } catch (err) {
        console.error('Erro ao carregar estatísticas de currículos/candidaturas:', err);
      }
    };
    loadStats();
    // Load student posts (own or viewing specific user)
    const loadPosts = async () => {
      try {
        const targetId = id || (user?.id || null);
        const r = await studentPostsAPI.list(targetId);
        const list = r?.posts || [];
        setPosts(list);
      } catch (e) {
        console.warn('Falha ao carregar posts do aluno:', e?.message || e);
      }
    };
    loadPosts();
  }, [id, user]);

  // Register profile view if company viewing a student
  useEffect(() => {
    const registerView = async () => {
      try {
        if (user?.type === 'company' && id) {
          await profileViewsAPI.addView(id);
        }
      } catch (_) { /* ignore */ }
    };
    registerView();
  }, [id, user?.id, user?.type]);

  // Load profile views stats for student (own) or school viewing a student
  useEffect(() => {
    const loadViews = async () => {
      try {
        if ((user?.type === 'candidate' && !id) || (user?.type === 'school' && id)) {
          const target = id || user.id;
          const r = await profileViewsAPI.getStats(target);
          if (r?.success) setViews({ count: r.count || 0, companies: r.companies || [] });
        }
      } catch (e) {
        // Silent fail
      }
    };
    loadViews();
  }, [id, user?.id, user?.type]);

  const onSelectImage = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (postImages.length + files.length > 10) {
      toast({ title: 'Limite de imagens', description: 'Máximo de 10 imagens por publicação.', variant: 'destructive' });
      return;
    }
    const readFile = (file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const newImages = await Promise.all(files.map(readFile));
    setPostImages(prev => [...prev, ...newImages].slice(0, 10));
    e.target.value = ''; // Reset para permitir selecionar as mesmas imagens novamente
  };

  const removePostImage = (index) => {
    setPostImages(prev => prev.filter((_, i) => i !== index));
  };

  // Seleção de avatar
  const onSelectAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Permitir edição pelo próprio aluno (sem id) OU escola visualizando aluno (id presente)
    const canEdit = (user?.type === 'candidate' && !id) || (user?.type === 'school' && !!id);
    if (!canEdit) {
      toast({ title: 'Sem permissão', description: 'Apenas o aluno ou a escola podem trocar esta foto.' });
      return;
    }
    const maxBytes = 3 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({ title: 'Imagem muito grande', description: 'Envie até 3MB.', variant: 'destructive' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Use um formato de imagem (JPG, PNG).', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropImage(reader.result);
    reader.readAsDataURL(file);
  };
  // Toggle de forma (círculo/quadrado) sem cropper
  const handleSetShape = (shape) => {
    setAvatarShape(shape);
    try { localStorage.setItem('avatar_shape_'+(user?.id||''), shape); } catch {}
  };

  const onUploadAvatar = async () => {
    const viewingStudentId = id; // quando escola está vendo aluno
    const isOwnCandidate = user?.type === 'candidate' && !id;
    const canEditSchool = user?.type === 'school' && !!viewingStudentId;
    if (!isOwnCandidate && !canEditSchool) return; // somente aluno próprio ou escola sobre aluno
    if (!newAvatar || typeof newAvatar !== 'string' || !newAvatar.startsWith('data:image/')) {
      toast({ title: 'Selecione uma imagem', description: 'Escolha e recorte uma imagem antes de salvar.' });
      return;
    }
    const targetId = isOwnCandidate ? user.id : viewingStudentId;
    try {
      setAvatarUploading(true);
      const resp = await usersAPI.uploadAvatar(targetId, newAvatar);
      const url = resp?.profileImage || newAvatar;
      setAvatarUrl(url);
      setProfile(prev => ({ ...prev, avatar: url }));
      setNewAvatar(null);
      // Notificar outras telas da atualização (sem usar localStorage)
      window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { userId: targetId, avatar: url } }));
      // Atualiza AuthContext somente se for o próprio aluno
      if (isOwnCandidate) { try { if (updateUser) await updateUser(); } catch {} }
      toast({ title: 'Foto atualizada', description: canEditSchool ? 'Alterada pela escola.' : 'Alterada com sucesso.' });
    } catch (e) {
      toast({ title: 'Erro ao enviar foto', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const onPublish = async () => {
    if (!user || user.type !== 'candidate') {
      toast({ title: 'Apenas alunos podem publicar', variant: 'destructive' });
      return;
    }
    if (postImages.length === 0) { toast({ title: 'Selecione uma imagem', description: 'Adicione pelo menos uma imagem para publicar.' }); return; }
    try {
      setCreatingPost(true);
      const resp = await studentPostsAPI.create({ images: postImages, caption: postCaption.trim() });
      if (resp?.post) setPosts(prev => [resp.post, ...prev]);
      setPostImages([]);
      setPostCaption('');
      setShowPostForm(false); // Fecha o formulário após publicar
      toast({ title: 'Publicado', description: 'Sua publicação foi criada.' });
    } catch (e) {
      toast({ title: 'Erro ao publicar', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally { setCreatingPost(false); }
  };

  const onToggleLike = async (postId) => {
    if (!user) { toast({ title: 'Faça login', description: 'Entre para curtir publicações.' }); return; }
    try { await studentPostsAPI.toggleLike(postId); } catch {}
    // Refresh local
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const liked = (p.likes||[]).includes(user.id);
      return { ...p, likes: liked ? p.likes.filter(x=>x!==user.id) : [...(p.likes||[]), user.id] };
    }));
  };

  const onAddComment = async (postId) => {
    if (!user) { toast({ title: 'Faça login', description: 'Entre para comentar.' }); return; }
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    try { const r = await studentPostsAPI.comment(postId, { text }); if (r?.comment){ setPosts(prev => prev.map(p => p.id===postId? { ...p, comments: [...(p.comments||[]), r.comment] } : p)); } }
    catch {}
    setCommentInputs(m=>({...m,[postId]:''}));
  };

  const onToggleCommentLike = async (commentId) => {
    if (!user) { toast({ title: 'Faça login', description: 'Entre para curtir comentários.' }); return; }
    try { await studentPostsAPI.toggleCommentLike(commentId); } catch {}
    // Optimistic update: toggle like on comment or reply within posts
    setPosts(prev => prev.map(p => {
      let touched = false;
      const updatedComments = (p.comments || []).map(c => {
        if (c.id === commentId) {
          const liked = (c.liked_user_ids || []).includes(user.id);
          const likedIds = liked ? c.liked_user_ids.filter(x => x !== user.id) : [ ...(c.liked_user_ids || []), user.id ];
          touched = true;
          return { ...c, liked_user_ids: likedIds, likes_count: Math.max(0, (c.likes_count || 0) + (liked ? -1 : 1)) };
        }
        // check replies
        const updatedReplies = (c.replies || []).map(r => {
          if (r.id === commentId) {
            const likedR = (r.liked_user_ids || []).includes(user.id);
            const likedIdsR = likedR ? r.liked_user_ids.filter(x => x !== user.id) : [ ...(r.liked_user_ids || []), user.id ];
            touched = true;
            return { ...r, liked_user_ids: likedIdsR, likes_count: Math.max(0, (r.likes_count || 0) + (likedR ? -1 : 1)) };
          }
          return r;
        });
        if (updatedReplies !== c.replies) return { ...c, replies: updatedReplies };
        return c;
      });
      return touched ? { ...p, comments: updatedComments } : p;
    }));
  };

  const onAddReply = async (postId, parentId) => {
    if (!user) { toast({ title: 'Faça login', description: 'Entre para responder.' }); return; }
    const text = (replyInputs[parentId] || '').trim();
    if (!text) return;
    try { const r = await studentPostsAPI.comment(postId, { text, parent_id: parentId }); if (r?.comment){ setReplyInputs(m=>({...m,[parentId]: ''})); } }
    catch {}
  };

  const onShare = async (postId) => {
    const url = `${window.location.origin}/profile?post=${postId}`;
    try {
      if (navigator.share) { await navigator.share({ title: 'Publicação do aluno', url }); }
      else { await navigator.clipboard.writeText(url); toast({ title: 'Link copiado', description: 'URL da publicação copiada.' }); }
    } catch {}
  };

  const onDeletePost = async (postId, authorId) => {
    if (!user || user.id !== authorId) return;
    try { await studentPostsAPI.remove(postId); } catch {}
    setPosts(prev => prev.filter(p => p.id !== postId));
    toast({ title: 'Publicação removida' });
  };

  const handleSave = async () => {
    try {
      // Validate phone before sending to backend using shared validator
      if (profile.phone && !validatePhoneFormat(profile.phone)) {
        toast({ title: 'Telefone inválido', description: 'Informe um telefone com DDD, ex: (11) 99999-9999 ou +5511999999999', variant: 'destructive' });
        return;
      }

      if (id && user && user.type === 'school') {
        const payload = { name: profile.name, phone: profile.phone, cpf: profile.cpf || undefined };
        await usersAPI.update(id, payload);
        toast({ title: 'Perfil do aluno atualizado', description: 'As informações foram salvas.' });
        setIsEditing(false);
        navigate(`/alunos/${id}`);
        return;
      }

      // if editing own profile, persist to backend and refresh auth state
      if (!id && user) {
        const payload = { 
          name: profile.name, 
          phone: profile.phone, 
          cpf: profile.cpf || undefined,
          lifeStatus: profile.life_status || undefined,
          linkedinUrl: profile.linkedin_url || undefined,
          instagramUrl: profile.instagram_url || undefined,
          githubUrl: profile.github_url || undefined,
          customUrl: profile.custom_url || undefined
        };
        await usersAPI.update(user.id, payload);
        // refresh auth context and localStorage
        try {
          if (updateUser) await updateUser();
        } catch (e) {
          // best-effort
          console.warn('Falha ao atualizar AuthContext após salvar perfil:', e);
        }
      }

      toast({ title: 'Perfil salvo', description: 'Alterações salvas.' });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-8">Carregando...</div>;

  return (
  <>
    <Helmet>
      <title>Perfil</title>
    </Helmet>
    <div className="min-h-screen bg-slate-50/80">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header com fundo azul grande */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-[30px] p-8 shadow-lg">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Perfil do Aluno
            </h1>
          </div>
        </div>

          {/* Avatar - escola pode editar; empresa/admin apenas visualiza */}
          {/* REMOVIDO - Integrado ao card de Informações Pessoais */}

        <div className="space-y-6">
          {/* Seção do Perfil Visual - estilo da imagem antiga */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="flex flex-col md:flex-row gap-8 p-8">
              {/* Coluna esquerda: Avatar + Nome + Classe + Redes + Botão */}
              <div className="flex flex-col items-center md:items-start md:w-1/3">
                {/* Avatar grande e destacado */}
                <div className="relative">
                  <div className={`w-48 h-48 overflow-hidden ${avatarShape === 'circle' ? 'rounded-full' : 'rounded-2xl'} bg-gradient-to-br from-blue-100 to-blue-50 border-4 border-white shadow-lg flex items-center justify-center`}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-24 h-24 text-slate-300" />
                    )}
                  </div>
                  {/* Badge/logo pequeno */}
                  {profile.school_avatar && (
                    <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white rounded-full border-4 border-white shadow-md overflow-hidden">
                      <img src={profile.school_avatar} alt="school" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Nome grande */}
                <h2 className="mt-8 text-3xl font-bold text-slate-900 text-center md:text-left">{profile.name || '—'}</h2>
                
                {/* Classe */}
                {profile.class_name && (
                  <p className="mt-2 text-lg text-slate-600 font-medium text-center md:text-left">{profile.class_name}</p>
                )}

                {/* Avatar controls when allowed */}
                {((user && user.type === 'candidate' && !id) || (user && user.type === 'school' && id)) && (
                  <div className="mt-6 w-full max-w-xs">
                    <input type="file" accept="image/*" onChange={onSelectAvatar} className="hidden" id="avatar-input" />
                    <label htmlFor="avatar-input" className="cursor-pointer inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition font-medium">
                      <ImagePlus className="w-4 h-4" /> Escolher imagem
                    </label>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => handleSetShape('circle')} className={`flex-1 px-3 py-1 text-sm rounded-lg transition font-medium ${avatarShape==='circle'?'bg-blue-600 text-white':'bg-slate-100 hover:bg-slate-200'}`}>Círculo</button>
                      <button onClick={() => handleSetShape('square')} className={`flex-1 px-3 py-1 text-sm rounded-lg transition font-medium ${avatarShape==='square'?'bg-blue-600 text-white':'bg-slate-100 hover:bg-slate-200'}`}>Quadrado</button>
                    </div>
                    {cropImage && (
                      <div className="mt-4">
                        <ImageCropper src={cropImage} onCrop={(dataUrl) => { setNewAvatar(dataUrl); setCropImage(null); }} />
                        <div className="flex gap-2 mt-3">
                          <Button onClick={() => setCropImage(null)}>Cancelar</Button>
                          <Button onClick={onUploadAvatar} disabled={avatarUploading}>{avatarUploading ? 'Enviando...' : 'Salvar foto'}</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Redes sociais */}
                <div className="mt-6 flex gap-3 justify-center md:justify-start">
                  {profile.instagram_url && (
                    <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white hover:shadow-lg transition">
                      <Instagram className="w-7 h-7" />
                    </a>
                  )}
                  {profile.linkedin_url && (
                    <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-full bg-blue-700 flex items-center justify-center text-white hover:shadow-lg transition">
                      <Linkedin className="w-7 h-7" />
                    </a>
                  )}
                  {profile.custom_url && (
                    <a href={profile.custom_url} target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white hover:shadow-lg transition">
                      <MessageSquare className="w-7 h-7" />
                    </a>
                  )}
                </div>

                {/* Botão Adicionar aos contatos */}
                <Button className="mt-6 w-full max-w-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold text-base py-3">
                  💬 Adicionar aos contatos
                </Button>
              </div>

              {/* Coluna direita: Cards de informações */}
              <div className="flex-1 grid grid-cols-1 gap-4">
                {/* EMAIL */}
                <div className="border-l-4 border-teal-500 bg-teal-50 p-5 rounded-lg hover:shadow-md transition">
                  <div className="flex items-center gap-3 mb-2">
                    <Mail className="w-6 h-6 text-teal-600" />
                    <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Email</span>
                  </div>
                  <p className="text-slate-800 font-semibold ml-9">{profile.email || '—'}</p>
                </div>

                {/* TELEFONE */}
                <div className="border-l-4 border-orange-500 bg-orange-50 p-5 rounded-lg hover:shadow-md transition">
                  <div className="flex items-center gap-3 mb-2">
                    <Phone className="w-6 h-6 text-orange-600" />
                    <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Telefone</span>
                  </div>
                  <p className="text-slate-800 font-semibold ml-9">{profile.phone || '—'}</p>
                </div>

                {/* TURMA */}
                <div className="border-l-4 border-yellow-500 bg-yellow-50 p-5 rounded-lg hover:shadow-md transition">
                  <div className="flex items-center gap-3 mb-2">
                    <GraduationCap className="w-6 h-6 text-yellow-600" />
                    <span className="text-xs font-bold text-yellow-700 uppercase tracking-wider">Turma</span>
                  </div>
                  <p className="text-slate-800 font-semibold ml-9">{profile.class_name || '—'}</p>
                </div>

                {/* SITUAÇÃO */}
                <div className="border-l-4 border-purple-500 bg-purple-50 p-5 rounded-lg hover:shadow-md transition">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="w-6 h-6 text-purple-600" />
                    <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Situação</span>
                  </div>
                  <p className="text-slate-800 font-semibold ml-9">{profile.life_status || 'Não informado'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card de Formação em destaque */}
          {profileSections.education && profileSections.education.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md p-8 border-l-4 border-teal-500">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-6 h-6 text-teal-600" />
                <h3 className="text-lg font-bold text-slate-900">Formação</h3>
              </div>
              <div className="space-y-3">
                {profileSections.education.map((edu, idx) => (
                  <div key={edu.id || idx} className="text-slate-700">
                    <p className="font-semibold">{edu.school || edu.name || '—'}</p>
                    {edu.description && (
                      <p className="text-sm text-slate-600 mt-1">{edu.description}</p>
                    )}
                    {edu.period && (
                      <p className="text-xs text-slate-500 mt-1">{edu.period}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.resumes}</p>
              <p className="text-sm text-slate-600 mt-1">Currículos</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.applications}</p>
              <p className="text-sm text-slate-600 mt-1">Candidaturas</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{views.count}</p>
              <p className="text-sm text-slate-600 mt-1">Visualizações</p>
            </div>
          </div>

          {/* Dados Pessoais - Expandível */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <div className="flex items-center justify-between mb-6 cursor-pointer hover:bg-slate-50 p-2 -m-2 rounded" onClick={() => setEditingSections(prev => ({...prev, personal: !prev.personal}))}>
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-slate-600" />
                <h3 className="text-lg font-bold text-slate-900">Dados Pessoais</h3>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-600 transition ${editingSections.personal ? 'rotate-180' : ''}`} />
            </div>

            {editingSections.personal && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label>Nome</Label>
                    <Input value={profile.name} onChange={e => setProfile(prev=>({...prev, name: e.target.value}))} disabled={!isEditing} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={profile.email} disabled />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={profile.phone} onChange={e=> setProfile(prev=>({...prev, phone: e.target.value}))} disabled={!isEditing} />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input value={profile.cpf} onChange={e=> setProfile(prev=>({...prev, cpf: e.target.value}))} disabled={!isEditing} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Sobre</Label>
                    <Textarea value={profile.life_status} onChange={e => setProfile(prev=>({...prev, life_status: e.target.value}))} disabled={!isEditing} rows={4} />
                  </div>
                </div>

                <div className="flex gap-2">
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">Editar perfil</Button>
                  ) : (
                    <>
                      <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
                      <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Seções do Currículo - Resumido */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <div className="flex items-center gap-3 mb-6">
              <Briefcase className="w-6 h-6 text-slate-600" />
              <h3 className="text-lg font-bold text-slate-900">Seções do Currículo</h3>
            </div>
            <div className="space-y-3">
              {['education','experiences','projects','courses','languages'].map(section => (
                <div key={section} className="border rounded-lg p-4 hover:bg-slate-50 transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <strong className="capitalize text-slate-900">{section === 'education' ? 'Educação' : section === 'experiences' ? 'Experiências' : section === 'projects' ? 'Projetos' : section === 'courses' ? 'Cursos' : 'Idiomas'}</strong>
                      <p className="text-sm text-slate-600 mt-1">
                        {profileSections[section]?.length || 0} item{profileSections[section]?.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => toggleSection(section)} variant="outline">
                        {expandedSections[section] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" onClick={() => toggleEditSection(section)} className="bg-blue-600 hover:bg-blue-700">
                        {editingSections[section] ? 'Salvar' : 'Editar'}
                      </Button>
                    </div>
                  </div>
                  {expandedSections[section] && (
                    <div className="mt-4">
                      {(profileSections[section] || []).map(item => (
                        <div key={item.id} className="p-3 border-b last:border-b-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-sm font-medium text-slate-900">{item.title || item.name || item.company || item.school || '—'}</div>
                              <div className="text-xs text-slate-500 mt-1">{item.period || item.institution || ''}</div>
                              {item.description && <div className="text-xs text-slate-600 mt-1">{item.description}</div>}
                            </div>
                            {editingSections[section] && (
                              <Button size="sm" onClick={() => removeItem(section, item.id)} variant="destructive">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {editingSections[section] && (
                        <div className="mt-3 pt-3 border-t">
                          <Button size="sm" onClick={() => addItem(section)} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-1" /> Adicionar
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Publicações */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <div className="flex items-center gap-3 mb-6">
              <MessageCircle className="w-6 h-6 text-slate-600" />
              <h3 className="text-lg font-bold text-slate-900">Publicações</h3>
            </div>
            
            {user?.type === 'candidate' && (
              <div className="mb-6 space-y-3">
                <textarea 
                  value={postCaption} 
                  onChange={e=>setPostCaption(e.target.value)} 
                  placeholder="O que você quer compartilhar?" 
                  rows={3}
                  className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showPostForm && (
                  <div className="border rounded-lg p-4 bg-slate-50">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Selecione imagens</label>
                    <input type="file" accept="image/*" multiple onChange={onSelectImage} className="block w-full text-sm text-slate-600" />
                    {postImages.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {postImages.map((img, i) => (
                          <div key={i} className="relative">
                            <img src={img} alt={`preview-${i}`} className="w-full h-20 object-cover rounded" />
                            <button onClick={() => removePostImage(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => setShowPostForm(s => !s)} variant="outline">
                    {showPostForm ? 'Fechar' : 'Adicionar imagens'}
                  </Button>
                  <Button onClick={onPublish} disabled={creatingPost} className="bg-blue-600 hover:bg-blue-700">
                    {creatingPost ? 'Publicando...' : 'Publicar'}
                  </Button>
                </div>
              </div>
            )}

            {/* Posts Feed */}
            <div className="space-y-4">
              {posts.length === 0 ? (
                <p className="text-center text-slate-600 py-8">Nenhuma publicação ainda</p>
              ) : (
                posts.map(post => (
                  <div key={post.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-slate-900">{post.author_name || profile.name}</div>
                        <div className="text-xs text-slate-500">{new Date(post.created_at || post.created || Date.now()).toLocaleDateString('pt-BR')}</div>
                      </div>
                      {user && post.author_id === user.id && (
                        <Button size="sm" variant="destructive" onClick={() => onDeletePost(post.id, post.author_id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {post.caption && <p className="text-slate-800 mb-3">{post.caption}</p>}
                    {(post.images || []).length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {post.images.map((img, i) => (
                          <img key={i} src={img} alt={`img-${i}`} className="w-full h-24 object-cover rounded" />
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3 text-sm">
                      <button onClick={() => onToggleLike(post.id)} className={`flex items-center gap-1 ${(post.likes||[]).includes(user?.id) ? 'text-red-500' : 'text-slate-600 hover:text-red-500'}`}>
                        <Heart className="w-4 h-4" /> {(post.likes || []).length}
                      </button>
                      <button className="flex items-center gap-1 text-slate-600 hover:text-blue-500">
                        <MessageCircle className="w-4 h-4" /> {(post.comments || []).length}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
  );
};

export default Profile;
