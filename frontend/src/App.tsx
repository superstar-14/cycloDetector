import { useState } from 'react';
import './index.css';
import { Dashboard } from './components/Dashboard';
import { TopBar } from './components/TopBar';
import { ForecastTable } from './components/ForecastTable';
import { DistrictImpactPanel } from './components/DistrictImpactPanel';
import { ValidationBacktest } from './components/ValidationBacktest';
import { ExplainabilityView } from './components/ExplainabilityView';
import { PastCyclonesExplorer } from './components/PastCyclonesExplorer';
import { DisclaimerModal } from './components/DisclaimerModal';
import { HISTORICAL_STORMS_MAP, HISTORICAL_STORMS_LIST } from './data/historicalStorms';
import type { Storm } from './types';

type Page =
  | 'dashboard'
  | 'forecast'
  | 'districts'
  | 'backtest'
  | 'explain'
  | 'history';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedStormId, setSelectedStormId] = useState<string>('NIO_2019_BOB_FANI');
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState<boolean>(false);

  // Retrieve selected storm object
  const activeStorm: Storm =
    HISTORICAL_STORMS_MAP[selectedStormId]?.storm || HISTORICAL_STORMS_LIST[0].storm;

  const handleSelectStorm = (stormId: string) => {
    if (HISTORICAL_STORMS_MAP[stormId]) {
      setSelectedStormId(stormId);
      setCurrentPage('dashboard');
    }
  };

  return (
    <div className="app-layout">
      <TopBar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        demoMode={demoMode}
        activeStorm={activeStorm}
        onSelectStorm={(id) => setSelectedStormId(id)}
        onOpenDisclaimer={() => setIsDisclaimerOpen(true)}
      />
      <div className="main-content">
        {currentPage === 'dashboard' && (
          <Dashboard storm={activeStorm} />
        )}
        {currentPage === 'forecast' && (
          <ForecastTable storm={activeStorm} />
        )}
        {currentPage === 'districts' && (
          <DistrictImpactPanel storm={activeStorm} />
        )}
        {currentPage === 'backtest' && (
          <ValidationBacktest />
        )}
        {currentPage === 'explain' && (
          <ExplainabilityView storm={activeStorm} />
        )}
        {currentPage === 'history' && (
          <PastCyclonesExplorer onSelectStorm={handleSelectStorm} />
        )}
      </div>

      {/* Scientific Safety & Responsible AI Disclaimer Modal */}
      <DisclaimerModal
        isOpen={isDisclaimerOpen}
        onClose={() => setIsDisclaimerOpen(false)}
        activeStorm={activeStorm}
      />
    </div>
  );
}

export default App;
