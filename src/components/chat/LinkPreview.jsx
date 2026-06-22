import React from 'react';
import { Globe } from 'lucide-react';

// Small helper to get hostname without www
const getHost = (u) => {
  try { return new URL(u).hostname.replace(/^www\./,''); } catch { return ''; }
};

// Try to build a favicon URL (fallback to globe icon)
const getFavicon = (u) => {
  try { const url = new URL(u); return `${url.origin}/favicon.ico`; } catch { return null; }
};

// Derive youtube thumbnail if applicable
const getYouTubeThumb = (u) => {
  try {
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./,'');
    if(host === 'youtube.com' || host === 'youtu.be'){
      let id = '';
      if(host === 'youtu.be') id = url.pathname.slice(1);
      else id = url.searchParams.get('v') || '';
      if(id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
  } catch {}
  return null;
};

// Clean, compact link preview card
const deriveTitle = (u, pv) => {
  if (pv?.title) return pv.title;
  // YouTube friendly fallback
  const yt = getYouTubeThumb(u);
  if (yt) return 'Vídeo no YouTube';
  // From pathname slug: /jobs/view/typist-remote-at-ciram-4313924772
  try {
    const url = new URL(u);
    const parts = url.pathname.split('/').filter(Boolean);
    // pick the most descriptive segment (longest alpha content)
    let candidate = parts.reduce((best, seg) => {
      const alphaCount = (seg.match(/[a-zA-Z]/g) || []).length;
      return alphaCount > (best.alpha || 0) ? { seg, alpha: alphaCount } : best;
    }, { seg: '', alpha: 0 }).seg;
    if (candidate) {
      // remove ids/suffix numbers
      candidate = candidate.replace(/-?\d{4,}.*/,'');
      candidate = decodeURIComponent(candidate).replace(/[-_]+/g,' ').trim();
      // Capitalize words
      candidate = candidate.split(' ').map(w => w ? (w[0].toUpperCase() + w.slice(1)) : w).join(' ').trim();
      if (candidate && candidate.length >= 3) return candidate;
    }
  } catch {}
  return 'Abrir link';
};

export const LinkPreview = ({ url, preview }) => {
  const host = getHost(url);
  const favicon = getFavicon(url);
  const youTubeThumb = getYouTubeThumb(url);
  const image = preview?.image || youTubeThumb || null;
  let title = deriveTitle(url, preview);
  // Avoid repeating host as title
  if (title.toLowerCase() === (host || '').toLowerCase()) title = 'Abrir link';
  const description = preview?.description || '';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm text-left">
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex gap-3 p-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300">
        {image && (
          <div className="w-20 h-14 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
            <img src={image} alt="preview" className="w-full h-full object-cover" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1 truncate">
            {favicon ? (
              <img src={favicon} alt="favicon" className="w-3.5 h-3.5" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
            ) : (
              <Globe className="w-3.5 h-3.5 text-gray-400" />
            )}
            <span className="truncate">{host}</span>
          </div>
          <div className="font-semibold text-gray-800 leading-snug mb-0.5 line-clamp-2">{title}</div>
          {description && (
            <div className="text-xs text-gray-600 line-clamp-2 whitespace-pre-wrap">{description}</div>
          )}
        </div>
      </a>
    </div>
  );
};

export default LinkPreview;
