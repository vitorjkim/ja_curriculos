import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { MessageSquare, Send, School, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { chatAPI } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GroupBadge } from '@/components/chat/GroupBadge';
import LinkPreview from '@/components/chat/LinkPreview';
import { Card, CardContent } from '@/components/ui/card';

const SchoolMessagesGroups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(null);
  const [linkPreviews, setLinkPreviews] = useState({});

  const loadGroups = async () => { try { const r = await chatAPI.getGroups(); setGroups(r); } catch(e){ console.error(e);} finally{ setLoading(false);} };
  const loadMessages = async (g) => {
    try {
      const r = await chatAPI.getGroupMessages(g.key);
      // Para a visão da escola, mensagens do grupo são comunicados enviados pela própria escola
      const adjusted = (r || []).map(m => ({ ...m, isFromMe: true }));
      setMessages(adjusted);
      extractAndFetchPreviews(adjusted);
    } catch(e){ console.error(e);} };

  useEffect(()=>{ if(user?.type==='school') loadGroups(); },[user]);
  useEffect(()=>{ if(selected) loadMessages(selected); },[selected]);
  useEffect(()=>{ const el = messagesRef.current; if(el) el.scrollTop = el.scrollHeight; },[messages]);

  if(!user || user.type !== 'school') return <div className="min-h-screen flex items-center justify-center"><Card><CardContent className="p-6">Acesso restrito.</CardContent></Card></div>;

  const sendMessage = async () => {
    if(!newMessage.trim() || !selected || sending) return;
    try {
      setSending(true);
      const m = await chatAPI.sendGroupMessage(selected.key, newMessage.trim());
      const mine = { ...m, isFromMe: true };
      setMessages(prev=>[...prev, mine]);
      extractAndFetchPreviews([mine]);
      setNewMessage('');
      setGroups(prev=> prev.map(g=> g.key===selected.key ? { ...g, lastMessage:mine.message, lastMessageAt:mine.createdAt }: g));
    }
    catch(e){ console.error(e);} finally { setSending(false);} };
  // Link preview helpers
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

  return (
    <>
      <Helmet><title>Comunicados (Grupos) - CurrículoJá</title></Helmet>
      <div className="h-[calc(100vh-64px)] bg-white">
        <div className="flex h-full">
                <div className={`${selected ? 'hidden lg:flex':'flex'} w-full lg:w-[340px] lg:min-w-[340px] bg-gray-50 border-r border-gray-200 flex-col`}>
                  <div className="h-[72px] px-5 bg-gradient-to-r from-[var(--color1)] to-[var(--color2)] text-white flex items-center rounded-tr-2xl">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <h2 className="text-lg font-semibold">Grupos</h2>
                        <p className="text-blue-100 text-xs">{groups.length} grupo{groups.length!==1?'s':''}</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/school-messages')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white text-[var(--color1)] rounded-full text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Mensagens</span>
                      </motion.button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    {loading ? (
                      <div className="p-6 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color1)] mx-auto" /><p className="mt-3 text-gray-600">Carregando...</p></div>
                    ) : groups.length === 0 ? (
                      <div className="p-6 text-center text-gray-600 text-sm">Nenhum grupo.</div>
                    ) : groups.map(g => (
                      <motion.div key={g.key} whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={()=>setSelected(g)}
                        className={`p-4 rounded-xl cursor-pointer transition-all duration-200 mb-2 ${selected?.key===g.key?'bg-white shadow-md border-2 border-[var(--color1)]':'bg-white hover:shadow-md border border-gray-100'}`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color1)] to-[var(--color2)] flex items-center justify-center text-white">
                            {g.type==='school'? <School className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-gray-900 truncate flex items-center gap-2">{g.name}<GroupBadge type={g.type} /></h3>
                              {g.lastMessageAt && <span className="text-xs text-gray-500 ml-2">{formatTime(g.lastMessageAt)}</span>}
                            </div>
                            <p className="text-sm text-gray-600 truncate mt-1">{g.lastMessage || 'Sem mensagens ainda'}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className={`${selected ? 'flex':'hidden lg:flex'} flex-1 flex-col`}>
                  {selected ? (
                    <>
                      <div className="h-[72px] px-5 bg-white border-b border-gray-200 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-3">{selected.name}<GroupBadge type={selected.type} /></h2>
                        <span className="text-xs text-gray-500">Somente escola envia</span>
                      </div>
                      <div ref={messagesRef} className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        <div className="space-y-4">
                          {messages.map((m,i)=>{
                            const showDate = i===0 || formatDate(messages[i-1]?.createdAt)!==formatDate(m.createdAt);
                            return (
                              <div key={m.id}>
                                {showDate && <div className="text-center my-6"><span className="bg-white px-4 py-2 rounded-full text-sm text-gray-600 shadow-sm">{formatDate(m.createdAt)}</span></div>}
                                <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className={`flex ${m.isFromMe ? 'justify-end' : 'justify-start'}`}>
                                  {(() => {
                                    const text = m.message || '';
                                    const urlRegex = /(https?:\/\/[\w\-._~:\/?#%[\]@!$&'()*+,;=]+)|(www\.[\w\-._~:\/?#%[\]@!$&'()*+,;=]+)/gi;
                                    const onlyUrl = text.trim().match(/^((https?:\/\/)|(www\.))\S+$/i);
                                    const bubbleBase = 'max-w-md px-4 py-3 rounded-2xl';
                                    const bubbleClass = onlyUrl 
                                      ? 'bg-transparent text-gray-900' 
                                      : (m.isFromMe 
                                          ? 'bg-gradient-to-r from-[var(--color1)] to-[var(--color2)] text-white' 
                                          : 'bg-white text-gray-900 shadow-sm border border-gray-100');
                                    const timeClass = onlyUrl 
                                      ? 'text-gray-400' 
                                      : (m.isFromMe ? 'text-blue-100' : 'text-gray-500');
                                    return (
                                      <div className={`${bubbleBase} ${bubbleClass} shadow-sm`}>
                                        <div className="text-sm leading-relaxed whitespace-pre-wrap space-y-2">
                                          {(() => {
                                            let content = null;
                                            if (!onlyUrl) {
                                              const cleaned = text.replace(urlRegex, '').replace(/\s{2,}/g,' ').trim();
                                              if (cleaned) content = <p className="whitespace-pre-wrap">{cleaned}</p>;
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
                        </div>
                      </div>
                      <div className="bg-white border-t border-gray-200 p-4">
                        <div className="flex items-center space-x-3">
                          <Input value={newMessage} onChange={(e)=>setNewMessage(e.target.value)} placeholder="Digite uma mensagem de comunicado..." className="flex-1 rounded-xl border-2 border-gray-200 focus:border-[var(--color1)] px-4 py-3" onKeyPress={(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); } }} />
                          <Button onClick={sendMessage} disabled={!newMessage.trim()||sending} className="bg-gradient-to-r from-[var(--color1)] to-[var(--color2)] hover:from-[var(--color2)] hover:to-[var(--color3)] text-white px-6 py-3 rounded-xl transition-all duration-200">
                            {sending ? <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send className="w-5 h-5" />}
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50"><div className="text-center"><div className="w-24 h-24 bg-gradient-to-br from-[var(--color1)] to-[var(--color2)] rounded-full flex items-center justify-center mx-auto mb-6"><MessageSquare className="w-12 h-12 text-white" /></div><h2 className="text-2xl font-semibold text-gray-900 mb-3">Selecione um grupo</h2><p className="text-gray-600 max-w-md">Envie comunicados para a escola toda ou para uma turma específica</p></div></div>
                  )}
                </div>
              </div>
            </div>
    </>
  );
};

export default SchoolMessagesGroups;
