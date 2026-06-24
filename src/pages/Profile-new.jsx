import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ImagePlus, Mail, Phone, GraduationCap, Briefcase, Pencil, Save, X, MessageSquare, Instagram, Linkedin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { usersAPI, authAPI } from '@/lib/api';

const StudentProfile = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  // Estados
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    id: null,
    name: '',
    email: '',
    phone: '',
    class_name: '',
    status: '',
    avatar: null,
    school_avatar: null,
    life_status: '',
    instagram_url: '',
    linkedin_url: '',
    whatsapp: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loadedUser, setLoadedUser] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Formulário de edição
  const [formData, setFormData] = useState({
    formation_title: '',
    formation_description: '',
    instagram_url: '',
    linkedin_url: '',
    whatsapp: ''
  });

  // User efetivo (context ou API)
  const currentUser = user || loadedUser;

  // Validação de permissões
  const isOwnProfile = currentUser && (currentUser.id === profile?.id || currentUser.id === profile?.user_id);

  console.log('DEBUG:', {
    profile_id: profile?.id,
    profile_user_id: profile?.user_id,
    currentUser_id: currentUser?.id,
    isOwnProfile
  });

  // Carrega user da API se context for null
  useEffect(() => {
    if (!user) {
      const fetchCurrentUser = async () => {
        try {
          const data = await authAPI.me();
          if (data?.user || data) {
            console.log('User loaded from API (authAPI.me):', data);
            setLoadedUser(data.user || data);
          }
        } catch (err) {
          console.warn('Erro ao carregar user via authAPI.me:', err);
        }
      };
      fetchCurrentUser();
    }
  }, [user]);

  // Carrega dados do perfil
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);

        // Se está visualizando perfil de outro user via URL
        if (id) {
          const res = await usersAPI.get(id);
          if (res?.user) {
            const userData = res.user;
            const studentData = res.student || {};
            setProfile({
              id: userData.id,
              name: userData.name || '',
              email: userData.email || '',
              phone: userData.phone || '',
              class_name: studentData.class_name || '',
              status: studentData.status || '',
              avatar: userData.profileImage || userData.profile_image || null,
              school_avatar: studentData.school_avatar || null,
              life_status: userData.life_status || '',
              instagram_url: userData.instagram_url || '',
              linkedin_url: userData.linkedin_url || '',
              whatsapp: userData.whatsapp || userData.phone || ''
            });
            setFormData({
              formation_title: userData.life_status?.split('\n')[0] || '',
              formation_description: userData.life_status || '',
              instagram_url: userData.instagram_url || '',
              linkedin_url: userData.linkedin_url || '',
              whatsapp: userData.whatsapp || userData.phone || ''
            });
          }
        } else if (currentUser) {
          // Carregando perfil do próprio usuário logado
          const res = await usersAPI.get(currentUser.id);
          if (res?.user) {
            const userData = res.user;
            const studentData = res.student || {};
            setProfile({
              id: userData.id,
              name: userData.name || '',
              email: userData.email || '',
              phone: userData.phone || '',
              class_name: studentData.class_name || '',
              status: studentData.status || '',
              avatar: userData.profileImage || userData.profile_image || null,
              school_avatar: studentData.school_avatar || null,
              life_status: userData.life_status || '',
              instagram_url: userData.instagram_url || '',
              linkedin_url: userData.linkedin_url || '',
              whatsapp: userData.whatsapp || userData.phone || ''
            });
            setFormData({
              formation_title: userData.life_status?.split('\n')[0] || '',
              formation_description: userData.life_status || '',
              instagram_url: userData.instagram_url || '',
              linkedin_url: userData.linkedin_url || '',
              whatsapp: userData.whatsapp || userData.phone || ''
            });
          }
        }
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
        toast({ title: 'Erro ao carregar perfil', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [id, currentUser?.id]);

  // Inicia modo de edição
  const handleStartEditing = () => {
    setFormData({
      formation_title: profile.life_status?.split('\n')[0] || '',
      formation_description: profile.life_status || '',
      instagram_url: profile.instagram_url || '',
      linkedin_url: profile.linkedin_url || '',
      whatsapp: profile.whatsapp || profile.phone || ''
    });
    setIsEditing(true);
  };

  // Cancela edição
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Salva alterações
  const handleSaveChanges = async () => {
    try {
      const payload = {
        life_status: formData.formation_description,
        instagram_url: formData.instagram_url,
        linkedin_url: formData.linkedin_url,
        whatsapp: formData.whatsapp
      };

      // Use usersAPI.update (routes expect /api/users/:id)
      const updated = await usersAPI.update(profile.id, payload);
      setProfile(prev => ({
        ...prev,
        life_status: updated.life_status || formData.formation_description,
        instagram_url: updated.instagram_url || formData.instagram_url,
        linkedin_url: updated.linkedin_url || formData.linkedin_url,
        whatsapp: updated.whatsapp || formData.whatsapp
      }));

      setIsEditing(false);
      toast({ title: 'Perfil atualizado com sucesso!' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao salvar perfil', variant: 'destructive' });
    }
  };

  // Upload de avatar
  const handleAvatarClick = () => {
    if (isOwnProfile) {
      fileInputRef.current?.click();
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setAvatarUploading(true);
      const toDataURL = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const dataUrl = await toDataURL(file);
      const resp = await usersAPI.uploadAvatar(profile.id, dataUrl);
      const newAvatarUrl = resp?.profileImage || resp?.avatar || dataUrl;
      setProfile(prev => ({ ...prev, avatar: newAvatarUrl }));
      toast({ title: 'Foto atualizada com sucesso!' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao enviar foto', variant: 'destructive' });
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/80 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{profile.name || 'Perfil do Aluno'}</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50/80">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Perfil do Aluno</h1>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left Column - Avatar & Socials */}
              <div className="flex flex-col items-center">
                {/* Avatar */}
                <div className="relative mb-4">
                  <div
                    onClick={handleAvatarClick}
                    className={`w-40 h-40 rounded-full border-4 border-blue-600 overflow-hidden flex items-center justify-center bg-white ${
                      isOwnProfile ? 'cursor-pointer group' : ''
                    }`}
                  >
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <GraduationCap className="w-16 h-16 text-slate-400" />
                    )}

                    {isOwnProfile && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition rounded-full">
                        <div className="opacity-0 group-hover:opacity-100 transition">
                          <ImagePlus className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* School Badge */}
                  {profile.school_avatar && (
                    <div className="absolute bottom-0 right-0 transform translate-x-1/4 translate-y-1/4">
                      <div className="w-12 h-12 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center overflow-hidden">
                        <img src={profile.school_avatar} alt="school" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                {/* Name & Class */}
                <h2 className="text-lg font-semibold lowercase">{profile.name || '—'}</h2>
                <p className="text-sm text-slate-500">{profile.class_name || '—'}</p>

                {/* Social Links */}
                {!isEditing && (
                  <div className="mt-6 flex gap-3">
                    {profile.instagram_url && (
                      <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow" style={{ background: 'linear-gradient(45deg,#f72585,#7209b7)' }}>
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {profile.linkedin_url && (
                      <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-blue-600 shadow">
                        <Linkedin className="w-5 h-5" />
                      </a>
                    )}
                    {profile.whatsapp && (
                      <a href={`https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-green-500 shadow">
                        <Phone className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                )}

                {/* Social Inputs in Edit Mode */}
                {isEditing && (
                  <div className="mt-4 w-full space-y-3">
                    <div>
                      <Label className="text-xs font-semibold">Instagram URL</Label>
                      <Input
                        value={formData.instagram_url}
                        onChange={e => setFormData(prev => ({ ...prev, instagram_url: e.target.value }))}
                        placeholder="https://instagram.com/..."
                        className="rounded-lg"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">LinkedIn URL</Label>
                      <Input
                        value={formData.linkedin_url}
                        onChange={e => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                        placeholder="https://linkedin.com/in/..."
                        className="rounded-lg"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">WhatsApp</Label>
                      <Input
                        value={formData.whatsapp}
                        onChange={e => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                        placeholder="+55 11 9XXXX-XXXX"
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* Main Action Button */}
                {isOwnProfile && !isEditing && (
                  <button
                    onClick={handleStartEditing}
                    className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:shadow-lg transition"
                  >
                    <Pencil className="w-4 h-4" /> Editar Perfil
                  </button>
                )}

                {!isOwnProfile && (
                  <button className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-700 to-blue-800 text-white font-semibold hover:shadow-lg transition">
                    <MessageSquare className="w-4 h-4" /> Adicionar aos contatos
                  </button>
                )}
              </div>

              {/* Right Column - Info Cards & Formation */}
              <div className="col-span-1 md:col-span-2 flex flex-col gap-6">
                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="p-4 rounded-xl border border-green-100 bg-green-50/30">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-green-100">
                        <Mail className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-500">Email</p>
                        <p className="text-sm text-slate-700 break-all">{profile.email || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/30">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-orange-100">
                        <Phone className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-500">Telefone</p>
                        <p className="text-sm text-slate-700">{profile.phone || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Class */}
                  <div className="p-4 rounded-xl border border-yellow-100 bg-yellow-50/30">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-yellow-100">
                        <GraduationCap className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-500">Turma</p>
                        <p className="text-sm text-slate-700">{profile.class_name || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="p-4 rounded-xl border border-violet-100 bg-violet-50/30">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-violet-100">
                        <Briefcase className="w-5 h-5 text-violet-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-500">Situação</p>
                        <p className="text-sm text-slate-700">{profile.status || 'Não informado'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Free-form Summary Section */}
                <div className="border-2 border-teal-200 rounded-2xl p-4 bg-teal-50/20">
                  <div className="border rounded-xl p-4 bg-white">
                    {!isEditing ? (
                      <div>
                        <div className="mt-0 text-sm text-slate-600 whitespace-pre-wrap">
                          {profile.life_status || 'Escreva seu resumo profissional e acadêmico aqui.'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Textarea
                          value={formData.formation_description}
                          onChange={e => setFormData(prev => ({ ...prev, formation_description: e.target.value }))}
                          placeholder="Resumo Profissional e Acadêmico"
                          className="rounded-lg min-h-24 w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Mode Action Buttons */}
                {isEditing && (
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveChanges}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition"
                    >
                      <Save className="w-4 h-4" /> Salvar Alterações
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition"
                    >
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentProfile;
