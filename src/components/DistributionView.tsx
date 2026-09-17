import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, 
  Search, 
  Plus, 
  Printer, 
  RefreshCw, 
  ArrowLeftRight, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Filter, 
  FileText,
  Paperclip,
  Check,
  Calendar,
  X
} from 'lucide-react';
import { useUniformData } from '../context/UniformDataContext';
import { DistributionRecord, UniformItem, Personnel, DistributionStatus } from '../types';

interface DistributionViewProps {
  onOpenExchangeModal: (distRecord: DistributionRecord) => void;
  onOpenPrintSlip: (distRecord: DistributionRecord) => void;
  preselectedUniform?: UniformItem | null;
  preselectedPersonnel?: Personnel | null;
  isIssueModalOpen: boolean;
  setIsIssueModalOpen: (open: boolean) => void;
}

export const DistributionView: React.FC<DistributionViewProps> = ({
  onOpenExchangeModal,
  onOpenPrintSlip,
  preselectedUniform,
  preselectedPersonnel,
  isIssueModalOpen,
  setIsIssueModalOpen
}) => {
  const { 
    distributions, 
    uniforms, 
    personnel, 
    departments, 
    currentRole, 
    language,
    issueUniform,
    renewDistribution,
    returnUniform
  } = useUniformData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');

  // Issue Form State
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>(preselectedPersonnel?.id || (personnel[0]?.id || ''));
  const [selectedUniformId, setSelectedUniformId] = useState<string>(preselectedUniform?.id || (uniforms[0]?.id || ''));
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [condition, setCondition] = useState<'Brand New' | 'Standard Issue' | 'Reserve'>('Brand New');
  const [receivedPhysically, setReceivedPhysically] = useState(true);
  const [notes, setNotes] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  // Update selected size when uniform changes
  const activeUniform = useMemo(() => {
    return uniforms.find(u => u.id === selectedUniformId) || uniforms[0];
  }, [uniforms, selectedUniformId]);

  const activePersonnel = useMemo(() => {
    return personnel.find(p => p.id === selectedPersonnelId) || personnel[0];
  }, [personnel, selectedPersonnelId]);

  // When active uniform changes, select first available size or soldier's standard size
  React.useEffect(() => {
    if (activeUniform) {
      const availableSizes = Object.keys(activeUniform.sizeStock);
      if (activePersonnel?.measurements.standardUniformSize && activeUniform.sizeStock[activePersonnel.measurements.standardUniformSize] !== undefined) {
        setSelectedSize(activePersonnel.measurements.standardUniformSize);
      } else if (availableSizes.length > 0) {
        setSelectedSize(availableSizes[0]);
      }
    }
  }, [activeUniform, activePersonnel]);

  // Handle issue date change -> auto calculate +1 year expiry
  const handleIssueDateChange = (newDateStr: string) => {
    setIssueDate(newDateStr);
    try {
      const d = new Date(newDateStr);
      if (!isNaN(d.getTime())) {
        d.setFullYear(d.getFullYear() + 1);
        setExpiryDate(d.toISOString().slice(0, 10));
      }
    } catch {
      // ignore
    }
  };

  const filteredDistributions = useMemo(() => {
    return distributions.filter(d => {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = 
        d.distributionNo.toLowerCase().includes(searchLower) ||
        d.personnelName.toLowerCase().includes(searchLower) ||
        d.personnelMilitaryId.toLowerCase().includes(searchLower) ||
        d.uniformNameMn.toLowerCase().includes(searchLower) ||
        d.uniformModelCode.toLowerCase().includes(searchLower);

      if (!matchSearch) return false;

      if (selectedStatusFilter !== 'all' && d.status !== selectedStatusFilter) return false;
      if (selectedDeptFilter !== 'all' && d.departmentName !== selectedDeptFilter) return false;

      return true;
    });
  }, [distributions, searchTerm, selectedStatusFilter, selectedDeptFilter]);

  const handleExecuteIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSize) {
      alert(language === 'mn' ? 'Размер сонгоно уу.' : 'Please select a size.');
      return;
    }

    const res = issueUniform({
      personnelId: selectedPersonnelId,
      uniformId: selectedUniformId,
      size: selectedSize,
      quantity: 1,
      issueDate,
      expiryDate,
      conditionAtIssue: condition,
      notes,
      scannedSlipName: attachmentName || undefined,
      receivedPhysically
    });

    if (res.success && res.record) {
      setIsIssueModalOpen(false);
      if (window.confirm(language === 'mn' ? 'Олголт амжилттай хийгдлээ! Цэргийн эд хангалт, дүрэмт хувцас олголтын баримтыг хэвлэх үү?' : 'Issued successfully! Print military issuance slip now?')) {
        onOpenPrintSlip(res.record);
      }
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-teal-900/90 p-5 rounded-2xl border border-teal-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foam-50 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-foam-300" />
              {language === 'mn' ? 'Хуваарилалт, олголтын бүртгэлийн дэвтэр' : 'Uniform Distribution Ledger'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-800 text-foam-200 border border-teal-700">
              {filteredDistributions.length} {language === 'mn' ? 'бүртгэл' : 'records'}
            </span>
          </div>
          <p className="text-xs text-foam-500 mt-1">
            {language === 'mn' 
              ? 'Цэргийн дүрэмт хувцас олголт, эдэлгээний хугацаа (+1 жил), хүчинтэй байдал, баримт бичгийн архив.' 
              : 'Official issuance ledger tracking uniform distributions with 1-year lifecycles and document receipts.'}
          </p>
        </div>

        {currentRole !== 'Дарга' && (
          <button
            id="btn-new-distribution"
            onClick={() => setIsIssueModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-foam-300 to-foam-400 hover:from-foam-300 text-teal-950 font-bold text-xs sm:text-sm shadow-lg shadow-foam-300/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {language === 'mn' ? 'Шинэ олголт хийх' : 'Issue Uniform'}
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-teal-900/80 p-4 rounded-2xl border border-teal-800">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foam-500" />
          <input
            type="text"
            placeholder={language === 'mn' ? 'Баримтын № (DST-..), албан хаагчийн нэр, цэргийн бүртгэл, хувцасны нэрээр хайх...' : 'Search by Slip No, Soldier name, MIL ID, uniform model...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-teal-950/80 border border-teal-800 focus:border-foam-300 focus:ring-1 focus:ring-foam-300 text-xs sm:text-sm text-foam-100 placeholder-foam-600 outline-none transition"
          />
        </div>

        <select
          value={selectedStatusFilter}
          onChange={(e) => setSelectedStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-teal-950 border border-teal-800 text-xs text-foam-200 outline-none focus:border-foam-300 cursor-pointer font-medium"
        >
          <option value="all">{language === 'mn' ? 'Бүх төлөв' : 'All Statuses'}</option>
          <option value="Issued">{language === 'mn' ? 'Олгогдсон (Хүчинтэй)' : 'Issued (Active)'}</option>
          <option value="Exchanged">{language === 'mn' ? 'Размер солигдсон' : 'Exchanged'}</option>
          <option value="Expired">{language === 'mn' ? 'Хугацаа дууссан' : 'Expired'}</option>
          <option value="Returned">{language === 'mn' ? 'Буцаан татагдсан' : 'Returned'}</option>
        </select>

        <select
          value={selectedDeptFilter}
          onChange={(e) => setSelectedDeptFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-teal-950 border border-teal-800 text-xs text-foam-200 outline-none focus:border-foam-300 cursor-pointer"
        >
          <option value="all">{language === 'mn' ? 'Бүх салбар / анги' : 'All Departments'}</option>
          {departments.map(d => (
            <option key={d.id} value={d.nameMn}>{d.nameMn}</option>
          ))}
        </select>
      </div>

      {/* Distribution Records Table */}
      <div className="bg-teal-900/90 border border-teal-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-teal-950/80 border-b border-teal-800 text-foam-500 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4">{language === 'mn' ? 'Баримтын №' : 'Slip No'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Цэргийн албан хаагч' : 'Soldier / Personnel'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Дүрэмт хувцас' : 'Uniform Item'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Размер' : 'Size'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Олгосон огноо' : 'Issue Date'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Дуусах хугацаа (+1 жил)' : 'Expiry (+1 Year)'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Төлөв' : 'Status'}</th>
                <th className="py-3.5 px-4 text-right">{language === 'mn' ? 'Үйлдлүүд' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-800/60">
              {filteredDistributions.map((record) => {
                const isExpiringSoon = record.status === 'Issued' && new Date(record.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                const isExpired = record.status === 'Issued' && new Date(record.expiryDate) < new Date();

                return (
                  <tr key={record.id} className="hover:bg-teal-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-foam-300 whitespace-nowrap">
                      {record.distributionNo}
                      {record.scannedSlipAttached && (
                        <span className="ml-1.5 inline-block text-foam-500" title={record.scannedSlipName || 'Хавсаргасан баримт бичиг'}>
                          <Paperclip className="w-3.5 h-3.5 inline text-blue-400" />
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foam-100">{record.personnelName}</div>
                      <div className="text-[11px] text-foam-500">
                        {record.personnelRank} • <span className="font-mono text-foam-600">{record.personnelMilitaryId}</span>
                      </div>
                      <div className="text-[10px] text-foam-600">{record.departmentName}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-foam-100">
                        <span className="font-mono text-[11px] text-foam-300 font-bold mr-1.5">[{record.uniformModelCode}]</span>
                        {record.uniformNameMn}
                      </div>
                      <div className="text-[11px] text-foam-500">{record.category}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-teal-950 font-mono font-bold text-foam-100 border border-teal-800">
                        {record.size}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-foam-200 whitespace-nowrap">
                      {record.issueDate}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-foam-100">{record.expiryDate}</div>
                      {record.status === 'Issued' && (
                        <div className="mt-0.5">
                          {isExpired ? (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                              {language === 'mn' ? 'Хугацаа дууссан' : 'Expired'}
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="px-1.5 py-0.2 rounded bg-foam-300/20 text-foam-200 text-[10px] font-bold animate-pulse">
                              ⏳ {language === 'mn' ? '30 хоногт дуусна' : 'Expires in <30d'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-foam-300">
                              ✓ {language === 'mn' ? 'Хүчинтэй' : 'Active'}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase ${
                        record.status === 'Issued' ? 'bg-foam-300/20 text-foam-200 border border-foam-300/30' :
                        record.status === 'Exchanged' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                        record.status === 'Expired' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        'bg-teal-700 text-foam-200'
                      }`}>
                        {record.status === 'Issued' ? (language === 'mn' ? 'Олгосон' : 'Issued') :
                         record.status === 'Exchanged' ? (language === 'mn' ? 'Сольсон' : 'Exchanged') :
                         record.status === 'Expired' ? (language === 'mn' ? 'Дууссан' : 'Expired') :
                         (language === 'mn' ? 'Буцаасан' : 'Returned')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Print Slip Button */}
                        <button
                          onClick={() => onOpenPrintSlip(record)}
                          className="p-1.5 rounded-lg bg-teal-800 hover:bg-teal-700 text-foam-200 transition"
                          title={language === 'mn' ? 'Олголтын баримт хэвлэх' : 'Print Issuance Slip'}
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Exchange Size Button (if active) */}
                        {currentRole !== 'Дарга' && record.status === 'Issued' && (
                          <button
                            onClick={() => onOpenExchangeModal(record)}
                            className="p-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 transition"
                            title={language === 'mn' ? 'Размер солих' : 'Exchange Size'}
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                          </button>
                        )}

                        {/* Renew Button */}
                        {currentRole !== 'Дарга' && (isExpiringSoon || isExpired) && (
                          <button
                            onClick={() => {
                              const res = renewDistribution(record.id);
                              alert(res.message);
                            }}
                            className="p-1.5 rounded-lg bg-foam-300/15 hover:bg-foam-300/25 border border-foam-300/30 text-foam-200 transition"
                            title={language === 'mn' ? '1 жилээр сунгаж шинэчлэх' : 'Renew for +1 Year'}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredDistributions.length === 0 && (
          <div className="text-center py-12 text-foam-600 text-xs sm:text-sm">
            {language === 'mn' ? 'Шүүлтүүрт тохирох олголтын бүртгэл олдсонгүй.' : 'No distribution records match your search.'}
          </div>
        )}
      </div>

      {/* MODAL: New Uniform Issuance Wizard */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-teal-900 border border-teal-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-teal-800">
              <h3 className="font-bold text-base text-foam-50 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-foam-300" />
                {language === 'mn' ? 'Цэргийн дүрэмт хувцас олгох бүртгэл' : 'New Uniform Issuance'}
              </h3>
              <button
                onClick={() => setIsIssueModalOpen(false)}
                className="p-1 rounded-lg text-foam-500 hover:text-foam-100 bg-teal-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteIssue} className="space-y-4 text-xs sm:text-sm">
              {/* Step 1: Select Soldier */}
              <div>
                <label className="block text-xs font-semibold text-foam-200 mb-1">
                  1. {language === 'mn' ? 'Хүлээн авагч цэргийн албан хаагч' : 'Recipient Soldier'}
                </label>
                <select
                  value={selectedPersonnelId}
                  onChange={(e) => setSelectedPersonnelId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 font-medium outline-none focus:border-foam-300 cursor-pointer"
                >
                  {personnel.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.militaryId}] {p.rankName} {p.nameMn} ({p.departmentName}) - Стандарт: {p.measurements.standardUniformSize}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Uniform Model */}
              <div>
                <label className="block text-xs font-semibold text-foam-200 mb-1">
                  2. {language === 'mn' ? 'Олгох дүрэмт хувцасны загвар (Зарлиг 141)' : 'Select Uniform Item'}
                </label>
                <select
                  value={selectedUniformId}
                  onChange={(e) => setSelectedUniformId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 font-medium outline-none focus:border-foam-300 cursor-pointer"
                >
                  {uniforms.map(u => (
                    <option key={u.id} value={u.id}>
                      [Загвар {u.modelCode}] {u.nameMn} ({u.category}) - Үлдэгдэл: {u.totalStock} ш
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 3: Size Selection with Live Stock */}
              <div className="p-3.5 bg-teal-950 rounded-xl border border-teal-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foam-200">
                    3. {language === 'mn' ? 'Олгох размер сонгох:' : 'Select Size to Issue:'}
                  </label>
                  <span className="text-[11px] text-foam-500">
                    {language === 'mn' ? 'Албан хаагчийн стандарт:' : 'Soldier standard:'} <strong className="text-foam-100 font-mono">{activePersonnel?.measurements.standardUniformSize}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                  {Object.entries(activeUniform.sizeStock).map(([sizeKey, stockCount]) => {
                    const isSelected = selectedSize === sizeKey;
                    const isSoldierMatch = activePersonnel?.measurements.standardUniformSize === sizeKey;

                    return (
                      <button
                        type="button"
                        key={sizeKey}
                        disabled={stockCount === 0}
                        onClick={() => setSelectedSize(sizeKey)}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                          stockCount === 0 
                            ? 'bg-teal-950 border-teal-800 opacity-40 cursor-not-allowed text-teal-600'
                            : isSelected
                            ? 'bg-foam-300 text-teal-950 border-foam-300 font-bold shadow-md ring-2 ring-foam-300/30'
                            : 'bg-teal-900 border-teal-750 text-foam-100 hover:border-teal-600'
                        }`}
                      >
                        <span className="font-mono text-xs sm:text-sm font-bold flex items-center gap-1">
                          {sizeKey}
                          {isSoldierMatch && <span className="text-[10px]" title="Биеийн стандартад тохирно">⭐</span>}
                        </span>
                        <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-teal-900 font-semibold' : Number(stockCount) <= 3 ? 'text-rose-400' : 'text-foam-500'}`}>
                          {stockCount} {language === 'mn' ? 'ш бэлэн' : 'left'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 4: Issue & Expiry Dates (+1 Year Auto-calculated) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foam-200 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-foam-300" />
                    {language === 'mn' ? 'Олгосон огноо:' : 'Issue Date:'}
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => handleIssueDateChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 font-mono outline-none focus:border-foam-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foam-200 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-foam-300" />
                    {language === 'mn' ? 'Дуусах хугацаа (+1 жил):' : 'Expiry Date (+1 Year):'}
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 font-mono font-bold text-foam-200 outline-none focus:border-foam-300"
                  />
                </div>
              </div>

              {/* Notes & Scanned Slip attachment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foam-500 mb-1">{language === 'mn' ? 'Хувцасны төлөв' : 'Condition'}</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 outline-none"
                  >
                    <option value="Brand New">{language === 'mn' ? 'Шинэ (Үйлдвэрийн)' : 'Brand New'}</option>
                    <option value="Standard Issue">{language === 'mn' ? 'Стандарт олголт' : 'Standard Issue'}</option>
                    <option value="Reserve">{language === 'mn' ? 'Нөөцийн сангаас' : 'Reserve Stock'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foam-500 mb-1">
                    {language === 'mn' ? 'Олголтын хэлбэр' : 'Delivery Method'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setReceivedPhysically(true)}
                      className={`px-2 py-2 rounded-xl text-xs font-semibold border transition ${
                        receivedPhysically
                          ? 'bg-foam-300/15 border-foam-300/40 text-foam-200'
                          : 'bg-teal-950 border-teal-800 text-foam-500 hover:text-foam-200'
                      }`}
                    >
                      {language === 'mn' ? 'Биет байдлаар' : 'Physical item'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceivedPhysically(false)}
                      className={`px-2 py-2 rounded-xl text-xs font-semibold border transition ${
                        !receivedPhysically
                          ? 'bg-foam-300/15 border-foam-300/40 text-foam-200'
                          : 'bg-teal-950 border-teal-800 text-foam-500 hover:text-foam-200'
                      }`}
                    >
                      {language === 'mn' ? 'Мөнгөн урамшуулал' : 'Cash compensation'}
                    </button>
                  </div>
                  {!receivedPhysically && (
                    <div className="mt-1 text-[10.5px] text-foam-500">
                      {language === 'mn'
                        ? 'Агуулахын үлдэгдлээс хасахгүй, харин 1 жилийн эргэлтийг тооцно.'
                        : "Won't deduct from warehouse stock, but still starts the 1-year cycle."}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes & Scanned Slip attachment */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-foam-500 mb-1 flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                    {language === 'mn' ? 'Хавсаргах баримтын нэр:' : 'Attach Scanned Voucher:'}
                  </label>
                  <input
                    placeholder="slip_signed_2026.pdf"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 outline-none text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foam-500 mb-1">{language === 'mn' ? 'Нэмэлт тэмдэглэл / Олгосон офицерын заалт' : 'Officer Notes'}</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="2026 оны хуваарилалтын дагуу олгосон..."
                  className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 outline-none text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-teal-800">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-750 text-foam-200 text-xs font-medium"
                >
                  {language === 'mn' ? 'Болих' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-foam-300 to-foam-400 hover:from-foam-300 text-teal-950 font-bold text-xs shadow-md transition"
                >
                  {language === 'mn' ? 'Олголтыг баталгаажуулах' : 'Confirm Issuance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
