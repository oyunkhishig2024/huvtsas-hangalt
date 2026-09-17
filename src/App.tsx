import React, { useState } from 'react';
import { UniformProvider, useUniformData } from './context/UniformDataContext';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { LoginView } from './components/LoginView';
import { CategorySelectView } from './components/CategorySelectView';
import { InventoryView } from './components/InventoryView';
import { WarehouseView } from './components/WarehouseView';
import { RegisterCommandStockView } from './components/RegisterCommandStockView';
import { CommandDistributionSummary } from './components/CommandDistributionSummary';
import { SupplyRequestsView } from './components/SupplyRequestsView';
import { PersonnelView } from './components/PersonnelView';
import { DistributionView } from './components/DistributionView';
import { ExchangeView } from './components/ExchangeView';
import { PrintableVoucherModal } from './components/PrintableVoucherModal';
import { UniformItem, Personnel, DistributionRecord } from './types';

const MainAppContent: React.FC = () => {
  const { session } = useUniformData();
  const [activeTab, setActiveTab] = useState('home');
  const [loginHint, setLoginHint] = useState<string | undefined>(undefined);
  const [warehouseCategoryFilter, setWarehouseCategoryFilter] = useState<string | undefined>(undefined);

  // Cross-view state orchestration
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [preselectedUniform, setPreselectedUniform] = useState<UniformItem | null>(null);
  const [preselectedPersonnel, setPreselectedPersonnel] = useState<Personnel | null>(null);

  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [selectedExchangeDistribution, setSelectedExchangeDistribution] = useState<DistributionRecord | null>(null);

  const [printableSlipRecord, setPrintableSlipRecord] = useState<DistributionRecord | null>(null);

  // Quick Action Handlers
  const handleIssueFromInventory = (uniform: UniformItem) => {
    setPreselectedUniform(uniform);
    setPreselectedPersonnel(null);
    setActiveTab('distributions');
    setIsIssueModalOpen(true);
  };

  const handleIssueToPersonnel = (person: Personnel) => {
    setPreselectedPersonnel(person);
    setPreselectedUniform(null);
    setActiveTab('distributions');
    setIsIssueModalOpen(true);
  };

  const handleStartExchange = (distRecord: DistributionRecord) => {
    setSelectedExchangeDistribution(distRecord);
    setActiveTab('exchanges');
    setIsExchangeModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-teal-950 text-foam-50 flex flex-col font-sans selection:bg-foam-300 selection:text-teal-950">
      {activeTab === 'login' ? (
        <LoginView
          hintUsername={loginHint}
          onSuccess={() => setActiveTab('categories')}
          onCancel={() => setActiveTab('home')}
        />
      ) : (
      <>
      {/* Top Navbar with role switcher, search, language, notifications */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'home' && (
          <HomeView
            onSelectUnit={(deptId, hint) => {
              setLoginHint(hint);
              setActiveTab('login');
            }}
            onGoHQ={() => {
              setLoginHint('ЗХЖШ');
              setActiveTab('login');
            }}
            onSelectCommand={(hint) => {
              setLoginHint(hint);
              setActiveTab('login');
            }}
          />
        )}

        {activeTab === 'categories' && (
          <CategorySelectView
            onSelectCategory={(categoryFilter) => {
              setWarehouseCategoryFilter(categoryFilter);
              setActiveTab('warehouse');
            }}
          />
        )}

        {/* Register New — HQ inserts brand-new central stock; Командлал/Анги register
            locally-sourced stock straight into their own warehouse. */}
        {activeTab === 'register-new' && (
          session.level === 'hq'
            ? <InventoryView onIssueItem={handleIssueFromInventory} />
            : <RegisterCommandStockView />
        )}

        {activeTab === 'warehouse' && (
          <WarehouseView
            initialCategoryFilter={warehouseCategoryFilter}
            onBack={() => setActiveTab('categories')}
          />
        )}

        {/* Distribution — HQ/Командлал see what they've sent to their children;
            Анги sees what's been issued out to its own personnel. */}
        {activeTab === 'distributions' && (
          session.level === 'unit'
            ? (
              <DistributionView
                onOpenExchangeModal={handleStartExchange}
                onOpenPrintSlip={(record) => setPrintableSlipRecord(record)}
                preselectedUniform={preselectedUniform}
                preselectedPersonnel={preselectedPersonnel}
                isIssueModalOpen={isIssueModalOpen}
                setIsIssueModalOpen={setIsIssueModalOpen}
              />
            )
            : <CommandDistributionSummary />
        )}

        {activeTab === 'supply-requests' && <SupplyRequestsView />}

        {activeTab === 'personnel' && session.level === 'unit' && (
          <PersonnelView
            onIssueToPersonnel={handleIssueToPersonnel}
          />
        )}

        {/* Exchange — reachable via the "Solih" action on a distribution record,
            not a top-level tab. */}
        {activeTab === 'exchanges' && (
          <ExchangeView
            initialDistributionRecord={selectedExchangeDistribution}
            isExchangeModalOpen={isExchangeModalOpen}
            setIsExchangeModalOpen={setIsExchangeModalOpen}
            onOpenPrintSlip={(record) => setPrintableSlipRecord(record)}
          />
        )}
      </main>

      {/* Printable Voucher Modal */}
      {printableSlipRecord && (
        <PrintableVoucherModal
          record={printableSlipRecord}
          onClose={() => setPrintableSlipRecord(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-teal-850 bg-teal-950 py-4 px-6 text-center text-xs text-foam-600">
        <div className="max-w-7xl mx-auto">
          <div className="tracking-wider font-semibold text-foam-500">
            АПП ХӨГЖҮҮЛЭГЧ: ЗЭВСЭГТ ХҮЧНИЙ 310 ДУГААР АНГИ ХОШУУЧ С.ХОНГОР
          </div>
        </div>
      </footer>
      </>
      )}
    </div>
  );
};

export default function App() {
  return (
    <UniformProvider>
      <MainAppContent />
    </UniformProvider>
  );
}
