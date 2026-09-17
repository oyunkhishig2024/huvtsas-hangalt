import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Building2, 
  FileText, 
  Printer, 
  Download, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  Shield, 
  Filter, 
  Layers, 
  Calendar, 
  Users,
  ChevronDown,
  Sparkles,
  Loader2,
  Package,
  Boxes,
  TrendingDown,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useUniformData } from '../context/UniformDataContext';
import { Department, DistributionRecord, Personnel, UniformItem } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CategoryStat {
  count: number;
  models: Set<string>;
  budget: number;
}

interface UniformNeedAnalysis {
  uniform: UniformItem;
  deptIssuedCount: number;
  totalDeptDemand: number;
  unsuppliedCount: number;
  expiringSoonCount: number;
  totalDistributionNeed: number;
  availableWarehouseStock: number;
  stockDeficitOrSurplus: number; // positive = surplus, negative = deficit
  status: 'Adequate' | 'LowStock' | 'CriticalDeficit';
  sizeGaps: { size: string; soldierDemand: number; warehouseStock: number; gap: number }[];
}

interface DepartmentReportModalProps {
  department: Department | null; // null means consolidated all-departments report
  onClose: () => void;
  autoTriggerPrint?: boolean;
}

export const DepartmentReportModal: React.FC<DepartmentReportModalProps> = ({ 
  department, 
  onClose,
  autoTriggerPrint = false
}) => {
  const { 
    departments, 
    personnel, 
    distributions, 
    uniforms, 
    language,
    currentRole
  } = useUniformData();

  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Filter options inside report
  const [selectedDeptId, setSelectedDeptId] = useState<string>(department ? department.id : 'all');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Expiring' | 'Expired'>('ALL');
  
  // Section visibility toggles
  const [includeStockAndNeeds, setIncludeStockAndNeeds] = useState(true);
  const [includeRoster, setIncludeRoster] = useState(true);
  const [includeCategoryStats, setIncludeCategoryStats] = useState(true);
  const [includeSizeMatrix, setIncludeSizeMatrix] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);

  // Sync selectedDeptId if prop changes
  useEffect(() => {
    if (department) {
      setSelectedDeptId(department.id);
    }
  }, [department]);

  const activeDepartment = useMemo(() => {
    if (selectedDeptId === 'all') return null;
    return departments.find(d => d.id === selectedDeptId) || null;
  }, [selectedDeptId, departments]);

  // Target personnel in the selected department or all
  const targetPersonnel = useMemo(() => {
    if (!activeDepartment) return personnel;
    return personnel.filter(p => p.departmentId === activeDepartment.id || p.departmentName === activeDepartment.nameMn);
  }, [activeDepartment, personnel]);

  const targetPersonnelIds = useMemo(() => {
    return new Set(targetPersonnel.map(p => p.id));
  }, [targetPersonnel]);

  // Department's distribution records
  const deptDistributions = useMemo(() => {
    return distributions.filter(d => {
      if (activeDepartment && !targetPersonnelIds.has(d.personnelId)) {
        return false;
      }
      if (statusFilter === 'Active') {
        const daysLeft = Math.ceil((new Date(d.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        return d.status === 'Issued' && daysLeft > 30;
      }
      if (statusFilter === 'Expiring') {
        const daysLeft = Math.ceil((new Date(d.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        return d.status === 'Issued' && daysLeft >= 0 && daysLeft <= 30;
      }
      if (statusFilter === 'Expired') {
        const daysLeft = Math.ceil((new Date(d.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        return d.status === 'Expired' || daysLeft < 0;
      }
      return true;
    });
  }, [distributions, activeDepartment, targetPersonnelIds, statusFilter]);

  // Detailed Stock Levels & Distribution Needs Analysis
  const stockAndNeedsAnalysis = useMemo(() => {
    const relevantUniforms = activeDepartment
      ? uniforms.filter(u => !u.authorizedBranch || u.authorizedBranch.toLowerCase().includes(activeDepartment.code.toLowerCase()) || u.authorizedBranch.includes('Бүх') || u.authorizedBranch.includes('All'))
      : uniforms;

    const analysisList: UniformNeedAnalysis[] = relevantUniforms.map(uniform => {
      // 1. How many currently issued to this department
      const issuedToDept = deptDistributions.filter(d => d.uniformId === uniform.id && d.status === 'Issued');
      const deptIssuedCount = issuedToDept.length;

      // 2. Expiring soon in this department (<= 30 days)
      const expiringSoon = issuedToDept.filter(d => {
        const daysLeft = Math.ceil((new Date(d.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        return daysLeft >= 0 && daysLeft <= 30;
      }).length;

      // 3. Demand based on personnel count
      const totalDeptDemand = targetPersonnel.length;
      const unsuppliedCount = Math.max(0, totalDeptDemand - deptIssuedCount);
      const totalDistributionNeed = unsuppliedCount + expiringSoon;

      // 4. Warehouse stock
      const availableWarehouseStock = uniform.totalStock || Object.values(uniform.sizeStock || {}).reduce((a, b) => Number(a) + Number(b), 0);
      const stockDeficitOrSurplus = availableWarehouseStock - totalDistributionNeed;

      let status: 'Adequate' | 'LowStock' | 'CriticalDeficit' = 'Adequate';
      if (availableWarehouseStock === 0 && totalDistributionNeed > 0) {
        status = 'CriticalDeficit';
      } else if (availableWarehouseStock < totalDistributionNeed) {
        status = 'LowStock';
      }

      // 5. Size Gaps Analysis
      const soldierDemandBySize: Record<string, number> = {};
      targetPersonnel.forEach(p => {
        const sz = uniform.category === 'Footwear' 
          ? String(p.bootSize || '42') 
          : uniform.category === 'Headwear' 
          ? String(p.headCircumferenceCm || '57') 
          : (p.uniformSize || '50-4');
        
        soldierDemandBySize[sz] = (soldierDemandBySize[sz] || 0) + 1;
      });

      const sizeGaps = Object.entries(uniform.sizeStock || {}).map(([sz, stock]) => {
        const demand = soldierDemandBySize[sz] || 0;
        const numStock = Number(stock);
        const gap = numStock - demand;
        return {
          size: sz,
          soldierDemand: demand,
          warehouseStock: numStock,
          gap
        };
      });

      return {
        uniform,
        deptIssuedCount,
        totalDeptDemand,
        unsuppliedCount,
        expiringSoonCount: expiringSoon,
        totalDistributionNeed,
        availableWarehouseStock,
        stockDeficitOrSurplus,
        status,
        sizeGaps
      };
    });

    const totalNeedUnits = analysisList.reduce((acc, item) => acc + item.totalDistributionNeed, 0);
    const totalWarehouseAvailable = analysisList.reduce((acc, item) => acc + item.availableWarehouseStock, 0);
    const criticalShortageCount = analysisList.filter(item => item.status === 'CriticalDeficit' || item.status === 'LowStock').length;

    return {
      items: analysisList,
      totalNeedUnits,
      totalWarehouseAvailable,
      criticalShortageCount
    };
  }, [uniforms, deptDistributions, targetPersonnel, activeDepartment]);

  // General KPI Calculations
  const stats = useMemo(() => {
    const totalUnitsIssued = deptDistributions.length;
    
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let activeGoodCount = 0;

    deptDistributions.forEach(d => {
      const daysLeft = Math.ceil((new Date(d.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      if (d.status === 'Expired' || daysLeft < 0) {
        expiredCount++;
      } else if (daysLeft <= 30) {
        expiringSoonCount++;
      } else {
        activeGoodCount++;
      }
    });

    const totalBudgetEstMNT = deptDistributions.reduce((acc, d) => {
      const u = uniforms.find(item => item.id === d.uniformId);
      return acc + (u?.unitPriceMNT || 280000);
    }, 0);

    // Category breakdown
    const categoryCounts: Record<string, { count: number; models: Set<string>; budget: number }> = {
      Headwear: { count: 0, models: new Set(), budget: 0 },
      Outerwear: { count: 0, models: new Set(), budget: 0 },
      Innerwear: { count: 0, models: new Set(), budget: 0 },
      Footwear: { count: 0, models: new Set(), budget: 0 },
      Accessories: { count: 0, models: new Set(), budget: 0 },
      Insignia: { count: 0, models: new Set(), budget: 0 }
    };

    deptDistributions.forEach(d => {
      const cat = d.category || 'Outerwear';
      const u = uniforms.find(item => item.id === d.uniformId);
      const price = u?.unitPriceMNT || 250000;

      if (!categoryCounts[cat]) {
        categoryCounts[cat] = { count: 0, models: new Set(), budget: 0 };
      }
      categoryCounts[cat].count += 1;
      if (d.uniformModelCode) categoryCounts[cat].models.add(d.uniformModelCode);
      categoryCounts[cat].budget += price;
    });

    // Size distribution breakdown
    const sizeMap: Record<string, number> = {};
    deptDistributions.forEach(d => {
      if (d.size) {
        sizeMap[d.size] = (sizeMap[d.size] || 0) + 1;
      }
    });

    // Supply fulfillment rate (% troops with at least 1 issued uniform)
    const troopsWithUniform = new Set(deptDistributions.map(d => d.personnelId)).size;
    const fulfillmentRate = targetPersonnel.length > 0 
      ? Math.min(100, Math.round((troopsWithUniform / targetPersonnel.length) * 100)) 
      : 100;

    return {
      totalPersonnel: targetPersonnel.length,
      totalUnitsIssued,
      activeGoodCount,
      expiringSoonCount,
      expiredCount,
      totalBudgetEstMNT,
      categoryCounts,
      sizeMap,
      fulfillmentRate
    };
  }, [deptDistributions, targetPersonnel, uniforms]);

  // Current report metadata
  const reportNumber = useMemo(() => {
    const code = activeDepartment ? activeDepartment.code : 'ALL-HQ';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `REP-${code}-${dateStr}-01`;
  }, [activeDepartment]);

  const reportDateFormatted = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }, []);

  // PDF Download Handler via html2canvas & jsPDF
  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    setExportSuccess(false);

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // First Page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Subsequent pages if content overflows single A4
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Uniform_Distribution_Report_${activeDepartment ? activeDepartment.code : 'Consolidated'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert(language === 'mn' ? 'PDF үүсгэхэд алдаа гарлаа. Хэвлэх (Print) сонголтыг ашиглана уу.' : 'Failed to generate PDF. You can use the Print option.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-teal-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-teal-900 border border-teal-700 rounded-2xl max-w-5xl w-full my-auto p-4 sm:p-6 shadow-2xl space-y-4 max-h-[96vh] flex flex-col">
        
        {/* Controls Bar (Excluded from Print) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-teal-800 shrink-0 print:hidden">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-foam-50">
              <FileText className="w-5 h-5 text-foam-300" />
              <span>
                {activeDepartment 
                  ? (language === 'mn' ? `[${activeDepartment.code}] ${activeDepartment.nameMn} - Нөөц ба хангалтын тайлан` : `[${activeDepartment.code}] ${activeDepartment.nameEn} - Stock & Distribution Report`)
                  : (language === 'mn' ? 'Зэвсэгт хүчний нэгдсэн хангалтын тайлан' : 'Consolidated Military Distribution Report')}
              </span>
            </div>
            <p className="text-xs text-foam-500">
              {language === 'mn' 
                ? 'Агуулахын нөөцийн түвшин ба одоогийн хангалтын хэрэгцээний хэвлэх хувилбар (Монгол Улсын Ерөнхийлөгчийн 141-р зарлиг)' 
                : 'Print-friendly summary of current stock levels, distribution needs, and size shortages under Decree 141.'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-foam-300 hover:bg-foam-300 text-teal-950 font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              title="Open browser print dialog"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'mn' ? 'Тайлан хэвлэх (Print)' : 'Print Department Report'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 rounded-xl bg-foam-400 hover:bg-foam-300 disabled:bg-foam-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'mn' ? 'PDF үүсгэж байна...' : 'Generating PDF...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{language === 'mn' ? 'PDF татах' : 'Download PDF'}</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-foam-500 hover:text-foam-100 bg-teal-800 hover:bg-teal-750 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter & Customization Toolbar (Excluded from Print) */}
        <div className="bg-teal-950/80 p-3 rounded-xl border border-teal-800/90 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            {/* Department Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-foam-500 font-medium">{language === 'mn' ? 'Салбар сонгох:' : 'Department:'}</span>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-teal-900 border border-teal-700 text-foam-100 font-semibold outline-none focus:border-foam-300 text-xs"
              >
                <option value="all">{language === 'mn' ? '★ Бүх салбар ангиуд (Нэгдсэн тайлан)' : '★ All Departments (Consolidated)'}</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    [{d.code}] {language === 'mn' ? d.nameMn : d.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-foam-500 font-medium">{language === 'mn' ? 'Төлөв:' : 'Status:'}</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg bg-teal-900 border border-teal-700 text-foam-100 font-semibold outline-none focus:border-foam-300 text-xs"
              >
                <option value="ALL">{language === 'mn' ? 'Бүх олголт' : 'All Distributions'}</option>
                <option value="Active">{language === 'mn' ? 'Хүчинтэй (>30 хоног)' : 'Active (>30 days)'}</option>
                <option value="Expiring">{language === 'mn' ? 'Хугацаа дуусах дөхсөн (≤30)' : 'Expiring Soon (≤30d)'}</option>
                <option value="Expired">{language === 'mn' ? 'Хугацаа дууссан' : 'Expired'}</option>
              </select>
            </div>
          </div>

          {/* Section Toggles */}
          <div className="flex flex-wrap items-center gap-3 text-foam-200">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white font-semibold text-foam-300">
              <input
                type="checkbox"
                checked={includeStockAndNeeds}
                onChange={(e) => setIncludeStockAndNeeds(e.target.checked)}
                className="rounded border-teal-700 text-foam-300 focus:ring-0 bg-teal-900"
              />
              <span>{language === 'mn' ? 'Нөөц ба хэрэгцээ' : 'Stock & Needs Summary'}</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={includeRoster}
                onChange={(e) => setIncludeRoster(e.target.checked)}
                className="rounded border-teal-700 text-foam-300 focus:ring-0 bg-teal-900"
              />
              <span>{language === 'mn' ? 'Албан хаагчдын жагсаалт' : 'Troop Roster'}</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={includeCategoryStats}
                onChange={(e) => setIncludeCategoryStats(e.target.checked)}
                className="rounded border-teal-700 text-foam-300 focus:ring-0 bg-teal-900"
              />
              <span>{language === 'mn' ? 'Ангиллын задаргаа' : 'Category Breakdown'}</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={includeSizeMatrix}
                onChange={(e) => setIncludeSizeMatrix(e.target.checked)}
                className="rounded border-teal-700 text-foam-300 focus:ring-0 bg-teal-900"
              />
              <span>{language === 'mn' ? 'Размерын матриц' : 'Size Matrix'}</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="rounded border-teal-700 text-foam-300 focus:ring-0 bg-teal-900"
              />
              <span>{language === 'mn' ? 'Баталгаажуулалт' : 'Sign-off'}</span>
            </label>
          </div>
        </div>

        {exportSuccess && (
          <div className="p-2.5 rounded-xl bg-foam-300/20 border border-foam-300/40 text-foam-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in shrink-0">
            <CheckCircle className="w-4 h-4 text-foam-300" />
            <span>{language === 'mn' ? 'PDF тайлан амжилттай татагдлаа!' : 'PDF report generated and downloaded successfully!'}</span>
          </div>
        )}

        {/* Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto pr-1 bg-teal-950/40 rounded-xl p-2 border border-teal-800">
          
          {/* ========================================================================= */}
          {/* OFFICIAL MILITARY REPORT DOCUMENT (White Background for Printing / PDF)   */}
          {/* ========================================================================= */}
          <div
            ref={reportRef}
            id="department-report-print-canvas"
            className="bg-white text-teal-900 p-8 sm:p-10 rounded-xl border border-foam-200 shadow-2xl font-sans space-y-6 max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none print:max-w-none"
            style={{ minHeight: '1120px' }}
          >
            {/* Header / State Military Emblem */}
            <div className="border-b-2 border-teal-900 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-teal-950 text-foam-300 flex flex-col items-center justify-center font-bold shadow-md shrink-0 border border-foam-300/40">
                    <span className="text-xl">★</span>
                    <span className="text-[8px] tracking-widest uppercase font-mono text-foam-200">MOD</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold tracking-wider uppercase text-teal-700">
                      МОНГОЛ УЛСЫН БАТЛАН ХАМГААЛАХЫН САЛБАР
                    </h3>
                    <h1 className="text-lg sm:text-xl font-extrabold uppercase text-teal-950 tracking-tight">
                      {activeDepartment 
                        ? `${activeDepartment.nameMn.toUpperCase()} - АГУУЛАХЫН НӨӨЦ БА ХАНГАЛТЫН ТАЙЛАН` 
                        : 'ЗЭВСЭГТ ХҮЧНИЙ НЭГДСЭН НӨӨЦ БА ХАНГАЛТЫН ТАЙЛАН'}
                    </h1>
                    <p className="text-[11px] text-teal-600 font-medium mt-0.5">
                      Монгол Улсын Ерөнхийлөгчийн 141 дүгээр зарлиг "Цэргийн дүрэмт хувцас өмсөх дүрэм, эдэлгээний норм"-ын дагуу
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-teal-600 shrink-0">
                  <div className="bg-foam-50 px-3 py-1 rounded border border-foam-200 font-bold text-teal-900">
                    {reportNumber}
                  </div>
                  <div className="text-[10px] mt-1 text-foam-600">
                    {reportDateFormatted}
                  </div>
                </div>
              </div>
            </div>

            {/* Department Dossier Card */}
            <div className="bg-foam-50 p-4 rounded-xl border border-foam-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-foam-600 block text-[10px] uppercase font-bold tracking-wider">Салбар анги / Бүтэц:</span>
                <strong className="text-teal-900 text-sm font-bold">
                  {activeDepartment ? activeDepartment.nameMn : 'Зэвсэгт хүчний нийт бүрэлдэхүүн'}
                </strong>
                <div className="text-teal-600 text-[11px] font-mono mt-0.5">
                  Код: {activeDepartment ? activeDepartment.code : 'HQ-ALL'} • {activeDepartment?.type || 'Armed Forces HQ'}
                </div>
              </div>

              <div>
                <span className="text-foam-600 block text-[10px] uppercase font-bold tracking-wider">Хариуцсан дарга / Захирагч:</span>
                <strong className="text-teal-900 text-sm font-bold">
                  {activeDepartment?.headOfficer || 'Хурандаа генерал Б.Ганзориг'}
                </strong>
                <div className="text-teal-600 text-[11px] mt-0.5">
                  Байршил: {activeDepartment?.location || 'Улаанбаатар хот'}
                </div>
              </div>

              <div>
                <span className="text-foam-600 block text-[10px] uppercase font-bold tracking-wider">Албан хаагчийн тоо:</span>
                <strong className="text-teal-900 text-sm font-bold">
                  {stats.totalPersonnel} цэргийн албан хаагч
                </strong>
                <div className="text-foam-400 text-[11px] font-semibold mt-0.5">
                  Хангалтын түвшин: {stats.fulfillmentRate}%
                </div>
              </div>

              <div>
                <span className="text-foam-600 block text-[10px] uppercase font-bold tracking-wider">Төсвийн эргэлт (Үнэлгээ):</span>
                <strong className="text-teal-900 text-sm font-bold font-mono">
                  ₮{(stats.totalBudgetEstMNT / 1000000).toFixed(2)} сая
                </strong>
                <div className="text-teal-600 text-[11px] mt-0.5">
                  Олгосон нэгж: <strong>{stats.totalUnitsIssued}</strong> ком
                </div>
              </div>
            </div>

            {/* Key Logistics KPI Summary Badges */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-[10px] font-bold text-blue-700 uppercase">Олгогдсон дүрэмт хувцас</div>
                <div className="text-xl font-extrabold text-blue-950 font-mono mt-0.5">{stats.totalUnitsIssued}</div>
                <div className="text-[10px] text-blue-600 mt-0.5">Одоогийн эдэлгээнд</div>
              </div>

              <div className="p-3 bg-foam-50 border border-foam-100 rounded-lg">
                <div className="text-[10px] font-bold text-foam-400 uppercase">Бэлэн агуулахын нөөц</div>
                <div className="text-xl font-extrabold text-foam-500 font-mono mt-0.5">{stockAndNeedsAnalysis.totalWarehouseAvailable}</div>
                <div className="text-[10px] text-foam-400 mt-0.5">Бүх загварын нийлбэр</div>
              </div>

              <div className="p-3 bg-foam-50 border border-foam-100 rounded-lg">
                <div className="text-[10px] font-bold text-foam-500 uppercase">Шуурхай олголтын хэрэгцээ</div>
                <div className="text-xl font-extrabold text-foam-500 font-mono mt-0.5">{stockAndNeedsAnalysis.totalNeedUnits}</div>
                <div className="text-[10px] text-foam-400 mt-0.5">Хангаагүй + Солих (≤30х)</div>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <div className="text-[10px] font-bold text-rose-700 uppercase">Дутагдалтай / Захиалах загвар</div>
                <div className="text-xl font-extrabold text-rose-950 font-mono mt-0.5">{stockAndNeedsAnalysis.criticalShortageCount}</div>
                <div className="text-[10px] text-rose-600 mt-0.5">Татан авалт шаардлагатай</div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 1: CURRENT STOCK LEVELS & DISTRIBUTION NEEDS SUMMARY               */}
            {/* ========================================================================= */}
            {includeStockAndNeeds && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase text-teal-900 tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-foam-400"></span>
                    1. Агуулахын нөөцийн түвшин ба салбарын хуваарилалтын хэрэгцээний тооцоо
                  </h4>
                  <span className="text-[10px] text-foam-600 font-mono">
                    Салбарын эрэлт vs Агуулахын үлдэгдэл
                  </span>
                </div>

                <table className="w-full text-left text-xs border border-foam-200">
                  <thead className="bg-foam-50 border-b border-foam-200 text-teal-800 font-bold text-[11px]">
                    <tr>
                      <th className="p-2 border-r border-foam-200">Дүрэмт хувцасны нэр (141 Код)</th>
                      <th className="p-2 border-r border-foam-200 text-center">Салбарын нийт эрэлт</th>
                      <th className="p-2 border-r border-foam-200 text-center">Олгогдсон тоо</th>
                      <th className="p-2 border-r border-foam-200 text-center text-foam-500">Хэрэгцээ (Хангах+Солих)</th>
                      <th className="p-2 border-r border-foam-200 text-center font-bold text-teal-900">Бэлэн нөөц</th>
                      <th className="p-2 border-r border-foam-200 text-center">Зөрүү (Үлдэгдэл / Дутагдал)</th>
                      <th className="p-2 text-center">Нөөцийн төлөв</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foam-100 text-teal-700 text-[11px]">
                    {stockAndNeedsAnalysis.items.map((item) => {
                      const isSurplus = item.stockDeficitOrSurplus >= 0;
                      return (
                        <tr key={item.uniform.id} className="hover:bg-foam-50">
                          <td className="p-2 border-r border-foam-200 font-semibold text-teal-900">
                            <div>{item.uniform.nameMn}</div>
                            <div className="text-[10px] font-mono text-foam-600 font-normal">
                              Код: {item.uniform.modelCode} • {item.uniform.category}
                            </div>
                          </td>
                          <td className="p-2 text-center font-mono border-r border-foam-200">
                            {item.totalDeptDemand} албан хаагч
                          </td>
                          <td className="p-2 text-center font-mono border-r border-foam-200">
                            {item.deptIssuedCount} ком
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-foam-500 border-r border-foam-200 bg-foam-50/50">
                            {item.totalDistributionNeed} ком
                            {item.expiringSoonCount > 0 && (
                              <span className="text-[9px] block text-foam-400 font-normal">
                                ({item.expiringSoonCount} хугацаа дуусах)
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-teal-900 border-r border-foam-200 bg-foam-50">
                            {item.availableWarehouseStock} ком
                          </td>
                          <td className="p-2 text-center font-mono font-bold border-r border-foam-200">
                            {isSurplus ? (
                              <span className="text-foam-400">+{item.stockDeficitOrSurplus} (Илүүдэлтэй)</span>
                            ) : (
                              <span className="text-rose-700 font-extrabold">{item.stockDeficitOrSurplus} (Дутагдал)</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {item.status === 'Adequate' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-foam-50 text-foam-500 border border-foam-200">
                                Хүрэлцээтэй
                              </span>
                            )}
                            {item.status === 'LowStock' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-foam-50 text-foam-500 border border-foam-200">
                                Нөөц бага
                              </span>
                            )}
                            {item.status === 'CriticalDeficit' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                Дутагдалтай
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* SECTION 2: Category Breakdown Table */}
            {includeCategoryStats && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase text-teal-900 tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    2. Дүрэмт хувцасны ангилал ба төсвийн задаргаа
                  </h4>
                  <span className="text-[10px] text-foam-600 font-mono">Ангиллын тоо: 6</span>
                </div>

                <table className="w-full text-left text-xs border border-foam-200">
                  <thead className="bg-foam-50 border-b border-foam-200 text-teal-800 font-bold">
                    <tr>
                      <th className="p-2 border-r border-foam-200">Ангилал (Category)</th>
                      <th className="p-2 border-r border-foam-200">Холбогдох загварууд (Decree 141 Models)</th>
                      <th className="p-2 border-r border-foam-200 text-center">Олгогдсон тоо</th>
                      <th className="p-2 border-r border-foam-200 text-right">Эзлэх хувь</th>
                      <th className="p-2 text-right">Төсвийн дүн (MNT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foam-100 text-teal-700">
                    {(Object.entries(stats.categoryCounts) as [string, CategoryStat][]).map(([cat, data]) => {
                      const pct = stats.totalUnitsIssued > 0 
                        ? Math.round((data.count / stats.totalUnitsIssued) * 100) 
                        : 0;
                      return (
                        <tr key={cat} className="hover:bg-foam-50">
                          <td className="p-2 font-semibold border-r border-foam-200 text-teal-900">
                            {cat === 'Headwear' && 'Малгай, берет (Headwear)'}
                            {cat === 'Outerwear' && 'Гадуур дүрэмт хувцас (Outerwear)'}
                            {cat === 'Innerwear' && 'Цамц, дотуур хувцас (Innerwear)'}
                            {cat === 'Footwear' && 'Гутал, бойтог (Footwear)'}
                            {cat === 'Accessories' && 'Хэрэглэл, бүс, бээлий (Accessories)'}
                            {cat === 'Insignia' && 'Цол, ялгах тэмдэг (Insignia)'}
                          </td>
                          <td className="p-2 font-mono text-[11px] border-r border-foam-200 text-teal-600">
                            {Array.from(data.models).join(', ') || 'Стандарт 141 загвар'}
                          </td>
                          <td className="p-2 text-center font-mono font-bold border-r border-foam-200 text-teal-900">
                            {data.count} ком
                          </td>
                          <td className="p-2 text-right font-mono border-r border-foam-200">
                            {pct}%
                          </td>
                          <td className="p-2 text-right font-mono font-semibold text-teal-900">
                            ₮{data.budget.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-foam-50 font-bold text-teal-900 border-t border-foam-200">
                      <td colSpan={2} className="p-2 border-r border-foam-200 text-right uppercase">Нийт дүн:</td>
                      <td className="p-2 text-center font-mono border-r border-foam-200">{stats.totalUnitsIssued} ком</td>
                      <td className="p-2 text-right font-mono border-r border-foam-200">100%</td>
                      <td className="p-2 text-right font-mono">₮{stats.totalBudgetEstMNT.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* SECTION 3: Size Distribution Summary */}
            {includeSizeMatrix && Object.keys(stats.sizeMap).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase text-teal-900 tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  3. Салбарын албан хаагчдын размерын хуваарилалт (Дараагийн татан авалтын тооцоонд)
                </h4>
                
                <div className="p-3 bg-foam-50 rounded-lg border border-foam-200 flex flex-wrap gap-2 text-xs">
                  {Object.entries(stats.sizeMap).map(([size, count]) => (
                    <div key={size} className="px-2.5 py-1 bg-white border border-foam-200 rounded font-mono flex items-center gap-1.5 shadow-2xs">
                      <span className="font-bold text-teal-800">{size}:</span>
                      <span className="font-extrabold text-blue-700">{count} ш</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 4: Personnel Distribution Roster Table */}
            {includeRoster && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase text-teal-900 tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-foam-400"></span>
                    4. Цэргийн албан хаагчдад олгогдсон эд хангалтын нэрсийн жагсаалт
                  </h4>
                  <span className="text-[10px] text-foam-600 font-mono">Нийт бичилт: {deptDistributions.length}</span>
                </div>

                {deptDistributions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-foam-600 border border-foam-100 rounded-lg bg-foam-50">
                    Энэ шүүлтүүрт хамаарах дүрэмт хувцас олголтын бүртгэл олдсонгүй.
                  </div>
                ) : (
                  <table className="w-full text-left text-[11px] border border-foam-200">
                    <thead className="bg-foam-50 border-b border-foam-200 text-teal-800 font-bold">
                      <tr>
                        <th className="p-1.5 border-r border-foam-200 text-center w-8">№</th>
                        <th className="p-1.5 border-r border-foam-200">Цэргийн бүртгэл / Цол</th>
                        <th className="p-1.5 border-r border-foam-200">Албан хаагчийн нэр</th>
                        <th className="p-1.5 border-r border-foam-200">Дүрэмт хувцас (Загвар)</th>
                        <th className="p-1.5 border-r border-foam-200 text-center">Размер</th>
                        <th className="p-1.5 border-r border-foam-200 text-center">Олгосон</th>
                        <th className="p-1.5 border-r border-foam-200 text-center">Дуусах огноо</th>
                        <th className="p-1.5 text-center">Төлөв</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foam-100 text-teal-700">
                      {deptDistributions.map((dist, idx) => {
                        const daysLeft = Math.ceil((new Date(dist.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                        const isExpired = dist.status === 'Expired' || daysLeft < 0;
                        const isExpiring = !isExpired && daysLeft <= 30;

                        return (
                          <tr key={dist.id} className="hover:bg-foam-50">
                            <td className="p-1.5 text-center font-mono text-foam-600 border-r border-foam-200">
                              {idx + 1}
                            </td>
                            <td className="p-1.5 font-mono border-r border-foam-200">
                              <span className="font-bold text-teal-900">{dist.personnelMilitaryId}</span>
                              <div className="text-[10px] text-foam-600 font-sans">{dist.personnelRank}</div>
                            </td>
                            <td className="p-1.5 font-bold text-teal-900 border-r border-foam-200">
                              {dist.personnelName}
                            </td>
                            <td className="p-1.5 border-r border-foam-200">
                              <span className="font-semibold text-teal-800">{dist.uniformNameMn}</span>
                              <span className="font-mono text-[10px] text-foam-600 ml-1">[{dist.uniformModelCode}]</span>
                            </td>
                            <td className="p-1.5 text-center font-mono font-bold text-teal-900 border-r border-foam-200">
                              {dist.size}
                            </td>
                            <td className="p-1.5 text-center font-mono text-teal-600 border-r border-foam-200">
                              {dist.issueDate}
                            </td>
                            <td className="p-1.5 text-center font-mono font-bold border-r border-foam-200 text-teal-900">
                              {dist.expiryDate}
                            </td>
                            <td className="p-1.5 text-center">
                              {isExpired ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                  Дууссан
                                </span>
                              ) : isExpiring ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-foam-50 text-foam-500 border border-foam-200">
                                  {daysLeft} хоног
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-foam-50 text-foam-500 border border-foam-200">
                                  Хүчинтэй
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Legal & Regulatory Notes */}
            <div className="text-[10px] text-teal-600 p-3 bg-foam-50 rounded-lg border border-foam-100 space-y-1">
              <div className="font-bold text-teal-800 uppercase">Эрх зүйн үндэслэл ба журам:</div>
              <p>
                1. Цэргийн дүрэмт хувцасны эдэлгээний хугацаа олгосон өдрөөс хойш 1 жил (365 хоног) байх бөгөөд хугацаа дуусмагц дараагийн ээлжийн хувцаслалтыг хуваарийн дагуу олгоно.
              </p>
              <p>
                2. Хэмжээ солих (Size swap) үйлдлийг хангалтын офицерт албан ёсоор бүртгүүлж, агуулахын хөдөлгөөний журналд тусгана.
              </p>
              <p>
                3. Тус тайлан нь Батлан хамгаалах яамны эд хангалтын нэгдсэн системд цахим хэлбэрээр баталгаажсан болно.
              </p>
            </div>

            {/* Verification Signatures & Seal Block */}
            {includeSignatures && (
              <div className="pt-8 border-t-2 border-teal-900 grid grid-cols-3 gap-6 text-xs mt-6">
                <div>
                  <div className="font-bold text-teal-900 uppercase text-[11px]">Тайлан гаргасан хангалтын офицер:</div>
                  <div className="mt-8 border-b border-teal-900 pb-1 flex justify-between">
                    <span className="text-foam-600">Гарын үсэг:</span>
                    <span className="font-bold text-teal-900">/ Д.Мөнхбат /</span>
                  </div>
                  <div className="text-[10px] text-foam-600 mt-1">Албан тушаал: Ахлах дэслэгч</div>
                </div>

                <div>
                  <div className="font-bold text-teal-900 uppercase text-[11px]">Хянасан санхүү / тооцооны нягтлан:</div>
                  <div className="mt-8 border-b border-teal-900 pb-1 flex justify-between">
                    <span className="text-foam-600">Гарын үсэг:</span>
                    <span className="font-bold text-teal-900">/ С.Болормаа /</span>
                  </div>
                  <div className="text-[10px] text-foam-600 mt-1">Албан тушаал: Ахлах нягтлан</div>
                </div>

                <div>
                  <div className="font-bold text-teal-900 uppercase text-[11px]">Баталгаажуулсан салбарын захирагч:</div>
                  <div className="mt-8 border-b border-teal-900 pb-1 flex justify-between">
                    <span className="text-foam-600">Гарын үсэг:</span>
                    <span className="font-bold text-teal-900">
                      / {activeDepartment?.headOfficer || 'Хурандаа Д.Батболд'} /
                    </span>
                  </div>
                  <div className="text-[10px] text-foam-600 mt-1 flex justify-between">
                    <span>Тамга, тэмдэг</span>
                    <span>Огноо: {new Date().toISOString().slice(0, 10)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-teal-800 text-xs text-foam-500 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-foam-300" />
            <span>{language === 'mn' ? 'Зэвсэгт хүчний албан ёсны PDF тайлан үүсгэгч' : 'Military Uniform Logistics PDF Engine'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-foam-300/20 hover:bg-foam-300/30 text-foam-200 border border-foam-300/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'mn' ? 'Хэвлэх' : 'Print'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-foam-200 text-xs font-semibold transition cursor-pointer"
            >
              {language === 'mn' ? 'Хаах' : 'Close'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
