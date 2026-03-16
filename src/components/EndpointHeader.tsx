import React, { useState, useRef, useEffect } from 'react';

interface EndpointHeaderProps {
  title: string;
  method: string;
  path: string;
}

const HOSTS = [
  { label: 'EU', url: 'https://eu.intouch.capillarytech.com' },
  { label: 'India', url: 'https://intouch.capillary.co.in' },
  { label: 'APAC2', url: 'https://apac2.intouch.capillarytech.com' },
  { label: 'SG', url: 'https://sgcrm.cc.capillarytech.com' },
  { label: 'CN', url: 'http://intouch.capillarytech.cn.com' },
  { label: 'US', url: 'https://north-america.intouch.capillarytech.com' },
];

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-blue-500 text-white',
  POST: 'bg-emerald-500 text-white',
  PUT: 'bg-violet-500 text-white',
  PATCH: 'bg-amber-500 text-white',
  DELETE: 'bg-red-500 text-white',
};

const EndpointHeader: React.FC<EndpointHeaderProps> = ({ title, method, path }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!title && !method) return null;

  const methodStyle = METHOD_STYLES[method?.toUpperCase()] ?? 'bg-slate-500 text-white';

  return (
    <div className="px-6 pt-6 pb-4 border-b border-slate-800">
      <h2 className="text-2xl font-bold text-white mb-4 tracking-tight leading-snug">{title}</h2>

      <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5 font-mono text-sm border border-slate-700">
        {/* Method badge */}
        <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide shrink-0 ${methodStyle}`}>
          {method || 'GET'}
        </span>

        {/* Host dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 text-indigo-400 font-semibold hover:text-indigo-300 transition-colors px-1 py-0.5 rounded hover:bg-slate-700"
            title="Regional server variable"
          >
            &#123;Host&#125;
            <svg
              className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute z-50 top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  All 6 regions included in YAML
                </p>
              </div>
              {HOSTS.map((h) => (
                <div
                  key={h.label}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                >
                  <span className="w-10 text-xs font-bold text-slate-700 shrink-0">{h.label}</span>
                  <span className="text-[11px] text-slate-400 font-mono truncate">{h.url}</span>
                </div>
              ))}
              <div className="px-4 py-2.5 bg-emerald-50 border-t border-emerald-100">
                <p className="text-[10px] text-emerald-600 font-semibold">
                  ReadMe shows these as a server dropdown — fully editable
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Path */}
        <span className="text-slate-300 truncate">{path || '/'}</span>
      </div>
    </div>
  );
};

export default EndpointHeader;
