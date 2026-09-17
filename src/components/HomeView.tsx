import React, { useState } from 'react';
import { useUniformData } from '../context/UniformDataContext';
import { Command, Department } from '../types';
import { X, LogIn } from 'lucide-react';

import hqLogo from '../assets/logos/hq.jpeg';
import groundForcesLogo from '../assets/logos/ground-forces.svg';
import specialForcesLogo from '../assets/logos/special-forces.jpeg';
import airForceLogo from '../assets/logos/air-force.webp';
import constructionLogo from '../assets/logos/construction.jpeg';
import cyberSecurityLogo from '../assets/logos/cyber-security.webp';

interface HomeViewProps {
  onSelectUnit: (deptId: string, hintUsername: string) => void;
  onGoHQ: () => void;
  onSelectCommand: (hintUsername: string) => void;
}

// The official crest for each Командлал, matched by its id.
const COMMAND_LOGOS: Record<string, string> = {
  'cmd-01': groundForcesLogo,
  'cmd-02': specialForcesLogo,
  'cmd-03': airForceLogo,
  'cmd-04': constructionLogo,
  'cmd-05': cyberSecurityLogo,
  'cmd-06': hqLogo
};

function logoForCommand(command: Command) {
  return COMMAND_LOGOS[command.id];
}

export const HomeView: React.FC<HomeViewProps> = ({ onSelectUnit, onGoHQ, onSelectCommand }) => {
  const { commands, departments } = useUniformData();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedUnit, setSelectedUnit] = useState<Department | null>(null);

  const toggleCommand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const unitsFor = (commandId: string) =>
    departments
      .filter(d => d.commandId === commandId)
      .sort((a, b) => {
        const numA = parseInt(a.code.replace(/\D/g, ''), 10);
        const numB = parseInt(b.code.replace(/\D/g, ''), 10);
        return numA - numB;
      });

  const n = Math.max(commands.length, 1);
  const segment = 100; // viewBox units per branch
  const viewW = segment * n;
  const trunkX = viewW / 2;

  return (
    <div className="animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* ЗХЖШ logo */}
      <div className="flex justify-center">
        <button
          onClick={onGoHQ}
          title="ЗХЖШ — Төв агуулах"
          className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-lg shadow-foam-500/20 ring-4 ring-foam-300/40 hover:ring-foam-300 transition"
        >
          <img src={hqLogo} alt="ЗХЖШ" className="w-full h-full object-cover" />
        </button>
      </div>

      {/* Branching connectors: ЗХЖШ fans out to each Командлал */}
      <svg
        viewBox={`0 0 ${viewW} 100`}
        preserveAspectRatio="none"
        className="w-full h-20 sm:h-24"
        style={{ filter: 'drop-shadow(0 0 6px rgba(57,255,136,0.55))' }}
      >
        {commands.map((cmd, i) => {
          const endX = segment * i + segment / 2;
          const d = `M ${trunkX} 0 C ${trunkX} 45, ${endX} 45, ${endX} 100`;
          return (
            <path
              key={cmd.id}
              d={d}
              fill="none"
              stroke="var(--color-foam-300)"
              strokeWidth={5}
              strokeLinecap="round"
              className="flow-path"
            />
          );
        })}
      </svg>

      {/* Командлал row — evenly spaced to line up with the branch endpoints above */}
      <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {commands.map((cmd) => {
          const logo = logoForCommand(cmd);
          const isOpen = expanded.has(cmd.id);
          const units = unitsFor(cmd.id);

          return (
            <div key={cmd.id} className="flex flex-col items-center px-1">
              <button
                onClick={() => toggleCommand(cmd.id)}
                title={cmd.nameMn}
                className={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden shadow-md transition ring-4 ${
                  isOpen ? 'ring-foam-300' : 'ring-teal-700 hover:ring-foam-400'
                }`}
              >
                <img src={logo} alt={cmd.nameMn} className="w-full h-full object-cover" />
              </button>

              <button
                onClick={() => onSelectCommand(cmd.code)}
                className="mt-1.5 flex items-center gap-1 text-[10px] text-foam-600 hover:text-foam-300 transition"
              >
                <LogIn className="w-3 h-3" /> Нэвтрэх
              </button>

              {/* Units (Анги) — collapse/expand */}
              {isOpen && units.length > 0 && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="w-px h-3 bg-teal-700 mx-auto" />
                  <div className="flex flex-wrap justify-center gap-3 p-3 rounded-2xl bg-teal-900/60 border border-teal-800 max-w-[240px]">
                    {units.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUnit(u)}
                        title={u.nameMn}
                        className="flex flex-col items-center gap-1 flex-shrink-0 group"
                      >
                        <span className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-white/10 group-hover:ring-foam-300 transition">
                          <img src={logo} alt={u.nameMn} className="w-full h-full object-cover" />
                        </span>
                        <span className="text-[9.5px] font-mono font-bold text-foam-200 leading-none">
                          {u.shortName?.replace('-р анги', '') || u.code.replace('ЗХ-', '')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unit info popup — shown when an Анги logo is clicked */}
      {selectedUnit && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedUnit(null)}
        >
          <div
            className="bg-teal-900 border border-teal-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-teal-800">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-white/10 flex-shrink-0">
                  <img
                    src={logoForCommand(commands.find(c => c.id === selectedUnit.commandId) || commands[0])}
                    alt={selectedUnit.nameMn}
                    className="w-full h-full object-cover"
                  />
                </span>
                <div>
                  <div className="text-foam-100 font-semibold text-sm">{selectedUnit.code}</div>
                  <div className="text-foam-500 text-[11px]">{selectedUnit.shortName}</div>
                </div>
              </div>
              <button onClick={() => setSelectedUnit(null)} className="p-1 rounded-lg hover:bg-teal-800 transition">
                <X className="w-4 h-4 text-foam-500" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 text-sm">
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-foam-600 mb-0.5">Ангийн нэр</div>
                <div className="text-foam-100">{selectedUnit.nameMn}</div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => {
                  const unit = selectedUnit;
                  onSelectUnit(unit.id, unit.code.replace('ЗХ-', ''));
                  setSelectedUnit(null);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-foam-300 text-teal-950 font-semibold text-sm hover:bg-foam-200 transition"
              >
                <LogIn className="w-4 h-4" /> Нэвтрэх
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
