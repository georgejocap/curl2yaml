import React from 'react';
import type { CurlParameter } from '../types';

interface ParametersTableProps {
  params: CurlParameter[];
  onToggle: (id: string, mandatory: boolean) => void;
}

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
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {params.map((p) => (
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
              <td className="py-2.5 px-2 font-mono text-xs text-slate-800 font-medium truncate" title={p.name}>
                {p.name}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ParametersTable;
