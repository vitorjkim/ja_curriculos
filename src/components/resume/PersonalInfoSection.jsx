import React, { useRef, useState } from 'react';
import ResumeCard from './ResumeCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, Upload, Trash2, Linkedin, Github, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateAge } from '@/lib/utils';
import { useTemplateTheme } from '@/contexts/TemplateThemeContext';
import ImageCropper from '@/components/ImageCropper';

const SOCIAL_LINKS = [
  { key: 'linkedin_url', Icon: Linkedin, color: 'text-blue-600', ring: 'ring-blue-400', bg: 'hover:bg-blue-50', dot: 'bg-blue-500', placeholder: 'linkedin.com/in/seu-perfil' },
  { key: 'github_url',   Icon: Github,   color: 'text-slate-800', ring: 'ring-slate-400', bg: 'hover:bg-slate-100', dot: 'bg-slate-600', placeholder: 'github.com/seu-usuario' },
  { key: 'custom_url',  Icon: Globe,    color: 'text-emerald-600', ring: 'ring-emerald-400', bg: 'hover:bg-emerald-50', dot: 'bg-emerald-500', placeholder: 'seu-portfolio.com' },
];

const PersonalInfoSection = ({ formData, setFormData, cardColor = 'yellow' }) => {
  const fileInputRef = useRef(null);
  const [cropImage, setCropImage] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    if (name === 'birthDate') {
      updated.age = calculateAge(value);
    }
    setFormData(updated);
  };

  const handlePhotoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Abrir o cropper em vez de aplicar a foto diretamente
      setCropImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = (dataUrl, shape) => {
    setFormData(prev => ({ 
      ...prev, 
      photo: dataUrl,
      photoShape: shape 
    }));
    setCropImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropCancel = () => {
    setCropImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photo: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Estilos por template para o uploader/preview e botões
  const { name: templateName } = useTemplateTheme?.() || { name: 'default' };
  const styles = (() => {
    switch (templateName) {
      case 'modern':
        return {
          avatarContainer: 'border-2 border-black/10 bg-white/80 backdrop-blur',
          uploadBtn: 'border border-black/10 bg-white/70 hover:bg-white text-slate-700',
          removeBtn: 'text-slate-600 hover:bg-slate-100',
          toggleSelected: 'bg-slate-900 text-white border-slate-900',
          toggleIdle: 'bg-white border-gray-200 text-gray-700',
          btnRadius: 'rounded-2xl'
        };
      case 'classic':
        return {
          avatarContainer: 'border-2 border-stone-300 bg-stone-50',
          uploadBtn: 'border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800',
          removeBtn: 'text-stone-700 hover:bg-stone-100',
          toggleSelected: 'bg-stone-800 text-white border-stone-800',
          toggleIdle: 'bg-stone-50 border-stone-200 text-stone-800',
          btnRadius: 'rounded-2xl'
        };
      case 'minimal':
        return {
          avatarContainer: 'border border-gray-200 bg-white',
          uploadBtn: 'border border-gray-200 bg-white hover:bg-gray-100 text-black',
          removeBtn: 'text-gray-700 hover:bg-gray-100',
          toggleSelected: 'bg-black text-white border-black',
          toggleIdle: 'bg-white border-gray-200 text-gray-700',
          btnRadius: 'rounded-md'
        };
      case 'professional':
        return {
          avatarContainer: 'border-2 border-slate-200 bg-slate-50/60',
          uploadBtn: 'border border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700',
          removeBtn: 'text-slate-600 hover:bg-slate-100',
          toggleSelected: 'bg-[#2563eb] text-white border-[#2563eb]',
          toggleIdle: 'bg-slate-50/60 border-slate-200 text-slate-700',
          btnRadius: 'rounded-2xl'
        };
      case 'colorful':
        return {
          avatarContainer: 'border-2 border-blue-200 bg-white',
          uploadBtn: 'border border-blue-200 bg-white hover:bg-blue-50 text-blue-700',
          removeBtn: 'text-slate-600 hover:bg-slate-100',
          toggleSelected: 'bg-blue-600 text-white border-blue-600',
          toggleIdle: 'bg-white border-slate-200 text-slate-700',
          btnRadius: 'rounded-xl'
        };
      default: // dark
        return {
          avatarContainer: 'border-2 border-[#30363d] bg-[#0d1117]',
          uploadBtn: 'border border-[#30363d] bg-[#0d1117] hover:bg-[#161b22] text-gray-200',
          removeBtn: 'text-gray-300 hover:bg-[#161b22]',
          toggleSelected: 'bg-[#0d1117] text-white border-white/10',
          toggleIdle: 'bg-[#0d1117] border-[#30363d] text-gray-300',
          btnRadius: 'rounded-2xl'
        };
    }
  })();

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
  <ResumeCard title="Informações Pessoais" icon={User} color={cardColor}>
        <div className="space-y-6">
          <div className="grid md:grid-cols-12 gap-6 items-start">
            {/* Coluna da foto */}
            <div className="md:col-span-3 flex flex-col items-center">
              <div className={`w-32 h-32 ${formData.photoShape === 'square' ? 'rounded-none' : 'rounded-full'} overflow-hidden flex items-center justify-center ${styles.avatarContainer}`}>
                {formData.photo ? (
                  <img src={formData.photo} alt="Foto de perfil" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-gray-400" />
                )}
              </div>
              <div className="mt-3 flex gap-2">
                {(() => { const hasPhoto = !!formData.photo; return (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Carregar foto"
                    title="Carregar foto"
                    className={`photo-upload-btn flex items-center ${hasPhoto ? 'justify-center p-2 w-9 h-9 gap-0' : 'gap-2 whitespace-nowrap px-3 py-2'} ${styles.uploadBtn} ${styles.btnRadius} btn-radius`}
                  >
                    <Upload className="w-4 h-4" />
                    {!hasPhoto && <span>Carregar foto</span>}
                    {hasPhoto && <span className="sr-only">Carregar foto</span>}
                  </Button>
                ); })()}
                {formData.photo && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemovePhoto} className={`photo-remove-btn flex items-center gap-2 whitespace-nowrap px-3 ${styles.removeBtn} ${styles.btnRadius} btn-radius`}>
                    <Trash2 className="w-4 h-4" /> Remover
                  </Button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFileChange} />
              {/* Social link icon buttons */}
              <div className="mt-3 flex items-center gap-2">
                {SOCIAL_LINKS.map(({ key, Icon, color, ring, bg, dot }) => (
                  <div key={key} className="relative">
                    <button
                      type="button"
                      onClick={() => setEditingLink(editingLink === key ? null : key)}
                      title={key.replace('_url', '')}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${color} ${bg} ${
                        editingLink === key ? `border-current ring-2 ${ring} bg-white` : 'border-slate-200 bg-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                    {formData[key] && (
                      <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${dot} border border-white`} />
                    )}
                  </div>
                ))}
              </div>
              {/* Inline URL input */}
              {editingLink && (() => {
                const link = SOCIAL_LINKS.find(l => l.key === editingLink);
                return (
                  <div className="mt-2 w-full">
                    <Input
                      autoFocus
                      name={editingLink}
                      value={formData[editingLink] || ''}
                      onChange={handleChange}
                      placeholder={link?.placeholder}
                      className="text-xs h-8 rounded-lg border-2 border-slate-200 focus:border-blue-300"
                      onKeyDown={(e) => e.key === 'Enter' && setEditingLink(null)}
                    />
                  </div>
                );
              })()}
            </div>

            {/* Coluna dos campos */}
            <div className="md:col-span-9 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome Completo <span className="required-star">*</span></Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="birthDate">Data de Nascimento <span className="required-star">*</span></Label>
                  <div className="flex items-center gap-2">
                    <Input id="birthDate" name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} required />
                    {formData.age && <span className="text-sm text-gray-600 whitespace-nowrap">({formData.age} anos)</span>}
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">WhatsApp/Telefone <span className="required-star">*</span></Label>
                  <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="email">Email <span className="required-star">*</span></Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Input id="address" name="address" value={formData.address || ''} onChange={handleChange} placeholder="Rua, número, complemento" />
                </div>
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" name="city" value={formData.city || ''} onChange={handleChange} placeholder="Cidade / Estado" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </ResumeCard>
      
      {/* Image Cropper Modal */}
      {cropImage && (
        <ImageCropper
          imageSrc={cropImage}
          initialShape={formData.photoShape === 'square' ? 'square' : 'circle'}
          lockShape={false}
          previewSize={320}
          exportSize={512}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
    </motion.div>
  );
};

export default PersonalInfoSection;