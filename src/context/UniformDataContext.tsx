import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  UniformItem, 
  UniformCategory,
  GenderType,
  SeasonType,
  PantoneColor,
  Department, 
  Command,
  Rank, 
  Personnel, 
  DistributionRecord, 
  ExchangeRecord, 
  AuditLog, 
  UserRole,
  OrgLevel,
  UserSession,
  RoleTitle,
  HQ_ROLES,
  StockHolding,
  SupplyTransfer,
  SupplyRequest,
  SupplyRequestItem,
  WarehouseLocationType
} from '../types';
import { INITIAL_UNIFORM_CATALOG, DEPARTMENTS_DATA, COMMANDS_DATA, RANKS_DATA } from '../data/uniformCatalogData';
import { seedHqHoldings, seedInitialSupplyRequests } from '../data/supplyChainSeed';
import { 
  INITIAL_PERSONNEL, 
  INITIAL_DISTRIBUTIONS, 
  INITIAL_EXCHANGES, 
  INITIAL_AUDIT_LOGS 
} from '../data/mockPersonnelAndDistributions';

interface IssueUniformPayload {
  personnelId: string;
  uniformId: string;
  size: string;
  quantity?: number;
  issueDate?: string;
  expiryDate?: string;
  conditionAtIssue?: 'Brand New' | 'Standard Issue' | 'Reserve';
  notes?: string;
  scannedSlipName?: string;
  receivedPhysically?: boolean; // false = soldier was paid the cash equivalent instead of receiving the physical item
}

interface ExchangeUniformPayload {
  originalDistributionId: string;
  newSize: string;
  reason: 'Size Mismatch' | 'Damaged/Defective' | 'Seasonal Transition' | 'Rank Promotion' | 'Department Transfer';
  notes?: string;
  returnToStock?: boolean;
}

interface UniformContextType {
  uniforms: UniformItem[];
  departments: Department[]; // scoped to the current session's visibility
  allDepartments: Department[]; // full, unscoped list (used for the login/session picker)
  commands: Command[]; // scoped to the current session's visibility
  allCommands: Command[]; // full, unscoped list of Командлал
  ranks: Rank[];
  personnel: Personnel[]; // scoped
  distributions: DistributionRecord[]; // scoped
  exchanges: ExchangeRecord[]; // scoped
  auditLogs: AuditLog[]; // scoped
  currentRole: UserRole;
  session: UserSession;
  setSession: (session: UserSession) => void;
  language: 'mn' | 'en';
  setLanguage: (lang: 'mn' | 'en') => void;
  
  // Actions
  issueUniform: (payload: IssueUniformPayload) => { success: boolean; message: string; record?: DistributionRecord };
  exchangeUniform: (payload: ExchangeUniformPayload) => { success: boolean; message: string; newRecord?: DistributionRecord };
  renewDistribution: (distId: string) => { success: boolean; message: string };
  returnUniform: (distId: string, returnToStock: boolean) => { success: boolean; message: string };
  
  updateUniformStock: (uniformId: string, size: string, newQuantity: number) => void;
  addUniformItem: (item: Omit<UniformItem, 'id'>) => void;
  editUniformItem: (item: UniformItem) => void;
  bulkImportUniforms: (importedItems: Array<{
    modelCode: string;
    nameMn: string;
    nameEn?: string;
    category: UniformCategory;
    gender: GenderType;
    season: SeasonType;
    departments?: string[];
    pantoneColors?: PantoneColor[];
    descriptionMn?: string;
    descriptionEn?: string;
    sizeStock: Record<string, number>;
    reorderLevel?: number;
    unitPriceMNT?: number;
    specifications?: {
      material?: string;
      dimensions?: string;
      embroidery?: string;
      detailsMn?: string;
    };
  }>, mode: 'merge_stock' | 'overwrite_or_create') => { importedCount: number; updatedCount: number; newCount: number };
  
  addPersonnel: (p: Omit<Personnel, 'id'>) => void;
  updatePersonnel: (p: Personnel) => void;
  deletePersonnel: (id: string) => void;

  addDepartment: (d: Omit<Department, 'id'>) => void;

  // Three-tier supply chain: ЗХЖШ -> Командлал -> Анги
  myLocationType: WarehouseLocationType;
  myLocationId: string;
  myHoldings: StockHolding[];
  myOutgoingTransfers: SupplyTransfer[];
  myIncomingTransfers: SupplyTransfer[];
  myOutgoingRequests: SupplyRequest[];
  myIncomingRequests: SupplyRequest[];
  sendSupply: (payload: { uniformId: string; size: string; quantity: number; toType: 'command' | 'unit'; toId: string }) => boolean;
  receiveSupply: (transferId: string) => void;
  registerOwnStock: (payload: { uniformId: string; size: string; quantity: number }) => void;
  submitSupplyRequest: (payload: { toType: 'hq' | 'command'; toId: string; items: SupplyRequestItem[]; notes?: string }) => void;
  fulfillSupplyRequest: (requestId: string) => boolean;
  rejectSupplyRequest: (requestId: string, reason: string) => void;
  getHoldingsFor: (locationType: WarehouseLocationType, locationId: string) => StockHolding[];
  getTransfersTo: (locationType: WarehouseLocationType, locationId: string) => SupplyTransfer[];

  resetToDefaults: () => void;
  getExpiringDistributions: (daysAhead?: number) => DistributionRecord[];
  getLowStockUniforms: () => UniformItem[];
}

const UniformContext = createContext<UniformContextType | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  UNIFORMS: 'udms_uniforms_v4',
  DEPARTMENTS: 'udms_departments_v6',
  PERSONNEL: 'udms_personnel_v5',
  DISTRIBUTIONS: 'udms_distributions_v5',
  EXCHANGES: 'udms_exchanges_v5',
  AUDIT_LOGS: 'udms_audit_logs_v3',
  SESSION: 'udms_session_v5',
  LANG: 'udms_language_v3',
  STOCK_HOLDINGS: 'udms_stock_holdings_v1',
  SUPPLY_TRANSFERS: 'udms_supply_transfers_v1',
  SUPPLY_REQUESTS: 'udms_supply_requests_v1'
};

// Default session: logged in at Headquarters (ЗХЖШ) level, sees the entire Armed Forces.
const DEFAULT_SESSION: UserSession = {
  level: 'hq',
  roleTitle: HQ_ROLES[0],
  commandId: null,
  unitId: null,
  displayName: `${HQ_ROLES[0]} (ЗХЖШ)`
};

// Maps the new hierarchical role titles onto the three legacy permission
// tiers ('System Admin' full control / 'Хувцас хангалтын офицер' operational /
// 'Дарга' read-only oversight) so existing UI gating keeps working unchanged.
function roleTitleToLegacyRole(roleTitle: RoleTitle): UserRole {
  switch (roleTitle) {
    case 'ЗХЖШ-ын дарга': return 'System Admin';
    case 'ЗХЖШ-ын хангамжийн офицер': return 'Хувцас хангалтын офицер';
    case 'ЗХЖШ-ын хянан шалгагч': return 'Дарга';
    case 'Командлалын дарга': return 'Дарга';
    case 'Командлалын хангамжийн офицер': return 'Хувцас хангалтын офицер';
    case 'Командлалын нярав': return 'Хувцас хангалтын офицер';
    case 'Ангийн дарга': return 'Дарга';
    case 'Ангийн хангамжийн офицер': return 'Хувцас хангалтын офицер';
    case 'Ангийн бичиг хэрэг': return 'Хувцас хангалтын офицер';
    default: return 'Дарга';
  }
}

export const UniformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uniforms, setUniforms] = useState<UniformItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.UNIFORMS);
    return saved ? JSON.parse(saved) : INITIAL_UNIFORM_CATALOG;
  });

  const [allDepartments, setAllDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.DEPARTMENTS);
    return saved ? JSON.parse(saved) : DEPARTMENTS_DATA;
  });

  const [stockHoldings, setStockHoldings] = useState<StockHolding[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.STOCK_HOLDINGS);
    return saved ? JSON.parse(saved) : seedHqHoldings();
  });

  const [supplyTransfers, setSupplyTransfers] = useState<SupplyTransfer[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.SUPPLY_TRANSFERS);
    return saved ? JSON.parse(saved) : [];
  });

  const [supplyRequests, setSupplyRequests] = useState<SupplyRequest[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.SUPPLY_REQUESTS);
    return saved ? JSON.parse(saved) : seedInitialSupplyRequests();
  });

  const [personnel, setPersonnel] = useState<Personnel[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.PERSONNEL);
    return saved ? JSON.parse(saved) : INITIAL_PERSONNEL;
  });

  const [distributions, setDistributions] = useState<DistributionRecord[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.DISTRIBUTIONS);
    return saved ? JSON.parse(saved) : INITIAL_DISTRIBUTIONS;
  });

  const [exchanges, setExchanges] = useState<ExchangeRecord[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.EXCHANGES);
    return saved ? JSON.parse(saved) : INITIAL_EXCHANGES;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.AUDIT_LOGS);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [session, setSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.SESSION);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.level && parsed.roleTitle) return parsed as UserSession;
      } catch { /* fall through to default */ }
    }
    return DEFAULT_SESSION;
  });

  const currentRole = roleTitleToLegacyRole(session.roleTitle);

  const [language, setLanguage] = useState<'mn' | 'en'>('mn');

  // Persistence effects
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.UNIFORMS, JSON.stringify(uniforms));
  }, [uniforms]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.DEPARTMENTS, JSON.stringify(allDepartments));
  }, [allDepartments]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.STOCK_HOLDINGS, JSON.stringify(stockHoldings));
  }, [stockHoldings]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SUPPLY_TRANSFERS, JSON.stringify(supplyTransfers));
  }, [supplyTransfers]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SUPPLY_REQUESTS, JSON.stringify(supplyRequests));
  }, [supplyRequests]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.PERSONNEL, JSON.stringify(personnel));
  }, [personnel]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.DISTRIBUTIONS, JSON.stringify(distributions));
  }, [distributions]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.EXCHANGES, JSON.stringify(exchanges));
  }, [exchanges]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SESSION, JSON.stringify(session));
  }, [session]);

  /* ------------------------------------------------------------------ */
  /* Hierarchical visibility: ЗХЖШ sees everything, Командлал sees only  */
  /* the анги below it, Анги sees only itself.                          */
  /* ------------------------------------------------------------------ */

  const isDeptInScope = (dept: Department): boolean => {
    if (session.level === 'hq') return true;
    if (session.level === 'command') return dept.commandId === session.commandId;
    if (session.level === 'unit') return dept.id === session.unitId;
    return false;
  };

  const departments = useMemo(
    () => allDepartments.filter(isDeptInScope),
    [allDepartments, session]
  );

  const scopedDeptIds = useMemo(
    () => new Set(departments.map(d => d.id)),
    [departments]
  );

  const commands = useMemo(() => {
    if (session.level === 'hq') return COMMANDS_DATA;
    return COMMANDS_DATA.filter(c => c.id === session.commandId);
  }, [session]);

  const scopedPersonnel = useMemo(
    () => personnel.filter(p => scopedDeptIds.has(p.departmentId)),
    [personnel, scopedDeptIds]
  );

  const scopedPersonnelIds = useMemo(
    () => new Set(scopedPersonnel.map(p => p.id)),
    [scopedPersonnel]
  );

  const scopedDistributions = useMemo(
    () => distributions.filter(d => scopedPersonnelIds.has(d.personnelId)),
    [distributions, scopedPersonnelIds]
  );

  const scopedExchanges = useMemo(
    () => exchanges.filter(e => scopedPersonnelIds.has(e.personnelId)),
    [exchanges, scopedPersonnelIds]
  );

  const scopedAuditLogs = useMemo(() => {
    if (session.level === 'hq') return auditLogs;
    return auditLogs.filter(l => !!l.departmentId && scopedDeptIds.has(l.departmentId));
  }, [auditLogs, scopedDeptIds, session.level]);

  const addAuditLog = (
    actionMn: string, 
    actionEn: string, 
    category: AuditLog['category'], 
    details: string,
    departmentId?: string
  ) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actor: session.displayName,
      role: currentRole,
      actionMn,
      actionEn,
      category,
      details,
      departmentId
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // 1. Issue Uniform
  const issueUniform = (payload: IssueUniformPayload) => {
    const targetPersonnel = personnel.find(p => p.id === payload.personnelId);
    if (!targetPersonnel) {
      return { success: false, message: 'Цэргийн албан хаагч олдсонгүй.' };
    }

    const targetUniform = uniforms.find(u => u.id === payload.uniformId);
    if (!targetUniform) {
      return { success: false, message: 'Дүрэмт хувцасны загвар олдсонгүй.' };
    }

    const qty = payload.quantity || 1;
    const currentStockForSize = targetUniform.sizeStock[payload.size] || 0;

    if (currentStockForSize < qty) {
      return { 
        success: false, 
        message: `Хангалттай үлдэгдэлгүй байна! Сонгосон размер (${payload.size}) үлдэгдэл: ${currentStockForSize} ширхэг.` 
      };
    }

    // Default dates: issue today, expiry +1 year
    const now = new Date();
    const issueDateStr = payload.issueDate || now.toISOString().slice(0, 10);
    
    const expiry = new Date(issueDateStr);
    expiry.setFullYear(expiry.getFullYear() + 1);
    const expiryDateStr = payload.expiryDate || expiry.toISOString().slice(0, 10);

    const newDistNo = `DST-${now.getFullYear()}-${String(distributions.length + 101).padStart(4, '0')}`;

    const newRecord: DistributionRecord = {
      id: `dist-${Date.now()}`,
      distributionNo: newDistNo,
      personnelId: targetPersonnel.id,
      personnelName: targetPersonnel.nameMn,
      personnelMilitaryId: targetPersonnel.militaryId,
      personnelRank: targetPersonnel.rankName,
      departmentName: targetPersonnel.departmentName,
      uniformId: targetUniform.id,
      uniformModelCode: targetUniform.modelCode,
      uniformNameMn: targetUniform.nameMn,
      uniformNameEn: targetUniform.nameEn,
      category: targetUniform.category,
      size: payload.size,
      quantity: qty,
      issueDate: issueDateStr,
      expiryDate: expiryDateStr,
      status: 'Issued',
      conditionAtIssue: payload.conditionAtIssue || 'Brand New',
      issuedByOfficer: session.displayName,
      notes: payload.notes,
      scannedSlipAttached: Boolean(payload.scannedSlipName),
      scannedSlipName: payload.scannedSlipName,
      receivedPhysically: payload.receivedPhysically !== false
    };

    // Deduct stock — only when the item was actually handed over physically.
    // A cash-compensated "issue" still starts the person's 1-year cycle and
    // audit trail, but no physical unit leaves the warehouse.
    if (payload.receivedPhysically !== false) {
      setUniforms(prev => prev.map(item => {
        if (item.id === targetUniform.id) {
          const updatedSizeStock = {
            ...item.sizeStock,
            [payload.size]: (item.sizeStock[payload.size] || 0) - qty
          };
          const updatedTotal = Object.values(updatedSizeStock).reduce((a, b) => Number(a) + Number(b), 0);
          return {
            ...item,
            sizeStock: updatedSizeStock,
            totalStock: updatedTotal,
            issuedCount: item.issuedCount + qty
          };
        }
        return item;
      }));
    }

    setDistributions(prev => [newRecord, ...prev]);

    addAuditLog(
      payload.receivedPhysically === false ? 'Мөнгөн урамшуулал олгосон' : 'Хувцас олголт баталгаажсан',
      payload.receivedPhysically === false ? 'Cash Compensation Issued' : 'Uniform Issued',
      'DISTRIBUTION',
      payload.receivedPhysically === false
        ? `${targetPersonnel.rankName} ${targetPersonnel.nameMn} (${targetPersonnel.militaryId})-д "${targetUniform.nameMn}" [${payload.size}]-ийн оронд мөнгөн урамшуулал олгов. Дараагийн эргэлт: ${expiryDateStr} хүртэл.`
        : `${targetPersonnel.rankName} ${targetPersonnel.nameMn} (${targetPersonnel.militaryId})-д "${targetUniform.nameMn}" [${payload.size}] олгогдов. Хүчинтэй хугацаа: ${expiryDateStr} хүртэл.`,
      targetPersonnel.departmentId
    );

    return { 
      success: true, 
      message: `Амжилттай олгогдлоо. Баримтын дугаар: ${newDistNo}`,
      record: newRecord 
    };
  };

  // 2. Exchange Uniform (Size Swap / Damage)
  const exchangeUniform = (payload: ExchangeUniformPayload) => {
    const originalDist = distributions.find(d => d.id === payload.originalDistributionId);
    if (!originalDist) {
      return { success: false, message: 'Анхны олголтын бүртгэл олдсонгүй.' };
    }

    if (originalDist.status === 'Exchanged') {
      return { success: false, message: 'Энэ олголт аль хэдийн солигдсон байна.' };
    }

    const uniform = uniforms.find(u => u.id === originalDist.uniformId);
    if (!uniform) {
      return { success: false, message: 'Дүрэмт хувцас олдсонгүй.' };
    }

    const newSizeStock = uniform.sizeStock[payload.newSize] || 0;
    if (newSizeStock < 1) {
      return { 
        success: false, 
        message: `Шинэ сонгосон размер (${payload.newSize}) агуулахад үлдэгдэлгүй байна.` 
      };
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const newExpiry = new Date();
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    const newExpiryStr = newExpiry.toISOString().slice(0, 10);

    const newDistId = `dist-${Date.now()}`;
    const newDistNo = `${originalDist.distributionNo}-EX`;
    const excNo = `EXC-${now.getFullYear()}-${String(exchanges.length + 101).padStart(4, '0')}`;

    // New Issuance record with reset +1 year expiry
    const newIssuance: DistributionRecord = {
      id: newDistId,
      distributionNo: newDistNo,
      personnelId: originalDist.personnelId,
      personnelName: originalDist.personnelName,
      personnelMilitaryId: originalDist.personnelMilitaryId,
      personnelRank: originalDist.personnelRank,
      departmentName: originalDist.departmentName,
      uniformId: originalDist.uniformId,
      uniformModelCode: originalDist.uniformModelCode,
      uniformNameMn: originalDist.uniformNameMn,
      uniformNameEn: originalDist.uniformNameEn,
      category: originalDist.category,
      size: payload.newSize,
      quantity: originalDist.quantity,
      issueDate: todayStr,
      expiryDate: newExpiryStr, // Reset expiry to +1 year
      status: 'Issued',
      exchangeReferenceId: originalDist.id,
      conditionAtIssue: 'Brand New',
      issuedByOfficer: session.displayName,
      notes: `Солилцооны баримт: ${excNo}. Хуучин размер: ${originalDist.size} -> Шинэ: ${payload.newSize}. Шалтгаан: ${payload.reason}.`
    };

    // Exchange Log
    const exchangeRecord: ExchangeRecord = {
      id: `exc-${Date.now()}`,
      exchangeNo: excNo,
      originalDistributionId: originalDist.id,
      newDistributionId: newDistId,
      personnelId: originalDist.personnelId,
      personnelName: originalDist.personnelName,
      personnelMilitaryId: originalDist.personnelMilitaryId,
      departmentName: originalDist.departmentName,
      uniformId: originalDist.uniformId,
      uniformModelCode: originalDist.uniformModelCode,
      uniformName: originalDist.uniformNameMn,
      oldSize: originalDist.size,
      newSize: payload.newSize,
      reason: payload.reason,
      notes: payload.notes,
      exchangeDate: todayStr,
      handledByOfficer: session.displayName
    };

    // Mark original as Exchanged
    setDistributions(prev => prev.map(d => {
      if (d.id === originalDist.id) {
        return {
          ...d,
          status: 'Exchanged',
          exchangeReferenceId: newDistId,
          exchangeReason: payload.reason
        };
      }
      return d;
    }).concat(newIssuance));

    setExchanges(prev => [exchangeRecord, ...prev]);

    // Stock adjustment: return old size (if returnToStock !== false), deduct new size
    setUniforms(prev => prev.map(item => {
      if (item.id === uniform.id) {
        const shouldReturnOld = payload.returnToStock !== false;
        const updatedSizeStock = { ...item.sizeStock };
        
        if (shouldReturnOld) {
          updatedSizeStock[originalDist.size] = (updatedSizeStock[originalDist.size] || 0) + originalDist.quantity;
        }
        updatedSizeStock[payload.newSize] = Math.max(0, (updatedSizeStock[payload.newSize] || 0) - originalDist.quantity);
        
        const updatedTotal = Object.values(updatedSizeStock).reduce((a, b) => Number(a) + Number(b), 0);
        return {
          ...item,
          sizeStock: updatedSizeStock,
          totalStock: updatedTotal
        };
      }
      return item;
    }));

    addAuditLog(
      'Размер солих солилцоо бүртгэгдсэн',
      'Uniform Size Exchanged',
      'EXCHANGE',
      `${originalDist.personnelRank} ${originalDist.personnelName}-ийн "${uniform.nameMn}" олголтыг [${originalDist.size} -> ${payload.newSize}] болгон сольж хугацааг +1 жилээр шинэчлэн тооцов. Баримт: ${excNo}`,
      personnel.find(p => p.id === originalDist.personnelId)?.departmentId
    );

    return { 
      success: true, 
      message: `Солилцоо амжилттай хийгдэж, хүчинтэй хугацааг +1 жилээр сунгаж шинэчлэн олголоо. Баримт: ${excNo}`,
      newRecord: newIssuance
    };
  };

  // 3. Renew Distribution
  const renewDistribution = (distId: string) => {
    const dist = distributions.find(d => d.id === distId);
    if (!dist) return { success: false, message: 'Олголт олдсонгүй.' };

    const uniform = uniforms.find(u => u.id === dist.uniformId);
    if (!uniform) return { success: false, message: 'Хувцас олдсонгүй.' };

    const currentStock = uniform.sizeStock[dist.size] || 0;
    if (currentStock < 1) {
      return { success: false, message: `Шинээр олгоход размер (${dist.size}) үлдэгдэл хүрэлцэхгүй байна.` };
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const newExp = new Date();
    newExp.setFullYear(newExp.getFullYear() + 1);
    const newExpStr = newExp.toISOString().slice(0, 10);

    setDistributions(prev => prev.map(d => {
      if (d.id === distId) {
        return {
          ...d,
          issueDate: todayStr,
          expiryDate: newExpStr,
          status: 'Issued',
          notes: (d.notes ? d.notes + ' | ' : '') + `Шинэчлэн сунгасан огноо: ${todayStr}`
        };
      }
      return d;
    }));

    // Deduct stock for new cycle
    setUniforms(prev => prev.map(u => {
      if (u.id === uniform.id) {
        const updatedSizes = {
          ...u.sizeStock,
          [dist.size]: Math.max(0, (u.sizeStock[dist.size] || 0) - 1)
        };
        return {
          ...u,
          sizeStock: updatedSizes,
          totalStock: Object.values(updatedSizes).reduce((a, b) => Number(a) + Number(b), 0),
          issuedCount: u.issuedCount + 1
        };
      }
      return u;
    }));

    addAuditLog(
      'Хувцас олголт сунгагдсан',
      'Uniform Renewed',
      'DISTRIBUTION',
      `${dist.personnelRank} ${dist.personnelName}-ийн "${dist.uniformNameMn}" олголтын хугацааг 1 жилээр шинэчлэн сунгав.`,
      personnel.find(p => p.id === dist.personnelId)?.departmentId
    );

    return { success: true, message: 'Олголт амжилттай сунгагдлаа.' };
  };

  // 4. Return Uniform
  const returnUniform = (distId: string, returnToStock: boolean) => {
    const dist = distributions.find(d => d.id === distId);
    if (!dist) return { success: false, message: 'Олголт олдсонгүй.' };

    setDistributions(prev => prev.map(d => {
      if (d.id === distId) {
        return { ...d, status: 'Returned' };
      }
      return d;
    }));

    if (returnToStock) {
      setUniforms(prev => prev.map(u => {
        if (u.id === dist.uniformId) {
          const updatedSizes = {
            ...u.sizeStock,
            [dist.size]: (u.sizeStock[dist.size] || 0) + dist.quantity
          };
          return {
            ...u,
            sizeStock: updatedSizes,
            totalStock: Object.values(updatedSizes).reduce((a, b) => Number(a) + Number(b), 0),
            issuedCount: Math.max(0, u.issuedCount - dist.quantity)
          };
        }
        return u;
      }));
    }

    addAuditLog(
      'Хувцас буцаан татсан',
      'Uniform Returned',
      'DISTRIBUTION',
      `${dist.personnelRank} ${dist.personnelName}-ээс "${dist.uniformNameMn}" буцаан хүлээн авсан.`,
      personnel.find(p => p.id === dist.personnelId)?.departmentId
    );

    return { success: true, message: 'Амжилттай буцаан бүртгэгдлээ.' };
  };

  // 5. Stock Update
  const updateUniformStock = (uniformId: string, size: string, newQuantity: number) => {
    setUniforms(prev => prev.map(u => {
      if (u.id === uniformId) {
        const oldQty = u.sizeStock[size] || 0;
        const diff = newQuantity - oldQty;
        const updatedSizes = {
          ...u.sizeStock,
          [size]: Math.max(0, newQuantity)
        };
        const updatedTotal = Object.values(updatedSizes).reduce((a, b) => Number(a) + Number(b), 0);

        if (diff !== 0) {
          setStockHoldings(hPrev => adjustHolding(hPrev, uniformId, size, 'hq', 'HQ', diff));
        }

        addAuditLog(
          'Агуулахын нөөц тохируулсан',
          'Stock Adjusted',
          'INVENTORY',
          `"${u.nameMn}" [${size}] размер: ${oldQty} -> ${newQuantity} (${diff >= 0 ? '+' : ''}${diff}) болж өөрчлөгдлөө. ЗХЖШ агуулахад тусгав.`
        );

        return {
          ...u,
          sizeStock: updatedSizes,
          totalStock: updatedTotal
        };
      }
      return u;
    }));
  };

  const addUniformItem = (itemData: Omit<UniformItem, 'id'>) => {
    const newItem: UniformItem = {
      ...itemData,
      id: `uni-${Date.now()}`
    };
    setUniforms(prev => [newItem, ...prev]);
    addAuditLog(
      'Шинэ дүрэмт хувцас бүртгэгдсэн',
      'New Uniform Added',
      'INVENTORY',
      `Шинэ загвар нэмэгдлээ: [${newItem.modelCode}] ${newItem.nameMn}`
    );
  };

  const editUniformItem = (item: UniformItem) => {
    setUniforms(prev => prev.map(u => u.id === item.id ? item : u));
    addAuditLog(
      'Дүрэмт хувцасны мэдээлэл шинэчлэгдсэн',
      'Uniform Updated',
      'INVENTORY',
      `[${item.modelCode}] ${item.nameMn} загварын тодорхойлолт, мэдээлэл шинэчлэгдэв.`
    );
  };

  const bulkImportUniforms = (
    importedItems: Array<{
      modelCode: string;
      nameMn: string;
      nameEn?: string;
      category: UniformCategory;
      gender: GenderType;
      season: SeasonType;
      departments?: string[];
      pantoneColors?: PantoneColor[];
      descriptionMn?: string;
      descriptionEn?: string;
      sizeStock: Record<string, number>;
      reorderLevel?: number;
      unitPriceMNT?: number;
      specifications?: {
        material?: string;
        dimensions?: string;
        embroidery?: string;
        detailsMn?: string;
      };
    }>,
    mode: 'merge_stock' | 'overwrite_or_create' = 'merge_stock'
  ) => {
    let updatedCount = 0;
    let newCount = 0;
    const holdingDeltas: { uniformId: string; size: string; delta: number }[] = [];

    setUniforms(prev => {
      const updatedList = [...prev];

      importedItems.forEach((imported, index) => {
        const existingIndex = updatedList.findIndex(
          u => u.modelCode.trim().toLowerCase() === imported.modelCode.trim().toLowerCase()
        );

        if (existingIndex >= 0) {
          const existing = updatedList[existingIndex];
          const newSizeStock = { ...existing.sizeStock };

          if (mode === 'merge_stock') {
            // Add incoming quantities to existing size stock
            Object.entries(imported.sizeStock).forEach(([sz, qty]) => {
              const numQty = Number(qty) || 0;
              newSizeStock[sz] = (newSizeStock[sz] || 0) + numQty;
              if (numQty !== 0) holdingDeltas.push({ uniformId: existing.id, size: sz, delta: numQty });
            });
          } else {
            // Overwrite sizes provided in import
            Object.entries(imported.sizeStock).forEach(([sz, qty]) => {
              const numQty = Number(qty) || 0;
              const oldSz = newSizeStock[sz] || 0;
              newSizeStock[sz] = numQty;
              if (numQty !== oldSz) holdingDeltas.push({ uniformId: existing.id, size: sz, delta: numQty - oldSz });
            });
          }

          const newTotalStock = Object.values(newSizeStock).reduce((a, b) => Number(a) + Number(b), 0);

          updatedList[existingIndex] = {
            ...existing,
            nameMn: imported.nameMn || existing.nameMn,
            nameEn: imported.nameEn || existing.nameEn,
            category: imported.category || existing.category,
            gender: imported.gender || existing.gender,
            season: imported.season || existing.season,
            departments: imported.departments && imported.departments.length > 0 ? imported.departments : existing.departments,
            pantoneColors: imported.pantoneColors && imported.pantoneColors.length > 0 ? imported.pantoneColors : existing.pantoneColors,
            descriptionMn: imported.descriptionMn || existing.descriptionMn,
            descriptionEn: imported.descriptionEn || existing.descriptionEn,
            sizeStock: newSizeStock,
            totalStock: newTotalStock,
            reorderLevel: imported.reorderLevel !== undefined ? imported.reorderLevel : existing.reorderLevel,
            unitPriceMNT: imported.unitPriceMNT !== undefined ? imported.unitPriceMNT : existing.unitPriceMNT,
            specifications: {
              ...existing.specifications,
              ...(imported.specifications || {})
            }
          };
          updatedCount++;
        } else {
          // Create new uniform model
          const totalStock = Object.values(imported.sizeStock).reduce((a, b) => Number(a) + Number(b), 0);
          const newItem: UniformItem = {
            id: `uni-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
            modelCode: imported.modelCode.trim(),
            nameMn: imported.nameMn.trim(),
            nameEn: imported.nameEn || imported.nameMn,
            category: imported.category || 'Outerwear',
            gender: imported.gender || 'unisex',
            season: imported.season || 'all-season',
            departments: imported.departments || ['All'],
            pantoneColors: imported.pantoneColors || [
              { nameMn: 'Хар ногоон', nameEn: 'Dark Green', code: 'Pantone 19-5350 TPX', hex: '#19392B' }
            ],
            descriptionMn: imported.descriptionMn || `Ерөнхийлөгчийн 141 дүгээр зарлигт заасан ${imported.nameMn}`,
            descriptionEn: imported.descriptionEn || `Standard military issue ${imported.nameEn || imported.nameMn}`,
            sizeStock: imported.sizeStock,
            totalStock,
            issuedCount: 0,
            reorderLevel: imported.reorderLevel || 15,
            unitPriceMNT: imported.unitPriceMNT || 150000,
            specifications: imported.specifications || { material: 'Цэргийн зориулалттай тусгай даавуу' }
          };
          updatedList.unshift(newItem);
          newCount++;
          Object.entries(imported.sizeStock).forEach(([sz, qty]) => {
            const numQty = Number(qty) || 0;
            if (numQty !== 0) holdingDeltas.push({ uniformId: newItem.id, size: sz, delta: numQty });
          });
        }
      });

      return updatedList;
    });

    if (holdingDeltas.length > 0) {
      setStockHoldings(hPrev => {
        let updated = hPrev;
        holdingDeltas.forEach(d => {
          updated = adjustHolding(updated, d.uniformId, d.size, 'hq', 'HQ', d.delta);
        });
        return updated;
      });
    }

    addAuditLog(
      'Нөөц олноор импортлогдсон (Excel / CSV)',
      'Bulk Stock Imported (Excel / CSV)',
      'INVENTORY',
      `Нийт ${importedItems.length} загварын нөөц бүртгэгдэв (${newCount} шинэ загвар, ${updatedCount} загварын нөөц нэмэгдэв). Горим: ${mode === 'merge_stock' ? 'Нөөц нэмэх (Татан авалт)' : 'Шинэчлэн солих'}.`
    );

    return {
      importedCount: importedItems.length,
      updatedCount,
      newCount
    };
  };

  const addPersonnel = (pData: Omit<Personnel, 'id'>) => {
    const newP: Personnel = {
      ...pData,
      id: `pers-${Date.now()}`
    };
    setPersonnel(prev => [newP, ...prev]);
    addAuditLog(
      'Албан хаагч шинээр бүртгэгдсэн',
      'Personnel Enrolled',
      'PERSONNEL',
      `${newP.rankName} ${newP.nameMn} (${newP.militaryId}) амжилттай бүртгэгдлээ.`,
      newP.departmentId
    );
  };

  const updatePersonnel = (p: Personnel) => {
    setPersonnel(prev => prev.map(item => item.id === p.id ? p : item));
    addAuditLog(
      'Албан хаагчийн мэдээлэл шинэчлэгдсэн',
      'Personnel Updated',
      'PERSONNEL',
      `${p.rankName} ${p.nameMn} (${p.militaryId})-ийн биеийн хэмжээ, хувийн хэрэг шинэчлэгдэв.`,
      p.departmentId
    );
  };

  const deletePersonnel = (id: string) => {
    const target = personnel.find(p => p.id === id);
    setPersonnel(prev => prev.filter(p => p.id !== id));
    if (target) {
      addAuditLog(
        'Албан хаагч хасагдсан',
        'Personnel Removed',
        'PERSONNEL',
        `${target.rankName} ${target.nameMn} жагсаалтаас хасагдлаа.`,
        target.departmentId
      );
    }
  };

  const addDepartment = (dData: Omit<Department, 'id'>) => {
    const newDept: Department = {
      ...dData,
      id: `dept-${Date.now()}`
    };
    setAllDepartments(prev => [...prev, newDept]);
    addAuditLog(
      'Шинэ анги бүртгэгдсэн',
      'New Unit Registered',
      'SYSTEM',
      `${newDept.nameMn} (${newDept.code}) анги нэмэгдлээ.`,
      newDept.id
    );
  };

  /* ------------------------------------------------------------------ */
  /* Three-tier supply chain: ЗХЖШ -> Командлал -> Анги                  */
  /* ------------------------------------------------------------------ */

  const locationLabel = (locationType: WarehouseLocationType, locationId: string): string => {
    if (locationType === 'hq') return 'ЗХЖШ';
    if (locationType === 'command') return COMMANDS_DATA.find(c => c.id === locationId)?.nameMn || locationId;
    return allDepartments.find(d => d.id === locationId)?.shortName || locationId;
  };

  const myLocationType: WarehouseLocationType = session.level === 'hq' ? 'hq' : session.level === 'command' ? 'command' : 'unit';
  const myLocationId = session.level === 'hq' ? 'HQ' : session.level === 'command' ? (session.commandId || '') : (session.unitId || '');

  const getHoldingsFor = (locationType: WarehouseLocationType, locationId: string) =>
    stockHoldings.filter(h => h.locationType === locationType && h.locationId === locationId && h.quantity > 0);

  const getTransfersTo = (locationType: WarehouseLocationType, locationId: string) =>
    supplyTransfers.filter(t => t.toType === locationType && t.toId === locationId);

  const myHoldings = useMemo(() => getHoldingsFor(myLocationType, myLocationId), [stockHoldings, myLocationType, myLocationId]);
  const myOutgoingTransfers = useMemo(
    () => supplyTransfers.filter(t => t.fromType === myLocationType && t.fromId === myLocationId),
    [supplyTransfers, myLocationType, myLocationId]
  );
  const myIncomingTransfers = useMemo(
    () => supplyTransfers.filter(t => t.toType === myLocationType && t.toId === myLocationId),
    [supplyTransfers, myLocationType, myLocationId]
  );
  const myOutgoingRequests = useMemo(
    () => supplyRequests.filter(r => r.requestedByType === myLocationType && r.requestedById === myLocationId),
    [supplyRequests, myLocationType, myLocationId]
  );
  const myIncomingRequests = useMemo(
    () => supplyRequests.filter(r => r.toType === myLocationType && r.toId === myLocationId),
    [supplyRequests, myLocationType, myLocationId]
  );

  const adjustHolding = (
    holdings: StockHolding[],
    uniformId: string,
    size: string,
    locationType: WarehouseLocationType,
    locationId: string,
    delta: number
  ): StockHolding[] => {
    const idx = holdings.findIndex(
      h => h.uniformId === uniformId && h.size === size && h.locationType === locationType && h.locationId === locationId
    );
    if (idx >= 0) {
      const updated = [...holdings];
      updated[idx] = { ...updated[idx], quantity: Math.max(0, updated[idx].quantity + delta) };
      return updated;
    }
    if (delta > 0) {
      return [
        ...holdings,
        {
          id: `hold-${locationType}-${locationId}-${uniformId}-${size}-${Date.now()}`,
          uniformId,
          size,
          locationType,
          locationId,
          quantity: delta
        }
      ];
    }
    return holdings;
  };

  // Sends supply out of MY OWN warehouse down to a child (ЗХЖШ -> Командлал, or Командлал -> Анги).
  const sendSupply = (payload: { uniformId: string; size: string; quantity: number; toType: 'command' | 'unit'; toId: string }): boolean => {
    const item = uniforms.find(u => u.id === payload.uniformId);
    const fromHolding = stockHoldings.find(
      h => h.uniformId === payload.uniformId && h.size === payload.size && h.locationType === myLocationType && h.locationId === myLocationId
    );
    if (!item || !fromHolding || fromHolding.quantity < payload.quantity || payload.quantity <= 0) return false;

    setStockHoldings(prev => adjustHolding(prev, payload.uniformId, payload.size, myLocationType, myLocationId, -payload.quantity));

    const todayStr = new Date().toISOString().slice(0, 10);
    const transfer: SupplyTransfer = {
      id: `trf-${Date.now()}`,
      transferNo: `TRF-${new Date().getFullYear()}-${String(supplyTransfers.length + 1).padStart(4, '0')}`,
      uniformId: payload.uniformId,
      uniformNameMn: item.nameMn,
      size: payload.size,
      quantity: payload.quantity,
      fromType: myLocationType === 'unit' ? 'command' : (myLocationType as 'hq' | 'command'),
      fromId: myLocationId,
      fromLabel: locationLabel(myLocationType, myLocationId),
      toType: payload.toType,
      toId: payload.toId,
      toLabel: locationLabel(payload.toType, payload.toId),
      status: 'sent',
      sentDate: todayStr,
      sentBy: session.displayName
    };
    setSupplyTransfers(prev => [transfer, ...prev]);
    addAuditLog(
      'Дүрэмт хувцас илгээсэн',
      'Supply Sent',
      'INVENTORY',
      `${transfer.fromLabel}-с ${transfer.toLabel}-д "${item.nameMn}" [${payload.size}] x${payload.quantity} илгээв. (${transfer.transferNo})`,
      payload.toType === 'unit' ? payload.toId : undefined
    );
    return true;
  };

  // Accepts an incoming transfer into MY OWN warehouse.
  const receiveSupply = (transferId: string) => {
    const transfer = supplyTransfers.find(t => t.id === transferId);
    if (!transfer || transfer.status === 'received') return;
    setStockHoldings(prev => adjustHolding(prev, transfer.uniformId, transfer.size, transfer.toType, transfer.toId, transfer.quantity));
    const todayStr = new Date().toISOString().slice(0, 10);
    setSupplyTransfers(prev =>
      prev.map(t => (t.id === transferId ? { ...t, status: 'received', receivedDate: todayStr, receivedBy: session.displayName } : t))
    );
    addAuditLog(
      'Дүрэмт хувцас хүлээн авсан',
      'Supply Received',
      'INVENTORY',
      `${transfer.toLabel} нь ${transfer.fromLabel}-с "${transfer.uniformNameMn}" [${transfer.size}] x${transfer.quantity}-г хүлээн авав. (${transfer.transferNo})`,
      transfer.toType === 'unit' ? transfer.toId : undefined
    );
  };

  // Командлал/Анги registers stock directly into their OWN warehouse (e.g. locally
  // procured or donated items) without it having come through a ЗХЖШ/Командлал transfer.
  const registerOwnStock = (payload: { uniformId: string; size: string; quantity: number }) => {
    if (myLocationType === 'hq' || payload.quantity <= 0) return;
    const uniform = uniforms.find(u => u.id === payload.uniformId);
    setStockHoldings(prev => adjustHolding(prev, payload.uniformId, payload.size, myLocationType, myLocationId, payload.quantity));
    addAuditLog(
      'Нөөц шинээр бүртгэсэн',
      'Stock Registered Locally',
      'INVENTORY',
      `${locationLabel(myLocationType, myLocationId)} өөрийн агуулахдаа "${uniform?.nameMn || payload.uniformId}" [${payload.size}] x${payload.quantity} шинээр бүртгэв.`,
      myLocationType === 'unit' ? myLocationId : undefined
    );
  };

  // Submits a request from MY OWN location up to my parent (Анги -> Командлал, or Командлал -> ЗХЖШ).
  const submitSupplyRequest = (payload: { toType: 'hq' | 'command'; items: SupplyRequestItem[]; toId: string; notes?: string }) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const req: SupplyRequest = {
      id: `req-${Date.now()}`,
      requestNo: `ХҮС-${new Date().getFullYear()}-${String(supplyRequests.length + 1).padStart(4, '0')}`,
      requestedByType: myLocationType === 'hq' ? 'command' : (myLocationType as 'command' | 'unit'),
      requestedById: myLocationId,
      requestedByLabel: locationLabel(myLocationType, myLocationId),
      toType: payload.toType,
      toId: payload.toId,
      items: payload.items,
      status: 'pending',
      requestedDate: todayStr,
      requestedBy: session.displayName,
      notes: payload.notes
    };
    setSupplyRequests(prev => [req, ...prev]);
    addAuditLog(
      'Хангамжийн хүсэлт илгээсэн',
      'Supply Request Submitted',
      'INVENTORY',
      `${req.requestedByLabel} нь ${locationLabel(payload.toType, payload.toId)}-д хангамжийн хүсэлт (${req.requestNo}) илгээв.`,
      myLocationType === 'unit' ? myLocationId : undefined
    );
  };

  // Fulfills an incoming request by sending the requested items out of MY OWN warehouse (all-or-nothing).
  const fulfillSupplyRequest = (requestId: string): boolean => {
    const req = supplyRequests.find(r => r.id === requestId);
    if (!req || req.status !== 'pending') return false;

    for (const it of req.items) {
      const holding = stockHoldings.find(
        h => h.uniformId === it.uniformId && h.size === it.size && h.locationType === myLocationType && h.locationId === myLocationId
      );
      if (!holding || holding.quantity < it.quantity) return false;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    let updatedHoldings = stockHoldings;
    const newTransfers: SupplyTransfer[] = [];
    req.items.forEach((it, i) => {
      updatedHoldings = adjustHolding(updatedHoldings, it.uniformId, it.size, myLocationType, myLocationId, -it.quantity);
      newTransfers.push({
        id: `trf-${Date.now()}-${i}`,
        transferNo: `TRF-${new Date().getFullYear()}-${String(supplyTransfers.length + 1 + i).padStart(4, '0')}`,
        uniformId: it.uniformId,
        uniformNameMn: it.uniformNameMn,
        size: it.size,
        quantity: it.quantity,
        fromType: myLocationType as 'hq' | 'command',
        fromId: myLocationId,
        fromLabel: locationLabel(myLocationType, myLocationId),
        toType: req.requestedByType,
        toId: req.requestedById,
        toLabel: req.requestedByLabel,
        status: 'sent',
        sentDate: todayStr,
        sentBy: session.displayName
      });
    });
    setStockHoldings(updatedHoldings);
    setSupplyTransfers(prev => [...newTransfers, ...prev]);
    setSupplyRequests(prev => prev.map(r => (r.id === requestId ? { ...r, status: 'fulfilled', fulfilledDate: todayStr } : r)));
    addAuditLog(
      'Хангамжийн хүсэлт биелүүлсэн',
      'Supply Request Fulfilled',
      'INVENTORY',
      `${locationLabel(myLocationType, myLocationId)} нь ${req.requestedByLabel}-ийн хүсэлтийг (${req.requestNo}) биелүүлж, хувцас илгээв.`,
      req.requestedByType === 'unit' ? req.requestedById : undefined
    );
    return true;
  };

  const rejectSupplyRequest = (requestId: string, reason: string) => {
    const req = supplyRequests.find(r => r.id === requestId);
    if (!req) return;
    setSupplyRequests(prev =>
      prev.map(r => (r.id === requestId ? { ...r, status: 'rejected', rejectionReason: reason } : r))
    );
    addAuditLog(
      'Хангамжийн хүсэлт татгалзсан',
      'Supply Request Rejected',
      'INVENTORY',
      `${req.requestedByLabel}-ийн хүсэлтийг (${req.requestNo}) татгалзав. Шалтгаан: ${reason}`,
      req.requestedByType === 'unit' ? req.requestedById : undefined
    );
  };

  const resetToDefaults = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.UNIFORMS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.DEPARTMENTS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.PERSONNEL);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.DISTRIBUTIONS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.EXCHANGES);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.AUDIT_LOGS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.STOCK_HOLDINGS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.SUPPLY_TRANSFERS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.SUPPLY_REQUESTS);
    setUniforms(INITIAL_UNIFORM_CATALOG);
    setAllDepartments(DEPARTMENTS_DATA);
    setPersonnel(INITIAL_PERSONNEL);
    setDistributions(INITIAL_DISTRIBUTIONS);
    setExchanges(INITIAL_EXCHANGES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSession(DEFAULT_SESSION);
    setStockHoldings(seedHqHoldings());
    setSupplyTransfers([]);
    setSupplyRequests(seedInitialSupplyRequests());
  };

  // Helper: Expiring in <= daysAhead (default 30 days) or already expired
  // (scoped to the current session automatically, since it reads `scopedDistributions`)
  const getExpiringDistributions = (daysAhead = 30) => {
    const now = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(futureLimit.getDate() + daysAhead);

    return scopedDistributions.filter(d => {
      if (d.status !== 'Issued') return false;
      const expDate = new Date(d.expiryDate);
      return expDate <= futureLimit;
    }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  };

  const getLowStockUniforms = () => {
    return uniforms.filter(u => u.totalStock <= u.reorderLevel);
  };

  return (
    <UniformContext.Provider
      value={{
        uniforms,
        departments,
        allDepartments,
        commands,
        allCommands: COMMANDS_DATA,
        ranks: RANKS_DATA,
        personnel: scopedPersonnel,
        distributions: scopedDistributions,
        exchanges: scopedExchanges,
        auditLogs: scopedAuditLogs,
        currentRole,
        session,
        setSession,
        language,
        setLanguage,
        issueUniform,
        exchangeUniform,
        renewDistribution,
        returnUniform,
        updateUniformStock,
        addUniformItem,
        editUniformItem,
        bulkImportUniforms,
        addPersonnel,
        updatePersonnel,
        deletePersonnel,
        addDepartment,
        myLocationType,
        myLocationId,
        myHoldings,
        myOutgoingTransfers,
        myIncomingTransfers,
        myOutgoingRequests,
        myIncomingRequests,
        sendSupply,
        receiveSupply,
        registerOwnStock,
        submitSupplyRequest,
        fulfillSupplyRequest,
        rejectSupplyRequest,
        getHoldingsFor,
        getTransfersTo,
        resetToDefaults,
        getExpiringDistributions,
        getLowStockUniforms
      }}
    >
      {children}
    </UniformContext.Provider>
  );
};

export const useUniformData = () => {
  const context = useContext(UniformContext);
  if (!context) {
    throw new Error('useUniformData must be used within a UniformProvider');
  }
  return context;
};
