import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, User, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { studentPostsAPI, chatAPI } from '@/lib/api';

const CandidatePostView = () => {
  const { candidateId, postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [post, setPost] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentInput, setCommentInput] = useState('');
  const [replyOpen, setReplyOpen] = useState({});
  const [replyInputs, setReplyInputs] = useState({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isInContacts, setIsInContacts] = useState(false);
  const [addingContact, setAddingContact] = useState(false);

  useEffect(() => {
    loadData();
  }, [candidateId, postId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar dados do candidato
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const candidateRes = await fetch(`${API_URL}/api/users/${candidateId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('curriculoja_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (candidateRes.ok) {
        const candidateData = await candidateRes.json();
        setCandidate(candidateData.user || candidateData);
      }

      // Carregar posts do candidato
      const r = await studentPostsAPI.list(candidateId);
      const posts = r?.posts || [];
      
      const foundPost = posts.find(p => String(p.id) === String(postId));
      setPost(foundPost || null);

      // Verificar se candidato está nos contatos (empresa ou escola)
      if (user && (user.type === 'company' || user.type === 'school')) {
        try {
          const conversations = await chatAPI.getConversations();
          const hasContact = conversations.some(c => String(c.candidateId) === String(candidateId));
          setIsInContacts(hasContact);
        } catch {}
      }
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
    try {
      await studentPostsAPI.toggleLike(post.id);
    } catch {}
    await loadData();
  };

  const handleAddComment = async () => {
    if (!user) {
      toast({ title: 'Faça login', description: 'Entre para comentar.' });
      return;
    }
    const text = commentInput.trim();
    if (!text) return;
    
    try {
      await studentPostsAPI.comment(post.id, { text });
    } catch {}
    setCommentInput('');
    await loadData();
  };

  const handleToggleCommentLike = async (commentId) => {
    if (!user) {
      toast({ title: 'Faça login', description: 'Entre para curtir comentários.' });
      return;
    }
    try {
      await studentPostsAPI.toggleCommentLike(commentId);
    } catch {}
    await loadData();
  };

  const handleAddReply = async (commentId) => {
    if (!user) {
      toast({ title: 'Faça login', description: 'Entre para responder.' });
      return;
    }
    const text = (replyInputs[commentId] || '').trim();
    if (!text) return;
    
    try {
      await studentPostsAPI.comment(post.id, { text, parent_id: commentId });
    } catch {}
    setReplyInputs(m => ({ ...m, [commentId]: '' }));
    setReplyOpen(m => ({ ...m, [commentId]: false }));
    await loadData();
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Publicação do aluno', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copiado', description: 'URL da publicação copiada.' });
      }
    } catch (e) {}
  };

  const handleAddContact = async () => {
    if (!user) return;
    try {
      setAddingContact(true);
      if (user.type === 'company') {
        await chatAPI.saveCandidate(candidateId);
      } else if (user.type === 'school') {
        await chatAPI.saveStudent(candidateId);
      }
      setIsInContacts(true);
      toast({ title: 'Adicionado aos contatos', description: 'O aluno foi adicionado à sua lista de mensagens.' });
    } catch (e) {
      toast({ title: 'Falha ao adicionar', description: e.message || 'Tente novamente mais tarde.', variant: 'destructive' });
    } finally {
      setAddingContact(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!candidate?.phone) {
      toast({ title: 'Telefone não disponível', description: 'Este aluno não possui telefone cadastrado.', variant: 'destructive' });
      return;
    }
    const digits = String(candidate.phone).replace(/\D/g, '');
    const wa = `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`;
    window.open(wa, '_blank');
  };

  const goToMessages = () => {
    navigate(user?.type === 'company' ? '/company-messages' : '/school-messages');
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
              {/* Header do Post - Informações do aluno */}
              <div className='p-5 border-b border-slate-100 flex-shrink-0'>
                <Link to={`/alunos/${candidateId}`} className='flex items-center gap-3 hover:opacity-80 transition-opacity mb-3'>
                  {(post.author?.profile_image || post.author?.avatar || candidate?.profile_image || candidate?.profileImage || candidate?.avatar) ? (
                    <img src={post.author?.profile_image || post.author?.avatar || candidate?.profile_image || candidate?.profileImage || candidate?.avatar} alt={candidate?.name} className='w-12 h-12 rounded-full object-cover ring-2 ring-blue-500' />
                  ) : (
                    <div className='w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg ring-2 ring-blue-500'>
                      {candidate?.name?.charAt(0) || post.author?.name?.charAt(0) || 'A'}
                    </div>
                  )}
                  <div className='flex-1'>
                    <div className='font-bold text-slate-900'>{post.author?.name || candidate?.name || 'Aluno'}</div>
                    <div className='text-sm text-slate-500'>{candidate?.class_name || candidate?.className || ''}</div>
                  </div>
                </Link>
                
                {/* Botões de ação - Apenas para empresa/escola */}
                {user && (user.type === 'company' || user.type === 'school') && (
                  <div className='flex flex-wrap gap-2 mt-3'>
                    {isInContacts ? (
                      <Button
                        onClick={goToMessages}
                        className='bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2'
                      >
                        <UserCheck className='w-4 h-4' />
                        Ir para mensagens
                      </Button>
                    ) : (
                      <Button
                        onClick={handleAddContact}
                        disabled={addingContact}
                        className='bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2'
                      >
                        <MessageCircle className='w-4 h-4' />
                        {addingContact ? 'Adicionando...' : 'Adicionar aos contatos'}
                      </Button>
                    )}
                    <Button
                      variant='outline'
                      onClick={handleOpenWhatsApp}
                      className='border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2'
                    >
                      <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
                        <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'/>
                      </svg>
                      WhatsApp
                    </Button>
                  </div>
                )}
                
                <div className='text-xs text-slate-400 mt-2'>{new Date(post.createdAt).toLocaleString('pt-BR')}</div>
              </div>

              {/* Caption + Comentários (scrollável) */}
              <div className='flex-1 overflow-y-auto p-5'>
                {/* Caption */}
                {post.caption && (
                  <div className='mb-5 pb-5 border-b border-slate-100'>
                    <div className='flex items-start gap-3'>
                      {(post.author?.profile_image || post.author?.avatar || candidate?.profile_image) ? (
                        <img src={post.author?.profile_image || post.author?.avatar || candidate?.profile_image} alt={post.author?.name} className='w-9 h-9 rounded-full object-cover flex-shrink-0' />
                      ) : (
                        <div className='w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0'>
                          {(post.author?.name || candidate?.name || 'A').charAt(0)}
                        </div>
                      )}
                      <p className='text-base text-slate-800 leading-relaxed whitespace-pre-wrap'>
                        <span className='font-bold'>{post.author?.name || candidate?.name || 'Aluno'}</span> {post.caption}
                      </p>
                    </div>
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
                            {(c.author?.profile_image || c.author?.avatar) ? (
                              <img src={c.author?.profile_image || c.author?.avatar} alt={c.author?.name} className='w-9 h-9 rounded-full object-cover flex-shrink-0' />
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
                              <button onClick={() => handleToggleCommentLike(c.id)} className='hover:text-rose-500 font-medium flex items-center gap-1'>
                                <span>👍</span> {c.likes_count || 0}
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
                                  {(r.author?.profile_image || r.author?.avatar) ? (
                                    <img src={r.author?.profile_image || r.author?.avatar} alt={r.author?.name} className='w-8 h-8 rounded-full object-cover flex-shrink-0' />
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
                                    <button onClick={() => handleToggleCommentLike(r.id)} className='hover:text-rose-500 font-medium flex items-center gap-1'>
                                      <span>👍</span> {r.likes_count || 0}
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
                <div className='flex items-center gap-3 mb-2'>
                  <button 
                    onClick={handleToggleLike}
                    className={`p-1.5 rounded-full transition-colors ${isLiked ? 'text-rose-500' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500' : ''}`} />
                  </button>
                  <button className='p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-600'>
                    <MessageCircle className='w-5 h-5' />
                  </button>
                  <button onClick={handleShare} className='p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-600'>
                    <Share2 className='w-5 h-5' />
                  </button>
                </div>
                <div className='text-sm font-semibold text-slate-900 mb-2'>{post.likes?.length || 0} curtida(s)</div>
                
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

export default CandidatePostView;
