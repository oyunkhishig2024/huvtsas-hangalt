import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
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
  const reduceMotion = useReducedMotion();

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
    <div className="relative max-w-4xl mx-auto">
      {/* Ambient tactical backdrop — a faint grid and a slow radar sweep
          centred behind ЗХЖШ, framing the org chart as a live network. */}
      <div className="pointer-events-none absolute -inset-x-6 -top-10 -bottom-10 -z-10 overflow-hidden" aria-hidden>
        <div className="bg-tactical-grid absolute inset-0" />
        <div className="bg-radar-sweep absolute left-1/2 top-16 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-70" />
      </div>

      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-5 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.35em] text-foam-600"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-foam-300 animate-pulse" />
        Тактикийн хангамжийн сүлжээ идэвхтэй
      </motion.div>

      {/* ЗХЖШ logo */}
      <div className="relative flex justify-center">
        {!reduceMotion && (
          <motion.span
            aria-hidden
            className="absolute h-32 w-32 rounded-full border-2 border-foam-300/50 sm:h-36 sm:w-36"
            animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <motion.button
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          whileHover={reduceMotion ? undefined : { scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={onGoHQ}
          title="ЗХЖШ — Төв агуулах"
          className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-lg shadow-foam-500/20 ring-4 ring-foam-300/40 hover:ring-foam-300 transition"
        >
          <img src={hqLogo} alt="ЗХЖШ" className="w-full h-full object-cover" />
        </motion.button>
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
            <motion.path
              key={cmd.id}
              d={d}
              fill="none"
              stroke="var(--color-foam-300)"
              strokeWidth={5}
              strokeLinecap="round"
              className="flow-path"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.35 + i * 0.06 }}
            />
          );
        })}
      </svg>

      {/* Командлал row — evenly spaced to line up with the branch endpoints above */}
      <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {commands.map((cmd, i) => {
          const logo = logoForCommand(cmd);
          const isOpen = expanded.has(cmd.id);
          const units = unitsFor(cmd.id);

          return (
            <motion.div
              key={cmd.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.55 + i * 0.06 }}
              className="flex flex-col items-center px-1"
            >
              <motion.button
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => toggleCommand(cmd.id)}
                title={cmd.nameMn}
                style={isOpen ? { boxShadow: `0 0 0 3px ${cmd.badgeHex}99, 0 0 22px ${cmd.badgeHex}66` } : undefined}
                className={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden shadow-md transition ring-4 ${
                  isOpen ? 'ring-transparent' : 'ring-teal-700 hover:ring-foam-400'
                }`}
              >
                <img src={logo} alt={cmd.nameMn} className="w-full h-full object-cover" />
              </motion.button>

              <button
                onClick={() => onSelectCommand(cmd.code)}
                className="mt-1.5 flex items-center gap-1 text-[10px] text-foam-600 hover:text-foam-300 transition"
              >
                <LogIn className="w-3 h-3" /> Нэвтрэх
              </button>

              {/* Units (Анги) — collapse/expand */}
              <AnimatePresence initial={false}>
                {isOpen && units.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="mt-4 overflow-hidden"
                  >
                    <div className="w-px h-3 bg-teal-700 mx-auto" />
                    <div className="flex flex-wrap justify-center gap-3 p-3 rounded-2xl bg-teal-900/60 border border-teal-800 max-w-[240px]">
                      {units.map((u, ui) => (
                        <motion.button
                          key={u.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: ui * 0.02 }}
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
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Unit info popup — shown when an Анги logo is clicked */}
      <AnimatePresence>
        {selectedUnit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedUnit(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 4 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
