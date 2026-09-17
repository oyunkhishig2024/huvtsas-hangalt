import React, { useState } from 'react';
import { 
  Users, 
  ClipboardList, 
  Bell, 
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Home,
  Package,
  FileSignature
} from 'lucide-react';
import { useUniformData } from '../context/UniformDataContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab
}) => {
  const { 
    currentRole,
    session,
    language, 
    setLanguage, 
    getExpiringDistributions,
    getLowStockUniforms,
    resetToDefaults
  } = useUniformData();

  const [showNotifications, setShowNotifications] = useState(false);

  const expiringItems = getExpiringDistributions(30);
  const lowStockItems = getLowStockUniforms();
  const totalAlerts = expiringItems.length + lowStockItems.length;

  // The tab bar is intentionally minimal and depends on which level is logged in —
  // HQ/Командлал manage the supply chain, Анги also manages its own personnel.
  const navItems = session.level === 'unit'
    ? [
        { id: 'register-new', labelMn: 'Шинээр бүртгэх', labelEn: 'Register New', icon: Sparkles },
        { id: 'warehouse', labelMn: 'Агуулах', labelEn: 'Warehouse', icon: Package },
        { id: 'supply-requests', labelMn: 'Хангамжийн хүсэлт', labelEn: 'Supply Requests', icon: FileSignature },
        { id: 'distributions', labelMn: 'Хуваарилалт', labelEn: 'Distribution', icon: ClipboardList },
        { id: 'personnel', labelMn: 'Алба хаагчийн профайл', labelEn: 'Employee Profile', icon: Users }
      ]
    : [
        { id: 'register-new', labelMn: 'Шинээр бүртгэх', labelEn: 'Register New', icon: Sparkles },
        { id: 'warehouse', labelMn: 'Агуулах', labelEn: 'Warehouse', icon: Package },
        { id: 'distributions', labelMn: 'Хуваарилалт', labelEn: 'Distribution', icon: ClipboardList },
        { id: 'supply-requests', labelMn: 'Хангамжийн хүсэлт', labelEn: 'Supply Requests', icon: FileSignature }
      ];

  return (
    <header className="sticky top-0 z-40 bg-teal-900/95 backdrop-blur-md border-b border-teal-800 text-foam-50 shadow-xl">
      {/* Top Utility Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-teal-800/60 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {activeTab !== 'home' ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-foam-300/10 border border-foam-300/30 text-foam-200 font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-foam-300 animate-pulse"></span>
              {language === 'mn' ? 'ЗАРЛИГ №141 СТАНДАРТ' : 'DECREE NO. 141 STANDARD'}
            </span>
            <span className="hidden sm:inline text-foam-500">
              {language === 'mn' ? 'Монгол Улсын Зэвсэгт хүчин & Төрийн цэргийн дүрэмт хувцасны систем' : 'Mongolian Armed Forces Uniform Management System'}
            </span>
          </div>
          ) : <div />}

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            {activeTab !== 'home' && (
            <div className="flex items-center bg-teal-800 rounded-lg p-0.5 border border-teal-700">
              <button
                id="btn-lang-mn"
                onClick={() => setLanguage('mn')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${language === 'mn' ? 'bg-foam-300 text-teal-950 shadow-sm font-semibold' : 'text-foam-500 hover:text-foam-100'}`}
              >
                Монгол
              </button>
              <button
                id="btn-lang-en"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${language === 'en' ? 'bg-foam-300 text-teal-950 shadow-sm font-semibold' : 'text-foam-500 hover:text-foam-100'}`}
              >
                English
              </button>
            </div>
            )}

            {/* Reset Data Button */}

            <button
              id="btn-reset-defaults"
              onClick={() => {
                if (window.confirm(language === 'mn' ? 'Зэвсэгт хүчний анги, хувцасны өгөгдлийг анхны хэлбэрт нь буцааж сэргээх үү?' : 'Reset to default Armed Forces seed data?')) {
                  resetToDefaults();
                }
              }}
              title={language === 'mn' ? 'Өгөгдлийг анхны төлөвт оруулах' : 'Reset to initial sample data'}
              className="p-1 text-foam-500 hover:text-foam-100 transition rounded"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Nav Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-foam-300 to-foam-400 flex items-center justify-center shadow-lg shadow-foam-500/30 ring-2 ring-foam-300/20">
              <Home className="w-5 h-5 text-teal-950" />
            </div>
            {activeTab !== 'home' && (
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-foam-50 font-sans">
                  {language === 'mn' ? 'ДҮРЭМТ ХУВЦАС ХАНГАМЖ' : 'UNIFORM DISTRIBUTION'}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-foam-300/20 text-foam-200 border border-foam-300/30">
                  UDMS
                </span>
              </div>
              <p className="text-[11px] text-foam-500 hidden sm:block">
                {language === 'mn' ? 'Цэргийн дүрэмт хувцас, цол, ялгах тэмдгийн удирдлагын систем' : 'Military Uniform, Rank & Insignia Distribution System'}
              </p>
            </div>
            )}
          </div>

          {/* Quick Issue Button & Notification */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            {activeTab !== 'home' && (
            <div className="relative">
              <button
                id="btn-notifications"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl bg-teal-800 hover:bg-teal-750 border border-teal-700 text-foam-200 transition"
              >
                <Bell className="w-4 h-4" />
                {totalAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-bounce shadow-md">
                    {totalAlerts}
                  </span>
                )}
              </button>

              {/* Notification Popup */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-teal-900 border border-teal-700 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-teal-800">
                    <h4 className="font-semibold text-sm text-foam-100 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-foam-300" />
                      {language === 'mn' ? 'Шуурхай сануулга' : 'Active Alerts'} ({totalAlerts})
                    </h4>
                    <span className="text-[11px] text-foam-500">
                      {language === 'mn' ? 'Хугацаа & Үлдэгдэл' : 'Expiry & Stock'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                    {expiringItems.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-foam-300 uppercase tracking-wider mb-1.5">
                          ⏳ {language === 'mn' ? '30 хоногт дуусах олголтууд' : 'Expiring within 30 days'} ({expiringItems.length})
                        </div>
                        {expiringItems.map(d => (
                          <div 
                            key={d.id} 
                            onClick={() => {
                              setActiveTab('distributions');
                              setShowNotifications(false);
                            }}
                            className="p-2.5 rounded-lg bg-foam-300/10 border border-foam-300/20 hover:bg-foam-300/15 cursor-pointer transition mb-1.5"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-medium text-xs text-foam-100">{d.personnelName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                                {d.expiryDate}
                              </span>
                            </div>
                            <div className="text-[11px] text-foam-200 mt-0.5 truncate">{d.uniformNameMn} ({d.size})</div>
                            <div className="text-[10px] text-foam-500 mt-1">{d.departmentName}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {lowStockItems.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider mb-1.5">
                          ⚠️ {language === 'mn' ? 'Нөөц дуусч буй загварууд' : 'Low Stock Items'} ({lowStockItems.length})
                        </div>
                        {lowStockItems.map(u => (
                          <div 
                            key={u.id}
                            onClick={() => {
                              setActiveTab('warehouse');
                              setShowNotifications(false);
                            }}
                            className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 cursor-pointer transition mb-1.5"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-medium text-xs text-rose-200">[{u.modelCode}] {u.nameMn}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono font-bold">
                                {u.totalStock} {language === 'mn' ? 'ширхэг' : 'left'}
                              </span>
                            </div>
                            <div className="text-[10px] text-foam-500 mt-1">
                              {language === 'mn' ? `Захиалах доод хэмжээ: ${u.reorderLevel}` : `Reorder threshold: ${u.reorderLevel}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {totalAlerts === 0 && (
                      <div className="text-center py-6 text-foam-500 text-xs">
                        🎉 {language === 'mn' ? 'Бүх дүрэмт хувцас хэвийн хүчинтэй, нөөц хангалттай байна.' : 'All inventory levels healthy & active.'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        </div>

        {/* Tab Navigation Menu */}
        {activeTab !== 'home' && (
        <nav className="flex space-x-1 overflow-x-auto no-scrollbar py-2 border-t border-teal-800/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition duration-150 ${
                  isActive
                    ? 'bg-foam-300/15 text-foam-200 border border-foam-300/30 shadow-inner'
                    : 'text-foam-500 hover:text-foam-100 hover:bg-teal-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-foam-300' : 'text-foam-500'}`} />
                <span>{language === 'mn' ? item.labelMn : item.labelEn}</span>
              </button>
            );
          })}
        </nav>
        )}
      </div>
    </header>
  );
};
