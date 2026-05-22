'use client';

/**
 * Lightweight canvas-based image cropper — no external dependencies.
 * Shows the selected image with a draggable/resizable crop rectangle.
 * On confirm: crops via Canvas API and returns a File blob.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Check } from 'lucide-react';

interface Rect { x: number; y: number; w: number; h: number }

const MIN_SIZE = 40;

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

type Handle = 'tl'|'tr'|'bl'|'br'|'t'|'b'|'l'|'r'|'move'|null;

function hitHandle(mx: number, my: number, rect: Rect, scale: number): Handle {
  const pad = 10 / scale;
  const { x, y, w, h } = rect;
  const pts: [Handle, number, number][] = [
    ['tl', x, y], ['tr', x+w, y], ['bl', x, y+h], ['br', x+w, y+h],
    ['t', x+w/2, y], ['b', x+w/2, y+h], ['l', x, y+h/2], ['r', x+w, y+h/2],
  ];
  for (const [name, px, py] of pts) {
    if (Math.abs(mx-px) < pad && Math.abs(my-py) < pad) return name;
  }
  if (mx > x && mx < x+w && my > y && my < y+h) return 'move';
  return null;
}

function applyCursor(h: Handle): string {
  if (!h) return 'crosshair';
  if (h === 'move') return 'move';
  if (h === 'tl' || h === 'br') return 'nwse-resize';
  if (h === 'tr' || h === 'bl') return 'nesw-resize';
  if (h === 't' || h === 'b') return 'ns-resize';
  return 'ew-resize';
}

export interface ImageCropModalProps {
  file: File;
  aspect?: number | null;   // e.g. 1 for square, null for free
  maxOutputPx?: number;     // max width/height of output (default 1200)
  onConfirm: (croppedFile: File) => void;
  onCancel: () => void;
}

export function ImageCropModal({
  file,
  aspect = null,
  maxOutputPx = 1200,
  onConfirm,
  onCancel,
}: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    handle: Handle; startMx: number; startMy: number; startRect: Rect;
    startOffset: { x: number; y: number };
  } | null>(null);

  // Load image
  const imgUrl = useRef<string>('');
  useEffect(() => {
    const url = URL.createObjectURL(file);
    imgUrl.current = url;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Init crop rect when image loaded
  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !canvasRef.current) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    const cw = canvas.offsetWidth;
    const ch = canvas.offsetHeight;
    const scale = Math.min(cw / img.width, ch / img.height, 1);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const ox = (cw - dw) / 2;
    const oy = (ch - dh) / 2;
    setZoom(scale);
    setOffset({ x: ox, y: oy });
    // Default crop: 80% of image centered
    const margin = 0.1;
    setRect({
      x: img.width * margin,
      y: img.height * margin,
      w: img.width * (1 - margin * 2),
      h: img.height * (1 - margin * 2),
    });
  }, [imgLoaded]);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    // Draw image
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    // Overlay
    const rx = rect.x * zoom + offset.x;
    const ry = rect.y * zoom + offset.y;
    const rw = rect.w * zoom;
    const rh = rect.h * zoom;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, cw, ry);
    ctx.fillRect(0, ry + rh, cw, ch - ry - rh);
    ctx.fillRect(0, ry, rx, rh);
    ctx.fillRect(rx + rw, ry, cw - rx - rw, rh);
    // Border
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, rw, rh);
    // Thirds
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(rx + rw*i/3, ry); ctx.lineTo(rx + rw*i/3, ry+rh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx, ry + rh*i/3); ctx.lineTo(rx+rw, ry + rh*i/3); ctx.stroke();
    }
    // Handles
    const handles: [number, number][] = [
      [rx, ry], [rx+rw, ry], [rx, ry+rh], [rx+rw, ry+rh],
      [rx+rw/2, ry], [rx+rw/2, ry+rh], [rx, ry+rh/2], [rx+rw, ry+rh/2],
    ];
    for (const [hx, hy] of handles) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [imgLoaded, rect, zoom, offset]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const obs = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    });
    obs.observe(canvas);
    return () => obs.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  const imgToCanvas = (imgX: number, imgY: number) => ({
    cx: imgX * zoom + offset.x,
    cy: imgY * zoom + offset.y,
  });
  const canvasToImg = (cx: number, cy: number) => ({
    ix: (cx - offset.x) / zoom,
    iy: (cy - offset.y) / zoom,
  });

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const img = imgRef.current;
    const handle = hitHandle(
      (mx - offset.x) / zoom,
      (my - offset.y) / zoom,
      rect,
      zoom,
    );
    if (!handle) {
      // Start new rect
      const { ix, iy } = canvasToImg(mx, my);
      const cx2 = clamp(ix, 0, img.width);
      const cy2 = clamp(iy, 0, img.height);
      dragRef.current = {
        handle: 'br',
        startMx: mx,
        startMy: my,
        startRect: { x: cx2, y: cy2, w: 0, h: 0 },
        startOffset: offset,
      };
      setRect({ x: cx2, y: cy2, w: 0, h: 0 });
    } else {
      dragRef.current = {
        handle,
        startMx: mx,
        startMy: my,
        startRect: { ...rect },
        startOffset: offset,
      };
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const { ix: imgMx, iy: imgMy } = canvasToImg(mx, my);
    if (!dragRef.current) {
      const h = hitHandle(imgMx, imgMy, rect, zoom);
      canvas.style.cursor = applyCursor(h);
      return;
    }
    const { handle, startMx, startMy, startRect } = dragRef.current;
    const dx = (mx - startMx) / zoom;
    const dy = (my - startMy) / zoom;
    let { x, y, w, h: rh } = startRect;
    const IW = img.width, IH = img.height;
    if (handle === 'move') {
      x = clamp(x + dx, 0, IW - w);
      y = clamp(y + dy, 0, IH - rh);
    } else {
      if (handle === 'tl' || handle === 'l' || handle === 'bl') {
        const nx = clamp(x + dx, 0, x + w - MIN_SIZE);
        w = w + (x - nx);
        x = nx;
      }
      if (handle === 'tr' || handle === 'r' || handle === 'br') {
        w = clamp(w + dx, MIN_SIZE, IW - x);
      }
      if (handle === 'tl' || handle === 't' || handle === 'tr') {
        const ny = clamp(y + dy, 0, y + rh - MIN_SIZE);
        rh = rh + (y - ny);
        y = ny;
      }
      if (handle === 'bl' || handle === 'b' || handle === 'br') {
        rh = clamp(rh + dy, MIN_SIZE, IH - y);
      }
      if (aspect) {
        // Keep aspect ratio
        if (['tl','tr','bl','br'].includes(handle as string)) {
          rh = w / aspect;
          if (y + rh > IH) { rh = IH - y; w = rh * aspect; }
          if (x + w > IW) { w = IW - x; rh = w / aspect; }
        }
      }
    }
    setRect({ x, y, w, h: rh });
  };

  const onMouseUp = () => { dragRef.current = null; };

  const handleZoom = (delta: number) => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const newZoom = clamp(zoom + delta, 0.1, 3);
    const cw = canvas.offsetWidth;
    const ch = canvas.offsetHeight;
    const dw = img.width * newZoom;
    const dh = img.height * newZoom;
    setZoom(newZoom);
    setOffset({ x: (cw - dw) / 2, y: (ch - dh) / 2 });
  };

  const handleReset = () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const cw = canvas.offsetWidth;
    const ch = canvas.offsetHeight;
    const scale = Math.min(cw / img.width, ch / img.height, 1);
    const dw = img.width * scale;
    const dh = img.height * scale;
    setZoom(scale);
    setOffset({ x: (cw - dw) / 2, y: (ch - dh) / 2 });
    const margin = 0.1;
    setRect({
      x: img.width * margin,
      y: img.height * margin,
      w: img.width * (1 - margin * 2),
      h: img.height * (1 - margin * 2),
    });
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const sx = Math.round(clamp(rect.x, 0, img.width));
    const sy = Math.round(clamp(rect.y, 0, img.height));
    const sw = Math.round(clamp(rect.w, 1, img.width - sx));
    const sh = Math.round(clamp(rect.h, 1, img.height - sy));
    const scale = Math.min(maxOutputPx / sw, maxOutputPx / sh, 1);
    const dw = Math.round(sw * scale);
    const dh = Math.round(sh * scale);
    const offscreen = document.createElement('canvas');
    offscreen.width = dw;
    offscreen.height = dh;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    offscreen.toBlob((blob) => {
      if (!blob) return;
      const ext = file.name.replace(/\.[^.]+$/, '');
      onConfirm(new File([blob], `${ext}_cropped.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/90"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="font-medium text-white">Кадрирование фото</h2>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          style={{ cursor: 'crosshair' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 bg-black/60 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleZoom(-0.1)}
              title="Уменьшить"
              className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-12 text-center text-xs text-white/50">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => handleZoom(0.1)}
              title="Увеличить"
              className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Сбросить"
              className="ml-1 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-input border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-white/70 hover:bg-white/10"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!imgLoaded || rect.w < MIN_SIZE}
              className="inline-flex items-center gap-1.5 rounded-input bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              Применить
            </button>
          </div>
        </div>
        <p className="mt-1 text-center text-[11px] text-white/30">
          Выделите область • Перетащите углы для изменения размера
        </p>
      </div>
    </div>
  );
}
