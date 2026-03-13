import React from 'react';
import type { CurlParameter } from '../types';

interface ParametersTableProps {
  params: CurlParameter[];
  onToggle: (id: string, mandatory: boolean) => void;
}

const LOCATION_STYLES: Record<string, string> = {
  query: 'bg-blue-100 text-blue-700',
  header: 'bg-violet-100 text-violet-700',
  body: 'bg-amber-100 text-amber-700',
};

const ParametersTable: React.FC<ParametersTableProps> = ({ params, onToggle }) => {
  if (params.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="py-2.5 pl-3 pr-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-10">
              Req
            </th>
            <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Name
            </th>
            <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-20">
              In
            </th>
            <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-20">
              Type
            </th>
            <th className="py-2.5 pl-2 pr-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Example
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {params.map((p) => {
            const exampleStr =
              typeof p.value === 'object'
                ? JSON.stringify(p.value).substring(0, 50)
                : String(p.value ?? '').substring(0, 50);

            return (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                {/* Mandatory checkbox */}
                <td className="py-2.5 pl-3 pr-2">
                  <input
                    type="checkbox"
                    checked={p.isMandatory}
                    onChange={(e) => onToggle(p.id, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </td>

                {/* Name */}
                <td className="py-2.5 px-2 font-mono text-xs text-slate-800 font-medium max-w-[120px] truncate" title={p.name}>
                  {p.name}
                </td>

                {/* Location */}
                <td className="py-2.5 px-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${LOCATION_STYLES[p.location] ?? 'bg-slate-100 text-slate-600'}`}>
                    {p.location}
                  </span>
                </td>

                {/* Type */}
                <td className="py-2.5 px-2 font-mono text-[11px] text-slate-500">
                  {p.inferredType}
                </td>

                {/* Example */}
                <td className="py-2.5 pl-2 pr-3 font-mono text-[11px] text-slate-400 max-w-[120px] truncate" title={exampleStr}>
                  {exampleStr || <span className="italic text-slate-300">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ParametersTable;
