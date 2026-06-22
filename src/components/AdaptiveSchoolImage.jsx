import React, { useState, useRef, useEffect } from 'react';

/**
 * Componente que detecta automaticamente se a imagem é circular (tem cantos transparentes)
 * ou quadrada, e aplica o estilo de borda apropriado.
 */
const AdaptiveSchoolImage = ({ 
  src, 
  alt, 
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  fallbackIcon: FallbackIcon,
  className = ''
}) => {
  const [isCircular, setIsCircular] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef(null);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
    xl: 'w-28 h-28'
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14'
  };

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = Math.min(img.width, img.height, 100);
        canvas.width = size;
        canvas.height = size;
        
        ctx.drawImage(img, 0, 0, size, size);
        
        // Verificar apenas TRANSPARÊNCIA nos cantos (ignorar branco)
        const cornerSize = Math.max(2, Math.floor(size * 0.12));
        let transparentCorners = 0;
        
        const checkCorner = (x, y) => {
          const imageData = ctx.getImageData(x, y, cornerSize, cornerSize);
          const data = imageData.data;
          let transparentPixels = 0;
          
          for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            // APENAS pixels realmente transparentes (não contar brancos)
            if (alpha < 200) {
              transparentPixels++;
            }
          }
          
          const totalPixels = (cornerSize * cornerSize);
          // Se mais de 40% dos pixels são transparentes, considera como canto vazio
          return transparentPixels / totalPixels > 0.4;
        };
        
        // Verificar os 4 cantos
        if (checkCorner(0, 0)) transparentCorners++;
        if (checkCorner(size - cornerSize, 0)) transparentCorners++;
        if (checkCorner(0, size - cornerSize)) transparentCorners++;
        if (checkCorner(size - cornerSize, size - cornerSize)) transparentCorners++;
        
        // Só considera circular se TODOS os 4 cantos forem transparentes
        setIsCircular(transparentCorners === 4);
      } catch (e) {
        console.log('Não foi possível analisar imagem:', e);
        setIsCircular(false);
      }
      setLoaded(true);
    };

    img.onerror = () => {
      setLoaded(true);
      setIsCircular(false);
    };

    img.src = src;
  }, [src]);

  if (!src) {
    return (
      <div className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-md ${className}`}>
        {FallbackIcon && <FallbackIcon className={iconSizes[size]} />}
      </div>
    );
  }

  const borderRadius = isCircular ? 'rounded-full' : 'rounded-xl';
  
  return (
    <img 
      src={src} 
      alt={alt}
      className={`${sizeClasses[size]} ${borderRadius} object-cover bg-white shadow-md border-2 border-gray-100 ${className}`}
    />
  );
};

export default AdaptiveSchoolImage;
