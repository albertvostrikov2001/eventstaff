'use client';

/**
 * Кадрирование фото в стиле Телеграма: рамка зафиксирована по центру,
 * пользователь двигает и масштабирует само изображение под ней.
 * Тач: один палец — перетаскивание, щипок двумя пальцами — масштаб.
 * На подтверждении вырезаем область под рамкой через Canvas API и отдаём File.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Check } from 'lucide-react';

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

const MAX_ZOOM_FACTOR = 8; // во сколько раз можно приблизить относительно «вписать»

interface Frame { left: number; top: number; w: number; h: number }
interface View { scale: number; tx: number; ty: number }

export interface ImageCropModalProps {
  file: File;
  aspect?: number | null;   // 1 — квадрат (аватар), null — свободно (по пропорциям фото)
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
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 });

  const isCircle = aspect === 1;

  // Load image
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Размер холста (CSS-пиксели) — следим за ресайзом/поворотом.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver(() => {
      setCanvasSize({ w: canvas.offsetWidth, h: canvas.offsetHeight });
    });
    obs.observe(canvas);
    setCanvasSize({ w: canvas.offsetWidth, h: canvas.offsetHeight });
    return () => obs.disconnect();
  }, []);

  const frameAspect = aspect ?? (imgSize ? imgSize.w / imgSize.h : 1);

  // Прямоугольник рамки — по центру, с отступом от краёв.
  const frame = useMemo<Frame | null>(() => {
    const { w: cw, h: ch } = canvasSize;
    if (!cw || !ch) return null;
    const pad = Math.min(cw, ch) * 0.06 + 8;
    const availW = cw - pad * 2;
    const availH = ch - pad * 2;
    let fw: number;
    let fh: number;
    if (availW / availH > frameAspect) {
      fh = availH;
      fw = fh * frameAspect;
    } else {
      fw = availW;
      fh = fw / frameAspect;
    }
    return { left: (cw - fw) / 2, top: (ch - fh) / 2, w: fw, h: fh };
  }, [canvasSize, frameAspect]);

  // Минимальный масштаб — чтобы изображение всегда покрывало рамку.
  const minScale = useMemo(() => {
    if (!frame || !imgSize) return 1;
    return Math.max(frame.w / imgSize.w, frame.h / imgSize.h);
  }, [frame, imgSize]);

  const clampView = useCallback(
    (v: View): View => {
      if (!frame || !imgSize) return v;
      const iw = imgSize.w * v.scale;
      const ih = imgSize.h * v.scale;
      const minTx = frame.left + frame.w - iw;
      const minTy = frame.top + frame.h - ih;
      return {
        scale: v.scale,
        tx: clamp(v.tx, minTx, frame.left),
        ty: clamp(v.ty, minTy, frame.top),
      };
    },
    [frame, imgSize],
  );

  // Начальная установка / переустановка при ресайзе: изображение по центру рамки.
  const fitView = useCallback(() => {
    if (!frame || !imgSize) return;
    const s = minScale;
    setView({
      scale: s,
      tx: frame.left + (frame.w - imgSize.w * s) / 2,
      ty: frame.top + (frame.h - imgSize.h * s) / 2,
    });
  }, [frame, imgSize, minScale]);

  useEffect(() => {
    fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame?.left, frame?.top, frame?.w, frame?.h, minScale, imgSize?.w, imgSize?.h]);

  // Масштаб вокруг точки (по умолчанию — центр рамки).
  const zoomTo = useCallback(
    (targetScale: number, pivotX?: number, pivotY?: number) => {
      if (!frame) return;
      const s = clamp(targetScale, minScale, minScale * MAX_ZOOM_FACTOR);
      const px = pivotX ?? frame.left + frame.w / 2;
      const py = pivotY ?? frame.top + frame.h / 2;
      setView((v) => {
        const ix = (px - v.tx) / v.scale;
        const iy = (py - v.ty) / v.scale;
        return clampView({ scale: s, tx: px - ix * s, ty: py - iy * s });
      });
    },
    [frame, minScale, clampView],
  );

  // ── Draw ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !frame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w: cw, h: ch } = canvasSize;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    // Image
    ctx.save();
    ctx.translate(view.tx, view.ty);
    ctx.scale(view.scale, view.scale);
    ctx.drawImage(img, 0, 0);
    ctx.restore();

    // Рамка (без затемнения — фото видно целиком).
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    if (isCircle) {
      ctx.beginPath();
      ctx.ellipse(frame.left + frame.w / 2, frame.top + frame.h / 2, frame.w / 2, frame.h / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(frame.left, frame.top, frame.w, frame.h);
      // Сетка третей — помогает выровнять кадр.
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(frame.left + (frame.w * i) / 3, frame.top);
        ctx.lineTo(frame.left + (frame.w * i) / 3, frame.top + frame.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(frame.left, frame.top + (frame.h * i) / 3);
        ctx.lineTo(frame.left + frame.w, frame.top + (frame.h * i) / 3);
        ctx.stroke();
      }
    }
  }, [canvasSize, frame, view, isCircle]);

  useEffect(() => {
    draw();
  }, [draw]);

  // ── Pan (один палец / мышь) ──
  const dragRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);

  const pointerDown = (clientX: number, clientY: number) => {
    dragRef.current = { startX: clientX, startY: clientY, startTx: view.tx, startTy: view.ty };
  };
  const pointerMove = (clientX: number, clientY: number) => {
    const d = dragRef.current;
    if (!d) return;
    setView((v) =>
      clampView({ scale: v.scale, tx: d.startTx + (clientX - d.startX), ty: d.startTy + (clientY - d.startY) }),
    );
  };
  const pointerUp = () => {
    dragRef.current = null;
  };

  const onMouseDown = (e: React.MouseEvent) => pointerDown(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent) => pointerMove(e.clientX, e.clientY);
  const onMouseUp = () => pointerUp();

  // Зум колесом — относительно курсора. Native-листенер ради passive:false.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      zoomTo(view.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [view.scale, zoomTo]);

  // ── Touch: drag + pinch ──
  const pinchRef = useRef<{ dist: number } | null>(null);
  const touchInfo = (touches: React.TouchList) => {
    const a = touches[0];
    const b = touches[1];
    return {
      dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      cx: (a.clientX + b.clientX) / 2,
      cy: (a.clientY + b.clientY) / 2,
    };
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      pinchRef.current = { dist: touchInfo(e.touches).dist };
      dragRef.current = null;
    } else if (e.touches.length === 1) {
      pinchRef.current = null;
      pointerDown(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length >= 2 && pinchRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      const m = touchInfo(e.touches);
      const factor = m.dist / (pinchRef.current.dist || m.dist);
      zoomTo(view.scale * factor, m.cx - r.left, m.cy - r.top);
      pinchRef.current = { dist: m.dist };
    } else if (e.touches.length === 1) {
      pointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      pointerUp();
      pinchRef.current = null;
    } else if (e.touches.length === 1) {
      pinchRef.current = null;
      pointerDown(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !frame || !imgSize) return;
    // Область изображения под рамкой (в пикселях оригинала).
    const sx = clamp((frame.left - view.tx) / view.scale, 0, imgSize.w);
    const sy = clamp((frame.top - view.ty) / view.scale, 0, imgSize.h);
    const sw = clamp(frame.w / view.scale, 1, imgSize.w - sx);
    const sh = clamp(frame.h / view.scale, 1, imgSize.h - sy);
    const out = Math.min(maxOutputPx / sw, maxOutputPx / sh, 1);
    const dw = Math.max(1, Math.round(sw * out));
    const dh = Math.max(1, Math.round(sh * out));
    const offscreen = document.createElement('canvas');
    offscreen.width = dw;
    offscreen.height = dh;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    offscreen.toBlob(
      (blob) => {
        if (!blob) return;
        const base = file.name.replace(/\.[^.]+$/, '');
        onConfirm(new File([blob], `${base}_cropped.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  };

  const zoomPercent = minScale > 0 ? Math.round((view.scale / minScale) * 100) : 100;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
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
          className="h-full w-full touch-none select-none"
          style={{ cursor: dragRef.current ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        />
        {!imgSize && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-white/10 bg-black px-4 py-3">
        {/* Масштаб */}
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => zoomTo(view.scale / 1.2)}
            title="Уменьшить"
            className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={minScale}
            max={minScale * MAX_ZOOM_FACTOR}
            step={minScale / 100}
            value={view.scale}
            onChange={(e) => zoomTo(parseFloat(e.target.value))}
            title="Масштаб"
            aria-label="Масштаб"
            className="h-1 max-w-[220px] flex-1 cursor-pointer accent-emerald-500"
          />
          <button
            type="button"
            onClick={() => zoomTo(view.scale * 1.2)}
            title="Увеличить"
            className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs tabular-nums text-white/50">{zoomPercent}%</span>
          <button
            type="button"
            onClick={fitView}
            title="Сбросить"
            className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Действия */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-input border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-white/70 hover:bg-white/10"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!imgSize}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-input bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            <Check className="h-4 w-4" />
            Применить
          </button>
        </div>

        <p className="text-center text-[11px] text-white/30">
          Двигайте фото пальцем • Щипок двумя пальцами — масштаб
        </p>
      </div>
    </div>
  );
}
