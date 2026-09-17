import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  BarChart3, 
  Shield, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Users, 
  Percent, 
  Layers,
  ChevronDown,
  ChevronUp,
  Filter,
  Sparkles
} from 'lucide-react';
import { Personnel, DistributionRecord, Rank } from '../types';

interface PersonnelRankUniformRatioChartProps {
  personnel: Personnel[];
  distributions: DistributionRecord[];
  ranks: Rank[];
  language: 'mn' | 'en';
  onSelectRankFilter?: (rankName: string) => void;
  activeRankFilter?: string;
  selectedDeptName?: string;
}

type GroupingMode = 'byRank' | 'byCategory';
type MetricDisplay = 'count' | 'percentage';

const RANK_CATEGORY_TRANSLATION: Record<string, { mn: string; en: string; color: string; bg: string }> = {
  'Senior Officer': { mn: 'Дээд офицер', en: 'Senior Officer', color: '#F59E0B', bg: 'bg-foam-300/10 border-foam-300/30 text-foam-200' },
  'Officer': { mn: 'Офицер', en: 'Officer', color: '#3B82F6', bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300' },
  'Sergeant': { mn: 'Ахлагч', en: 'Sergeant', color: '#10B981', bg: 'bg-foam-300/10 border-foam-300/30 text-foam-200' },
  'Conscript': { mn: 'Хугацаат цэрэг', en: 'Conscript', color: '#8B5CF6', bg: 'bg-purple-500/10 border-purple-500/30 text-purple-300' },
};

export const PersonnelRankUniformRatioChart: React.FC<PersonnelRankUniformRatioChartProps> = ({
  personnel,
  distributions,
  ranks,
  language,
  onSelectRankFilter,
  activeRankFilter,
  selectedDeptName
}) => {
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('byRank');
  const [metricDisplay, setMetricDisplay] = useState<MetricDisplay>('count');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Calculate assigned vs unassigned metrics across ranks
  const { chartData, summaryStats } = useMemo(() => {
    const activeDists = distributions.filter(d => d.status === 'Issued');

    if (groupingMode === 'byCategory') {
      const categories: Array<'Senior Officer' | 'Officer' | 'Sergeant' | 'Conscript'> = [
        'Senior Officer',
        'Officer',
        'Sergeant',
        'Conscript'
      ];

      let totalAssignedAll = 0;
      let totalUnassignedAll = 0;
      let totalQuotaAll = 0;
      let totalPersonnelAll = 0;

      const data = categories.map(cat => {
        const catPersonnel = personnel.filter(p => p.rankCategory === cat);
        const catPersonIds = new Set(catPersonnel.map(p => p.id));
        const assignedItems = activeDists.filter(d => catPersonIds.has(d.personnelId));
        
        const pCount = catPersonnel.length;
        // Standard kit quota: 4 uniform items per soldier (Service dress, BDU, Boots, Headwear)
        const requiredQuota = Math.max(assignedItems.length, pCount * 4);
        const assignedCount = assignedItems.length;
        const unassignedCount = Math.max(0, requiredQuota - assignedCount);

        const assignedRatio = requiredQuota > 0 ? Math.round((assignedCount / requiredQuota) * 100) : 0;
        const unassignedRatio = 100 - assignedRatio;

        // Fully equipped vs incomplete
        let fullyEquipped = 0;
        let pending = 0;
        catPersonnel.forEach(p => {
          const issuedCount = activeDists.filter(d => d.personnelId === p.id).length;
          if (issuedCount >= 4) fullyEquipped++;
          else if (issuedCount === 0) pending++;
        });

        totalAssignedAll += assignedCount;
        totalUnassignedAll += unassignedCount;
        totalQuotaAll += requiredQuota;
        totalPersonnelAll += pCount;

        const catInfo = RANK_CATEGORY_TRANSLATION[cat];

        return {
          key: cat,
          displayName: language === 'mn' ? catInfo.mn : catInfo.en,
          categoryName: cat,
          personnelCount: pCount,
          assignedCount,
          unassignedCount,
          requiredQuota,
          assignedRatio,
          unassignedRatio,
          fullyEquipped,
          pending,
          // for display in percent view
          displayAssigned: metricDisplay === 'percentage' ? assignedRatio : assignedCount,
          displayUnassigned: metricDisplay === 'percentage' ? unassignedRatio : unassignedCount,
        };
      }).filter(item => item.personnelCount > 0 || item.assignedCount > 0);

      const overallRatio = totalQuotaAll > 0 ? Math.round((totalAssignedAll / totalQuotaAll) * 100) : 0;

      return {
        chartData: data,
        summaryStats: {
          totalAssigned: totalAssignedAll,
          totalUnassigned: totalUnassignedAll,
          totalQuota: totalQuotaAll,
          overallRatio,
          totalPersonnel: totalPersonnelAll
        }
      };
    } else {
      // By individual rank
      // Group personnel by rank name
      const rankMap = new Map<string, {
        rankObj?: Rank;
        personnelList: Personnel[];
      }>();

      // Initialize with ranks in order
      ranks.forEach(r => {
        rankMap.set(r.nameMn, { rankObj: r, personnelList: [] });
      });

      // Populate personnel
      personnel.forEach(p => {
        if (!rankMap.has(p.rankName)) {
          rankMap.set(p.rankName, { personnelList: [p] });
        } else {
          rankMap.get(p.rankName)!.personnelList.push(p);
        }
      });

      let totalAssignedAll = 0;
      let totalUnassignedAll = 0;
      let totalQuotaAll = 0;
      let totalPersonnelAll = 0;

      const data: any[] = [];

      rankMap.forEach((val, rankName) => {
        const pList = val.personnelList;
        const pCount = pList.length;
        if (pCount === 0) return; // Skip ranks with 0 personnel in the current filter

        const pIds = new Set(pList.map(p => p.id));
        const assignedItems = activeDists.filter(d => pIds.has(d.personnelId));

        // Standard 4 items per soldier kit
        const requiredQuota = Math.max(assignedItems.length, pCount * 4);
        const assignedCount = assignedItems.length;
        const unassignedCount = Math.max(0, requiredQuota - assignedCount);

        const assignedRatio = requiredQuota > 0 ? Math.round((assignedCount / requiredQuota) * 100) : 0;
        const unassignedRatio = 100 - assignedRatio;

        let fullyEquipped = 0;
        let pending = 0;
        pList.forEach(p => {
          const issuedCount = activeDists.filter(d => d.personnelId === p.id).length;
          if (issuedCount >= 4) fullyEquipped++;
          else if (issuedCount === 0) pending++;
        });

        totalAssignedAll += assignedCount;
        totalUnassignedAll += unassignedCount;
        totalQuotaAll += requiredQuota;
        totalPersonnelAll += pCount;

        const rankCategory = pList[0]?.rankCategory || val.rankObj?.category || 'Officer';

        data.push({
          key: rankName,
          displayName: rankName,
          rankNameEn: val.rankObj?.nameEn || rankName,
          categoryName: rankCategory,
          personnelCount: pCount,
          assignedCount,
          unassignedCount,
          requiredQuota,
          assignedRatio,
          unassignedRatio,
          fullyEquipped,
          pending,
          level: val.rankObj?.level || 99,
          displayAssigned: metricDisplay === 'percentage' ? assignedRatio : assignedCount,
          displayUnassigned: metricDisplay === 'percentage' ? unassignedRatio : unassignedCount,
        });
      });

      // Sort by rank hierarchy level
      data.sort((a, b) => a.level - b.level);

      const overallRatio = totalQuotaAll > 0 ? Math.round((totalAssignedAll / totalQuotaAll) * 100) : 0;

      return {
        chartData: data,
        summaryStats: {
          totalAssigned: totalAssignedAll,
          totalUnassigned: totalUnassignedAll,
          totalQuota: totalQuotaAll,
          overallRatio,
          totalPersonnel: totalPersonnelAll
        }
      };
    }
  }, [personnel, distributions, ranks, groupingMode, metricDisplay, language]);

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const catInfo = RANK_CATEGORY_TRANSLATION[data.categoryName] || {
        mn: data.categoryName,
        en: data.categoryName,
        bg: 'bg-teal-800 text-foam-200'
      };

      return (
        <div className="bg-teal-950/95 border border-teal-700/80 p-4 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2.5 min-w-[240px]">
          <div className="flex items-center justify-between pb-2 border-b border-teal-800">
            <div>
              <div className="font-bold text-sm text-foam-50 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                {data.displayName}
              </div>
              {data.rankNameEn && data.rankNameEn !== data.displayName && (
                <div className="text-[10px] text-foam-500 font-medium">{data.rankNameEn}</div>
              )}
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${catInfo.bg}`}>
              {language === 'mn' ? catInfo.mn : catInfo.en}
            </span>
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-foam-200">
              <span className="text-foam-500 font-sans flex items-center gap-1">
                <Users className="w-3 h-3 text-foam-500" />
                {language === 'mn' ? 'Нийт албан хаагч:' : 'Personnel Count:'}
              </span>
              <strong className="text-foam-50">{data.personnelCount} {language === 'mn' ? 'хүн' : 'troops'}</strong>
            </div>

            <div className="flex items-center justify-between text-foam-300">
              <span className="flex items-center gap-1 font-sans">
                <span className="w-2 h-2 rounded-sm bg-foam-300"></span>
                {language === 'mn' ? 'Олгогдсон хувцас:' : 'Assigned Uniforms:'}
              </span>
              <strong className="text-foam-200">
                {data.assignedCount} ком ({data.assignedRatio}%)
              </strong>
            </div>

            <div className="flex items-center justify-between text-foam-300">
              <span className="flex items-center gap-1 font-sans">
                <span className="w-2 h-2 rounded-sm bg-foam-300"></span>
                {language === 'mn' ? 'Олгогдоогүй / Хүлээгдэж буй:' : 'Unassigned / Pending:'}
              </span>
              <strong className="text-foam-200">
                {data.unassignedCount} ком ({data.unassignedRatio}%)
              </strong>
            </div>

            <div className="pt-1.5 border-t border-teal-800/80 flex items-center justify-between text-foam-500 text-[11px] font-sans">
              <span>{language === 'mn' ? 'Нийт хэрэгцээт норм:' : 'Total Kit Quota:'}</span>
              <span className="font-mono font-bold text-foam-100">{data.requiredQuota} ком</span>
            </div>
          </div>

          {onSelectRankFilter && (
            <div className="pt-1 text-[10px] text-blue-400 font-sans flex items-center gap-1 border-t border-teal-800/60">
              <Filter className="w-2.5 h-2.5" />
              {language === 'mn' ? 'Дарахад энэ цолоор шүүнэ' : 'Click bar to filter by this rank'}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-teal-900/90 border border-teal-800 rounded-2xl p-5 shadow-xl transition-all duration-300 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-teal-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-foam-50 flex items-center gap-2">
              {language === 'mn' ? 'Цолны зэрэглэлээрх дүрэмт хувцас олголтын харьцаа' : 'Assigned vs. Unassigned Uniform Ratio by Rank'}
            </h3>
            {selectedDeptName && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-800 text-foam-200 border border-teal-700">
                {selectedDeptName}
              </span>
            )}
          </div>
          <p className="text-xs text-foam-500 mt-0.5">
            {language === 'mn'
              ? 'Офицер, ахлагч, хугацаат цэргүүдийн хувцас олголтын хангалтын түвшин ба олгогдоогүй нормын харьцаа.'
              : 'Statistical ratio of assigned uniform kits versus unassigned / pending quotas across military ranks.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Grouping Mode */}
          <div className="flex items-center bg-teal-950 p-0.5 rounded-xl border border-teal-800 text-xs">
            <button
              type="button"
              onClick={() => setGroupingMode('byRank')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                groupingMode === 'byRank'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-foam-500 hover:text-foam-100'
              }`}
            >
              {language === 'mn' ? 'Цолоор' : 'By Rank'}
            </button>
            <button
              type="button"
              onClick={() => setGroupingMode('byCategory')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                groupingMode === 'byCategory'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-foam-500 hover:text-foam-100'
              }`}
            >
              {language === 'mn' ? 'Ангиллаар' : 'By Category'}
            </button>
          </div>

          {/* Metric Unit Mode */}
          <div className="flex items-center bg-teal-950 p-0.5 rounded-xl border border-teal-800 text-xs">
            <button
              type="button"
              onClick={() => setMetricDisplay('count')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                metricDisplay === 'count'
                  ? 'bg-foam-400 text-white font-semibold shadow-sm'
                  : 'text-foam-500 hover:text-foam-100'
              }`}
              title={language === 'mn' ? 'Тоогоор харах' : 'Display Counts'}
            >
              {language === 'mn' ? 'Тоогоор' : 'Count'}
            </button>
            <button
              type="button"
              onClick={() => setMetricDisplay('percentage')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                metricDisplay === 'percentage'
                  ? 'bg-foam-400 text-white font-semibold shadow-sm'
                  : 'text-foam-500 hover:text-foam-100'
              }`}
              title={language === 'mn' ? 'Хувиар (100%) харах' : 'Display Ratio %'}
            >
              % {language === 'mn' ? 'Харьцаа' : 'Ratio'}
            </button>
          </div>

          {/* Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-teal-800/80 hover:bg-teal-700 text-foam-200 transition"
            title={isExpanded ? (language === 'mn' ? 'Хураах' : 'Collapse') : (language === 'mn' ? 'Дэлгэх' : 'Expand')}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Summary KPI Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-teal-950/70 border border-teal-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-foam-500 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-foam-300" />
                <span>{language === 'mn' ? 'Олгогдсон хувцас' : 'Assigned Uniforms'}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-bold font-mono text-foam-300">
                  {summaryStats.totalAssigned}
                </span>
                <span className="text-[10px] text-foam-500">{language === 'mn' ? 'ком иж бүрдэл' : 'kits'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-teal-950/70 border border-teal-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-foam-500 font-medium">
                <Clock className="w-3.5 h-3.5 text-foam-300" />
                <span>{language === 'mn' ? 'Олгогдоогүй норм' : 'Unassigned Quota'}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-bold font-mono text-foam-300">
                  {summaryStats.totalUnassigned}
                </span>
                <span className="text-[10px] text-foam-500">{language === 'mn' ? 'ком дутуу' : 'pending'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-teal-950/70 border border-teal-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-foam-500 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                <span>{language === 'mn' ? 'Хангалтын харьцаа' : 'Assignment Ratio'}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-bold font-mono text-blue-400">
                  {summaryStats.overallRatio}%
                </span>
                <span className="text-[10px] text-foam-500">{language === 'mn' ? 'биелэлт' : 'rate'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-teal-950/70 border border-teal-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-foam-500 font-medium">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>{language === 'mn' ? 'Шинжлэгдсэн цэрэг' : 'Active Troops'}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-bold font-mono text-purple-300">
                  {summaryStats.totalPersonnel}
                </span>
                <span className="text-[10px] text-foam-500">{language === 'mn' ? 'албан хаагч' : 'soldiers'}</span>
              </div>
            </div>
          </div>

          {/* Recharts Data Visualization */}
          <div className="h-72 w-full pt-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length && onSelectRankFilter) {
                      const clickedRank = e.activePayload[0].payload.displayName;
                      onSelectRankFilter(clickedRank);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1B2A52" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="displayName"
                    stroke="#7ECDA0"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={groupingMode === 'byRank' ? -20 : 0}
                    textAnchor={groupingMode === 'byRank' ? 'end' : 'middle'}
                    height={40}
                  />
                  <YAxis
                    stroke="#7ECDA0"
                    fontSize={11}
                    tickLine={false}
                    unit={metricDisplay === 'percentage' ? '%' : ''}
                    domain={metricDisplay === 'percentage' ? [0, 100] : ['auto', 'auto']}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(51, 65, 85, 0.3)' }} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                    formatter={(value) => {
                      if (value === 'displayAssigned') {
                        return (
                          <span className="text-foam-200 font-medium">
                            {language === 'mn' ? 'Олгогдсон (Assigned)' : 'Assigned Uniforms'}
                          </span>
                        );
                      }
                      return (
                        <span className="text-foam-200 font-medium">
                          {language === 'mn' ? 'Олгогдоогүй норм (Unassigned)' : 'Unassigned Quota'}
                        </span>
                      );
                    }}
                  />
                  <Bar
                    dataKey="displayAssigned"
                    name="displayAssigned"
                    stackId="a"
                    fill="#39FF88"
                    radius={metricDisplay === 'percentage' ? [0, 0, 0, 0] : [0, 0, 4, 4]}
                    className="cursor-pointer transition-opacity hover:opacity-90"
                  />
                  <Bar
                    dataKey="displayUnassigned"
                    name="displayUnassigned"
                    stackId="a"
                    fill="#1B2A52"
                    radius={[6, 6, 0, 0]}
                    className="cursor-pointer transition-opacity hover:opacity-90"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-foam-500 text-xs">
                {language === 'mn' ? 'Шүүлтүүрт тохирох өгөгдөл олдсонгүй' : 'No rank distribution data available for current filter'}
              </div>
            )}
          </div>

          {/* Quick Guidance Footer Note */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-teal-800/80 text-[11px] text-foam-500">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-foam-300" />
              <span>
                {language === 'mn'
                  ? 'Зөвлөмж: Графикийн багана дээр дарж тухайн цолны албан хаагчдыг шууд шүүн харах боломжтой.'
                  : 'Pro-tip: Click any rank bar to instantly filter soldier profiles below.'}
              </span>
            </div>
            {activeRankFilter && (
              <div className="flex items-center gap-1.5 text-blue-400 font-medium">
                <span>{language === 'mn' ? 'Идэвхтэй шүүлтүүр:' : 'Active Rank Filter:'}</span>
                <span className="font-mono bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30">
                  {activeRankFilter}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
