import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Layers, 
  AlertOctagon, 
  ArrowLeftRight, 
  Users, 
  CalendarClock, 
  TrendingUp, 
  CheckCircle2, 
  Printer, 
  RefreshCw, 
  Filter, 
  PieChart as PieIcon,
  BarChart3,
  ExternalLink,
  Building2,
  Sparkles,
  TrendingDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { useUniformData } from '../context/UniformDataContext';
import { DistributionRecord } from '../types';
import { PredictiveShortageForecast } from './PredictiveShortageForecast';

interface DashboardViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenQuickIssue: () => void;
  onOpenExchangeModal: (distRecord?: DistributionRecord) => void;
  onOpenPrintSlip: (distRecord: DistributionRecord) => void;
}

const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenQuickIssue,
  onOpenExchangeModal,
  onOpenPrintSlip
}) => {
  const { 
    uniforms, 
    personnel, 
    distributions, 
    exchanges, 
    departments, 
    language,
    getExpiringDistributions,
    renewDistribution
  } = useUniformData();

  const [dashboardSubTab, setDashboardSubTab] = useState<'overview' | 'forecast'>('overview');
  const [selectedCategoryForSizeChart, setSelectedCategoryForSizeChart] = useState<string>('Outerwear');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');

  // KPI Calculations
  const totalStockCount = uniforms.reduce((acc, u) => acc + u.totalStock, 0);
  const totalIssuedCount = uniforms.reduce((acc, u) => acc + u.issuedCount, 0);
  const totalInventoryUnits = totalStockCount + totalIssuedCount;
  const stockAvailableRate = totalInventoryUnits > 0 ? Math.round((totalStockCount / totalInventoryUnits) * 100) : 0;

  const activeDistributions = distributions.filter(d => d.status === 'Issued');
  const expiringNext30Days = getExpiringDistributions(30);
  const totalExchangesCount = exchanges.length;

  // 1. Stock by Size Data for Selected Category
  const uniformsInCategory = uniforms.filter(u => u.category === selectedCategoryForSizeChart);
  const aggregatedSizeMap: Record<string, number> = {};

  uniformsInCategory.forEach(u => {
    Object.entries(u.sizeStock).forEach(([size, qty]) => {
      aggregatedSizeMap[size] = (aggregatedSizeMap[size] || 0) + Number(qty);
    });
  });

  const sizeChartData = Object.entries(aggregatedSizeMap)
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => a.size.localeCompare(b.size));

  // 2. Department Summary & Completion Rate
  const departmentStats = departments.map(dept => {
    const deptPersonnel = personnel.filter(p => p.departmentId === dept.id || p.departmentName === dept.nameMn);
    const deptDists = distributions.filter(d => d.departmentName === dept.nameMn && d.status === 'Issued');
    
    // An active officer should ideally have at least 2 key uniform sets (Ceremonial + Field)
    const expectedSets = Math.max(deptPersonnel.length * 2, 1);
    const issuedSets = deptDists.length;
    const fulfillmentPercent = Math.min(100, Math.round((issuedSets / expectedSets) * 100));

    return {
      id: dept.id,
      name: dept.shortName,
      fullName: dept.nameMn,
      personnel: deptPersonnel.length,
      issued: issuedSets,
      fulfillment: fulfillmentPercent,
      color: dept.badgeHex
    };
  });

  // 3. Stock Overview (Remaining vs Issued) for Pie
  const stockOverviewPieData = [
    { name: language === 'mn' ? 'Агуулахад бэлэн' : 'In Stock (Available)', value: totalStockCount, color: '#39FF88' },
    { name: language === 'mn' ? 'Олгогдсон (Хэрэглээнд)' : 'Issued (In Service)', value: totalIssuedCount, color: '#1B2A52' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Sub-tab Navigation Switcher */}
      <div className="flex items-center justify-between border-b border-teal-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-teal-900/90 p-1.5 rounded-2xl border border-teal-800 shadow-inner">
          <button
            onClick={() => setDashboardSubTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
              dashboardSubTab === 'overview'
                ? 'bg-foam-300 text-teal-950 shadow-md font-bold'
                : 'text-foam-500 hover:text-foam-100 hover:bg-teal-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{language === 'mn' ? 'Үндсэн статистик & Тойм' : 'Overview & Analytics'}</span>
          </button>

          <button
            onClick={() => setDashboardSubTab('forecast')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer relative ${
              dashboardSubTab === 'forecast'
                ? 'bg-indigo-600 text-white shadow-md font-bold'
                : 'text-foam-500 hover:text-foam-100 hover:bg-teal-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>{language === 'mn' ? 'Хомсдолын таамаглал (Forecast)' : 'Shortage Forecast'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono font-bold">
              AI Engine
            </span>
          </button>
        </div>

        {/* Global Quick Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenQuickIssue}
            className="px-3.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-750 border border-teal-700 text-foam-100 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-foam-300" />
            <span>{language === 'mn' ? 'Шуурхай олголт' : 'Quick Issue'}</span>
          </button>
        </div>
      </div>

      {/* Render Active Sub-View */}
      {dashboardSubTab === 'forecast' ? (
        <PredictiveShortageForecast
          uniforms={uniforms}
          personnel={personnel}
          distributions={distributions}
          exchanges={exchanges}
          departments={departments}
          language={language}
          onNavigateTab={onNavigateTab}
          onOpenQuickIssue={onOpenQuickIssue}
        />
      ) : (
        <>
          {/* Top Banner / Welcome */}
          <div className="bg-gradient-to-r from-teal-900 via-teal-850 to-teal-900 p-6 rounded-2xl border border-teal-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-foam-300/20 text-foam-200 border border-foam-300/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-foam-300"></span>
                  {language === 'mn' ? 'ХАНГАМЖИЙН ХЯНАЛТЫН ТӨВ' : 'SUPPLY CONTROL CENTER'}
                </span>
                <span className="text-xs text-foam-500 font-mono">
                  {new Date().toLocaleDateString(language === 'mn' ? 'mn-MN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foam-50 tracking-tight">
                {language === 'mn' ? 'Цэргийн дүрэмт хувцасны хуваарилалт & нөөцийн хяналт' : 'Military Uniform Distribution & Inventory Dashboard'}
              </h1>
              <p className="text-xs sm:text-sm text-foam-500 mt-1">
                {language === 'mn' 
                  ? 'Бүх төрлийн цэргийн анги байгууллагуудын дүрэмт хувцас, цол, ялгах тэмдгийн эдэлгээний хугацаа, олголт, нөөцийн нэгдсэн статистик.' 
                  : 'Integrated operational overview for uniforms, ranks, insignias, expiry lifecycles, and size swaps across all military branches.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-end md:self-center">
              <button
                onClick={() => onNavigateTab('distributions')}
                className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-750 border border-teal-700 text-foam-100 text-xs sm:text-sm font-medium transition flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-foam-500" />
                {language === 'mn' ? 'Олголтын бүртгэл' : 'View Distributions'}
              </button>
              <button
                onClick={onOpenQuickIssue}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-foam-300 to-foam-400 hover:from-foam-300 hover:to-foam-300 text-teal-950 font-bold text-xs sm:text-sm shadow-lg shadow-foam-300/20 transition flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                {language === 'mn' ? 'Шинэ олголт бүртгэх' : 'Issue New Uniform'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Render the rest of Overview only when subtab is overview */}
      {dashboardSubTab === 'overview' && (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Remaining vs Issued Stock */}
        <div 
          onClick={() => onNavigateTab('inventory')}
          className="bg-teal-900/90 border border-teal-800 hover:border-teal-700 p-5 rounded-2xl shadow-lg cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foam-500">
              {language === 'mn' ? 'Агуулахын нийт нөөц' : 'Total Warehouse Stock'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-foam-300/10 border border-foam-300/20 flex items-center justify-center text-foam-300 group-hover:scale-110 transition">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-foam-50">
              {totalStockCount.toLocaleString()}
            </span>
            <span className="text-xs text-foam-500">{language === 'mn' ? 'ширхэг бэлэн' : 'units ready'}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-teal-800/80">
            <span className="text-foam-500">
              {language === 'mn' ? 'Олгогдсон:' : 'Issued:'} <strong className="text-foam-200 font-mono">{totalIssuedCount.toLocaleString()}</strong>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-foam-300/10 text-foam-300 font-mono font-semibold text-[11px]">
              {stockAvailableRate}% {language === 'mn' ? 'нөөцтэй' : 'avail'}
            </span>
          </div>
        </div>

        {/* Card 2: Active Personnel Covered */}
        <div 
          onClick={() => onNavigateTab('personnel')}
          className="bg-teal-900/90 border border-teal-800 hover:border-teal-700 p-5 rounded-2xl shadow-lg cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foam-500">
              {language === 'mn' ? 'Цэргийн бие бүрэлдэхүүн' : 'Registered Personnel'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-foam-50">
              {personnel.length}
            </span>
            <span className="text-xs text-foam-500">{language === 'mn' ? 'албан хаагч' : 'officers'}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-teal-800/80">
            <span className="text-foam-500">
              {language === 'mn' ? 'Байгууллагууд:' : 'Branches:'} <strong className="text-blue-300 font-mono">{departments.length}</strong>
            </span>
            <span className="text-blue-400 text-[11px] font-medium">
              100% {language === 'mn' ? 'бүртгэгдсэн' : 'profiled'}
            </span>
          </div>
        </div>

        {/* Card 3: Expiry Alerts (30 Days) */}
        <div 
          onClick={() => onNavigateTab('distributions')}
          className={`bg-teal-900/90 border p-5 rounded-2xl shadow-lg cursor-pointer transition transform hover:-translate-y-0.5 group ${
            expiringNext30Days.length > 0 ? 'border-foam-300/40 bg-foam-300/5' : 'border-teal-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foam-500">
              {language === 'mn' ? '30 хоногт дуусах хувцас' : 'Expiring in 30 Days'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-foam-300/10 border border-foam-300/20 flex items-center justify-center text-foam-300 group-hover:scale-110 transition">
              <CalendarClock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-foam-200">
              {expiringNext30Days.length}
            </span>
            <span className="text-xs text-foam-500">{language === 'mn' ? 'олголт сунгах' : 'need renewal'}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-teal-800/80">
            <span className="text-foam-500">
              {language === 'mn' ? 'Идэвхтэй нийт:' : 'Active in use:'} <strong className="text-foam-100 font-mono">{activeDistributions.length}</strong>
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${expiringNext30Days.length > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-foam-300/20 text-foam-200'}`}>
              {expiringNext30Days.length > 0 ? (language === 'mn' ? 'Яаралтай' : 'Urgent') : (language === 'mn' ? 'Хэвийн' : 'OK')}
            </span>
          </div>
        </div>

        {/* Card 4: Size Exchanges & Swaps */}
        <div 
          onClick={() => onNavigateTab('exchanges')}
          className="bg-teal-900/90 border border-teal-800 hover:border-teal-700 p-5 rounded-2xl shadow-lg cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foam-500">
              {language === 'mn' ? 'Размер солилцоо (Нийт)' : 'Size Exchanges Logged'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-purple-300">
              {totalExchangesCount}
            </span>
            <span className="text-xs text-foam-500">{language === 'mn' ? 'солигдсон' : 'swaps processed'}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-teal-800/80">
            <span className="text-foam-500">
              {language === 'mn' ? 'Хугацаа шинэчлэлт:' : 'Expiry reset:'} <strong className="text-purple-300">+1 {language === 'mn' ? 'жил' : 'yr'}</strong>
            </span>
            <span className="text-purple-400 text-[11px] font-medium">
              {language === 'mn' ? 'Нөөц авто тооцогдсон' : 'Stock auto-adjusted'}
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section: Stock Overview & Stock By Size */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Widget 1: Stock by Size (Pie / Bar Chart) - 7 cols */}
        <div className="lg:col-span-7 bg-teal-900/90 border border-teal-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-teal-800">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-foam-50 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-foam-300" />
                {language === 'mn' ? 'Размерийн үлдэгдэл хуваарилалт (Stock by Size)' : 'Available Stock by Size'}
              </h3>
              <p className="text-xs text-foam-500 mt-0.5">
                {language === 'mn' ? 'Сонгосон төрлийн дүрэмт хувцасны размерийн нөөцийн харьцаа' : 'Size breakdown for selected uniform category to assist procurement'}
              </p>
            </div>

            {/* Category Selector */}
            <div className="flex items-center gap-1 bg-teal-800/80 p-1 rounded-xl border border-teal-700/80 text-xs">
              {(['Outerwear', 'Headwear', 'Footwear', 'Innerwear', 'Accessories'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryForSizeChart(cat)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    selectedCategoryForSizeChart === cat
                      ? 'bg-foam-300 text-teal-950 font-bold shadow'
                      : 'text-foam-500 hover:text-foam-100'
                  }`}
                >
                  {cat === 'Outerwear' ? (language === 'mn' ? 'Хүрэм/Китель' : 'Outerwear') :
                   cat === 'Headwear' ? (language === 'mn' ? 'Малгай' : 'Headwear') :
                   cat === 'Footwear' ? (language === 'mn' ? 'Гутал' : 'Boots') :
                   cat === 'Innerwear' ? (language === 'mn' ? 'Цамц' : 'Shirts') :
                   (language === 'mn' ? 'Хэрэгсэл' : 'Accessories')}
                </button>
              ))}
            </div>
          </div>

          {/* Bar / Size Chart */}
          <div className="h-64 mt-4 w-full">
            {sizeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sizeChartData} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1B2A52" opacity={0.5} />
                  <XAxis 
                    dataKey="size" 
                    stroke="#7ECDA0" 
                    fontSize={11} 
                    tickLine={false}
                    label={{ 
                      value: language === 'mn' ? 'Размер / Хэмжээ' : 'Size Label', 
                      position: 'insideBottom', 
                      offset: -12, 
                      fill: '#7ECDA0', 
                      fontSize: 10 
                    }}
                  />
                  <YAxis stroke="#7ECDA0" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0B132B', borderColor: '#1B2A52', borderRadius: '12px', fontSize: '12px', color: '#F0FFF7' }}
                    formatter={(val: number) => [`${val} ${language === 'mn' ? 'ширхэг' : 'units'}`, language === 'mn' ? 'Үлдэгдэл нөөц' : 'Stock Quantity']}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {sizeChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-foam-600 text-xs">
                {language === 'mn' ? 'Энэ төрөлд одоогоор өгөгдөл байхгүй байна' : 'No size breakdown available for this category'}
              </div>
            )}
          </div>
        </div>

        {/* Widget 2: Stock Overview (Remaining vs Issued) - 5 cols */}
        <div className="lg:col-span-5 bg-teal-900/90 border border-teal-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-teal-800">
              <h3 className="text-sm sm:text-base font-semibold text-foam-50 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-foam-300" />
                {language === 'mn' ? 'Нөөцийн ерөнхий төлөв' : 'Stock Status Overview'}
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-800 text-foam-200">
                {totalInventoryUnits.toLocaleString()} {language === 'mn' ? 'нийт хувцас' : 'total items'}
              </span>
            </div>

            <div className="h-56 mt-2 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockOverviewPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stockOverviewPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0B132B', borderColor: '#1B2A52', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: number) => [`${val.toLocaleString()} ${language === 'mn' ? 'ш' : 'units'}`, '']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(val) => <span className="text-xs text-foam-200 font-medium">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Centered Stat */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-[-18px]">
                <div className="text-xl font-bold font-mono text-foam-50">{stockAvailableRate}%</div>
                <div className="text-[10px] text-foam-500 uppercase">{language === 'mn' ? 'Бэлэн' : 'Available'}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-teal-800/80 text-xs">
            <div className="bg-foam-300/10 p-2.5 rounded-xl border border-foam-300/20">
              <div className="text-[11px] text-foam-200 font-medium">{language === 'mn' ? 'Агуулахын үлдэгдэл' : 'In Stock'}</div>
              <div className="text-base font-bold font-mono text-foam-300 mt-0.5">{totalStockCount.toLocaleString()}</div>
            </div>
            <div className="bg-foam-300/10 p-2.5 rounded-xl border border-foam-300/20">
              <div className="text-[11px] text-foam-200 font-medium">{language === 'mn' ? 'Олгогдсон хувцас' : 'In Service'}</div>
              <div className="text-base font-bold font-mono text-foam-300 mt-0.5">{totalIssuedCount.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Section: Expiry Alerts & Department Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Expiry Alerts Table (30 Days) - 7 cols */}
        <div className="lg:col-span-7 bg-teal-900/90 border border-teal-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-teal-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-foam-300/10 border border-foam-300/20 flex items-center justify-center text-foam-300">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-foam-50">
                  {language === 'mn' ? '30 хоногт хугацаа дуусах олголтууд' : 'Uniforms Expiring within 30 Days'}
                </h3>
                <span className="text-xs text-foam-500">
                  {language === 'mn' ? 'Эдэлгээний 1 жилийн хугацаа нь дуусч буй албан хаагчид' : 'Active 1-year uniform lifecycle reaching renewal deadline'}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-foam-300/15 text-foam-200 border border-foam-300/30">
              {expiringNext30Days.length} {language === 'mn' ? 'анхааруулга' : 'alerts'}
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            {expiringNext30Days.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-teal-800 text-foam-500 font-semibold">
                    <th className="pb-2.5 pr-2">{language === 'mn' ? 'Албан хаагч' : 'Personnel'}</th>
                    <th className="pb-2.5 px-2">{language === 'mn' ? 'Дүрэмт хувцас' : 'Uniform Item'}</th>
                    <th className="pb-2.5 px-2">{language === 'mn' ? 'Дуусах огноо' : 'Expiry Date'}</th>
                    <th className="pb-2.5 pl-2 text-right">{language === 'mn' ? 'Үйлдэл' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-800/60">
                  {expiringNext30Days.map(record => {
                    const expiry = new Date(record.expiryDate);
                    const now = new Date();
                    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isExpired = diffDays <= 0;

                    return (
                      <tr key={record.id} className="hover:bg-teal-800/40 transition">
                        <td className="py-3 pr-2">
                          <div className="font-semibold text-foam-100">{record.personnelName}</div>
                          <div className="text-[11px] text-foam-500">
                            {record.personnelRank} • <span className="font-mono text-foam-600">{record.personnelMilitaryId}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="font-medium text-foam-200">
                            <span className="font-mono text-[10px] text-foam-300 font-bold mr-1">[{record.uniformModelCode}]</span>
                            {record.uniformNameMn}
                          </div>
                          <div className="text-[11px] text-foam-500">
                            {language === 'mn' ? 'Размер:' : 'Size:'} <span className="font-mono text-foam-100 font-semibold">{record.size}</span> • {record.departmentName}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="font-mono font-bold text-foam-100">{record.expiryDate}</div>
                          <div className="mt-0.5">
                            {isExpired ? (
                              <span className="inline-block px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-semibold">
                                {language === 'mn' ? 'Хугацаа дууссан' : 'Expired'}
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.2 rounded bg-foam-300/20 text-foam-200 text-[10px] font-semibold">
                                {diffDays} {language === 'mn' ? 'хоног үлдсэн' : 'days left'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pl-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                const res = renewDistribution(record.id);
                                if (res.success) {
                                  alert(res.message);
                                } else {
                                  alert(res.message);
                                }
                              }}
                              title={language === 'mn' ? 'Хугацааг 1 жилээр сунгаж шинэчлэн олгох' : 'Renew for +1 Year'}
                              className="px-2.5 py-1.5 rounded-lg bg-foam-300/15 hover:bg-foam-300/25 text-foam-200 border border-foam-300/30 text-xs font-medium transition flex items-center gap-1"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{language === 'mn' ? 'Сунгах' : 'Renew'}</span>
                            </button>
                            <button
                              onClick={() => onOpenPrintSlip(record)}
                              title={language === 'mn' ? 'Олголтын баримт хэвлэх' : 'Print Slip'}
                              className="p-1.5 rounded-lg bg-teal-800 hover:bg-teal-700 text-foam-200 transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-foam-500">
                <CheckCircle2 className="w-8 h-8 text-foam-300 mx-auto mb-2 opacity-80" />
                <p className="text-xs">{language === 'mn' ? 'Ойрын 30 хоногт хугацаа нь дуусах олголт байхгүй байна.' : 'No uniforms expiring within the next 30 days.'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Department Summary & Quotas - 5 cols */}
        <div className="lg:col-span-5 bg-teal-900/90 border border-teal-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-teal-800">
              <h3 className="text-sm sm:text-base font-semibold text-foam-50 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                {language === 'mn' ? 'Байгууллагуудын хангалт' : 'Department Issuance Fulfillment'}
              </h3>
              <button 
                onClick={() => onNavigateTab('departments')}
                className="text-xs text-foam-300 hover:text-foam-200 font-medium"
              >
                {language === 'mn' ? 'Дэлгэрэнгүй →' : 'Details →'}
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-1">
              {departmentStats.map(dept => (
                <div key={dept.id} className="p-2.5 rounded-xl bg-teal-800/50 border border-teal-800 hover:border-teal-750 transition">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: dept.color }}
                      ></span>
                      <span className="font-semibold text-foam-100">{dept.fullName}</span>
                    </div>
                    <span className="font-mono font-bold text-foam-200">{dept.fulfillment}%</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-teal-700/80 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-foam-300 to-foam-300 transition-all duration-500"
                      style={{ width: `${dept.fulfillment}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-[10px] text-foam-500 mt-1.5">
                    <span>{dept.personnel} {language === 'mn' ? 'албан хаагч' : 'personnel'}</span>
                    <span>{dept.issued} {language === 'mn' ? 'иж бүрдэл олгогдсон' : 'sets issued'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-teal-800/80 flex items-center justify-between text-xs">
            <span className="text-foam-500">{language === 'mn' ? 'Хамрагдсан нийт нэгжүүд:' : 'Total branches:'}</span>
            <span className="font-bold text-foam-100 font-mono">{departments.length} {language === 'mn' ? 'байгууллага' : 'agencies'}</span>
          </div>
        </div>
      </div>

      {/* Exchange History & Size Demand Forecasting Bar */}
      <div className="bg-teal-900/90 border border-teal-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-teal-800">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-foam-50 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-purple-400" />
              {language === 'mn' ? 'Размер солилцооны түүх ба хэрэгцээний төлөвлөлт' : 'Exchange History & Size Demand Planning'}
            </h3>
            <p className="text-xs text-foam-500 mt-0.5">
              {language === 'mn' ? 'Цэргийн албан хаагчдын размерийн зөрүүг судалж, дараагийн захиалгад тусгах статистик' : 'Track size swaps to refine military procurement orders and stock quotas.'}
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('exchanges')}
            className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold transition"
          >
            {language === 'mn' ? 'Шинэ солилцоо хийх' : 'Process New Exchange'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {exchanges.slice(0, 3).map(exc => (
            <div key={exc.id} className="p-3.5 rounded-xl bg-teal-800/40 border border-teal-800 hover:border-purple-500/30 transition">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-purple-300 font-semibold">{exc.exchangeNo}</span>
                <span className="text-[10px] text-foam-500 font-mono">{exc.exchangeDate}</span>
              </div>
              <div className="font-semibold text-xs text-foam-100 mt-1.5">{exc.personnelName}</div>
              <div className="text-[11px] text-foam-500 truncate mt-0.5">
                [{exc.uniformModelCode}] {exc.uniformName}
              </div>
              <div className="mt-2 flex items-center justify-between pt-2 border-t border-teal-800 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold text-[10px]">
                    {exc.oldSize}
                  </span>
                  <span className="text-foam-600">→</span>
                  <span className="px-1.5 py-0.5 rounded bg-foam-300/20 text-foam-200 font-mono font-bold text-[10px]">
                    {exc.newSize}
                  </span>
                </div>
                <span className="text-[10px] text-foam-500 italic truncate max-w-[110px]">{exc.reason}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
};
