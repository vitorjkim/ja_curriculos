import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, Send, Building2, MapPin, Users, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { schoolPostsApi } from '@/lib/schoolPostsApi';

// LocalStorage helpers para fallback
const LS_KEY = 'schoolPosts';
const lsLoadPosts = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
};
const lsSavePosts = (posts) => localStorage.setItem(LS_KEY, JSON.stringify(posts));
const lsToggleLike = (postId, odUserId) => {
  const posts = lsLoadPosts();
  const idx = posts.findIndex(p => p.id === postId);
  if (idx === -1) return;
  const likes = posts[idx].likes || [];
  posts[idx].likes = likes.includes(odUserId) ? likes.filter(id => id !== odUserId) : [...likes, odUserId];
  lsSavePosts(posts);
};
const lsAddComment = (postId, author, text) => {
  const posts = lsLoadPosts();
  const idx = posts.findIndex(p => p.id === postId);
  if (idx === -1) return;
  posts[idx].comments = posts[idx].comments || [];
  posts[idx].comments.push({ id: Date.now(), author, text, createdAt: new Date().toISOString(), likes_count: 0, replies: [] });
  lsSavePosts(posts);
};

const SchoolPostView = () => {
  const { schoolId, postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [post, setPost] = useState(null);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentInput, setCommentInput] = useState('');
  const [replyOpen, setReplyOpen] = useState({});
  const [replyInputs, setReplyInputs] = useState({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [likedComments, setLikedComments] = useState(new Set());

  useEffect(() => {
    loadData();
  }, [schoolId, postId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Obter URL da API com validação rigorosa
      const getAPIBaseURL = () => {
        const apiUrl = import.meta.env.VITE_API_URL;
        if (!apiUrl || typeof apiUrl !== 'string' || apiUrl.trim().length === 0) {
          throw new Error('❌ ERRO CRÍTICO: VITE_API_URL não configurada');
        }
        const trimmed = apiUrl.trim().replace(/\/$/, '');
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          throw new Error('❌ ERRO CRÍTICO: VITE_API_URL deve ser URL absoluta');
        }
        let finalUrl = trimmed;
        if (!finalUrl.endsWith('/api')) finalUrl = `${finalUrl}/api`;
        return finalUrl;
      };
      
      // Carregar dados da escola
      const API_URL = getAPIBaseURL();
      const schoolRes = await fetch(`${API_URL}/users/schools/${schoolId}/public`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('curriculoja_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (schoolRes.ok) {
        const schoolData = await schoolRes.json();
        setSchool(schoolData.school || schoolData);
      }

      // Carregar posts
      let posts = [];
      try {
        posts = await schoolPostsApi.listBySchool(schoolId);
      } catch {
        posts = lsLoadPosts().filter(p => String(p.schoolId) === String(schoolId));
      }
      
      const foundPost = posts.find(p => String(p.id) === String(postId));
      setPost(foundPost || null);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!user) {
      toast({ title: 'Faça login', description: 'Entre para curtir publicações.' });
      return;
    }
    // Optimistic update
    const currentLikes = post.likes || [];
    const alreadyLiked = currentLikes.includes(user.id);
    const newLikes = alreadyLiked
      ? currentLikes.filter(id => id !== user.id)
      : [...currentLikes, user.id];
    setPost(prev => ({ ...prev, likes: newLikes }));
    try {
      await schoolPostsApi.toggleLike(post.id);
    } catch {
      lsToggleLike(post.id, user.id);
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      toast({ title: 'Faça login', description: 'Entre para comentar.' });
      return;
    }
    const text = commentInput.trim();
    if (!text) return;
    
    try {
      await schoolPostsApi.addComment(post.id, text);
    } catch {
      const displayName = user.name || user.schoolName || user.company_name || user.companyName || user.email || 'Usuário';
      lsAddComment(post.id, { id: user.id, name: displayName }, text);
    }
    setCommentInput('');
    await loadData();
  };

  const handleToggleCommentLike = async (commentId) => {
    if (!user) {
      toast({ title: 'Faça login', description: 'Entre para curtir comentários.' });
      return;
    }
    const alreadyLiked = likedComments.has(commentId);
    // Optimistic update: toggle liked state and count
    setLikedComments(prev => {
      const next = new Set(prev);
      alreadyLiked ? next.delete(commentId) : next.add(commentId);
      return next;
    });
    setPost(prev => ({
      ...prev,
      comments: (prev.comments || []).map(c =>
        c.id === commentId
          ? { ...c, likes_count: Math.max(0, (c.likes_count || 0) + (alreadyLiked ? -1 : 1)) }
          : {
              ...c,
              replies: (c.replies || []).map(r =>
                r.id === commentId
                  ? { ...r, likes_count: Math.max(0, (r.likes_count || 0) + (alreadyLiked ? -1 : 1)) }
                  : r
              )
            }
      )
    }));
    try {
      await schoolPostsApi.toggleCommentLike(commentId);
    } catch {}
  };

  const handleAddReply = async (commentId) => {
    if (!user) {
      toast({ title: 'Faça login', description: 'Entre para responder.' });
      return;
    }
    const text = (replyInputs[commentId] || '').trim();
    if (!text) return;
    
    try {
      await schoolPostsApi.addReply(post.id, commentId, text);
    } catch {}
    setReplyInputs(m => ({ ...m, [commentId]: '' }));
    setReplyOpen(m => ({ ...m, [commentId]: false }));
    await loadData();
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Publicação da escola', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copiado', description: 'URL da publicação copiada.' });
      }
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20'>
        <div className='max-w-2xl mx-auto px-4 py-8'>
          <div className='text-center'>
            <h1 className='text-2xl font-bold text-slate-900 mb-4'>Publicação não encontrada</h1>
            <p className='text-slate-600 mb-6'>A publicação que você está procurando não existe ou foi removida.</p>
            <Button onClick={() => navigate(-1)} className='rounded-2xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 hover:shadow-md transition-all duration-200'>
              <ArrowLeft className='w-4 h-4 mr-2' /> Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isLiked = (post.likes || []).includes(user?.id);

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white'>
      <div className='max-w-7xl mx-auto px-4 pt-2 pb-4'>
        {/* Card da Publicação - Layout Lado a Lado */}
        <div className='bg-white border-2 border-slate-200 rounded-[22px] shadow-[0_12px_35px_rgba(15,23,42,0.08)] overflow-hidden' style={{ height: 'calc(100vh - 140px)' }}>
          <div className='flex flex-col lg:flex-row h-full'>
            {/* Lado Esquerdo - Imagem/Carrossel */}
            <div className='lg:w-3/5 bg-black flex items-center justify-center h-full relative'>
              {(() => {
                const images = post.images || (post.image ? [post.image] : []);
                if (images.length === 0) {
                  return (
                    <div className='w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-slate-200 p-6'>
                      <p className='text-slate-600 text-center text-lg'>{post.caption || 'Sem conteúdo'}</p>
                    </div>
                  );
                }
                return (
                  <>
                    <img 
                      src={images[currentImageIndex]} 
                      alt={`Imagem ${currentImageIndex + 1}`} 
                      className='w-full h-full object-contain'
                    />
                    {/* Navegação do carrossel */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)}
                          className='absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all'
                        >
                          <ChevronLeft className='w-6 h-6 text-slate-700' />
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)}
                          className='absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all'
                        >
                          <ChevronRight className='w-6 h-6 text-slate-700' />
                        </button>
                        {/* Indicadores */}
                        <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5'>
                          {images.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/70'}`}
                            />
                          ))}
                        </div>
                        {/* Contador */}
                        <div className='absolute top-4 right-4 bg-black/60 text-white text-sm px-3 py-1 rounded-full font-medium'>
                          {currentImageIndex + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Lado Direito - Conteúdo e Comentários */}
            <div className='lg:w-2/5 flex flex-col h-full'>
              {/* Header do Post */}
              <div className='p-5 border-b border-slate-100 flex-shrink-0'>
                <Link to={`/company/schools/${schoolId}`} className='flex items-center gap-3 hover:opacity-80 transition-opacity'>
                  {(post.author?.avatar || school?.profile_image || school?.profileImage || school?.logo || school?.avatar) ? (
                    <img src={post.author?.avatar || school?.profile_image || school?.profileImage || school?.logo || school?.avatar} alt={school?.schoolName || school?.name} className='w-12 h-12 rounded-full object-cover ring-2 ring-gray-200' />
                  ) : (
                    <div className='w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-lg ring-2 ring-gray-200'>
                      {school?.schoolName?.charAt(0) || school?.name?.charAt(0) || 'E'}
                    </div>
                  )}
                  <div>
                    <div className='font-bold text-slate-900'>{post.author?.name || school?.schoolName || school?.name || 'Escola'}</div>
                    <div className='text-sm text-slate-500'>{new Date(post.createdAt).toLocaleString('pt-BR')}</div>
                  </div>
                </Link>
              </div>

              {/* Caption + Comentários (scrollável) */}
              <div className='flex-1 overflow-y-auto p-5'>
                {/* Caption */}
                {post.caption && (
                  <div className='mb-5 pb-5 border-b border-slate-100'>
                    <p className='text-base text-slate-800 leading-relaxed whitespace-pre-wrap'>
                      {post.caption}
                    </p>
                  </div>
                )}

                {/* Lista de Comentários */}
                <div className='space-y-4'>
                  {(post.comments || []).length === 0 ? (
                    <p className='text-sm text-slate-500 text-center py-6'>Nenhum comentário ainda.</p>
                  ) : (
                    (post.comments || []).map(c => (
                      <div key={c.id} className='text-base'>
                        <div className='flex gap-3'>
                          {/* Avatar + Linha conectora */}
                          <div className='flex flex-col items-center'>
                            {c.author?.avatar ? (
                              <img src={c.author.avatar} alt={c.author?.name} className='w-9 h-9 rounded-full object-cover flex-shrink-0' />
                            ) : (
                              <div className='w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0'>
                                {(c.author?.name || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                            {/* Linha conectora para replies */}
                            {(c.replies || []).length > 0 && (
                              <div className='w-0.5 bg-slate-200 flex-1 mt-2 min-h-[20px]'></div>
                            )}
                          </div>
                          {/* Conteúdo do comentário */}
                          <div className='flex-1'>
                            <span className='font-bold text-slate-800'>{c.author?.name || 'Usuário'}</span>
                            <span className='text-slate-500 text-sm ml-2'>• {new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
                            <p className='text-slate-700 mt-1'>{c.text}</p>
                            <div className='text-sm text-slate-400 mt-2 flex items-center gap-4'>
                              <button onClick={() => handleToggleCommentLike(c.id)} className={`font-medium flex items-center gap-1 transition-colors ${likedComments.has(c.id) ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400'}`}>
                                <Heart className={`w-3.5 h-3.5 ${likedComments.has(c.id) ? 'fill-rose-500' : ''}`} /> {c.likes_count || 0}
                              </button>
                              <button onClick={() => setReplyOpen(m => ({ ...m, [c.id]: !m[c.id] }))} className='hover:text-blue-500 font-medium'>Responder</button>
                            </div>
                          </div>
                        </div>

                        {/* Replies */}
                        {(c.replies || []).length > 0 && (
                          <div className='ml-[18px] pl-6 space-y-3 mt-1'>
                            {c.replies.map((r, idx) => (
                              <div key={r.id} className='flex gap-3'>
                                {/* Avatar + Linha conectora */}
                                <div className='flex flex-col items-center'>
                                  {r.author?.avatar ? (
                                    <img src={r.author.avatar} alt={r.author?.name} className='w-8 h-8 rounded-full object-cover flex-shrink-0' />
                                  ) : (
                                    <div className='w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0'>
                                      {(r.author?.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  {/* Linha conectora para próxima reply */}
                                  {idx < c.replies.length - 1 && (
                                    <div className='w-0.5 bg-slate-200 flex-1 mt-2 min-h-[20px]'></div>
                                  )}
                                </div>
                                {/* Conteúdo da reply */}
                                <div className='flex-1'>
                                  <span className='font-bold text-slate-800'>{r.author?.name || 'Usuário'}</span>
                                  <span className='text-slate-500 text-sm ml-2'>• {new Date(r.createdAt).toLocaleDateString('pt-BR')}</span>
                                  <p className='text-slate-700 mt-1'>{r.text}</p>
                                  <div className='text-sm text-slate-400 mt-1 flex items-center gap-3'>
                                    <button onClick={() => handleToggleCommentLike(r.id)} className={`font-medium flex items-center gap-1 transition-colors ${likedComments.has(r.id) ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400'}`}>
                                      <Heart className={`w-3.5 h-3.5 ${likedComments.has(r.id) ? 'fill-rose-500' : ''}`} /> {r.likes_count || 0}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply input */}
                        {replyOpen[c.id] && (
                          <div className='mt-3 ml-12 flex items-center gap-3'>
                            <input 
                              type='text' 
                              value={replyInputs[c.id] || ''} 
                              onChange={e => setReplyInputs(m => ({ ...m, [c.id]: e.target.value }))} 
                              placeholder='Responder...' 
                              className='flex-1 text-base border rounded-lg px-4 py-2.5'
                            />
                            <Button onClick={() => handleAddReply(c.id)} className='bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5'>Enviar</Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className='px-4 py-3 border-t border-slate-100 flex-shrink-0'>
                <div className='flex items-center gap-4 mb-2'>
                  <button 
                    onClick={handleToggleLike}
                    className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-rose-500' : 'hover:text-rose-400 text-slate-600'}`}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500' : ''}`} />
                    <span className='text-sm font-semibold'>{post.likes?.length || 0}</span>
                  </button>
                  <button className='flex items-center gap-1.5 hover:text-blue-500 text-slate-600 transition-colors'>
                    <MessageCircle className='w-5 h-5' />
                    <span className='text-sm font-semibold'>{(post.comments || []).length}</span>
                  </button>
                  <button onClick={handleShare} className='p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-600 ml-auto'>
                    <Share2 className='w-5 h-5' />
                  </button>
                </div>
                
                {/* Input de comentário */}
                <div className='flex items-center gap-2 border-t border-slate-100 pt-2'>
                  <input 
                    type='text' 
                    value={commentInput} 
                    onChange={e => setCommentInput(e.target.value)} 
                    placeholder='Adicione um comentário...' 
                    className='flex-1 text-sm border-0 bg-transparent outline-none'
                    onKeyPress={e => e.key === 'Enter' && handleAddComment()}
                  />
                  <button 
                    onClick={handleAddComment}
                    disabled={!commentInput.trim()}
                    className='text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-300'
                  >
                    Publicar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolPostView;
