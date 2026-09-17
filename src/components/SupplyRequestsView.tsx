import React, { useState } from 'react';
import { FileSignature, Send, CheckCircle2, XCircle, Plus, Trash2, Clock } from 'lucide-react';
import { useUniformData } from '../context/UniformDataContext';
import { SupplyRequestItem } from '../types';

export const SupplyRequestsView: React.FC = () => {
  const {
    session,
    uniforms,
    myLocationType,
    myOutgoingRequests,
    myIncomingRequests,
    submitSupplyRequest,
    fulfillSupplyRequest,
    rejectSupplyRequest
  } = useUniformData();

  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<SupplyRequestItem[]>([]);
  const [notes, setNotes] = useState('');
  const [draftUniformId, setDraftUniformId] = useState('');
  const [draftSize, setDraftSize] = useState('');
  const [draftQty, setDraftQty] = useState(1);
  const [formError, setFormError] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [fulfillError, setFulfillError] = useState<Record<string, string>>({});

  const uniformById = (id: string) => uniforms.find(u => u.id === id);
  const draftUniform = uniformById(draftUniformId);
  const sizeOptions = draftUniform ? Object.keys(draftUniform.sizeStock) : [];

  const parentType: 'hq' | 'command' = myLocationType === 'unit' ? 'command' : 'hq';
  const parentLabel = parentType === 'hq' ? 'ЗХЖШ' : 'харьяалагдах командлал';

  const addItem = () => {
    if (!draftUniformId || !draftSize || draftQty <= 0) return;
    const item = uniformById(draftUniformId);
    if (!item) return;
    setItems(prev => [...prev, { uniformId: draftUniformId, uniformNameMn: item.nameMn, size: draftSize, quantity: draftQty }]);
    setDraftUniformId('');
    setDraftSize('');
    setDraftQty(1);
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    setFormError('');
    if (items.length === 0) {
      setFormError('Дор хаяж нэг хувцасны төрөл нэмнэ үү.');
      return;
    }
    submitSupplyRequest({
      toType: parentType,
      toId: parentType === 'hq' ? 'HQ' : (session.commandId || ''),
      items,
      notes: notes.trim() || undefined
    });
    setItems([]);
    setNotes('');
    setShowForm(false);
  };

  const handleFulfill = (id: string) => {
    const ok = fulfillSupplyRequest(id);
    if (!ok) {
      setFulfillError(prev => ({ ...prev, [id]: 'Нөөц хүрэлцэхгүй тул биелүүлэх боломжгүй байна.' }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foam-100">Хангамжийн хүсэлт</h1>
        <p className="text-xs text-foam-600 mt-0.5">{session.displayName}</p>
      </div>

      {myLocationType !== 'unit' && (
        <div className="bg-teal-900 border border-teal-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-foam-300" />
            <h2 className="text-sm font-semibold text-foam-100">Ирсэн хүсэлтүүд ({myIncomingRequests.filter(r => r.status === 'pending').length})</h2>
          </div>
          {myIncomingRequests.length === 0 && <div className="text-xs text-foam-600 py-3">Хүсэлт ирээгүй байна.</div>}
          <div className="space-y-3">
            {myIncomingRequests.map(req => (
              <div key={req.id} className="bg-teal-950 border border-teal-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-foam-100 font-medium">{req.requestedByLabel}</div>
                    <div className="text-[11px] text-foam-600 mt-0.5">{req.requestNo} • {req.requestedDate} • {req.requestedBy}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    req.status === 'pending' ? 'bg-foam-300/15 text-foam-200' :
                    req.status === 'fulfilled' ? 'bg-foam-300/15 text-foam-200' : 'bg-rose-500/15 text-rose-300'
                  }`}>
                    {req.status === 'pending' ? 'Хүлээгдэж буй' : req.status === 'fulfilled' ? 'Биелүүлсэн' : 'Татгалзсан'}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {req.items.map((it, i) => (
                    <div key={i} className="text-xs text-foam-500">• {it.uniformNameMn} [{it.size}] x{it.quantity}</div>
                  ))}
                </div>
                {req.notes && <div className="mt-2 text-xs text-foam-600 italic">"{req.notes}"</div>}
                {req.status === 'rejected' && req.rejectionReason && (
                  <div className="mt-2 text-xs text-rose-400">Шалтгаан: {req.rejectionReason}</div>
                )}

                {req.status === 'pending' && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => handleFulfill(req.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foam-300 text-teal-950 font-semibold text-xs hover:bg-foam-200 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Биелүүлэх
                    </button>
                    {rejectingId === req.id ? (
                      <>
                        <input
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Татгалзах шалтгаан"
                          className="bg-teal-900 border border-teal-700 rounded-lg px-2 py-1.5 text-xs text-foam-100"
                        />
                        <button
                          onClick={() => {
                            rejectSupplyRequest(req.id, rejectReason.trim() || 'Тодорхойгүй');
                            setRejectingId(null);
                            setRejectReason('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 font-semibold text-xs hover:bg-rose-500/30 transition"
                        >
                          Баталгаажуулах
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setRejectingId(req.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-800 text-foam-300 font-semibold text-xs hover:bg-teal-700 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Татгалзах
                      </button>
                    )}
                  </div>
                )}
                {fulfillError[req.id] && <div className="text-rose-400 text-xs mt-2">{fulfillError[req.id]}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {myLocationType !== 'hq' && (
        <div className="bg-teal-900 border border-teal-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-foam-300" />
              <h2 className="text-sm font-semibold text-foam-100">Миний илгээсэн хүсэлтүүд</h2>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foam-300 text-teal-950 font-semibold text-xs hover:bg-foam-200 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Шинэ хүсэлт
            </button>
          </div>

          {showForm && (
            <div className="bg-teal-950 border border-teal-800 rounded-xl p-4 mb-4 space-y-3">
              <div className="text-xs text-foam-500">{parentLabel}-д илгээх хүсэлтийн маягт</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <select
                  value={draftUniformId}
                  onChange={e => { setDraftUniformId(e.target.value); setDraftSize(''); }}
                  className="bg-teal-900 border border-teal-700 rounded-lg px-2 py-1.5 text-xs text-foam-100 sm:col-span-2"
                >
                  <option value="">Загвар сонгох...</option>
                  {uniforms.map(u => <option key={u.id} value={u.id}>{u.nameMn}</option>)}
                </select>
                <select
                  value={draftSize}
                  onChange={e => setDraftSize(e.target.value)}
                  disabled={!draftUniform}
                  className="bg-teal-900 border border-teal-700 rounded-lg px-2 py-1.5 text-xs text-foam-100 disabled:opacity-50"
                >
                  <option value="">Размер...</option>
                  {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  type="number"
                  min={1}
                  value={draftQty}
                  onChange={e => setDraftQty(parseInt(e.target.value) || 1)}
                  className="bg-teal-900 border border-teal-700 rounded-lg px-2 py-1.5 text-xs text-foam-100"
                />
              </div>
              <button onClick={addItem} className="text-xs text-foam-300 hover:text-foam-200 transition">+ Мөр нэмэх</button>

              {items.length > 0 && (
                <div className="space-y-1">
                  {items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-teal-900 rounded-lg px-3 py-1.5">
                      <span className="text-foam-200">{it.uniformNameMn} [{it.size}] x{it.quantity}</span>
                      <button onClick={() => removeItem(i)}><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Тайлбар (заавал биш)"
                className="w-full bg-teal-900 border border-teal-700 rounded-lg px-3 py-2 text-xs text-foam-100"
                rows={2}
              />

              {formError && <div className="text-rose-400 text-xs">{formError}</div>}

              <button
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foam-300 text-teal-950 font-semibold text-xs hover:bg-foam-200 transition"
              >
                <Send className="w-3.5 h-3.5" /> Хүсэлт илгээх
              </button>
            </div>
          )}

          {myOutgoingRequests.length === 0 && <div className="text-xs text-foam-600 py-2">Хүсэлт илгээгээгүй байна.</div>}
          <div className="space-y-2">
            {myOutgoingRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between bg-teal-950 border border-teal-800 rounded-xl px-4 py-3">
                <div>
                  <div className="text-xs text-foam-100">{req.items.map(it => `${it.uniformNameMn} [${it.size}] x${it.quantity}`).join(', ')}</div>
                  <div className="text-[11px] text-foam-600 mt-0.5">{req.requestNo} • {req.requestedDate}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  req.status === 'pending' ? 'bg-foam-300/15 text-foam-200' :
                  req.status === 'fulfilled' ? 'bg-foam-300/15 text-foam-200' : 'bg-rose-500/15 text-rose-300'
                }`}>
                  {req.status === 'pending' ? 'Хүлээгдэж буй' : req.status === 'fulfilled' ? 'Биелүүлсэн' : 'Татгалзсан'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
