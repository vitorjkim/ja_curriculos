import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { MessageSquare, Send, GraduationCap, ArrowLeft, MessageCircle, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { chatAPI } from '@/lib/api';
import LinkPreview from '@/components/chat/LinkPreview';

// Converte URLs em links clicáveis e preserva trechos de texto
function renderMessageWithLinks(text='') {
  const urlRegex = /(https?:\/\/[\w\-._~:\/?#%[\]@!$&'()*+,;=]+)|(www\.[\w\-._~:\/?#%[\]@!$&'()*+,;=]+)/gi;
  const parts = [];
  let lastIndex = 0;
  let match;
  while((match = urlRegex.exec(text))){
    if(match.index > lastIndex){ parts.push(text.slice(lastIndex, match.index)); }
    let url = match[0];
    if(url.startsWith('www.')) url = 'https://' + url;
    parts.push(<a key={url+match.index} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{match[0]}</a>);
    lastIndex = match.index + match[0].length;
  }
  if(lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

const SchoolMessages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesContainerRef = useRef(null);
  const [linkPreviews, setLinkPreviews] = useState({});

  const loadConversations = async () => {
    try {
      const response = await chatAPI.getConversations();
      setConversations(response);
    } catch (error) {
      toast({ title: 'Erro ao carregar conversas', description: 'Não foi possível carregar as conversas.', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const loadMessages = async (conversationId) => {
    try {
      const response = await chatAPI.getMessages(conversationId);
      setMessages(response);
      // Buscar previews de links
      extractAndFetchPreviews(response);
      const unread = response.filter(m => !m.isFromMe && !m.readAt);
      for(const m of unread){ try{ await chatAPI.markMessageAsRead(m.id);}catch(e){} }
    } catch (error) {
      toast({ title: 'Erro ao carregar mensagens', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    try { setSending(true);
      const message = await chatAPI.sendMessage(selectedConversation.id, newMessage.trim());
      setMessages(prev => [...prev, message]);
      // Preview do link da nova mensagem
      extractAndFetchPreviews([message]);
      setNewMessage('');
      setConversations(prev => prev.map(c => c.id===selectedConversation.id ? { ...c, lastMessage:newMessage.trim(), lastMessageAt:new Date().toISOString() } : c));
    } catch (error) {
      toast({ title: 'Erro ao enviar mensagem', description: 'Não foi possível enviar sua mensagem.', variant: 'destructive' });
    } finally { setSending(false); }
  };

  const selectConversation = (conv) => { setSelectedConversation(conv); loadMessages(conv.id); };
  const scrollToBottom = () => { const el = messagesContainerRef.current; if(el) el.scrollTop = el.scrollHeight; };
  useEffect(()=>{ if(user?.type==='school') loadConversations(); },[user]);
  useEffect(()=>{ scrollToBottom(); },[messages]);

  // Extração de URLs e busca de previews
  const extractAndFetchPreviews = (msgs=[]) => {
    const urlRegex = /(https?:\/\/[\w\-._~:\/?#%[\]@!$&'()*+,;=]+)|(www\.[\w\-._~:\/?#%[\]@!$&'()*+,;=]+)/gi;
    const urls = new Set();
    msgs.forEach(m => { const text = m.message || ''; let match; while((match = urlRegex.exec(text))){ let u = match[0]; if(u.startsWith('www.')) u='https://'+u; urls.add(u);} });
    urls.forEach(u => { if(!linkPreviews[u]) fetchPreview(u); });
  };
  const fetchPreview = async (url) => {
    try { const r = await fetch(`/api/chat/link-preview?url=${encodeURIComponent(url)}`); if(!r.ok) return; const data = await r.json(); if(data?.preview){ setLinkPreviews(prev=>({ ...prev, [url]: data.preview })); } } catch(e){}
  };

  const formatTime = (d)=> new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const formatDate = (d)=>{ const date=new Date(d); const t=new Date(); const y=new Date(); y.setDate(t.getDate()-1); if(date.toDateString()===t.toDateString()) return 'Hoje'; if(date.toDateString()===y.toDateString()) return 'Ontem'; return date.toLocaleDateString('pt-BR'); };

  if (!user || user.type !== 'school') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card><CardContent className="p-6 text-center"><p>Acesso restrito às escolas.</p></CardContent></Card>
      </div>
    );
  }

  const openWhatsApp = (conversation) => {
    const raw = conversation?.contactPhone || '';
    const clean = raw.replace(/\D/g,'');
    if(!clean){ toast({ title:'Telefone não encontrado', description:'O aluno não tem telefone cadastrado.', variant:'destructive'}); return; }
    const phone = clean.startsWith('55') ? clean : `55${clean}`;
    const message = `Olá, aqui é a escola ${user.schoolName || ''}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,'_blank');
  };

  return (
    <>
      <Helmet>
        <title>Mensagens - CurrículoJá</title>
      </Helmet>
      <div className="h-[calc(100vh-64px)] bg-white">
        <div className="flex h-full">
                {/* Sidebar */}
                <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-[340px] lg:min-w-[340px] bg-gray-50 border-r border-gray-200 flex-col`}>
                  <div className="h-[72px] px-5 bg-gradient-to-r from-[var(--color1)] to-[var(--color2)] text-white flex items-center rounded-tr-2xl">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <h2 className="text-lg font-semibold">Conversas</h2>
                        <p className="text-blue-100 text-xs">{conversations.length} conversa{conversations.length!==1?'s':''}</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/school-groups')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white text-[var(--color1)] rounded-full text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <UsersRound className="w-4 h-4" />
                        <span>Grupos</span>
                      </motion.button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {loading ? (
                      <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color1)] mx-auto"></div>
                        <p className="mt-3 text-gray-600">Carregando conversas...</p>
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="p-6 text-center">
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 font-medium">Nenhuma conversa ainda</p>
                          <p className="text-sm text-gray-500 mt-2">Converse com seus alunos por aqui</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3">
                        {conversations.map((c)=> (
                          <motion.div key={c.id} whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={()=>selectConversation(c)}
                            className={`p-4 rounded-xl cursor-pointer transition-all duration-200 mb-2 ${selectedConversation?.id===c.id? 'bg-white shadow-md border-2 border-[var(--color1)]':'bg-white hover:shadow-md border border-gray-100'}`}>
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                {c.contactProfileImage ? (
                                  <img 
                                    src={c.contactProfileImage} 
                                    alt={c.contactName || 'Aluno'} 
                                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--color1)] to-[var(--color2)] rounded-full flex items-center justify-center">
                                    <GraduationCap className="w-6 h-6 text-white" />
                                  </div>
                                )}
                                {c.unreadCount>0 && (
                                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{c.unreadCount}</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold text-gray-900 truncate">{c.contactName || 'Aluno'}</h3>
                                  {c.lastMessageAt && <span className="text-xs text-gray-500 ml-2">{formatTime(c.lastMessageAt)}</span>}
                                </div>
                                <p className="text-sm text-gray-600 truncate mt-1">{c.lastMessage || 'Comece uma conversa...'}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Chat */}
                <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-1 flex-col`}>
                  {selectedConversation ? (
                    <>
                      <div className="h-[72px] px-5 bg-white border-b border-gray-200 flex items-center">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-3">
                            <Button variant="ghost" size="sm" className="lg:hidden" onClick={()=>setSelectedConversation(null)}>
                              <ArrowLeft className="w-5 h-5" />
                            </Button>
                            {selectedConversation.contactProfileImage ? (
                              <img 
                                src={selectedConversation.contactProfileImage} 
                                alt={selectedConversation.contactName || 'Aluno'} 
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-100"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-[var(--color1)] to-[var(--color2)] rounded-full flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-white" />
                              </div>
                            )}
                            <div>
                              <h2 className="font-semibold text-gray-900">{selectedConversation.contactName || 'Aluno'}</h2>
                            </div>
                          </div>
                          {!selectedConversation?.isGroup && (
                            <button 
                              onClick={()=>openWhatsApp(selectedConversation)} 
                              className="flex items-center gap-2 px-4 py-2 border-2 border-green-500 text-green-600 rounded-full font-medium hover:bg-green-50 transition-all duration-200"
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              <span className="text-sm font-medium">WhatsApp</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        <div className="space-y-4">
                          {messages.map((m,idx)=>{
                            const showDate = idx===0 || formatDate(messages[idx-1]?.createdAt)!==formatDate(m.createdAt);
                            return (
                              <div key={m.id}>
                                {showDate && (
                                  <div className="text-center my-6"><span className="bg-white px-4 py-2 rounded-full text-sm text-gray-600 shadow-sm">{formatDate(m.createdAt)}</span></div>
                                )}
                                <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className={`flex ${m.isFromMe?'justify-end':'justify-start'}`}>
                                  {(() => {
                                    const text = m.message || '';
                                    const urlRegex = /(https?:\/\/[\w\-._~:\/?#%[\]@!$&'()*+,;=]+)|(www\.[\w\-._~:\/?#%[\]@!$&'()*+,;=]+)/gi;
                                    const onlyUrl = text.trim().match(/^((https?:\/\/)|(www\.))\S+$/i);
                                    const bubbleBase = 'max-w-xs lg:max-w-md px-4 py-3 rounded-2xl';
                                    const bubbleClass = onlyUrl
                                      ? 'bg-transparent text-gray-900'
                                      : (m.isFromMe ? 'bg-gradient-to-r from-[var(--color1)] to-[var(--color2)] text-white' : 'bg-white text-gray-900 shadow-sm border border-gray-100');
                                    const timeClass = onlyUrl ? 'text-gray-400' : (m.isFromMe ? 'text-blue-100' : 'text-gray-500');
                                    return (
                                      <div className={`${bubbleBase} ${bubbleClass}`}>
                                        <div className="text-sm leading-relaxed break-words space-y-2">
                                          {(() => {
                                            let content = null;
                                            if (!onlyUrl) {
                                              const cleaned = text.replace(urlRegex, '').replace(/\s{2,}/g,' ').trim();
                                              if (cleaned) content = <p>{cleaned}</p>;
                                            }
                                            const previews = [];
                                            const seen = new Set();
                                            let mch; while((mch = urlRegex.exec(text))){ let u = mch[0]; if(u.startsWith('www.')) u='https://'+u; if(seen.has(u)) continue; seen.add(u); previews.push(
                                              <LinkPreview key={u} url={u} preview={linkPreviews[u]} />
                                            ); }
                                            return <>{content}{previews}</>;
                                          })()}
                                        </div>
                                        <p className={`text-xs mt-2 ${timeClass}`}>{formatTime(m.createdAt)}</p>
                                      </div>
                                    );
                                  })()}
                                </motion.div>
                              </div>
                            );
                          })}
                          {/* bottom spacer removed; we now scroll the container directly */}
                        </div>
                      </div>
                      <div className="bg-white border-t border-gray-200 p-6">
                        <div className="flex items-center space-x-3">
                          <Input value={newMessage} onChange={(e)=>setNewMessage(e.target.value)} placeholder="Digite uma mensagem..." className="flex-1 rounded-xl border-2 border-gray-200 focus:border-[var(--color1)] px-4 py-3" onKeyPress={(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); } }} />
                          <Button onClick={sendMessage} disabled={!newMessage.trim()||sending} className="bg-gradient-to-r from-[var(--color1)] to-[var(--color2)] hover:from-[var(--color2)] hover:to-[var(--color3)] text-white px-6 py-3 rounded-xl transition-all duration-200">{sending ? (<div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />) : (<Send className="w-5 h-5" />)}</Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-[var(--color1)] to-[var(--color2)] rounded-full flex items-center justify-center mx-auto mb-6">
                          <MessageSquare className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-3">Selecione uma conversa</h2>
                        <p className="text-gray-600 max-w-md">Escolha um aluno na lista à esquerda para começar a conversar</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
    </>
  );
};

export default SchoolMessages;
