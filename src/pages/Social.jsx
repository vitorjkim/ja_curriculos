import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Search, ChevronLeft, ChevronRight, ChevronDown, Play, Heart, MessageCircle, Share2, User, Building2, Plus, Image as ImageIcon, X, GraduationCap, MapPin, ExternalLink, Briefcase, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { studentPostsAPI } from '@/lib/api';
import { schoolPostsApi } from '@/lib/schoolPostsApi';
import { toast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import AdaptiveSchoolImage from '@/components/AdaptiveSchoolImage';
import { FaRegHandshake } from 'react-icons/fa';

const Social = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('todos');
  const [filterOpen, setFilterOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostImage, setNewPostImage] = useState(null);
  const [newPostCaption, setNewPostCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [schools, setSchools] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [showCompanyNav, setShowCompanyNav] = useState(false);
  
  // Carrosséis refs
  const carousel1Ref = useRef(null);
  const carousel2Ref = useRef(null);
  const companiesCarouselRef = useRef(null);
  const companiesInitialized = useRef(false);

  // Auto-scroll do carrossel de empresas (init + loop + reposicionamento tudo no RAF)
  useEffect(() => {
    const carousel = companiesCarouselRef.current;
    if (!carousel || (companies.length === 0 && schools.length === 0)) return;

    let animationId;
    const scrollSpeed = -0.8;

    const scroll = () => {
      if (carousel.scrollWidth > 0) {
        // Inicializar no segundo grupo (posição que permite rolar para ambos os lados)
        if (!companiesInitialized.current) {
          const singleGroupWidth = carousel.scrollWidth / 5;
          carousel.scrollLeft = singleGroupWidth * 2;
          companiesInitialized.current = true;
        }

        if (!isPaused) {
          carousel.scrollLeft += scrollSpeed;

          // Reposicionamento infinito dentro do RAF — não depende de eventos de scroll
          const singleGroupWidth = carousel.scrollWidth / 5;
          if (carousel.scrollLeft <= singleGroupWidth * 0.5) {
            carousel.scrollLeft += singleGroupWidth * 2;
          }
          if (carousel.scrollLeft >= singleGroupWidth * 3.5) {
            carousel.scrollLeft -= singleGroupWidth * 2;
          }
        }
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => { if (animationId) cancelAnimationFrame(animationId); };
  }, [companies, schools, isPaused]);

  // Handler para navegação manual do carrossel de empresas
  const handleCompaniesScroll = (direction) => {
    const carousel = companiesCarouselRef.current;
    if (!carousel) return;
    const scrollAmount = 320;
    carousel.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  // Carregar publicações
  useEffect(() => {
    loadPosts();
    loadCompaniesAndSchools();
  }, [selectedFilter]);

  const loadCompaniesAndSchools = async () => {
    try {
      // Carregar empresas com vagas ativas
      const companiesRes = await api.get('/jobs/companies-with-jobs');
      setCompanies(companiesRes.data?.companies || companiesRes.companies || []);
      
      // Carregar escolas
      const schoolsRes = await api.get('/users/schools/list');
      setSchools(schoolsRes.data?.schools || schoolsRes.schools || []);
    } catch (error) {
      console.error('Erro ao carregar empresas/escolas:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const typeFilter = selectedFilter === 'empresas' ? 'companies' : 
                        selectedFilter === 'candidatos' ? 'students' : 
                        selectedFilter === 'escolas' ? 'schools' : null;
      
      const params = typeFilter ? { type: typeFilter } : {};
      const response = await api.get('/social-feed', { params });
      setPosts(response.data?.posts || response.posts || []);
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as publicações',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostImage || !newPostCaption.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Adicione uma imagem e uma descrição',
        variant: 'destructive'
      });
      return;
    }

    try {
      setUploading(true);
      
      // Determinar qual API usar baseado no tipo de usuário
      const userType = user.type || user.role;
      if (userType === 'candidate' || userType === 'company') {
        await studentPostsAPI.create({
          image: newPostImage,
          caption: newPostCaption
        });
      } else if (userType === 'school') {
        await schoolPostsApi.createPost(newPostImage, newPostCaption);
      } else {
        toast({
          title: 'Não permitido',
          description: 'Tipo de usuário não autorizado',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Publicado!',
        description: 'Sua publicação foi criada com sucesso'
      });

      setShowCreateModal(false);
      setNewPostImage(null);
      setNewPostCaption('');
      loadPosts(); // Recarregar feed
    } catch (error) {
      console.error('Erro ao criar post:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível publicar',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPostImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const filters = [
    { value: 'todos', label: 'Todos' },
    { value: 'empresas', label: 'Empresas' },
    { value: 'candidatos', label: 'Candidatos' },
    { value: 'escolas', label: 'Escolas' }
  ];

  const scroll = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = 420; // largura do card + gap
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserTypeIcon = (type) => {
    switch (type) {
      case 'company':
        return <Building2 className="w-4 h-4" />;
      case 'school':
        return <GraduationCap className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const PostCard = ({ post }) => {
    const navigate = useNavigate();
    const isSchool = post.postType === 'school' || post.type === 'school' || post.user?.type === 'school';
    const isCompany = post.postType === 'company' || post.type === 'company' || post.user?.type === 'company';
    const [liked, setLiked] = useState(post.liked || false);
    const [likesCount, setLikesCount] = useState(post.likes || 0);
    
    // Navegar para o perfil do usuário
    const handleProfileClick = (e) => {
      e.stopPropagation();
      const userId = post.user_id || post.user?.id;
      if (isSchool) {
        navigate(`/company/schools/${userId}`);
      } else if (isCompany) {
        navigate(`/company/${userId}`);
      } else {
        navigate(`/alunos/${userId}`);
      }
    };
    
    // Navegar para a página do post
    const handlePostClick = () => {
      const userId = post.user_id || post.user?.id;
      if (isSchool) {
        navigate(`/school/${userId}/post/${post.id}`);
      } else if (isCompany) {
        navigate(`/company/${userId}/post/${post.id}`);
      } else {
        navigate(`/alunos/${userId}/post/${post.id}`);
      }
    };
    
    // Curtir post
    const handleLike = async (e) => {
      e.stopPropagation();
      try {
        if (isSchool) {
          await schoolPostsApi.toggleLike(post.id);
        } else {
          await studentPostsAPI.toggleLike(post.id);
        }
        setLiked(!liked);
        setLikesCount(prev => liked ? prev - 1 : prev + 1);
      } catch (err) {
        console.error('Erro ao curtir:', err);
      }
    };
    
    // Comentar
    const handleComment = (e) => {
      e.stopPropagation();
      handlePostClick(); // Leva para o post onde pode comentar
    };
    
    // Compartilhar
    const handleShare = async (e) => {
      e.stopPropagation();
      const userId = post.user_id || post.user?.id;
      const url = window.location.origin + (isSchool ? `/school/${userId}/post/${post.id}` : `/alunos/${userId}/post/${post.id}`);
      if (navigator.share) {
        try {
          await navigator.share({
            title: post.user?.name || 'Publicação',
            text: post.description || '',
            url: url
          });
        } catch (err) {
          if (err.name !== 'AbortError') {
            navigator.clipboard.writeText(url);
            toast({ title: 'Link copiado!', description: 'O link foi copiado para a área de transferência' });
          }
        }
      } else {
        navigator.clipboard.writeText(url);
        toast({ title: 'Link copiado!', description: 'O link foi copiado para a área de transferência' });
      }
    };
    
    return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="flex-shrink-0 w-[90vw] sm:w-[400px] max-w-[400px]"
    >
      <Card className="rounded-[24px] border-2 border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)] overflow-hidden hover:shadow-[0_20px_60px_rgba(147,51,234,0.15)] hover:border-purple-300 transition-all duration-300">
        <CardContent className="p-0">
          {/* User Info - Clicável para ir ao perfil */}
          <div 
            className="flex items-center gap-3 p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={handleProfileClick}
          >
            {isSchool ? (
              <AdaptiveSchoolImage 
                src={post.user?.avatar} 
                alt={post.user?.name}
                size="sm"
                fallbackIcon={GraduationCap}
              />
            ) : (
              <>
                {post.user?.avatar ? (
                  <img 
                    src={post.user.avatar} 
                    alt={post.user.name}
                    className="h-12 w-12 rounded-full object-cover border-2 border-purple-100"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-white font-semibold items-center justify-center text-lg border-2 border-purple-100"
                  style={{ display: post.user?.avatar ? 'none' : 'flex' }}
                >
                  {getInitials(post.user?.name)}
                </div>
              </>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800 truncate hover:text-purple-600 transition-colors">{post.user?.name}</h3>
                <span className="text-purple-600">{getUserTypeIcon(post.user?.type)}</span>
              </div>
              <p className="text-sm text-slate-500 truncate">{isSchool ? 'Escola' : isCompany ? 'Empresa' : 'Estudante'}</p>
              <p className="text-xs text-slate-400">{post.timestamp}</p>
            </div>
          </div>

          {/* Content - Clicável para ir ao post */}
          <div 
            className="relative bg-slate-100 aspect-[4/3] cursor-pointer"
            onClick={handlePostClick}
          >
            {post.content.type === 'video' ? (
              <div className="relative w-full h-full">
                <img
                  src={post.content.thumbnail}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-purple-600 ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>
            ) : (
              <img
                src={post.content.url}
                alt="Post content"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Description & Actions */}
          <div className="p-4">
            <p 
              className="text-slate-700 mb-3 line-clamp-2 cursor-pointer hover:text-slate-900"
              onClick={handlePostClick}
            >
              {post.description.split(/\s+/).map((word, i) => {
                const urlRegex = /^(https?:\/\/[^\s]+)$/;
                if (urlRegex.test(word)) {
                  return (
                    <a 
                      key={i} 
                      href={word} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-purple-600 hover:text-purple-800 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {word}
                    </a>
                  );
                }
                return word + ' ';
              })}
            </p>
            
            <div className="flex items-center gap-1 sm:gap-2 text-slate-600 flex-wrap">
              <button 
                onClick={handleLike}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full transition-all duration-200 ${
                  liked 
                    ? 'bg-red-50 text-red-500' 
                    : 'hover:bg-red-50 hover:text-red-500'
                }`}
              >
                <Heart className={`w-4 sm:w-5 h-4 sm:h-5 transition-all ${liked ? 'fill-red-500' : ''}`} />
                <span className="text-xs sm:text-sm font-medium">{likesCount}</span>
              </button>
              <button 
                onClick={handleComment}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full hover:bg-purple-50 hover:text-purple-600 transition-all duration-200"
              >
                <MessageCircle className="w-4 sm:w-5 h-4 sm:h-5" />
                <span className="text-xs sm:text-sm font-medium">{post.comments || 0}</span>
              </button>
              <button 
                onClick={handleShare}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full hover:bg-green-50 hover:text-green-600 transition-all duration-200 ml-auto"
              >
                <Share2 className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
  };

  const Carousel = ({ posts, carouselRef, title, bgColor }) => {
    const [isCarouselPaused, setIsCarouselPaused] = useState(false);
    const hasInitialized = useRef(false);
    
    // Multiplicar posts para efeito infinito (5x para garantir)
    const multipliedPosts = [...posts, ...posts, ...posts, ...posts, ...posts];
    
    // Inicializar scroll no meio e monitorar scroll para loop infinito
    useEffect(() => {
      const carousel = carouselRef.current;
      if (!carousel || posts.length === 0) return;
      
      // Posicionar no início do terceiro grupo (meio dos 5x)
      const initializePosition = () => {
        if (!hasInitialized.current && carousel.scrollWidth > 0) {
          const singleGroupWidth = carousel.scrollWidth / 5;
          carousel.scrollLeft = singleGroupWidth * 2;
          hasInitialized.current = true;
        }
      };
      
      // Verificar e reposicionar para manter loop infinito
      const handleScrollEvent = () => {
        const singleGroupWidth = carousel.scrollWidth / 5;
        
        // Se chegou muito perto do final, volta pro meio
        if (carousel.scrollLeft >= singleGroupWidth * 3.5) {
          carousel.scrollLeft = carousel.scrollLeft - singleGroupWidth * 2;
        }
        // Se chegou muito perto do início, avança pro meio
        if (carousel.scrollLeft <= singleGroupWidth * 0.5) {
          carousel.scrollLeft = carousel.scrollLeft + singleGroupWidth * 2;
        }
      };
      
      initializePosition();
      carousel.addEventListener('scroll', handleScrollEvent);
      
      return () => {
        carousel.removeEventListener('scroll', handleScrollEvent);
      };
    }, [posts, carouselRef]);
    
    // Auto-scroll para o carrossel de publicações
    useEffect(() => {
      const carousel = carouselRef.current;
      if (!carousel || posts.length === 0) return;
      
      let animationId;
      const scrollSpeed = 0.8;
      
      const autoScroll = () => {
        if (!isCarouselPaused && carousel) {
          carousel.scrollLeft += scrollSpeed;
        }
        animationId = requestAnimationFrame(autoScroll);
      };
      
      animationId = requestAnimationFrame(autoScroll);
      
      return () => {
        if (animationId) cancelAnimationFrame(animationId);
      };
    }, [posts, isCarouselPaused, carouselRef]);
    
    // Handler para navegação manual
    const handleScroll = (direction) => {
      const carousel = carouselRef.current;
      if (!carousel) return;
      
      const scrollAmount = 420;
      carousel.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    };
    
    return (
      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4 px-4 sm:px-6">{title}</h2>
        <div 
          className="relative group -mb-4"
          onMouseEnter={() => setIsCarouselPaused(true)}
          onMouseLeave={() => setIsCarouselPaused(false)}
        >
          {/* Botão Esquerda */}
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
          >
            <ChevronLeft className="w-5 sm:w-6 h-5 sm:h-6 text-slate-700" />
          </button>

          {/* Carrossel */}
          <div
            ref={carouselRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-hide px-4 sm:px-6 pt-4 pb-8"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollBehavior: 'auto' }}
          >
            {multipliedPosts.map((post, index) => (
              <PostCard key={`${post.id}-${index}`} post={post} />
            ))}
          </div>

          {/* Botão Direita */}
          <button
            onClick={() => handleScroll('right')}
            className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
          >
            <ChevronRight className="w-5 sm:w-6 h-5 sm:h-6 text-slate-700" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <Helmet>
        <title>Social - CurrículoJá</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-[1400px]">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              <span className="text-gray-900">Feed </span>
              <span className="text-purple-600">Social</span>
            </h1>
            <p className="text-slate-600 text-sm sm:text-base">Descubra empresas, candidatos e conteúdos incríveis da comunidade</p>
          </div>
          
          {/* Botão Criar Publicação */}
          {user && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="rounded-2xl bg-purple-600 hover:bg-purple-700 text-white px-6 py-6 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto flex-shrink-0"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova Publicação
            </Button>
          )}
        </div>

        {/* Barra de Pesquisa e Filtros */}
        <Card className="rounded-[24px] border-2 border-slate-200 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.08)] mb-8">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar publicações..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 sm:pl-12 h-10 sm:h-12 rounded-2xl border-2 border-slate-200 focus:border-purple-400 focus:outline-none px-4 text-sm sm:text-base"
                />
              </div>

              {/* Filtros - dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFilterOpen(o => !o)}
                  className="flex items-center gap-2 px-4 h-10 sm:h-12 rounded-2xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-purple-300 hover:text-purple-700 transition-all"
                >
                  <span>{filters.find(f => f.value === selectedFilter)?.label ?? 'Todos'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {filterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[180px] bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden"
                    >
                      {filters.map(filter => (
                        <button
                          key={filter.value}
                          type="button"
                          onClick={() => { setSelectedFilter(filter.value); setFilterOpen(false); }}
                          className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                        >
                          <span>{filter.label}</span>
                          {selectedFilter === filter.value && (
                            <span className="w-2 h-2 rounded-full bg-purple-600 ml-4 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carrossel 1 - Destaques */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Carregando publicações...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Nenhuma publicação encontrada</p>
          </div>
        ) : (
          <>
            <Carousel
              posts={posts}
              carouselRef={carousel1Ref}
              title="✨ Publicações em Destaque"
              bgColor="from-purple-50 to-indigo-50"
            />

            {/* Seção Empresas e Instituições */}
            {(companies.length > 0 || schools.length > 0) && (
              <motion.div className="mt-8 md:mt-10" initial={{opacity:0, y:40}} animate={{opacity:1, y:0}} transition={{delay:0.5}}>
                <div className="text-center mb-4 md:mb-5 px-2">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1 md:mb-1.5">Empresas e Instituições no <span className="text-purple-600">Já Currículos</span></h2>
                  <p className="text-gray-600 text-xs md:text-sm">Conheça as empresas e escolas que fazem parte da nossa comunidade</p>
                </div>
                
                <div
                  className="relative"
                  onMouseEnter={() => { setIsPaused(true); setShowCompanyNav(true); }}
                  onMouseLeave={() => { setIsPaused(false); setShowCompanyNav(false); }}
                >
                  {/* Botão Esquerda */}
                  <button
                    onClick={() => handleCompaniesScroll('left')}
                    className={`absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-lg flex items-center justify-center transition-opacity hover:bg-slate-50 ${showCompanyNav ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-700" />
                  </button>

                  {/* Carrossel */}
                  <div
                    ref={companiesCarouselRef}
                    className="flex gap-4 overflow-x-auto scrollbar-hide px-4 py-4"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollBehavior: 'auto' }}
                  >
                    {/* Intercalar empresas e escolas, priorizando os com imagem - duplicado para loop infinito */}
                    {(() => {
                      // Ordenar empresas: com imagem primeiro
                      const sortedCompanies = [...companies].sort((a, b) => {
                        const aHasImg = a.profileImage || a.profile_image ? 1 : 0;
                        const bHasImg = b.profileImage || b.profile_image ? 1 : 0;
                        return bHasImg - aHasImg;
                      });
                      
                      // Ordenar escolas: com imagem primeiro
                      const sortedSchools = [...schools].sort((a, b) => {
                        const aHasImg = a.profile_image ? 1 : 0;
                        const bHasImg = b.profile_image ? 1 : 0;
                        return bHasImg - aHasImg;
                      });
                      
                      // Intercalar empresas e escolas
                      const interleaved = [];
                      const maxLen = Math.max(sortedCompanies.length, sortedSchools.length);
                      for (let i = 0; i < maxLen; i++) {
                        if (i < sortedCompanies.length) {
                          interleaved.push({ type: 'company', data: sortedCompanies[i] });
                        }
                        if (i < sortedSchools.length) {
                          interleaved.push({ type: 'school', data: sortedSchools[i] });
                        }
                      }
                      
                      // Multiplicar 5x para loop infinito (igual ao Carousel de posts)
                      const duplicated = [...interleaved, ...interleaved, ...interleaved, ...interleaved, ...interleaved];
                      
                      return duplicated.map((item, index) => {
                        if (item.type === 'company') {
                          const company = item.data;
                          let companyAvatarShape = 'circle';
                          try {
                            companyAvatarShape = localStorage.getItem('company_avatar_shape_'+company.id) || 'circle';
                          } catch {}
                          const companyImageRounded = companyAvatarShape === 'circle' ? 'rounded-full' : 'rounded-xl';
                          return (
                            <motion.div key={`company-${company.id}-${index}`} className="flex-shrink-0 w-[180px]" initial={{opacity:1}} whileHover={{ y:-8, transition: { duration: 0.2 } }}>
                              <Link to={`/company/${company.id}`}>
                                <Card className="shadow-lg hover:shadow-2xl transition-all duration-300 border-0 bg-white group overflow-hidden h-full rounded-2xl relative">
                                  <CardContent className="p-3 md:p-4 sm:p-5 text-center flex flex-col h-full">
                                    {company.is_partner && (
                                      <div className="absolute top-1.5 md:top-2 right-1.5 md:right-2 z-10">
                                        <div className="inline-flex items-center text-[9px] md:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full border border-emerald-200 shadow-sm">
                                          <FaRegHandshake className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1 text-emerald-600" />
                                          Parceira
                                        </div>
                                      </div>
                                    )}
                                    <div className={`bg-blue-50 w-12 h-12 md:w-16 md:h-16 ${companyImageRounded} flex items-center justify-center mx-auto mb-2 md:mb-3 overflow-hidden border border-blue-100 transition-transform duration-300`}>
                                      {(company.profileImage || company.profile_image) ? (
                                        <img
                                          src={company.profileImage || company.profile_image}
                                          alt={company.company_name || company.companyName || 'Logo'}
                                          className="w-full h-full object-contain"
                                        />
                                      ) : (
                                        <Building2 className="w-8 h-8 text-blue-600" />
                                      )}
                                    </div>
                                    <h3 className="font-bold text-[13px] md:text-[15px] text-gray-900 mb-1.5 md:mb-2 group-hover:text-purple-600 transition-colors duration-300 leading-snug line-clamp-2">{company.company_name}</h3>
                                    <div className="space-y-2 flex-grow">
                                      <div className="inline-flex items-center text-[10px] md:text-[11px] text-green-700 bg-green-50 rounded-full py-0.5 md:py-1 px-2 md:px-2.5 border border-green-200">
                                        <Briefcase className="w-3 h-3 md:w-3.5 md:h-3.5 mr-0.5 md:mr-1" />
                                        <span className="font-semibold">{company.jobs_count || company.active_jobs || 0} vagas</span>
                                      </div>
                                    </div>
                                    <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-200">
                                      <div className="flex items-center justify-center text-purple-600 font-semibold text-[10px] md:text-xs group-hover:text-purple-700 transition-colors duration-300">
                                        Ver Empresa <ChevronsRight className="ml-0.5 md:ml-1 h-3 w-3 md:h-4 md:w-4 group-hover:translate-x-1 transition-transform duration-300" />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </Link>
                            </motion.div>
                          );
                        } else {
                          const school = item.data;
                          let schoolAvatarShape = 'circle';
                          try {
                            schoolAvatarShape = localStorage.getItem('school_avatar_shape_'+school.id) || 'circle';
                          } catch {}
                          const schoolImageRounded = schoolAvatarShape === 'circle' ? 'rounded-full' : 'rounded-xl';
                          return (
                            <motion.div key={`school-${school.id}-${index}`} className="flex-shrink-0 w-[180px]" initial={{opacity:1}} whileHover={{ y:-8, transition: { duration: 0.2 } }}>
                              <Link to={`/school/${school.id}`}>
                                <Card className="shadow-lg hover:shadow-2xl transition-all duration-300 border-0 bg-white group overflow-hidden h-full rounded-2xl relative">
                                  <CardContent className="p-3 md:p-4 sm:p-5 text-center flex flex-col h-full">
                                    <div className={`bg-blue-50 w-12 h-12 md:w-16 md:h-16 ${schoolImageRounded} flex items-center justify-center mx-auto mb-2 md:mb-3 overflow-hidden border border-blue-100 transition-transform duration-300`}>
                                      {school.profile_image ? (
                                        <img
                                          src={school.profile_image}
                                          alt={school.school_name || school.name || 'Logo'}
                                          className="w-full h-full object-contain"
                                        />
                                      ) : (
                                        <GraduationCap className="w-8 h-8 text-blue-600" />
                                      )}
                                    </div>
                                    <h3 className="font-bold text-[13px] md:text-[15px] text-gray-900 mb-1.5 md:mb-2 group-hover:text-purple-600 transition-colors duration-300 leading-snug line-clamp-2">{school.school_name || school.name || 'Escola'}</h3>
                                    <div className="space-y-2 flex-grow">
                                      <div className="inline-flex items-center text-[10px] md:text-[11px] text-slate-600 bg-slate-50 rounded-full py-0.5 md:py-1 px-2 md:px-2.5 border border-slate-200">
                                        <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5 mr-0.5 md:mr-1" />
                                        <span className="font-medium truncate max-w-[100px] md:max-w-none">{school.school_city || school.location || 'Brasil'}</span>
                                      </div>
                                    </div>
                                    <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-200">
                                      <div className="flex items-center justify-center text-purple-600 font-semibold text-[10px] md:text-xs group-hover:text-purple-700 transition-colors duration-300">
                                        Ver Escola <ChevronsRight className="ml-0.5 md:ml-1 h-3 w-3 md:h-4 md:w-4 group-hover:translate-x-1 transition-transform duration-300" />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </Link>
                            </motion.div>
                          );
                        }
                      });
                    })()}
                  </div>

                  {/* Botão Direita */}
                  <button
                    onClick={() => handleCompaniesScroll('right')}
                    className={`absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-lg flex items-center justify-center transition-opacity hover:bg-slate-50 ${showCompanyNav ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <ChevronRight className="w-5 h-5 text-slate-700" />
                  </button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Modal Criar Publicação */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden max-h-[90vh] overflow-y-auto border-2 border-gray-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 leading-tight">Nova Publicação</h2>
                    <p className="text-[11px] text-gray-500">Compartilhe algo com a comunidade</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Upload de Imagem */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Imagem <span className="text-red-400">*</span>
                  </label>
                  {newPostImage ? (
                    <div className="relative">
                      <img
                        src={newPostImage}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-2xl border-2 border-gray-200"
                      />
                      <button
                        onClick={() => setNewPostImage(null)}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="group flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all duration-200">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center mb-2 transition-colors">
                        <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                      </div>
                      <span className="text-sm font-medium text-gray-500 group-hover:text-purple-600 transition-colors">Clique para adicionar uma imagem</span>
                      <span className="text-[11px] text-gray-400 mt-0.5">JPG, PNG, GIF · máx 10MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Caption/Descrição */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Descrição <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={newPostCaption}
                    onChange={(e) => setNewPostCaption(e.target.value)}
                    placeholder="Conte algo sobre sua publicação..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-2xl focus:border-purple-400 focus:outline-none resize-none text-sm placeholder:text-gray-400 transition-colors"
                  />
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-1">
                  <Button
                    onClick={() => setShowCreateModal(false)}
                    variant="outline"
                    className="flex-1 rounded-xl border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 h-10 text-sm font-semibold"
                    disabled={uploading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreatePost}
                    className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white h-10 text-sm font-semibold shadow-sm disabled:opacity-50"
                    disabled={uploading || !newPostImage || !newPostCaption.trim()}
                  >
                    {uploading ? (
                      <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-2" />Publicando...</>
                    ) : 'Publicar'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Social;
