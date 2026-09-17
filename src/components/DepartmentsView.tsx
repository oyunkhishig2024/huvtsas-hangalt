import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  Shield, 
  ClipboardList, 
  BarChart3, 
  MapPin, 
  Phone, 
  Plus, 
  Search, 
  ArrowUpRight,
  Sparkles,
  Layers,
  FileText,
  Printer,
  Download,
  Award,
  ChevronDown,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useUniformData } from '../context/UniformDataContext';
import { Department } from '../types';
import { DepartmentReportModal } from './DepartmentReportModal';

interface DepartmentsViewProps {
  onSelectDepartmentFilter: (deptId: string) => void;
}

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({ onSelectDepartmentFilter }) => {
  const { 
    departments, 
    personnel, 
    distributions, 
    uniforms, 
    currentRole, 
    language,
    allCommands,
    addDepartment
  } = useUniformData();

  const [searchTerm, setSearchTerm] = useState('');
  const [commandFilter, setCommandFilter] = useState<string>('all');
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportDept, setSelectedReportDept] = useState<Department | null>(null);

  // Open PDF / Print report for specific military unit or consolidated for all units
  const handleOpenReportModal = (dept: Department | null = null) => {
    setSelectedReportDept(dept);
    setIsReportModalOpen(true);
  };

  // New Army Unit Form
  const [newDeptForm, setNewDeptForm] = useState({
    code: 'ЗХ-016',
    nameMn: 'Зэвсэгт хүчний 016 дугаар анги',
    nameEn: '016th Mechanized Brigade of AFM',
    unitTypeMn: 'Механикжуулсан тусгай бригад',
    type: 'Armed Forces',
    headOfficer: 'Хурандаа Т.Болд',
    contactPhone: '+976 7011-0016',
    location: 'Төв аймаг, Сэргэлэн сум',
    colorBadge: '#19392B',
    commandId: allCommands[0]?.id || ''
  });

  const deptStats = useMemo(() => {
    const now = new Date();
    const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return departments.map(dept => {
      const deptPersonnel = personnel.filter(p => p.departmentId === dept.id || p.departmentName === dept.nameMn);
      const personnelIds = deptPersonnel.map(p => p.id);
      const deptDistributions = distributions.filter(d => 
        (personnelIds.includes(d.personnelId) || d.departmentName === dept.nameMn) && d.status === 'Issued'
      );

      // Expiring distributions
      const expiringItems = deptDistributions.filter(d => {
        const expDate = new Date(d.expiryDate);
        const expTime = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate()).getTime();
        const days = Math.ceil((expTime - todayTime) / (1000 * 60 * 60 * 24));
        return days <= 30 && days >= 0;
      });

      const totalBudgetEstMNT = deptDistributions.reduce((acc, d) => {
        const u = uniforms.find(item => item.id === d.uniformId);
        return acc + (u?.unitPriceMNT || 250000);
      }, 0);

      // Fulfillment rate estimation
      const totalTargetUniforms = Math.max(1, deptPersonnel.length * 3); // 3 essential uniforms per soldier
      const fulfillmentPct = Math.min(100, Math.round((deptDistributions.length / totalTargetUniforms) * 100));

      return {
        ...dept,
        personnelCount: deptPersonnel.length,
        activeIssuedCount: deptDistributions.length,
        totalBudgetEstMNT,
        fulfillmentPct,
        personnelList: deptPersonnel,
        expiringItemsCount: expiringItems.length
      };
    });
  }, [departments, personnel, distributions, uniforms]);

  const filteredDepts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return deptStats.filter(d => {
      if (commandFilter !== 'all' && d.commandId !== commandFilter) return false;
      if (!term) return true;
      return (
        d.nameMn.toLowerCase().includes(term) ||
        d.nameEn.toLowerCase().includes(term) ||
        d.code.toLowerCase().includes(term) ||
        d.shortName?.toLowerCase().includes(term) ||
        (d.unitTypeMn && d.unitTypeMn.toLowerCase().includes(term)) ||
        d.headOfficer.toLowerCase().includes(term) ||
        d.location.toLowerCase().includes(term)
      );
    });
  }, [deptStats, searchTerm, commandFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-teal-900/90 p-5 rounded-2xl border border-teal-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foam-50 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-foam-300" />
              {language === 'mn' ? 'Зэвсэгт хүчний анги, салбарууд' : 'Armed Forces Military Units'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-800 text-foam-200 border border-teal-700">
              {departments.length} {language === 'mn' ? 'цэргийн анги' : 'units'}
            </span>
          </div>
          <p className="text-xs text-foam-500 mt-1">
            {language === 'mn' 
              ? '40 ангийн дүрэмт хувцасны нөөц, хуваарилалт, цэргийн албан хаагчдын эд хангалтын тайлан.' 
              : 'Mongolian Armed Forces active military units, uniform stock, and troop logistics readiness.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Print Department Report Button (Global / Consolidated) */}
          <button
            id="btn-print-dept-report"
            onClick={() => handleOpenReportModal(null)}
            className="px-3.5 py-2 rounded-xl bg-foam-300/10 hover:bg-foam-300/20 text-foam-200 border border-foam-300/30 hover:border-foam-300/60 font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-1.5 cursor-pointer"
            title="Open print-friendly summary view of current stock levels and distribution needs for all Armed Forces units"
          >
            <Printer className="w-4 h-4 text-foam-300" />
            <span>{language === 'mn' ? 'Салбарын тайлан' : 'Print Report'}</span>
          </button>

          <button
            id="btn-consolidated-pdf"
            onClick={() => handleOpenReportModal(null)}
            className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-750 text-foam-300 border border-foam-300/30 hover:border-foam-300/60 font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-1.5 cursor-pointer"
            title="Export consolidated report for all military units as PDF"
          >
            <FileText className="w-4 h-4" />
            <span>PDF</span>
          </button>

          {currentRole === 'System Admin' && (
            <button
              id="btn-add-unit"
              onClick={() => setIsAddDeptModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-foam-400 hover:bg-foam-300 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {language === 'mn' ? 'Цэргийн анги нэмэх' : 'Add Military Unit'}
            </button>
          )}
        </div>
      </div>

      {/* Quick Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foam-500" />
          <input
            type="text"
            placeholder={language === 'mn' ? 'Ангийн нэр, дугаар (032, 013, 084...), захирагч, байршлаар хайх...' : 'Search by unit name, code (032, 013, 084...), commanding officer, location...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-teal-900/90 border border-teal-800 focus:border-foam-300 text-xs sm:text-sm text-foam-100 placeholder-foam-600 outline-none transition"
          />
        </div>
        {allCommands.length > 1 && (
          <select
            value={commandFilter}
            onChange={(e) => setCommandFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-teal-900/90 border border-teal-800 text-xs sm:text-sm text-foam-100 outline-none"
          >
            <option value="all">{language === 'mn' ? 'Бүх командлал' : 'All Commands'}</option>
            {allCommands.map(c => (
              <option key={c.id} value={c.id}>{c.nameMn}</option>
            ))}
          </select>
        )}
      </div>

      {/* Army Units Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDepts.map((dept) => (
          <div
            key={dept.id}
            id={`unit-card-${dept.id}`}
            className="bg-teal-900/90 border border-teal-800 hover:border-teal-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition hover:-translate-y-0.5 group"
          >
            <div>
              {/* Header Badge & Unit Info */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs text-white shadow-md ring-1 ring-white/10 shrink-0" 
                    style={{ backgroundColor: dept.badgeHex || '#19392B' }}
                  >
                    {dept.shortName || dept.code.replace('ЗХ-', '')}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-foam-300 uppercase tracking-wider">
                        {dept.code}
                      </span>
                      {dept.unitTypeMn && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-800 text-foam-200 border border-teal-700">
                          {dept.unitTypeMn}
                        </span>
                      )}
                      {allCommands.find(c => c.id === dept.commandId) && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-800/70 text-foam-500 border border-teal-700">
                          {allCommands.find(c => c.id === dept.commandId)?.nameMn}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <h3 className="font-bold text-foam-50 text-sm sm:text-base group-hover:text-foam-200 transition">
                        {language === 'mn' ? dept.nameMn : dept.nameEn}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meta details */}
              <div className="mt-3 space-y-1.5 text-xs text-foam-500">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-foam-300 shrink-0" />
                  <span>{language === 'mn' ? 'Ангийн захирагч:' : 'Commanding Officer:'}</span>{' '}
                  <strong className="text-foam-100">{dept.headOfficer}</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{dept.location}</span>
                </div>
              </div>

              {/* Stats & Fulfillment Box */}
              <div className="mt-4 p-3 rounded-xl bg-teal-950/70 border border-teal-800/80 space-y-2.5">
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-foam-600">{language === 'mn' ? 'Бүртгэлтэй цэрэг' : 'Troops'}</div>
                    <div className="font-mono font-bold text-base text-blue-300 mt-0.5">
                      {dept.personnelCount} <span className="text-[10px] font-normal text-foam-500">{language === 'mn' ? 'албан хаагч' : 'soldiers'}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-foam-600">{language === 'mn' ? 'Олгогдсон хувцас' : 'Active Items'}</div>
                    <div className="font-mono font-bold text-base text-foam-300 mt-0.5">
                      {dept.activeIssuedCount} <span className="text-[10px] font-normal text-foam-500">{language === 'mn' ? 'ком' : 'items'}</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-foam-500 mb-1">
                    <span>{language === 'mn' ? 'Хангалтын түвшин' : 'Readiness'}</span>
                    <span className="font-mono font-bold text-foam-300">{dept.fulfillmentPct}%</span>
                  </div>
                  <div className="w-full bg-teal-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-foam-300 h-full rounded-full transition-all duration-500"
                      style={{ width: `${dept.fulfillmentPct}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Footer with Print Department Report button */}
            <div className="mt-4 pt-3 border-t border-teal-800 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-foam-500">
                {language === 'mn' ? 'Эд хөрөнгийн дүн:' : 'Valuation:'} ₮{(dept.totalBudgetEstMNT / 1000000).toFixed(1)}M
              </span>

              <div className="flex items-center gap-1.5">
                {/* Print Department Report Button */}
                <button
                  id={`btn-print-report-${dept.id}`}
                  onClick={() => handleOpenReportModal(dept)}
                  className="px-2.5 py-1.5 rounded-xl bg-foam-300/10 hover:bg-foam-300/20 text-foam-200 border border-foam-300/30 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  title={language === 'mn' ? `${dept.nameMn}-ийн эд хангалтын тайлан хэвлэх` : `Print stock & distribution report for ${dept.nameEn}`}
                >
                  <Printer className="w-3.5 h-3.5 text-foam-300" />
                  <span>{language === 'mn' ? 'Салбарын тайлан' : 'Print Report'}</span>
                </button>

                <button
                  id={`btn-pdf-${dept.id}`}
                  onClick={() => handleOpenReportModal(dept)}
                  className="px-2.5 py-1.5 rounded-xl bg-foam-300/10 hover:bg-foam-300/20 text-foam-200 border border-foam-300/30 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  title={language === 'mn' ? `${dept.nameMn}-ийн хангалтын тайланг PDF татах` : `Export ${dept.nameEn} report as PDF`}
                >
                  <FileText className="w-3.5 h-3.5 text-foam-300" />
                  <span>PDF</span>
                </button>

                <button
                  id={`btn-filter-ledger-${dept.id}`}
                  onClick={() => onSelectDepartmentFilter(dept.id)}
                  className="px-2 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-750 text-foam-100 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  title={language === 'mn' ? 'Энэ ангийн олголтын журнал шүүх' : 'Filter Ledger for this unit'}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: Add Army Unit */}
      {isAddDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-teal-900 border border-teal-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-teal-800">
              <h3 className="font-bold text-base text-foam-50 flex items-center gap-2">
                <Plus className="w-5 h-5 text-foam-300" />
                {language === 'mn' ? 'Шинэ цэргийн анги бүртгэх' : 'Register Military Unit'}
              </h3>
              <button
                onClick={() => setIsAddDeptModalOpen(false)}
                className="p-1 rounded-lg text-foam-500 hover:text-foam-100 bg-teal-800"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addDepartment({
                  code: newDeptForm.code,
                  nameMn: newDeptForm.nameMn,
                  nameEn: newDeptForm.nameEn,
                  shortName: newDeptForm.nameMn.split(' ')[2] ? `${newDeptForm.nameMn.split(' ')[2]}-р анги` : newDeptForm.code,
                  unitTypeMn: newDeptForm.unitTypeMn,
                  type: newDeptForm.type,
                  commandId: newDeptForm.commandId,
                  color: 'emerald',
                  badgeHex: newDeptForm.colorBadge,
                  personnelCount: 0,
                  headOfficer: newDeptForm.headOfficer,
                  location: newDeptForm.location,
                  contactPhone: newDeptForm.contactPhone
                });
                setIsAddDeptModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-foam-200 font-semibold mb-1">
                  {language === 'mn' ? 'Харьяалагдах командлал:' : 'Parent Command:'}
                </label>
                <select
                  required
                  value={newDeptForm.commandId}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, commandId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100"
                >
                  {allCommands.map(c => (
                    <option key={c.id} value={c.id}>{c.nameMn}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-foam-200 font-semibold mb-1">
                  {language === 'mn' ? 'Ангийн код / Дугаар:' : 'Unit Code:'}
                </label>
                <input
                  type="text"
                  required
                  value={newDeptForm.code}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 font-mono"
                  placeholder="ЗХ-016"
                />
              </div>

              <div>
                <label className="block text-foam-200 font-semibold mb-1">
                  {language === 'mn' ? 'Ангийн бүтэн нэр (Монгол):' : 'Full Name (Mongolian):'}
                </label>
                <input
                  type="text"
                  required
                  value={newDeptForm.nameMn}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, nameMn: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100"
                  placeholder="Зэвсэгт хүчний 016 дугаар анги"
                />
              </div>

              <div>
                <label className="block text-foam-200 font-semibold mb-1">
                  {language === 'mn' ? 'Ангийн төрөл / Зориулалт:' : 'Unit Specialization:'}
                </label>
                <input
                  type="text"
                  value={newDeptForm.unitTypeMn}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, unitTypeMn: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100"
                  placeholder="Механикжуулсан бригад"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-foam-200 font-semibold mb-1">
                    {language === 'mn' ? 'Захирагч:' : 'Commanding Officer:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newDeptForm.headOfficer}
                    onChange={(e) => setNewDeptForm({ ...newDeptForm, headOfficer: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100"
                    placeholder="Хурандаа Т.Болд"
                  />
                </div>
                <div>
                  <label className="block text-foam-200 font-semibold mb-1">
                    {language === 'mn' ? 'Байршил:' : 'Location:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newDeptForm.location}
                    onChange={(e) => setNewDeptForm({ ...newDeptForm, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100"
                    placeholder="Төв аймаг, Сэргэлэн"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-teal-800">
                <button
                  type="button"
                  onClick={() => setIsAddDeptModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-teal-800 text-foam-200 font-medium"
                >
                  {language === 'mn' ? 'Цуцлах' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-foam-400 hover:bg-foam-300 text-white font-bold"
                >
                  {language === 'mn' ? 'Бүртгэх' : 'Save Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Printable & Exportable Department Report Modal */}
      {isReportModalOpen && (
        <DepartmentReportModal
          selectedDepartment={selectedReportDept}
          departments={departments}
          personnel={personnel}
          distributions={distributions}
          uniforms={uniforms}
          language={language}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  );
};

