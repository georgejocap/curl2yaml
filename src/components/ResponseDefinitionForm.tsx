import React from 'react';
import type { UserDefinedResponse } from '../types';

interface ResponseDefinitionFormProps {
  responses: UserDefinedResponse[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof Pick<UserDefinedResponse, 'statusCode' | 'description' | 'bodyExample'>, value: string) => void;
  onRemove: (id: string) => void;
}

const STATUS_COLORS: Record<string, { badge: string; dot: string }> = {
  '2': { badge: 'bg-emerald-100 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500' },
  '3': { badge: 'bg-blue-100 text-blue-700 border-blue-300', dot: 'bg-blue-500' },
  '4': { badge: 'bg-amber-100 text-amber-700 border-amber-300', dot: 'bg-amber-500' },
  '5': { badge: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500' },
};

const DEFAULT_COLORS = { badge: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
const getStatusColors = (code: string) => STATUS_COLORS[code?.[0]] ?? DEFAULT_COLORS;

const STATUS_SUGGESTIONS = ['200', '201', '204', '400', '401', '403', '404', '422', '500'];

const ResponseCard: React.FC<{
  res: UserDefinedResponse;
  onUpdate: ResponseDefinitionFormProps['onUpdate'];
  onRemove: (id: string) => void;
}> = ({ res, onUpdate, onRemove }) => {
  const colors = getStatusColors(res.statusCode);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header area */}
      <div className="px-3 pt-3 pb-2.5 space-y-2">

        {/* Status code + quick picks + remove */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Editable status code badge */}
          <div className={`flex items-center gap-1.5 shrink-0 rounded-lg border px-2.5 py-1 ${colors.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
            <input
              type="text"
              value={res.statusCode}
              onChange={(e) => onUpdate(res.id, 'statusCode', e.target.value)}
              placeholder="201"
              maxLength={3}
              className="w-10 text-center text-xs font-bold bg-transparent focus:outline-none placeholder-current placeholder-opacity-40"
            />
          </div>

          {/* Quick-pick chips */}
          {STATUS_SUGGESTIONS.filter((s) => s !== res.statusCode).slice(0, 6).map((code) => (
            <button
              key={code}
              onClick={() => onUpdate(res.id, 'statusCode', code)}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border transition-opacity hover:opacity-70 ${getStatusColors(code).badge}`}
            >
              {code}
            </button>
          ))}

          <button
            onClick={() => onRemove(res.id)}
            className="ml-auto shrink-0 p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
            title="Remove response"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Description */}
        <input
          type="text"
          value={res.description}
          onChange={(e) => onUpdate(res.id, 'description', e.target.value)}
          placeholder="Short description, e.g. Returns created resource"
          className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-slate-300"
        />
      </div>

      {/* Body — always visible, styled as code editor */}
      <div className="border-t border-slate-200">
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Response Body</span>
          <span className="text-[10px] text-slate-500">paste JSON from Postman</span>
        </div>
        <textarea
          value={res.bodyExample}
          onChange={(e) => onUpdate(res.id, 'bodyExample', e.target.value)}
          placeholder={'{\n  "status": "success",\n  "data": {}\n}'}
          rows={5}
          spellCheck={false}
          className="w-full text-xs font-mono text-emerald-300 bg-slate-900 px-3 py-2.5 focus:outline-none resize-y placeholder-slate-600 border-0 block"
          style={{ fontFamily: "'Fira Code', 'Cascadia Code', monospace" }}
        />
      </div>
    </div>
  );
};

const ResponseDefinitionForm: React.FC<ResponseDefinitionFormProps> = ({
  responses,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  return (
    <div className="space-y-3">
      {responses.length === 0 && (
        <p className="text-xs text-slate-400 italic px-1">
          No responses defined. Add one to include examples in your YAML.
        </p>
      )}

      {responses.map((res) => (
        <ResponseCard key={res.id} res={res} onUpdate={onUpdate} onRemove={onRemove} />
      ))}

      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 px-1 py-1 rounded-lg hover:bg-blue-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        Add Response
      </button>
    </div>
  );
};

export default ResponseDefinitionForm;
