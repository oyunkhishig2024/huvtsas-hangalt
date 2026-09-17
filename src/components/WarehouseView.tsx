import React, { useState, useMemo } from 'react';
import { Package, Send, Inbox, CheckCircle2, ArrowDownToLine, X, ArrowLeft } from 'lucide-react';
import { useUniformData } from '../context/UniformDataContext';
import { UniformItem } from '../types';

// Which personnel category(ies) a uniform model serves, derived from its Decree-141
// section prefix: 1-x = senior officer / officer, 2-x = officer/sergeant/contract,
// 3-x = conscript (хугацаат цэрэг), 4-x/5-x = insignia & ceremonial (not category-specific).
export function categoriesForUniform(item: UniformItem): string[] {
  const prefix = item.modelCode.split(',')[0].trim().split('-')[0];
  if (prefix === '1') return ['Senior Officer', 'Officer'];
  if (prefix === '2') return ['Officer', 'Sergeant', 'Contract'];
  if (prefix === '3') return ['Conscript'];
  return [];
}

interface WarehouseViewProps {
  initialCategoryFilter?: string;
  onBack?: () => void;
}

export const WarehouseView: React.FC<WarehouseViewProps> = ({ initialCategoryFilter, onBack }) => {
  const {
    session,
    uniforms,
    allCommands,
    allDepartments,
    myLocationType,
    myLocationId,
    myHoldings,
    myIncomingTransfers,
    sendSupply,
    receiveSupply
  } = useUniformData();

  const [sendForm, setSendForm] = useState({ uniformId: '', size: '', quantity: 1, toId: '' });
  const [sendError, setSendError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(initialCategoryFilter);

  const uniformById = (id: string) => uniforms.find(u => u.id === id);
  const selectedUniform = uniformById(sendForm.uniformId);
  const sizeOptions = selectedUniform ? Object.keys(selectedUniform.sizeStock) : [];

  const sendTargets = useMemo(() => {
    if (myLocationType === 'hq') return allCommands.map(c => ({ id: c.id, label: c.nameMn }));
    if (myLocationType === 'command') return allDepartments.filter(d => d.commandId === myLocationId).map(d => ({ id: d.id, label: `${d.shortName} — ${d.nameMn}` }));
    return [];
  }, [myLocationType, myLocationId, allCommands, allDepartments]);

  const toType: 'command' | 'unit' = myLocationType === 'hq' ? 'command' : 'unit';

  const pendingIncoming = myIncomingTransfers.filter(t => t.status === 'sent');
  const receivedIncoming = myIncomingTransfers.filter(t => t.status === 'received');

  const CATEGORY_LABELS: Record<string, string> = {
    'Senior Officer': 'Офицер', 'Officer': 'Офицер', 'Sergeant': 'Ахлагч', 'Conscript': 'Хугацаат цэрэг', 'Contract': 'Гэрээт цэрэг'
  };

  const filteredHoldings = useMemo(() => {
    if (!categoryFilter) return myHoldings;
    return myHoldings.filter(h => {
      const item = uniformById(h.uniformId);
      return item ? categoriesForUniform(item).includes(categoryFilter) : false;
    });
  }, [myHoldings, categoryFilter, uniforms]);

  const handleSend = () => {
    setSendError('');
    if (!sendForm.uniformId || !sendForm.size || !sendForm.toId || sendForm.quantity <= 0) {
      setSendError('Бүх талбарыг бөглөнө үү.');
      return;
    }
    const ok = sendSupply({
      uniformId: sendForm.uniformId,
      size: sendForm.size,
      quantity: sendForm.quantity,
      toType,
      toId: sendForm.toId
    });
    if (!ok) {
      setSendError('Нөөц хүрэлцэхгүй байна эсвэл талбар дутуу байна.');
      return;
    }
    setSendForm({ uniformId: '', size: '', quantity: 1, toId: '' });
  };

  const levelLabel = myLocationType === 'hq' ? 'ЗХЖШ төв агуулах' : myLocationType === 'command' ? 'Командлалын агуулах' : 'Ангийн агуулах';

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-foam-600 hover:text-foam-300 text-xs transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Ангилал руу буцах
        </button>
      )}
      <div>
        <h1 className="text-lg font-bold text-foam-100">{levelLabel}</h1>
        <p className="text-xs text-foam-600 mt-0.5">{session.displayName}</p>
      </div>

      {/* Pending incoming transfers to receive */}
      {pendingIncoming.length > 0 && (
        <div className="bg-teal-900 border border-foam-300/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Inbox className="w-4 h-4 text-foam-300" />
            <h2 className="text-sm font-semibold text-foam-100">Хүлээн авах ирсэн хувцас ({pendingIncoming.length})</h2>
          </div>
          <div className="space-y-2">
            {pendingIncoming.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-teal-950 border border-teal-800 rounded-xl px-4 py-3">
                <div>
                  <div className="text-sm text-foam-100">{t.uniformNameMn} — [{t.size}] x{t.quantity}</div>
                  <div className="text-[11px] text-foam-600 mt-0.5">{t.fromLabel}-с илгээв • {t.transferNo} • {t.sentDate}</div>
                </div>
                <button
                  onClick={() => receiveSupply(t.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-foam-300 text-teal-950 font-semibold text-xs hover:bg-foam-200 transition"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" /> Хүлээн авах
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current stock */}
      <div className="bg-teal-900 border border-teal-700 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-foam-300" />
            <h2 className="text-sm font-semibold text-foam-100">Агуулахын үлдэгдэл</h2>
          </div>
          {categoryFilter && (
            <button
              onClick={() => setCategoryFilter(undefined)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-foam-300/15 border border-foam-300/40 text-foam-200 text-[11px] font-semibold"
            >
              {CATEGORY_LABELS[categoryFilter] || categoryFilter} <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {filteredHoldings.length === 0 && <div className="text-xs text-foam-600 py-4">Одоогоор нөөц бүртгэгдээгүй байна.</div>}
        {filteredHoldings.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-foam-600 border-b border-teal-800">
                  <th className="py-2 pr-3 font-medium">Загвар</th>
                  <th className="py-2 pr-3 font-medium">Размер</th>
                  <th className="py-2 pr-3 font-medium text-right">Үлдэгдэл</th>
                </tr>
              </thead>
              <tbody>
                {filteredHoldings.map(h => {
                  const item = uniformById(h.uniformId);
                  return (
                    <tr key={h.id} className="border-b border-teal-850">
                      <td className="py-2 pr-3 text-foam-100">{item?.nameMn || h.uniformId}</td>
                      <td className="py-2 pr-3 text-foam-500">{h.size}</td>
                      <td className="py-2 pr-3 text-right font-mono text-foam-200">{h.quantity}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Send supply down to children (HQ -> Командлал, or Командлал -> Анги) */}
      {myLocationType !== 'unit' && (
        <div className="bg-teal-900 border border-teal-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Send className="w-4 h-4 text-foam-300" />
            <h2 className="text-sm font-semibold text-foam-100">
              {myLocationType === 'hq' ? 'Командлалд хувцас илгээх' : 'Ангид хувцас илгээх'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={sendForm.uniformId}
              onChange={e => setSendForm({ ...sendForm, uniformId: e.target.value, size: '' })}
              className="bg-teal-950 border border-teal-700 rounded-xl px-3 py-2 text-xs text-foam-100"
            >
              <option value="">Загвар сонгох...</option>
              {uniforms.map(u => <option key={u.id} value={u.id}>{u.nameMn}</option>)}
            </select>
            <select
              value={sendForm.size}
              onChange={e => setSendForm({ ...sendForm, size: e.target.value })}
              disabled={!selectedUniform}
              className="bg-teal-950 border border-teal-700 rounded-xl px-3 py-2 text-xs text-foam-100 disabled:opacity-50"
            >
              <option value="">Размер сонгох...</option>
              {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={sendForm.toId}
              onChange={e => setSendForm({ ...sendForm, toId: e.target.value })}
              className="bg-teal-950 border border-teal-700 rounded-xl px-3 py-2 text-xs text-foam-100"
            >
              <option value="">{myLocationType === 'hq' ? 'Командлал сонгох...' : 'Анги сонгох...'}</option>
              {sendTargets.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <input
              type="number"
              min={1}
              value={sendForm.quantity}
              onChange={e => setSendForm({ ...sendForm, quantity: parseInt(e.target.value) || 1 })}
              className="bg-teal-950 border border-teal-700 rounded-xl px-3 py-2 text-xs text-foam-100"
              placeholder="Тоо ширхэг"
            />
          </div>
          {sendError && <div className="text-rose-400 text-xs mt-2">{sendError}</div>}
          <button
            onClick={handleSend}
            className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foam-300 text-teal-950 font-semibold text-xs hover:bg-foam-200 transition"
          >
            <Send className="w-3.5 h-3.5" /> Илгээх
          </button>
        </div>
      )}

      {/* History of received transfers */}
      {receivedIncoming.length > 0 && (
        <div className="bg-teal-900 border border-teal-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-foam-300" />
            <h2 className="text-sm font-semibold text-foam-100">Хүлээн авсан түүх</h2>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {receivedIncoming.map(t => (
              <div key={t.id} className="flex items-center justify-between text-xs py-1.5 border-b border-teal-850">
                <span className="text-foam-200">{t.uniformNameMn} [{t.size}] x{t.quantity}</span>
                <span className="text-foam-600">{t.fromLabel} • {t.receivedDate}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
