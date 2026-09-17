import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Shield, Lock, User, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { useUniformData } from '../context/UniformDataContext';
import { DEMO_CREDENTIALS, DEMO_PASSWORD, findCredential, DemoCredential } from '../data/credentials';

interface LoginViewProps {
  hintUsername?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ hintUsername, onSuccess, onCancel }) => {
  const { setSession } = useUniformData();
  const reduceMotion = useReducedMotion();
  const [username, setUsername] = useState(hintUsername || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(true);

  const attemptLogin = (u: string, p: string) => {
    const match = findCredential(u, p);
    if (!match) {
      setError('Хэрэглэгчийн нэр эсвэл нууц үг буруу байна.');
      return;
    }
    setError('');
    setSession(match.session);
    onSuccess();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attemptLogin(username, password);
  };

  // Clicking a row in the demo list fills the form AND logs in immediately — one click.
  const quickLogin = (c: DemoCredential) => {
    setUsername(c.username);
    setPassword(DEMO_PASSWORD);
    attemptLogin(c.username, DEMO_PASSWORD);
  };

  const hqList = DEMO_CREDENTIALS.filter((c) => c.level === 'hq');
  const commandList = DEMO_CREDENTIALS.filter((c) => c.level === 'command');
  const unitList = DEMO_CREDENTIALS.filter((c) => c.level === 'unit');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-teal-950">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <button onClick={onCancel} className="flex items-center gap-1.5 text-foam-600 hover:text-foam-300 text-xs mb-6 transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Нүүр хуудас руу буцах
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="relative flex items-center justify-center mb-3">
            {!reduceMotion && (
              <motion.span
                aria-hidden
                className="absolute h-14 w-14 rounded-full border-2 border-foam-300/50"
                animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <div className="relative w-14 h-14 rounded-full bg-teal-900 border border-teal-700 flex items-center justify-center">
              <Shield className="w-6 h-6 text-foam-300" />
            </div>
          </div>
          <div className="text-foam-100 font-semibold text-lg">Системд нэвтрэх</div>
          <div className="text-foam-600 text-xs mt-1">UDMS — Дүрэмт хувцасны удирдлагын систем</div>
        </div>

        <form onSubmit={handleSubmit} className="bg-teal-900 border border-teal-700 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-foam-600 mb-1.5">Хэрэглэгчийн нэр</label>
            <div className="flex items-center gap-2 bg-teal-950 border border-teal-700 rounded-xl px-3 py-2.5">
              <User className="w-4 h-4 text-foam-600 flex-shrink-0" />
              <input
                autoFocus
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder="жишээ нь: ЗХЖШ, ХЗЦК, 014"
                className="bg-transparent outline-none text-sm text-foam-100 placeholder-foam-600/60 w-full"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] uppercase tracking-wider text-foam-600">Нууц үг</label>
              <span className="text-[11px] text-foam-500">
                Демо нууц үг: <code className="text-foam-300 font-mono font-bold">{DEMO_PASSWORD}</code>
              </span>
            </div>
            <div className="flex items-center gap-2 bg-teal-950 border border-teal-700 rounded-xl px-3 py-2.5">
              <Lock className="w-4 h-4 text-foam-600 flex-shrink-0" />
              <input
                type="text"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder={DEMO_PASSWORD}
                className="bg-transparent outline-none text-sm text-foam-100 placeholder-foam-600/60 w-full font-mono"
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-rose-400 text-xs"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-foam-300 text-teal-950 font-semibold text-sm hover:bg-foam-200 transition"
          >
            Нэвтрэх
          </button>
        </form>

        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-center gap-1.5 text-foam-600 hover:text-foam-300 text-xs mt-5 transition"
        >
          Демо данснууд — дараад шууд нэвтэрнэ {showHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showHelp && (
          <div className="mt-3 bg-teal-900 border border-teal-700 rounded-2xl p-4 max-h-64 overflow-y-auto text-xs space-y-3">
            <div>
              <div className="text-foam-600 uppercase tracking-wider text-[10px] mb-1">ЗХЖШ</div>
              {hqList.map((c) => (
                <button
                  key={c.username}
                  type="button"
                  onClick={() => quickLogin(c)}
                  className="w-full flex justify-between py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-teal-800 transition text-left"
                >
                  <span className="font-mono text-foam-200 font-semibold">{c.username}</span>
                  <span className="text-foam-600 truncate ml-3">{c.labelMn}</span>
                </button>
              ))}
            </div>

            <div>
              <div className="text-foam-600 uppercase tracking-wider text-[10px] mb-1">Командлал (6)</div>
              {commandList.map((c) => (
                <button
                  key={c.username}
                  type="button"
                  onClick={() => quickLogin(c)}
                  className="w-full flex justify-between py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-teal-800 transition text-left"
                >
                  <span className="font-mono text-foam-200 font-semibold">{c.username}</span>
                  <span className="text-foam-600 truncate ml-3">{c.labelMn}</span>
                </button>
              ))}
            </div>

            <div>
              <div className="text-foam-600 uppercase tracking-wider text-[10px] mb-1">Анги (43)</div>
              {unitList.map((c) => (
                <button
                  key={c.username}
                  type="button"
                  onClick={() => quickLogin(c)}
                  className="w-full flex justify-between py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-teal-800 transition text-left"
                >
                  <span className="font-mono text-foam-200 font-semibold">{c.username}</span>
                  <span className="text-foam-600 truncate ml-3">{c.labelMn}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
