export type UserRole = 'System Admin' | 'Хувцас хангалтын офицер' | 'Дарга';

/* ------------------------------------------------------------------ */
/* Organizational hierarchy: ЗХЖШ (HQ) -> Командлал (Command) -> Анги (Unit) */
/* ------------------------------------------------------------------ */

export type OrgLevel = 'hq' | 'command' | 'unit';

export interface Command {
  id: string;
  code: string;
  nameMn: string;
  nameEn: string;
  color: string;
  badgeHex: string;
  commanderName: string;
  location: string;
}

// Each organizational level exposes exactly 3 role types.
export const HQ_ROLES = ['ЗХЖШ-ын дарга', 'ЗХЖШ-ын хангамжийн офицер', 'ЗХЖШ-ын хянан шалгагч'] as const;
export const COMMAND_ROLES = ['Командлалын дарга', 'Командлалын хангамжийн офицер', 'Командлалын нярав'] as const;
export const UNIT_ROLES = ['Ангийн дарга', 'Ангийн хангамжийн офицер', 'Ангийн бичиг хэрэг'] as const;

export type HqRoleTitle = typeof HQ_ROLES[number];
export type CommandRoleTitle = typeof COMMAND_ROLES[number];
export type UnitRoleTitle = typeof UNIT_ROLES[number];
export type RoleTitle = HqRoleTitle | CommandRoleTitle | UnitRoleTitle;

// A logged-in session: which level, which role, and (if not HQ) which command/unit it is scoped to.
export interface UserSession {
  level: OrgLevel;
  roleTitle: RoleTitle;
  commandId: string | null; // set for 'command' and 'unit' levels
  unitId: string | null;    // set for 'unit' level only
  displayName: string;
}

export type UniformCategory = 
  | 'Headwear' 
  | 'Outerwear' 
  | 'Innerwear' 
  | 'Footwear' 
  | 'Accessories' 
  | 'Insignia';

export type GenderType = 'male' | 'female' | 'unisex';

export type SeasonType = 'summer' | 'winter' | 'spring-autumn' | 'all-season';

export interface PantoneColor {
  nameMn: string;
  nameEn: string;
  code: string;
  hex: string;
}

export interface UniformItem {
  id: string;
  modelCode: string; // e.g. "1-1", "1-10", "2-14", "2-34", "2-51", "4-1-1", "5-1-1"
  nameMn: string;
  nameEn: string;
  category: UniformCategory;
  gender: GenderType;
  season: SeasonType;
  departments: string[]; // ['All'] or specific Armed Forces unit like ['Зэвсэгт хүчний 032 дугаар анги']
  pantoneColors: PantoneColor[];
  descriptionMn: string;
  descriptionEn: string;
  sizeStock: Record<string, number>; // e.g. { "48-3": 12, "50-3": 25, "52-4": 18 } or { "41": 15, "42": 30 }
  totalStock: number;
  issuedCount: number;
  reorderLevel: number;
  unitPriceMNT: number;
  specifications: {
    dimensions?: string;
    material?: string;
    embroidery?: string;
    detailsMn?: string;
  };
  sampleImagePlaceholder?: string;
}

export interface Department {
  id: string;
  code: string; // e.g. "ЗХ-032"
  nameMn: string; // e.g. "Зэвсэгт хүчний 032 дугаар анги"
  nameEn: string; // e.g. "032nd Military Unit of AFM"
  shortName: string; // e.g. "032-р анги"
  unitTypeMn?: string; // e.g. "Төрийн хүндэт харуулын тусгай батальон"
  type?: string;
  commandId: string; // parent Командлал this анги reports to
  color: string;
  badgeHex: string;
  colorBadge?: string;
  personnelCount: number;
  headOfficer: string;
  contactPhone?: string;
  location: string;
}

export interface Rank {
  id: string;
  nameMn: string;
  nameEn: string;
  category: 'Senior Officer' | 'Officer' | 'Sergeant' | 'Conscript';
  level: number;
}

export interface Personnel {
  id: string;
  militaryId: string; // e.g. "БХ-884912"
  nameMn: string;
  nameEn: string;
  departmentId: string;
  departmentName: string;
  rankId: string;
  rankName: string;
  rankCategory: 'Senior Officer' | 'Officer' | 'Sergeant' | 'Conscript';
  serviceType?: 'Conscript' | 'Contract'; // distinguishes term-service vs contract service, mainly for Conscript-tier personnel
  gender: 'male' | 'female';
  phone: string;
  email: string;
  enlistedDate: string;
  status: 'active' | 'on_leave' | 'transferred' | 'retired';
  avatar?: string;
  measurements: {
    heightCm: number;
    chestCm: number;
    waistCm: number;
    shoeSize: number;
    headCircumferenceCm: number;
    standardUniformSize: string; // e.g. "50-4"
  };
}

export type DistributionStatus = 'Issued' | 'Exchanged' | 'Expired' | 'Returned' | 'Renewed';

export interface DistributionRecord {
  id: string;
  distributionNo: string; // e.g. "DST-2025-0104"
  personnelId: string;
  personnelName: string;
  personnelMilitaryId: string;
  personnelRank: string;
  departmentName: string;
  uniformId: string;
  uniformModelCode: string;
  uniformNameMn: string;
  uniformNameEn: string;
  category: UniformCategory;
  size: string;
  quantity: number;
  issueDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD (standard +1 year)
  status: DistributionStatus;
  exchangeReferenceId?: string;
  exchangeReason?: string;
  conditionAtIssue: 'Brand New' | 'Standard Issue' | 'Reserve';
  issuedByOfficer: string;
  notes?: string;
  scannedSlipAttached?: boolean;
  scannedSlipName?: string;
  receivedPhysically?: boolean; // false = the soldier was paid the cash equivalent instead of receiving the physical item
}

/* ------------------------------------------------------------------ */
/* Three-tier supply chain: ЗХЖШ (central warehouse) -> Командлал      */
/* (command warehouse) -> Анги (unit warehouse) -> Personnel           */
/* ------------------------------------------------------------------ */

export type WarehouseLocationType = 'hq' | 'command' | 'unit';

export interface StockHolding {
  id: string;
  uniformId: string;
  size: string;
  locationType: WarehouseLocationType;
  locationId: string; // 'HQ' for hq, commandId for command, departmentId for unit
  quantity: number;
}

export interface SupplyTransfer {
  id: string;
  transferNo: string; // e.g. "TRF-2025-0104"
  uniformId: string;
  uniformNameMn: string;
  size: string;
  quantity: number;
  fromType: 'hq' | 'command';
  fromId: string; // 'HQ' or commandId
  fromLabel: string;
  toType: 'command' | 'unit';
  toId: string; // commandId or unitId
  toLabel: string;
  status: 'sent' | 'received';
  sentDate: string;
  receivedDate?: string;
  sentBy: string;
  receivedBy?: string;
}

export interface SupplyRequestItem {
  uniformId: string;
  uniformNameMn: string;
  size: string;
  quantity: number;
}

export interface SupplyRequest {
  id: string;
  requestNo: string; // e.g. "ХҮС-2025-0104"
  requestedByType: 'command' | 'unit';
  requestedById: string; // commandId or unitId
  requestedByLabel: string;
  toType: 'hq' | 'command'; // who the request is directed to
  toId: string; // 'HQ' or commandId
  items: SupplyRequestItem[];
  status: 'pending' | 'fulfilled' | 'rejected';
  requestedDate: string;
  requestedBy: string; // display name of the person who submitted it
  notes?: string;
  fulfilledDate?: string;
  rejectionReason?: string;
}

export interface ExchangeRecord {
  id: string;
  exchangeNo: string; // e.g. "EXC-2025-0038"
  originalDistributionId: string;
  newDistributionId: string;
  personnelId: string;
  personnelName: string;
  personnelMilitaryId: string;
  departmentName: string;
  uniformId: string;
  uniformModelCode: string;
  uniformName: string;
  oldSize: string;
  newSize: string;
  reason: 'Size Mismatch' | 'Damaged/Defective' | 'Seasonal Transition' | 'Rank Promotion' | 'Department Transfer';
  notes?: string;
  exchangeDate: string;
  handledByOfficer: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: UserRole;
  actionMn: string;
  actionEn: string;
  category: 'INVENTORY' | 'DISTRIBUTION' | 'EXCHANGE' | 'PERSONNEL' | 'SYSTEM' | 'TRANSFER';
  details: string;
  departmentId?: string; // анги the action relates to, for scoped visibility
}
