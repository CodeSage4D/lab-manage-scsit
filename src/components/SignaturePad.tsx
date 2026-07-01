"use client";

import React, { useRef, useState, useEffect } from "react";
import { CheckCircle2, FileEdit } from "lucide-react";

interface SignaturePadProps {
  onChange:        (dataUrl: string | null) => void;
  savedSignature:  string | null;
}

export default function SignaturePad({ onChange, savedSignature }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [typedName, setTypedName] = useState("");
  const [hasSigned, setHasSigned] = useState(false);
  const timerRef = useRef<any>(null);

  // Derive signature text color based on dark mode status
  const getStrokeColor = () =>
    document.documentElement.classList.contains("dark") ? "#FF0055" : "#E11D48";

  const handleNameChange = (val: string) => {
    setTypedName(val);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!val.trim()) {
      setHasSigned(false);
      onChange(null);
      return;
    }

    timerRef.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Canvas size setup
      canvas.width = 400;
      canvas.height = 120;

      // Background setup (solid white to print nicely on PDF)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw script text signature
      ctx.fillStyle = getStrokeColor();
      ctx.font = "italic bold 32px 'Brush Script MT', 'Dancing Script', cursive";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(val, canvas.width / 2, canvas.height / 2);

      setHasSigned(true);
      onChange(canvas.toDataURL("image/png"));
    }, 100);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Handle restoring saved signature (if any)
  useEffect(() => {
    if (savedSignature && !typedName) {
      setHasSigned(true);
    }
  }, [savedSignature, typedName]);

  return (
    <div className="w-full space-y-3 text-left">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-650 dark:text-slate-350 flex items-center gap-1.5">
          <FileEdit size={14} className="text-suas-ruby" />
          Type Full Name to Sign
        </span>
        {hasSigned && (
          <span className="text-emerald-600 dark:text-emerald-450 font-medium flex items-center gap-1">
            <CheckCircle2 size={13} /> Digitally Signed
          </span>
        )}
      </div>

      <div className="space-y-2">
        <input
          type="text"
          placeholder="Type your full name (e.g. Dr. Rohan Sharma)"
          value={typedName}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none text-slate-850 dark:text-slate-200 focus:ring-1 focus:ring-suas-ruby"
        />

        {/* Live signature preview box */}
        {typedName.trim() && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-850 bg-white flex items-center justify-center min-h-[90px] shadow-sm animate-float-up">
            <span 
              className="text-2xl font-bold italic tracking-wide text-center"
              style={{
                fontFamily: "'Brush Script MT', 'Dancing Script', cursive",
                color: getStrokeColor()
              }}
            >
              {typedName}
            </span>
          </div>
        )}
      </div>

      {/* Hidden canvas used to generate base64 DataURL for backend/database consistency */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
      
      <p className="text-[10px] text-slate-400 dark:text-slate-550 italic">
        By typing your name, you authorize this as your verified digital e-signature.
      </p>
    </div>
  );
}
