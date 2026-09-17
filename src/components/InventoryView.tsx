import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Eye, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Palette, 
  SlidersHorizontal,
  X,
  ArrowUpDown,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Info
} from 'lucide-react';
import { useUniformData } from '../context/UniformDataContext';
import { UniformItem, UniformCategory, GenderType, SeasonType, PantoneColor } from '../types';
import { BulkImportModal, generateUniformCsvTemplate, downloadCsvFile } from './BulkImportModal';

interface InventoryViewProps {
  onIssueItem: (uniform: UniformItem) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onIssueItem }) => {
  const { 
    uniforms, 
    departments, 
    currentRole, 
    language, 
    updateUniformStock, 
    addUniformItem, 
    editUniformItem 
  } = useUniformData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');

  // Modals state
  const [selectedUniformForDetail, setSelectedUniformForDetail] = useState<UniformItem | null>(null);
  const [selectedUniformForStockEdit, setSelectedUniformForStockEdit] = useState<UniformItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);

  // Quick download helper
  const handleQuickDownloadTemplate = (type: 'sample' | 'blank' = 'sample') => {
    const filename = 
      type === 'sample' 
        ? 'Mongolian_Military_Uniform_Catalog_Template_Sample.csv'
        : 'Uniform_Inventory_Import_Template_Blank.csv';
    const content = generateUniformCsvTemplate(type, uniforms);
    downloadCsvFile(filename, content);
    setIsTemplateMenuOpen(false);
  };

  // New uniform form state
  const [newItemForm, setNewItemForm] = useState<Omit<UniformItem, 'id'>>({
    modelCode: '',
    nameMn: '',
    nameEn: '',
    category: 'Outerwear',
    gender: 'unisex',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [{ nameMn: 'Хар ногоон', nameEn: 'Dark Green', code: 'Pantone 19-5350 TPX', hex: '#19392B' }],
    descriptionMn: '',
    descriptionEn: '',
    sizeStock: { '48-3': 10, '50-4': 20, '52-4': 15 },
    totalStock: 45,
    issuedCount: 0,
    reorderLevel: 20,
    unitPriceMNT: 350000,
    specifications: { material: 'Ноосон драп' }
  });

  // Filtered Uniforms
  const filteredUniforms = useMemo(() => {
    return uniforms.filter(item => {
      // Search
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = 
        item.nameMn.toLowerCase().includes(searchLower) ||
        item.nameEn.toLowerCase().includes(searchLower) ||
        item.modelCode.toLowerCase().includes(searchLower) ||
        item.pantoneColors.some(c => c.code.toLowerCase().includes(searchLower) || c.nameMn.toLowerCase().includes(searchLower));

      if (!matchSearch) return false;

      // Category
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      // Department
      if (selectedDept !== 'all') {
        const matchesDept = item.departments.includes('All') || item.departments.includes(selectedDept);
        if (!matchesDept) return false;
      }

      // Gender
      if (selectedGender !== 'all' && item.gender !== selectedGender && item.gender !== 'unisex') return false;

      // Season
      if (selectedSeason !== 'all' && item.season !== selectedSeason && item.season !== 'all-season') return false;

      // Stock status
      if (stockStatusFilter === 'low' && item.totalStock > item.reorderLevel) return false;
      if (stockStatusFilter === 'out' && item.totalStock > 0) return false;
      if (stockStatusFilter === 'in_stock' && item.totalStock === 0) return false;

      return true;
    });
  }, [uniforms, searchTerm, selectedCategory, selectedDept, selectedGender, selectedSeason, stockStatusFilter]);

  const categories: { id: string; nameMn: string; nameEn: string }[] = [
    { id: 'all', nameMn: 'Бүх төрөл', nameEn: 'All Categories' },
    { id: 'Outerwear', nameMn: 'Китель, хүрэм, пальто', nameEn: 'Outerwear' },
    { id: 'Headwear', nameMn: 'Малгай, берет', nameEn: 'Headwear' },
    { id: 'Footwear', nameMn: 'Гутал, ботинк', nameEn: 'Footwear' },
    { id: 'Innerwear', nameMn: 'Цамц, майк', nameEn: 'Innerwear' },
    { id: 'Accessories', nameMn: 'Бүс, бээлий, ороолт', nameEn: 'Accessories' },
    { id: 'Insignia', nameMn: 'Цол, мөрдэс, тэмдэг', nameEn: 'Insignia & Ranks' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-teal-900/90 p-5 rounded-2xl border border-teal-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foam-50 flex items-center gap-2">
              <Shield className="w-5 h-5 text-foam-300" />
              {language === 'mn' ? 'Дүрэмт хувцасны нөөцийн сан' : 'Uniform Inventory & Catalog'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-800 text-foam-200 border border-teal-700">
              {filteredUniforms.length} {language === 'mn' ? 'загвар' : 'models'}
            </span>
          </div>
          <p className="text-xs text-foam-500 mt-1">
            {language === 'mn' 
              ? 'Монгол Улсын Ерөнхийлөгчийн 141 дүгээр зарлигт заасан цэргийн албаны болон ёслолын дүрэмт хувцас, Pantone өнгөний кодоор бүртгэсэн каталог.' 
              : 'Military standard uniforms catalog with Pantone shade specifications, sizes stock, and issuing guidelines.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download Template Button & Menu */}
          <div className="relative">
            <div className="inline-flex rounded-xl shadow-md bg-teal-800 border border-teal-700 overflow-hidden">
              <button
                id="btn-download-template"
                onClick={() => handleQuickDownloadTemplate('sample')}
                className="px-3 py-2 text-xs font-semibold text-foam-200 hover:bg-teal-750 flex items-center gap-1.5 transition cursor-pointer"
                title={language === 'mn' ? 'Excel / CSV загвар файл татах (Монгол фонт дэмжинэ)' : 'Download formatted CSV template for Excel'}
              >
                <Download className="w-4 h-4 text-foam-300" />
                <span>{language === 'mn' ? 'Загвар татах (.csv)' : 'Download Template'}</span>
              </button>
              <button
                id="btn-template-dropdown"
                onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
                className="px-1.5 py-2 border-l border-teal-700 hover:bg-teal-750 text-foam-500 hover:text-foam-100 transition cursor-pointer"
                title={language === 'mn' ? 'Бусад загварын сонголт' : 'Template options'}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dropdown Menu */}
            {isTemplateMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-teal-900 border border-teal-750 rounded-xl shadow-2xl z-30 py-1.5 text-xs animate-in fade-in">
                <button
                  onClick={() => handleQuickDownloadTemplate('sample')}
                  className="w-full px-3 py-2 text-left hover:bg-teal-800 text-foam-100 flex items-start gap-2 transition"
                >
                  <FileText className="w-4 h-4 text-foam-300 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-foam-200">{language === 'mn' ? 'Жишээ өгөгдөлтэй загвар' : 'Sample Template (.csv)'}</div>
                    <div className="text-[10px] text-foam-500">{language === 'mn' ? 'Цэргийн 141-р зарлигийн жишээтэй' : 'Includes sample uniform models'}</div>
                  </div>
                </button>
                <button
                  onClick={() => handleQuickDownloadTemplate('blank')}
                  className="w-full px-3 py-2 text-left hover:bg-teal-800 text-foam-100 flex items-start gap-2 transition border-t border-teal-800"
                >
                  <Download className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">{language === 'mn' ? 'Хоосон цэвэр загвар' : 'Blank Template (.csv)'}</div>
                    <div className="text-[10px] text-foam-500">{language === 'mn' ? 'Зөвхөн баганын толгой мөрүүдтэй' : 'Only column headers'}</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    const content = generateUniformCsvTemplate('current', uniforms);
                    downloadCsvFile(`Uniform_Inventory_${new Date().toISOString().slice(0, 10)}.csv`, content);
                    setIsTemplateMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-teal-800 text-foam-100 flex items-start gap-2 transition border-t border-teal-800"
                >
                  <FileSpreadsheet className="w-4 h-4 text-foam-300 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-foam-200">{language === 'mn' ? 'Одоогийн бүртгэлийг татах' : 'Export Current Inventory'}</div>
                    <div className="text-[10px] text-foam-500">{language === 'mn' ? 'Бүх загварын одоогийн сан' : 'Export all catalog rows to CSV'}</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Bulk Import Modal Trigger */}
          {currentRole !== 'Дарга' && (
            <button
              id="btn-bulk-import-excel"
              onClick={() => setIsBulkImportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-750 text-foam-100 border border-teal-700 font-semibold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              title={language === 'mn' ? 'Excel / CSV файлаар олноор татан авах' : 'Bulk import stock from Excel/CSV'}
            >
              <Upload className="w-4 h-4 text-foam-300" />
              <span>{language === 'mn' ? 'Олноор импортлох' : 'Bulk Import'}</span>
            </button>
          )}

          {currentRole === 'System Admin' && (
            <button
              id="btn-add-uniform"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-foam-300 hover:bg-foam-300 text-teal-950 font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {language === 'mn' ? 'Шинэ загвар нэмэх' : 'Add New Model'}
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-teal-900/80 p-4 rounded-2xl border border-teal-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foam-500" />
            <input
              type="text"
              placeholder={language === 'mn' ? 'Загварын нэр, дугаар (жишээ нь: 1-1, 2-14, 2-51), Pantone код хайх...' : 'Search by model code (e.g. 1-1, 2-14), name, or Pantone code...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-teal-950/80 border border-teal-800 focus:border-foam-300 focus:ring-1 focus:ring-foam-300 text-xs sm:text-sm text-foam-100 placeholder-foam-600 outline-none transition"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foam-500 hover:text-foam-100 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-xs text-foam-200 outline-none focus:border-foam-300 cursor-pointer"
            >
              <option value="all">{language === 'mn' ? 'Бүх салбар / байгууллага' : 'All Departments'}</option>
              {departments.map(d => (
                <option key={d.id} value={d.nameMn}>{d.nameMn}</option>
              ))}
            </select>

            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-xs text-foam-200 outline-none focus:border-foam-300 cursor-pointer"
            >
              <option value="all">{language === 'mn' ? 'Хүйс (Бүгд)' : 'Gender (All)'}</option>
              <option value="male">{language === 'mn' ? 'Эрэгтэй' : 'Male'}</option>
              <option value="female">{language === 'mn' ? 'Эмэгтэй' : 'Female'}</option>
              <option value="unisex">{language === 'mn' ? 'Нийтлэг / Бүгд' : 'Unisex'}</option>
            </select>

            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-xs text-foam-200 outline-none focus:border-foam-300 cursor-pointer"
            >
              <option value="all">{language === 'mn' ? 'Улирал (Бүгд)' : 'Season (All)'}</option>
              <option value="summer">{language === 'mn' ? 'Зун' : 'Summer'}</option>
              <option value="winter">{language === 'mn' ? 'Өвөл' : 'Winter'}</option>
              <option value="spring-autumn">{language === 'mn' ? 'Хавар, Намар' : 'Spring/Autumn'}</option>
              <option value="all-season">{language === 'mn' ? 'Бүх улирал' : 'All Season'}</option>
            </select>

            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-xs text-foam-200 outline-none focus:border-foam-300 cursor-pointer font-medium"
            >
              <option value="all">{language === 'mn' ? 'Нөөцийн төлөв (Бүгд)' : 'Stock Status (All)'}</option>
              <option value="in_stock">{language === 'mn' ? 'Бэлэн байгаа' : 'In Stock'}</option>
              <option value="low">{language === 'mn' ? 'Нөөц дуусаж буй' : 'Low Stock Alert'}</option>
              <option value="out">{language === 'mn' ? 'Дууссан (0 ш)' : 'Out of Stock'}</option>
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-teal-800/80">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-foam-300/20 text-foam-200 border border-foam-300/40 font-semibold'
                  : 'text-foam-500 hover:text-foam-100 hover:bg-teal-800'
              }`}
            >
              {language === 'mn' ? cat.nameMn : cat.nameEn}
            </button>
          ))}
        </div>
      </div>

      {/* Uniforms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredUniforms.map((uniform) => {
          const isLowStock = uniform.totalStock <= uniform.reorderLevel;
          const isOutOfStock = uniform.totalStock === 0;

          return (
            <div 
              key={uniform.id}
              className="bg-teal-900/90 border border-teal-800 hover:border-teal-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition hover:-translate-y-0.5 group relative overflow-hidden"
            >
              {/* Top Accent Strip based on Category */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-foam-300 via-foam-300 to-foam-400"></div>

              <div>
                {/* Badges Bar */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-foam-300/20 text-foam-200 font-mono font-bold text-xs border border-foam-300/30">
                      {language === 'mn' ? 'Загвар' : 'Model'} {uniform.modelCode}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-teal-800 text-foam-200 text-[11px] font-medium">
                      {uniform.category}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    isOutOfStock 
                      ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40' 
                      : isLowStock 
                      ? 'bg-foam-300/20 text-foam-200 border border-foam-300/40' 
                      : 'bg-foam-300/20 text-foam-200 border border-foam-300/30'
                  }`}>
                    {isOutOfStock ? (language === 'mn' ? 'Дууссан' : 'Out of Stock') :
                     isLowStock ? (language === 'mn' ? 'Нөөц бага' : 'Low Stock') : 
                     (language === 'mn' ? 'Бэлэн' : 'Available')}
                  </span>
                </div>

                {/* Uniform Name */}
                <h3 className="font-bold text-sm sm:text-base text-foam-50 group-hover:text-foam-200 transition line-clamp-2">
                  {language === 'mn' ? uniform.nameMn : uniform.nameEn}
                </h3>
                <p className="text-xs text-foam-500 mt-1 line-clamp-2">
                  {language === 'mn' ? uniform.descriptionMn : uniform.descriptionEn}
                </p>

                {/* Pantone Color Chips */}
                <div className="mt-3 p-2.5 rounded-xl bg-teal-950/60 border border-teal-800/80">
                  <div className="text-[11px] font-semibold text-foam-500 flex items-center gap-1 mb-1.5">
                    <Palette className="w-3.5 h-3.5 text-foam-300" />
                    {language === 'mn' ? 'Pantone өнгөний код:' : 'Pantone Color Codes:'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {uniform.pantoneColors.map((color, idx) => (
                      <div 
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-teal-900 border border-teal-750 text-[10px]"
                        title={`${color.nameMn} (${color.code})`}
                      >
                        <span 
                          className="w-3 h-3 rounded-full border border-white/20 shadow-sm shrink-0" 
                          style={{ backgroundColor: color.hex }}
                        ></span>
                        <span className="font-mono text-foam-200 font-medium">{color.code}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Size Stock Matrix */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-foam-500 mb-1.5">
                    <span>{language === 'mn' ? 'Размерийн үлдэгдэл:' : 'Stock by Size:'}</span>
                    <span className="font-mono text-foam-100">
                      {language === 'mn' ? 'Нийт:' : 'Total:'} <strong className="text-foam-200 font-bold">{uniform.totalStock}</strong> {language === 'mn' ? 'ш' : 'pcs'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {Object.entries(uniform.sizeStock).map(([size, qty]) => {
                      const numQty = Number(qty);
                      return (
                        <span
                          key={size}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium flex items-center gap-1 border ${
                            numQty === 0 
                              ? 'bg-teal-900 text-teal-600 border-teal-800' 
                              : numQty <= 5 
                              ? 'bg-foam-300/10 text-foam-200 border-foam-300/30 font-bold' 
                              : 'bg-teal-800 text-foam-100 border-teal-700'
                          }`}
                        >
                          <span className="text-foam-500">{size}:</span>
                          <span className={numQty === 0 ? 'text-teal-600' : 'text-foam-50 font-bold'}>{numQty}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-teal-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedUniformForDetail(uniform)}
                    className="p-2 rounded-xl bg-teal-800 hover:bg-teal-750 text-foam-200 text-xs transition"
                    title={language === 'mn' ? 'Дэлгэрэнгүй стандарт үзэх' : 'View Specifications'}
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {currentRole !== 'Дарга' && (
                    <button
                      onClick={() => setSelectedUniformForStockEdit(uniform)}
                      className="p-2 rounded-xl bg-teal-800 hover:bg-teal-750 text-foam-200 text-xs transition"
                      title={language === 'mn' ? 'Размерийн нөөц засах / татан авалт' : 'Adjust Stock'}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {currentRole !== 'Дарга' && (
                  <button
                    onClick={() => onIssueItem(uniform)}
                    disabled={uniform.totalStock === 0}
                    className="px-3.5 py-1.5 rounded-xl bg-foam-300 hover:bg-foam-300 disabled:opacity-40 disabled:cursor-not-allowed text-teal-950 font-bold text-xs transition shadow flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {language === 'mn' ? 'Олгох' : 'Issue'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredUniforms.length === 0 && (
        <div className="text-center py-16 bg-teal-900/60 rounded-2xl border border-teal-800">
          <Info className="w-10 h-10 text-foam-600 mx-auto mb-2" />
          <h4 className="text-base font-semibold text-foam-200">
            {language === 'mn' ? 'Тохирох дүрэмт хувцас олдсонгүй' : 'No matching uniform items found'}
          </h4>
          <p className="text-xs text-foam-600 mt-1">
            {language === 'mn' ? 'Хайлтын үг эсвэл шүүлтүүрийн утгаа өөрчилж үзнэ үү.' : 'Try changing search parameters or clearing filters.'}
          </p>
        </div>
      )}

      {/* MODAL 1: Full Blueprint / Standard Details Modal */}
      {selectedUniformForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-teal-900 border border-teal-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-teal-800">
              <div>
                <span className="px-2 py-0.5 rounded bg-foam-300/20 text-foam-200 font-mono font-bold text-xs border border-foam-300/30">
                  {language === 'mn' ? 'Ерөнхийлөгчийн зарлиг №141 хавсралт • Загвар' : 'Decree No. 141 Appendix • Model'} {selectedUniformForDetail.modelCode}
                </span>
                <h3 className="text-lg font-bold text-foam-50 mt-1">
                  {language === 'mn' ? selectedUniformForDetail.nameMn : selectedUniformForDetail.nameEn}
                </h3>
              </div>
              <button
                onClick={() => setSelectedUniformForDetail(null)}
                className="p-1 rounded-lg text-foam-500 hover:text-foam-100 bg-teal-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="bg-teal-950 p-3.5 rounded-xl border border-teal-800">
                <div className="text-xs font-semibold text-foam-500 uppercase tracking-wider mb-1">
                  {language === 'mn' ? 'Албан тайлбар ба оёдлын дүрэм' : 'Official Specification & Tailoring Rules'}
                </div>
                <p className="text-foam-100 leading-relaxed">
                  {language === 'mn' ? selectedUniformForDetail.descriptionMn : selectedUniformForDetail.descriptionEn}
                </p>
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-teal-950 p-3 rounded-xl border border-teal-800">
                  <span className="text-foam-500 text-xs">{language === 'mn' ? 'Материал:' : 'Fabric/Material:'}</span>
                  <div className="font-semibold text-foam-100 mt-0.5">{selectedUniformForDetail.specifications.material || 'Стандарт цэргийн даавуу'}</div>
                </div>
                <div className="bg-teal-950 p-3 rounded-xl border border-teal-800">
                  <span className="text-foam-500 text-xs">{language === 'mn' ? 'Хэмжээ/Өндрийн норм:' : 'Standard Measurements:'}</span>
                  <div className="font-semibold text-foam-100 mt-0.5">{selectedUniformForDetail.specifications.dimensions || 'MNS стандартаар'}</div>
                </div>
              </div>

              {/* Pantone Colors Full Table */}
              <div className="bg-teal-950 p-3.5 rounded-xl border border-teal-800">
                <div className="text-xs font-semibold text-foam-500 uppercase tracking-wider mb-2">
                  {language === 'mn' ? 'Батлагдсан Pantone өнгөний код & Тохирох салбарууд' : 'Approved Pantone Standards'}
                </div>
                <div className="space-y-2">
                  {selectedUniformForDetail.pantoneColors.map((color, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-teal-900 border border-teal-800">
                      <div className="flex items-center gap-2.5">
                        <span 
                          className="w-5 h-5 rounded-lg border border-white/20 shadow" 
                          style={{ backgroundColor: color.hex }}
                        ></span>
                        <span className="font-medium text-foam-100">{language === 'mn' ? color.nameMn : color.nameEn}</span>
                      </div>
                      <span className="font-mono text-xs text-foam-200 font-bold px-2 py-0.5 rounded bg-teal-950 border border-teal-800">
                        {color.code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Size Stock */}
              <div className="bg-teal-950 p-3.5 rounded-xl border border-teal-800">
                <div className="text-xs font-semibold text-foam-500 uppercase tracking-wider mb-2">
                  {language === 'mn' ? 'Размер бүрээрх агуулахын үлдэгдэл' : 'Stock by Size'}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {Object.entries(selectedUniformForDetail.sizeStock).map(([s, q]) => (
                    <div key={s} className="p-2 rounded-lg bg-teal-900 border border-teal-800 text-center">
                      <div className="text-foam-500 text-xs">{language === 'mn' ? 'Размер' : 'Size'} {s}</div>
                      <div className="text-base font-bold font-mono text-foam-50">{q} {language === 'mn' ? 'ш' : 'pcs'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-teal-800">
              <button
                onClick={() => setSelectedUniformForDetail(null)}
                className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-foam-200 text-xs font-medium"
              >
                {language === 'mn' ? 'Хаах' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Adjust Stock Modal */}
      {selectedUniformForStockEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-teal-900 border border-teal-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-teal-800">
              <div>
                <h3 className="font-bold text-base text-foam-50">
                  {language === 'mn' ? 'Нөөц тохируулах & Татан авалт' : 'Adjust Uniform Stock'}
                </h3>
                <p className="text-xs text-foam-300 font-mono">
                  [{selectedUniformForStockEdit.modelCode}] {selectedUniformForStockEdit.nameMn}
                </p>
              </div>
              <button
                onClick={() => setSelectedUniformForStockEdit(null)}
                className="p-1 rounded-lg text-foam-500 hover:text-foam-100 bg-teal-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {Object.entries(selectedUniformForStockEdit.sizeStock).map(([size, currentQty]) => {
                const qtyVal = Number(currentQty);
                return (
                  <div key={size} className="flex items-center justify-between p-2.5 rounded-xl bg-teal-950 border border-teal-800">
                    <div>
                      <span className="font-mono font-bold text-sm text-foam-100">{size}</span>
                      <span className="text-xs text-foam-500 ml-2">{language === 'mn' ? 'Одоогийн:' : 'Current:'} {qtyVal}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateUniformStock(selectedUniformForStockEdit.id, size, Math.max(0, qtyVal - 1))}
                        className="w-7 h-7 rounded-lg bg-teal-800 hover:bg-teal-700 text-foam-100 font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={qtyVal}
                        onChange={(e) => updateUniformStock(selectedUniformForStockEdit.id, size, Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-16 text-center py-1 rounded-lg bg-teal-900 border border-teal-700 font-mono font-bold text-foam-200 text-sm outline-none"
                      />
                      <button
                        onClick={() => updateUniformStock(selectedUniformForStockEdit.id, size, qtyVal + 1)}
                        className="w-7 h-7 rounded-lg bg-teal-800 hover:bg-teal-700 text-foam-100 font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-teal-800">
              <button
                onClick={() => setSelectedUniformForStockEdit(null)}
                className="px-4 py-2 rounded-xl bg-foam-300 hover:bg-foam-300 text-teal-950 font-bold text-xs"
              >
                {language === 'mn' ? 'Хадгалах' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Add New Uniform Item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-teal-900 border border-teal-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-teal-800">
              <h3 className="font-bold text-base text-foam-50 flex items-center gap-2">
                <Plus className="w-5 h-5 text-foam-300" />
                {language === 'mn' ? 'Шинэ дүрэмт хувцас бүртгэх' : 'Add New Uniform Specification'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-foam-500 hover:text-foam-100 bg-teal-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addUniformItem(newItemForm);
                setIsAddModalOpen(false);
              }}
              className="space-y-3 text-xs sm:text-sm"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foam-500 mb-1">{language === 'mn' ? 'Загварын дугаар (код)' : 'Model Code'}</label>
                  <input
                    required
                    placeholder="Жишээ: 2-52, 4-2-21"
                    value={newItemForm.modelCode}
                    onChange={(e) => setNewItemForm({ ...newItemForm, modelCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 font-mono outline-none focus:border-foam-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foam-500 mb-1">{language === 'mn' ? 'Төрөл' : 'Category'}</label>
                  <select
                    value={newItemForm.category}
                    onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value as UniformCategory })}
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 outline-none focus:border-foam-300"
                  >
                    <option value="Outerwear">Outerwear (Хүрэм/Китель)</option>
                    <option value="Headwear">Headwear (Малгай)</option>
                    <option value="Footwear">Footwear (Гутал)</option>
                    <option value="Innerwear">Innerwear (Цамц)</option>
                    <option value="Accessories">Accessories (Бүс/Бээлий)</option>
                    <option value="Insignia">Insignia (Цол/Мөрдэс)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foam-500 mb-1">{language === 'mn' ? 'Хувцасны нэр (Монгол)' : 'Item Name (MN)'}</label>
                <input
                  required
                  placeholder="Жишээ: Офицерын өвлийн дулаан хүрэм"
                  value={newItemForm.nameMn}
                  onChange={(e) => setNewItemForm({ ...newItemForm, nameMn: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 outline-none focus:border-foam-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foam-500 mb-1">{language === 'mn' ? 'Хүйс' : 'Gender'}</label>
                  <select
                    value={newItemForm.gender}
                    onChange={(e) => setNewItemForm({ ...newItemForm, gender: e.target.value as GenderType })}
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 outline-none focus:border-foam-300"
                  >
                    <option value="male">{language === 'mn' ? 'Эрэгтэй' : 'Male'}</option>
                    <option value="female">{language === 'mn' ? 'Эмэгтэй' : 'Female'}</option>
                    <option value="unisex">{language === 'mn' ? 'Бүгд (Unisex)' : 'Unisex'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foam-500 mb-1">{language === 'mn' ? 'Улирал' : 'Season'}</label>
                  <select
                    value={newItemForm.season}
                    onChange={(e) => setNewItemForm({ ...newItemForm, season: e.target.value as SeasonType })}
                    className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 outline-none focus:border-foam-300"
                  >
                    <option value="all-season">{language === 'mn' ? 'Бүх улирал' : 'All Season'}</option>
                    <option value="summer">{language === 'mn' ? 'Зун' : 'Summer'}</option>
                    <option value="winter">{language === 'mn' ? 'Өвөл' : 'Winter'}</option>
                    <option value="spring-autumn">{language === 'mn' ? 'Хавар, Намар' : 'Spring/Autumn'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foam-500 mb-1">{language === 'mn' ? 'Тайлбар, стандартын шаардлага' : 'Standard Description'}</label>
                <textarea
                  rows={3}
                  value={newItemForm.descriptionMn}
                  onChange={(e) => setNewItemForm({ ...newItemForm, descriptionMn: e.target.value })}
                  placeholder="Зарлиг 141-д заасан загварын тодорхойлолт..."
                  className="w-full px-3 py-2 rounded-xl bg-teal-950 border border-teal-800 text-foam-100 outline-none focus:border-foam-300"
                />
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
                  className="px-4 py-2 rounded-xl bg-foam-300 hover:bg-foam-300 text-teal-950 font-bold text-xs"
                >
                  {language === 'mn' ? 'Бүртгэх' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Bulk Import & Intake Modal */}
      <BulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
      />
    </div>
  );
};
