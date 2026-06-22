import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

// Simple square/circle image cropper with zoom and pan, exports PNG dataURL
// Props:
// - imageSrc: string (data URL)
// - initialShape: 'square' | 'circle'
// - onCancel: () => void
// - onConfirm: (dataUrl: string, shape: 'square'|'circle') => void
// - previewSize?: number (CSS pixels)
// - exportSize?: number (canvas size in px)
export default function ImageCropper({ imageSrc, initialShape = 'square', onCancel, onConfirm, previewSize = 300, exportSize = 512, lockShape = false }) {
  const [imgEl, setImgEl] = useState(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [shape, setShape] = useState(initialShape);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const draggingRef = useRef({ active: false, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  // Increased negative zoom (zoom-out) range: allow shrinking to 0.25x
  const MIN_ZOOM = 0.25; // previous 0.5
  const MAX_ZOOM = 3;

  // Load image to get natural size
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setImgEl(img);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const baseScale = React.useMemo(() => {
    if (!natural.w || !natural.h) return 1;
    return Math.max(previewSize / natural.w, previewSize / natural.h);
  }, [natural.w, natural.h, previewSize]);

  // Clamp offset so image covers the crop box (avoid blank edges for square). For circle we allow same constraints.
  const clampOffset = (nx, ny) => {
    if (!natural.w || !natural.h) return { x: nx, y: ny };
    const renderW = natural.w * baseScale * zoom;
    const renderH = natural.h * baseScale * zoom;
    const halfW = renderW / 2;
    const halfH = renderH / 2;
    // Background is centered at (0,0) with offset applied; ensure edges cover preview box
    const maxX = Math.max(0, halfW - previewSize / 2);
    const maxY = Math.max(0, halfH - previewSize / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, nx)),
      y: Math.min(maxY, Math.max(-maxY, ny)),
    };
  };

  const onMouseDown = (e) => {
    draggingRef.current = { active: true, x: e.clientX, y: e.clientY };
    setIsDragging(true);
  };
  const onMouseMove = (e) => {
    if (!draggingRef.current.active) return;
    const dx = e.clientX - draggingRef.current.x;
    const dy = e.clientY - draggingRef.current.y;
    draggingRef.current.x = e.clientX;
    draggingRef.current.y = e.clientY;
    setOffset((prev) => clampOffset(prev.x + dx, prev.y + dy));
  };
  const onMouseUp = () => {
    draggingRef.current.active = false;
    setIsDragging(false);
  };

  const onTouchStart = (e) => {
    const t = e.touches[0];
    draggingRef.current = { active: true, x: t.clientX, y: t.clientY };
    setIsDragging(true);
  };
  const onTouchMove = (e) => {
    if (!draggingRef.current.active) return;
    const t = e.touches[0];
    const dx = t.clientX - draggingRef.current.x;
    const dy = t.clientY - draggingRef.current.y;
    draggingRef.current.x = t.clientX;
    draggingRef.current.y = t.clientY;
    setOffset((prev) => clampOffset(prev.x + dx, prev.y + dy));
  };
  const onTouchEnd = () => {
    draggingRef.current.active = false;
    setIsDragging(false);
  };

  // Keyboard nudge support (arrow keys)
  const onKeyDown = (e) => {
    const step = e.shiftKey ? 20 : 8;
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
      e.preventDefault();
      setOffset((prev) => {
        const nx = prev.x + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0);
        const ny = prev.y + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0);
        return clampOffset(nx, ny);
      });
    }
  };

  // Mouse wheel zoom
  const onWheel = (e) => {
    e.preventDefault();
    const delta = Math.sign(e.deltaY);
  // Wheel sensitivity adjusted slightly for broader range
  const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + (delta > 0 ? -0.1 : 0.1)));
    if (next !== zoom) {
      setZoom(next);
      setOffset((prev) => clampOffset(prev.x, prev.y));
    }
  };

  const exportCropped = () => {
    if (!imgEl) return;
    const ratio = exportSize / previewSize;
    const canvas = document.createElement('canvas');
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext('2d');

    // Fill background to avoid transparent gaps when zooming out below fit
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportSize, exportSize);

    if (shape === 'circle') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(exportSize / 2, exportSize / 2, exportSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    const renderW = natural.w * baseScale * zoom * ratio;
    const renderH = natural.h * baseScale * zoom * ratio;
    const dx = (exportSize - renderW) / 2 + offset.x * ratio;
    const dy = (exportSize - renderH) / 2 + offset.y * ratio;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imgEl, dx, dy, renderW, renderH);

    if (shape === 'circle') {
      ctx.restore();
    }

    const dataUrl = canvas.toDataURL('image/png');
    onConfirm?.(dataUrl, shape);
  };

  const bgSize = `${natural.w * baseScale * zoom}px ${natural.h * baseScale * zoom}px`;
  const bgPos = `calc(50% + ${offset.x}px) calc(50% + ${offset.y}px)`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Ajustar Foto</div>
          {!lockShape && (
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setShape('square')}
                className={`px-3 py-1 rounded-md border ${shape==='square'?'bg-gray-900 text-white border-gray-900':'border-gray-300 hover:bg-gray-50'}`}
              >Quadrado</button>
              <button
                onClick={() => setShape('circle')}
                className={`px-3 py-1 rounded-md border ${shape==='circle'?'bg-gray-900 text-white border-gray-900':'border-gray-300 hover:bg-gray-50'}`}
              >Círculo</button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          <div
            ref={containerRef}
            className="relative select-none outline-none"
            style={{ width: previewSize, height: previewSize }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onWheel={onWheel}
            onKeyDown={onKeyDown}
            tabIndex={0}
            role="application"
          >
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url(${imageSrc})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: bgSize,
                backgroundPosition: bgPos,
                cursor: isDragging ? 'grabbing' : 'grab',
                borderRadius: shape === 'circle' ? '9999px' : '16px',
                overflow: 'hidden',
                boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.8)',
                backgroundColor: '#f3f4f6'
              }}
            />
          </div>
          <div className="w-full">
            <label className="block text-xs text-gray-600 mb-1">Zoom</label>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => {
                const z = parseFloat(e.target.value);
                setZoom(z);
                // re-clamp offset on zoom to avoid edges
                setOffset((prev) => clampOffset(prev.x, prev.y));
              }}
              className="w-full"
            />
            <div className="mt-1 text-[11px] text-gray-500">
              Dica: role para cima/baixo para aumentar/diminuir. Agora é possível reduzir o zoom até 0.25× (mais recuo). Use as setas do teclado para ajustes finos.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-4">
          <button className="px-3 py-2 text-xs rounded-md border border-gray-300" onClick={() => { setOffset({ x: 0, y: 0 }); setZoom(1); }}>Centralizar</button>
          <button className="px-4 py-2 text-sm rounded-md border border-gray-300" onClick={onCancel}>Cancelar</button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={exportCropped}>Concluir</Button>
        </div>
      </div>
    </div>
  );
}
