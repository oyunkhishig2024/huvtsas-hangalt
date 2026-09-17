import React, { useState, useMemo } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  ShieldAlert, 
  Package, 
  Calendar, 
  Clock, 
  RefreshCw, 
  Layers, 
  Sliders, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ShoppingCart, 
  Download, 
  FileText, 
  Building2, 
  Users, 
  Zap, 
  Info,
  ChevronRight,
  Filter,
  BarChart3
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine,
  Cell
} from 'recharts';
import { UniformItem, Personnel, DistributionRecord, ExchangeRecord, Department, UniformCategory } from '../types';

interface PredictiveShortageForecastProps {
  uniforms: UniformItem[];
  personnel: Personnel[];
  distributions: DistributionRecord[];
  exchanges: ExchangeRecord[];
  departments: Department[];
  language: 'mn' | 'en';
  onNavigateTab: (tab: string) => void;
  onOpenQuickIssue: () => void;
}

export type ForecastHorizonDays = 30 | 60 | 90 | 180 | 365;
export type TurnoverSurgeLevel = 1.0 | 1.25 | 1.5 | 2.0;

export interface ItemForecastPrediction {
  uniform: UniformItem;
  currentStock: number;
  activeIssued: number;
  
  // Rate calculations
  dailyBaseDistributionRate: number;
  dailyTurnoverRate: number;
  dailyExpiryRenewalRate: number;
  totalDailyBurnRate: number;
  
  // Horizon metrics
  projectedDemand: number;
  projectedRemainingStock: number;
  
  // Shortage metrics
  daysToStockout: number; // infinity or positive number
  stockoutDate: Date | null;
  shortageQuantity: number; // >0 if projectedRemainingStock < 0
  recommendedReorderQty: number;
  estimatedReorderCostMNT: number;
  
  // Risk assessment
  riskLevel: 'critical' | 'high' | 'medium' | 'safe';
  riskScore: number; // 0-100
  urgencyReasonMn: string;
  urgencyReasonEn: string;
  
  // Size-specific risk
  criticalSizes: { size: string; stock: number; projectedDaysLeft: number }[];
}

export const PredictiveShortageForecast: React.FC<PredictiveShortageForecastProps> = ({
  uniforms,
  personnel,
  distributions,
  exchanges,
  departments,
  language,
  onNavigateTab,
  onOpenQuickIssue
}) => {
  // Configurable simulation parameters
  const [horizonDays, setHorizonDays] = useState<ForecastHorizonDays>(90);
  const [turnoverSurgeMultiplier, setTurnoverSurgeMultiplier] = useState<TurnoverSurgeLevel>(1.0);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('all');
  const [procurementLeadTimeDays, setProcurementLeadTimeDays] = useState<number>(45); // Standard military procurement lead time
  const [selectedItemForDeepDive, setSelectedItemForDeepDive] = useState<ItemForecastPrediction | null>(null);

  // Predictive algorithm execution
  const { predictions, summaryMetrics, categoryRiskDistribution, timelineProjection } = useMemo(() => {
    const now = new Date();
    const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // 1. Department-level turnover velocity
    const deptTurnoverWeights = new Map<string, number>();
    departments.forEach(dept => {
      const deptPersonnel = personnel.filter(p => p.departmentId === dept.id || p.departmentName === dept.nameMn);
      const pIds = new Set(deptPersonnel.map(p => p.id));
      const deptExchanges = exchanges.filter(e => pIds.has(e.personnelId));
      
      // Base turnover rate per person
      const baseTurnover = deptPersonnel.length > 0 ? (deptExchanges.length / deptPersonnel.length) : 0.1;
      deptTurnoverWeights.set(dept.nameMn, Math.max(0.05, baseTurnover));
    });

    // 2. Compute prediction for each uniform item
    const itemPredictions: ItemForecastPrediction[] = uniforms.map(uniform => {
      const totalStock = uniform.totalStock;
      
      // Relevant distributions for this uniform
      const itemDists = distributions.filter(d => 
        d.uniformId === uniform.id || d.uniformModelCode === uniform.modelCode
      );
      const activeIssued = itemDists.filter(d => d.status === 'Issued').length;
      
      // Calculate historical distribution velocity over past records
      const distDates = itemDists
        .map(d => new Date(d.issueDate).getTime())
        .filter(t => !isNaN(t));
      
      let daysSpan = 90;
      if (distDates.length > 1) {
        const minDate = Math.min(...distDates);
        const maxDate = Math.max(...distDates, todayTime);
        daysSpan = Math.max(30, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));
      }
      
      const baseDailyDistRate = itemDists.length / daysSpan;

      // Calculate upcoming expiries within the forecast horizon
      const horizonEndTime = todayTime + (horizonDays * 24 * 60 * 60 * 1000);
      const expiriesInHorizon = itemDists.filter(d => {
        if (d.status !== 'Issued') return false;
        const expTime = new Date(d.expiryDate).getTime();
        return expTime >= todayTime && expTime <= horizonEndTime;
      }).length;

      const dailyExpiryRate = expiriesInHorizon / horizonDays;

      // Calculate turnover & replacement demand from defect/damage/size swaps
      const itemExchanges = exchanges.filter(e => 
        e.uniformModelCode === uniform.modelCode || e.uniformName === uniform.nameMn
      );
      const baseDailyExchangeRate = (itemExchanges.length / Math.max(daysSpan, 30));
      
      // Adjust with turnover surge multiplier (e.g. seasonal troop rotation / draft surge)
      const adjustedTurnoverRate = baseDailyExchangeRate * turnoverSurgeMultiplier;

      // Seasonal sensitivity adjustment
      let seasonalMultiplier = 1.0;
      const currentMonth = now.getMonth(); // 0 = Jan, 8 = Sep, 11 = Dec
      const isWinterItem = uniform.season === 'Winter' || uniform.season === 'All-Season';
      const isSummerItem = uniform.season === 'Summer';
      
      // Winter clothing demand surges in Aug-Nov (months 7-10)
      if (isWinterItem && (currentMonth >= 7 && currentMonth <= 10)) {
        seasonalMultiplier = 1.35;
      } else if (isSummerItem && (currentMonth >= 2 && currentMonth <= 5)) {
        seasonalMultiplier = 1.30;
      }

      // Total projected daily burn rate
      const effectiveDailyBurn = Math.max(
        0.05, 
        (baseDailyDistRate * 0.4 + dailyExpiryRate * 0.4 + adjustedTurnoverRate * 0.2) * seasonalMultiplier
      );

      const totalProjectedDemand = Math.ceil(effectiveDailyBurn * horizonDays);
      const projectedRemaining = totalStock - totalProjectedDemand;

      // Days until stock reaches zero
      const rawDaysToStockout = totalStock > 0 ? totalStock / effectiveDailyBurn : 0;
      const daysToStockout = Math.round(rawDaysToStockout);

      let stockoutDate: Date | null = null;
      if (rawDaysToStockout < 365) {
        stockoutDate = new Date(todayTime + rawDaysToStockout * 24 * 60 * 60 * 1000);
      }

      // Safety buffer calculations (Procurement lead time demand + 20% safety margin)
      const leadTimeDemand = effectiveDailyBurn * procurementLeadTimeDays;
      const safetyBuffer = Math.ceil(leadTimeDemand * 0.25);
      const requiredThreshold = Math.ceil(leadTimeDemand + safetyBuffer);

      const shortageQty = projectedRemaining < 0 
        ? Math.abs(projectedRemaining) + safetyBuffer 
        : (totalStock < requiredThreshold ? requiredThreshold - totalStock : 0);

      // Recommended procurement quantity
      const recommendedReorderQty = Math.max(0, shortageQty > 0 ? Math.ceil(shortageQty * 1.15) : 0);
      const unitPrice = uniform.unitPriceMNT || 120000;
      const estimatedReorderCostMNT = recommendedReorderQty * unitPrice;

      // Risk grading:
      // CRITICAL: Stockouts before procurement lead time (< 45 days)
      // HIGH: Stockouts within the forecast horizon (< horizonDays)
      // MEDIUM: Stock will drop below safety buffer threshold
      // SAFE: Stock comfortably covers projected demand + buffer
      let riskLevel: 'critical' | 'high' | 'medium' | 'safe' = 'safe';
      let riskScore = 10;
      let reasonMn = 'Нөөц хангалттай, хомсдол үүсэх эрсдэлгүй.';
      let reasonEn = 'Adequate reserve, safe from supply bottlenecks.';

      if (totalStock === 0 || daysToStockout <= procurementLeadTimeDays) {
        riskLevel = 'critical';
        riskScore = Math.min(100, Math.round(90 + (1 - (daysToStockout / procurementLeadTimeDays)) * 10));
        reasonMn = `Хангамжийн хугацаанаас (${procurementLeadTimeDays} хоног) өмнө ${daysToStockout} хоногийн дараа нөөц бүрэн дуусна! Яаралтай татан авалт шаардлагатай.`;
        reasonEn = `Stock exhausts in ${daysToStockout} days, earlier than procurement lead time (${procurementLeadTimeDays}d)! Urgent reorder required.`;
      } else if (daysToStockout <= horizonDays) {
        riskLevel = 'high';
        riskScore = Math.min(88, Math.round(70 + (1 - (daysToStockout / horizonDays)) * 18));
        reasonMn = `Сонгосон ${horizonDays} хоногийн хугацаанд нөөц дуусах эрсдэлтэй (${daysToStockout} хоног үлдсэн).`;
        reasonEn = `Projected to stockout within the ${horizonDays}-day forecast window (${daysToStockout} days remaining).`;
      } else if (totalStock < requiredThreshold || projectedRemaining < safetyBuffer) {
        riskLevel = 'medium';
        riskScore = 55;
        reasonMn = `Аюулгүйн нөөцийн хэмжээнд (${safetyBuffer} ш) дөхөж байна. Хуваарилалт эрчимжвэл хомсдол үүсэж болзошгүй.`;
        reasonEn = `Approaching minimum military safety stock (${safetyBuffer} units). Vulnerable to sudden demand surges.`;
      }

      // Size-level bottleneck detection
      const criticalSizes: { size: string; stock: number; projectedDaysLeft: number }[] = [];
      const sizeEntries = Object.entries(uniform.sizeStock || {});
      const sizeShare = sizeEntries.length > 0 ? 1 / sizeEntries.length : 1;

      sizeEntries.forEach(([sizeKey, sizeQtyVal]) => {
        const sizeQty = Number(sizeQtyVal) || 0;
        const sizeBurn = effectiveDailyBurn * sizeShare;
        const sizeDays = sizeBurn > 0 ? Math.round(sizeQty / sizeBurn) : 999;
        if (sizeQty <= 2 || sizeDays <= procurementLeadTimeDays) {
          criticalSizes.push({
            size: sizeKey,
            stock: sizeQty,
            projectedDaysLeft: sizeDays
          });
        }
      });

      return {
        uniform,
        currentStock: totalStock,
        activeIssued,
        dailyBaseDistributionRate: Number(baseDailyDistRate.toFixed(2)),
        dailyTurnoverRate: Number(adjustedTurnoverRate.toFixed(2)),
        dailyExpiryRenewalRate: Number(dailyExpiryRate.toFixed(2)),
        totalDailyBurnRate: Number(effectiveDailyBurn.toFixed(2)),
        projectedDemand: totalProjectedDemand,
        projectedRemainingStock: projectedRemaining,
        daysToStockout,
        stockoutDate,
        shortageQuantity: shortageQty,
        recommendedReorderQty,
        estimatedReorderCostMNT,
        riskLevel,
        riskScore,
        urgencyReasonMn: reasonMn,
        urgencyReasonEn: reasonEn,
        criticalSizes: criticalSizes.sort((a, b) => a.projectedDaysLeft - b.projectedDaysLeft)
      };
    });

    // Sort predictions by risk score descending
    itemPredictions.sort((a, b) => b.riskScore - a.riskScore);

    // 3. Aggregate Summary Metrics
    const criticalCount = itemPredictions.filter(p => p.riskLevel === 'critical').length;
    const highCount = itemPredictions.filter(p => p.riskLevel === 'high').length;
    const mediumCount = itemPredictions.filter(p => p.riskLevel === 'medium').length;
    const safeCount = itemPredictions.filter(p => p.riskLevel === 'safe').length;

    const totalReorderUnits = itemPredictions.reduce((acc, p) => acc + p.recommendedReorderQty, 0);
    const totalReorderCost = itemPredictions.reduce((acc, p) => acc + p.estimatedReorderCostMNT, 0);

    const earliestStockoutItem = itemPredictions
      .filter(p => p.daysToStockout > 0)
      .sort((a, b) => a.daysToStockout - b.daysToStockout)[0];

    // 4. Category Risk Breakdown
    const catMap: Record<string, { category: string; critical: number; high: number; medium: number; safe: number; totalDemand: number }> = {};
    itemPredictions.forEach(p => {
      const cat = p.uniform.category;
      if (!catMap[cat]) {
        catMap[cat] = { category: cat, critical: 0, high: 0, medium: 0, safe: 0, totalDemand: 0 };
      }
      catMap[cat][p.riskLevel]++;
      catMap[cat].totalDemand += p.projectedDemand;
    });

    // 5. Multi-Month Trajectory Simulation for Recharts (Days 0 to 180)
    const timelineDaysSteps = [0, 15, 30, 45, 60, 90, 120, 150, 180];
    const totalInitialStock = uniforms.reduce((acc, u) => acc + u.totalStock, 0);
    const totalDailyFleetBurn = itemPredictions.reduce((acc, p) => acc + p.totalDailyBurnRate, 0);

    const trajectoryData = timelineDaysSteps.map(dayStep => {
      const remainingStock = Math.max(0, Math.round(totalInitialStock - (totalDailyFleetBurn * dayStep)));
      const reorderThreshold = Math.round(totalDailyFleetBurn * procurementLeadTimeDays * 1.25);
      const totalDemandAccumulated = Math.round(totalDailyFleetBurn * dayStep);

      const dateObj = new Date(todayTime + dayStep * 24 * 60 * 60 * 1000);
      const dateLabel = dateObj.toLocaleDateString(language === 'mn' ? 'mn-MN' : 'en-US', {
        month: 'short',
        day: 'numeric'
      });

      return {
        day: dayStep,
        dateLabel,
        remainingStock,
        reorderThreshold,
        totalDemandAccumulated,
        isUnderSafetyStock: remainingStock < reorderThreshold
      };
    });

    return {
      predictions: itemPredictions,
      summaryMetrics: {
        criticalCount,
        highCount,
        mediumCount,
        safeCount,
        totalReorderUnits,
        totalReorderCost,
        earliestStockoutItem
      },
      categoryRiskDistribution: Object.values(catMap),
      timelineProjection: trajectoryData
    };
  }, [uniforms, personnel, distributions, exchanges, departments, horizonDays, turnoverSurgeMultiplier, procurementLeadTimeDays, language]);

  // Filtered list
  const filteredPredictions = useMemo(() => {
    return predictions.filter(p => {
      if (selectedCategoryFilter !== 'all' && p.uniform.category !== selectedCategoryFilter) {
        return false;
      }
      if (selectedRiskFilter !== 'all' && p.riskLevel !== selectedRiskFilter) {
        return false;
      }
      return true;
    });
  }, [predictions, selectedCategoryFilter, selectedRiskFilter]);

  // Export Requisition Plan as CSV
  const handleExportProcurementPlan = () => {
    const headers = [
      'Загварын код',
      'Хувцасны нэр',
      'Ангилал',
      'Одоогийн үлдэгдэл',
      'Өдрийн зарцуулалт',
      'Дуусах хугацаа (хоног)',
      'Хомсдолын хэмжээ',
      'Санал болгох захиалгын тоо',
      'Нэгжийн үнэ (₮)',
      'Нийт төсөвлөх өртөг (₮)',
      'Эрсдэлийн түвшин',
      'Хамгийн бага үлдэгдэлтэй размер'
    ];

    const rows = predictions
      .filter(p => p.recommendedReorderQty > 0 || p.riskLevel === 'critical' || p.riskLevel === 'high')
      .map(p => [
        `"${p.uniform.modelCode}"`,
        `"${p.uniform.nameMn}"`,
        `"${p.uniform.category}"`,
        p.currentStock,
        p.totalDailyBurnRate,
        p.daysToStockout,
        p.shortageQuantity,
        p.recommendedReorderQty,
        p.uniform.unitPriceMNT || 120000,
        p.estimatedReorderCostMNT,
        p.riskLevel === 'critical' ? 'Ноцтой' : p.riskLevel === 'high' ? 'Өндөр' : p.riskLevel === 'medium' ? 'Дунд' : 'Хэвийн',
        `"${p.criticalSizes.map(s => `${s.size} (${s.stock} үлдсэн)`).join(', ')}"`
      ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Uniform_Shortage_Procurement_Forecast_${horizonDays}d_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner: Algorithm Architecture Overview */}
      <div className="bg-gradient-to-r from-teal-900 via-indigo-950/40 to-teal-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                {language === 'mn' ? 'ХОМСДОЛ ТААМАГЛАХ АЛГОРИТМ' : 'PREDICTIVE SHORTAGE ENGINE'}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-teal-800 text-foam-200 border border-teal-700">
                {language === 'mn' ? 'Эдэлгээ & Ротацид суурилсан' : 'Turnover & Lifecycle Driven'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foam-50 tracking-tight">
              {language === 'mn'
                ? 'Цэргийн дүрэмт хувцасны хэрэгцээ, хомсдолын урьдчилсан таамаглал'
                : 'Uniform Shortage & Predictive Replenishment Forecasting'}
            </h2>
            <p className="text-xs sm:text-sm text-foam-200 mt-1 max-w-3xl">
              {language === 'mn'
                ? 'Одоогийн олголтын хурд, цолны эдэлгээний 1 жилийн хугацаа, анги салбаруудын ротацийн солилцооны өгөгдлийг нэгтгэн дараагийн татан авалтын хугацаа, шаардагдах нөөцийг урьдчилан тооцоолно.'
                : 'Simulates depletion trajectories by blending daily issuance velocity, 1-year uniform lifecycles, and department turnover trends to forecast stockouts before procurement lead times.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 self-end lg:self-center flex-wrap">
            <button
              onClick={handleExportProcurementPlan}
              className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 border border-teal-700 text-foam-100 text-xs sm:text-sm font-medium transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>{language === 'mn' ? 'Захиалгын төлөвлөгөө татах (.CSV)' : 'Export Requisition Plan'}</span>
            </button>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{language === 'mn' ? 'Агуулахын нөөц шинэчлэх' : 'Manage Warehouse'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Simulation Controls Bar */}
        <div className="mt-5 pt-4 border-t border-teal-800/90 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Horizon Selector */}
          <div className="bg-teal-950/70 p-3 rounded-xl border border-teal-800">
            <div className="flex items-center justify-between text-xs text-foam-500 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                {language === 'mn' ? 'Таамаглах хугацааны хүрээ:' : 'Forecast Horizon:'}
              </span>
              <strong className="text-indigo-300 font-mono font-bold">{horizonDays} {language === 'mn' ? 'хоног' : 'days'}</strong>
            </div>
            <div className="flex items-center gap-1">
              {([30, 60, 90, 180, 365] as ForecastHorizonDays[]).map(days => (
                <button
                  key={days}
                  onClick={() => setHorizonDays(days)}
                  className={`flex-1 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                    horizonDays === days
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'bg-teal-850 text-foam-500 hover:text-foam-100'
                  }`}
                >
                  {days === 365 ? (language === 'mn' ? '1 жил' : '1 yr') : `${days}d`}
                </button>
              ))}
            </div>
          </div>

          {/* Troop Turnover / Draft Multiplier */}
          <div className="bg-teal-950/70 p-3 rounded-xl border border-teal-800">
            <div className="flex items-center justify-between text-xs text-foam-500 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="w-3.5 h-3.5 text-foam-300" />
                {language === 'mn' ? 'Цэрэг татлага, ротацийн эрчим:' : 'Turnover & Draft Surge:'}
              </span>
              <strong className="text-foam-200 font-mono font-bold">{turnoverSurgeMultiplier}x</strong>
            </div>
            <div className="flex items-center gap-1">
              {[
                { val: 1.0 as TurnoverSurgeLevel, labelMn: 'Хэвийн (1.0x)', labelEn: 'Normal' },
                { val: 1.25 as TurnoverSurgeLevel, labelMn: '+25% Ротаци', labelEn: '+25%' },
                { val: 1.5 as TurnoverSurgeLevel, labelMn: '+50% Татлага', labelEn: '+50%' },
                { val: 2.0 as TurnoverSurgeLevel, labelMn: 'Дайчилгаа (2x)', labelEn: '2x Surge' }
              ].map(item => (
                <button
                  key={item.val}
                  onClick={() => setTurnoverSurgeMultiplier(item.val)}
                  className={`flex-1 py-1 text-[11px] rounded-lg font-medium transition cursor-pointer ${
                    turnoverSurgeMultiplier === item.val
                      ? 'bg-foam-300 text-teal-950 font-bold shadow-sm'
                      : 'bg-teal-850 text-foam-500 hover:text-foam-100'
                  }`}
                >
                  {language === 'mn' ? item.labelMn : item.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Military Procurement Lead Time */}
          <div className="bg-teal-950/70 p-3 rounded-xl border border-teal-800">
            <div className="flex items-center justify-between text-xs text-foam-500 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-foam-300" />
                {language === 'mn' ? 'Үйлдвэрлэл, хангалтын хугацаа:' : 'Procurement Lead Time:'}
              </span>
              <strong className="text-foam-200 font-mono font-bold">{procurementLeadTimeDays} {language === 'mn' ? 'хоног' : 'days'}</strong>
            </div>
            <div className="flex items-center gap-1">
              {[
                { val: 20, labelMn: 'Шуурхай (20х)', labelEn: 'Rush (20d)' },
                { val: 45, labelMn: 'Стандарт (45х)', labelEn: 'Std (45d)' },
                { val: 75, labelMn: 'Урт хугацаа (75х)', labelEn: 'Long (75d)' }
              ].map(item => (
                <button
                  key={item.val}
                  onClick={() => setProcurementLeadTimeDays(item.val)}
                  className={`flex-1 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                    procurementLeadTimeDays === item.val
                      ? 'bg-foam-400 text-white font-bold shadow-sm'
                      : 'bg-teal-850 text-foam-500 hover:text-foam-100'
                  }`}
                >
                  {language === 'mn' ? item.labelMn : item.labelEn}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical Shortage Warning */}
        <div className={`p-5 rounded-2xl border transition shadow-lg ${
          summaryMetrics.criticalCount > 0 
            ? 'bg-rose-950/30 border-rose-500/50 shadow-rose-950/20' 
            : 'bg-teal-900/90 border-teal-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              {language === 'mn' ? 'Нэн яаралтай хомсдол' : 'Critical Stockout Alert'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-rose-300">
              {summaryMetrics.criticalCount}
            </span>
            <span className="text-xs text-foam-500">{language === 'mn' ? 'төрлийн хувцас' : 'items critical'}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-teal-800/80 text-xs flex items-center justify-between">
            <span className="text-foam-500">{language === 'mn' ? 'Хангамж хүрэхгүй:' : 'Depleted before lead:'}</span>
            <span className="font-mono font-bold text-rose-400">&lt; {procurementLeadTimeDays}d</span>
          </div>
        </div>

        {/* High Risk in Horizon */}
        <div className="bg-teal-900/90 border border-teal-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foam-300">
              {language === 'mn' ? 'Эрсдэлтэй төрлүүд' : 'High Risk in Horizon'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-foam-300/10 border border-foam-300/20 flex items-center justify-center text-foam-300">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-foam-200">
              {summaryMetrics.highCount}
            </span>
            <span className="text-xs text-foam-500">{language === 'mn' ? `/${horizonDays} хоногт` : `in ${horizonDays}d`}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-teal-800/80 text-xs flex items-center justify-between">
            <span className="text-foam-500">{language === 'mn' ? 'Хэвийн / Аюулгүй:' : 'Safe Reserves:'}</span>
            <span className="font-mono font-bold text-foam-300">{summaryMetrics.safeCount} {language === 'mn' ? 'төрөл' : 'items'}</span>
          </div>
        </div>

        {/* Recommended Reorder Quantity */}
        <div className="bg-teal-900/90 border border-teal-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              {language === 'mn' ? 'Санал болгох нийт захиалга' : 'Recommended Reorder'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-indigo-300">
              {summaryMetrics.totalReorderUnits.toLocaleString()}
            </span>
            <span className="text-xs text-foam-500">{language === 'mn' ? 'ширхэг ком' : 'total units'}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-teal-800/80 text-xs flex items-center justify-between">
            <span className="text-foam-500">{language === 'mn' ? 'Аюулгүйн буфертэй:' : 'Safety stock included:'}</span>
            <span className="font-mono font-bold text-indigo-400">+25%</span>
          </div>
        </div>

        {/* Estimated Reorder Budget */}
        <div className="bg-teal-900/90 border border-teal-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foam-300">
              {language === 'mn' ? 'Төсвийн урьдчилсан тооцоо' : 'Est. Replenishment Budget'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-foam-300/10 border border-foam-300/20 flex items-center justify-center text-foam-300">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-foam-200">
              {(summaryMetrics.totalReorderCost / 1000000).toFixed(1)}M
            </span>
            <span className="text-xs text-foam-500">₮ (MNT)</span>
          </div>
          <div className="mt-3 pt-3 border-t border-teal-800/80 text-xs flex items-center justify-between">
            <span className="text-foam-500">{language === 'mn' ? 'Хамгийн эрт хомсдох:' : 'Earliest stockout:'}</span>
            <span className="font-mono font-bold text-foam-200">
              {summaryMetrics.earliestStockoutItem ? `${summaryMetrics.earliestStockoutItem.daysToStockout}d` : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Analysis Section: Trajectory Simulation Chart & Algorithm Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trajectory Simulation Chart - 8 cols */}
        <div className="lg:col-span-8 bg-teal-900/90 border border-teal-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-teal-800">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-foam-50 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                {language === 'mn'
                  ? 'Нийт нөөцийн зарцуулалт ба Аюулгүйн босго шугам (180 хоногийн тренд)'
                  : 'Fleet Depletion Trajectory vs Safety Threshold (180-Day Simulation)'}
              </h3>
              <p className="text-xs text-foam-500 mt-0.5">
                {language === 'mn'
                  ? 'Зарцуулалтын хурд болон хангамжийн хугацааны босгыг давж хомсдол үүсэх цэгийг харуулна'
                  : 'Dynamic projection showing when total warehouse reserves cross the procurement threshold.'}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                {language === 'mn' ? 'Үлдэгдэл нөөц' : 'Stock Level'}
              </span>
              <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                <span className="w-2.5 h-0.5 bg-rose-500"></span>
                {language === 'mn' ? 'Захиалах босго' : 'Reorder Line'}
              </span>
            </div>
          </div>

          <div className="h-72 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timelineProjection} margin={{ top: 15, right: 20, left: -10, bottom: 10 }}>
                <defs>
                  <linearGradient id="stockAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1B2A52" opacity={0.5} />
                <XAxis 
                  dataKey="dateLabel" 
                  stroke="#7ECDA0" 
                  fontSize={11} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#7ECDA0" 
                  fontSize={11} 
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B132B', borderColor: '#1B2A52', borderRadius: '12px', fontSize: '12px', color: '#F0FFF7' }}
                  formatter={(val: number, name: string) => [
                    `${val.toLocaleString()} ${language === 'mn' ? 'ш' : 'units'}`,
                    name === 'remainingStock' ? (language === 'mn' ? 'Үлдэгдэл нөөц' : 'Stock') :
                    name === 'reorderThreshold' ? (language === 'mn' ? 'Захиалах босго' : 'Reorder Point') :
                    (language === 'mn' ? 'Хэрэгцээ' : 'Accumulated Demand')
                  ]}
                />
                <ReferenceLine 
                  y={timelineProjection[0]?.reorderThreshold || 0} 
                  stroke="#EF4444" 
                  strokeDasharray="4 4" 
                  label={{ 
                    value: language === 'mn' ? 'Аюулгүйн босго' : 'Safety Buffer', 
                    fill: '#EF4444', 
                    fontSize: 10,
                    position: 'insideTopRight'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="remainingStock" 
                  stroke="#6366F1" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#stockAreaGradient)" 
                />
                <Line 
                  type="monotone" 
                  dataKey="reorderThreshold" 
                  stroke="#EF4444" 
                  strokeWidth={2} 
                  strokeDasharray="3 3" 
                  dot={false} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Algorithm Insights & Department Bottlenecks - 4 cols */}
        <div className="lg:col-span-4 bg-teal-900/90 border border-teal-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-teal-800">
              <h3 className="text-sm sm:text-base font-semibold text-foam-50 flex items-center gap-2">
                <Zap className="w-4 h-4 text-foam-300" />
                {language === 'mn' ? 'Ухаалаг дүгнэлт & Зөвлөмж' : 'Algorithmic Diagnostics'}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-foam-300/10 text-foam-200 border border-foam-300/20">
                AI / Statistical
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-teal-800/50 border border-teal-800 space-y-1">
                <div className="font-semibold text-foam-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>{language === 'mn' ? 'Хамгийн өндөр эрсдэлтэй зүйл:' : 'Primary Bottleneck Item:'}</span>
                </div>
                {summaryMetrics.earliestStockoutItem ? (
                  <p className="text-foam-200 font-medium">
                    <strong className="text-foam-200 font-mono mr-1">[{summaryMetrics.earliestStockoutItem.uniform.modelCode}]</strong>
                    {summaryMetrics.earliestStockoutItem.uniform.nameMn} ({summaryMetrics.earliestStockoutItem.daysToStockout} {language === 'mn' ? 'хоног үлдсэн' : 'days left'})
                  </p>
                ) : (
                  <p className="text-foam-500">{language === 'mn' ? 'Нэн яаралтай хомсдол илрээгүй' : 'No immediate stockout'}</p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-teal-800/50 border border-teal-800 space-y-1">
                <div className="font-semibold text-foam-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-foam-300"></span>
                  <span>{language === 'mn' ? 'Улирлын эрэлтийн нөлөөлөл:' : 'Seasonal Transition Impact:'}</span>
                </div>
                <p className="text-foam-500 leading-relaxed">
                  {language === 'mn'
                    ? 'Өвлийн улирлын хүрэм, хээрийн дулаан хувцасны эрэлт одоогийн горимоос +35% нэмэгдэж байна.'
                    : 'Winter field gear and heavy outerwear experiencing a +35% seasonal demand surge factor.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-teal-800/50 border border-teal-800 space-y-1">
                <div className="font-semibold text-foam-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-foam-300"></span>
                  <span>{language === 'mn' ? 'Хэмнэлт & Төсвийн оновчлол:' : 'Procurement Recommendation:'}</span>
                </div>
                <p className="text-foam-500 leading-relaxed">
                  {language === 'mn'
                    ? `Нийт ${summaryMetrics.totalReorderUnits} ком хувцсыг нэгтгэн бөөнөөр захиалснаар үйлдвэрлэлийн зардлыг 12% бууруулах боломжтой.`
                    : `Consolidating orders for ${summaryMetrics.totalReorderUnits} units enables an estimated 12% bulk manufacturing discount.`}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-teal-800/80 flex items-center justify-between text-xs">
            <span className="text-foam-500">{language === 'mn' ? 'Алгоритмын итгэлцэл:' : 'Model Confidence:'}</span>
            <span className="font-mono font-bold text-foam-300">94.2%</span>
          </div>
        </div>
      </div>

      {/* Uniform Item Forecast Table & Detailed Breakdown */}
      <div className="bg-teal-900/90 border border-teal-800 rounded-2xl p-5 shadow-xl space-y-4">
        {/* Table Filters & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-teal-800">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-foam-50 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              {language === 'mn' ? 'Дүрэмт хувцас тус бүрийн хомсдолын таамаглал ба норм' : 'Item-by-Item Shortage & Reorder Matrix'}
            </h3>
            <p className="text-xs text-foam-500 mt-0.5">
              {language === 'mn'
                ? 'Цэргийн дүрэмт хувцасны өдөр тутмын зарцуулалт, нөөц дуусах хугацаа, санал болгох захиалгын тоо'
                : 'Projected daily burn rates, days to stockout, and auto-generated replenishment quantities.'}
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Risk Filter */}
            <div className="flex items-center bg-teal-950 p-1 rounded-xl border border-teal-800">
              <span className="text-foam-600 text-[10px] uppercase font-bold px-1.5">{language === 'mn' ? 'Эрсдэл:' : 'Risk:'}</span>
              {(['all', 'critical', 'high', 'medium', 'safe'] as const).map(risk => (
                <button
                  key={risk}
                  onClick={() => setSelectedRiskFilter(risk)}
                  className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                    selectedRiskFilter === risk
                      ? 'bg-teal-800 text-foam-50 font-bold shadow'
                      : 'text-foam-500 hover:text-foam-100'
                  }`}
                >
                  {risk === 'all' ? (language === 'mn' ? 'Бүгд' : 'All') :
                   risk === 'critical' ? (language === 'mn' ? 'Яаралтай' : 'Critical') :
                   risk === 'high' ? (language === 'mn' ? 'Өндөр' : 'High') :
                   risk === 'medium' ? (language === 'mn' ? 'Дунд' : 'Med') :
                   (language === 'mn' ? 'Хэвийн' : 'Safe')}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <div className="flex items-center bg-teal-950 p-1 rounded-xl border border-teal-800">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-transparent text-foam-200 font-medium px-2 py-0.5 text-xs outline-none cursor-pointer"
              >
                <option value="all">{language === 'mn' ? 'Бүх төрөл' : 'All Categories'}</option>
                <option value="Outerwear">{language === 'mn' ? 'Гадуур хувцас' : 'Outerwear'}</option>
                <option value="Headwear">{language === 'mn' ? 'Малгай' : 'Headwear'}</option>
                <option value="Footwear">{language === 'mn' ? 'Гутал' : 'Footwear'}</option>
                <option value="Innerwear">{language === 'mn' ? 'Дотуур цамц' : 'Innerwear'}</option>
                <option value="Accessories">{language === 'mn' ? 'Хэрэглэл' : 'Accessories'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Prediction Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-teal-800 text-foam-500 font-semibold">
                <th className="pb-3 pr-2">{language === 'mn' ? 'Загвар & Нэр' : 'Model & Uniform'}</th>
                <th className="pb-3 px-2 text-center">{language === 'mn' ? 'Одоогийн нөөц' : 'Stock'}</th>
                <th className="pb-3 px-2 text-center">{language === 'mn' ? 'Өдрийн зарцуулалт' : 'Burn Rate'}</th>
                <th className="pb-3 px-2 text-center">{language === 'mn' ? 'Дуусах хугацаа' : 'Days to Stockout'}</th>
                <th className="pb-3 px-2 text-center">{language === 'mn' ? 'Санал болгох захиалга' : 'Reorder Qty'}</th>
                <th className="pb-3 px-2 text-center">{language === 'mn' ? 'Эрсдэлийн зэрэг' : 'Risk Level'}</th>
                <th className="pb-3 pl-2 text-right">{language === 'mn' ? 'Үйлдэл' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-800/60">
              {filteredPredictions.map(pred => {
                const isCritical = pred.riskLevel === 'critical';
                const isHigh = pred.riskLevel === 'high';

                return (
                  <tr 
                    key={pred.uniform.id} 
                    className={`hover:bg-teal-800/40 transition cursor-pointer ${
                      selectedItemForDeepDive?.uniform.id === pred.uniform.id ? 'bg-indigo-950/40' : ''
                    }`}
                    onClick={() => setSelectedItemForDeepDive(pred)}
                  >
                    {/* Model & Name */}
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-bold text-foam-300 text-xs">
                          [{pred.uniform.modelCode}]
                        </div>
                        <div>
                          <div className="font-semibold text-foam-100">{pred.uniform.nameMn}</div>
                          <div className="text-[11px] text-foam-500">
                            {pred.uniform.category} • {pred.uniform.season}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Stock */}
                    <td className="py-3 px-2 text-center">
                      <span className="font-mono font-bold text-foam-100 text-sm">
                        {pred.currentStock}
                      </span>
                      <div className="text-[10px] text-foam-500">
                        {pred.activeIssued} {language === 'mn' ? 'олгогдсон' : 'issued'}
                      </div>
                    </td>

                    {/* Burn rate */}
                    <td className="py-3 px-2 text-center">
                      <div className="font-mono font-bold text-foam-200">
                        {pred.totalDailyBurnRate} <span className="text-[10px] text-foam-500">{language === 'mn' ? 'ш/өдөр' : 'u/day'}</span>
                      </div>
                      <div className="text-[10px] text-foam-600">
                        ~{(pred.totalDailyBurnRate * 30).toFixed(0)} {language === 'mn' ? 'ш/сар' : 'u/mo'}
                      </div>
                    </td>

                    {/* Days to stockout */}
                    <td className="py-3 px-2 text-center">
                      <div className={`font-mono font-bold text-sm ${
                        isCritical ? 'text-rose-400' :
                        isHigh ? 'text-foam-300' :
                        'text-foam-300'
                      }`}>
                        {pred.daysToStockout > 999 ? '∞' : `${pred.daysToStockout} ${language === 'mn' ? 'хоног' : 'days'}`}
                      </div>
                      {pred.stockoutDate && pred.daysToStockout < 365 && (
                        <div className="text-[10px] text-foam-500 font-mono">
                          {pred.stockoutDate.toLocaleDateString(language === 'mn' ? 'mn-MN' : 'en-US', { month: 'numeric', day: 'numeric' })}
                        </div>
                      )}
                    </td>

                    {/* Reorder Qty */}
                    <td className="py-3 px-2 text-center">
                      {pred.recommendedReorderQty > 0 ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono font-bold text-xs">
                          <ShoppingCart className="w-3 h-3" />
                          <span>+{pred.recommendedReorderQty}</span>
                        </div>
                      ) : (
                        <span className="text-foam-600 text-xs font-mono">-</span>
                      )}
                    </td>

                    {/* Risk Badge */}
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        pred.riskLevel === 'critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        pred.riskLevel === 'high' ? 'bg-foam-300/20 text-foam-200 border border-foam-300/40' :
                        pred.riskLevel === 'medium' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                        'bg-foam-300/20 text-foam-200 border border-foam-300/40'
                      }`}>
                        {pred.riskLevel === 'critical' ? (language === 'mn' ? 'Нэн яаралтай' : 'Critical') :
                         pred.riskLevel === 'high' ? (language === 'mn' ? 'Өндөр' : 'High') :
                         pred.riskLevel === 'medium' ? (language === 'mn' ? 'Дунд' : 'Medium') :
                         (language === 'mn' ? 'Аюулгүй' : 'Safe')}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 pl-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedItemForDeepDive(pred)}
                        className="px-2.5 py-1 rounded-lg bg-teal-800 hover:bg-teal-700 text-foam-200 text-xs font-medium transition cursor-pointer"
                      >
                        {language === 'mn' ? 'Шинжилгээ' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep-Dive Inspection Modal / Drawer when item selected */}
      {selectedItemForDeepDive && (
        <div className="fixed inset-0 z-50 bg-teal-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-teal-900 border border-teal-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-teal-800">
              <div className="flex items-center gap-2">
                <div className="font-mono font-bold text-foam-300 bg-foam-300/10 px-2 py-1 rounded border border-foam-300/20 text-sm">
                  [{selectedItemForDeepDive.uniform.modelCode}]
                </div>
                <div>
                  <h3 className="font-bold text-foam-50 text-base">
                    {selectedItemForDeepDive.uniform.nameMn}
                  </h3>
                  <div className="text-xs text-foam-500">
                    {selectedItemForDeepDive.uniform.category} • {selectedItemForDeepDive.uniform.gender} • {selectedItemForDeepDive.uniform.season}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedItemForDeepDive(null)}
                className="p-1.5 rounded-lg bg-teal-800 hover:bg-teal-700 text-foam-200 transition"
              >
                ✕
              </button>
            </div>

            {/* Diagnostic Message */}
            <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
              selectedItemForDeepDive.riskLevel === 'critical' ? 'bg-rose-950/40 border-rose-500/40 text-rose-200' :
              selectedItemForDeepDive.riskLevel === 'high' ? 'bg-foam-500/40 border-foam-300/40 text-foam-100' :
              'bg-teal-800/80 border-teal-700 text-foam-100'
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-foam-300" />
                <span>{language === 'mn' ? 'Хомсдолын оношлогоо:' : 'Shortage Diagnostic:'}</span>
              </div>
              <p className="leading-relaxed">
                {language === 'mn' ? selectedItemForDeepDive.urgencyReasonMn : selectedItemForDeepDive.urgencyReasonEn}
              </p>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-teal-950 border border-teal-800">
                <div className="text-foam-500">{language === 'mn' ? 'Бэлэн нөөц' : 'Current Stock'}</div>
                <div className="text-lg font-bold font-mono text-foam-50 mt-0.5">
                  {selectedItemForDeepDive.currentStock} {language === 'mn' ? 'ш' : 'u'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-950 border border-teal-800">
                <div className="text-foam-500">{language === 'mn' ? 'Өдрийн зарцуулалт' : 'Daily Burn'}</div>
                <div className="text-lg font-bold font-mono text-indigo-300 mt-0.5">
                  {selectedItemForDeepDive.totalDailyBurnRate} {language === 'mn' ? 'ш/өдөр' : 'u/d'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-950 border border-teal-800">
                <div className="text-foam-500">{language === 'mn' ? 'Дуусах хугацаа' : 'Days to Empty'}</div>
                <div className="text-lg font-bold font-mono text-foam-200 mt-0.5">
                  {selectedItemForDeepDive.daysToStockout} {language === 'mn' ? 'хоног' : 'days'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-950 border border-teal-800">
                <div className="text-foam-500">{language === 'mn' ? 'Захиалах тоо' : 'Reorder Qty'}</div>
                <div className="text-lg font-bold font-mono text-foam-200 mt-0.5">
                  +{selectedItemForDeepDive.recommendedReorderQty} {language === 'mn' ? 'ш' : 'u'}
                </div>
              </div>
            </div>

            {/* Size Breakdown in Detail */}
            <div>
              <h4 className="text-xs font-bold text-foam-200 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>{language === 'mn' ? 'Размер тус бүрийн нөөцийн түвшин' : 'Size-Level Stock & Depletion'}</span>
                <span className="text-[11px] text-foam-500 font-normal">
                  {Object.keys(selectedItemForDeepDive.uniform.sizeStock || {}).length} {language === 'mn' ? 'размер бүртгэлтэй' : 'sizes configured'}
                </span>
              </h4>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                {Object.entries(selectedItemForDeepDive.uniform.sizeStock || {}).map(([sz, qtyVal]) => {
                  const qty = Number(qtyVal) || 0;
                  const isLow = qty <= 2;
                  return (
                    <div key={sz} className={`p-2 rounded-xl text-center border ${
                      isLow ? 'bg-rose-500/10 border-rose-500/30' : 'bg-teal-950 border-teal-800'
                    }`}>
                      <div className="font-mono text-foam-500 text-[10px]">{sz}</div>
                      <div className={`font-mono font-bold text-sm ${isLow ? 'text-rose-400' : 'text-foam-100'}`}>
                        {qty}
                      </div>
                      <div className="text-[9px] text-foam-600">
                        {isLow ? (language === 'mn' ? 'Багассан' : 'Low') : (language === 'mn' ? 'Хэвийн' : 'OK')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-teal-800 flex items-center justify-between text-xs">
              <span className="text-foam-500">
                {language === 'mn' ? 'Нэгжийн үнэ:' : 'Unit Price:'}{' '}
                <strong className="text-foam-100 font-mono">
                  {(selectedItemForDeepDive.uniform.unitPriceMNT || 120000).toLocaleString()} ₮
                </strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedItemForDeepDive(null);
                    onOpenQuickIssue();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-foam-100 font-medium transition cursor-pointer"
                >
                  {language === 'mn' ? 'Олголт хийх' : 'Issue Item'}
                </button>
                <button
                  onClick={() => {
                    setSelectedItemForDeepDive(null);
                    onNavigateTab('inventory');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer"
                >
                  {language === 'mn' ? 'Нөөц нэмж захиалах' : 'Procure Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
