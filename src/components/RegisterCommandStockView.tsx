import React, { useState, useRef } from 'react';
import { PackagePlus, CheckCircle2, Download, Upload, AlertTriangle, X, FileSpreadsheet } from 'lucide-react';
import { useUniformData } from '../context/UniformDataContext';
import { UniformItem } from '../types';

interface ParsedRow {
  line: number;
  rawModelCode: string;
  size: string;
  quantity: number;
  matchedUniform: UniformItem | null;
  error?: string;
}

// Simple CSV template for registering existing catalog quantities into a
// Командлал/Анги's own warehouse — unlike the full HQ catalog template, this
// never creates new models, so it only needs 3 columns.
function generateStockRegisterTemplate(uniforms: UniformItem[], withExample: boolean): string {
  const headers = ['modelCode', 'size', 'quantity'];
  const headersMn = ['Загварын код', 'Размер', 'Тоо ширхэг'];
  const exampleUniform = uniforms[0];
  const exampleSize = exampleUniform ? Object.keys(exampleUniform.sizeStock)[0] : '50-3';
  const rows = withExample && exampleUniform
    ? [[exampleUniform.modelCode.split(',')[0].trim(), exampleSize, '10']]
    : [];
  const csvContent = [headers.join(','), headersMn.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  return '\uFEFF' + csvContent;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseStockCsv(text: string, uniforms: UniformItem[]): ParsedRow[] {
  const lines = text.split(/\r\n|\n|\r/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const splitLine = (line: string) => line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

  let dataStart = 1;
  if (lines.length > 1) {
    const secondRow = splitLine(lines[1]);
    if (secondRow[0] === 'Загварын код') dataStart = 2;
  }

  const result: ParsedRow[] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const rawModelCode = (cols[0] || '').trim();
    const size = (cols[1] || '').trim();
    const quantity = parseInt(cols[2], 10) || 0;

    const matchedUniform = uniforms.find(u =>
      u.modelCode === rawModelCode ||
      u.modelCode.split(',').some(part => part.trim() === rawModelCode) ||
      u.id === rawModelCode
    ) || null;

    let error: string | undefined;
    if (!rawModelCode) error = 'Загварын код хоосон байна';
    else if (!matchedUniform) error = 'Тохирох загвар олдсонгүй';
    else if (!size) error = 'Размер хоосон байна';
    else if (quantity <= 0) error = 'Тоо ширхэг буруу байна';

    result.push({ line: i + 1, rawModelCode, size, quantity, matchedUniform, error });
  }
  return result;
}

export const RegisterCommandStockView: React.FC = () => {
  const { session, uniforms, registerOwnStock } = useUniformData();
  const [form, setForm] = useState({ uniformId: '', size: '', quantity: 1 });
  const [confirmed, setConfirmed] = useState('');

  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [bulkConfirmed, setBulkConfirmed] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedUniform = uniforms.find(u => u.id === form.uniformId);
  const sizeOptions = selectedUniform ? Object.keys(selectedUniform.sizeStock) : [];

  const handleSubmit = () => {
    if (!form.uniformId || !form.size || form.quantity <= 0) return;
    registerOwnStock({ uniformId: form.uniformId, size: form.size, quantity: form.quantity });
    setConfirmed(`${selectedUniform?.nameMn} [${form.size}] x${form.quantity} бүртгэгдлээ.`);
    setForm({ uniformId: '', size: '', quantity: 1 });
    setTimeout(() => setConfirmed(''), 4000);
  };

  const handleFileSelect = (file: File) => {
    setFileName(file.name);
    setBulkConfirmed('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || '');
      setParsedRows(parseStockCsv(text, uniforms));
    };
    reader.readAsText(file, 'utf-8');
  };

  const validRows = parsedRows.filter(r => !r.error);
  const invalidRows = parsedRows.filter(r => r.error);

  const handleBulkConfirm = () => {
    validRows.forEach(r => {
      if (r.matchedUniform) {
        registerOwnStock({ uniformId: r.matchedUniform.id, size: r.size, quantity: r.quantity });
      }
    });
    setBulkConfirmed(`${validRows.length} мөр амжилттай бүртгэгдлээ.`);
    setParsedRows([]);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-bold text-foam-100">Шинээр бүртгэх</h1>
        <p className="text-xs text-foam-600 mt-0.5">{session.displayName}</p>
      </div>

      <p className="text-[11px] text-foam-600">
        Энд бүртгэсэн нөөц ЗХЖШ-с илгээгдээгүй, өөрийн агуулахад шууд нэмэгдэнэ (жишээ нь: орон нутгаас худалдан авсан, хандиваар өгсөн зэрэг).
      </p>

      {/* Mode switch */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('single')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            mode === 'single' ? 'bg-foam-300 text-teal-950' : 'bg-teal-900 border border-teal-700 text-foam-500 hover:text-foam-200'
          }`}
        >
          <PackagePlus className="w-3.5 h-3.5" /> Нэг нэгээр
        </button>
        <button
          onClick={() => setMode('bulk')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            mode === 'bulk' ? 'bg-foam-300 text-teal-950' : 'bg-teal-900 border border-teal-700 text-foam-500 hover:text-foam-200'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Excel / CSV-ээр олноор
        </button>
      </div>

      {mode === 'single' && (
        <div className="bg-teal-900 border border-teal-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <PackagePlus className="w-4 h-4 text-foam-300" />
            <h2 className="text-sm font-semibold text-foam-100">Нэг загвар бүртгэх</h2>
          </div>

          <div className="space-y-3">
            <select
              value={form.uniformId}
              onChange={e => setForm({ ...form, uniformId: e.target.value, size: '' })}
              className="w-full bg-teal-950 border border-teal-700 rounded-xl px-3 py-2.5 text-xs text-foam-100"
            >
              <option value="">Загвар сонгох...</option>
              {uniforms.map(u => <option key={u.id} value={u.id}>{u.nameMn}</option>)}
            </select>
            <select
              value={form.size}
              onChange={e => setForm({ ...form, size: e.target.value })}
              disabled={!selectedUniform}
              className="w-full bg-teal-950 border border-teal-700 rounded-xl px-3 py-2.5 text-xs text-foam-100 disabled:opacity-50"
            >
              <option value="">Размер сонгох...</option>
              {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
              className="w-full bg-teal-950 border border-teal-700 rounded-xl px-3 py-2.5 text-xs text-foam-100"
              placeholder="Тоо ширхэг"
            />
          </div>

          {confirmed && (
            <div className="mt-3 flex items-center gap-2 text-xs text-foam-300 bg-foam-300/10 border border-foam-300/30 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-4 h-4" /> {confirmed}
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="mt-4 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-foam-300 text-teal-950 font-semibold text-xs hover:bg-foam-200 transition"
          >
            <PackagePlus className="w-3.5 h-3.5" /> Бүртгэх
          </button>
        </div>
      )}

      {mode === 'bulk' && (
        <div className="bg-teal-900 border border-teal-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-foam-300" />
            <h2 className="text-sm font-semibold text-foam-100">Олноор бүртгэх (Excel / CSV)</h2>
          </div>

          {/* Step 1: download template */}
          <div>
            <div className="text-[11px] text-foam-600 mb-2">1. Загвар файл татаж, бөглөнө үү (Загварын код, Размер, Тоо ширхэг)</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => downloadCsv('Nooц_burtgeh_jishee.csv', generateStockRegisterTemplate(uniforms, true))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-950 border border-teal-700 text-foam-200 text-xs hover:border-foam-300 transition"
              >
                <Download className="w-3.5 h-3.5" /> Жишээтэй загвар
              </button>
              <button
                onClick={() => downloadCsv('Nooц_burtgeh_hooson.csv', generateStockRegisterTemplate(uniforms, false))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-950 border border-teal-700 text-foam-200 text-xs hover:border-foam-300 transition"
              >
                <Download className="w-3.5 h-3.5" /> Хоосон загвар
              </button>
            </div>
          </div>

          {/* Step 2: upload */}
          <div>
            <div className="text-[11px] text-foam-600 mb-2">2. Бөглөсөн CSV файлаа сонгоно уу</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="block w-full text-xs text-foam-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-foam-300 file:text-teal-950 file:text-xs file:font-semibold file:cursor-pointer"
            />
            {fileName && <div className="text-[11px] text-foam-600 mt-1.5">{fileName}</div>}
          </div>

          {/* Preview */}
          {parsedRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] text-foam-600">
                  {validRows.length} мөр зөв, {invalidRows.length > 0 && <span className="text-rose-400">{invalidRows.length} мөр алдаатай</span>}
                </div>
                <button onClick={() => { setParsedRows([]); setFileName(''); }} className="text-foam-600 hover:text-foam-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {parsedRows.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between text-[11px] px-3 py-1.5 rounded-lg border ${
                      r.error ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-teal-950 border-teal-800 text-foam-200'
                    }`}
                  >
                    <span>
                      {r.matchedUniform ? r.matchedUniform.nameMn : r.rawModelCode} [{r.size}] x{r.quantity}
                    </span>
                    {r.error && (
                      <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {r.error}</span>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={handleBulkConfirm}
                disabled={validRows.length === 0}
                className="mt-3 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-foam-300 text-teal-950 font-semibold text-xs hover:bg-foam-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload className="w-3.5 h-3.5" /> {validRows.length} мөрийг бүртгэх
              </button>
            </div>
          )}

          {bulkConfirmed && (
            <div className="flex items-center gap-2 text-xs text-foam-300 bg-foam-300/10 border border-foam-300/30 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-4 h-4" /> {bulkConfirmed}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
