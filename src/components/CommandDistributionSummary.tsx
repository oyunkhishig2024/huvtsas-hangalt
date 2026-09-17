import React, { useMemo } from 'react';
import { Users2, Send } from 'lucide-react';
import { useUniformData } from '../context/UniformDataContext';

export const CommandDistributionSummary: React.FC = () => {
  const { session, myLocationType, myLocationId, allCommands, allDepartments, myOutgoingTransfers } = useUniformData();

  const sendTargets = useMemo(() => {
    if (myLocationType === 'hq') return allCommands.map(c => ({ id: c.id, label: c.nameMn }));
    if (myLocationType === 'command') return allDepartments.filter(d => d.commandId === myLocationId).map(d => ({ id: d.id, label: `${d.shortName} — ${d.nameMn}` }));
    return [];
  }, [myLocationType, myLocationId, allCommands, allDepartments]);

  const givenToChildren = useMemo(() => {
    return sendTargets.map(t => {
      const transfersToThisChild = myOutgoingTransfers.filter(tr => tr.toId === t.id);
      const totalQty = transfersToThisChild.reduce((sum, tr) => sum + tr.quantity, 0);
      return { ...t, totalQty, count: transfersToThisChild.length, transfers: transfersToThisChild };
    });
  }, [sendTargets, myOutgoingTransfers]);

  const childLabel = myLocationType === 'hq' ? 'Командлал' : 'Анги';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foam-100">Хуваарилалт</h1>
        <p className="text-xs text-foam-600 mt-0.5">{session.displayName}</p>
      </div>

      <div className="bg-teal-900 border border-teal-700 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users2 className="w-4 h-4 text-foam-300" />
          <h2 className="text-sm font-semibold text-foam-100">{childLabel} тус бүрт олгосон</h2>
        </div>

        {givenToChildren.every(c => c.count === 0) && (
          <div className="text-xs text-foam-600 py-4">Одоогоор ямар ч илгээмж бүртгэгдээгүй байна.</div>
        )}

        <div className="space-y-2">
          {givenToChildren.filter(c => c.count > 0).map(c => (
            <div key={c.id} className="bg-teal-950 border border-teal-800 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foam-100">{c.label}</span>
                <span className="font-mono text-foam-300">{c.totalQty} ширхэг ({c.count} илгээмж)</span>
              </div>
              <div className="mt-2 space-y-1">
                {c.transfers.map(tr => (
                  <div key={tr.id} className="flex items-center justify-between text-[11px] text-foam-600 border-t border-teal-900 pt-1.5">
                    <span className="flex items-center gap-1">
                      <Send className="w-3 h-3" /> {tr.uniformNameMn} [{tr.size}] x{tr.quantity}
                    </span>
                    <span>{tr.status === 'received' ? '✓ Хүлээн авсан' : 'Хүлээж буй'} • {tr.sentDate}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
