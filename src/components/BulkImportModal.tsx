import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  FileText, 
  RefreshCw, 
  PackageCheck,
  Info
} from 'lucide-react';
import { useUniformData } from '../context/UniformDataContext';
import { UniformItem, UniformCategory, GenderType, SeasonType, PantoneColor } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedUniformRow {
  modelCode: string;
  nameMn: string;
  nameEn?: string;
  category: UniformCategory;
  gender: GenderType;
  season: SeasonType;
  departments: string[];
  pantoneColors?: PantoneColor[];
  descriptionMn?: string;
  descriptionEn?: string;
  sizeStock: Record<string, number>;
  totalUnits: number;
  reorderLevel: number;
  unitPriceMNT: number;
  material?: string;
  isValid: boolean;
  validationErrors: string[];
  isExisting: boolean;
}

export const generateUniformCsvTemplate = (type: 'sample' | 'blank' | 'current', currentUniforms: UniformItem[] = []): string => {
  const headers = [
    'modelCode',
    'nameMn',
    'nameEn',
    'category',
    'gender',
    'season',
    'departments',
    'sizeStock',
    'unitPriceMNT',
    'reorderLevel',
    'material',
    'pantoneCode',
    'descriptionMn'
  ];

  // Human-readable Mongolian translation of each column, shown as a second header
  // row so the template is self-explanatory when opened in Excel. The importer
  // (see parseCsvLine usage below) automatically detects and skips this row.
  const headersMn = [
    'Загварын код',
    'Нэр (Монгол)',
    'Нэр (Англи)',
    'Ангилал',
    'Хүйс',
    'Улирал',
    'Харьяа анги/командлал',
    'Размер:Тоо ширхэг (";"-аар тусгаарлана)',
    'Нэгжийн үнэ (₮)',
    'Дахин захиалах босго',
    'Материал',
    'Pantone код',
    'Тайлбар'
  ];

  let rows: string[][] = [];

  if (type === 'blank') {
    // Give even the "blank" template one concrete example row so it's
    // never just an empty grid of column names.
    rows = [
      [
        '2-14',
        '"Офицерын өдөр тутмын албаны китель, өмд (ЖИШЭЭ МӨР — устгаад бичнэ үү)"',
        '"Officer Service Dress Uniform (EXAMPLE ROW — delete before importing)"',
        'Outerwear',
        'male',
        'all-season',
        '"All"',
        '"48-3:25; 50-3:30; 50-4:40; 52-4:25; 54-4:15"',
        '380000',
        '20',
        '"Ноосон драп 80%, полиэстер 20%"',
        '"Pantone 19-5350 TPX"',
        '"Монгол Улсын Ерөнхийлөгчийн 141 дүгээр зарлигт заасан цэргийн албаны дүрэмт хувцас."'
      ]
    ];
  } else if (type === 'current' && currentUniforms.length > 0) {
    rows = currentUniforms.map(u => {
      const sizeStockStr = Object.entries(u.sizeStock)
        .map(([size, qty]) => `${size}:${qty}`)
        .join('; ');

      const pantone = u.pantoneColors?.[0]?.code || 'Pantone 19-5350 TPX';
      const material = u.specifications?.material || 'Стандарт цэргийн даавуу';

      return [
        u.modelCode,
        `"${u.nameMn.replace(/"/g, '""')}"`,
        `"${(u.nameEn || '').replace(/"/g, '""')}"`,
        u.category,
        u.gender,
        u.season,
        `"${u.departments.join(', ')}"`,
        `"${sizeStockStr}"`,
        String(u.unitPriceMNT || 150000),
        String(u.reorderLevel || 15),
        `"${material.replace(/"/g, '""')}"`,
        `"${pantone}"`,
        `"${(u.descriptionMn || '').replace(/"/g, '""')}"`
      ];
    });
  } else {
    // Realistic sample rows representing Mongolian Armed Forces uniforms (Decree 141)
    rows = [
      [
        '2-14',
        '"Офицерын өдөр тутмын албаны китель, өмд"',
        '"Officer Service Dress Uniform"',
        'Outerwear',
        'male',
        'all-season',
        '"All"',
        '"48-3:25; 50-3:30; 50-4:40; 52-4:25; 54-4:15"',
        '380000',
        '20',
        '"Ноосон драп 80%, полиэстер 20%"',
        '"Pantone 19-5350 TPX"',
        '"Монгол Улсын Ерөнхийлөгчийн 141 дүгээр зарлигт заасан цэргийн албаны дүрэмт хувцас."'
      ],
      [
        '1-10',
        '"Хээрийн цэргийн камуфляж малгай (саравчит)"',
        '"Field Camouflage Combat Cap"',
        'Headwear',
        'unisex',
        'summer',
        '"Зэвсэгт хүчний 084 дүгээр анги, Зэвсэгт хүчний 032 дугаар анги"',
        '"56:20; 57:40; 58:60; 59:30; 60:15"',
        '45000',
        '25',
        '"Хөвөн даавуу 100% Rip-Stop"',
        '"Pantone 18-0521 TPX"',
        '"Зуны улирлын хээрийн сургууль, үүрэг гүйцэтгэхэд өмсөх цэргийн саравчит малгай."'
      ],
      [
        '4-1-1',
        '"Хээрийн өндөр түрийтэй тактикийн ботинк (Берци)"',
        '"Tactical Combat Leather Boots"',
        'Footwear',
        'unisex',
        'all-season',
        '"All"',
        '"40:15; 41:35; 42:50; 43:45; 44:20; 45:10"',
        '210000',
        '30',
        '"Байгалийн үхрийн шир, ус чийг үл нэвтрэх ул"',
        '"Pantone 19-4007 TPX"',
        '"Усны хамгаалалттай, амьсгалдаг мембран доторлогоотой бат бөх тактикийн гутал."'
      ],
      [
        '2-51',
        '"Офицер, ахлагчийн ёслолын цагаан цамц (урт ханцуй)"',
        '"Ceremonial Dress White Shirt"',
        'Innerwear',
        'male',
        'all-season',
        '"All"',
        '"48-3:20; 50-3:30; 50-4:35; 52-4:20"',
        '65000',
        '15',
        '"Хөвөн даавуу 65%, полиэстер 35%"',
        '"Pantone 11-0601 TPX"',
        '"Төрийн ёслол, жагсаалын үед кителийн дотуур өмсөх хүндэтгэлийн цагаан цамц."'
      ],
      [
        '5-1-1',
        '"Офицерын ёслолын алтан шаргал шагламал бүс"',
        '"Officer Ceremonial Gold Waist Belt"',
        'Accessories',
        'unisex',
        'all-season',
        '"Зэвсэгт хүчний 032 дугаар анги"',
        '"1:15; 2:25; 3:20; 4:10"',
        '120000',
        '10',
        '"Арьс, төрийн сүлдэт алтан бүрээст металл тоног"',
        '"Pantone 16-0952 TPX"',
        '"Төрийн хүндэт харуулын батальон болон офицер бүрэлдэхүүний ёслолын өмсгөл."'
      ]
    ];
  }

  const csvContent = [
    headers.join(','),
    headersMn.join(','),
    ...rows.map(r => r.join(','))
  ].join('\r\n');

  // Prefix with UTF-8 BOM so Excel opens Cyrillic/Mongolian cleanly
  return '\uFEFF' + csvContent;
};

export const downloadCsvFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose }) => {
  const { uniforms, bulkImportUniforms, language, currentRole } = useUniformData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedUniformRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge_stock' | 'overwrite_or_create'>('merge_stock');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    updatedCount: number;
    newCount: number;
    totalStockAdded: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = (type: 'sample' | 'blank' | 'current') => {
    const filename = 
      type === 'sample' 
        ? 'Mongolian_Military_Uniform_Catalog_Template_Sample.csv'
        : type === 'current'
        ? `Uniform_Inventory_Export_${new Date().toISOString().slice(0, 10)}.csv`
        : 'Uniform_Inventory_Import_Template_Blank.csv';

    const content = generateUniformCsvTemplate(type, uniforms);
    downloadCsvFile(filename, content);
  };

  const parseSizeStockString = (str: string): Record<string, number> => {
    const result: Record<string, number> = {};
    if (!str || typeof str !== 'string') return result;

    const cleaned = str.replace(/["]/g, '').trim();
    const pairs = cleaned.split(/[;,|\n]+/);

    pairs.forEach(pair => {
      const parts = pair.split(/[:=]/);
      if (parts.length >= 2) {
        const sizeKey = parts[0].trim();
        const qtyVal = parseInt(parts[1].trim(), 10);
        if (sizeKey && !isNaN(qtyVal)) {
          result[sizeKey] = (result[sizeKey] || 0) + Math.max(0, qtyVal);
        }
      } else {
        const trimmed = pair.trim();
        if (trimmed) {
          result[trimmed] = (result[trimmed] || 0) + 1;
        }
      }
    });

    return result;
  };

  const normalizeCategory = (catStr: string): UniformCategory => {
    const s = (catStr || '').trim().toLowerCase();
    if (s.includes('head') || s.includes('малгай') || s.includes('берет') || s.includes('саравчит')) return 'Headwear';
    if (s.includes('foot') || s.includes('гутал') || s.includes('ботинк') || s.includes('берци')) return 'Footwear';
    if (s.includes('inner') || s.includes('цамц') || s.includes('майк') || s.includes('дотуур')) return 'Innerwear';
    if (s.includes('access') || s.includes('бүс') || s.includes('бээлий') || s.includes('ороолт')) return 'Accessories';
    if (s.includes('insignia') || s.includes('цол') || s.includes('мөрдэс') || s.includes('тэмдэг') || s.includes('залгаас')) return 'Insignia';
    return 'Outerwear';
  };

  const normalizeGender = (gStr: string): GenderType => {
    const s = (gStr || '').trim().toLowerCase();
    if (s === 'female' || s.includes('эмэгтэй') || s === 'f') return 'female';
    if (s === 'male' || s.includes('эрэгтэй') || s === 'm') return 'male';
    return 'unisex';
  };

  const normalizeSeason = (sStr: string): SeasonType => {
    const s = (sStr || '').trim().toLowerCase();
    if (s.includes('зун') || s === 'summer') return 'summer';
    if (s.includes('өвөл') || s === 'winter') return 'winter';
    if (s.includes('хавар') || s.includes('намар') || s.includes('spring') || s.includes('autumn')) return 'spring-autumn';
    return 'all-season';
  };

  const parseCsvContent = (text: string) => {
    try {
      setParseError(null);
      const cleanText = text.replace(/^\uFEFF/, '');
      
      const lines: string[] = [];
      let currentLine = '';
      let inQuotes = false;

      for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        const nextChar = cleanText[i + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
          currentLine += '"';
          i++;
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') i++;
          if (currentLine.trim()) {
            lines.push(currentLine);
          }
          currentLine = '';
        } else {
          currentLine += char;
        }
      }
      if (currentLine.trim()) {
        lines.push(currentLine);
      }

      if (lines.length < 2) {
        setParseError(language === 'mn' ? 'CSV файлд өгөгдөл олдсонгүй эсвэл зөвхөн толгой мөр байна.' : 'CSV file is empty or only contains header row.');
        setParsedRows([]);
        return;
      }

      const parseCsvLine = (line: string): string[] => {
        const row: string[] = [];
        let curr = '';
        let insideQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];

          if (char === '"' && insideQuotes && nextChar === '"') {
            curr += '"';
            i++;
          } else if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if ((char === ',' || char === '\t') && !insideQuotes) {
            row.push(curr.trim());
            curr = '';
          } else {
            curr += char;
          }
        }
        row.push(curr.trim());
        return row;
      };

      const headerRow = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

      // Our exported templates include a second, Mongolian-translated header row
      // for readability in Excel — detect and skip it so it isn't treated as data.
      const secondRowFirstCell = lines.length > 1 ? parseCsvLine(lines[1])[0] : '';
      const dataStartIndex = secondRowFirstCell.trim() === 'Загварын код' ? 2 : 1;

      const getColIndex = (names: string[]): number => {
        for (const name of names) {
          const idx = headerRow.findIndex(h => h.includes(name));
          if (idx >= 0) return idx;
        }
        return -1;
      };

      const modelCodeIdx = getColIndex(['modelcode', 'model', 'code', 'загвар', 'код']);
      const nameMnIdx = getColIndex(['namemn', 'name', 'нэр', 'хувцаснынэр']);
      const nameEnIdx = getColIndex(['nameen', 'english', 'англи']);
      const categoryIdx = getColIndex(['category', 'төрөл', 'ангилал']);
      const genderIdx = getColIndex(['gender', 'хүйс']);
      const seasonIdx = getColIndex(['season', 'улирал']);
      const deptIdx = getColIndex(['department', 'departments', 'салбар', 'анги']);
      const sizeStockIdx = getColIndex(['sizestock', 'size', 'stock', 'размер', 'үлдэгдэл', 'тоо']);
      const unitPriceIdx = getColIndex(['unitprice', 'price', 'үнэ', 'өртөг']);
      const reorderIdx = getColIndex(['reorder', 'доодхязгаар', 'дооднөөц']);
      const materialIdx = getColIndex(['material', 'материал', 'даавуу']);
      const pantoneIdx = getColIndex(['pantone', 'color', 'өнгө']);
      const descIdx = getColIndex(['description', 'тайлбар', 'стандарт']);

      const parsed: ParsedUniformRow[] = [];

      for (let lineIndex = dataStartIndex; lineIndex < lines.length; lineIndex++) {
        const rawCols = parseCsvLine(lines[lineIndex]);
        if (rawCols.length === 0 || rawCols.every(c => !c)) continue;

        const modelCode = modelCodeIdx >= 0 && rawCols[modelCodeIdx] ? rawCols[modelCodeIdx] : rawCols[0] || '';
        const nameMn = nameMnIdx >= 0 && rawCols[nameMnIdx] ? rawCols[nameMnIdx] : rawCols[1] || '';
        const nameEn = nameEnIdx >= 0 && rawCols[nameEnIdx] ? rawCols[nameEnIdx] : '';
        const categoryRaw = categoryIdx >= 0 && rawCols[categoryIdx] ? rawCols[categoryIdx] : rawCols[3] || 'Outerwear';
        const genderRaw = genderIdx >= 0 && rawCols[genderIdx] ? rawCols[genderIdx] : 'unisex';
        const seasonRaw = seasonIdx >= 0 && rawCols[seasonIdx] ? rawCols[seasonIdx] : 'all-season';
        const deptRaw = deptIdx >= 0 && rawCols[deptIdx] ? rawCols[deptIdx] : 'All';
        const sizeStockRaw = sizeStockIdx >= 0 && rawCols[sizeStockIdx] ? rawCols[sizeStockIdx] : '';
        const unitPriceRaw = unitPriceIdx >= 0 && rawCols[unitPriceIdx] ? rawCols[unitPriceIdx] : '150000';
        const reorderRaw = reorderIdx >= 0 && rawCols[reorderIdx] ? rawCols[reorderIdx] : '15';
        const material = materialIdx >= 0 && rawCols[materialIdx] ? rawCols[materialIdx] : '';
        const pantoneRaw = pantoneIdx >= 0 && rawCols[pantoneIdx] ? rawCols[pantoneIdx] : 'Pantone 19-5350 TPX';
        const descRaw = descIdx >= 0 && rawCols[descIdx] ? rawCols[descIdx] : '';

        const errors: string[] = [];
        if (!modelCode) errors.push(language === 'mn' ? 'Загварын код дутуу' : 'Model code missing');
        if (!nameMn) errors.push(language === 'mn' ? 'Монгол нэр дутуу' : 'Mongolian name missing');

        const sizeStock = parseSizeStockString(sizeStockRaw);
        const totalUnits = Object.values(sizeStock).reduce((a, b) => a + b, 0);

        if (totalUnits === 0 && !errors.includes('Model code missing')) {
          sizeStock['Standard'] = 10;
        }

        const calculatedTotalUnits = Object.values(sizeStock).reduce((a, b) => a + b, 0);
        const isExisting = uniforms.some(u => u.modelCode.trim().toLowerCase() === modelCode.trim().toLowerCase());

        const departments = deptRaw
          .split(/[,;]+/)
          .map(d => d.trim())
          .filter(Boolean);

        const pantoneColors: PantoneColor[] = [
          {
            nameMn: 'Батлагдсан өнгө',
            nameEn: 'Standard Shade',
            code: pantoneRaw.trim() || 'Pantone 19-5350 TPX',
            hex: '#19392B'
          }
        ];

        parsed.push({
          modelCode: modelCode.trim(),
          nameMn: nameMn.trim(),
          nameEn: nameEn.trim() || undefined,
          category: normalizeCategory(categoryRaw),
          gender: normalizeGender(genderRaw),
          season: normalizeSeason(seasonRaw),
          departments: departments.length > 0 ? departments : ['All'],
          pantoneColors,
          descriptionMn: descRaw.trim() || undefined,
          descriptionEn: nameEn.trim() ? `Official standard ${nameEn.trim()}` : undefined,
          sizeStock,
          totalUnits: calculatedTotalUnits,
          reorderLevel: parseInt(reorderRaw, 10) || 15,
          unitPriceMNT: parseInt(unitPriceRaw, 10) || 150000,
          material: material.trim() || undefined,
          isValid: errors.length === 0,
          validationErrors: errors,
          isExisting
        });
      }

      setParsedRows(parsed);
    } catch (err: any) {
      setParseError(err.message || (language === 'mn' ? 'Файлыг задлахад алдаа гарлаа.' : 'Failed to parse file.'));
      setParsedRows([]);
    }
  };

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCsvContent(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleApplyImport = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);

    const importPayload = validRows.map(row => ({
      modelCode: row.modelCode,
      nameMn: row.nameMn,
      nameEn: row.nameEn,
      category: row.category,
      gender: row.gender,
      season: row.season,
      departments: row.departments,
      pantoneColors: row.pantoneColors,
      descriptionMn: row.descriptionMn,
      descriptionEn: row.descriptionEn,
      sizeStock: row.sizeStock,
      reorderLevel: row.reorderLevel,
      unitPriceMNT: row.unitPriceMNT,
      specifications: {
        material: row.material
      }
    }));

    const result = bulkImportUniforms(importPayload, importMode);
    const totalStockAdded = validRows.reduce((sum, r) => sum + r.totalUnits, 0);

    setImportResult({
      ...result,
      totalStockAdded
    });

    setIsProcessing(false);
  };

  const validRowsCount = parsedRows.filter(r => r.isValid).length;
  const totalStockUnitsToImport = parsedRows.filter(r => r.isValid).reduce((acc, r) => acc + r.totalUnits, 0);
  const totalValueMNT = parsedRows.filter(r => r.isValid).reduce((acc, r) => acc + (r.totalUnits * r.unitPriceMNT), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-teal-900 border border-teal-750 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-teal-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-foam-300/10 border border-foam-300/30 text-foam-300">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-foam-50">
                {language === 'mn' ? 'Дүрэмт хувцасны нөөцийг олноор бүртгэх (Excel / CSV)' : 'Bulk Stock Intake & Import (Excel / CSV)'}
              </h3>
            </div>
            <p className="text-xs text-foam-500 mt-1 pl-11">
              {language === 'mn' 
                ? 'Шинээр ирсэн хувцасны татан авалт эсвэл олон загварын үлдэгдлийг Excel/CSV загвараар нэг дор импортлох боломжтой.' 
                : 'Import bulk delivery manifests, new uniforms, and size quantities using pre-formatted CSV/Excel templates.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-foam-500 hover:text-foam-100 bg-teal-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Options: Template Downloads Bar */}
        <div className="p-4 rounded-xl bg-teal-950/80 border border-teal-800 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-foam-100 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-foam-300" />
                <span>{language === 'mn' ? '1. Албан ёсны загвар файл татаж авах' : '1. Download Official CSV Templates'}</span>
              </div>
              <p className="text-[11px] text-foam-500 mt-0.5">
                {language === 'mn' 
                  ? 'Өгөгдөл оруулахдаа дараах загваруудын аль нэгийг ашиглана уу (Excel дээр нээхэд монгол фонт бүрэн дэмжигдэнэ).' 
                  : 'Use these templates with UTF-8 BOM encoding for seamless editing in Excel.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Sample Template Button */}
              <button
                id="btn-download-sample-csv"
                onClick={() => handleDownloadTemplate('sample')}
                className="px-3 py-1.5 rounded-xl bg-foam-300/15 hover:bg-foam-300/25 text-foam-200 border border-foam-300/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title={language === 'mn' ? 'Жишээ өгөгдөлтэй загвар' : 'Template with sample military uniform rows'}
              >
                <FileText className="w-3.5 h-3.5 text-foam-300" />
                <span>{language === 'mn' ? 'Жишээтэй загвар татах' : 'Sample Template (.csv)'}</span>
              </button>

              {/* Blank Template Button */}
              <button
                id="btn-download-blank-csv"
                onClick={() => handleDownloadTemplate('blank')}
                className="px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-750 text-foam-100 border border-teal-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title={language === 'mn' ? 'Хоосон цэвэр загвар' : 'Blank clean template with headers'}
              >
                <Download className="w-3.5 h-3.5 text-foam-500" />
                <span>{language === 'mn' ? 'Хоосон загвар' : 'Blank Template (.csv)'}</span>
              </button>

              {/* Export Current Catalog */}
              <button
                id="btn-download-current-csv"
                onClick={() => handleDownloadTemplate('current')}
                className="px-3 py-1.5 rounded-xl bg-foam-300/10 hover:bg-foam-300/20 text-foam-200 border border-foam-300/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title={language === 'mn' ? 'Одоогийн бүртгэлтэй бүх хувцасны өгөгдлийг татаж авах' : 'Export current inventory catalog to CSV'}
              >
                <RefreshCw className="w-3.5 h-3.5 text-foam-300" />
                <span>{language === 'mn' ? 'Одоогийн сан татах' : 'Export Current Catalog'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Success Confirmation Banner if import finished */}
        {importResult && (
          <div className="p-4 rounded-xl bg-foam-500/60 border border-foam-300/50 space-y-2 animate-in fade-in shrink-0">
            <div className="flex items-center gap-2 text-foam-200 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-foam-300" />
              <span>{language === 'mn' ? 'Импорт амжилттай хийгдлээ!' : 'Bulk Import Completed Successfully!'}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
              <div className="bg-teal-900/80 p-2.5 rounded-lg border border-foam-300/20">
                <span className="text-foam-500 text-[11px] block">{language === 'mn' ? 'Нийт загвар:' : 'Total Models:'}</span>
                <span className="font-mono font-bold text-base text-foam-50">{importResult.importedCount}</span>
              </div>
              <div className="bg-teal-900/80 p-2.5 rounded-lg border border-foam-300/20">
                <span className="text-foam-500 text-[11px] block">{language === 'mn' ? 'Шинээр бүртгэгдсэн:' : 'New Items Added:'}</span>
                <span className="font-mono font-bold text-base text-foam-300">{importResult.newCount}</span>
              </div>
              <div className="bg-teal-900/80 p-2.5 rounded-lg border border-foam-300/20">
                <span className="text-foam-500 text-[11px] block">{language === 'mn' ? 'Нөөц нэмэгдсэн:' : 'Existing Restocked:'}</span>
                <span className="font-mono font-bold text-base text-foam-200">{importResult.updatedCount}</span>
              </div>
              <div className="bg-teal-900/80 p-2.5 rounded-lg border border-foam-300/20">
                <span className="text-foam-500 text-[11px] block">{language === 'mn' ? 'Нийт ширхэг:' : 'Total Stock Qty:'}</span>
                <span className="font-mono font-bold text-base text-blue-300">+{importResult.totalStockAdded} {language === 'mn' ? 'ш' : 'pcs'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Upload Dropzone */}
        {!importResult && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            <div className="text-xs font-bold text-foam-100 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-foam-300" />
              <span>{language === 'mn' ? '2. Бэлтгэсэн CSV/Excel файлаа хуулах' : '2. Upload Populated CSV/Excel File'}</span>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                dragActive 
                  ? 'border-foam-300 bg-foam-300/10' 
                  : fileName
                  ? 'border-foam-300/50 bg-foam-500/20'
                  : 'border-teal-750 hover:border-teal-600 bg-teal-950/40 hover:bg-teal-950/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, text/csv, .txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />

              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                fileName ? 'bg-foam-300/20 text-foam-300' : 'bg-teal-800 text-foam-500'
              }`}>
                {fileName ? <PackageCheck className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
              </div>

              <div>
                <p className="font-semibold text-sm text-foam-100">
                  {fileName 
                    ? `${fileName} (${language === 'mn' ? 'Сонгогдсон' : 'Selected'})` 
                    : language === 'mn' 
                    ? 'Файлаа энд чирч оруулах эсвэл дарж сонгоно уу' 
                    : 'Drag & drop your populated .csv file here, or click to browse'}
                </p>
                <p className="text-xs text-foam-500 mt-0.5">
                  {language === 'mn' ? 'Дэмжигдэх формат: .csv (UTF-8) • Хязгааргүй мөр' : 'Supported format: .csv with UTF-8 encoding'}
                </p>
              </div>
            </div>

            {parseError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Preview Table if rows are parsed */}
            {parsedRows.length > 0 && (
              <div className="space-y-3">
                {/* Stats & Import Mode Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-teal-950 border border-teal-800">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-foam-500 block text-[10px] uppercase">{language === 'mn' ? 'Зөв мөрүүд:' : 'Valid Rows:'}</span>
                      <strong className="font-mono text-foam-300 text-sm font-bold">{validRowsCount} / {parsedRows.length}</strong>
                    </div>
                    <div>
                      <span className="text-foam-500 block text-[10px] uppercase">{language === 'mn' ? 'Нийт тоо ширхэг:' : 'Total Units:'}</span>
                      <strong className="font-mono text-blue-300 text-sm font-bold">{totalStockUnitsToImport} {language === 'mn' ? 'ш' : 'pcs'}</strong>
                    </div>
                    <div>
                      <span className="text-foam-500 block text-[10px] uppercase">{language === 'mn' ? 'Нийт өртөг:' : 'Total Value:'}</span>
                      <strong className="font-mono text-foam-200 text-sm font-bold">₮{(totalValueMNT / 1000000).toFixed(1)}M</strong>
                    </div>
                  </div>

                  {/* Mode toggle */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-foam-500">{language === 'mn' ? 'Оруулах горим:' : 'Import Mode:'}</span>
                    <div className="inline-flex rounded-xl bg-teal-900 p-1 border border-teal-800">
                      <button
                        type="button"
                        onClick={() => setImportMode('merge_stock')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          importMode === 'merge_stock'
                            ? 'bg-foam-300 text-teal-950 shadow'
                            : 'text-foam-500 hover:text-foam-100'
                        }`}
                        title={language === 'mn' ? 'Одоо байгаа нөөц дээр нэмэх (Татан авалт)' : 'Add incoming quantity on top of existing warehouse inventory'}
                      >
                        {language === 'mn' ? '+ Нөөц нэмэх (Татан авалт)' : '+ Add to Stock'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('overwrite_or_create')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          importMode === 'overwrite_or_create'
                            ? 'bg-foam-300 text-teal-950 shadow'
                            : 'text-foam-500 hover:text-foam-100'
                        }`}
                        title={language === 'mn' ? 'Хуучин нөөцийг энэ файлаар шинэчлэн солих' : 'Overwrite existing stock with values in CSV'}
                      >
                        {language === 'mn' ? 'Шинэчлэн солих' : 'Overwrite'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="border border-teal-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-teal-950 text-foam-500 font-semibold sticky top-0 border-b border-teal-800">
                      <tr>
                        <th className="p-2.5">{language === 'mn' ? 'Төлөв' : 'Status'}</th>
                        <th className="p-2.5">{language === 'mn' ? 'Код' : 'Model'}</th>
                        <th className="p-2.5">{language === 'mn' ? 'Хувцасны нэр' : 'Item Name'}</th>
                        <th className="p-2.5">{language === 'mn' ? 'Төрөл' : 'Category'}</th>
                        <th className="p-2.5">{language === 'mn' ? 'Хүйс/Улирал' : 'Gender/Season'}</th>
                        <th className="p-2.5">{language === 'mn' ? 'Размер, тоо' : 'Size Breakdown'}</th>
                        <th className="p-2.5 text-right">{language === 'mn' ? 'Нийт тоо' : 'Total'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-850">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-teal-850/50' : 'bg-rose-950/20'}>
                          <td className="p-2.5">
                            {row.isValid ? (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                row.isExisting 
                                  ? 'bg-foam-300/20 text-foam-200 border border-foam-300/30' 
                                  : 'bg-foam-300/20 text-foam-200 border border-foam-300/30'
                              }`}>
                                {row.isExisting 
                                  ? (language === 'mn' ? 'Нөөц нэмэх' : 'Restock') 
                                  : (language === 'mn' ? 'Шинэ загвар' : 'New Model')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                {row.validationErrors.join(', ')}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-foam-200">{row.modelCode}</td>
                          <td className="p-2.5 font-medium text-foam-100 max-w-xs truncate">{row.nameMn}</td>
                          <td className="p-2.5 text-foam-500">{row.category}</td>
                          <td className="p-2.5 text-foam-500 capitalize">{row.gender} • {row.season}</td>
                          <td className="p-2.5 font-mono text-[11px] text-foam-200">
                            {Object.entries(row.sizeStock).map(([s, q]) => `${s}:${q}`).join(', ')}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-foam-50">
                            {row.totalUnits} {language === 'mn' ? 'ш' : 'pcs'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-teal-800 shrink-0">
          <div className="text-[11px] text-foam-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-foam-300" />
            <span>
              {language === 'mn' 
                ? 'Бүртгэгдсэн өгөгдөл шууд агуулахын сан болон хяналтын журналд (Audit Log) тусгагдана.' 
                : 'Imported records are automatically logged into the audit ledger.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-750 text-foam-200 text-xs font-semibold transition cursor-pointer"
            >
              {importResult ? (language === 'mn' ? 'Хаах' : 'Close') : (language === 'mn' ? 'Болих' : 'Cancel')}
            </button>

            {!importResult && (
              <button
                id="btn-confirm-bulk-import"
                disabled={validRowsCount === 0 || isProcessing}
                onClick={handleApplyImport}
                className="px-4 py-2 rounded-xl bg-foam-300 hover:bg-foam-300 disabled:opacity-40 disabled:cursor-not-allowed text-teal-950 font-bold text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
              >
                <PackageCheck className="w-4 h-4" />
                <span>
                  {language === 'mn' 
                    ? `Баталгаажуулж импортлох (${validRowsCount} загвар)` 
                    : `Confirm & Import (${validRowsCount} items)`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
