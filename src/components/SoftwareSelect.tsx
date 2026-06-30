"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Check } from "lucide-react";

interface SoftwareItem {
  name: string;
  framework: string;
  version: string;
}

interface SoftwareSelectProps {
  value: SoftwareItem;
  onChange: (value: SoftwareItem) => void;
  index: number;
}

const PRESETS = [
  { name: "Python", framework: "TensorFlow / PyTorch / Flask", version: "3.12" },
  { name: "Java", framework: "Spring Boot / Hibernate", version: "JDK 21" },
  { name: ".NET", framework: "C# / ASP.NET Core", version: "8.0" },
  { name: "React", framework: "Next.js / Vite / Tailwind", version: "19.0" },
  { name: "Angular", framework: "TypeScript / RXJS", version: "18.0" },
  { name: "TensorFlow", framework: "Python / Deep Learning", version: "2.16" },
  { name: "MATLAB", framework: "Numeric Computing / Simulink", version: "R2024a" },
  { name: "R Studio", framework: "R Programming / ggplot2", version: "2024.04" },
  { name: "Node.js", framework: "Express / NestJS / Fastify", version: "20.12" },
  { name: "C++ Compiler", framework: "GCC / G++ / CMake", version: "C++20" },
  { name: "Docker", framework: "Containerization / Compose", version: "26.0" },
  { name: "MySQL", framework: "Relational Database", version: "8.0" },
  { name: "PostgreSQL", framework: "Object-Relational Database", version: "16.2" }
];

export default function SoftwareSelect({ value, onChange, index }: SoftwareSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPresets = PRESETS.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectPreset = (preset: typeof PRESETS[0]) => {
    onChange({
      name: preset.name,
      framework: preset.framework,
      version: preset.version
    });
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleInputChange = (field: keyof SoftwareItem, newVal: string) => {
    onChange({
      ...value,
      [field]: newVal
    });
  };

  return (
    <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-4 relative">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Software Specification #{index + 1}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Software Name Selector */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Software Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search or enter software..."
              value={value.name}
              onChange={(e) => {
                handleInputChange("name", e.target.value);
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition shadow-sm"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {isOpen && (
            <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1">
              {filteredPresets.length > 0 ? (
                filteredPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => selectPreset(preset)}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center justify-between transition-colors"
                  >
                    <span>{preset.name}</span>
                    {value.name === preset.name && <Check size={14} className="text-teal-500" />}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 italic">
                  Press Tab to use custom software
                </div>
              )}
            </div>
          )}
        </div>

        {/* Framework / Tech Stack */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Framework / Tech Stack
          </label>
          <input
            type="text"
            placeholder="e.g. Django, Spring Boot"
            value={value.framework}
            onChange={(e) => handleInputChange("framework", e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition shadow-sm"
          />
        </div>

        {/* Software Version */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Required Version <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. 3.12, JDK 21"
            value={value.version}
            onChange={(e) => handleInputChange("version", e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition shadow-sm"
          />
        </div>
      </div>
    </div>
  );
}
