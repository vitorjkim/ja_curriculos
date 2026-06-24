import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { 
  MapPin, 
  DollarSign, 
  Calendar, 
  Phone, 
  Mail, 
  Briefcase, 
  Send, 
  MessageCircle, 
  Edit, 
  MoreVertical, 
  Eye, 
  Trash2,
  Clock,
  Users,
  Award,
  Building,
  Building2,
  CheckCircle,
  AlertCircle,
  UserPlus,
  UserMinus,
  ImagePlus,
  ChevronsRight,
  Layers,
  Heart,
  Share2,
  Plus,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { usersAPI, jobsAPI, resumesAPI, applicationsAPI, chatAPI, studentPostsAPI } from '@/lib/api';
import { stripHtml } from '@/lib/utils';
import ImageCropper from '@/components/ImageCropper';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import VerifiedBadge from '@/components/VerifiedBadge';
import PartnershipButton from '@/components/PartnershipButton';

const CompanyProfile = () => {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [userResumes, setUserResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showDropdown, setShowDropdown] = useState(null); // null quando fechado, jobId quando aberto
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  // Avatar
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [newAvatar, setNewAvatar] = useState(null);
  const [rawAvatar, setRawAvatar] = useState(null); // imagem original para crop
  const [showCropper, setShowCropper] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropShape, setCropShape] = useState(() => {
    try { return localStorage.getItem('company_avatar_shape_'+(id||'')) || 'circle'; } catch { return 'circle'; }
  });
  
  // Posts (publicações da empresa)
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [postImage, setPostImage] = useState(null);
  const [postCaption, setPostCaption] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  
  // Helper: get cached company image from localStorage fallbacks
  const getCachedCompanyImage = (companyId) => {
    try {
      const logos = JSON.parse(localStorage.getItem('curriculoja_company_logos') || '{}');
      if (logos && logos[String(companyId)]) return logos[String(companyId)];
    } catch {}
    try {
      // As a secondary fallback, try cached users list
      const usersLS = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
      const found = Array.isArray(usersLS) ? usersLS.find(u => String(u.id) === String(companyId)) : null;
      if (found) return found.profileImage || found.profile_image || null;
    } catch {}
    return null;
  };

  useEffect(() => {
    console.log('=== COMPONENTE COMPANYPROFILE CARREGADO ===');
    console.log('User atual:', user);
    console.log('ID da empresa visitada:', id);
    console.log('É empresa própria?', user && user.id === id);
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Carregar dados da empresa via API
        console.log('🏢 Carregando empresa ID:', id);
        const companyResponse = await usersAPI.getCompany(id);
        console.log('✅ Empresa carregada:', companyResponse);
  setCompany(companyResponse.company);
  
  // Atualizar formato do avatar a partir da API
  if (companyResponse?.company?.avatar_shape) {
    setCropShape(companyResponse.company.avatar_shape);
  } else {
    // Fallback: tentar buscar em localStorage
    try {
      const storedShape = localStorage.getItem('company_avatar_shape_'+(id||''));
      if (storedShape) setCropShape(storedShape);
    } catch {}
  }
  
  // Avatar atual se existir (suporta profile_image ou profileImage)
  const img = companyResponse?.company?.profileImage || companyResponse?.company?.profile_image || null;
  if (img) {
    setAvatarUrl(img);
  } else {
    // Fallback: tentar buscar em localStorage
    const cached = getCachedCompanyImage(id);
    if (cached) setAvatarUrl(cached);
  }

        // Carregar vagas da empresa via API
        console.log('💼 Carregando vagas da empresa...');
        const jobsResponse = await jobsAPI.list({ company_id: id });
        console.log('✅ Vagas carregadas:', jobsResponse);
        setJobs(jobsResponse.jobs || []);

        // Carregar candidaturas APENAS se usuário estiver autenticado como empresa
        if (user && user.type === 'company' && user.id === id) {
          try {
            console.log('📊 Carregando candidaturas da empresa...');
            const applicationsResponse = await applicationsAPI.getCompanyApplications();
            console.log('✅ Candidaturas carregadas:', applicationsResponse);
            setApplications(applicationsResponse.applications || []);
          } catch (error) {
            console.log('⚠️ Erro ao carregar candidaturas:', error);
            setApplications([]);
          }
        }

        // Carregar currículos APENAS se usuário estiver autenticado como candidato
        if (user && user.type !== 'company') {
          try {
            console.log('📄 Carregando currículos do candidato...');
            const resumesResponse = await resumesAPI.list();
            console.log('✅ Currículos carregados:', resumesResponse);
            setUserResumes(resumesResponse.resumes || []);

            // Verificar se candidato já segue esta empresa
            console.log('👥 Verificando status de seguimento...');
            const followStatus = await chatAPI.getFollowStatus(id);
            console.log('✅ Status de seguimento:', followStatus);
            setIsFollowing(followStatus.isFollowing);
          } catch (error) {
            console.log('⚠️ Erro ao carregar currículos:', error);
            setUserResumes([]);
          }
        }

      } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        toast({
          title: 'Erro ao carregar dados da empresa',
          description: 'Não foi possível carregar as informações da empresa. Verifique sua conexão.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id, user]);

  // Função para carregar publicações da empresa
  const loadCompanyPosts = async () => {
    if (!id) {
      console.log('❌ loadCompanyPosts - ID não definido');
      return;
    }
    try {
      setPostsLoading(true);
      console.log('📷 [DEBUG] loadCompanyPosts iniciando...');
      console.log('📷 [DEBUG] ID da empresa para buscar posts:', id);
      console.log('📷 [DEBUG] Tipo do ID:', typeof id);
      const response = await studentPostsAPI.list(id);
      console.log('📷 [DEBUG] Resposta da API studentPosts:', response);
      console.log('📷 [DEBUG] Posts retornados:', response.posts?.length || 0);
      const rawPosts = response.posts || [];
      if (rawPosts.length > 0) {
        console.log('📷 [DEBUG] Primeiro post:', rawPosts[0]);
      }

      // Normalizar propriedades para garantir consistência na UI
      const normalized = rawPosts.map(p => {
        const likesCount = p.likesCount ?? p.likes_count ?? (Array.isArray(p.likes) ? p.likes.length : (typeof p.likes === 'number' ? p.likes : 0));
        const commentsCount = p.commentsCount ?? p.comments_count ?? (Array.isArray(p.comments) ? p.comments.length : (typeof p.comments === 'number' ? p.comments : 0));
        return {
          ...p,
          likesCount,
          commentsCount,
          likes: Array.isArray(p.likes) ? p.likes : (p.likes_count ? [] : (p.likesCount ? [] : []))
        };
      });

      setPosts(normalized);
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao carregar publicações:', error);
      console.error('❌ [DEBUG] Error message:', error.message);
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  // Carregar posts quando a empresa for carregada
  useEffect(() => {
    if (company) {
      console.log('🏢 Empresa carregada, carregando posts...');
      loadCompanyPosts();
    }
  }, [company]);

  // Criar nova publicação
  const handleCreatePost = async () => {
    if (!user || user.type !== 'company' || user.id !== id) {
      toast({
        title: 'Não autorizado',
        description: 'Você precisa estar logado como esta empresa para criar publicações.',
        variant: 'destructive'
      });
      return;
    }
    if (!postImage) {
      toast({
        title: 'Imagem obrigatória',
        description: 'Adicione uma imagem para publicar.',
        variant: 'destructive'
      });
      return;
    }
    try {
      setCreatingPost(true);
      await studentPostsAPI.create({ image: postImage, caption: postCaption.trim() });
      toast({ title: 'Publicado!', description: 'Sua publicação foi criada com sucesso.' });
      setShowCreatePostModal(false);
      setPostImage(null);
      setPostCaption('');
      await loadCompanyPosts();
    } catch (error) {
      console.error('Erro ao criar publicação:', error);
      toast({
        title: 'Erro ao publicar',
        description: error.message || 'Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setCreatingPost(false);
    }
  };

  // Toggle like em post
  const handleToggleLike = async (postId) => {
    if (!user) {
      toast({ title: 'Faça login', description: 'Entre para curtir publicações.' });
      return;
    }
    try {
      await studentPostsAPI.toggleLike(postId);
      await loadCompanyPosts();
    } catch (error) {
      console.error('Erro ao curtir:', error);
    }
  };

  // Deletar post
  const handleDeletePost = async (postId) => {
    if (!user || user.type !== 'company' || user.id !== id) return;
    if (!confirm('Deseja excluir esta publicação?')) return;
    try {
      await studentPostsAPI.remove(postId);
      toast({ title: 'Publicação excluída' });
      await loadCompanyPosts();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    }
  };

  // Selecionar imagem para post
  const handleSelectPostImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande', description: 'Máximo 5MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPostImage(reader.result);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (company) {
      setEditForm({
        companyName: company.company_name || '',
        phone: company.phone || '',
        location: company.location || '',
        bio: company.bio || '',
        companySector: company.company_sector || '',
        companySize: company.company_size || ''
      });
    }
  }, [company]);

  // Atualizar forma quando mudar o id (ex.: navegar entre empresas)
  useEffect(() => {
    try { setCropShape(localStorage.getItem('company_avatar_shape_'+(id||'')) || 'circle'); } catch {}
  }, [id]);

  // Ouvir atualizações globais do avatar da empresa para refletir em tempo real
  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {};
      if (String(detail.companyId) === String(id) && detail.image) {
        setAvatarUrl(detail.image);
      }
    };
    try { window.addEventListener('company-avatar-updated', handler); } catch {}
    return () => { try { window.removeEventListener('company-avatar-updated', handler); } catch {} };
  }, [id]);

  // Selecionar novo avatar (empresa própria)
  const onSelectAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxBytes = 3 * 1024 * 1024; // 3MB
    if (file.size > maxBytes) {
      toast({ title: 'Imagem muito grande', description: 'Envie uma imagem de até 3MB.', variant: 'destructive' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Selecione um arquivo de imagem (JPEG, PNG, etc).', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setRawAvatar(reader.result); setShowCropper(true); };
    reader.readAsDataURL(file);
  };

  // Enviar avatar (empresa própria)
  const onUploadAvatar = async () => {
    if (!user || user.type !== 'company' || user.id !== id) return;
    if (!newAvatar || typeof newAvatar !== 'string' || !newAvatar.startsWith('data:image/')) {
      toast({ title: 'Selecione uma imagem', description: 'Escolha uma imagem para enviar.' });
      return;
    }
    try {
      setAvatarUploading(true);
      const resp = await usersAPI.uploadAvatar(user.id, newAvatar);
      const url = resp?.profileImage || newAvatar;
      setAvatarUrl(url);
      setNewAvatar(null);
      // Atualizar localStorage (modo offline) para que listas usem a imagem imediatamente
      try {
        const usersLS = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
        const idx = usersLS.findIndex(u => String(u.id) === String(user.id));
        if (idx !== -1) {
          usersLS[idx] = { ...usersLS[idx], profileImage: url, profile_image: url };
          localStorage.setItem('curriculoja_users', JSON.stringify(usersLS));
        }
      } catch {}
      // Disparar evento para outras telas atualizarem a logo em tempo real
      try { window.dispatchEvent(new CustomEvent('company-avatar-updated', { detail: { companyId: user.id, image: url } })); } catch {}
      try { if (updateUser) await updateUser(); } catch {}
      toast({ title: 'Foto da empresa atualizada' });
    } catch (e) {
      toast({ title: 'Erro ao enviar avatar', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setAvatarUploading(false);
    }
  };

  // Toggle shape (no cropper)
  const persistShape = (shape) => {
    setCropShape(shape);
    try { localStorage.setItem('company_avatar_shape_'+(id||''), shape); } catch {}
  };

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(null);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Função para contar candidaturas corretamente
  const getJobApplicationsCount = (jobId) => {
    // Se não há candidaturas carregadas, retornar 0
    if (!Array.isArray(applications)) return 0;
    
    // Contar usando job_id (campo correto da API)
    return applications.filter(app => app.job_id === jobId).length;
  };

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

    const handleSendResume = async (jobId) => {
    // Verificar se usuário está autenticado
    if (!user || user.type === 'company') {
      toast({
        title: 'Faça login como candidato',
        description: 'Você precisa estar logado como candidato para enviar currículos.',
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }

    if (!userResumes || userResumes.length === 0) {
      toast({
        title: 'Nenhum currículo encontrado',
        description: 'Você precisa criar um currículo antes de enviar.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Usar API para criar candidatura
      await applicationsAPI.create({
        job_id: jobId,
        resume_id: userResumes[0].id
      });

      toast({
        title: 'Currículo enviado com sucesso!',
        description: 'Sua candidatura foi registrada. A empresa entrará em contato em breve.'
      });
    } catch (error) {
      console.error('Erro ao enviar currículo:', error);
      toast({
        title: 'Erro ao enviar currículo',
        description: 'Não foi possível enviar sua candidatura. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  const handleAskQuestion = (jobId) => {
    toast({
      title: '🚧 Esta funcionalidade ainda não foi implementada—mas não se preocupe! Você pode solicitá-la no seu próximo prompt! 🚀'
    });
  };

  const handleFollowCompany = async () => {
    if (!user || user.type !== 'candidate') {
      toast({
        title: 'Faça login como candidato',
        description: 'Você precisa estar logado como candidato para seguir empresas.',
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }

    try {
      setFollowLoading(true);
      if (isFollowing) {
        await chatAPI.unfollowCompany(id);
        setIsFollowing(false);
        toast({
          title: 'Parou de seguir',
          description: 'Você parou de seguir esta empresa.'
        });
      } else {
        await chatAPI.followCompany(id);
        setIsFollowing(true);
        toast({
          title: 'Seguindo empresa!',
          description: 'Agora você pode trocar mensagens com esta empresa. Acesse "Mensagens" no menu.'
        });
      }
    } catch (error) {
      console.error('Erro ao seguir/deixar de seguir empresa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status de seguimento.',
        variant: 'destructive'
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    // Verificar se usuário está autenticado
    if (!user || user.type !== 'company' || user.id !== id) {
      toast({
        title: 'Não autorizado',
        description: 'Você precisa estar logado como empresa para editar o perfil.',
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        companyName: editForm.companyName,
        phone: editForm.phone,
        location: editForm.location,
        bio: editForm.bio,
        companySector: editForm.companySector || undefined,
        companySize: editForm.companySize || undefined
      };

      const response = await usersAPI.update(id, payload);
      console.log('📝 Resposta da API update:', response);
      
      // A API retorna o usuário atualizado dentro de response.user
      const updatedCompany = response.user;
      console.log('✅ Dados atualizados:', updatedCompany);
      
      // Atualizar o estado com os dados corretos - manter a estrutura original
      setCompany(prevCompany => ({
        ...prevCompany,
        company_name: updatedCompany.companyName || updatedCompany.company_name,
        phone: updatedCompany.phone,
        location: updatedCompany.location,
        bio: updatedCompany.bio,
        company_sector: updatedCompany.companySector || updatedCompany.company_sector,
        company_size: updatedCompany.companySize || updatedCompany.company_size
      }));
      
      setIsEditing(false);
      toast({ title: 'Perfil atualizado', description: 'As informações da empresa foram salvas.' });
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar o perfil.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = () => {
    // Navegar para visualização pública do perfil - força reload
    window.open(`/company/${id}`, '_blank');
  };

  const handleDeleteProfile = async () => {
    // Verificar se usuário está autenticado
    if (!user || user.type !== 'company' || user.id !== id) {
      toast({
        title: 'Não autorizado',
        description: 'Você precisa estar logado como empresa para excluir o perfil.',
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }

    if (!confirm('Tem certeza de que deseja excluir seu perfil da empresa? Esta ação não pode ser desfeita e excluirá todas as vagas e candidaturas associadas.')) {
      return;
    }

    try {
      setLoading(true);
      // Usar a rota específica para deletar próprio perfil
      await usersAPI.deleteProfile();
      toast({
        title: 'Perfil excluído',
        description: 'O perfil da empresa foi excluído com sucesso.'
      });
      // Limpar dados de autenticação
      localStorage.removeItem('curriculoja_token');
      localStorage.removeItem('curriculoja_user');
      navigate('/');
    } catch (error) {
      console.error('Erro ao excluir perfil:', error);
      toast({
        title: 'Erro ao excluir perfil',
        description: 'Não foi possível excluir o perfil. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Tem certeza de que deseja excluir esta vaga? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setLoading(true);
      await jobsAPI.delete(jobId);
      
      // Atualizar a lista de vagas removendo a vaga excluída
      setJobs(jobs.filter(job => job.id !== jobId));
      
      toast({
        title: 'Vaga excluída',
        description: 'A vaga foi excluída com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao excluir vaga:', error);
      toast({
        title: 'Erro ao excluir vaga',
        description: 'Não foi possível excluir a vaga. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/80 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-blue-600"></div>
          <span className="text-sm font-medium">Carregando empresa...</span>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50/80 flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-sm border-2 border-slate-200 rounded-[22px] p-8 shadow-[0_18px_45px_rgba(15,23,42,0.06)] text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="text-slate-600 font-medium">Empresa não encontrada.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{company?.company_name || company?.name || 'Empresa'} - CurrículoJá</title>
        <meta name="description" content={`Conheça ${company?.company_name || company?.name || 'a empresa'} e veja as vagas disponíveis.`} />
      </Helmet>

      <div className="min-h-screen bg-slate-50/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Company Header - Mesmo estilo do CompanySchoolProfile */}
            <div className="bg-white/95 backdrop-blur-sm border-2 border-slate-200 rounded-[20px] sm:rounded-[24px] p-4 sm:p-8 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              {/* Header da Empresa */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-5 sm:mb-6">
                <div className="flex items-center gap-3 sm:gap-5">
                  {(() => {
                    const displayImage = newAvatar || avatarUrl || ((user && user.type === 'company' && String(user.id) === String(id)) ? (user.profileImage || user.profile_image) : null);
                    const isCircle = cropShape === 'circle';
                    return (
                      <div className={`w-16 h-16 sm:w-20 sm:h-20 overflow-hidden flex items-center justify-center ${isCircle ? 'rounded-full' : 'rounded-xl'}`}>
                        {displayImage ? (
                          <img src={displayImage} alt="Logo da empresa" className={`w-full h-full ${isCircle ? 'object-cover rounded-full' : 'object-contain rounded-xl'}`} />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ${isCircle ? 'rounded-full' : 'rounded-xl'}`}>
                            <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div>
                    <h1 className="text-xl sm:text-[2rem] font-bold text-slate-900 tracking-tight leading-tight">{company?.company_name || 'Nome da empresa'}</h1>
                    <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2">
                      <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-slate-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                        {company.location || 'Brasil'}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:mt-3">
                      {company.company_sector && (
                        <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-50 border border-blue-200">
                          <Building className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
                          <span className="text-[10px] sm:text-xs text-blue-700 font-bold uppercase tracking-wide">{company.company_sector}</span>
                        </div>
                      )}
                      {/* Upload de imagem inline (só para o dono) */}
                      {user && user.type === 'company' && user.id === company.id && (
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-full cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all">
                            <ImagePlus className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs text-slate-600 font-medium">Alterar Logo</span>
                            <input type="file" accept="image/*" className="hidden" onChange={onSelectAvatar} />
                          </label>
                          {newAvatar && (
                            <>
                              <Button onClick={onUploadAvatar} disabled={avatarUploading} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-full font-medium h-auto">
                                {avatarUploading ? 'Salvando...' : 'Salvar'}
                              </Button>
                              <button type="button" onClick={() => setNewAvatar(null)} className="text-xs text-slate-500 hover:text-slate-700 font-medium">
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  {user && user.type === 'company' && user.id === company.id ? (
                    isEditing ? (
                      <>
                        <Button onClick={handleSaveProfile} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-[12px] font-semibold text-sm">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Salvar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            setEditForm({
                              companyName: company.company_name || '',
                              phone: company.phone || '',
                              location: company.location || '',
                              bio: company.bio || '',
                              companySector: company.company_sector || '',
                              companySize: company.company_size || ''
                            });
                          }}
                          className="border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-[12px] font-semibold text-sm"
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-[12px] font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-[1px]">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Perfil
                      </Button>
                    )
                  ) : user && user.type === 'candidate' ? (
                    <>
                      <Button 
                        onClick={handleFollowCompany}
                        disabled={followLoading}
                        className={`px-5 py-2.5 rounded-[12px] font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-[1px] ${isFollowing ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'}`}
                      >
                        {followLoading ? (
                          <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : isFollowing ? (
                          <UserMinus className="w-4 h-4 mr-2" />
                        ) : (
                          <UserPlus className="w-4 h-4 mr-2" />
                        )}
                        {isFollowing ? 'Adicionado' : 'Adicionar aos Contatos'}
                      </Button>
                      {isFollowing && (
                        <Button 
                          onClick={() => navigate('/my-messages')}
                          variant="outline"
                          className="border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-[12px] font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[1px]"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Ir às Mensagens
                        </Button>
                      )}
                    </>
                  ) : user?.type === 'school' ? (
                    <PartnershipButton 
                      userType="school"
                      targetId={id}
                      targetName={company?.companyName || company?.name}
                    />
                  ) : !user ? (
                    <Button onClick={() => navigate('/login')} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-[12px] font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-[1px]">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Adicionar aos Contatos
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Informações da Empresa - Accordion Style */}
              {isEditing ? (
                <div className="bg-slate-50/80 rounded-[16px] p-6 border-2 border-slate-200">
                  <div className="space-y-4">
                    <Input value={editForm.companyName} onChange={(e) => handleEditChange('companyName', e.target.value)} placeholder="Nome da empresa" className="border-2 border-slate-200 focus:border-blue-400 rounded-[12px]" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input value={editForm.phone} onChange={(e) => handleEditChange('phone', e.target.value)} placeholder="Telefone" className="border-2 border-slate-200 focus:border-blue-400 rounded-[12px]" />
                      <Input value={editForm.location} onChange={(e) => handleEditChange('location', e.target.value)} placeholder="Localização" className="border-2 border-slate-200 focus:border-blue-400 rounded-[12px]" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input value={editForm.companySector} onChange={(e) => handleEditChange('companySector', e.target.value)} placeholder="Setor (ex: Tecnologia, Saúde)" className="border-2 border-slate-200 focus:border-blue-400 rounded-[12px]" />
                      <Input value={editForm.companySize} onChange={(e) => handleEditChange('companySize', e.target.value)} placeholder="Tamanho (ex: Pequena, Média, Grande)" className="border-2 border-slate-200 focus:border-blue-400 rounded-[12px]" />
                    </div>
                    <Textarea value={editForm.bio} onChange={(e) => handleEditChange('bio', e.target.value)} placeholder="Descrição da empresa" className="border-2 border-slate-200 focus:border-blue-400 rounded-[12px] min-h-[100px]" />
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50/80 rounded-[14px] sm:rounded-[16px] p-4 sm:p-6 border-2 border-slate-200">
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                    <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Localização</div>
                        <div className="font-semibold text-slate-900 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate">{company.location || 'Brasil'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone</div>
                        <div className="text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate">{company.phone || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</div>
                        <div className="text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate">{company.email || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Building className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Setor</div>
                        <div className="text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate">{company.company_sector || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Users className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tamanho</div>
                        <div className="text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate">{company.company_size || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-rose-50 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-rose-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vagas Ativas</div>
                        <div className="text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm">{jobs.length} vaga(s)</div>
                      </div>
                    </div>
                    {company.bio && (
                      <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm col-span-2 lg:col-span-3">
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-cyan-50 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-cyan-600" />
                        </div>
                        <div>
                          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sobre a Empresa</div>
                          <div className="text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm leading-relaxed">{company.bio}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Jobs Section */}
            <div className="mt-6 sm:mt-8">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-[#2563eb]"/>
                  <span className="text-[#2563eb]">Vagas Disponíveis</span>
                </h2>
                <span className="text-[10px] sm:text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-[10px] sm:rounded-[12px] bg-blue-50 text-[#2563eb] border-2 border-blue-100 font-bold">{jobs.length} vaga(s)</span>
              </div>
              
              {jobs.length === 0 ? (
                <div className="text-xs sm:text-sm text-slate-500 bg-slate-50 rounded-[14px] sm:rounded-[16px] p-4 sm:p-5 border-2 border-slate-200 flex items-center gap-2 sm:gap-3">
                  <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400"/>
                  Nenhuma vaga publicada no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch">
                  {jobs.map((job, index) => {
                    const salaryText = (() => {
                      if (job?.salary_fixed != null && job?.salary_fixed !== '') {
                        const n = Number(job.salary_fixed);
                        if (!Number.isNaN(n)) return `R$ ${n}`;
                      }
                      let { salary_min, salary_max } = job || {};
                      if (salary_min && salary_max && Number(salary_min) > Number(salary_max)) {
                        [salary_min, salary_max] = [salary_max, salary_min];
                      }
                      if (salary_min && salary_max) {
                        if (Number(salary_min) === Number(salary_max)) return `R$ ${salary_min}`;
                        return `R$ ${salary_min} - R$ ${salary_max}`;
                      }
                      if (salary_min) return `A partir de R$ ${salary_min}`;
                      if (salary_max) return `Até R$ ${salary_max}`;
                      return null;
                    })();

                    const safeLabel = (val) => (val && val.trim && val.trim() !== '' ? val : null);
                    const getAreaLabel = (area) => {
                      const areas = {
                        'tecnologia': 'Tecnologia',
                        'saude': 'Saúde',
                        'educacao': 'Educação',
                        'administracao': 'Administração',
                        'financas': 'Finanças',
                        'marketing': 'Marketing',
                        'vendas': 'Vendas',
                        'rh': 'RH',
                        'engenharia': 'Engenharia',
                        'design': 'Design',
                        'juridico': 'Jurídico',
                        'logistica': 'Logística',
                        'outro': 'Outro'
                      };
                      return areas[area] || area;
                    };

                    return (
                      <motion.div
                        key={job.id || index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                        className="h-full"
                      >
                        <Card
                          className="shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 overflow-hidden rounded-2xl bg-white h-full min-h-[160px] flex flex-col group cursor-pointer"
                          onClick={(e) => {
                            if (e.target.closest('button') || e.target.closest('a')) return;
                            navigate(`/job/${job.id}`);
                          }}
                        >
                          <CardContent className="p-3 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 pr-4">
                                <div className="flex items-start space-x-2 mb-2">
                                  <div className={`w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden ${avatarUrl ? '' : 'bg-blue-600'}`}>
                                    {avatarUrl
                                      ? <img src={avatarUrl} alt={company?.company_name || company?.name || ''} className="w-full h-full object-cover" />
                                      : <Building className="w-4 h-4 text-white" />
                                    }
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-[15px] font-semibold text-blue-700 antialiased leading-tight line-clamp-2 group-hover:text-blue-800 group-hover:underline group-hover:decoration-2 underline-offset-2 decoration-blue-700">
                                      {job.title}
                                    </h4>
                                    <p className="text-gray-800 font-medium text-[12.5px] leading-snug line-clamp-1">
                                      {company?.company_name || company?.name}
                                    </p>
                                    {!job.is_active && (
                                      <div className="mt-1 inline-flex items-center text-[11px] font-semibold text-red-800 bg-red-200/70 px-2 py-0.5 rounded-full">
                                        Vaga Inativa
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <Link to={`/job/${job.id}`} className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-300 rounded-full h-8 px-3 text-[11px] flex items-center">
                                    <span className="mr-1">Ver</span>
                                    <ChevronsRight className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </div>

                            <div className="mb-2 min-h-[52px]">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mb-1">
                                {job.location && (
                                  <div className="flex items-center text-gray-900 bg-blue-50 px-2 py-1.5 rounded-2xl border border-blue-100 text-[12.5px]">
                                    <MapPin className="w-4 h-4 mr-1.5 text-blue-600" />
                                    <span className="font-medium truncate">{job.location}</span>
                                  </div>
                                )}
                                {salaryText && (
                                  <div className="flex items-center text-gray-900 bg-green-50 px-2 py-1.5 rounded-2xl border border-green-100 text-[12.5px]">
                                    <DollarSign className="w-4 h-4 mr-1.5 text-green-600" />
                                    <span className="font-medium">{salaryText}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1.5 text-[11.5px]">
                                {safeLabel(job.contract_type) && (
                                  <div className="inline-flex items-center text-gray-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                                    <Briefcase className="w-3 h-3 mr-1 text-purple-700" />
                                    <span className="font-medium tracking-tight">
                                      {job.contract_type === 'clt' ? 'CLT' : 
                                       job.contract_type === 'pj' ? 'PJ' : 
                                       job.contract_type === 'estagio' ? 'Estágio' : 
                                       job.contract_type === 'temporario' ? 'Temporário' : 
                                       job.contract_type.toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                {safeLabel(job.work_type) && (
                                  <div className="inline-flex items-center text-gray-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                    <Calendar className="w-3 h-3 mr-1 text-orange-600" />
                                    <span className="font-medium tracking-tight">
                                      {job.work_type === 'presencial' ? 'Presencial' : 
                                       job.work_type === 'remoto' ? 'Remoto' : 
                                       job.work_type === 'hibrido' ? 'Híbrido' : 
                                       job.work_type.charAt(0).toUpperCase() + job.work_type.slice(1)}
                                    </span>
                                  </div>
                                )}
                                {safeLabel(job.experience_level) && (
                                  <div className="inline-flex items-center text-gray-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                    <Award className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                                    <span className="font-medium tracking-tight">
                                      {job.experience_level === 'estagio' ? 'Estágio' : 
                                       job.experience_level.charAt(0).toUpperCase() + job.experience_level.slice(1)}
                                    </span>
                                  </div>
                                )}
                                {safeLabel(job.area) && (
                                  <div className="inline-flex items-center text-gray-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                                    <Layers className="w-3 h-3 mr-1 text-teal-600" />
                                    <span className="font-medium tracking-tight">{getAreaLabel(safeLabel(job.area))}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-auto pt-2 border-t border-gray-200 min-h-[36px]">
                              {job.description
                                ? <p className="text-gray-800 text-[13px] leading-snug line-clamp-2">{stripHtml(job.description)}</p>
                                : <div className="h-[24px]" aria-hidden="true"></div>}
                            </div>

                            {/* Botões de ação para empresas */}
                            {user && user.type === 'company' && user.id === company.id && (
                              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  onClick={() => navigate(`/edit-job/${job.id}`)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-7 px-3 text-[11px] flex items-center"
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Editar
                                </Button>
                                <div className="relative dropdown-container">
                                  <Button 
                                    onClick={() => setShowDropdown(showDropdown === job.id ? null : job.id)}
                                    variant="outline"
                                    className="border border-gray-200 hover:bg-gray-50 rounded-full h-7 px-3 text-[11px]"
                                  >
                                    <MoreVertical className="w-3 h-3 mr-1" />
                                    Opções
                                  </Button>
                                  {showDropdown === job.id && (
                                    <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                                      <button
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center border-b border-gray-100 font-medium text-gray-700"
                                        onClick={() => {
                                          navigate(`/job/${job.id}`);
                                          setShowDropdown(null);
                                        }}
                                      >
                                        <Eye className="w-3 h-3 mr-2 text-blue-500" />
                                        Visualizar
                                      </button>
                                      <button
                                        className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center font-medium"
                                        onClick={() => {
                                          handleDeleteJob(job.id);
                                          setShowDropdown(null);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3 mr-2" />
                                        Excluir
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {/* Contador de candidaturas */}
                                <div className="ml-auto flex items-center text-[11px] text-gray-500">
                                  <Users className="w-3 h-3 mr-1" />
                                  {(() => {
                                    const count = getJobApplicationsCount(job.id);
                                    return count === 0 ? '0 candidaturas' : 
                                           count === 1 ? '1 candidatura' : 
                                           `${count} candidaturas`;
                                  })()}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Posts Section - Publicações da Empresa */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ImagePlus className="w-5 h-5 text-purple-600"/>
                  <span className="text-purple-600">Publicações</span>
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-3.5 py-2 rounded-[12px] bg-purple-50 text-purple-600 border-2 border-purple-100 font-bold">
                    {posts.length} publicação(ões)
                  </span>
                  {user && user.type === 'company' && user.id === id && (
                    <Button
                      onClick={() => setShowCreatePostModal(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-full h-9 px-4 text-sm flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Nova Publicação
                    </Button>
                  )}
                </div>
              </div>
              
              {postsLoading ? (
                <div className="text-sm text-slate-500 bg-slate-50 rounded-[16px] p-5 border-2 border-slate-200 flex items-center gap-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-purple-600"></div>
                  Carregando publicações...
                </div>
              ) : posts.length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-50 rounded-[16px] p-5 border-2 border-slate-200 flex items-center gap-3">
                  <ImagePlus className="w-5 h-5 text-slate-400"/>
                  {user && user.type === 'company' && user.id === id 
                    ? 'Você ainda não tem publicações. Crie sua primeira!'
                    : 'Nenhuma publicação no momento.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posts.map((post, index) => {
                    const postImages = post.images || (post.image ? [post.image] : []);
                    return (
                    <motion.div
                      key={post.id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
                    >
                      {/* Imagem do post */}
                      <div 
                        className="relative aspect-square cursor-pointer"
                        style={{ borderRadius: '16px', overflow: 'hidden' }}
                        onClick={() => navigate(`/company/${id}/post/${post.id}`)}
                      >
                        {postImages.length > 0 ? (
                          <img 
                            src={postImages[0]} 
                            alt="Publicação"
                            className="w-full h-full object-cover"
                            style={{ borderRadius: '16px' }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
                            <p className="text-slate-600 text-center text-sm line-clamp-4">{post.caption || 'Sem conteúdo'}</p>
                          </div>
                        )}
                        {postImages.length > 1 && (
                          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                            +{postImages.length - 1}
                          </div>
                        )}
                      </div>
                      
                      {/* Info do post */}
                      <div className="p-3">
                        {post.caption && (
                          <p className="text-sm text-slate-700 line-clamp-2 mb-2">{post.caption}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleToggleLike(post.id)}
                              className={`flex items-center gap-1 text-sm ${
                                post.likes?.includes(user?.id) 
                                  ? 'text-red-500' 
                                  : 'text-slate-500 hover:text-red-500'
                              } transition-colors`}
                            >
                              <Heart className={`w-4 h-4 ${post.likes?.includes(user?.id) ? 'fill-current' : ''}`} />
                              {post.likesCount || 0}
                            </button>
                            <button onClick={() => navigate(`/company/${id}/post/${post.id}`)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-500 transition-colors">
                              <MessageCircle className="w-4 h-4" />
                              {post.commentsCount || 0}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            {user && user.type === 'company' && user.id === id && (
                              <button 
                                onClick={() => handleDeletePost(post.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <span className="text-xs text-slate-400">
                              {post.createdAt ? new Date(post.createdAt).toLocaleDateString('pt-BR') : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modal Criar Publicação */}
      {showCreatePostModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-[24px] w-full max-w-lg overflow-hidden shadow-2xl border-2 border-gray-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <ImagePlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Nova Publicação</h3>
                  <p className="text-xs text-slate-400">Compartilhe uma imagem com seus seguidores</p>
                </div>
              </div>
              <button
                onClick={() => { setShowCreatePostModal(false); setPostImage(null); setPostCaption(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Upload de imagem */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Imagem <span className="text-red-400">*</span>
                </label>
                {postImage ? (
                  <div className="relative rounded-2xl overflow-hidden shadow-md">
                    <img src={postImage} alt="Preview" className="w-full aspect-video object-cover" />
                    <button
                      onClick={() => setPostImage(null)}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white p-1.5 rounded-full transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                      Imagem selecionada
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all group">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center mb-3 transition-colors">
                      <ImagePlus className="w-7 h-7 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600 transition-colors">Clique para adicionar uma imagem</span>
                    <span className="text-xs text-slate-400 mt-1">PNG, JPG ou WEBP</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleSelectPostImage} />
                  </label>
                )}
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Descrição</label>
                <Textarea
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="Escreva uma descrição para sua publicação..."
                  rows={3}
                  className="w-full resize-none rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400 text-sm"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
              <Button
                onClick={() => { setShowCreatePostModal(false); setPostImage(null); setPostCaption(''); }}
                variant="outline"
                className="flex-1 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100"
                disabled={creatingPost}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreatePost}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50"
                disabled={creatingPost || !postImage}
              >
                {creatingPost ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Publicando…</span>
                ) : 'Publicar'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Visualizar Post */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPost(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img 
                src={Array.isArray(selectedPost.images) ? selectedPost.images[0] : selectedPost.images} 
                alt="Publicação"
                className="w-full max-h-[60vh] object-contain bg-black"
              />
              <button 
                onClick={() => setSelectedPost(null)}
                className="absolute top-4 right-4 bg-white/90 p-2 rounded-full hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {selectedPost.caption && (
              <div className="p-4">
                <p className="text-slate-700">{selectedPost.caption}</p>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {showCropper && rawAvatar && user?.type==='company' && user.id===company.id && (
        <ImageCropper
          imageSrc={rawAvatar}
          initialShape={cropShape}
          lockShape={false}
          previewSize={360}
          exportSize={640}
          onCancel={()=>{ setShowCropper(false); setRawAvatar(null); }}
          onConfirm={(dataUrl, shape)=> { setNewAvatar(dataUrl); persistShape(shape); setShowCropper(false); setRawAvatar(null); }}
        />
      )}
    </>
  );
};

export default CompanyProfile;