import { UniformItem, Department, Rank, Command } from '../types';

/* ------------------------------------------------------------------ */
/* ЗХЖШ (Headquarters) -> Командлал (5 major commands) -> Анги (units) */
/* ------------------------------------------------------------------ */

export const COMMANDS_DATA: Command[] = [
  {
    id: 'cmd-01',
    code: 'ХЗЦК',
    nameMn: 'Хуурай замын цэргийн командлал',
    nameEn: 'Ground Forces Command',
    color: 'slate',
    badgeHex: '#334155',
    commanderName: 'Хурандаа Ж.Батсүх',
    location: 'Дорноговь аймаг'
  },
  {
    id: 'cmd-02',
    code: 'ТХК',
    nameMn: 'Тусгай хүчний командлал',
    nameEn: 'Special Operations Command',
    color: 'teal',
    badgeHex: '#1B7E75',
    commanderName: 'Хурандаа Т.Болдбаатар',
    location: 'Улаанбаатар хот'
  },
  {
    id: 'cmd-03',
    code: 'АЦК',
    nameMn: 'Агаарын цэргийн командлал',
    nameEn: 'Air Force Command',
    color: 'sky',
    badgeHex: '#0369A1',
    commanderName: 'Хурандаа Д.Мягмарсүрэн',
    location: 'Улаанбаатар хот'
  },
  {
    id: 'cmd-04',
    code: 'БИЦУГ',
    nameMn: 'Барилга, инженерийн цэргийн удирдах газар',
    nameEn: 'Directorate of Construction Engineering Troops',
    color: 'indigo',
    badgeHex: '#4338CA',
    commanderName: 'Хурандаа Б.Чинзориг',
    location: 'Улаанбаатар хот'
  },
  {
    id: 'cmd-05',
    code: 'КАБК',
    nameMn: 'Кибер аюулгүй байдлын командлал',
    nameEn: 'Cyber Security Command',
    color: 'amber',
    badgeHex: '#D97706',
    commanderName: 'Хурандаа Н.Энхболд',
    location: 'Төв аймаг'
  },
  {
    id: 'cmd-06',
    code: 'ЖШК',
    nameMn: 'Жанжин штабын шууд харьяа командлал',
    nameEn: 'General Staff Direct Command',
    color: 'violet',
    badgeHex: '#7C3AED',
    commanderName: 'Хурандаа генерал Ц.Пүрэвсүрэн',
    location: 'Улаанбаатар хот'
  }
];

const HEAD_OFFICER_POOL = [
  'Хурандаа Б.Мөнхбат', 'Дэд хурандаа Ц.Ганзориг', 'Хошууч С.Оюунчимэг', 'Хурандаа Г.Төмөрбаатар',
  'Дэд хурандаа Х.Ариунзаяа', 'Хошууч Н.Батбаяр', 'Хурандаа Э.Мөнхжаргал', 'Дэд хурандаа Л.Дэлгэрсайхан',
  'Хошууч Т.Хулан', 'Хурандаа Д.Ганбат', 'Дэд хурандаа Б.Отгонбаяр', 'Хошууч Ц.Наранцэцэг'
];

/* Three units carry extra hand-authored detail (real reference units) */
const dept084: Department = {
  id: 'dept-084',
  code: 'ЗХ-084',
  nameMn: 'Зэвсэгт хүчний 084 дугаар анги',
  nameEn: '084th Special Task Battalion',
  shortName: '084-р анги',
  unitTypeMn: 'Тусгай томилолтын батальон',
  commandId: 'cmd-02',
  color: 'teal',
  badgeHex: '#1B7E75',
  personnelCount: 180,
  headOfficer: 'Дэд хурандаа Т.Болдбаатар',
  location: 'Төв аймаг, Сэргэлэн сум / Налайх'
};

const dept150: Department = {
  id: 'dept-150',
  code: 'ЗХ-150',
  nameMn: 'Зэвсэгт хүчний 150 дугаар анги',
  nameEn: '150th Peacekeeping Operations Center',
  shortName: '150-р анги',
  unitTypeMn: 'Энхийг дэмжих ажиллагааны сургалтын төв',
  commandId: 'cmd-02',
  color: 'teal',
  badgeHex: '#1B7E75',
  personnelCount: 210,
  headOfficer: 'Хурандаа Н.Энхболд',
  location: 'Төв аймаг, Алтанбулаг / Тавантолгой'
};

const dept330: Department = {
  id: 'dept-330',
  code: 'ЗХ-330',
  nameMn: 'Зэвсэгт хүчний 330 дугаар анги',
  nameEn: '330th Motorized Infantry Unit',
  shortName: '330-р анги',
  unitTypeMn: 'Мотобуудлагын батальон',
  commandId: 'cmd-02',
  color: 'teal',
  badgeHex: '#1B7E75',
  personnelCount: 280,
  headOfficer: 'Хурандаа Э.Ган-Эрдэнэ',
  location: 'Дорноговь аймаг, Зүүнбаян'
};

interface UnitSeed { code: string; nameEn: string; unitTypeMn: string; }

function makeUnits(commandId: string, color: string, badgeHex: string, location: string, seeds: UnitSeed[]): Department[] {
  return seeds.map((s, i) => ({
    id: `dept-${s.code}`,
    code: `ЗХ-${s.code}`,
    nameMn: `Зэвсэгт хүчний ${s.code} дугаар анги`,
    nameEn: s.nameEn,
    shortName: `${s.code}-р анги`,
    unitTypeMn: s.unitTypeMn,
    commandId,
    color,
    badgeHex,
    personnelCount: 80 + ((i * 11) % 140),
    headOfficer: HEAD_OFFICER_POOL[(i + s.code.length) % HEAD_OFFICER_POOL.length],
    location
  }));
}

/* Хуурай замын цэргийн командлал (Ground Forces) */
const GROUND_FORCES_TYPES: [string, string][] = [
  ['Motorized Rifle Unit', 'Мотобуудлагын анги'],
  ['Armored Unit', 'Хуягт цэргийн анги'],
  ['Artillery Unit', 'Их бууны анги'],
  ['Fortification Unit', 'Бэхлэлтийн анги'],
  ['Infantry Unit', 'Явган цэргийн анги'],
  ['Reconnaissance Company', 'Тагнуулын рот'],
  ['Signal Unit', 'Холбооны анги'],
  ['Combat Engineer Unit', 'Байлдааны инженерийн анги']
];
const groundForcesUnits = makeUnits(
  'cmd-01', 'slate', '#334155', 'Дорноговь / Дундговь / Төв аймаг',
  ['014', '016', '119', '120', '123', '167', '186', '234', '256', '326', '327', '336'].map((code, i) => ({
    code,
    nameEn: `${code}th ${GROUND_FORCES_TYPES[i % GROUND_FORCES_TYPES.length][0]} of AFM`,
    unitTypeMn: GROUND_FORCES_TYPES[i % GROUND_FORCES_TYPES.length][1]
  }))
);

/* Тусгай хүчний командлал (Special Forces) — 084, 150, 330 kept above with full detail */
const SPECIAL_FORCES_TYPES: [string, string][] = [
  ['Special Forces Unit', 'Тусгай хүчний анги'],
  ['Airborne Unit', 'Агаарын десантын анги'],
  ['Counter-Terrorism Unit', 'Терроризмтой тэмцэх тусгай анги']
];
const specialForcesUnits = makeUnits(
  'cmd-02', 'teal', '#1B7E75', 'Улаанбаатар хот / Төв аймаг',
  ['331', '350', '345'].map((code, i) => ({
    code,
    nameEn: `${code}th ${SPECIAL_FORCES_TYPES[i % SPECIAL_FORCES_TYPES.length][0]} of AFM`,
    unitTypeMn: SPECIAL_FORCES_TYPES[i % SPECIAL_FORCES_TYPES.length][1]
  }))
);

/* Агаарын цэргийн командлал (Air Force) */
const AIR_FORCE_TYPES: [string, string][] = [
  ['Fighter Squadron', 'Байлдааны нисэх эскадриль'],
  ['Transport Aviation Squadron', 'Тээврийн нисэх эскадриль'],
  ['Helicopter Squadron', 'Нисдэг тэрэгний эскадриль'],
  ['Air Defense Radar Unit', 'Радарын хяналтын анги'],
  ['Airfield Support Battalion', 'Онгоцны буудлын үйлчилгээний батальон']
];
const airForceUnits = makeUnits(
  'cmd-03', 'sky', '#0369A1', 'Улаанбаатар хот, Буянт-Ухаа',
  ['065', '303', '325', '337', '353'].map((code, i) => ({
    code,
    nameEn: `${code}th ${AIR_FORCE_TYPES[i % AIR_FORCE_TYPES.length][0]} of AFM`,
    unitTypeMn: AIR_FORCE_TYPES[i % AIR_FORCE_TYPES.length][1]
  }))
);

/* Барилга, инженерийн цэргийн удирдах газар (Construction Engineering Directorate) */
const CONSTRUCTION_TYPES: [string, string][] = [
  ['Engineering & Construction Unit', 'Инженер, барилгын анги'],
  ['Road & Bridge Engineering Company', 'Зам гүүрийн инженерийн рот'],
  ['Equipment Maintenance Battalion', 'Техник хэрэгслийн засварын батальон']
];
const constructionUnits = makeUnits(
  'cmd-04', 'indigo', '#4338CA', 'Улаанбаатар хот',
  ['017', '338', '339', '340', '341'].map((code, i) => ({
    code,
    nameEn: `${code}th ${CONSTRUCTION_TYPES[i % CONSTRUCTION_TYPES.length][0]} of AFM`,
    unitTypeMn: CONSTRUCTION_TYPES[i % CONSTRUCTION_TYPES.length][1]
  }))
);

/* Кибер аюулгүй байдлын командлал (Cyber Security) */
const cyberSecurityUnits = makeUnits(
  'cmd-05', 'amber', '#D97706', 'Улаанбаатар хот',
  [{ code: '301', nameEn: '301st Cyber Security Unit of AFM', unitTypeMn: 'Кибер аюулгүй байдлын анги' }]
);

/* Жанжин штабын шууд харьяа командлал (General Staff Direct Command) */
const HQ_DIRECT_TYPES: [string, string][] = [
  ['Military Police Unit', 'Цэргийн цагдаагийн анги'],
  ['Central Communications Unit', 'Төв холбооны анги'],
  ['Central Depot Unit', 'Төв агуулахын анги'],
  ['Cartography Office', 'Газарзүйн зураглалын алба'],
  ['Meteorological Unit', 'Цаг уур, судалгааны алба'],
  ['Central Archive Office', 'Төв архивын алба'],
  ['Military Court Office', 'Цэргийн шүүхийн алба'],
  ['Ceremonial Protocol Office', 'Ёслол, хүндэтгэлийн алба']
];
const hqDirectUnits = makeUnits(
  'cmd-06', 'violet', '#7C3AED', 'Улаанбаатар хот',
  ['311', '142', '032', '184', '124', '013', '189', '310', '314', '334', '015', '011', '089', '232'].map((code, i) => ({
    code,
    nameEn: `${code}th ${HQ_DIRECT_TYPES[i % HQ_DIRECT_TYPES.length][0]} of AFM`,
    unitTypeMn: HQ_DIRECT_TYPES[i % HQ_DIRECT_TYPES.length][1]
  }))
);

export const DEPARTMENTS_DATA: Department[] = [
  dept084, dept150, dept330,
  ...groundForcesUnits,
  ...specialForcesUnits,
  ...airForceUnits,
  ...constructionUnits,
  ...cyberSecurityUnits,
  ...hqDirectUnits
];

// 310-р анги carries a full generated personnel roster (see
// mockPersonnelAndDistributions.ts) — keep its displayed headcount in
// sync with the actual number of seeded Personnel records.
const dept310 = DEPARTMENTS_DATA.find((d) => d.id === 'dept-310');
if (dept310) dept310.personnelCount = 200;

export const RANKS_DATA: Rank[] = [
  // Senior Officers
  { id: 'rk-gen-army', nameMn: 'Хурандаа генерал', nameEn: 'Colonel General', category: 'Senior Officer', level: 1 },
  { id: 'rk-gen-lt', nameMn: 'Дэслэгч генерал', nameEn: 'Lieutenant General', category: 'Senior Officer', level: 2 },
  { id: 'rk-gen-maj', nameMn: 'Хошууч генерал', nameEn: 'Major General', category: 'Senior Officer', level: 3 },
  { id: 'rk-gen-brig', nameMn: 'Бригадын генерал', nameEn: 'Brigadier General', category: 'Senior Officer', level: 4 },
  
  // Officers
  { id: 'rk-col', nameMn: 'Хурандаа', nameEn: 'Colonel', category: 'Officer', level: 5 },
  { id: 'rk-lt-col', nameMn: 'Дэд хурандаа', nameEn: 'Lieutenant Colonel', category: 'Officer', level: 6 },
  { id: 'rk-maj', nameMn: 'Хошууч', nameEn: 'Major', category: 'Officer', level: 7 },
  { id: 'rk-capt', nameMn: 'Ахмад', nameEn: 'Captain', category: 'Officer', level: 8 },
  { id: 'rk-sr-lt', nameMn: 'Ахлах дэслэгч', nameEn: 'Senior Lieutenant', category: 'Officer', level: 9 },
  { id: 'rk-lt', nameMn: 'Дэслэгч', nameEn: 'Lieutenant', category: 'Officer', level: 10 },

  // Sergeants / Warrant Officers
  { id: 'rk-wo-1', nameMn: 'Тэргүүн ахлагч', nameEn: 'Chief Master Sergeant', category: 'Sergeant', level: 11 },
  { id: 'rk-wo-2', nameMn: 'Сургагч ахлагч', nameEn: 'Master Sergeant', category: 'Sergeant', level: 12 },
  { id: 'rk-wo-3', nameMn: 'Ахлах ахлагч', nameEn: 'Senior Sergeant', category: 'Sergeant', level: 13 },
  { id: 'rk-wo-4', nameMn: 'Ахлагч', nameEn: 'Sergeant', category: 'Sergeant', level: 14 },
  { id: 'rk-wo-5', nameMn: 'Дэд ахлагч', nameEn: 'Junior Sergeant', category: 'Sergeant', level: 15 },

  // Conscripts
  { id: 'rk-con-1', nameMn: 'Ахлах түрүүч', nameEn: 'Senior Corporal', category: 'Conscript', level: 16 },
  { id: 'rk-con-2', nameMn: 'Түрүүч', nameEn: 'Corporal', category: 'Conscript', level: 17 },
  { id: 'rk-con-3', nameMn: 'Дэд түрүүч', nameEn: 'Junior Corporal', category: 'Conscript', level: 18 },
  { id: 'rk-con-4', nameMn: 'Ахлах байлдагч', nameEn: 'Private First Class', category: 'Conscript', level: 19 },
  { id: 'rk-con-5', nameMn: 'Байлдагч', nameEn: 'Private', category: 'Conscript', level: 20 }
];

export const INITIAL_UNIFORM_CATALOG: UniformItem[] = [
  // 1. ДЭЭД ОФИЦЕРЫН ХУВЦАС, ХЭРЭГЛЭЛ
  {
    id: 'uni-1-1',
    modelCode: '1-1',
    nameMn: 'Дээд офицерын ёслолын малгай',
    nameEn: 'Senior Officer Ceremonial Visor Cap',
    category: 'Headwear',
    gender: 'male',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Үндсэн: Мөнгөлөг саарал', nameEn: 'Silver Grey', code: 'Pantone 16-3922 TPX', hex: '#9499A8' },
      { nameMn: 'Хүрээ: Хар хөх', nameEn: 'Dark Navy', code: 'Pantone 19-4012 TPX', hex: '#1E2538' },
      { nameMn: 'Хавчуурга: Улаан', nameEn: 'Scarlet Red', code: 'Pantone 18-1664 TPX', hex: '#C92231' }
    ],
    descriptionMn: 'Малгайн саравч гялгар хар өнгөтэй, хүрээ болон саравч нь алтан шар өнгийн металл утсан хатгамалтай.',
    descriptionEn: 'High-gloss black visor with metallic gold bullion thread embroidery on band and peak. Height 8.5cm, visor 4.5cm.',
    sizeStock: { '56': 12, '57': 18, '58': 25, '59': 20, '60': 8 },
    totalStock: 83,
    issuedCount: 38,
    reorderLevel: 20,
    unitPriceMNT: 350000,
    specifications: {
      dimensions: 'Урд өндөр 8.5см, Саравч 4.5см',
      material: 'Ноосон драп, алтан саан утас',
      embroidery: 'Алтан шар металл утсан үндэсний алхан болон угалз хээ'
    }
  },
  {
    id: 'uni-1-2',
    modelCode: '1-2',
    nameMn: 'Дээд офицерын албаны малгай',
    nameEn: 'Senior Officer Service Visor Cap',
    category: 'Headwear',
    gender: 'male',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Үндсэн: Хар ногоон', nameEn: 'Dark Forest Green', code: 'Pantone 19-5350 TPX', hex: '#19392B' },
      { nameMn: 'Хавчуурга: Улаан', nameEn: 'Scarlet Red', code: 'Pantone 18-1664 TPX', hex: '#C92231' }
    ],
    descriptionMn: 'Малгайн саравч гялгар хар өнгөтэй, хүрээ болон саравч нь алтан шар өнгийн металл утсан хатгамалтай.',
    descriptionEn: 'Service peaked visor cap in dark green with red piping and gold insignia embroidery.',
    sizeStock: { '56': 15, '57': 22, '58': 28, '59': 15, '60': 10 },
    totalStock: 90,
    issuedCount: 45,
    reorderLevel: 25,
    unitPriceMNT: 290000,
    specifications: {
      dimensions: 'Урд өндөр 8.5см, Саравч 4.5см',
      material: 'Ноосон холимог даавуу'
    }
  },
  {
    id: 'uni-1-5',
    modelCode: '1-5, 1-6',
    nameMn: 'Дээд офицерын ёслолын китель, өмд (эрэгтэй)',
    nameEn: 'Senior Officer Ceremonial Tunic & Trousers (Male)',
    category: 'Outerwear',
    gender: 'male',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Үндсэн: Мөнгөлөг саарал', nameEn: 'Silver Grey', code: 'Pantone 16-3922 TPX', hex: '#9499A8' },
      { nameMn: 'Хүрээ: Хар хөх', nameEn: 'Dark Navy', code: 'Pantone 19-4012 TPX', hex: '#1E2538' },
      { nameMn: 'Хавчуурга: Улаан', nameEn: 'Scarlet Red', code: 'Pantone 18-1664 TPX', hex: '#C92231' }
    ],
    descriptionMn: 'Заханд давхар булангийн хээ, ханцуйнд улаан эмжээр бүхий алхан хээн алтан шар өнгийн саан утсан хатгамал оруулгатай.',
    descriptionEn: 'Double collar embroidery in traditional ulzii pattern, red piping cuff with gold meander embroidery.',
    sizeStock: { '48-3': 8, '50-3': 14, '50-4': 20, '52-4': 22, '54-4': 12, '56-5': 6 },
    totalStock: 82,
    issuedCount: 42,
    reorderLevel: 20,
    unitPriceMNT: 1450000,
    specifications: {
      material: '100% Ноосон дээд зэргийн даавуу, торгомсог дотор',
      embroidery: 'Алтан шар саан утас, давхар булангийн хээ'
    }
  },
  {
    id: 'uni-1-17',
    modelCode: '1-17',
    nameMn: 'Дээд офицерын өвлийн пальто (эрэгтэй)',
    nameEn: 'Senior Officer Winter Overcoat (Male)',
    category: 'Outerwear',
    gender: 'male',
    season: 'winter',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Үндсэн: Хар ногоон', nameEn: 'Dark Forest Green', code: 'Pantone 19-5350 TPX', hex: '#19392B' }
    ],
    descriptionMn: 'Каракуль захтай, ноолуур (кашмер)–н материалтай, далд товчтой, ханцуйнд алхан хээн металл утсан хатгамал оруулгатай байна.',
    descriptionEn: 'Premium cashmere wool overcoat with natural astrakhan karakul fur collar, concealed placket, and gold sleeve lace.',
    sizeStock: { '48-3': 5, '50-3': 8, '50-4': 12, '52-4': 14, '54-4': 6 },
    totalStock: 45,
    issuedCount: 22,
    reorderLevel: 15,
    unitPriceMNT: 2800000,
    specifications: {
      material: '100% Монгол цэвэр ноолуур (cashmere), каракуль үс',
      embroidery: 'Алтан утсан алхан хээ'
    }
  },
  {
    id: 'uni-1-21',
    modelCode: '1-21',
    nameMn: 'Дээд офицерын зуны ёслолын гутал (эрэгтэй)',
    nameEn: 'Senior Officer Summer Dress Oxford Shoes (Male)',
    category: 'Footwear',
    gender: 'male',
    season: 'summer',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Үндсэн: Хар', nameEn: 'Pitch Black Gloss', code: 'Pantone 19-4007 TPX', hex: '#1C1D1F' }
    ],
    descriptionMn: 'Гялгар (лак) арьсан материалтай, гутлын өсгийн өндөр 2.5-3 см байна.',
    descriptionEn: 'Patent black calfskin leather dress shoes with 2.5-3cm heel.',
    sizeStock: { '40': 6, '41': 14, '42': 22, '43': 18, '44': 10, '45': 4 },
    totalStock: 74,
    issuedCount: 39,
    reorderLevel: 20,
    unitPriceMNT: 420000,
    specifications: {
      dimensions: 'Өсгий 2.5-3 см',
      material: 'Гялгар лакан байгалийн цэвэр савхи'
    }
  },
  {
    id: 'uni-1-25',
    modelCode: '1-25',
    nameMn: 'Дээд офицерын хүзүүний ноолууран ороолт',
    nameEn: 'Senior Officer Cashmere Scarf',
    category: 'Accessories',
    gender: 'unisex',
    season: 'winter',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Үндсэн: Ногоон', nameEn: 'Military Green', code: 'Pantone 19-0315 TPX', hex: '#2E3F33' }
    ],
    descriptionMn: '100% цэвэр ноолууран нэхмэл хүзүүний ороолт.',
    descriptionEn: 'Pure cashmere woven winter scarf with fringed edges.',
    sizeStock: { 'Free': 110 },
    totalStock: 110,
    issuedCount: 52,
    reorderLevel: 30,
    unitPriceMNT: 180000,
    specifications: {
      material: '100% Ноолуур'
    }
  },

  // 2. ОФИЦЕР, АХЛАГЧ, ГЭРЭЭТ ЦЭРГИЙН ХУВЦАС
  {
    id: 'uni-2-1',
    modelCode: '2-1',
    nameMn: 'Офицер, ахлагчийн ёслолын малгай (эрэгтэй)',
    nameEn: 'Officer & Sergeant Ceremonial Visor Cap (Male)',
    category: 'Headwear',
    gender: 'male',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Зэвсэгт хүчин: Мөнгөлөг саарал', nameEn: 'Silver Grey', code: 'Pantone 16-3922 TPX', hex: '#9499A8' },
      { nameMn: 'Агаарын цэрэг: Хөх цэнхэр', nameEn: 'Air Force Blue', code: 'Pantone 19-4022 TPX', hex: '#253555' },
      { nameMn: 'Хүрээ: Хар хөх', nameEn: 'Dark Navy', code: 'Pantone 19-3812 TCX', hex: '#262A3B' },
      { nameMn: 'Хавчуурга: Улаан', nameEn: 'Scarlet Red', code: 'Pantone 18-1664 TPX', hex: '#C92231' }
    ],
    descriptionMn: 'Хар өнгийн саравчтай, саравчны урт 4.5 см, малгайн урд оройн өндөр 8.5 см байна.',
    descriptionEn: 'Regulation dress peaked cap with department branch piping and cockade mount.',
    sizeStock: { '55': 20, '56': 45, '57': 80, '58': 95, '59': 60, '60': 25 },
    totalStock: 325,
    issuedCount: 190,
    reorderLevel: 80,
    unitPriceMNT: 185000,
    specifications: {
      dimensions: 'Өндөр 8.5см, Саравч 4.5см',
      material: 'Ноосон холимог даавуу, металл алтан утсан тоноглол'
    }
  },
  {
    id: 'uni-2-10',
    modelCode: '2-10',
    nameMn: 'Берет малгай',
    nameEn: 'Military Wool Beret',
    category: 'Headwear',
    gender: 'unisex',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Агаарын цэрэг: Хөх цэнхэр', nameEn: 'Air Force Royal Blue', code: 'Pantone 19-4022 TPX', hex: '#253555' },
      { nameMn: 'Зэвсэгт хүчин: Хар ногоон', nameEn: 'Army Dark Green', code: 'Pantone 19-5350 TPX', hex: '#19392B' }
    ],
    descriptionMn: 'Хатгамал малгайн тэмдэгтэй, арьсан эмжээр бүхий цэвэр ноосон берет.',
    descriptionEn: '100% Wool beret with genuine leather sweatband, drawstrings, and embroidered branch insignia.',
    sizeStock: { '55': 30, '56': 75, '57': 120, '58': 140, '59': 85, '60': 40 },
    totalStock: 490,
    issuedCount: 310,
    reorderLevel: 100,
    unitPriceMNT: 75000,
    specifications: {
      material: '100% Эсгийрсэн ноос, хар арьсан эмжээр'
    }
  },
  {
    id: 'uni-2-14',
    modelCode: '2-14, 2-15',
    nameMn: 'Офицер, ахлагчийн албаны китель, өмд (эрэгтэй)',
    nameEn: 'Officer Service Service Tunic & Trousers (Male)',
    category: 'Outerwear',
    gender: 'male',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Зэвсэгт хүчин: Хар ногоон', nameEn: 'Army Dark Green', code: 'Pantone 19-5350 TPX', hex: '#19392B' },
      { nameMn: 'Агаарын цэрэг: Хөх цэнхэр', nameEn: 'Air Force Blue', code: 'Pantone 19-4022 TPX', hex: '#253555' }
    ],
    descriptionMn: 'Мөрдэсний суурьтай, улаан хавчуургатай, албаны стандартын дагуу оёсон китель өмд.',
    descriptionEn: 'Daily service duty tunic and trousers with branch colored piping and shoulder board attachments.',
    sizeStock: { '46-3': 18, '48-3': 42, '48-4': 50, '50-3': 65, '50-4': 85, '52-4': 70, '52-5': 40, '54-4': 30, '56-5': 15 },
    totalStock: 415,
    issuedCount: 260,
    reorderLevel: 90,
    unitPriceMNT: 480000,
    specifications: {
      material: 'Ноосон холимог бат бөх драп',
      embroidery: 'Салбарын ялгах хатгамал оруулга'
    }
  },
  {
    id: 'uni-2-34',
    modelCode: '2-34, 2-35',
    nameMn: 'Хээрийн дижитал камуфляж китель, өмд (эрэгтэй)',
    nameEn: 'Field Digital Camouflage BDU Tunic & Pants (Male)',
    category: 'Outerwear',
    gender: 'male',
    season: 'spring-autumn',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Зэвсэгт хүчин: Бор дижитал', nameEn: 'Desert Steppe Camo', code: 'Pantone 17-1316 / 18-0830', hex: '#8C7A62' }
    ],
    descriptionMn: 'Рип-стоп суналттай, тохой өвдөгний хамгаалалтын давхарлагатай, велкро наалттай хээрийн өмсгөл.',
    descriptionEn: 'Rip-stop tactical camouflage uniform with reinforced knees/elbows and loop velcro for name/blood patches.',
    sizeStock: { '46-3': 25, '48-3': 60, '48-4': 75, '50-3': 90, '50-4': 110, '52-4': 95, '54-4': 45, '56-5': 20 },
    totalStock: 520,
    issuedCount: 380,
    reorderLevel: 120,
    unitPriceMNT: 260000,
    specifications: {
      material: '65% Хөвөн, 35% Полиэфир Ripstop ус чийг тусгаарлагчтай'
    }
  },
  {
    id: 'uni-2-45',
    modelCode: '2-45, 2-46',
    nameMn: 'Өвлийн хээрийн дулаан хүрэм, өмд (дижитал)',
    nameEn: 'Winter Tactical Field Parka & Bib Pants (Digital)',
    category: 'Outerwear',
    gender: 'unisex',
    season: 'winter',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Зэвсэгт хүчин: Бор дижитал', nameEn: 'Desert Steppe Camo', code: 'Pantone 17-1316 TPX', hex: '#8C7A62' }
    ],
    descriptionMn: 'Малгай салдаг, салхи ус үл нэвтрэх мембран бүрхүүлтэй, -40C хүйтэнд зориулсан хөнгөн дулаан өвлийн иж бүрдэл.',
    descriptionEn: 'Extreme cold weather insulated tactical parka with removable hood and high-waist suspender pants rated to -40C.',
    sizeStock: { '48-3': 30, '48-4': 45, '50-3': 60, '50-4': 80, '52-4': 70, '54-4': 35 },
    totalStock: 320,
    issuedCount: 215,
    reorderLevel: 80,
    unitPriceMNT: 580000,
    specifications: {
      material: 'Gore-Tex мембрантай даавуу, Thinsulate дулаалга'
    }
  },
  {
    id: 'uni-2-20',
    modelCode: '2-20',
    nameMn: 'Офицер, ахлагчийн албаны цамц (урт/богино ханцуй)',
    nameEn: 'Officer Service Dress Shirt (Long/Short Sleeve)',
    category: 'Innerwear',
    gender: 'unisex',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Зэвсэгт хүчин: Цайвар ногоон', nameEn: 'Light Khaki Green', code: 'Pantone 17-4911 TPX', hex: '#8E9C7E' },
      { nameMn: 'Агаарын цэрэг: Цэнхэр', nameEn: 'Air Force Blue', code: 'Pantone 15-3920 TPX', hex: '#5A7BA6' }
    ],
    descriptionMn: 'Мөрдэс бэхлэх зангилаатай, халаастай, албаны болон ёслолын цамц.',
    descriptionEn: 'Poplin button-down service dress shirt with epaulet tunnels and pleated chest pockets.',
    sizeStock: { '38': 25, '39': 50, '40': 85, '41': 110, '42': 95, '43': 60, '44': 30 },
    totalStock: 455,
    issuedCount: 290,
    reorderLevel: 100,
    unitPriceMNT: 95000,
    specifications: {
      material: '80% Хөвөн, 20% Полиэфир амьсгалдаг даавуу'
    }
  },
  {
    id: 'uni-2-44',
    modelCode: '2-44',
    nameMn: 'Хээрийн тактикийн дотуур комбат цамц (Combat Shirt)',
    nameEn: 'Tactical Combat Shirt (Under-Armor Coolmax)',
    category: 'Innerwear',
    gender: 'unisex',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Цээж хэсэг: Бор шар', nameEn: 'Tan Body', code: 'Pantone 18-1029 TPX', hex: '#9C8158' },
      { nameMn: 'Ханцуй: Дижитал камуфляж', nameEn: 'Camo Sleeves', code: 'Pantone 17-1316 TPX', hex: '#8C7A62' }
    ],
    descriptionMn: 'Баруун, зүүн ханцуйнд далд цахилгаантай босоо халаастай, велкро суурьтай, цээж хэсэг хөлс шингээгч суналттай материалтай.',
    descriptionEn: 'Torso moisture-wicking stretch breathable fabric with rip-stop camouflage sleeves and zippered shoulder bicep pockets.',
    sizeStock: { 'S': 35, 'M': 80, 'L': 120, 'XL': 95, 'XXL': 40 },
    totalStock: 370,
    issuedCount: 245,
    reorderLevel: 90,
    unitPriceMNT: 145000,
    specifications: {
      material: 'CoolMax цээж, 50/50 NYCO камуфляж ханцуй'
    }
  },
  {
    id: 'uni-2-51',
    modelCode: '2-51',
    nameMn: 'Хээрийн тактикийн хагас түрийтэй гутал (Зун/Өвөл)',
    nameEn: 'Tactical Combat Boots (Summer/Winter)',
    category: 'Footwear',
    gender: 'unisex',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Зэвсэгт хүчин: Бор шар (Desert Tan)', nameEn: 'Desert Tan Leather', code: 'Pantone 18-1029 TPX', hex: '#9C8158' },
      { nameMn: 'Хар хувилбар', nameEn: 'Tactical Black', code: 'Pantone 19-4007 TPX', hex: '#1C1D1F' }
    ],
    descriptionMn: 'Шахмал резинэн зууралттай ултай, үдээстэй, түргэн тайлагч түгжээтэй цэргийн тусгай тактик гутал.',
    descriptionEn: 'Vibram high-traction outsole tactical boots with waterproof membrane, rapid lacing system, and ankle support.',
    sizeStock: { '39': 20, '40': 45, '41': 80, '42': 110, '43': 95, '44': 60, '45': 30, '46': 15 },
    totalStock: 455,
    issuedCount: 310,
    reorderLevel: 100,
    unitPriceMNT: 320000,
    specifications: {
      dimensions: 'Түрийний өндөр 20см',
      material: 'Байгалийн үхрийн савхи, Кордура даавуу'
    }
  },
  {
    id: 'uni-3-4',
    modelCode: '3-4, 3-5',
    nameMn: 'Хугацаат цэргийн хээрийн китель, өмд',
    nameEn: 'Conscript Field Uniform (Tunic & Trousers)',
    category: 'Outerwear',
    gender: 'male',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Зэвсэгт хүчин: Бор дижитал', nameEn: 'Desert Steppe Camo', code: 'Pantone 17-1316 TPX', hex: '#8C7A62' }
    ],
    descriptionMn: 'Хугацаат цэргийн албан хаагчийн хээрийн стандарт дүрэмт хувцас, өмд.',
    descriptionEn: 'Standard-issue field uniform for term-service (conscript) personnel.',
    sizeStock: { '44-2': 60, '46-2': 90, '48-3': 130, '50-3': 100, '52-4': 60, '54-4': 30 },
    totalStock: 470,
    issuedCount: 280,
    reorderLevel: 120,
    unitPriceMNT: 145000,
    specifications: {
      dimensions: 'Стандарт хэмжээс',
      material: 'Рип-стоп даавуу'
    }
  },
  {
    id: 'uni-3-13',
    modelCode: '3-13',
    nameMn: 'Хугацаат цэргийн зуны гутал',
    nameEn: 'Conscript Summer Boots',
    category: 'Footwear',
    gender: 'unisex',
    season: 'summer',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Зэвсэгт хүчин: Хар', nameEn: 'Black', code: 'Pantone 19-4007 TPX', hex: '#1C1D1F' }
    ],
    descriptionMn: 'Хугацаат цэргийн зуны стандарт гутал.',
    descriptionEn: 'Standard-issue summer boots for term-service personnel.',
    sizeStock: { '39': 25, '40': 50, '41': 70, '42': 85, '43': 65, '44': 40 },
    totalStock: 335,
    issuedCount: 190,
    reorderLevel: 90,
    unitPriceMNT: 95000,
    specifications: {
      material: 'Байгалийн арьс'
    }
  },
  {
    id: 'uni-2-47',
    modelCode: '2-47',
    nameMn: 'Тактикийн бүс (Cobra аралтай)',
    nameEn: 'Tactical Heavy-Duty Belt with Metal Buckle',
    category: 'Accessories',
    gender: 'unisex',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Хар', nameEn: 'Tactical Black', code: 'Pantone 19-4007 TPX', hex: '#1C1D1F' }
    ],
    descriptionMn: 'Төмөр, баздаг түгжээ бүхий аралтай ремен тактикийн бүс. Урт 120-140 см, өргөн 6 см-ээс багагүй.',
    descriptionEn: 'Quick-release alloy metal buckle heavy duty nylon webbing belt 60mm width.',
    sizeStock: { '120cm': 80, '130cm': 120, '140cm': 90 },
    totalStock: 290,
    issuedCount: 195,
    reorderLevel: 70,
    unitPriceMNT: 65000,
    specifications: {
      dimensions: 'Урт 120-140см, Өргөн 6см',
      material: 'Өндөр даацын нейлон, хөнгөн цагаан цайрын хайлшин арал'
    }
  },

  // 4. ЦОЛ, ЯЛГАХ ТЭМДЭГ, МӨРДЭС
  {
    id: 'uni-4-1-1',
    modelCode: '4-1-1',
    nameMn: 'Дээд офицерын ёслолын алтан мөрдэс',
    nameEn: 'Senior Officer Ceremonial Gold Epaulets',
    category: 'Insignia',
    gender: 'unisex',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Суурь: Улаан', nameEn: 'Scarlet Base', code: 'Pantone 18-1664 TPX', hex: '#C92231' },
      { nameMn: 'Дэвсгэр: Алтан шар', nameEn: 'Matte Gold', code: 'HEX #D2BF37', hex: '#D2BF37' }
    ],
    descriptionMn: 'Алтан шар өнгийн металл утсан хатгамалтай, цолны тэмдгийн хүрээ нь улаан утсан эмжээртэй байна.',
    descriptionEn: 'Hand-woven bullion gold embroidery senior officer shoulder boards with red embroidered edge.',
    sizeStock: { '135mm': 25, '145mm': 35 },
    totalStock: 60,
    issuedCount: 32,
    reorderLevel: 15,
    unitPriceMNT: 220000,
    specifications: {
      dimensions: '55 x 135-145 мм',
      material: 'Алтан шар саан утас, улаан даавуун суурь'
    }
  },
  {
    id: 'uni-4-2-17',
    modelCode: '4-2-17',
    nameMn: 'Офицер, ахлагчийн албаны хатуу мөрдэс (Бүх цол)',
    nameEn: 'Officer & Sergeant Hard Service Shoulder Boards',
    category: 'Insignia',
    gender: 'unisex',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Суурь: Улаан / Дэвсгэр: Хар ногоон', nameEn: 'Army Green/Red', code: 'Pantone 19-5350 TPX', hex: '#19392B' }
    ],
    descriptionMn: '55*125 мм, 55*135 мм, 55*145 мм-ийн хэмжээтэй албаны кителийн мөрдэс.',
    descriptionEn: 'Rigid dress tunic shoulder boards with department color piping and branch backings.',
    sizeStock: { '125mm': 120, '135mm': 240, '145mm': 160 },
    totalStock: 520,
    issuedCount: 340,
    reorderLevel: 110,
    unitPriceMNT: 45000,
    specifications: {
      dimensions: '55 x 125-145 мм'
    }
  },
  {
    id: 'uni-4-2-7',
    modelCode: '4-2-7',
    nameMn: 'Байгууллагын ялгах тэмдэг (Хатгамал ханцуйн шеврон)',
    nameEn: 'Branch Organization Embroidered Sleeve Patch',
    category: 'Insignia',
    gender: 'unisex',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Зэвсэгт хүчин: Цэнхэр / Бор шаргал', nameEn: 'AFM Shield', code: 'Pantone 19-4050 TPX', hex: '#244569' }
    ],
    descriptionMn: 'Ялгах тэмдгийн өндөр 9.5 см, өргөн 7 см байна. Албан болон хээрийн хувцасны зүүн ханцуйд оёно.',
    descriptionEn: '9.5cm x 7cm official branch embroidered sleeve insignia patch with high-density gold/colored thread.',
    sizeStock: { 'Standard': 650 },
    totalStock: 650,
    issuedCount: 420,
    reorderLevel: 150,
    unitPriceMNT: 18000,
    specifications: {
      dimensions: '9.5 x 7 см'
    }
  },
  {
    id: 'uni-4-2-10',
    modelCode: '4-2-10',
    nameMn: 'Цусны бүлэг тодорхойлсон хатгамал тэмдэг (A+, B+, O+, AB+)',
    nameEn: 'Blood Group Tactical Velcro Patch (A+, B+, O+, AB+)',
    category: 'Insignia',
    gender: 'unisex',
    season: 'all-season',
    departments: ['All'],
    pantoneColors: [
      { nameMn: 'Хээрийн ногоон', nameEn: 'Field Olive Green', code: 'Pantone 18-0312 TPX', hex: '#586043' },
      { nameMn: 'Хар хөх', nameEn: 'Navy Tactical', code: 'Pantone 19-3922 TPX', hex: '#21293B' }
    ],
    descriptionMn: 'Хэмжээ өндөр 2.5 см, өргөн 7 см урттай, хар (хар саарал) өнгийн хатгамалтай байна. Баруун ханцуйд наана.',
    descriptionEn: '2.5cm x 7cm blood type velcro patch for tactical bicep attachment.',
    sizeStock: { 'A+ (II)': 150, 'B+ (III)': 180, 'O+ (I)': 210, 'AB+ (IV)': 90 },
    totalStock: 630,
    issuedCount: 410,
    reorderLevel: 120,
    unitPriceMNT: 12000,
    specifications: {
      dimensions: '2.5 x 7 см'
    }
  },

  // 5. ТӨРИЙН ХҮНДЭТ ХАРУУЛ, ТОРГОН ЦЭРЭГ (ЗЭВСЭГТ ХҮЧНИЙ 032 ДУГААР АНГИ)
  {
    id: 'uni-5-1-1',
    modelCode: '5-1-1',
    nameMn: 'Төрийн хүндэт харуулын дуулга малгай',
    nameEn: 'State Honor Guard Ceremonial Traditional Helmet',
    category: 'Headwear',
    gender: 'male',
    season: 'all-season',
    departments: ['Зэвсэгт хүчний 032 дугаар анги'],
    pantoneColors: [
      { nameMn: 'Орой: Хөх цэнхэр', nameEn: 'Royal Blue Top', code: 'Pantone 19-4022', hex: '#253555' },
      { nameMn: 'Хүзүү: Улаан', nameEn: 'Red Flap', code: 'Pantone 18-1664 TPX', hex: '#C92231' },
      { nameMn: 'Тоног: Алтан шар', nameEn: 'Brass Gold', code: 'Matte Gold HEX #D2BF37', hex: '#D2BF37' }
    ],
    descriptionMn: 'Эртний Монгол баатрын загвартай дуулга малгай. Зуны загвар дан, өвлийн загвар дулаан дотортой байна.',
    descriptionEn: 'Traditional Mongolian historical warrior helmet with ceremonial brass crest and scarlet neck protector flap.',
    sizeStock: { '56': 15, '57': 25, '58': 30, '59': 15 },
    totalStock: 85,
    issuedCount: 65,
    reorderLevel: 20,
    unitPriceMNT: 850000,
    specifications: {
      material: 'Шармагдсан гуулин тоног, хөх торго, улаан дурдан'
    }
  },
  {
    id: 'uni-5-1-2',
    modelCode: '5-1-2',
    nameMn: 'Төрийн хүндэт харуулын улаан хүрэм дээл',
    nameEn: 'State Honor Guard Scarlet Ceremonial Deel Tunic',
    category: 'Outerwear',
    gender: 'male',
    season: 'all-season',
    departments: ['Зэвсэгт хүчний 032 дугаар анги'],
    pantoneColors: [
      { nameMn: 'Үндсэн: Улаан', nameEn: 'Imperial Scarlet Red', code: 'Pantone 18-1664 TPX', hex: '#C92231' },
      { nameMn: 'Хатгамал: Шар', nameEn: 'Gold Trim', code: 'Pantone 14-0756 TPX', hex: '#E2B030' },
      { nameMn: 'Нударга: Хөх цэнхэр', nameEn: 'Blue Cuff (Nudarga)', code: 'Pantone 19-3951 TCX', hex: '#264A7F' }
    ],
    descriptionMn: 'Зуны загвар нимгэн торгон дээл, өвлийн загвар дулаан дотортой. Хөх цэнхэр нударгатай.',
    descriptionEn: 'Iconic traditional scarlet deel robe with blue horse-hoof cuffs (nudarga) and gold filigree embroidery.',
    sizeStock: { '50-4': 25, '52-4': 35, '54-4': 20 },
    totalStock: 80,
    issuedCount: 65,
    reorderLevel: 20,
    unitPriceMNT: 1200000,
    specifications: {
      material: 'Дээд зэргийн торго, хүнд даацын дотортой'
    }
  },
  {
    id: 'uni-5-1-8',
    modelCode: '5-1-8',
    nameMn: 'Төрийн хүндэт харуулын энгэрийн төмөр толь',
    nameEn: 'Honor Guard Ceremonial Chest Mirror (Toli Emblem)',
    category: 'Accessories',
    gender: 'male',
    season: 'all-season',
    departments: ['Зэвсэгт хүчний 032 дугаар анги'],
    pantoneColors: [
      { nameMn: 'Үндсэн: Алтан шар гууль', nameEn: 'Polished Brass Gold', code: 'Matte Gold HEX #D2BF37', hex: '#D2BF37' }
    ],
    descriptionMn: 'Тойрсон алхан хээтэй 13 см диаметртэй сийлбэрт гуулин энгэрийн толь.',
    descriptionEn: '13cm diameter polished brass circular chest armor mirror medallion with perimeter meander engraving.',
    sizeStock: { '13cm': 95 },
    totalStock: 95,
    issuedCount: 75,
    reorderLevel: 25,
    unitPriceMNT: 350000,
    specifications: {
      dimensions: 'Диаметр 13 см, Хүрээ 2.5 см',
      material: 'Сийлбэрт цэвэр гууль'
    }
  }
];
