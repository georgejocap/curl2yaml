import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { convertCurlToOpenAPI } from './services/geminiService';
import { parseCurl } from './services/curlParser';
import { patchYaml } from './services/yamlPatcher';
import Editor from './components/Editor';
import EndpointHeader from './components/EndpointHeader';
import ParametersTable from './components/ParametersTable';
import ResponseDefinitionForm from './components/ResponseDefinitionForm';
import type { CurlParameter, UserDefinedResponse } from './types';

const EXAMPLE_CURL = `curl --location 'https://eu.intouch.capillarytech.com/v2/product/brands' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==' \\
--data '{
    "brands": [
        {"id": 101, "name": "Capillary Tech"},
        {"id": 102, "name": "InTouch"}
    ]
}'`;

const App: React.FC = () => {
  const [curlInput, setCurlInput] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [yamlOutput, setYamlOutput] = useState('');
  const [details, setDetails] = useState('');
  const [modelUsed, setModelUsed] = useState('');
  const [allParams, setAllParams] = useState<CurlParameter[]>([]);
  const [responses, setResponses] = useState<UserDefinedResponse[]>([]);
  const [paramsOpen, setParamsOpen] = useState(true);
  const [responsesOpen, setResponsesOpen] = useState(true);
  const [showMandatoryWarning, setShowMandatoryWarning] = useState(false);
  const [showResponseWarning, setShowResponseWarning] = useState(false);

  // ── Derived: extract title / method / path from Grok analysis summary ──
  const extracted = useMemo(() => {
    const summaryMatch = details.match(/summary\s*[:\s]+([^\n\r]+)/i);
    const methodMatch = details.match(/method\s*[:\s]+([^\n\r]+)/i);
    const pathMatch = details.match(/path\s*[:\s]+([^\n\r]+)/i);
    return {
      title: summaryMatch?.[1]?.replace(/\*+/g, '').trim() ?? '',
      method: methodMatch?.[1]?.trim() ?? '',
      path: pathMatch?.[1]?.trim() ?? '',
    };
  }, [details]);

  const hasOutput = !!yamlOutput;

  // Auto-parse cURL as user types/pastes — populates params before Convert is clicked
  useEffect(() => {
    if (!curlInput.trim()) {
      setAllParams([]);
      return;
    }
    const timer = setTimeout(() => {
      try {
        const { queryParams, headers, bodyParams } = parseCurl(curlInput);
        const combined: CurlParameter[] = [
          ...queryParams,
          ...headers,
          ...bodyParams.filter((p) => p.name !== ''),
        ];
        setAllParams(combined);
      } catch {
        // ignore parse errors silently
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [curlInput]);

  // ── Convert (inner — bypasses mandatory check) ────────────────────────────
  const doConvert = useCallback(async () => {
    setShowMandatoryWarning(false);
    setIsConverting(true);
    setConvertError(null);
    setYamlOutput('');
    setDetails('');
    setModelUsed('');

    const mandatory = allParams
      .filter((p) => p.isMandatory)
      .map((p) => ({ name: p.name, location: p.location }));

    try {
      const result = await convertCurlToOpenAPI(curlInput, mandatory);
      setYamlOutput(result.yaml);
      setDetails(result.details);
      setModelUsed(result.modelUsed);
    } catch (err) {
      setConvertError((err as Error)?.message ?? 'Conversion failed. Please try again.');
    } finally {
      setIsConverting(false);
    }
  }, [curlInput, allParams]);

  // ── Convert (gate — shows warning if no mandatory params chosen) ───────────
  const handleConvert = useCallback(async () => {
    if (!curlInput.trim()) {
      setConvertError('Please paste a cURL command first.');
      return;
    }
    // If params are loaded but none marked mandatory, pause and warn
    if (allParams.length > 0 && allParams.every((p) => !p.isMandatory)) {
      setShowMandatoryWarning(true);
      setParamsOpen(true); // make sure params section is visible
      return;
    }
    await doConvert();
  }, [curlInput, allParams, doConvert]);

  // ── Params ─────────────────────────────────────────────────────────────────
  const handleToggleParam = (id: string, mandatory: boolean) => {
    if (mandatory) setShowMandatoryWarning(false);
    setAllParams((prev) => prev.map((p) => (p.id === id ? { ...p, isMandatory: mandatory } : p)));
  };

  const handleTypeChange = (id: string, type: string) => {
    setAllParams((prev) => prev.map((p) => (p.id === id ? { ...p, inferredType: type } : p)));
  };

  // ── Responses ──────────────────────────────────────────────────────────────
  const handleAddResponse = () => {
    setShowResponseWarning(false);
    setResponses((prev) => [
      ...prev,
      { id: crypto.randomUUID(), statusCode: '', description: '', contentType: 'application/json', bodyExample: '' },
    ]);
  };

  const handleUpdateResponse = (
    id: string,
    field: 'statusCode' | 'description' | 'bodyExample',
    value: string
  ) => {
    setResponses((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleRemoveResponse = (id: string) => {
    setResponses((prev) => prev.filter((r) => r.id !== id));
  };

  // ── Download ───────────────────────────────────────────────────────────────
  const doDownload = () => {
    if (!yamlOutput) return;
    setShowResponseWarning(false);
    const patched = patchYaml(yamlOutput, allParams, responses);
    const fileName = (extracted.title || 'openapi-spec')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'openapi-spec';

    const blob = new Blob([patched], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    if (!yamlOutput) return;
    if (responses.length === 0) {
      setShowResponseWarning(true);
      setResponsesOpen(true);
      return;
    }
    doDownload();
  };

  // ── Clear ──────────────────────────────────────────────────────────────────
  const handleClear = () => {
    setCurlInput('');
    setYamlOutput('');
    setDetails('');
    setConvertError(null);
    setAllParams([]);
    setResponses([]);
    setShowMandatoryWarning(false);
    setShowResponseWarning(false);
  };

  // ── Section header helper ──────────────────────────────────────────────────
  const SectionHeader = ({
    label,
    count,
    open,
    onToggle,
  }: {
    label: string;
    count?: number;
    open: boolean;
    onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full py-2 text-left group"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      <svg
        className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold text-slate-900 leading-none">Curl to Yaml converter</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setCurlInput(EXAMPLE_CURL); setConvertError(null); }}
              className="text-xs font-semibold text-slate-500 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Example
            </button>
            <button
              onClick={handleClear}
              className="text-xs font-semibold text-slate-500 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex max-w-[1600px] mx-auto w-full">

        {/* ── Left Panel ─────────────────────────────────────────────────── */}
        <div className="w-[440px] shrink-0 flex flex-col border-r border-slate-200 bg-white overflow-y-auto">

          {/* cURL Input */}
          <div className="p-5 border-b border-slate-100">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">
              cURL Command
            </label>
            <div className="h-52">
              <Editor
                value={curlInput}
                onChange={(v) => { setCurlInput(v); setConvertError(null); }}
                placeholder="curl --location 'https://api.example.com/v1/...' \"
                isError={!!convertError}
              />
            </div>

            {convertError && (
              <div className="mt-2 flex items-start gap-2 p-2.5 bg-red-50 rounded-lg border border-red-100">
                <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-red-600 font-medium">{convertError}</p>
              </div>
            )}

            {/* Convert button */}
            <button
              onClick={handleConvert}
              disabled={isConverting}
              className={`mt-3 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all
                ${isConverting
                  ? 'bg-slate-100 text-slate-400 cursor-wait'
                  : showMandatoryWarning
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200 animate-pulse'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]'
                }`}
            >
              {isConverting ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Converting...
                </>
              ) : (
                <>
                  Convert to YAML
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {/* Parameters */}
          <div className={`p-5 border-b transition-all duration-300 ${showMandatoryWarning ? 'border-amber-300 bg-amber-50' : 'border-slate-100'}`}>
            <div className={`rounded-lg transition-all duration-300 ${showMandatoryWarning ? 'ring-2 ring-amber-400 ring-offset-1 rounded-lg px-2 -mx-2' : ''}`}>
              <SectionHeader
                label="Parameters"
                count={allParams.length}
                open={paramsOpen}
                onToggle={() => setParamsOpen((o) => !o)}
              />
            </div>

            {/* Mandatory warning banner */}
            {showMandatoryWarning && (
              <div className="mt-2 mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3">
                <div className="flex items-start gap-2 mb-2.5">
                  <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
                  <p className="text-xs font-semibold text-amber-800 leading-snug">
                    No parameters marked as required.<br />
                    <span className="font-normal text-amber-700">Check the boxes above for any fields your API needs.</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={doConvert}
                    className="flex-1 text-[11px] font-bold px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                  >
                    No required params — generate anyway
                  </button>
                  <button
                    onClick={() => setShowMandatoryWarning(false)}
                    className="text-[11px] font-semibold px-3 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    Let me check
                  </button>
                </div>
              </div>
            )}

            {paramsOpen && (
              <div className="mt-2">
                {allParams.length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-1">
                    {hasOutput
                      ? 'No parameters detected.'
                      : 'Parameters appear here as you type your cURL.'}
                  </p>
                ) : (
                  <ParametersTable params={allParams} onToggle={handleToggleParam} onTypeChange={handleTypeChange} />
                )}
              </div>
            )}
          </div>

          {/* Responses */}
          <div className={`p-5 transition-all duration-300 ${showResponseWarning ? 'border border-amber-300 bg-amber-50 rounded-xl mx-3 mb-3' : ''}`}>
            <div className={`rounded-lg transition-all duration-300 ${showResponseWarning ? 'ring-2 ring-amber-400 ring-offset-1 rounded-lg px-2 -mx-2' : ''}`}>
              <SectionHeader
                label="Responses"
                count={responses.length}
                open={responsesOpen}
                onToggle={() => setResponsesOpen((o) => !o)}
              />
            </div>

            {/* Response warning banner */}
            {showResponseWarning && (
              <div className="mt-2 mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3">
                <div className="flex items-start gap-2 mb-2.5">
                  <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
                  <p className="text-xs font-semibold text-amber-800 leading-snug">
                    No response codes added.<br />
                    <span className="font-normal text-amber-700">Adding a response helps ReadMe show the right status codes in your docs.</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={doDownload}
                    className="flex-1 text-[11px] font-bold px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                  >
                    Skip — download without responses
                  </button>
                  <button
                    onClick={() => setShowResponseWarning(false)}
                    className="text-[11px] font-semibold px-3 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    Let me add
                  </button>
                </div>
              </div>
            )}

            {responsesOpen && (
              <div className="mt-2">
                <ResponseDefinitionForm
                  responses={responses}
                  onAdd={handleAddResponse}
                  onUpdate={handleUpdateResponse}
                  onRemove={handleRemoveResponse}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel (Output) ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-slate-900 min-h-0">
          {!hasOutput ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-5 p-12">
              <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-700">
                <svg className="w-9 h-9 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-slate-400 font-semibold text-sm">How to use</p>
              </div>
              <div className="flex flex-col gap-2 text-xs text-slate-500 mt-2 text-left">
                {[
                  '1. Copy a cURL command from Postman or your browser',
                  '2. Paste it in the box on the left — params auto-populate instantly',
                  '3. Check which params are mandatory in the Parameters table',
                  '4. Hit Convert — AI generates the YAML with your required selections baked in',
                  '5. Add response codes and paste the Postman response body',
                  '6. Click Download YAML to get the file',
                ].map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1" />
                    {f}
                  </div>
                ))}
              </div>
              {/* What it does automatically */}
              <div className="mt-6 w-full max-w-xs">
                <p className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider mb-2">What it does automatically</p>
                <div className="flex flex-col gap-1.5 text-xs text-slate-600">
                  {[
                    'Strips the host from the URL — only the path goes into the spec',
                    'Adds all 6 Capillary regional servers (EU, India, APAC, SG, CN, NA) as a dropdown in ReadMe',
                    'Truncates your Basic Auth token so credentials are never exposed in docs',
                    'Detects query params, headers, and request body fields automatically',
                    'Outputs valid YAML — ready to upload directly to ReadMe.com',
                  ].map((note) => (
                    <div key={note} className="flex items-start gap-2">
                      <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Output */
            <div className="flex-1 flex flex-col min-h-0">
              <EndpointHeader
                title={extracted.title}
                method={extracted.method}
                path={extracted.path}
              />

              {/* YAML Editor */}
              <div className="flex-1 min-h-0">
                <Editor
                  value={yamlOutput}
                  readOnly
                  onDownload={handleDownload}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2.5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
            Curl to Yaml converter · Capillary Technologies
          </p>
          <p className="text-[10px] text-slate-400">
            Powered by Gemini AI · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
