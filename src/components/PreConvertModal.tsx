import React, { useEffect } from 'react';

interface PreConvertModalProps {
  warnings: {
    noMandatoryParams: boolean;
    noResponses: boolean;
  };
  onGenerateAnyway: () => void;
  onFixParams: () => void;
  onFixResponses: () => void;
  onClose: () => void;
}

const PreConvertModal: React.FC<PreConvertModalProps> = ({
  warnings,
  onGenerateAnyway,
  onFixParams,
  onFixResponses,
  onClose,
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const warningCount = (warnings.noMandatoryParams ? 1 : 0) + (warnings.noResponses ? 1 : 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Before you generate</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {warningCount === 2 ? '2 things to review' : '1 thing to review'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors mt-0.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Warning items */}
        <div className="px-6 pb-4 space-y-3">
          {warnings.noMandatoryParams && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-amber-500 shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 leading-tight">No required parameters marked</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  The AI won't know which fields are mandatory. Tick the checkboxes in the Parameters table first.
                </p>
                <button
                  onClick={onFixParams}
                  className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors"
                >
                  Mark required params
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {warnings.noResponses && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-blue-500 shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 leading-tight">No response examples added</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Response codes help ReadMe show the correct status codes and examples in your API docs.
                </p>
                <button
                  onClick={onFixResponses}
                  className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors"
                >
                  Add a response
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-1 flex items-center gap-3">
          <button
            onClick={onGenerateAnyway}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-md shadow-blue-200 hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-[0.98]"
          >
            Generate anyway
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreConvertModal;
