import React from 'react';
import type { UserDefinedResponse } from '../types';

interface ResponseDefinitionFormProps {
  responses: UserDefinedResponse[];
  onAdd: () => void;
  onUpdate: (id: string, field: 'statusCode' | 'description', value: string) => void;
  onRemove: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  '2': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '3': 'bg-blue-100 text-blue-700 border-blue-200',
  '4': 'bg-amber-100 text-amber-700 border-amber-200',
  '5': 'bg-red-100 text-red-700 border-red-200',
};

const getStatusColor = (code: string) =>
  STATUS_COLORS[code?.[0]] ?? 'bg-slate-100 text-slate-700 border-slate-200';

const ResponseDefinitionForm: React.FC<ResponseDefinitionFormProps> = ({
  responses,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  return (
    <div className="space-y-2">
      {responses.length === 0 && (
        <p className="text-xs text-slate-400 italic px-1">
          No responses defined. Responses appear in ReadMe documentation.
        </p>
      )}

      {responses.map((res) => (
        <div
          key={res.id}
          className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white group hover:border-slate-300 transition-colors"
        >
          {/* Status code */}
          <input
            type="text"
            value={res.statusCode}
            onChange={(e) => onUpdate(res.id, 'statusCode', e.target.value)}
            placeholder="200"
            maxLength={3}
            className={`w-14 text-center text-xs font-bold rounded-lg border px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 shrink-0 ${getStatusColor(res.statusCode)}`}
          />

          {/* Description */}
          <input
            type="text"
            value={res.description}
            onChange={(e) => onUpdate(res.id, 'description', e.target.value)}
            placeholder="e.g. Successful operation"
            className="flex-1 text-xs text-slate-700 bg-transparent border-0 focus:outline-none placeholder-slate-300 min-w-0"
          />

          {/* Remove */}
          <button
            onClick={() => onRemove(res.id)}
            className="shrink-0 p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
            title="Remove response"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
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
