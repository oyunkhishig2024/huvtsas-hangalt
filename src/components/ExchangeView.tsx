import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Calendar, 
  User, 
  RotateCcw, 
  FileText, 
  X, 
  Info,
  ShieldAlert
} from 'lucide-react';
import { useUniformData } from '../context/UniformDataContext';
import { DistributionRecord, ExchangeRecord } from '../types';

interface ExchangeViewProps {
  initialDistributionRecord?: DistributionRecord | null;
  isExchangeModalOpen: boolean;
  setIsExchangeModalOpen: (open: boolean) => void;
  onOpenPrintSlip: (distRecord: DistributionRecord) => void;
}

export const ExchangeView: React.FC<ExchangeViewProps> = ({
  initialDistributionRecord,
  isExchangeModalOpen,
  setIsExchangeModalOpen,
  onOpenPrintSlip
}) => {
  const { 
    distributions, 
    exchanges, 
    uniforms, 
    currentRole, 
    language,
    exchangeUniform 
  } = useUniformData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReasonFilter, setSelectedReasonFilter] = useState('all');

  // Active Issuances eligible for exchange
  const activeDistributions = useMemo(() => {
    return distributions.filter(d => d.status === 'Issued');
  }, [distributions]);

  // Form State
  const [targetDistributionId, setTargetDistributionId] = useState<string>(
    initialDistributionRecord?.id || (activeDistributions[0]?.id || '')
  );
  const [selectedNewSize, setSelectedNewSize] = useState<string>('');
  const [reason, setReason] = useState<ExchangeRecord['reason']>('Size Mismatch');
  const [exchangeNotes, setExchangeNotes] = useState('');
  const [returnOldItemToStock, setReturnOldItemToStock] = useState(true);

  // Sync if initialDistributionRecord changes
  React.useEffect(() => {
    if (initialDistributionRecord) {
      setTargetDistributionId(initialDistributionRecord.id);
    }
  }, [initialDistributionRecord]);

  const targetDistribution = useMemo(() => {
    return distributions.find(d => d.id === targetDistributionId);
  }, [distributions, targetDistributionId]);

  const targetUniform = useMemo(() => {
    if (!targetDistribution) return null;
    return uniforms.find(u => u.id === targetDistribution.uniformId);
  }, [uniforms, targetDistribution]);

  // Auto-set selectedNewSize when target uniform changes
  React.useEffect(() => {
    if (targetUniform && targetDistribution) {
      const otherSizes = Object.keys(targetUniform.sizeStock).filter(s => s !== targetDistribution.size);
      if (otherSizes.length > 0) {
        setSelectedNewSize(otherSizes[0]);
      }
    }
  }, [targetUniform, targetDistribution]);

  const filteredExchanges = useMemo(() => {
    return exchanges.filter(e => {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = 
        e.exchangeNo.toLowerCase().includes(searchLower) ||
        e.personnelName.toLowerCase().includes(searchLower) ||
        e.personnelMilitaryId.toLowerCase().includes(searchLower) ||
        e.uniformName.toLowerCase().includes(searchLower);

      if (!matchSearch) return false;
      if (selectedReasonFilter !== 'all' && e.reason !== selectedReasonFilter) return false;

      return true;
    });
  }, [exchanges, searchTerm, selectedReasonFilter]);

  const handleExecuteExchange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDistribution) {
      alert(language === 'mn' ? 'Солилцоо хийх олголтын бүртгэлийг сонгоно уу.' : 'Select an active distribution record.');
      return;
    }
    if (!selectedNewSize) {
      alert(language === 'mn' ? 'Шинэ размер сонгоно уу.' : 'Select new size.');
      return;
    }

    const res = exchangeUniform({
      originalDistributionId: targetDistribution.id,
      newSize: selectedNewSize,
      reason,
      notes: exchangeNotes,
      returnToStock: returnOldItemToStock
    });

    if (res.success && res.newRecord) {
      setIsExchangeModalOpen(false);
      if (window.confirm(language === 'mn' ? 'Размер амжилттай солигдож, хугацааг +1 жилээр шинэчлэн тооцов! Шинэ олголтын баримтыг хэвлэх үү?' : 'Exchange completed and lifecycle reset by +1 year! Print new voucher?')) {
        onOpenPrintSlip(res.newRecord);
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
              <ArrowLeftRight className="w-5 h-5 text-purple-400" />
              {language === 'mn' ? 'Размер солих & Нөхөн олголтын удирдлага' : 'Size Exchange & Swap Handling'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-800 text-purple-300 border border-teal-700">
              {filteredExchanges.length} {language === 'mn' ? 'солилцоо' : 'exchanges'}
            </span>
          </div>
          <p className="text-xs text-foam-500 mt-1">
            {language === 'mn' 
              ? 'Албан хаагчийн хувцасны размер таараагүй тохиолдолд шинэ хэмжээгээр сольж, эдэлгээний 1 жилийн хугацааг шинэчлэн тооцож, агуулахын үлдэгдлийг автоматаар тохируулна.' 
              : 'Handles size swaps, resets expiry dates to +1 year, auto-adjusts warehouse stock, and logs audit records.'}
          </p>
        </div>

        {currentRole !== 'Дарга' && (
          <button
            id="btn-new-exchange"
            onClick={() => setIsExchangeModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {language === 'mn' ? 'Размер солих бүртгэл' : 'New Size Exchange'}
          </button>
        )}
      </div>

      {/* Analytics Banner for Logistics Officers */}
      <div className="bg-purple-950/20 border border-purple-800/40 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-xs sm:text-sm text-purple-200">
              {language === 'mn' ? 'Хангамжийн захиалгын ухаалаг төлөвлөлт (Size Intelligence)' : 'Procurement Size Demand Forecasting'}
            </h4>
            <p className="text-[11px] text-foam-500 mt-0.5">
              {language === 'mn' 
                ? 'Хамгийн их солигдсон размерууд: 48-3 → 50-4 (32%), Гутал 41 → 42 (28%). Ирэх улирлын захиалгад 50-4 болон 42 размерийн хувийг 15% нэмэгдүүлэх зөвлөмжтэй.' 
                : 'Most frequent swaps: 48-3 to 50-4 (+32%), Shoes 41 to 42 (+28%). System recommends increasing 50-4 stock allocation for the upcoming procurement cycle.'}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 font-mono font-bold text-xs border border-purple-500/40 shrink-0">
          +1 Year Expiry Reset
        </span>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-teal-900/80 p-4 rounded-2xl border border-teal-800">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foam-500" />
          <input
            type="text"
            placeholder={language === 'mn' ? 'Солилцооны № (EXC-..), албан хаагчийн нэр, цэргийн бүртгэлээр хайх...' : 'Search by Exchange No, soldier name, military ID...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-teal-950/80 border border-teal-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-xs sm:text-sm text-foam-100 placeholder-foam-600 outline-none transition"
          />
        </div>

        <select
          value={selectedReasonFilter}
          onChange={(e) => setSelectedReasonFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-teal-950 border border-teal-800 text-xs text-foam-200 outline-none focus:border-purple-500 cursor-pointer"
        >
          <option value="all">{language === 'mn' ? 'Бүх шалтгаан (Шүүлт)' : 'All Swap Reasons'}</option>
          <option value="Size Mismatch">{language === 'mn' ? 'Размер таараагүй' : 'Size Mismatch'}</option>
          <option value="Damaged/Defective">{language === 'mn' ? 'Гэмтэлтэй / Чанарын доголдол' : 'Damaged / Defective'}</option>
          <option value="Seasonal Transition">{language === 'mn' ? 'Улирлын шилжилт' : 'Seasonal Transition'}</option>
          <option value="Rank Promotion">{language === 'mn' ? 'Цол ахисан' : 'Rank Promotion'}</option>
          <option value="Department Transfer">{language === 'mn' ? 'Анги салбар шилжсэн' : 'Department Transfer'}</option>
        </select>
      </div>

      {/* Exchanges Table */}
      <div className="bg-teal-900/90 border border-teal-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-teal-950/80 border-b border-teal-800 text-foam-500 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4">{language === 'mn' ? 'Солилцооны №' : 'Exchange No'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Цэргийн албан хаагч' : 'Soldier Name'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Дүрэмт хувцасны загвар' : 'Uniform Item'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Размерийн шилжилт' : 'Size Swap'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Шалтгаан' : 'Reason'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Огноо' : 'Date'}</th>
                <th className="py-3.5 px-4">{language === 'mn' ? 'Хариуцсан офицер' : 'Officer'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-800/60">
              {filteredExchanges.map((exc) => (
                <tr key={exc.id} className="hover:bg-teal-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-purple-300 whitespace-nowrap">
                    {exc.exchangeNo}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-foam-100">{exc.personnelName}</div>
                    <div className="text-[11px] text-foam-500 font-mono">{exc.personnelMilitaryId} • {exc.departmentName}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-foam-100">
                      <span className="font-mono text-[11px] text-foam-300 font-bold mr-1.5">[{exc.uniformModelCode}]</span>
                      {exc.uniformName}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-950 border border-teal-800">
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono font-bold text-xs">
                        {exc.oldSize}
                      </span>
                      <span className="text-foam-600">→</span>
                      <span className="px-1.5 py-0.2 rounded bg-foam-300/20 text-foam-200 font-mono font-bold text-xs">
                        {exc.newSize}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-teal-800 text-foam-200">
                      {exc.reason}
                    </span>
                    {exc.notes && (
                      <p className="text-[11px] text-foam-600 mt-1 italic line-clamp-1">{exc.notes}</p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-foam-200 whitespace-nowrap">
                    {exc.exchangeDate}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-foam-500">
                    {exc.handledByOfficer}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredExchanges.length === 0 && (
          <div className="text-center py-12 text-foam-600 text-xs sm:text-sm">
            {language === 'mn' ? 'Одоогоор размер солилцооны түүх бүртгэгдээгүй байна.' : 'No size exchanges recorded.'}
          </div>
        )}
      </div>

      {/* MODAL: Execute Uniform Exchange */}
      {isExchangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-teal-900 border border-teal-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-teal-800">
              <h3 className="font-bold text-base text-foam-50 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-purple-400" />
                {language === 'mn' ? 'Дүрэмт хувцасны размер солих бүртгэл' : 'Uniform Size Swap & Re-issuance'}
              </h3>
              <button
                onClick={() => setIsExchangeModalOpen(false)}
                className="p-1 rounded-lg text-foam-500 hover:text-foam-100 bg-teal-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteExchange} className="space-y-4 text-xs sm:text-sm">
              {/* Step 1: Select Active Issuance */}
              <div>
                <label className="block text-xs font-semibold text-foam-200 mb-1">
                  1. {language === 'mn' ? 'Солилцоо хийх олголтын бүртгэлийг сонгох' : 'Select Active Distribution'}
                </label>
                <select
                  value={targetDistributionId}
                  onChange={(e) => setTargetDistributionId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 font-medium outline-none focus:border-purple-500 cursor-pointer"
                >
                  {activeDistributions.map(d => (
                    <option key={d.id} value={d.id}>
                      [{d.distributionNo}] {d.personnelName} - {d.uniformNameMn} (Одоогийн размер: {d.size})
                    </option>
                  ))}
                </select>
              </div>

              {targetDistribution && targetUniform && (
                <div className="p-3.5 bg-teal-950 rounded-xl border border-teal-800 space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-teal-800">
                    <div>
                      <span className="text-foam-500">{language === 'mn' ? 'Албан хаагч:' : 'Soldier:'}</span>{' '}
                      <strong className="text-foam-100">{targetDistribution.personnelName}</strong>
                    </div>
                    <div>
                      <span className="text-foam-500">{language === 'mn' ? 'Хуучин размер:' : 'Current Size:'}</span>{' '}
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                        {targetDistribution.size}
                      </span>
                    </div>
                  </div>

                  {/* Step 2: Reason for Exchange */}
                  <div>
                    <label className="block text-xs font-semibold text-foam-200 mb-1">
                      2. {language === 'mn' ? 'Солилцооны үндэслэл / Шалтгаан:' : 'Exchange Reason:'}
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-teal-900 border border-teal-800 text-foam-100 outline-none focus:border-purple-500"
                    >
                      <option value="Size Mismatch">{language === 'mn' ? 'Размер таараагүй (Биед бариу / томдсон)' : 'Size Mismatch (Tight / Loose)'}</option>
                      <option value="Damaged/Defective">{language === 'mn' ? 'Гэмтэлтэй / Чанарын доголдолтой' : 'Damaged / Defective'}</option>
                      <option value="Seasonal Transition">{language === 'mn' ? 'Улирлын шилжилт' : 'Seasonal Transition'}</option>
                      <option value="Rank Promotion">{language === 'mn' ? 'Цол ахисан тул' : 'Rank Promotion'}</option>
                      <option value="Department Transfer">{language === 'mn' ? 'Өөр салбар ангид шилжсэн' : 'Department Transfer'}</option>
                    </select>
                  </div>

                  {/* Step 3: Choose New Size from Warehouse */}
                  <div>
                    <label className="block text-xs font-semibold text-foam-200 mb-1.5">
                      3. {language === 'mn' ? 'Шинээр олгох размер сонгох (Агуулахын үлдэгдэл):' : 'Select New Available Size:'}
                    </label>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {Object.entries(targetUniform.sizeStock).map(([sKey, sCount]) => {
                        const isCurrentSize = sKey === targetDistribution.size;
                        const isSelected = selectedNewSize === sKey;

                        return (
                          <button
                            type="button"
                            key={sKey}
                            disabled={isCurrentSize || sCount === 0}
                            onClick={() => setSelectedNewSize(sKey)}
                            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                              isCurrentSize
                                ? 'bg-teal-900/40 border-teal-800 text-teal-600 cursor-not-allowed'
                                : sCount === 0
                                ? 'bg-teal-950 border-teal-800 opacity-40 cursor-not-allowed text-teal-600'
                                : isSelected
                                ? 'bg-purple-600 text-white border-purple-400 font-bold shadow-md ring-2 ring-purple-400/30'
                                : 'bg-teal-900 border-teal-750 text-foam-100 hover:border-purple-500/50'
                            }`}
                          >
                            <span className="font-mono text-xs sm:text-sm font-bold">
                              {sKey}
                              {isCurrentSize && <span className="text-[9px] block text-foam-600">({language === 'mn' ? 'одоогийн' : 'current'})</span>}
                            </span>
                            {!isCurrentSize && (
                              <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-purple-100 font-semibold' : 'text-foam-500'}`}>
                                {sCount} {language === 'mn' ? 'ш' : 'avail'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stock return checkbox */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2 text-xs text-foam-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={returnOldItemToStock}
                        onChange={(e) => setReturnOldItemToStock(e.target.checked)}
                        className="rounded border-teal-700 bg-teal-900 text-purple-600 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <span>
                        {language === 'mn' 
                          ? `Хуучин хэмжээтэй (${targetDistribution.size}) хувцсыг агуулахын нөөцөд +1 нэмж буцаан авах` 
                          : `Restock the returned uniform (${targetDistribution.size}) back to warehouse stock (+1)`}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foam-500 mb-1">
                  {language === 'mn' ? 'Солилцооны тэмдэглэл / Офицерын дүгнэлт' : 'Officer Notes / Comments'}
                </label>
                <textarea
                  rows={2}
                  value={exchangeNotes}
                  onChange={(e) => setExchangeNotes(e.target.value)}
                  placeholder="Хэмжээ таараагүй тул хангалтаас сольж олгов..."
                  className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 outline-none text-xs"
                />
              </div>

              {/* Automatic lifecycle reminder */}
              <div className="p-2.5 rounded-xl bg-foam-300/10 border border-foam-300/20 text-[11px] text-foam-200 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-foam-300 mt-0.5" />
                <span>
                  {language === 'mn' 
                    ? 'Анхаар: Солилцоо хийгдсэнээр хуучин олголт "Сольсон" төлөвт шилжиж, шинэ размерийн хувьд эдэлгээний 1 жилийн хугацаа эхнээсээ тооцогдоно.' 
                    : 'Note: System will mark the previous issuance as Exchanged and reset the uniform expiry lifecycle to +1 full year for the new size.'}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-teal-800">
                <button
                  type="button"
                  onClick={() => setIsExchangeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-750 text-foam-200 text-xs font-medium"
                >
                  {language === 'mn' ? 'Болих' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition"
                >
                  {language === 'mn' ? 'Солилцоог батлах (+1 жил сунгах)' : 'Execute Swap & Reset Expiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
