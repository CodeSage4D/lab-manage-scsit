"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Trash2, CheckCircle2 } from "lucide-react";

interface SignaturePadProps {
  onChange:        (dataUrl: string | null) => void;
  savedSignature:  string | null;
}

export default function SignaturePad({ onChange, savedSignature }: SignaturePadProps) {
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  /* ── Derive stroke colour from current dark-mode class ───────────────── */
  const getStrokeColor = () =>
    document.documentElement.classList.contains("dark") ? "#FF0055" : "#E11D48";

  /* ── Initialise canvas (HiDPI) — runs once on mount ──────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    // BUG FIX: only resize when dimensions actually changed to avoid wiping the canvas on re-renders
    if (canvas.width !== Math.round(rect.width * devicePixelRatio) ||
        canvas.height !== Math.round(rect.height * devicePixelRatio)) {
      canvas.width  = Math.round(rect.width  * devicePixelRatio);
      canvas.height = Math.round(rect.height * devicePixelRatio);
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }

    ctx.strokeStyle = getStrokeColor();
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only

  /* ── Load saved signature (when restored from draft) ─────────────────── */
  useEffect(() => {
    if (!savedSignature) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      setHasSigned(true);
    };
    img.onerror = () => { /* ignore broken saved data */ };
    img.src = savedSignature;
  }, [savedSignature]);

  /* ── Coordinate helper (supports touch + mouse, normalised to CSS px) ── */
  const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  /* ── Drawing handlers ─────────────────────────────────────────────────── */
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = getStrokeColor();
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  /* BUG FIX: wrap in useCallback so the event identity is stable */
  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas || !hasSigned) { onChange(null); return; }
    onChange(canvas.toDataURL("image/png"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawing, hasSigned, onChange]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasSigned(false);
    setIsDrawing(false);
    onChange(null);
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          Draw Signature Here
        </span>
        {hasSigned && (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 size={13} /> Recorded
          </span>
        )}
      </div>

      {/* Canvas wrapper */}
      <div className="relative rounded-2xl overflow-hidden
        border-2 border-dashed border-slate-300/60 dark:border-slate-600/50
        bg-white/75 dark:bg-slate-900/60
        hover:border-suas-blue/40 dark:hover:border-suas-teal/40 transition">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="block w-full cursor-crosshair touch-none select-none"
          style={{ height: 180 }}
        />
        {/* Clear button */}
        <button
          type="button"
          onClick={clearCanvas}
          className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5
            px-3 py-1.5 text-xs font-bold rounded-xl
            bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400
            border border-slate-200 dark:border-slate-700
            hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-700 transition shadow-sm"
          title="Clear signature"
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500">
        Use your mouse, trackpad, or touchscreen to draw your signature.
      </p>
    </div>
  );
}
