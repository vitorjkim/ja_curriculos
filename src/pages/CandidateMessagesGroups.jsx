import React, { useEffect, useState, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { MessageSquare, Send, School, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { chatAPI } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GroupBadge } from '@/components/chat/GroupBadge';
import { Card, CardContent } from '@/components/ui/card';

const CandidateMessagesGroups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesRef = useRef(null);

  const loadGroups = async () => {
    try { const r = await chatAPI.getGroups(); setGroups(r); } catch(e){ console.error(e); } finally { setLoading(false); }
  };
  const loadMessages = async (g) => {
    try { const r = await chatAPI.getGroupMessages(g.key); setMessages(r); } catch(e){ console.error(e); }
  };

  useEffect(()=>{ if(user?.type==='candidate') loadGroups(); },[user]);
  useEffect(()=>{ if(selected) loadMessages(selected); },[selected]);
  useEffect(()=>{ const el = messagesRef.current; if(el) el.scrollTop = el.scrollHeight; },[messages]);

  if(!user || user.type !== 'candidate') {
    return <div className="min-h-screen flex items-center justify-center"><Card><CardContent className="p-6">Acesso restrito.</CardContent></Card></div>;
  }

  const formatTime = (d)=> new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const formatDate = (d)=>{ const date=new Date(d); const t=new Date(); const y=new Date(); y.setDate(t.getDate()-1); if(date.toDateString()===t.toDateString()) return 'Hoje'; if(date.toDateString()===y.toDateString()) return 'Ontem'; return date.toLocaleDateString('pt-BR'); };

  return (
    <>
      <Helmet><title>Mensagens em Grupo - CurrículoJá</title></Helmet>
      <div className="h-[calc(100vh-64px)] bg-white">
        <div className="flex h-full">
                <div className={`${selected ? 'hidden lg:flex':'flex'} w-full lg:w-[340px] lg:min-w-[340px] bg-gray-50 border-r border-gray-200 flex-col`}>
                  <div className="h-[72px] px-5 bg-gradient-to-r from-[var(--color1)] to-[var(--color2)] text-white flex items-center rounded-tr-2xl">
                    <div>
                      <h2 className="text-lg font-semibold">Grupos</h2>
                      <p className="text-blue-100 text-xs">{groups.length} grupo{groups.length!==1?'s':''}</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    {loading ? (
                      <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color1)] mx-auto" />
                        <p className="mt-3 text-gray-600">Carregando...</p>
                      </div>
                    ) : groups.length === 0 ? (
                      <div className="p-6 text-center text-gray-600 text-sm">Nenhum grupo disponível.</div>
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
                        <span className="text-xs text-gray-500">Somente leitura</span>
                      </div>
                      <div ref={messagesRef} className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        <div className="space-y-4">
                          {messages.map((m,i)=>{
                            const showDate = i===0 || formatDate(messages[i-1]?.createdAt)!==formatDate(m.createdAt);
                            return (
                              <div key={m.id}>
                                {showDate && <div className="text-center my-6"><span className="bg-white px-4 py-2 rounded-full text-sm text-gray-600 shadow-sm">{formatDate(m.createdAt)}</span></div>}
                                <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className={`flex justify-start`}>
                                  <div className="max-w-md px-4 py-3 rounded-2xl bg-white text-gray-900 shadow-sm border border-gray-100">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>
                                    <p className="text-xs mt-2 text-gray-500">{formatTime(m.createdAt)}</p>
                                  </div>
                                </motion.div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="bg-white border-t border-gray-200 p-4 text-center text-xs text-gray-500">Mensagens enviadas pela escola • Você não pode responder</div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50"><div className="text-center"><div className="w-24 h-24 bg-gradient-to-br from-[var(--color1)] to-[var(--color2)] rounded-full flex items-center justify-center mx-auto mb-6"><MessageSquare className="w-12 h-12 text-white" /></div><h2 className="text-2xl font-semibold text-gray-900 mb-3">Selecione um grupo</h2><p className="text-gray-600 max-w-md">Veja os comunicados da sua escola ou turma</p></div></div>
                  )}
                </div>
              </div>
            </div>
    </>
  );
};

export default CandidateMessagesGroups;
