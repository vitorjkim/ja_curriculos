import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { companySchoolApi } from '@/lib/companySchoolApi';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Loader2, FileText, Heart, MessageCircle, Share2, ChevronDown, ChevronUp, MapPin, Phone, Globe, Mail, User, GraduationCap, ArrowLeft, Star, Info, Users, Image } from 'lucide-react';
import AdaptiveSchoolImage from '@/components/AdaptiveSchoolImage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { loadPosts as lsLoadPosts, toggleLike as lsToggleLike, addComment as lsAddComment, getIdentifiersFromObj } from '@/lib/schoolPosts';
import { schoolPostsApi } from '@/lib/schoolPostsApi';
import PartnershipButton from '@/components/PartnershipButton';

const CompanySchoolProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [school,setSchool]=useState(null);
  const [featured,setFeatured]=useState([]);
  const [classes,setClasses]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [showDetails, setShowDetails] = useState(false);
  // Posts feed (somente visualização/engajamento)
  const { toast } = useToast();
  const [posts, setPosts] = useState([]);
  const [commentInputs, setCommentInputs] = useState({});
  const [replyInputs, setReplyInputs] = useState({});
  const [replyOpen, setReplyOpen] = useState({});

  useEffect(()=>{
    const load = async () => {
  try{ setLoading(true); const data = await companySchoolApi.getSchool(id); setSchool(data.school); setFeatured(data.featured||[]); setClasses(data.classes||[]);}catch(e){ setError(e.message);} finally{ setLoading(false);} };
    if(user?.type==='company') load();
    const refreshPosts = async (schoolId) => {
      try {
        const apiPosts = await schoolPostsApi.listBySchool(schoolId || id);
        setPosts(apiPosts);
      } catch {
        setPosts(lsLoadPosts());
      }
    };
    refreshPosts();
    const onUpdated = () => refreshPosts();
    window.addEventListener('school-posts-updated', onUpdated);
    return () => window.removeEventListener('school-posts-updated', onUpdated);
  },[id,user]);

  if(!user || user.type!=='company') return <div className='max-w-6xl mx-auto p-6'>Acesso restrito às empresas.</div>;

  return (
    <div className='min-h-screen bg-slate-50/80'>
      <div className='max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8'>
      {loading && <div className='flex items-center justify-center gap-2 text-slate-500 py-12'><Loader2 className='w-6 h-6 animate-spin'/> <span className='text-sm font-medium'>Carregando...</span></div>}
      {error && (
        <div className='max-w-2xl mx-auto'>
          {error.includes('Premium') ? (
            <div className='bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-orange-300 text-orange-800 rounded-[18px] sm:rounded-[22px] p-5 sm:p-7 text-sm shadow-[0_18px_45px_rgba(15,23,42,0.06)]'>
              <p className='font-bold text-sm sm:text-base mb-2'>Recurso exclusivo do Plano Premium</p>
              <p className='leading-relaxed mb-4 text-xs sm:text-sm'>Este recurso está disponível apenas para empresas com plano <strong>Premium</strong> ativo.</p>
              <a href='/subscription-plans' className='inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-[12px] sm:rounded-[14px] bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-[2px]'>Atualizar meu Plano</a>
            </div>
          ) : <div className='bg-red-50 border-2 border-red-300 text-red-700 rounded-[18px] sm:rounded-[22px] p-5 sm:p-7 text-sm shadow-[0_18px_45px_rgba(15,23,42,0.06)]'>{error}</div>}
        </div>
      )}
      {school && (
        <div className='bg-white/95 backdrop-blur-sm border-2 border-slate-200 rounded-[20px] sm:rounded-[24px] p-4 sm:p-8 shadow-[0_18px_45px_rgba(15,23,42,0.06)]'>
          {/* Header da Escola */}
          <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-5 sm:mb-6'>
            <div className='flex items-center gap-3 sm:gap-5'>
              <AdaptiveSchoolImage 
                src={school.profile_image} 
                alt={school.school_name}
                size='xl'
                fallbackIcon={GraduationCap}
                className='ring-2 ring-blue-100 !w-16 !h-16 sm:!w-20 sm:!h-20'
              />
              <div>
                <h1 className='text-xl sm:text-[2rem] font-bold text-slate-900 tracking-tight leading-tight'>{school.school_name}</h1>
                <div className='flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 mt-1 sm:mt-1.5 font-medium'>
                  <MapPin className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400' />
                  {school.school_city}{school.school_state && ` - ${school.school_state}`}
                </div>
                {school.school_type && (
                  <div className='inline-flex items-center gap-1 sm:gap-1.5 mt-2 sm:mt-3 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-50 border border-blue-200'>
                    <Building2 className='w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600' />
                    <span className='text-[10px] sm:text-xs text-blue-700 font-bold uppercase tracking-wide'>Escola {school.school_type}</span>
                  </div>
                )}
              </div>
            </div>
            <div className='flex flex-row gap-2 sm:gap-3 mt-2 sm:mt-0'>
              <PartnershipButton 
                userType="company"
                targetId={id}
                targetName={school.school_name}
              />
              <button 
                onClick={()=> window.history.back()} 
                className='inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm rounded-[10px] sm:rounded-[12px] border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[1px]'
              >
                <ArrowLeft className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                <span className='hidden xs:inline'>Voltar</span>
              </button>
            </div>
          </div>

          {/* Accordion - Informações da Escola */}
          <div className='mb-6 sm:mb-8'>
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className='w-full flex items-center justify-between p-3 sm:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-[14px] sm:rounded-[16px] border-2 border-blue-100 hover:border-blue-200 transition-all duration-200 group'
            >
              <div className='flex items-center gap-2 sm:gap-3'>
                <div className='w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-[12px] bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors'>
                  <FileText className='w-4 h-4 sm:w-5 sm:h-5 text-blue-600' />
                </div>
                <div className='text-left'>
                  <h3 className='text-xs sm:text-sm font-bold text-slate-900'>Informações da Escola</h3>
                  <p className='text-[10px] sm:text-xs text-slate-500 mt-0.5'>Clique para {showDetails ? 'ocultar' : 'ver'} detalhes</p>
                </div>
              </div>
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center transition-transform duration-300 ${showDetails ? 'rotate-180' : ''}`}>
                <ChevronDown className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600' />
              </div>
            </button>
            
            {/* Conteúdo expandível */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showDetails ? 'max-h-[600px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className='bg-slate-50/80 rounded-[16px] p-6 border-2 border-slate-200'>
                <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-5'>
                  <div className='flex items-start gap-3 p-4 bg-white rounded-[12px] border border-slate-200 shadow-sm'>
                    <div className='w-9 h-9 rounded-[10px] bg-blue-50 flex items-center justify-center flex-shrink-0'>
                      <GraduationCap className='w-4.5 h-4.5 text-blue-600' />
                    </div>
                    <div className='min-w-0'>
                      <div className='text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Nome</div>
                      <div className='font-semibold text-slate-900 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate'>{school.school_name}</div>
                    </div>
                  </div>
                  <div className='flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm'>
                    <div className='w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-purple-50 flex items-center justify-center flex-shrink-0'>
                      <Building2 className='w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-purple-600' />
                    </div>
                    <div className='min-w-0'>
                      <div className='text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Tipo</div>
                      <div className='text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm'>{school.school_type || '—'}</div>
                    </div>
                  </div>
                  <div className='flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm'>
                    <div className='w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-green-50 flex items-center justify-center flex-shrink-0'>
                      <MapPin className='w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-green-600' />
                    </div>
                    <div className='min-w-0'>
                      <div className='text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Localização</div>
                      <div className='text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate'>{school.school_city || '—'}{school.school_state && ` - ${school.school_state}`}</div>
                    </div>
                  </div>
                  <div className='flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm'>
                    <div className='w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-amber-50 flex items-center justify-center flex-shrink-0'>
                      <User className='w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-amber-600' />
                    </div>
                    <div className='min-w-0'>
                      <div className='text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Diretor</div>
                      <div className='text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate'>{school.school_director || '—'}</div>
                    </div>
                  </div>
                  <div className='flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm'>
                    <div className='w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-rose-50 flex items-center justify-center flex-shrink-0'>
                      <Phone className='w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-rose-600' />
                    </div>
                    <div className='min-w-0'>
                      <div className='text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Telefone</div>
                      <div className='text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm'>{school.school_contact_phone || '—'}</div>
                    </div>
                  </div>
                  <div className='flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm'>
                    <div className='w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-indigo-50 flex items-center justify-center flex-shrink-0'>
                      <Mail className='w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-indigo-600' />
                    </div>
                    <div className='min-w-0'>
                      <div className='text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Email</div>
                      <div className='text-slate-800 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate'>{school.email || '—'}</div>
                    </div>
                  </div>
                  {school.school_website && (
                    <div className='flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-[10px] sm:rounded-[12px] border border-slate-200 shadow-sm col-span-2 lg:col-span-3'>
                      <div className='w-7 h-7 sm:w-9 sm:h-9 rounded-[8px] sm:rounded-[10px] bg-cyan-50 flex items-center justify-center flex-shrink-0'>
                        <Globe className='w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-cyan-600' />
                      </div>
                      <div className='min-w-0'>
                        <div className='text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Website</div>
                        <a href={school.school_website} target='_blank' rel='noreferrer' className='text-[#2563eb] hover:text-blue-700 hover:underline break-all mt-0.5 sm:mt-1 inline-block font-medium text-xs sm:text-sm truncate max-w-full'>{school.school_website}</a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Alunos Destacados */}
          <div className='mb-6 sm:mb-8'>
            <h2 className='text-base sm:text-lg font-bold text-slate-900 mb-4 sm:mb-5 flex items-center gap-2'>
              <Star className='w-4 h-4 sm:w-5 sm:h-5 text-amber-500 stroke-[2.5]' fill='none' /> Alunos <span className='text-[#2563eb]'>Destacados</span>
            </h2>
            {featured.length===0 ? <div className='text-xs sm:text-sm text-slate-500 bg-slate-50 rounded-[14px] sm:rounded-[16px] p-4 sm:p-5 border-2 border-slate-200'>Nenhum aluno destacado.</div> : (
              <div className='grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5'>
                {featured.map(f => (
                  <div key={f.user_id} className='border-2 border-amber-200 rounded-[14px] sm:rounded-[18px] p-3 sm:p-5 bg-gradient-to-br from-white to-amber-50/50 flex flex-col shadow-[0_12px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-[2px] relative hover:z-[100]'>
                    {/* Info Icon with Tooltip - hidden on mobile */}
                    <div className='absolute top-2 sm:top-3 right-2 sm:right-3 group/tooltip hidden sm:block'>
                      <div className='w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 flex items-center justify-center cursor-help hover:bg-blue-200 transition-colors'>
                        <Info className='w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600' />
                      </div>
                      <div className='absolute right-0 top-8 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-4 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[9999]'>
                        <div className='space-y-2.5'>
                          <div>
                            <div className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Nome</div>
                            <div className='text-sm text-slate-800 font-medium'>{f.name}</div>
                          </div>
                          <div>
                            <div className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Email</div>
                            <div className='text-sm text-slate-800'>{f.email || '—'}</div>
                          </div>
                          <div>
                            <div className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Telefone</div>
                            <div className='text-sm text-slate-800'>{f.phone || '—'}</div>
                          </div>
                          <div>
                            <div className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Data de Nascimento</div>
                            <div className='text-sm text-slate-800'>{f.birth_date ? new Date(f.birth_date).toLocaleDateString('pt-BR') : '—'}</div>
                          </div>
                          <div>
                            <div className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Status</div>
                            <div className='text-sm'>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                f.status === 'Ativo' ? 'bg-green-100 text-green-700' :
                                f.status === 'Inativo' ? 'bg-red-100 text-red-700' :
                                f.status === 'Formado' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {f.status || 'Não informado'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Turma</div>
                            <div className='text-sm text-slate-800'>{f.class_name || '—'}</div>
                          </div>
                          <div className='pt-2 border-t border-slate-100'>
                            <div>
                              <div className='text-lg font-bold text-blue-600'>{f.resumes_count || 0}</div>
                              <div className='text-[10px] text-slate-500'>currículos criados</div>
                            </div>
                          </div>
                        </div>
                        <div className='absolute -top-2 right-3 w-3 h-3 bg-white border-l border-t border-slate-200 transform rotate-45'></div>
                      </div>
                    </div>
                    <div className='flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4'>
                      {f.profile_image ? (
                        <img 
                          src={f.profile_image} 
                          alt={f.name}
                          className='w-12 h-12 sm:w-[68px] sm:h-[68px] rounded-full object-cover shadow-md border-2 border-white ring-2 ring-amber-100'
                        />
                      ) : (
                        <div className='w-12 h-12 sm:w-[68px] sm:h-[68px] rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-md ring-2 ring-blue-100'>
                          {f.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className='flex-1 min-w-0'>
                        <div className='font-semibold text-xs sm:text-sm text-slate-900 line-clamp-1'>{f.name}</div>
                        <div className='text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate'>Turma: {f.class_name || 'Sem turma'}</div>
                      </div>
                    </div>
                    <button onClick={()=>window.location.href=`/alunos/${f.user_id}`} className='mt-auto inline-flex items-center justify-center text-[10px] sm:text-xs px-3 sm:px-4 py-2 sm:py-2.5 rounded-[10px] sm:rounded-[12px] border-2 border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[1px]'>Ver Perfil</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Turmas */}
          <div className='mb-6 sm:mb-8'>
            <div className='flex items-center justify-between mb-4 sm:mb-5'>
              <h2 className='text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2'>
                <Users className='w-4 h-4 sm:w-5 sm:h-5 text-[#2563eb]'/>
                <span className='text-[#2563eb]'>Turmas</span>
              </h2>
              <span className='text-[10px] sm:text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-[10px] sm:rounded-[12px] bg-blue-50 text-[#2563eb] border-2 border-blue-100 font-bold'>{classes.length} turma(s)</span>
            </div>
            {classes.length===0 ? (
              <div className='text-xs sm:text-sm text-slate-500 bg-slate-50 rounded-[14px] sm:rounded-[16px] p-4 sm:p-5 border-2 border-slate-200 flex items-center gap-2 sm:gap-3'>
                <Users className='w-4 h-4 sm:w-5 sm:h-5 text-slate-400'/>
                Nenhuma turma cadastrada.
              </div>
            ) : (
              <div className='space-y-3 sm:space-y-4'>
                {classes.map(cls => (
                  <div key={cls.id} className='bg-white/95 backdrop-blur-sm border-2 border-slate-200 rounded-[14px] sm:rounded-[16px] p-4 sm:p-5 shadow-[0_8px_25px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_35px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-[1px]'>
                    <div className='w-full flex flex-col xs:flex-row xs:items-center justify-between gap-2 sm:gap-0 text-left'>
                      <div className='flex flex-col'>
                        <span className='font-semibold text-slate-900 text-xs sm:text-sm'>{cls.name}</span>
                        <span className='text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 font-medium'>{cls.year?`Ano: ${cls.year}`:''}{cls.shift? (cls.year? ' • ':'')+cls.shift : ''}</span>
                      </div>
                      <button onClick={()=> window.location.href = `/turmas/${cls.id}`} className='text-[10px] sm:text-xs px-3 sm:px-5 py-2 sm:py-2.5 rounded-[10px] sm:rounded-[12px] border-2 border-blue-500 bg-white hover:bg-blue-50 text-[#2563eb] font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[1px] w-full xs:w-auto'>Ver Alunos</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publicações da Escola - Grid estilo Instagram */}
          <div>
            <div className='flex items-center justify-between mb-4 sm:mb-5'>
              <h2 className='text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2'>
                <Image className='w-4 h-4 sm:w-5 sm:h-5 text-[#2563eb]'/>
                <span className='text-[#2563eb]'>Publicações</span>
              </h2>
              <span className='text-[10px] sm:text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-[10px] sm:rounded-[12px] bg-blue-50 text-[#2563eb] border-2 border-blue-100 font-bold'>{(() => {
                const ids = getIdentifiersFromObj({ id: school?.id || id, user_id: school?.user_id, userId: school?.userId, uid: school?.uid, email: school?.email });
                const apiCount = (posts||[]).filter(p => p.author?.id ? ids.includes(String(p.author.id)) : true).length;
                if (apiCount > 0) return apiCount;
                return (posts||[]).filter(p => {
                  const postIds = Array.isArray(p.authorIds) ? p.authorIds : [];
                  const matchId = p.author && ids.includes(String(p.author.id));
                  const matchAuthorIds = postIds.some(x => ids.includes(String(x)));
                  const matchEmail = p.author?.email && ids.includes(String(p.author.email));
                  return matchId || matchAuthorIds || matchEmail;
                }).length;
              })()}</span>
            </div>
            {(() => {
              const ids = getIdentifiersFromObj({ id: school?.id || id, user_id: school?.user_id, userId: school?.userId, uid: school?.uid, email: school?.email });
              let schoolPosts = (posts||[]).filter(p => p.author?.id ? ids.includes(String(p.author.id)) : true);
              if (schoolPosts.length === 0) {
                schoolPosts = (posts||[]).filter(p => {
                  const postIds = Array.isArray(p.authorIds) ? p.authorIds : [];
                  const matchId = p.author && ids.includes(String(p.author.id));
                  const matchAuthorIds = postIds.some(x => ids.includes(String(x)));
                  const matchEmail = p.author?.email && ids.includes(String(p.author.email));
                  return matchId || matchAuthorIds || matchEmail;
                });
              }
              if (schoolPosts.length === 0 && school?.school_name) {
                schoolPosts = (posts||[]).filter(p => (p.author?.name || '').trim().toLowerCase() === school.school_name.trim().toLowerCase());
              }
              schoolPosts.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
              if (schoolPosts.length === 0) return <div className='text-xs sm:text-sm text-slate-500 bg-slate-50 rounded-[14px] sm:rounded-[16px] p-4 sm:p-5 border-2 border-slate-200 flex items-center gap-2 sm:gap-3'><Image className='w-4 h-4 sm:w-5 sm:h-5 text-slate-400'/>Nenhuma publicação desta escola ainda.</div>;
              return (
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {schoolPosts.map(p => (
                    <div 
                      key={p.id}
                      className='bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all'
                    >
                      <div
                        onClick={() => navigate(`/school/${id}/post/${p.id}`)}
                        className='relative aspect-square cursor-pointer'
                        style={{ borderRadius: '16px', overflow: 'hidden' }}
                      >
                        {p.image ? (
                          <img src={p.image} alt='' className='w-full h-full object-cover' style={{ borderRadius: '16px' }} />
                        ) : (
                          <div className='w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-2 sm:p-3'>
                            <p className='text-[10px] sm:text-xs text-slate-600 text-center line-clamp-3 sm:line-clamp-4'>{p.caption || 'Sem conteúdo'}</p>
                          </div>
                        )}
                      </div>
                      <div className='p-3'>
                        {p.caption && (
                          <p className='text-sm text-slate-700 line-clamp-2 mb-2'>{p.caption}</p>
                        )}
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-3'>
                            <span className='flex items-center gap-1 text-sm text-slate-500'>
                              <Heart className='w-4 h-4' />
                              {p.likes?.length || 0}
                            </span>
                            <span className='flex items-center gap-1 text-sm text-slate-500'>
                              <MessageCircle className='w-4 h-4' />
                              {p.comments?.length || 0}
                            </span>
                          </div>
                          <span className='text-xs text-slate-400'>
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default CompanySchoolProfile;
