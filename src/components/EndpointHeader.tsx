import React, { useState, useRef, useEffect } from 'react';

interface EndpointHeaderProps {
  title: string;
  method: string;
  path: string;
  onMethodChange?: (method: string) => void;
}

const HOSTS = [
  { label: 'EU', url: 'https://eu.intouch.capillarytech.com' },
  { label: 'India', url: 'https://intouch.capillary.co.in' },
  { label: 'APAC2', url: 'https://apac2.intouch.capillarytech.com' },
  { label: 'SG', url: 'https://sgcrm.cc.capillarytech.com' },
  { label: 'CN', url: 'http://intouch.capillarytech.cn.com' },
  { label: 'US', url: 'https://north-america.intouch.capillarytech.com' },
];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-blue-500 text-white',
  POST: 'bg-emerald-500 text-white',
  PUT: 'bg-violet-500 text-white',
  PATCH: 'bg-amber-500 text-white',
  DELETE: 'bg-red-500 text-white',
};

const EndpointHeader: React.FC<EndpointHeaderProps> = ({ title, method, path, onMethodChange }) => {
  const [hostOpen, setHostOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const methodRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (hostRef.current && !hostRef.current.contains(e.target as Node)) setHostOpen(false);
      if (methodRef.current && !methodRef.current.contains(e.target as Node)) setMethodOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!title && !method) return null;

  const methodUpper = (method || 'GET').toUpperCase();
  const methodStyle = METHOD_STYLES[methodUpper] ?? 'bg-slate-500 text-white';

  return (
    <div className="px-6 pt-6 pb-4 border-b border-slate-800">
      <h2 className="text-2xl font-bold text-white mb-4 tracking-tight leading-snug">{title}</h2>

      <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5 font-mono text-sm border border-slate-700">

        {/* Method badge — clickable if onMethodChange provided */}
        <div className="relative shrink-0" ref={methodRef}>
          {onMethodChange ? (
            <button
              onClick={() => setMethodOpen((o) => !o)}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide transition-opacity hover:opacity-80 ${methodStyle}`}
              title="Click to change HTTP method"
            >
              {methodUpper}
              <svg className={`w-2.5 h-2.5 transition-transform duration-150 ${methodOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide ${methodStyle}`}>
              {methodUpper}
            </span>
          )}

          {methodOpen && onMethodChange && (
            <div className="absolute z-50 top-full left-0 mt-2 w-32 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Change method</p>
              </div>
              {HTTP_METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => { onMethodChange(m); setMethodOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${m === methodUpper ? 'bg-slate-50' : ''}`}
                >
                  <span className={`w-14 text-center text-[10px] font-bold rounded-md px-1.5 py-0.5 ${METHOD_STYLES[m] ?? 'bg-slate-500 text-white'}`}>{m}</span>
                  {m === methodUpper && (
                    <svg className="w-3 h-3 text-slate-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Host dropdown */}
        <div className="relative" ref={hostRef}>
          <button
            onClick={() => setHostOpen((o) => !o)}
            className="flex items-center gap-1 text-indigo-400 font-semibold hover:text-indigo-300 transition-colors px-1 py-0.5 rounded hover:bg-slate-700"
            title="Regional server variable"
          >
            &#123;Host&#125;
            <svg
              className={`w-3 h-3 transition-transform duration-150 ${hostOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {hostOpen && (
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
