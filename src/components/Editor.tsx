import React, { useState } from 'react';

interface EditorProps {
  value: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  isError?: boolean;
  onCopy?: () => void;
  onDownload?: () => void;
}

const Editor: React.FC<EditorProps> = ({
  value,
  onChange,
  placeholder,
  readOnly = false,
  isError = false,
  onCopy,
  onDownload,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    onCopy?.();
  };

  if (readOnly) {
    return (
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center justify-end px-4 py-2 bg-slate-800 border-b border-slate-700 rounded-t-xl">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
            {onDownload && (
              <button
                onClick={onDownload}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            )}
          </div>
        </div>
        {/* Code area */}
        <textarea
          readOnly
          value={value}
          className="flex-1 w-full p-4 font-mono text-sm text-emerald-300 bg-slate-900 resize-none focus:outline-none rounded-b-xl leading-relaxed"
          style={{ fontFamily: "'Fira Code', monospace" }}
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      className={`w-full h-full p-4 font-mono text-sm resize-none focus:outline-none transition-colors leading-relaxed rounded-xl border-2
        ${isError
          ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-300'
          : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
        }`}
      style={{ fontFamily: "'Fira Code', monospace" }}
    />
  );
};

export default Editor;
