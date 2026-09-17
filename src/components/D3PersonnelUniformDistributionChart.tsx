import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  BarChart3, 
  Layers, 
  Columns3, 
  Percent, 
  Shield, 
  Sparkles, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Shirt, 
  Crown, 
  CheckCircle2, 
  X
} from 'lucide-react';
import { Personnel, DistributionRecord, Rank, UniformCategory } from '../types';

interface D3PersonnelUniformDistributionChartProps {
  personnel: Personnel[];
  distributions: DistributionRecord[];
  ranks: Rank[];
  language: 'mn' | 'en';
  onSelectRankFilter?: (rankName: string) => void;
  activeRankFilter?: string;
  selectedDeptName?: string;
}

type ChartLayout = 'stacked' | 'grouped' | 'percent';
type RankGroupMode = 'byRank' | 'byCategory';

interface RankUniformDataRow {
  key: string;
  displayName: string;
  subtitle: string;
  rankCategory?: string;
  level?: number;
  personnelCount: number;
  total: number;
  Outerwear: number;
  Headwear: number;
  Footwear: number;
  Innerwear: number;
  Accessories: number;
  Insignia: number;
  [key: string]: string | number | undefined;
}

const UNIFORM_CATEGORIES: { key: UniformCategory; labelMn: string; labelEn: string; color: string }[] = [
  { key: 'Outerwear', labelMn: 'Гадуур хувцас (Китель, Пальто)', labelEn: 'Outerwear (Tunic, Coat)', color: '#3B82F6' },
  { key: 'Headwear', labelMn: 'Малгай (Берет, Саравчит)', labelEn: 'Headwear (Cap, Beret)', color: '#10B981' },
  { key: 'Footwear', labelMn: 'Гутал (Берци, Ботинк)', labelEn: 'Footwear (Combat Boots)', color: '#F59E0B' },
  { key: 'Innerwear', labelMn: 'Дотуур цамц (Ёслолын, Хээрийн)', labelEn: 'Innerwear (Shirts)', color: '#8B5CF6' },
  { key: 'Accessories', labelMn: 'Хэрэглэл (Бүс, Бээлий, Зангиа)', labelEn: 'Accessories (Belt, Tie)', color: '#EC4899' },
  { key: 'Insignia', labelMn: 'Мөрдэс, Тэмдэг', labelEn: 'Insignia & Badges', color: '#06B6D4' }
];

const CATEGORY_COLOR_MAP: Record<UniformCategory, string> = {
  Outerwear: '#3B82F6',
  Headwear: '#10B981',
  Footwear: '#F59E0B',
  Innerwear: '#8B5CF6',
  Accessories: '#EC4899',
  Insignia: '#06B6D4'
};

const CATEGORY_NAMES: Record<UniformCategory, { mn: string; en: string }> = {
  Outerwear: { mn: 'Гадуур хувцас', en: 'Outerwear' },
  Headwear: { mn: 'Малгай', en: 'Headwear' },
  Footwear: { mn: 'Гутал', en: 'Footwear' },
  Innerwear: { mn: 'Дотуур цамц', en: 'Innerwear' },
  Accessories: { mn: 'Хэрэглэл', en: 'Accessories' },
  Insignia: { mn: 'Мөрдэс, тэмдэг', en: 'Insignia' }
};

const RANK_CATEGORY_TRANSLATION: Record<string, { mn: string; en: string }> = {
  'Senior Officer': { mn: 'Дээд офицер', en: 'Senior Officer' },
  'Officer': { mn: 'Офицер', en: 'Officer' },
  'Sergeant': { mn: 'Ахлагч', en: 'Sergeant' },
  'Conscript': { mn: 'Хугацаат цэрэг', en: 'Conscript' }
};

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  rankTitle: string;
  rankSubtitle?: string;
  category: UniformCategory;
  categoryLabel: string;
  count: number;
  totalForRank: number;
  percentageOfRank: number;
  personnelCount: number;
  avgPerPerson: number;
  color: string;
}

export const D3PersonnelUniformDistributionChart: React.FC<D3PersonnelUniformDistributionChartProps> = ({
  personnel,
  distributions,
  ranks,
  language,
  onSelectRankFilter,
  activeRankFilter,
  selectedDeptName
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [layout, setLayout] = useState<ChartLayout>('stacked');
  const [groupMode, setGroupMode] = useState<RankGroupMode>('byRank');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [hoveredCategory, setHoveredCategory] = useState<UniformCategory | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false,
    x: 0,
    y: 0,
    rankTitle: '',
    category: 'Outerwear',
    categoryLabel: '',
    count: 0,
    totalForRank: 0,
    percentageOfRank: 0,
    personnelCount: 0,
    avgPerPerson: 0,
    color: '#3B82F6'
  });

  // Calculate distribution data per Rank or per Rank Category
  const { chartData, categoryKeys, kpis } = useMemo(() => {
    const activeDists = distributions.filter(d => d.status === 'Issued');
    const categories: UniformCategory[] = ['Outerwear', 'Headwear', 'Footwear', 'Innerwear', 'Accessories', 'Insignia'];

    let totalItems = 0;
    const categoryTotals: Record<UniformCategory, number> = {
      Outerwear: 0,
      Headwear: 0,
      Footwear: 0,
      Innerwear: 0,
      Accessories: 0,
      Insignia: 0
    };

    const data: RankUniformDataRow[] = [];

    if (groupMode === 'byCategory') {
      const catOrder: Array<'Senior Officer' | 'Officer' | 'Sergeant' | 'Conscript'> = [
        'Senior Officer',
        'Officer',
        'Sergeant',
        'Conscript'
      ];

      catOrder.forEach(cat => {
        const catPersonnel = personnel.filter(p => p.rankCategory === cat);
        const catPersonIds = new Set(catPersonnel.map(p => p.id));
        const distsForCat = activeDists.filter(d => catPersonIds.has(d.personnelId));

        const row: RankUniformDataRow = {
          key: cat,
          displayName: language === 'mn' ? RANK_CATEGORY_TRANSLATION[cat]?.mn || cat : cat,
          subtitle: cat,
          personnelCount: catPersonnel.length,
          total: distsForCat.length,
          Outerwear: 0,
          Headwear: 0,
          Footwear: 0,
          Innerwear: 0,
          Accessories: 0,
          Insignia: 0
        };

        categories.forEach(c => {
          const count = distsForCat.filter(d => d.category === c).length;
          row[c] = count;
          categoryTotals[c] += count;
          totalItems += count;
        });

        if (row.personnelCount > 0 || row.total > 0) {
          data.push(row);
        }
      });

    } else {
      // By individual rank
      const rankMap = new Map<string, {
        rankObj?: Rank;
        personnelList: Personnel[];
      }>();

      ranks.forEach(r => {
        rankMap.set(r.nameMn, { rankObj: r, personnelList: [] });
      });

      personnel.forEach(p => {
        if (!rankMap.has(p.rankName)) {
          rankMap.set(p.rankName, { personnelList: [p] });
        } else {
          rankMap.get(p.rankName)!.personnelList.push(p);
        }
      });

      rankMap.forEach((val, rankName) => {
        const pList = val.personnelList;
        if (pList.length === 0) return; // Skip ranks with no personnel

        const pIds = new Set(pList.map(p => p.id));
        const distsForRank = activeDists.filter(d => pIds.has(d.personnelId));

        const row: RankUniformDataRow = {
          key: rankName,
          displayName: rankName,
          subtitle: val.rankObj?.nameEn || rankName,
          rankCategory: pList[0]?.rankCategory || val.rankObj?.category || 'Officer',
          level: val.rankObj?.level || 99,
          personnelCount: pList.length,
          total: distsForRank.length,
          Outerwear: 0,
          Headwear: 0,
          Footwear: 0,
          Innerwear: 0,
          Accessories: 0,
          Insignia: 0
        };

        categories.forEach(c => {
          const count = distsForRank.filter(d => d.category === c).length;
          row[c] = count;
          categoryTotals[c] += count;
          totalItems += count;
        });

        data.push(row);
      });

      // Sort by military rank seniority level
      data.sort((a, b) => (a.level || 0) - (b.level || 0));
    }

    // Determine highest equipped category and rank
    let topCategory: UniformCategory = 'Outerwear';
    let maxCatCount = -1;
    (Object.entries(categoryTotals) as [UniformCategory, number][]).forEach(([cat, count]) => {
      if (count > maxCatCount) {
        maxCatCount = count;
        topCategory = cat;
      }
    });

    let topRankName = '';
    let maxRankUniforms = 0;
    data.forEach(d => {
      if (d.total > maxRankUniforms) {
        maxRankUniforms = d.total;
        topRankName = d.displayName;
      }
    });

    const avgUniformsPerSoldier = personnel.length > 0 ? (totalItems / personnel.length).toFixed(1) : '0';

    return {
      chartData: data,
      categoryKeys: categories,
      kpis: {
        totalItems,
        topCategory,
        topCategoryCount: maxCatCount,
        topRankName,
        maxRankUniforms,
        avgUniformsPerSoldier
      }
    };
  }, [personnel, distributions, ranks, groupMode, language]);

  // Render D3 chart with responsive dimensions
  useEffect(() => {
    if (!isExpanded || !svgRef.current || !containerRef.current || chartData.length === 0) {
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = 320;
    const margin = { top: 20, right: 20, bottom: 50, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('style', 'max-width: 100%; height: auto;');

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale
    const x0 = d3.scaleBand()
      .domain(chartData.map(d => d.displayName))
      .rangeRound([0, innerWidth])
      .paddingInner(0.25)
      .paddingOuter(0.15);

    // Grid lines helper
    const makeYGridlines = (yScale: d3.ScaleLinear<number, number>) => {
      return d3.axisLeft(yScale).ticks(5);
    };

    if (layout === 'grouped') {
      // GROUPED BAR CHART
      const x1 = d3.scaleBand<string>()
        .domain(categoryKeys)
        .rangeRound([0, x0.bandwidth()])
        .padding(0.08);

      const maxGroupVal = d3.max(chartData, (d: RankUniformDataRow) => {
        return Math.max(...categoryKeys.map(key => (d[key] as number) || 0));
      }) || 10;

      const y = d3.scaleLinear()
        .domain([0, Math.ceil(maxGroupVal * 1.15) || 5])
        .nice()
        .rangeRound([innerHeight, 0]);

      // Add Grid lines
      g.append('g')
        .attr('class', 'grid')
        .call(
          makeYGridlines(y)
            .tickSize(-innerWidth)
            .tickFormat(() => '')
        )
        .call(gAxis => gAxis.select('.domain').remove())
        .selectAll('line')
        .attr('stroke', '#1B2A52')
        .attr('stroke-opacity', 0.35)
        .attr('stroke-dasharray', '3 3');

      // Draw Grouped Bars
      const rankGroups = g.selectAll('.rank-group')
        .data(chartData)
        .enter()
        .append('g')
        .attr('class', 'rank-group')
        .attr('transform', (d: any) => `translate(${x0(d.displayName)},0)`)
        .attr('cursor', 'pointer')
        .on('click', (_event: any, d: any) => {
          if (onSelectRankFilter) {
            onSelectRankFilter(d.displayName);
          }
        });

      categoryKeys.forEach(cat => {
        rankGroups.append('rect')
          .attr('x', x1(cat)!)
          .attr('y', innerHeight)
          .attr('width', x1.bandwidth())
          .attr('height', 0)
          .attr('fill', CATEGORY_COLOR_MAP[cat])
          .attr('rx', 3)
          .attr('opacity', () => {
            if (hoveredCategory && hoveredCategory !== cat) return 0.25;
            return 0.9;
          })
          .on('mouseenter', (event: MouseEvent, d: RankUniformDataRow) => {
            const count = (d[cat] as number) || 0;
            const totalForRank = d.total || 1;
            const pct = Math.round((count / totalForRank) * 100);
            const avg = d.personnelCount > 0 ? (count / d.personnelCount).toFixed(1) : 0;

            const rectBounds = (event.currentTarget as SVGRectElement).getBoundingClientRect();
            const containerBounds = container.getBoundingClientRect();

            setTooltip({
              visible: true,
              x: rectBounds.left - containerBounds.left + rectBounds.width / 2,
              y: rectBounds.top - containerBounds.top - 10,
              rankTitle: d.displayName,
              rankSubtitle: d.subtitle,
              category: cat,
              categoryLabel: language === 'mn' ? CATEGORY_NAMES[cat].mn : CATEGORY_NAMES[cat].en,
              count,
              totalForRank,
              percentageOfRank: pct,
              personnelCount: d.personnelCount,
              avgPerPerson: Number(avg),
              color: CATEGORY_COLOR_MAP[cat]
            });
          })
          .on('mouseleave', () => {
            setTooltip(prev => ({ ...prev, visible: false }));
          })
          .transition()
          .duration(500)
          .delay((_d, i) => i * 30)
          .attr('y', d => y((d[cat] as number) || 0))
          .attr('height', d => Math.max(0, innerHeight - y((d[cat] as number) || 0)));
      });

      // Y Axis
      const yAxis = d3.axisLeft(y)
        .ticks(5)
        .tickFormat(d => `${d}`);

      g.append('g')
        .attr('class', 'y-axis')
        .call(yAxis)
        .call(gAxis => gAxis.select('.domain').remove())
        .selectAll('text')
        .attr('fill', '#7ECDA0')
        .attr('font-size', '11px')
        .attr('font-family', 'monospace');

    } else if (layout === 'percent') {
      // 100% NORMALIZED STACKED BARS
      const normalizedData = chartData.map(d => {
        const row: any = { ...d };
        const total = d.total || 1;
        categoryKeys.forEach(k => {
          row[k] = total > 0 ? (((d[k] as number) || 0) / total) * 100 : 0;
        });
        return row;
      });

      const stack = d3.stack<any>()
        .keys(categoryKeys);

      const series = stack(normalizedData);

      const y = d3.scaleLinear()
        .domain([0, 100])
        .rangeRound([innerHeight, 0]);

      // Grid lines
      g.append('g')
        .attr('class', 'grid')
        .call(
          makeYGridlines(y)
            .tickSize(-innerWidth)
            .tickFormat(() => '')
        )
        .call(gAxis => gAxis.select('.domain').remove())
        .selectAll('line')
        .attr('stroke', '#1B2A52')
        .attr('stroke-opacity', 0.35)
        .attr('stroke-dasharray', '3 3');

      // Draw Layers
      const layer = g.selectAll('.layer')
        .data(series)
        .enter()
        .append('g')
        .attr('class', 'layer')
        .attr('fill', d => CATEGORY_COLOR_MAP[d.key as UniformCategory]);

      layer.selectAll('rect')
        .data(d => d.map(item => ({ ...item, key: d.key })))
        .enter()
        .append('rect')
        .attr('x', (d: any) => x0(d.data.displayName)!)
        .attr('y', innerHeight)
        .attr('width', x0.bandwidth())
        .attr('height', 0)
        .attr('opacity', (d: any) => {
          if (hoveredCategory && hoveredCategory !== d.key) return 0.25;
          return 0.92;
        })
        .attr('cursor', 'pointer')
        .on('click', (_event: any, d: any) => {
          if (onSelectRankFilter) {
            onSelectRankFilter(d.data.displayName);
          }
        })
        .on('mouseenter', (event: MouseEvent, d: any) => {
          const cat = d.key as UniformCategory;
          const origRow = chartData.find(cd => cd.displayName === d.data.displayName);
          const totalForRank = origRow?.total || 1;
          const count = origRow ? ((origRow[cat] as number) || 0) : 0;
          const pct = Math.round(d[1] - d[0]);
          const avg = origRow && origRow.personnelCount > 0 ? (count / origRow.personnelCount).toFixed(1) : 0;

          const rectBounds = (event.currentTarget as SVGRectElement).getBoundingClientRect();
          const containerBounds = container.getBoundingClientRect();

          setTooltip({
            visible: true,
            x: rectBounds.left - containerBounds.left + rectBounds.width / 2,
            y: rectBounds.top - containerBounds.top - 10,
            rankTitle: d.data.displayName,
            rankSubtitle: d.data.subtitle,
            category: cat,
            categoryLabel: language === 'mn' ? CATEGORY_NAMES[cat].mn : CATEGORY_NAMES[cat].en,
            count,
            totalForRank,
            percentageOfRank: pct,
            personnelCount: d.data.personnelCount,
            avgPerPerson: Number(avg),
            color: CATEGORY_COLOR_MAP[cat]
          });
        })
        .on('mouseleave', () => {
          setTooltip(prev => ({ ...prev, visible: false }));
        })
        .transition()
        .duration(500)
        .delay((_d, i) => i * 25)
        .attr('y', (d: any) => y(d[1]))
        .attr('height', (d: any) => Math.max(0, y(d[0]) - y(d[1])));

      // Y Axis
      const yAxis = d3.axisLeft(y)
        .ticks(5)
        .tickFormat(d => `${d}%`);

      g.append('g')
        .attr('class', 'y-axis')
        .call(yAxis)
        .call(gAxis => gAxis.select('.domain').remove())
        .selectAll('text')
        .attr('fill', '#7ECDA0')
        .attr('font-size', '11px')
        .attr('font-family', 'monospace');

    } else {
      // STANDARD STACKED BAR CHART
      const stack = d3.stack<RankUniformDataRow>()
        .keys(categoryKeys);

      const series = stack(chartData);

      const maxTotal = d3.max(chartData, (d: RankUniformDataRow) => d.total) || 20;

      const y = d3.scaleLinear()
        .domain([0, Math.ceil(maxTotal * 1.15) || 10])
        .nice()
        .rangeRound([innerHeight, 0]);

      // Grid lines
      g.append('g')
        .attr('class', 'grid')
        .call(
          makeYGridlines(y)
            .tickSize(-innerWidth)
            .tickFormat(() => '')
        )
        .call(gAxis => gAxis.select('.domain').remove())
        .selectAll('line')
        .attr('stroke', '#1B2A52')
        .attr('stroke-opacity', 0.35)
        .attr('stroke-dasharray', '3 3');

      // Draw Stacked Layers
      const layer = g.selectAll('.layer')
        .data(series)
        .enter()
        .append('g')
        .attr('class', 'layer')
        .attr('fill', d => CATEGORY_COLOR_MAP[d.key as UniformCategory]);

      layer.selectAll('rect')
        .data(d => d.map(item => ({ ...item, key: d.key })))
        .enter()
        .append('rect')
        .attr('x', (d: any) => x0(d.data.displayName)!)
        .attr('y', innerHeight)
        .attr('width', x0.bandwidth())
        .attr('height', 0)
        .attr('opacity', (d: any) => {
          if (hoveredCategory && hoveredCategory !== d.key) return 0.25;
          return 0.92;
        })
        .attr('cursor', 'pointer')
        .on('click', (_event: any, d: any) => {
          if (onSelectRankFilter) {
            onSelectRankFilter(d.data.displayName);
          }
        })
        .on('mouseenter', (event: MouseEvent, d: any) => {
          const cat = d.key as UniformCategory;
          const count = (d.data[cat] as number) || 0;
          const totalForRank = (d.data.total as number) || 1;
          const pct = Math.round((count / totalForRank) * 100);
          const avg = d.data.personnelCount > 0 ? (count / d.data.personnelCount).toFixed(1) : 0;

          const rectBounds = (event.currentTarget as SVGRectElement).getBoundingClientRect();
          const containerBounds = container.getBoundingClientRect();

          setTooltip({
            visible: true,
            x: rectBounds.left - containerBounds.left + rectBounds.width / 2,
            y: rectBounds.top - containerBounds.top - 10,
            rankTitle: d.data.displayName,
            rankSubtitle: d.data.subtitle,
            category: cat,
            categoryLabel: language === 'mn' ? CATEGORY_NAMES[cat].mn : CATEGORY_NAMES[cat].en,
            count,
            totalForRank,
            percentageOfRank: pct,
            personnelCount: d.data.personnelCount,
            avgPerPerson: Number(avg),
            color: CATEGORY_COLOR_MAP[cat]
          });
        })
        .on('mouseleave', () => {
          setTooltip(prev => ({ ...prev, visible: false }));
        })
        .transition()
        .duration(500)
        .delay((_d, i) => i * 25)
        .attr('y', (d: any) => y(d[1]))
        .attr('height', (d: any) => Math.max(0, y(d[0]) - y(d[1])));

      // Y Axis
      const yAxis = d3.axisLeft(y)
        .ticks(5)
        .tickFormat(d => `${d}`);

      g.append('g')
        .attr('class', 'y-axis')
        .call(yAxis)
        .call(gAxis => gAxis.select('.domain').remove())
        .selectAll('text')
        .attr('fill', '#7ECDA0')
        .attr('font-size', '11px')
        .attr('font-family', 'monospace');
    }

    // X Axis
    const xAxis = d3.axisBottom(x0)
      .tickSize(4);

    const xAxisGroup = g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select('.domain')
      .attr('stroke', '#22335F');

    xAxisGroup.selectAll('line')
      .attr('stroke', '#22335F');

    xAxisGroup.selectAll('text')
      .attr('fill', '#A8FFD1')
      .attr('font-size', chartData.length > 8 ? '10px' : '11px')
      .attr('font-weight', '500')
      .attr('transform', groupMode === 'byRank' && chartData.length > 5 ? 'rotate(-20)' : 'rotate(0)')
      .attr('text-anchor', groupMode === 'byRank' && chartData.length > 5 ? 'end' : 'middle')
      .attr('dx', groupMode === 'byRank' && chartData.length > 5 ? '-6px' : '0px')
      .attr('dy', groupMode === 'byRank' && chartData.length > 5 ? '4px' : '10px');

  }, [chartData, layout, groupMode, categoryKeys, isExpanded, hoveredCategory, language, onSelectRankFilter]);

  return (
    <div className="bg-teal-900/90 border border-teal-800 rounded-2xl p-5 shadow-xl transition-all duration-300 space-y-4">
      {/* Header & Mode Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-teal-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-foam-300/10 border border-foam-300/20 text-foam-300">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-foam-50 flex items-center gap-2">
              {language === 'mn' 
                ? 'Цолны зэрэглэл дэх дүрэмт хувцасны төрлийн тархалт (D3.js)' 
                : 'Uniform Type Distribution across Personnel Ranks (D3.js)'}
            </h3>
            {selectedDeptName && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-800 text-foam-200 border border-teal-700">
                {selectedDeptName}
              </span>
            )}
          </div>
          <p className="text-xs text-foam-500 mt-0.5">
            {language === 'mn'
              ? 'Цэргийн албан хаагчдын цол, зэрэглэл тус бүрт олгогдсон дүрэмт хувцасны төрлүүдийн (Гадуур, Малгай, Гутал, Дотуур цамц г.м) харьцаа.'
              : 'Interactive D3 visualization showing the distribution of uniform categories across military ranks.'}
          </p>
        </div>

        {/* View Controls & Action Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Rank Granularity: By Rank vs By Category */}
          <div className="flex items-center bg-teal-950 p-0.5 rounded-xl border border-teal-800 text-xs">
            <button
              type="button"
              id="d3-filter-by-rank"
              onClick={() => setGroupMode('byRank')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                groupMode === 'byRank'
                  ? 'bg-foam-300 text-teal-950 font-bold shadow-sm'
                  : 'text-foam-500 hover:text-foam-100'
              }`}
            >
              {language === 'mn' ? 'Цол бүрээр' : 'By Rank'}
            </button>
            <button
              type="button"
              id="d3-filter-by-category"
              onClick={() => setGroupMode('byCategory')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                groupMode === 'byCategory'
                  ? 'bg-foam-300 text-teal-950 font-bold shadow-sm'
                  : 'text-foam-500 hover:text-foam-100'
              }`}
            >
              {language === 'mn' ? 'Зэрэглэлээр' : 'By Rank Tier'}
            </button>
          </div>

          {/* D3 Bar Presentation Mode: Stacked vs Grouped vs 100% */}
          <div className="flex items-center bg-teal-950 p-0.5 rounded-xl border border-teal-800 text-xs">
            <button
              type="button"
              id="d3-mode-stacked"
              onClick={() => setLayout('stacked')}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition cursor-pointer ${
                layout === 'stacked'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-foam-500 hover:text-foam-100'
              }`}
              title={language === 'mn' ? 'Давхарласан багана (Нийт тоо)' : 'Stacked bar chart'}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{language === 'mn' ? 'Давхарласан' : 'Stacked'}</span>
            </button>

            <button
              type="button"
              id="d3-mode-grouped"
              onClick={() => setLayout('grouped')}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition cursor-pointer ${
                layout === 'grouped'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-foam-500 hover:text-foam-100'
              }`}
              title={language === 'mn' ? 'Зэрэгцүүлсэн багана' : 'Grouped / Clustered bar chart'}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>{language === 'mn' ? 'Зэрэгцээ' : 'Grouped'}</span>
            </button>

            <button
              type="button"
              id="d3-mode-percent"
              onClick={() => setLayout('percent')}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition cursor-pointer ${
                layout === 'percent'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-foam-500 hover:text-foam-100'
              }`}
              title={language === 'mn' ? '100% Хувийн харьцаа' : '100% normalized ratio'}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>100%</span>
            </button>
          </div>

          {/* Expand / Collapse Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-teal-800/80 hover:bg-teal-750 text-foam-200 transition cursor-pointer"
            title={isExpanded ? (language === 'mn' ? 'Хураах' : 'Collapse') : (language === 'mn' ? 'Дэлгэх' : 'Expand')}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Key Metric KPI Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-teal-950/70 border border-teal-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-foam-500 font-medium">
                <Shirt className="w-3.5 h-3.5 text-blue-400" />
                <span>{language === 'mn' ? 'Олгогдсон хувцас' : 'Total Uniforms'}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-bold font-mono text-blue-400">
                  {kpis.totalItems}
                </span>
                <span className="text-[10px] text-foam-500">{language === 'mn' ? 'ком иж бүрдэл' : 'items issued'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-teal-950/70 border border-teal-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-foam-500 font-medium">
                <Crown className="w-3.5 h-3.5 text-foam-300" />
                <span>{language === 'mn' ? 'Тэргүүлэх төрөл' : 'Top Category'}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-sm sm:text-base font-bold text-foam-200 truncate max-w-[140px]">
                  {language === 'mn' ? CATEGORY_NAMES[kpis.topCategory].mn : CATEGORY_NAMES[kpis.topCategory].en}
                </span>
                <span className="text-[10px] text-foam-500 font-mono">({kpis.topCategoryCount})</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-teal-950/70 border border-teal-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-foam-500 font-medium">
                <Shield className="w-3.5 h-3.5 text-foam-300" />
                <span>{language === 'mn' ? 'Их олгогдсон цол' : 'Most Equipped Rank'}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-sm sm:text-base font-bold text-foam-200 truncate max-w-[140px]">
                  {kpis.topRankName || '-'}
                </span>
                <span className="text-[10px] text-foam-500 font-mono">({kpis.maxRankUniforms})</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-teal-950/70 border border-teal-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-foam-500 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                <span>{language === 'mn' ? 'Нэг хүнд ногдох' : 'Avg Per Soldier'}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-bold font-mono text-purple-300">
                  {kpis.avgUniformsPerSoldier}
                </span>
                <span className="text-[10px] text-foam-500">{language === 'mn' ? 'ком/цэрэг' : 'uniforms/trooper'}</span>
              </div>
            </div>
          </div>

          {/* Interactive D3 Canvas Container */}
          <div ref={containerRef} className="relative w-full overflow-hidden pt-1">
            <svg ref={svgRef} className="w-full select-none" />

            {/* Custom High-Contrast Tooltip */}
            {tooltip.visible && (
              <div
                className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 bg-teal-950/95 border border-teal-700/90 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[220px] animate-in fade-in zoom-in-95 duration-150"
                style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-teal-800 gap-2">
                  <div>
                    <div className="font-bold text-sm text-foam-50 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-foam-300" />
                      <span>{tooltip.rankTitle}</span>
                    </div>
                    {tooltip.rankSubtitle && tooltip.rankSubtitle !== tooltip.rankTitle && (
                      <div className="text-[10px] text-foam-500">{tooltip.rankSubtitle}</div>
                    )}
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold text-teal-950"
                    style={{ backgroundColor: tooltip.color }}
                  >
                    {tooltip.categoryLabel}
                  </span>
                </div>

                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-foam-200">
                    <span className="text-foam-500 font-sans">{language === 'mn' ? 'Тус төрлийн тоо:' : 'Category Count:'}</span>
                    <strong className="text-foam-50 font-bold">{tooltip.count} {language === 'mn' ? 'ком' : 'items'}</strong>
                  </div>
                  <div className="flex items-center justify-between text-foam-200">
                    <span className="text-foam-500 font-sans">{language === 'mn' ? 'Нийт хувцаснаас:' : 'Share of Total:'}</span>
                    <strong className="text-foam-200 font-bold">{tooltip.percentageOfRank}%</strong>
                  </div>
                  <div className="flex items-center justify-between text-foam-200 pt-1 border-t border-teal-800">
                    <span className="text-foam-500 font-sans">{language === 'mn' ? 'Албан хаагчийн тоо:' : 'Soldier Headcount:'}</span>
                    <strong className="text-foam-100">{tooltip.personnelCount} {language === 'mn' ? 'хүн' : 'troops'}</strong>
                  </div>
                  <div className="flex items-center justify-between text-foam-200">
                    <span className="text-foam-500 font-sans">{language === 'mn' ? 'Нэг цэрэгт ногдох:' : 'Avg per Soldier:'}</span>
                    <strong className="text-foam-200 font-bold">{tooltip.avgPerPerson} ком</strong>
                  </div>
                </div>

                {onSelectRankFilter && (
                  <div className="pt-1 text-[10px] text-blue-400 font-sans flex items-center gap-1 border-t border-teal-800">
                    <Filter className="w-2.5 h-2.5" />
                    <span>{language === 'mn' ? 'Багана дээр дарж шүүнэ' : 'Click bar to filter soldiers'}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Legend with Category Hover Filters */}
          <div className="pt-2 border-t border-teal-800/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-foam-500 text-[11px] font-semibold mr-1">
                {language === 'mn' ? 'Хувцасны төрөл:' : 'Uniform Categories:'}
              </span>
              {UNIFORM_CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onMouseEnter={() => setHoveredCategory(cat.key)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                    hoveredCategory === cat.key
                      ? 'bg-teal-800 text-foam-50 ring-1 ring-foam-300'
                      : 'bg-teal-950/70 text-foam-200 hover:bg-teal-800 border border-teal-800'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{language === 'mn' ? cat.labelMn.split(' ')[0] : cat.labelEn.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {activeRankFilter && (
              <div className="flex items-center gap-1.5 text-[11px] text-blue-400 font-medium">
                <span>{language === 'mn' ? 'Идэвхтэй шүүлтүүр:' : 'Active Rank Filter:'}</span>
                <span className="font-mono bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30">
                  {activeRankFilter}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectRankFilter && onSelectRankFilter('')}
                  className="hover:text-blue-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* User Tip */}
          <div className="flex items-center gap-1.5 text-[11px] text-foam-500 pt-1">
            <Sparkles className="w-3.5 h-3.5 text-foam-300 shrink-0" />
            <span>
              {language === 'mn'
                ? 'Зөвлөмж: Графикийн аль нэг багана дээр дарж тухайн цолтой цэргүүдийн жагсаалтыг доор шууд шүүн харна уу.'
                : 'Tip: Click any bar in the D3 chart to instantly filter and inspect soldiers of that specific rank below.'}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
