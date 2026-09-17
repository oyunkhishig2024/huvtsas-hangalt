import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Shield, 
  Calendar, 
  Phone, 
  Mail, 
  Ruler, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeftRight, 
  ClipboardList,
  UserCheck,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useUniformData } from '../context/UniformDataContext';
import { Personnel, Rank, Department } from '../types';
import { PersonnelRankUniformRatioChart } from './PersonnelRankUniformRatioChart';
import { D3PersonnelUniformDistributionChart } from './D3PersonnelUniformDistributionChart';

interface PersonnelViewProps {
  onIssueToPersonnel: (person: Personnel) => void;
  initialCategoryFilter?: string;
  initialServiceTypeFilter?: 'Conscript' | 'Contract';
}

interface ExpiringUniformAlert {
  distId: string;
  uniformName: string;
  modelCode: string;
  expiryDate: string;
  daysRemaining: number;
  isExpired: boolean;
}

interface ExpiringPersonnelAlert {
  isExpiringSoon: boolean;
  isExpired: boolean;
  minDaysRemaining: number;
  expiringItems: ExpiringUniformAlert[];
  badgeText: string;
  tooltipText: string;
}

export const PersonnelView: React.FC<PersonnelViewProps> = ({ onIssueToPersonnel, initialCategoryFilter, initialServiceTypeFilter }) => {
  const { 
    personnel, 
    departments, 
    ranks, 
    distributions, 
    exchanges, 
    currentRole, 
    language,
    addPersonnel,
    updatePersonnel,
    deletePersonnel
  } = useUniformData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedRankCategoryFilter, setSelectedRankCategoryFilter] = useState(initialCategoryFilter || 'all');
  const [selectedServiceTypeFilter, setSelectedServiceTypeFilter] = useState<string>(initialServiceTypeFilter || 'all');
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState<'d3_distribution' | 'ratio_quota'>('d3_distribution');

  // Modals state
  const [selectedPersonForDetail, setSelectedPersonForDetail] = useState<Personnel | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Personnel | null>(null);

  // Automated notification calculation: Flag personnel with uniform expiring within 30 days or expired
  const expiringPersonnelMap = useMemo(() => {
    const map = new Map<string, ExpiringPersonnelAlert>();
    const now = new Date();
    const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    distributions.forEach(d => {
      if (d.status !== 'Issued' && d.status !== 'Expired') return;

      const expDate = new Date(d.expiryDate);
      const expDateTime = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate()).getTime();
      const daysRemaining = Math.ceil((expDateTime - todayTime) / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 30) {
        const isExpired = daysRemaining < 0 || d.status === 'Expired';
        const itemAlert: ExpiringUniformAlert = {
          distId: d.id,
          uniformName: d.uniformNameMn,
          modelCode: d.uniformModelCode,
          expiryDate: d.expiryDate,
          daysRemaining,
          isExpired
        };

        if (!map.has(d.personnelId)) {
          map.set(d.personnelId, {
            isExpiringSoon: true,
            isExpired,
            minDaysRemaining: daysRemaining,
            expiringItems: [itemAlert],
            badgeText: '',
            tooltipText: ''
          });
        } else {
          const current = map.get(d.personnelId)!;
          current.expiringItems.push(itemAlert);
          if (daysRemaining < current.minDaysRemaining) {
            current.minDaysRemaining = daysRemaining;
          }
          if (isExpired) {
            current.isExpired = true;
          }
        }
      }
    });

    map.forEach((val) => {
      if (val.isExpired) {
        val.badgeText = language === 'mn' ? 'Хугацаа дууссан' : 'Expired';
      } else if (val.minDaysRemaining === 0) {
        val.badgeText = language === 'mn' ? 'Өнөөдөр дуусна' : 'Expires Today';
      } else {
        val.badgeText = language === 'mn' 
          ? `${val.minDaysRemaining} хоног үлдсэн` 
          : `${val.minDaysRemaining}d left`;
      }

      const itemsSummary = val.expiringItems
        .map(item => `• ${item.uniformName} [${item.modelCode}] (${item.expiryDate}${item.daysRemaining >= 0 ? ` - ${item.daysRemaining} хоног` : ' - Хугацаа дууссан'})`)
        .join('\n');

      val.tooltipText = language === 'mn'
        ? `30 хоногт эдэлгээний хугацаа дуусах хувцас:\n${itemsSummary}`
        : `Uniform expiring within 30 days:\n${itemsSummary}`;
    });

    return map;
  }, [distributions, language]);

  // New Personnel Form State
  const [personForm, setPersonForm] = useState<Omit<Personnel, 'id'>>({
    militaryId: '',
    nameMn: '',
    nameEn: '',
    departmentId: 'dept-084',
    departmentName: 'Зэвсэгт хүчний 084 дугаар анги',
    rankId: 'rk-capt',
    rankName: 'Ахмад',
    rankCategory: 'Officer',
    gender: 'male',
    phone: '+976 9911-0000',
    email: '',
    enlistedDate: new Date().toISOString().slice(0, 10),
    status: 'active',
    avatar: '',
    measurements: {
      heightCm: 178,
      chestCm: 100,
      waistCm: 84,
      shoeSize: 42,
      headCircumferenceCm: 58,
      standardUniformSize: '50-4'
    }
  });

  const filteredPersonnel = useMemo(() => {
    return personnel.filter(p => {
      const searchLower = searchTerm.toLowerCase().trim();
      
      // Global multi-field match: Name (MN/EN), Service / Military ID, Rank Name, Rank Category, Unit / Department name, phone, uniform size
      const matchSearch = !searchLower || (
        p.nameMn.toLowerCase().includes(searchLower) ||
        p.nameEn.toLowerCase().includes(searchLower) ||
        p.militaryId.toLowerCase().includes(searchLower) ||
        p.rankName.toLowerCase().includes(searchLower) ||
        p.rankCategory.toLowerCase().includes(searchLower) ||
        p.departmentName.toLowerCase().includes(searchLower) ||
        p.phone.toLowerCase().includes(searchLower) ||
        p.measurements.standardUniformSize.toLowerCase().includes(searchLower)
      );

      if (!matchSearch) return false;

      if (selectedDeptFilter !== 'all' && p.departmentId !== selectedDeptFilter && p.departmentName !== selectedDeptFilter) {
        return false;
      }

      if (selectedRankCategoryFilter !== 'all' && p.rankCategory !== selectedRankCategoryFilter) {
        return false;
      }

      if (selectedServiceTypeFilter !== 'all') {
        const effectiveServiceType = p.serviceType || 'Conscript';
        if (effectiveServiceType !== selectedServiceTypeFilter) return false;
      }

      if (showExpiringOnly && !expiringPersonnelMap.has(p.id)) {
        return false;
      }

      return true;
    });
  }, [personnel, searchTerm, selectedDeptFilter, selectedRankCategoryFilter, selectedServiceTypeFilter, showExpiringOnly, expiringPersonnelMap]);

  const handleOpenEdit = (person: Personnel) => {
    setEditingPerson(person);
    setPersonForm({
      militaryId: person.militaryId,
      nameMn: person.nameMn,
      nameEn: person.nameEn,
      departmentId: person.departmentId,
      departmentName: person.departmentName,
      rankId: person.rankId,
      rankName: person.rankName,
      rankCategory: person.rankCategory,
      gender: person.gender,
      phone: person.phone,
      email: person.email,
      enlistedDate: person.enlistedDate,
      status: person.status,
      avatar: person.avatar,
      measurements: { ...person.measurements }
    });
    setIsAddModalOpen(true);
  };

  const handleSavePerson = (e: React.FormEvent) => {
    e.preventDefault();
    const dept = departments.find(d => d.id === personForm.departmentId);
    const rank = ranks.find(r => r.id === personForm.rankId);

    const payload = {
      ...personForm,
      departmentName: dept ? dept.nameMn : personForm.departmentName,
      rankName: rank ? rank.nameMn : personForm.rankName,
      rankCategory: rank ? rank.category : personForm.rankCategory
    };

    if (editingPerson) {
      updatePersonnel({ ...payload, id: editingPerson.id });
    } else {
      addPersonnel(payload);
    }

    setIsAddModalOpen(false);
    setEditingPerson(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-teal-900/90 p-5 rounded-2xl border border-teal-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foam-50 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              {language === 'mn' ? 'Цэргийн албан хаагчдын хувийн хэрэг' : 'Personnel Uniform Profiles'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-800 text-blue-300 border border-teal-700">
              {filteredPersonnel.length} {language === 'mn' ? 'албан хаагч' : 'personnel'}
            </span>
          </div>
          <p className="text-xs text-foam-500 mt-1">
            {language === 'mn' 
              ? 'Албан хаагчдын биеийн хэмжээ, олгогдсон дүрэмт хувцасны жагсаалт, хүчинтэй хугацааны хяналт.' 
              : 'Detailed soldier profiles with standard uniform sizes, active issuances, and exchange histories.'}
          </p>
        </div>

        {currentRole !== 'Дарга' && (
          <button
            id="btn-add-personnel"
            onClick={() => {
              setEditingPerson(null);
              setPersonForm({
                militaryId: `ЗХ-${Math.floor(100000 + Math.random() * 900000)}`,
                nameMn: '',
                nameEn: '',
                departmentId: departments[0]?.id || '',
                departmentName: departments[0]?.nameMn || '',
                rankId: 'rk-capt',
                rankName: 'Ахмад',
                rankCategory: 'Officer',
                gender: 'male',
                phone: '+976 9911-0000',
                email: '',
                enlistedDate: new Date().toISOString().slice(0, 10),
                status: 'active',
                avatar: '/src/assets/images/mongolian_captain_male_1788134580791.jpg',
                measurements: {
                  heightCm: 178,
                  chestCm: 100,
                  waistCm: 84,
                  shoeSize: 42,
                  headCircumferenceCm: 58,
                  standardUniformSize: '50-4'
                }
              });
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {language === 'mn' ? 'Албан хаагч бүртгэх' : 'Enroll Personnel'}
          </button>
        )}
      </div>

      {/* Chart Navigation Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex rounded-xl bg-teal-900/90 p-1 border border-teal-800 shadow-sm text-xs font-semibold">
          <button
            type="button"
            id="tab-d3-chart"
            onClick={() => setActiveChartTab('d3_distribution')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              activeChartTab === 'd3_distribution'
                ? 'bg-foam-300 text-teal-950 font-bold shadow-md'
                : 'text-foam-500 hover:text-foam-100'
            }`}
          >
            <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-teal-950/40 text-current">D3.js</span>
            <span>{language === 'mn' ? 'Хувцасны төрлийн тархалт (Цолоор)' : 'Uniform Type Distribution (By Rank)'}</span>
          </button>

          <button
            type="button"
            id="tab-ratio-chart"
            onClick={() => setActiveChartTab('ratio_quota')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              activeChartTab === 'ratio_quota'
                ? 'bg-blue-600 text-white font-bold shadow-md'
                : 'text-foam-500 hover:text-foam-100'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{language === 'mn' ? 'Хангалтын норм & Биелэлт' : 'Assigned vs. Quota Ratio'}</span>
          </button>
        </div>

        {searchTerm && (
          <div className="flex items-center gap-1.5 text-xs text-foam-200 bg-foam-300/10 border border-foam-300/30 px-2.5 py-1 rounded-xl">
            <span className="text-[11px] text-foam-500">{language === 'mn' ? 'Сонгосон цол:' : 'Filtered Rank:'}</span>
            <strong className="font-bold">{searchTerm}</strong>
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="ml-1 p-0.5 hover:bg-foam-300/20 rounded text-foam-500 hover:text-foam-50"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Visual Analytics Chart: D3 Uniform Type Distribution vs Quota Ratio */}
      {activeChartTab === 'd3_distribution' ? (
        <D3PersonnelUniformDistributionChart
          personnel={selectedDeptFilter !== 'all' ? personnel.filter(p => p.departmentId === selectedDeptFilter || p.departmentName === selectedDeptFilter) : personnel}
          distributions={distributions}
          ranks={ranks}
          language={language}
          onSelectRankFilter={(rank) => {
            setSearchTerm(rank);
          }}
          activeRankFilter={searchTerm}
          selectedDeptName={
            selectedDeptFilter !== 'all'
              ? departments.find(d => d.id === selectedDeptFilter || d.nameMn === selectedDeptFilter)?.nameMn
              : undefined
          }
        />
      ) : (
        <PersonnelRankUniformRatioChart
          personnel={selectedDeptFilter !== 'all' ? personnel.filter(p => p.departmentId === selectedDeptFilter || p.departmentName === selectedDeptFilter) : personnel}
          distributions={distributions}
          ranks={ranks}
          language={language}
          onSelectRankFilter={(rank) => {
            setSearchTerm(rank);
          }}
          activeRankFilter={searchTerm}
          selectedDeptName={
            selectedDeptFilter !== 'all'
              ? departments.find(d => d.id === selectedDeptFilter || d.nameMn === selectedDeptFilter)?.nameMn
              : undefined
          }
        />
      )}

      {/* Global Search & Filters */}
      <div className="bg-teal-900/80 p-4 rounded-2xl border border-teal-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
            <input
              id="personnel-global-search"
              type="text"
              placeholder={language === 'mn' ? 'Нэр, цэргийн бүртгэлийн дугаар (ЗХ-...), цол (Хурандаа, Ахмад...), анги салбар (032, 084...)...' : 'Search by name, rank (Captain, Colonel...), unit (032, 084...), or Service Number (MIL ID)...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-teal-950/90 border border-teal-700/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs sm:text-sm text-foam-50 placeholder-foam-500 outline-none transition font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-foam-500 hover:text-foam-100 rounded-md bg-teal-800/80 transition"
                title={language === 'mn' ? 'Хайлтыг цэвэрлэх' : 'Clear search'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              id="filter-personnel-department"
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-teal-950 border border-teal-700/80 text-xs text-foam-100 outline-none focus:border-blue-500 cursor-pointer font-medium"
            >
              <option value="all">{language === 'mn' ? 'Бүх анги салбар' : 'All Military Units'}</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.nameMn}</option>
              ))}
            </select>

            <select
              id="filter-personnel-rank-category"
              value={selectedRankCategoryFilter}
              onChange={(e) => setSelectedRankCategoryFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-teal-950 border border-teal-700/80 text-xs text-foam-100 outline-none focus:border-blue-500 cursor-pointer font-medium"
            >
              <option value="all">{language === 'mn' ? 'Цолны зэрэглэл (Бүгд)' : 'All Rank Categories'}</option>
              <option value="Senior Officer">{language === 'mn' ? 'Дээд офицер' : 'Senior Officer'}</option>
              <option value="Officer">{language === 'mn' ? 'Офицер' : 'Officer'}</option>
              <option value="Sergeant">{language === 'mn' ? 'Ахлагч' : 'Sergeant'}</option>
              <option value="Conscript">{language === 'mn' ? 'Хугацаат цэрэг' : 'Conscript'}</option>
            </select>

            {expiringPersonnelMap.size > 0 && (
              <button
                type="button"
                id="btn-filter-expiring-uniforms"
                onClick={() => setShowExpiringOnly(prev => !prev)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
                  showExpiringOnly
                    ? 'bg-foam-300/25 text-foam-200 border-foam-300/60 ring-1 ring-foam-300/30'
                    : 'bg-foam-300/10 text-foam-300 border-foam-300/30 hover:bg-foam-300/20'
                }`}
                title={language === 'mn' ? '30 хоногт хугацаа дуусах дүрэмт хувцастай албан хаагчдыг шүүх' : 'Filter personnel with uniform expiry within 30 days'}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-foam-300 shrink-0" />
                <span>
                  {language === 'mn'
                    ? `Хугацаа дөхсөн (${expiringPersonnelMap.size})`
                    : `Expiring Soon (${expiringPersonnelMap.size})`}
                </span>
              </button>
            )}

            {(searchTerm || selectedDeptFilter !== 'all' || selectedRankCategoryFilter !== 'all' || selectedServiceTypeFilter !== 'all' || showExpiringOnly) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDeptFilter('all');
                  setSelectedRankCategoryFilter('all');
                  setSelectedServiceTypeFilter('all');
                  setShowExpiringOnly(false);
                }}
                className="px-3 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-foam-200 text-xs font-semibold transition shrink-0"
              >
                {language === 'mn' ? 'Шүүлтүүр цэвэрлэх' : 'Reset Filters'}
              </button>
            )}
          </div>
        </div>

        {/* Quick Tag suggestions for rapid filtering */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-foam-500">
          <span className="font-semibold text-foam-500">{language === 'mn' ? 'Шуурхай шүүх:' : 'Quick filters:'}</span>
          {['032-р анги', '013-р анги', '084-р анги', 'Хурандаа', 'Ахмад', 'Дэслэгч', 'Ахлагч'].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSearchTerm(tag)}
              className={`px-2 py-0.5 rounded-lg border transition font-mono ${
                searchTerm === tag 
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold' 
                  : 'bg-teal-950/60 text-foam-500 border-teal-800 hover:border-teal-700 hover:text-foam-100'
              }`}
            >
              {tag}
            </button>
          ))}
          {expiringPersonnelMap.size > 0 && (
            <button
              type="button"
              onClick={() => setShowExpiringOnly(prev => !prev)}
              className={`px-2 py-0.5 rounded-lg border transition flex items-center gap-1 font-mono ${
                showExpiringOnly
                  ? 'bg-foam-300/20 text-foam-200 border-foam-300/50 font-bold'
                  : 'bg-foam-300/10 text-foam-300/90 border-foam-300/25 hover:border-foam-300/50'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-foam-300" />
              <span>{language === 'mn' ? `30 хоногт дуусах (${expiringPersonnelMap.size})` : `Expiring 30d (${expiringPersonnelMap.size})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Personnel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPersonnel.map((person) => {
          const personDists = distributions.filter(d => d.personnelId === person.id && d.status === 'Issued');
          const personExchanges = exchanges.filter(e => e.personnelId === person.id);
          const expiringAlert = expiringPersonnelMap.get(person.id);

          return (
            <div
              key={person.id}
              className={`bg-teal-900/90 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition hover:-translate-y-0.5 group ${
                expiringAlert 
                  ? expiringAlert.isExpired
                    ? 'border-rose-900/60 hover:border-rose-700/80 shadow-rose-950/20'
                    : 'border-foam-500/50 hover:border-foam-400/70 shadow-foam-500/20'
                  : 'border-teal-800 hover:border-teal-700'
              }`}
            >
              <div>
                {/* Top Profile Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-800 border border-teal-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-foam-200 text-base">
                      {person.avatar ? (
                        <img 
                          src={person.avatar} 
                          alt={person.nameMn} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span>{person.nameMn.slice(0, 1)}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold text-[11px] border border-blue-500/30">
                          {person.rankName}
                        </span>
                        <span className="font-mono text-[10px] text-foam-500">
                          {person.militaryId}
                        </span>
                      </div>
                      
                      {/* Name + Subtle Expiry Warning Badge */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <h3 className="font-bold text-foam-50 text-sm sm:text-base group-hover:text-foam-200 transition">
                          {person.nameMn}
                        </h3>

                        {expiringAlert && (
                          <div className="relative group/badge inline-flex items-center">
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border tracking-tight transition cursor-help ${
                                expiringAlert.isExpired
                                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                                  : 'bg-foam-300/15 border-foam-300/40 text-foam-200 hover:bg-foam-300/25'
                              }`}
                              title={expiringAlert.tooltipText}
                            >
                              <AlertTriangle className={`w-3 h-3 ${expiringAlert.isExpired ? 'text-rose-400' : 'text-foam-300'} shrink-0`} />
                              <span>{expiringAlert.badgeText}</span>
                            </span>

                            {/* Subtle Tooltip on Hover */}
                            <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/badge:block z-30 w-64 p-2.5 rounded-xl bg-teal-950/95 border border-teal-700 shadow-2xl text-[11px] text-foam-200 pointer-events-none backdrop-blur-md">
                              <div className="font-semibold text-foam-100 mb-1.5 flex items-center gap-1 text-foam-300">
                                <Clock className="w-3 h-3" />
                                {language === 'mn' ? '30 хоногт хугацаа дуусах хувцас:' : 'Uniforms expiring within 30 days:'}
                              </div>
                              <ul className="space-y-1.5">
                                {expiringAlert.expiringItems.map((item, idx) => (
                                  <li key={idx} className="flex flex-col border-b border-teal-800/80 pb-1 last:border-0 last:pb-0">
                                    <span className="font-medium text-foam-100 truncate">{item.uniformName}</span>
                                    <span className="text-[10px] text-foam-500 flex justify-between font-mono mt-0.5">
                                      <span>{item.expiryDate}</span>
                                      <span className={item.isExpired ? 'text-rose-400 font-bold' : 'text-foam-300 font-bold'}>
                                        {item.isExpired 
                                          ? (language === 'mn' ? 'Хугацаа дууссан' : 'Expired')
                                          : (language === 'mn' ? `${item.daysRemaining} хоног үлдсэн` : `${item.daysRemaining}d left`)}
                                      </span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-foam-500 font-medium mt-0.5">
                        {person.departmentName}
                      </p>
                    </div>
                  </div>

                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    expiringAlert 
                      ? expiringAlert.isExpired ? 'bg-rose-400 shadow-sm shadow-rose-500/50' : 'bg-foam-300 shadow-sm shadow-foam-300/50' 
                      : 'bg-foam-300 shadow-sm shadow-foam-300/50'
                  }`}></span>
                </div>

                {/* Sizing & Measurement Pill */}
                <div className="mt-4 p-2.5 rounded-xl bg-teal-950/70 border border-teal-800/80 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-foam-600">{language === 'mn' ? 'Стандарт размер' : 'Std Uniform'}</div>
                    <div className="font-mono font-bold text-foam-200 mt-0.5">{person.measurements.standardUniformSize}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-foam-600">{language === 'mn' ? 'Гутал' : 'Shoe Size'}</div>
                    <div className="font-mono font-bold text-foam-100 mt-0.5">{person.measurements.shoeSize}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-foam-600">{language === 'mn' ? 'Малгай' : 'Head Size'}</div>
                    <div className="font-mono font-bold text-foam-100 mt-0.5">{person.measurements.headCircumferenceCm}см</div>
                  </div>
                </div>

                {/* Issued Uniforms Count */}
                <div className="mt-3 flex items-center justify-between text-xs px-1">
                  <span className="text-foam-500 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-foam-300" />
                    {language === 'mn' ? 'Эзэмшиж буй хувцас:' : 'Active Issued Gear:'}
                  </span>
                  <span className="font-mono font-bold text-foam-200">
                    {personDists.length} {language === 'mn' ? 'иж бүрдэл' : 'items'}
                  </span>
                </div>

                {personExchanges.length > 0 && (
                  <div className="mt-1 flex items-center justify-between text-[11px] px-1 text-purple-300">
                    <span className="flex items-center gap-1">
                      <ArrowLeftRight className="w-3 h-3" />
                      {language === 'mn' ? 'Размер сольсон түүх:' : 'Size swaps logged:'}
                    </span>
                    <span className="font-mono font-bold">{personExchanges.length}</span>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-teal-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedPersonForDetail(person)}
                  className="px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-750 text-foam-200 text-xs font-medium transition flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {language === 'mn' ? 'Хувийн хэрэг' : 'Dossier'}
                </button>

                <div className="flex items-center gap-1.5">
                  {currentRole !== 'Дарга' && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(person)}
                        className="p-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-foam-200 transition"
                        title={language === 'mn' ? 'Хэмжээ засах' : 'Edit Profile'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onIssueToPersonnel(person)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-foam-300 to-foam-400 hover:from-foam-300 text-teal-950 font-bold text-xs shadow transition flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {language === 'mn' ? 'Хувцас олгох' : 'Issue'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Personnel Dossier & Issued Uniforms */}
      {selectedPersonForDetail && (() => {
        const detailPersonExpiringAlert = expiringPersonnelMap.get(selectedPersonForDetail.id);
        const todayLocalTime = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-teal-900 border border-teal-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between pb-3 border-b border-teal-800">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-teal-800 border border-teal-700 overflow-hidden flex items-center justify-center font-bold text-xl text-foam-100">
                    {selectedPersonForDetail.avatar ? (
                      <img 
                        src={selectedPersonForDetail.avatar} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{selectedPersonForDetail.nameMn.slice(0, 1)}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-xs">
                        {selectedPersonForDetail.rankName}
                      </span>
                      <span className="font-mono text-xs text-foam-500">
                        {selectedPersonForDetail.militaryId}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <h3 className="text-lg font-bold text-foam-50">
                        {selectedPersonForDetail.nameMn}
                      </h3>
                      {detailPersonExpiringAlert && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${
                            detailPersonExpiringAlert.isExpired
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                              : 'bg-foam-300/20 border-foam-300/40 text-foam-200'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-foam-300" />
                          <span>{detailPersonExpiringAlert.badgeText}</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-foam-500 mt-0.5">
                      {selectedPersonForDetail.departmentName} • {selectedPersonForDetail.phone}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPersonForDetail(null)}
                  className="p-1 rounded-lg text-foam-500 hover:text-foam-100 bg-teal-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Expiring Uniforms Alert Banner */}
              {detailPersonExpiringAlert && (
                <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                  detailPersonExpiringAlert.isExpired
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : 'bg-foam-300/10 border-foam-300/30 text-foam-100'
                }`}>
                  <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${detailPersonExpiringAlert.isExpired ? 'text-rose-400' : 'text-foam-300'}`} />
                  <div>
                    <div className="font-semibold text-foam-50">
                      {language === 'mn' ? 'Дүрэмт хувцасны эдэлгээний хугацааны анхааруулга' : 'Uniform Expiry Notification'}
                    </div>
                    <div className="text-foam-200 mt-0.5">
                      {language === 'mn'
                        ? `Энэ албан хаагчийн ${detailPersonExpiringAlert.expiringItems.length} дүрэмт хувцасны хүчинтэй хугацаа 30 хоногийн дотор дуусах тул ээлжит олголт эсвэл сунгалт хийнэ үү.`
                        : `This personnel has ${detailPersonExpiringAlert.expiringItems.length} uniform item(s) expiring within the next 30 days.`}
                    </div>
                  </div>
                </div>
              )}

              {/* Measurements Card */}
              <div className="bg-teal-950 p-4 rounded-xl border border-teal-800">
                <div className="text-xs font-semibold text-foam-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-foam-300" />
                  {language === 'mn' ? 'Биеийн хэмжилт & Стандарт размер' : 'Anatomy Measurements & Sizing'}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2 rounded-lg bg-teal-900 border border-teal-800">
                    <span className="text-foam-600">{language === 'mn' ? 'Китель/Хүрэм:' : 'Tunic Size:'}</span>
                    <div className="font-mono font-bold text-foam-200 text-sm mt-0.5">{selectedPersonForDetail.measurements.standardUniformSize}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-teal-900 border border-teal-800">
                    <span className="text-foam-600">{language === 'mn' ? 'Цээжний тойрог:' : 'Chest:'}</span>
                    <div className="font-mono font-bold text-foam-100 text-sm mt-0.5">{selectedPersonForDetail.measurements.chestCm} см</div>
                  </div>
                  <div className="p-2 rounded-lg bg-teal-900 border border-teal-800">
                    <span className="text-foam-600">{language === 'mn' ? 'Бүсэлхийн тойрог:' : 'Waist:'}</span>
                    <div className="font-mono font-bold text-foam-100 text-sm mt-0.5">{selectedPersonForDetail.measurements.waistCm} см</div>
                  </div>
                  <div className="p-2 rounded-lg bg-teal-900 border border-teal-800">
                    <span className="text-foam-600">{language === 'mn' ? 'Гутлын размер:' : 'Boot Size:'}</span>
                    <div className="font-mono font-bold text-foam-100 text-sm mt-0.5">{selectedPersonForDetail.measurements.shoeSize}</div>
                  </div>
                </div>
              </div>

              {/* Upcoming Re-issue Forecast — what/when this person is next due */}
              {(() => {
                const upcoming = distributions
                  .filter(d => d.personnelId === selectedPersonForDetail.id && d.status === 'Issued')
                  .slice()
                  .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                  .slice(0, 3);
                if (upcoming.length === 0) return null;
                return (
                  <div className="bg-teal-950 p-4 rounded-xl border border-teal-800">
                    <div className="text-xs font-semibold text-foam-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-foam-300" />
                      {language === 'mn' ? 'Дараагийн ээлжит олголт (юу, хэзээ)' : 'Upcoming Re-issue (what & when)'}
                    </div>
                    <div className="space-y-1.5">
                      {upcoming.map(d => (
                        <div key={d.id} className="flex items-center justify-between text-xs bg-teal-900 border border-teal-800 rounded-lg px-3 py-2">
                          <span className="text-foam-100">{d.uniformNameMn} <span className="text-foam-600 font-mono">[{d.size}]</span></span>
                          <span className="font-mono font-bold text-foam-200">{d.expiryDate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Issued Uniforms Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-xs text-foam-100 uppercase tracking-wider">
                    {language === 'mn' ? 'Эзэмшиж буй дүрэмт хувцас' : 'Active Issued Uniforms'} (
                    {distributions.filter(d => d.personnelId === selectedPersonForDetail.id).length}
                    )
                  </h4>
                  {currentRole !== 'Auditor' && (
                    <button
                      onClick={() => {
                        const p = selectedPersonForDetail;
                        setSelectedPersonForDetail(null);
                        onIssueToPersonnel(p);
                      }}
                      className="text-xs font-semibold text-foam-300 hover:text-foam-200 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {language === 'mn' ? 'Шинэ хувцас олгох' : 'Issue New Item'}
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {distributions
                    .filter(d => d.personnelId === selectedPersonForDetail.id)
                    .map(record => {
                      const recExp = new Date(record.expiryDate);
                      const recExpTime = new Date(recExp.getFullYear(), recExp.getMonth(), recExp.getDate()).getTime();
                      const daysLeft = Math.ceil((recExpTime - todayLocalTime) / (1000 * 60 * 60 * 24));
                      const isItemExpiring = (record.status === 'Issued' || record.status === 'Expired') && daysLeft <= 30;

                      return (
                        <div 
                          key={record.id} 
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                            isItemExpiring
                              ? daysLeft < 0 || record.status === 'Expired'
                                ? 'bg-rose-950/20 border-rose-800/40'
                                : 'bg-foam-500/20 border-foam-500/40'
                              : 'bg-teal-950 border-teal-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] font-bold text-foam-300">[{record.uniformModelCode}]</span>
                              <span className="font-semibold text-foam-100">{record.uniformNameMn}</span>
                              <span className="px-1.5 py-0.2 rounded bg-teal-800 text-foam-200 font-mono text-[10px]">
                                {language === 'mn' ? 'Размер' : 'Size'}: {record.size}
                              </span>
                              {isItemExpiring && (
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                  daysLeft < 0 || record.status === 'Expired'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                    : 'bg-foam-300/20 text-foam-200 border-foam-300/30'
                                }`}>
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  {daysLeft < 0 || record.status === 'Expired'
                                    ? (language === 'mn' ? 'Хугацаа дууссан' : 'Expired')
                                    : (language === 'mn' ? `${daysLeft} хоног үлдсэн` : `${daysLeft}d left`)}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-foam-500 mt-1">
                              {language === 'mn' ? 'Олгосон:' : 'Issued:'} {record.issueDate} • {language === 'mn' ? 'Хүчинтэй:' : 'Expires:'} <strong className={isItemExpiring ? 'text-foam-200' : 'text-foam-200'}>{record.expiryDate}</strong>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                              record.status === 'Issued' ? 'bg-foam-300/20 text-foam-200 border border-foam-300/30' :
                              record.status === 'Exchanged' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                              'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {record.status}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-semibold ${
                              record.receivedPhysically === false
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'text-foam-600'
                            }`}>
                              {record.receivedPhysically === false
                                ? (language === 'mn' ? 'Мөнгөн урамшуулал' : 'Cash compensation')
                                : (language === 'mn' ? 'Биет олголт' : 'Physical item')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Exchange History */}
              {exchanges.filter(e => e.personnelId === selectedPersonForDetail.id).length > 0 && (
                <div>
                  <h4 className="font-semibold text-xs text-foam-100 uppercase tracking-wider mb-2">
                    {language === 'mn' ? 'Размер солилцооны түүх' : 'Size Exchange History'} (
                    {exchanges.filter(e => e.personnelId === selectedPersonForDetail.id).length}
                    )
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {exchanges
                      .filter(e => e.personnelId === selectedPersonForDetail.id)
                      .map(exc => (
                        <div key={exc.id} className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-purple-300">[{exc.uniformModelCode}]</span>
                            <span className="font-semibold text-foam-100">{exc.uniformName}</span>
                            <span className="text-foam-500">{exc.oldSize} → <strong className="text-foam-200">{exc.newSize}</strong></span>
                          </div>
                          <div className="text-[11px] text-foam-500 mt-1">
                            {exc.exchangeDate} • {exc.reason}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-teal-800">
                <button
                  onClick={() => setSelectedPersonForDetail(null)}
                  className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-foam-200 text-xs font-medium"
                >
                  {language === 'mn' ? 'Хаах' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Add / Edit Personnel */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-teal-900 border border-teal-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-teal-800">
              <h3 className="font-bold text-base text-foam-50 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                {editingPerson ? (language === 'mn' ? 'Албан хаагчийн мэдээлэл засах' : 'Edit Personnel Profile') : (language === 'mn' ? 'Цэргийн албан хаагч шинээр бүртгэх' : 'Enroll New Soldier')}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-foam-500 hover:text-foam-100 bg-teal-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePerson} className="space-y-3 text-xs sm:text-sm">
              {/* Photo Selector */}
              <div>
                <label className="block text-xs font-semibold text-foam-500 mb-1.5">
                  {language === 'mn' ? 'Монгол цэргийн дүрэмт хувцастай цээж зураг' : 'Military Uniform Portrait'}
                </label>
                <div className="flex items-center gap-3">
                  {[
                    { id: 'off-m', label: 'Офицер (Эр)', src: '/src/assets/images/mongolian_officer_male_1788134546529.jpg' },
                    { id: 'off-f', label: 'Офицер (Эм)', src: '/src/assets/images/mongolian_officer_female_1788134566024.jpg' },
                    { id: 'cpt-m', label: 'Ахмад (Камуфляж)', src: '/src/assets/images/mongolian_captain_male_1788134580791.jpg' },
                    { id: 'sgt-m', label: 'Ахлагч / Байлдагч', src: '/src/assets/images/mongolian_soldier_male_1788134594489.jpg' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPersonForm({ ...personForm, avatar: p.src })}
                      className={`relative rounded-xl overflow-hidden border-2 transition p-0.5 ${
                        personForm.avatar === p.src ? 'border-foam-300 scale-105 shadow-md shadow-foam-300/20' : 'border-teal-800 hover:border-teal-600 opacity-70 hover:opacity-100'
                      }`}
                      title={p.label}
                    >
                      <img src={p.src} alt={p.label} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foam-500 mb-1">{language === 'mn' ? 'Цэргийн бүртгэлийн № (MIL ID)' : 'Military ID'}</label>
                  <input
                    required
                    value={personForm.militaryId}
                    onChange={(e) => setPersonForm({ ...personForm, militaryId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 font-mono outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foam-500 mb-1">{language === 'mn' ? 'Бүтэн нэр (Овог, нэр)' : 'Full Name (MN)'}</label>
                  <input
                    required
                    value={personForm.nameMn}
                    onChange={(e) => setPersonForm({ ...personForm, nameMn: e.target.value })}
                    placeholder="Жишээ: Батбаярын Тэмүүлэн"
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foam-500 mb-1">{language === 'mn' ? 'Анги / Байгууллага' : 'Department'}</label>
                  <select
                    value={personForm.departmentId}
                    onChange={(e) => {
                      const chosen = departments.find(d => d.id === e.target.value);
                      setPersonForm({ ...personForm, departmentId: e.target.value, departmentName: chosen?.nameMn || personForm.departmentName });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.nameMn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foam-500 mb-1">{language === 'mn' ? 'Цол' : 'Rank'}</label>
                  <select
                    value={personForm.rankId}
                    onChange={(e) => setPersonForm({ ...personForm, rankId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {ranks.map(r => (
                      <option key={r.id} value={r.id}>[{r.category}] {r.nameMn}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foam-500 mb-1">{language === 'mn' ? 'Утасны дугаар' : 'Phone'}</label>
                  <input
                    value={personForm.phone}
                    onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foam-500 mb-1">{language === 'mn' ? 'Хүйс' : 'Gender'}</label>
                  <select
                    value={personForm.gender}
                    onChange={(e) => setPersonForm({ ...personForm, gender: e.target.value as 'male' | 'female' })}
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 outline-none focus:border-blue-500"
                  >
                    <option value="male">{language === 'mn' ? 'Эрэгтэй' : 'Male'}</option>
                    <option value="female">{language === 'mn' ? 'Эмэгтэй' : 'Female'}</option>
                  </select>
                </div>
              </div>

              {/* Sizing info */}
              <div className="p-3 bg-teal-950 rounded-xl border border-teal-800 space-y-2">
                <span className="text-xs font-semibold text-foam-300">{language === 'mn' ? 'Биеийн хэмжилтийн норм' : 'Uniform Measurements'}</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-foam-500">{language === 'mn' ? 'Хувцасны размер:' : 'Uniform Size:'}</label>
                    <input
                      value={personForm.measurements.standardUniformSize}
                      onChange={(e) => setPersonForm({
                        ...personForm,
                        measurements: { ...personForm.measurements, standardUniformSize: e.target.value }
                      })}
                      placeholder="50-4"
                      className="w-full px-2 py-1 rounded bg-teal-900 border border-teal-750 text-foam-100 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-foam-500">{language === 'mn' ? 'Гутлын размер:' : 'Shoe Size:'}</label>
                    <input
                      type="number"
                      value={personForm.measurements.shoeSize}
                      onChange={(e) => setPersonForm({
                        ...personForm,
                        measurements: { ...personForm.measurements, shoeSize: parseInt(e.target.value) || 42 }
                      })}
                      className="w-full px-2 py-1 rounded bg-teal-900 border border-teal-750 text-foam-100 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-foam-500">{language === 'mn' ? 'Малгайн хэмжээ (см):' : 'Cap Size (cm):'}</label>
                    <input
                      type="number"
                      value={personForm.measurements.headCircumferenceCm}
                      onChange={(e) => setPersonForm({
                        ...personForm,
                        measurements: { ...personForm.measurements, headCircumferenceCm: parseInt(e.target.value) || 58 }
                      })}
                      className="w-full px-2 py-1 rounded bg-teal-900 border border-teal-750 text-foam-100 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-teal-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-750 text-foam-200 text-xs font-medium"
                >
                  {language === 'mn' ? 'Болих' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  {language === 'mn' ? 'Хадгалах' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
