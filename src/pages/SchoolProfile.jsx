import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { schoolApi } from '@/lib/schoolApi';
import { usersAPI } from '@/lib/api';
import { Building2, Loader2, FileText, ImagePlus, Heart, MessageCircle, Share2, Trash2, Star, Info, X, ChevronLeft, ChevronRight, MapPin, GraduationCap, Users, Image, User, Phone, Globe, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { loadPosts as lsLoadPosts, createPost as lsCreatePost, toggleLike as lsToggleLike, addComment as lsAddComment, deletePost as lsDeletePost, getIdentifiersFromObj } from '@/lib/schoolPosts';
import ImageCropper from '@/components/ImageCropper';
import { schoolPostsApi } from '@/lib/schoolPostsApi';
import AdaptiveSchoolImage from '@/components/AdaptiveSchoolImage';

const SchoolProfile = () => {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const publicSchoolId = query.get('id') || query.get('school') || null;
  const navigate = useNavigate();
  const schoolId = publicSchoolId || user?.id;
  const [form, setForm] = useState({
    school_name: '',
    school_type: '',
    school_city: '',
    school_state: '',
    school_director: '',
    school_contact_phone: '',
    school_website: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loadingStudents,setLoadingStudents] = useState(false);
  const [classes,setClasses] = useState([]);
  const [expandedClass,setExpandedClass] = useState(null);
  const [classStudents,setClassStudents] = useState({});
  const [featured,setFeatured] = useState([]);
  const [loadingFeatured,setLoadingFeatured] = useState(false);
  // Posts (publicações)
  const { toast } = useToast();
  const [posts, setPosts] = useState([]);
  const [creatingPost, setCreatingPost] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [postImage, setPostImage] = useState(null); // DataURL
  const [postImages, setPostImages] = useState([]); // Array de DataURLs
  const [commentInputs, setCommentInputs] = useState({}); // postId -> text
  const [replyInputs, setReplyInputs] = useState({}); // commentId -> text
  const [replyOpen, setReplyOpen] = useState({}); // commentId -> boolean
  const [selectedPost, setSelectedPost] = useState(null); // Modal de post
  const [modalImageIndex, setModalImageIndex] = useState(0); // Índice da imagem no modal
  // Avatar da escola
  // Avatar: prefer backend profileImage; localStorage only as cache fallback
  const [avatarUrl, setAvatarUrl] = useState(()=>{
    try {
      return user?.profileImage || user?.profile_image || localStorage.getItem('school_avatar_'+(user?.id||'')) || null;
    } catch { return null; }
  });
  const [newAvatar, setNewAvatar] = useState(null); // resultado do crop
  const [rawAvatar, setRawAvatar] = useState(null); // imagem original
  const [showCropper, setShowCropper] = useState(false);
  const [avatarShape, setAvatarShape] = useState(()=>{ try { return localStorage.getItem('school_avatar_shape_'+(user?.id||'')) || 'circle'; } catch { return 'circle'; } });
  const [avatarUploading, setAvatarUploading] = useState(false);

  const refreshPosts = async () => {
    try {
      const targetId = user?.id || publicSchoolId;
      if (targetId) {
        const apiPosts = await schoolPostsApi.listBySchool(targetId);
        setPosts(apiPosts);
        return;
      }
    } catch (e) {
      // fallback local
    }
    const all = lsLoadPosts();
    const ids = getIdentifiersFromObj({ id: user?.id, email: user?.email });
    const filtered = all.filter(p => {
      const postIds = Array.isArray(p.authorIds) ? p.authorIds : [];
      const matchId = p.author && ids.includes(String(p.author.id));
      const matchAuthorIds = postIds.some(x => ids.includes(String(x)));
      const matchEmail = p.author?.email && ids.includes(String(p.author.email));
      return matchId || matchAuthorIds || matchEmail;
    });
    setPosts(filtered);
  };

  const onSelectSchoolAvatar = (e) => {
    if (!user || user.type !== 'school') return;
    const file = e.target.files?.[0];
    if (!file) return;
    const maxBytes = 3 * 1024 * 1024;
    if (file.size > maxBytes) { toast({ title:'Imagem muito grande', description:'Envie até 3MB.', variant:'destructive'}); return; }
    if (!file.type.startsWith('image/')) { toast({ title:'Arquivo inválido', description:'Selecione uma imagem válida.', variant:'destructive'}); return; }
    const reader = new FileReader();
    reader.onload = () => { setRawAvatar(reader.result); setShowCropper(true); };
    reader.readAsDataURL(file);
  };

  const onUploadSchoolAvatar = async () => {
    if (!user || user.type !== 'school') return;
    if (!newAvatar) { toast({ title:'Selecione e ajuste a imagem' }); return; }
    try {
      setAvatarUploading(true);
      // Upload direto usando endpoint genérico de usuário (/users/:id/avatar)
      const resp = await usersAPI.uploadAvatar(user.id, newAvatar);
      const finalUrl = resp?.profileImage || newAvatar;
      setAvatarUrl(finalUrl);
      setNewAvatar(null);
        // Persist cache local para uso offline ou fallback em listagens
      try {
        localStorage.setItem('school_avatar_'+user.id, finalUrl);
        // Atualizar usuário armazenado sem salvar grandes base64
        const stored = JSON.parse(localStorage.getItem('curriculoja_user')||'null');
        if (stored && stored.id === user.id) {
          stored.profileImage = finalUrl;
          stored.profile_image = finalUrl;
          try {
            const safe = { ...stored };
            if (typeof safe.profileImage === 'string' && safe.profileImage.startsWith('data:') && safe.profileImage.length > 200000) delete safe.profileImage;
            if (typeof safe.profile_image === 'string' && safe.profile_image.startsWith('data:') && safe.profile_image.length > 200000) delete safe.profile_image;
            localStorage.setItem('curriculoja_user', JSON.stringify(safe));
          } catch {
            try {
              const safe2 = { ...stored };
              if (typeof safe2.profileImage === 'string' && safe2.profileImage.startsWith('data:') && safe2.profileImage.length > 200000) delete safe2.profileImage;
              if (typeof safe2.profile_image === 'string' && safe2.profile_image.startsWith('data:') && safe2.profile_image.length > 200000) delete safe2.profile_image;
              localStorage.setItem('curriculoja_user', JSON.stringify(safe2));
            } catch { localStorage.setItem('curriculoja_user', JSON.stringify(stored)); }
          }
        }
      } catch {}
      // Atualizar contexto de autenticação
      try { await updateUser?.(); } catch {}
  window.dispatchEvent(new CustomEvent('avatarUpdated', { detail:{ userId: user.id, avatar: finalUrl } }));
      toast({ title:'Logo da escola atualizada', description:'Imagem salva no servidor.' });
    } catch(e){
      console.error('Falha upload avatar escola', e);
      toast({ title:'Erro ao enviar logo', description: e.message || 'Tente novamente.', variant:'destructive' });
    } finally { setAvatarUploading(false); }
  };

  const persistSchoolShape = (shape) => {
    setAvatarShape(shape);
    try { localStorage.setItem('school_avatar_shape_'+(user?.id||''), shape); } catch {}
  };

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

  const onPublish = async () => {
    if (!user || user.type !== 'school') {
      toast({ title: 'Apenas escolas podem publicar', variant: 'destructive' });
      return;
    }
    if (postImages.length === 0) {
      toast({ title: 'Selecione uma imagem', description: 'Adicione pelo menos uma imagem para publicar.' });
      return;
    }
    try {
      setCreatingPost(true);
      try {
        await schoolPostsApi.createPost(postImages, postCaption.trim());
      } catch (e) {
        // fallback local (apenas primeira imagem para compatibilidade)
        lsCreatePost({ id: user.id, email: user.email, name: user.schoolName || user.name || 'Escola' }, postImages[0], postCaption.trim());
      }
      setPostImages([]);
      setPostCaption('');
      await refreshPosts();
      toast({ title: 'Publicado', description: 'Sua publicação foi criada.' });
    } catch (e) {
      toast({ title: 'Erro ao publicar', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setCreatingPost(false);
    }
  };

  const onToggleLike = async (postId) => {
    if (!user) { toast({ title: 'Faça login', description: 'Entre para curtir publicações.', variant: 'default' }); return; }
    try { await schoolPostsApi.toggleLike(postId); }
    catch { lsToggleLike(postId, user.id); }
    await refreshPosts();
  };

  const onAddComment = async (postId) => {
    if (!user) { toast({ title: 'Faça login', description: 'Entre para comentar.', variant: 'default' }); return; }
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    try { await schoolPostsApi.addComment(postId, text); }
    catch {
      const displayName = user.name || user.schoolName || user.company_name || user.companyName || user.email || 'Usuário';
      lsAddComment(postId, { id: user.id, name: displayName }, text);
    }
    setCommentInputs((m) => ({ ...m, [postId]: '' }));
    await refreshPosts();
  };

  const onToggleCommentLike = async (commentId) => {
    if (!user) { toast({ title: 'Faça login', description: 'Entre para curtir comentários.' }); return; }
    try { await schoolPostsApi.toggleCommentLike(commentId); } catch { /* sem fallback local */ }
    await refreshPosts();
  };

  const onAddReply = async (postId, parentId) => {
    if (!user) { toast({ title: 'Faça login', description: 'Entre para responder.' }); return; }
    const text = (replyInputs[parentId] || '').trim();
    if (!text) return;
    try { await schoolPostsApi.addReply(postId, parentId, text); } catch { /* sem fallback local */ }
    setReplyInputs(m => ({ ...m, [parentId]: '' }));
    await refreshPosts();
  };

  const onShare = async (postId) => {
    const url = `${window.location.origin}/school/profile?post=${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Publicação da escola', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copiado', description: 'URL da publicação copiada para a área de transferência.' });
      }
    } catch (e) {
      // ignore cancel
    }
  };

  const onDeletePost = async (postId, authorId) => {
    if (!user || user.id !== authorId) return;
    try { await schoolPostsApi.deletePost(postId); }
    catch { lsDeletePost(postId); }
    await refreshPosts();
    toast({ title: 'Publicação removida' });
  };

  const loadClasses = async () => {
    try {
      setLoadingStudents(true);
      const cls = await schoolApi.listClasses();
      setClasses(cls);
    } catch(err){ /* silencioso */ } finally { setLoadingStudents(false); }
  };

  const loadFeatured = async () => {
    try { setLoadingFeatured(true); const st = await schoolApi.listFeaturedStudents(); setFeatured(st);} catch{} finally { setLoadingFeatured(false);} };

  const toggleClass = async (cls) => {
    if(expandedClass === cls.id){ setExpandedClass(null); return; }
    setExpandedClass(cls.id);
    if(!classStudents[cls.id]){
      try {
        const st = await schoolApi.listClassStudents(cls.id);
        setClassStudents(cs=>({...cs,[cls.id]: st}));
      } catch(e){ /* ignore */ }
    }
  };

  useEffect(()=>{
    if(user?.type==='school'){
      setForm({
        school_name: user.schoolName || '',
        school_type: user.schoolType || '',
        school_city: user.schoolCity || '',
        school_state: user.schoolState || '',
        school_director: user.schoolDirector || '',
        school_contact_phone: user.schoolContactPhone || '',
        school_website: user.schoolWebsite || ''
      });
      // carregar dados dependentes
      loadClasses();
      loadFeatured();
    }
  refreshPosts();
  const onUpdated = () => refreshPosts();
    window.addEventListener('school-posts-updated', onUpdated);
    // Ensure avatar shown is kept in sync with auth `user` when it becomes available/changes
    try {
      const backendAvatar = user?.profileImage || user?.profile_image || null;
      if (backendAvatar) setAvatarUrl(backendAvatar);
      else {
        // fallback to any cached local value (kept for offline scenarios)
        try { const cache = localStorage.getItem('school_avatar_'+(user?.id||'')); if (cache) setAvatarUrl(cache); } catch {}
      }
      // also restore stored shape preference
      try { const storedShape = localStorage.getItem('school_avatar_shape_'+(user?.id||'')); if (storedShape) setAvatarShape(storedShape); } catch {}
    } catch(e) {
      // ignore
    }

    return () => window.removeEventListener('school-posts-updated', onUpdated);
  },[user]);

  // Página agora é pública para visualização de posts; se não for escola, desabilitamos edição.

  const onChange = e => setForm(f=>({...f,[e.target.name]: e.target.value}));
  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null); setMessage(null);
    try {
      const updated = await schoolApi.updateProfile(form);
      // Atualizar objeto user local (mantendo outros campos)
      const newUser = {
        ...user,
        schoolName: updated.school_name,
        schoolType: updated.school_type,
        schoolDirector: updated.school_director,
        schoolContactPhone: updated.school_contact_phone,
        schoolCity: updated.school_city,
        schoolState: updated.school_state,
        schoolWebsite: updated.school_website
      };
      try {
        const safe = { ...newUser };
        if (typeof safe.profileImage === 'string' && safe.profileImage.startsWith('data:') && safe.profileImage.length > 200000) delete safe.profileImage;
        if (typeof safe.profile_image === 'string' && safe.profile_image.startsWith('data:') && safe.profile_image.length > 200000) delete safe.profile_image;
        localStorage.setItem('curriculoja_user', JSON.stringify(safe));
      } catch {
        try {
          const safe2 = { ...newUser };
          if (typeof safe2.profileImage === 'string' && safe2.profileImage.startsWith('data:') && safe2.profileImage.length > 200000) delete safe2.profileImage;
          if (typeof safe2.profile_image === 'string' && safe2.profile_image.startsWith('data:') && safe2.profile_image.length > 200000) delete safe2.profile_image;
          localStorage.setItem('curriculoja_user', JSON.stringify(safe2));
        } catch { localStorage.setItem('curriculoja_user', JSON.stringify(newUser)); }
      }
      // Forçar refresh via updateUser (carrega /me) ou set direto
      try { await updateUser(); } catch { /* ignore */ }
      setMessage('Perfil atualizado com sucesso');
      setEditMode(false); // Volta para modo visualização após salvar
    } catch(err){
      setError(err.message);
    } finally { setSaving(false); }
  };

  return (
    <>
    <div className="min-h-screen bg-slate-50/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div className="bg-white/95 backdrop-blur-sm border-2 border-slate-200 rounded-[20px] sm:rounded-[24px] p-4 sm:p-8 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-5">
              <AdaptiveSchoolImage
                src={newAvatar || avatarUrl}
                alt={form.school_name || 'Escola'}
                size='xl'
                fallbackIcon={GraduationCap}
                className='ring-2 ring-blue-100 !w-16 !h-16 sm:!w-20 sm:!h-20 !border-0'
              />
              <div>
                <h1 className="text-xl sm:text-[2rem] font-bold text-slate-900 tracking-tight leading-tight">
                  {form.school_name || user?.schoolName || 'Escola'}
                </h1>
                {(form.school_city || form.school_state) && (
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 mt-1 sm:mt-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                    {form.school_city}{form.school_state && ` - ${form.school_state}`}
                  </div>
                )}
                {form.school_type && (
                  <div className="inline-flex items-center gap-1 sm:gap-1.5 mt-2 sm:mt-3 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-50 border border-blue-200">
                    <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
                    <span className="text-[10px] sm:text-xs text-blue-700 font-bold uppercase tracking-wide">Escola {form.school_type}</span>
                  </div>
                )}
                {message && !editMode && <div className="text-sm text-green-600 mt-2 font-medium">{message}</div>}
                {error && !editMode && <div className="text-sm text-red-600 mt-2 font-medium">{error}</div>}
              </div>
            </div>
            {/* Ações do header */}
            {user?.type==='school' && (
              <div className="flex flex-row flex-wrap gap-2 sm:gap-3 mt-1 sm:mt-0">
                <label className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-[10px] sm:rounded-[12px] border-2 border-blue-300 bg-white hover:bg-blue-50 text-blue-600 font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[1px] cursor-pointer">
                  <ImagePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Trocar logo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={onSelectSchoolAvatar} />
                </label>
                {newAvatar && (
                  <>
                    <button onClick={onUploadSchoolAvatar} disabled={avatarUploading} className="inline-flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm rounded-[10px] sm:rounded-[12px] bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[1px]">
                      {avatarUploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</> : 'Salvar logo'}
                    </button>
                    <button onClick={()=> setNewAvatar(null)} className="inline-flex items-center px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-[10px] sm:rounded-[12px] border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-medium transition-all duration-200">Cancelar</button>
                  </>
                )}
                {!editMode && (
                  <button onClick={()=>{setEditMode(true); setMessage(null);}} className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm rounded-[10px] sm:rounded-[12px] border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[1px]">
                    Editar perfil
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Info / Formulário */}
          {user?.type==='school' && (
            <div className="mb-6 sm:mb-8">
              {editMode ? (
                <form onSubmit={save}>
                  <div className="bg-slate-50/80 rounded-[16px] p-4 sm:p-6 border-2 border-slate-200 mb-4">
                    <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
                      <div className="space-y-1">
                        <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome da Escola *</label>
                        <input name="school_name" value={form.school_name} onChange={onChange} className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-[10px] sm:rounded-[12px] px-3 sm:px-4 py-2 sm:py-2.5 text-sm transition-all duration-200 bg-white outline-none" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</label>
                        <input name="school_type" value={form.school_type} onChange={onChange} className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-[10px] sm:rounded-[12px] px-3 sm:px-4 py-2 sm:py-2.5 text-sm transition-all duration-200 bg-white outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cidade</label>
                        <input name="school_city" value={form.school_city} onChange={onChange} className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-[10px] sm:rounded-[12px] px-3 sm:px-4 py-2 sm:py-2.5 text-sm transition-all duration-200 bg-white outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
                        <input name="school_state" value={form.school_state} onChange={onChange} className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-[10px] sm:rounded-[12px] px-3 sm:px-4 py-2 sm:py-2.5 text-sm transition-all duration-200 bg-white outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diretor</label>
                        <input name="school_director" value={form.school_director} onChange={onChange} className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-[10px] sm:rounded-[12px] px-3 sm:px-4 py-2 sm:py-2.5 text-sm transition-all duration-200 bg-white outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone</label>
                        <input name="school_contact_phone" value={form.school_contact_phone} onChange={onChange} className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-[10px] sm:rounded-[12px] px-3 sm:px-4 py-2 sm:py-2.5 text-sm transition-all duration-200 bg-white outline-none" />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Website</label>
                        <input name="school_website" value={form.school_website} onChange={onChange} placeholder="https://" className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-[10px] sm:rounded-[12px] px-3 sm:px-4 py-2 sm:py-2.5 text-sm transition-all duration-200 bg-white outline-none" />
                      </div>
                      <div className="md:col-span-2 text-sm text-slate-600 font-medium pt-1">
                        Email de acesso: <span className="font-bold text-slate-900">{user.email}</span>
                      </div>
                    </div>
                    {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
                    {message && <div className="text-sm text-green-600 mt-3">{message}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm rounded-[10px] sm:rounded-[12px] bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[1px]">
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Salvar Alterações
                    </button>
                    <button type="button" onClick={()=>{ setEditMode(false); setError(null); setMessage(null); }} className="inline-flex items-center px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm rounded-[10px] sm:rounded-[12px] border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-all duration-200">Cancelar</button>
                  </div>
                </form>
              ) : (
                <div className="bg-slate-50/80 rounded-[16px] p-4 sm:p-6 border-2 border-slate-200">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                    <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome</div>
                        <div className="font-semibold text-slate-900 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate">{form.school_name || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</div>
                        <div className="text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm">{form.school_type || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-green-50 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Localização</div>
                        <div className="text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate">{form.school_city || '—'}{form.school_state && ` - ${form.school_state}`}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diretor</div>
                        <div className="text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate">{form.school_director || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-rose-50 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-rose-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone</div>
                        <div className="text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm">{form.school_contact_phone || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</div>
                        <div className="text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate">{user.email || '—'}</div>
                      </div>
                    </div>
                    {form.school_website && (
                      <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm col-span-2 lg:col-span-3">
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-cyan-50 flex items-center justify-center flex-shrink-0">
                          <Globe className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-cyan-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Website</div>
                          <a href={form.school_website} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline break-all mt-0.5 sm:mt-1 inline-block font-medium text-xs sm:text-sm truncate max-w-full">{form.school_website}</a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alunos Destacados */}
          {user?.type==='school' && (
            <div className="mb-6 sm:mb-8">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 sm:mb-5 flex items-center gap-2">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 stroke-[2.5]" fill="none" /> Alunos <span className="text-[#2563eb]">Destacados</span>
              </h2>
              {loadingFeatured ? (
                <div className="text-xs sm:text-sm text-slate-500 bg-slate-50 rounded-[14px] sm:rounded-[16px] p-4 sm:p-5 border-2 border-slate-200">Carregando...</div>
              ) : featured.length === 0 ? (
                <div className="text-xs sm:text-sm text-slate-500 bg-slate-50 rounded-[14px] sm:rounded-[16px] p-4 sm:p-5 border-2 border-slate-200">Nenhum aluno destacado.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
                  {featured.map(f => (
                    <div key={f.user_id || f.id} className="border-2 border-amber-200 rounded-[14px] sm:rounded-[18px] p-3 sm:p-5 bg-gradient-to-br from-white to-amber-50/50 flex flex-col shadow-[0_12px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-[2px] relative hover:z-[100]">
                      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 group/tooltip hidden sm:block">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 flex items-center justify-center cursor-help hover:bg-blue-200 transition-colors">
                          <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
                        </div>
                        <div className="absolute right-0 top-8 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-4 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[9999]">
                          <div className="space-y-2.5">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome</div>
                              <div className="text-sm text-slate-800 font-medium">{f.name}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</div>
                              <div className="text-sm text-slate-800">{f.email || '—'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone</div>
                              <div className="text-sm text-slate-800">{f.phone || '—'}</div>
                            </div>
                            <div className="pt-2 border-t border-slate-100">
                              <div className="text-lg font-bold text-blue-600">{f.resumes_count || 0}</div>
                              <div className="text-[10px] text-slate-500">currículos criados</div>
                            </div>
                          </div>
                          <div className="absolute -top-2 right-3 w-3 h-3 bg-white border-l border-t border-slate-200 transform rotate-45"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                        {(f.profile_image || f.profileImage || f.avatar) ? (
                          <img src={f.profile_image || f.profileImage || f.avatar} alt={f.name} className="w-12 h-12 sm:w-[68px] sm:h-[68px] rounded-full object-cover shadow-md border-2 border-white ring-2 ring-amber-100" />
                        ) : (
                          <div className="w-12 h-12 sm:w-[68px] sm:h-[68px] rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-md ring-2 ring-blue-100">
                            {f.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs sm:text-sm text-slate-900 line-clamp-1">{f.name}</div>
                          <div className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate">Turma: {f.class_name || 'Sem turma'}</div>
                        </div>
                      </div>
                      <button onClick={()=>window.location.href=`/alunos/${f.user_id}`} className="mt-auto inline-flex items-center justify-center text-[10px] sm:text-xs px-3 sm:px-4 py-2 sm:py-2.5 rounded-[10px] sm:rounded-[12px] border-2 border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[1px]">Ver Perfil</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Turmas */}
          {user?.type==='school' && (
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#2563eb]" />
                  <span className="text-[#2563eb]">Turmas</span>
                </h2>
                <span className="text-[10px] sm:text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-[10px] sm:rounded-[12px] bg-blue-50 text-[#2563eb] border-2 border-blue-100 font-bold">{classes.length} turma(s)</span>
              </div>
              {loadingStudents ? (
                <div className="text-xs sm:text-sm text-slate-500 bg-slate-50 rounded-[14px] sm:rounded-[16px] p-4 sm:p-5 border-2 border-slate-200">Carregando turmas...</div>
              ) : classes.length === 0 ? (
                <div className="text-xs sm:text-sm text-slate-500 bg-slate-50 rounded-[14px] sm:rounded-[16px] p-4 sm:p-5 border-2 border-slate-200 flex items-center gap-2 sm:gap-3">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                  Nenhuma turma cadastrada.
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {classes.map(cls => {
                    const open = expandedClass === cls.id;
                    const st = classStudents[cls.id] || [];
                    return (
                      <div key={cls.id} className="bg-white/95 backdrop-blur-sm border-2 border-slate-200 rounded-[14px] sm:rounded-[16px] shadow-[0_8px_25px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_35px_rgba(15,23,42,0.06)] transition-all duration-200 overflow-hidden">
                        <button onClick={()=>toggleClass(cls)} className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-blue-50/50 transition-all duration-200">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 text-xs sm:text-sm">{cls.name}</span>
                            <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 font-medium">{cls.year ? `Ano: ${cls.year}` : ''}{cls.shift ? (cls.year ? ' • ' : '') + cls.shift : ''}</span>
                          </div>
                          <span className="text-[10px] sm:text-xs px-3 sm:px-5 py-2 sm:py-2.5 rounded-[10px] sm:rounded-[12px] border-2 border-blue-500 bg-white hover:bg-blue-50 text-[#2563eb] font-semibold transition-all duration-200 shadow-sm">
                            {open ? `Fechar (${st.length})` : 'Ver Alunos'}
                          </span>
                        </button>
                        {open && (
                          <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                            {st.length === 0 ? (
                              <div className="text-xs text-slate-500">Nenhum aluno nesta turma.</div>
                            ) : (
                              <div className="overflow-hidden rounded-[12px] shadow-sm">
                                <table className="w-full text-xs">
                                  <thead className="bg-blue-50">
                                    <tr>
                                      <th className="text-left p-3 font-bold text-slate-900">Nome</th>
                                      <th className="text-left p-3 font-bold text-slate-900">Email</th>
                                      <th className="text-left p-3 font-bold text-slate-900">Ações</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {st.map(s => (
                                      <tr key={s.user_id} className={`border-t hover:bg-blue-50/30 transition-all duration-200 ${s.is_featured ? 'bg-amber-50/80' : ''}`}>
                                        <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                                          {s.name}
                                          {s.is_featured && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Indicado</span>}
                                        </td>
                                        <td className="p-3 text-slate-700">{s.email}</td>
                                        <td className="p-3">
                                          <button onClick={()=>{ window.location.href = `/alunos/${s.user_id}`; }} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-xs rounded-[10px] sm:rounded-[12px] border-2 border-blue-500 bg-white hover:bg-blue-50 text-[#2563eb] font-semibold transition-all duration-200 shadow-sm hover:shadow-md">
                                            <FileText className="w-3.5 h-3.5" /> Perfil
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Publicações - Grid estilo Instagram */}
          <div>
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Image className="w-4 h-4 sm:w-5 sm:h-5 text-[#2563eb]" />
                <span className="text-[#2563eb]">Publicações</span>
              </h2>
              <span className="text-[10px] sm:text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-[10px] sm:rounded-[12px] bg-blue-50 text-[#2563eb] border-2 border-blue-100 font-bold">{posts.length}</span>
            </div>
            {user?.type==='school' && (
              <div className="mb-6 bg-slate-50/80 rounded-[14px] sm:rounded-[16px] border-2 border-slate-200 p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-3">
                  <label className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-[10px] sm:rounded-[12px] border-2 border-blue-300 bg-white hover:bg-blue-50 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md">
                    <ImagePlus className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    <span className="text-xs sm:text-sm font-semibold text-blue-600">Adicionar imagens</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={onSelectImage} />
                  </label>
                  {postImages.length > 0 && (
                    <span className="text-xs text-emerald-800 bg-emerald-100 border-2 border-emerald-300 px-3 py-1.5 rounded-full font-bold">
                      {postImages.length} {postImages.length === 1 ? 'imagem' : 'imagens'}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">Máx. 10 fotos</span>
                </div>
                {postImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {postImages.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-[10px] overflow-hidden border-2 border-slate-200 group/img">
                        <img src={img} alt={`Imagem ${idx + 1}`} className="w-full h-full object-cover" />
                        <button onClick={() => removePostImage(idx)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                        {idx === 0 && postImages.length > 1 && (
                          <span className="absolute bottom-1 left-1 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold">Capa</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <Textarea rows={3} placeholder="Escreva uma legenda (opcional)" value={postCaption} onChange={e=>setPostCaption(e.target.value)} className="border-2 border-slate-200 focus:border-blue-500 rounded-[10px] sm:rounded-[12px] bg-white" />
                <div className="mt-3 flex justify-end">
                  <button onClick={onPublish} disabled={creatingPost || postImages.length === 0} className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm rounded-[10px] sm:rounded-[12px] bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[1px]">
                    {creatingPost ? 'Publicando...' : 'Publicar'}
                  </button>
                </div>
              </div>
            )}
            {posts.length === 0 ? (
              <div className="text-xs sm:text-sm text-slate-500 bg-slate-50 rounded-[14px] sm:rounded-[16px] p-4 sm:p-5 border-2 border-slate-200 flex items-center gap-2 sm:gap-3">
                <Image className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                Nenhuma publicação ainda.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...posts].sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt)).map(p => {
                  const images = p.images || (p.image ? [p.image] : []);
                  const hasMultipleImages = images.length > 1;
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
                    >
                      <div
                        onClick={() => navigate(`/school/${schoolId}/post/${p.id}`)}
                        className="relative aspect-square cursor-pointer"
                        style={{ borderRadius: '16px', overflow: 'hidden' }}
                      >
                        {images.length > 0 ? (
                          <img src={images[0]} alt="" className="w-full h-full object-cover" style={{ borderRadius: '16px' }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-2 sm:p-3">
                            <p className="text-[10px] sm:text-xs text-slate-600 text-center line-clamp-3 sm:line-clamp-4">{p.caption || 'Sem conteúdo'}</p>
                          </div>
                        )}
                        {hasMultipleImages && (
                          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-medium">
                            +{images.length - 1}
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        {p.caption && (
                          <p className="text-sm text-slate-700 line-clamp-2 mb-2">{p.caption}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => onToggleLike(p.id)}
                              className={`flex items-center gap-1 text-sm ${ (p.likes||[]).includes(user?.id) ? 'text-red-500' : 'text-slate-500 hover:text-red-500' } transition-colors`}
                            >
                              <Heart className={`w-4 h-4 ${ (p.likes||[]).includes(user?.id) ? 'fill-current' : '' }`} />
                              {p.likes?.length || 0}
                            </button>
                            <button
                              onClick={() => navigate(`/school/${schoolId}/post/${p.id}`)}
                              className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-500 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                              {p.comments?.length || 0}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            {user?.id === p.author?.id && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeletePost(p.id, p.author.id); }}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <span className="text-xs text-slate-400">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal da Publicação */}
        {selectedPost && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
            <div className="bg-white rounded-[20px] sm:rounded-[24px] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl border-2 border-slate-200" onClick={e => e.stopPropagation()}>
              {/* Imagem/Carrossel */}
              <div className="md:w-1/2 bg-black flex items-center justify-center relative">
                {(() => {
                  const images = selectedPost.images || (selectedPost.image ? [selectedPost.image] : []);
                  if (images.length === 0) {
                    return (
                      <div className="w-full h-64 md:h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-slate-200 p-6">
                        <p className="text-slate-600 text-center">{selectedPost.caption || 'Sem conteúdo'}</p>
                      </div>
                    );
                  }
                  return (
                    <>
                      <img src={images[modalImageIndex]} alt="" className="w-full h-full max-h-[50vh] md:max-h-[90vh] object-contain" />
                      {images.length > 1 && (
                        <>
                          <button onClick={() => setModalImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all">
                            <ChevronLeft className="w-6 h-6 text-slate-700" />
                          </button>
                          <button onClick={() => setModalImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all">
                            <ChevronRight className="w-6 h-6 text-slate-700" />
                          </button>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {images.map((_, idx) => (
                              <button key={idx} onClick={() => setModalImageIndex(idx)} className={`w-2 h-2 rounded-full transition-all ${idx === modalImageIndex ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/70'}`} />
                            ))}
                          </div>
                          <div className="absolute top-4 right-4 bg-black/60 text-white text-sm px-3 py-1 rounded-full font-medium">
                            {modalImageIndex + 1} / {images.length}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
              {/* Conteúdo */}
              <div className="md:w-1/2 flex flex-col max-h-[50vh] md:max-h-[90vh]">
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{selectedPost.author?.name || 'Escola'}</div>
                    <div className="text-xs text-slate-500">{new Date(selectedPost.createdAt).toLocaleString('pt-BR')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user?.id === selectedPost.author?.id && (
                      <button onClick={()=>{ onDeletePost(selectedPost.id, selectedPost.author.id); setSelectedPost(null); }} className="p-2 hover:bg-red-50 rounded-full transition-colors text-red-500">
                        <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button onClick={() => setSelectedPost(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </div>
              {/* Caption e Comentários */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedPost.caption && (
                  <div className="text-sm text-slate-800"><span className="font-semibold">{selectedPost.author?.name || 'Escola'}</span> {selectedPost.caption}</div>
                )}
                {(selectedPost.comments||[]).map(c => (
                  <div key={c.id} className="text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-800">{c.author?.name||'Usuário'}</span>
                        <span className="text-slate-600 ml-2">{c.text}</span>
                        <div className="text-xs text-slate-400 mt-1">{new Date(c.createdAt).toLocaleString('pt-BR')}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={()=>{ onToggleCommentLike(c.id); }} className="text-xs text-slate-500 hover:text-rose-500">❤ {c.likes_count||0}</button>
                        <button onClick={()=> setReplyOpen(m=>({...m,[c.id]: !m[c.id]}))} className="text-xs text-slate-500 hover:text-blue-500">Responder</button>
                      </div>
                    </div>
                    {/* Replies */}
                    {(c.replies||[]).length>0 && (
                      <div className="mt-2 ml-4 pl-3 border-l-2 border-slate-200 space-y-2">
                        {c.replies.map(r => (
                          <div key={r.id}>
                            <span className="font-semibold text-slate-800 text-sm">{r.author?.name||'Usuário'}</span>
                            <span className="text-slate-600 text-sm ml-2">{r.text}</span>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                              {new Date(r.createdAt).toLocaleString('pt-BR')}
                              <button onClick={()=>onToggleCommentLike(r.id)} className="text-slate-500 hover:text-rose-500">❤ {r.likes_count||0}</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Reply input */}
                    {replyOpen[c.id] && (
                      <div className="mt-2 ml-4 flex items-center gap-2">
                        <input type="text" value={replyInputs[c.id]||''} onChange={e=> setReplyInputs(m=>({...m,[c.id]: e.target.value}))} placeholder="Responder..." className="flex-1 text-sm border rounded-lg px-3 py-2"/>
                        <Button size="sm" onClick={()=>{ onAddReply(selectedPost.id, c.id); setReplyOpen(m=>({...m,[c.id]:false})); }} className="bg-blue-600 hover:bg-blue-700 text-white">Enviar</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Ações */}
              <div className="p-4 border-t">
                <div className="flex items-center gap-3 mb-3">
                  <button onClick={()=>onToggleLike(selectedPost.id)} className={`p-2 rounded-full transition-colors ${(selectedPost.likes||[]).includes(user?.id) ? 'text-rose-500' : 'hover:bg-slate-100 text-slate-600'}`}>
                    <Heart className={`w-6 h-6 ${(selectedPost.likes||[]).includes(user?.id) ? 'fill-rose-500' : ''}`} />
                  </button>
                  <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
                    <MessageCircle className="w-6 h-6" />
                  </button>
                  <button onClick={()=>onShare(selectedPost.id)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
                    <Share2 className="w-6 h-6" />
                  </button>
                </div>
                <div className="text-sm font-semibold text-slate-900 mb-3">{selectedPost.likes?.length||0} curtida(s)</div>
                <div className="flex items-center gap-2">
                  <input type="text" value={commentInputs[selectedPost.id]||''} onChange={e=> setCommentInputs(m=>({...m,[selectedPost.id]: e.target.value}))} placeholder="Adicione um comentário..." className="flex-1 text-sm border-0 bg-transparent outline-none"/>
                  <button onClick={()=>onAddComment(selectedPost.id)} disabled={!(commentInputs[selectedPost.id]||'').trim()} className="text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-300">Publicar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
    {showCropper && rawAvatar && user?.type==='school' && (
      <ImageCropper
        imageSrc={rawAvatar}
        initialShape={avatarShape}
        lockShape={false}
        previewSize={340}
        exportSize={640}
        onCancel={()=>{ setShowCropper(false); setRawAvatar(null); }}
        onConfirm={(dataUrl, shape)=> { setNewAvatar(dataUrl); persistSchoolShape(shape); setShowCropper(false); setRawAvatar(null); }}
      />
    )}
    </>
  );
};

export default SchoolProfile;
