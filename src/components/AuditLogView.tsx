import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Download, 
  ShieldCheck, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  UserCheck, 
  RefreshCw, 
  ArrowLeftRight, 
  PackageCheck,
  Calendar,
  Layers,
  Users,
  ClipboardList
} from 'lucide-react';
import { useUniformData } from '../context/UniformDataContext';
import { AuditLog } from '../types';

export const AuditLogView: React.FC = () => {
  const { auditLogs, currentRole, language } = useUniformData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = 
        log.details.toLowerCase().includes(searchLower) ||
        log.actor.toLowerCase().includes(searchLower) ||
        log.actionMn.toLowerCase().includes(searchLower) ||
        log.actionEn.toLowerCase().includes(searchLower) ||
        log.role.toLowerCase().includes(searchLower);

      if (!matchSearch) return false;
      if (selectedCategoryFilter !== 'all' && log.category !== selectedCategoryFilter) return false;

      return true;
    });
  }, [auditLogs, searchTerm, selectedCategoryFilter]);

  const handleExportCSV = () => {
    const headers = ['Дугаар', 'Огноо, цаг', 'Гүйцэтгэсэн', 'Албан тушаал', 'Ангилал', 'Үйлдэл', 'Дэлгэрэнгүй'];
    const rows = filteredLogs.map(l => [
      l.id,
      l.timestamp,
      `"${l.actor}"`,
      l.role,
      l.category,
      `"${l.actionMn}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `military_uniform_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryBadge = (category: AuditLog['category']) => {
    switch (category) {
      case 'DISTRIBUTION':
        return <span className="px-2 py-0.5 rounded bg-foam-300/20 text-foam-200 border border-foam-300/30 font-mono text-[10px] font-bold">DISTRIBUTION</span>;
      case 'EXCHANGE':
        return <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-[10px] font-bold">EXCHANGE</span>;
      case 'INVENTORY':
        return <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono text-[10px] font-bold">INVENTORY</span>;
      case 'PERSONNEL':
        return <span className="px-2 py-0.5 rounded bg-foam-300/20 text-foam-200 border border-foam-300/30 font-mono text-[10px] font-bold">PERSONNEL</span>;
      case 'SYSTEM':
      default:
        return <span className="px-2 py-0.5 rounded bg-teal-700 text-foam-200 font-mono text-[10px] font-bold">SYSTEM</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-teal-900/90 p-5 rounded-2xl border border-teal-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foam-50 flex items-center gap-2">
              <History className="w-5 h-5 text-foam-300" />
              {language === 'mn' ? 'Аудит, хяналт шалгалтын цахим бүртгэл' : 'Audit Logs & Regulatory Compliance'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-800 text-foam-200 border border-teal-700">
              {filteredLogs.length} {language === 'mn' ? 'бүртгэл' : 'events'}
            </span>
          </div>
          <p className="text-xs text-foam-500 mt-1">
            {language === 'mn' 
              ? 'Зэвсэгт хүчний ангиудын хувцас олголт, размер солих, нөөцийн тохируулга, албан хаагчийн хөдөлгөөний баталгаажсан түүх.' 
              : 'Immutable regulatory audit trail recording all issuances, exchanges, restocks, and profile modifications across Army units.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-foam-300/15 text-foam-200 border border-foam-300/30 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-foam-300" />
            <span>{language === 'mn' ? 'Зарлиг 141 нийцэл баталгаажсан' : 'Decree 141 Compliant'}</span>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-750 text-foam-100 text-xs font-bold transition flex items-center gap-1.5 border border-teal-700 shadow cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {language === 'mn' ? 'CSV татах' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-teal-900/80 p-4 rounded-2xl border border-teal-800">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foam-500" />
          <input
            type="text"
            placeholder={language === 'mn' ? 'Үйлдэл, офицерын нэр, албан тушаал, тайлбараар хайх...' : 'Search by action, actor, role, details...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-teal-950/80 border border-teal-800 focus:border-foam-300 text-xs sm:text-sm text-foam-100 placeholder-foam-600 outline-none transition"
          />
        </div>

        <select
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-teal-950 border border-teal-800 text-xs text-foam-200 outline-none focus:border-foam-300 cursor-pointer"
        >
          <option value="all">{language === 'mn' ? 'Бүх ангилал' : 'All Categories'}</option>
          <option value="DISTRIBUTION">{language === 'mn' ? 'Олголт (DISTRIBUTION)' : 'Distribution'}</option>
          <option value="EXCHANGE">{language === 'mn' ? 'Размер солилт (EXCHANGE)' : 'Exchange'}</option>
          <option value="INVENTORY">{language === 'mn' ? 'Агуулах нөөц (INVENTORY)' : 'Inventory'}</option>
          <option value="PERSONNEL">{language === 'mn' ? 'Цэргийн бүртгэл (PERSONNEL)' : 'Personnel'}</option>
          <option value="SYSTEM">{language === 'mn' ? 'Систем (SYSTEM)' : 'System'}</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-teal-900/90 border border-teal-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-teal-950/80 border-b border-teal-800 text-foam-500 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4">{language === 'mn' ? 'Хугацаа' : 'Timestamp'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Ангилал' : 'Category'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Үйлдэл' : 'Action'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Гүйцэтгэсэн ажилтан / Эрх' : 'Performed By & Role'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Дэлгэрэнгүй мэдээлэл' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-800/60 font-mono text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-teal-800/40 transition">
                  <td className="py-3.5 px-4 text-foam-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getCategoryBadge(log.category)}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap font-sans font-semibold text-foam-100">
                    {language === 'mn' ? log.actionMn : log.actionEn}
                  </td>

                  <td className="py-3.5 px-4 font-sans whitespace-nowrap">
                    <div className="font-semibold text-foam-100">{log.actor}</div>
                    <div className="text-[10px] text-foam-300 font-mono">{log.role}</div>
                  </td>

                  <td className="py-3.5 px-4 font-sans text-foam-200 leading-relaxed max-w-md">
                    {log.details}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-foam-600 font-sans text-xs">
                    {language === 'mn' ? 'Тохирох аудитын бүртгэл олдсонгүй.' : 'No matching audit records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
