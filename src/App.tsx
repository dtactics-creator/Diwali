import { useCallback, useState } from 'react';
import { AssetManifestModal } from './components/pages/AssetManifestModal';
import { CrackerCollectionModal } from './components/pages/CrackerCollectionModal';
import { GameScreen } from './components/pages/GameScreen';
import { LandingPage } from './components/pages/LandingPage';
import { PlayerDashboardModal } from './components/pages/PlayerDashboardModal';
import { SetupScreen } from './components/pages/SetupScreen';
import { SimulationErrorBoundary } from './components/ui/SimulationErrorBoundary';
import { RotateDeviceOverlay } from './components/ui/RotateDeviceOverlay';
import { audioSystem } from './systems/AudioSystem';
import {
  DEFAULT_STATISTICS,
  loadPlayerStatistics,
  loadSavedSettings,
  recordCrackerIgnition,
  savePlayerStatistics,
  saveSettings,
} from './systems/storage';
import {
  AppScreen,
  CrackerId,
  EnvironmentId,
  PlayerStatistics,
  SimulationSettings,
} from './types/game';

export function App() {
  const [screen, setScreen] = useState<AppScreen>('landing');
  const [settings, setSettings] = useState<SimulationSettings>(() =>
    loadSavedSettings()
  );
  const [statistics, setStatistics] = useState<PlayerStatistics>(() =>
    loadPlayerStatistics()
  );
  const [sessionIgnitedCount, setSessionIgnitedCount] = useState<number>(0);

  const [selectedCrackerId, setSelectedCrackerId] = useState<CrackerId | null>(
    'flower-pot'
  );

  // Modals
  const [isCollectionOpen, setIsCollectionOpen] = useState<boolean>(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(false);
  const [isAssetManifestOpen, setIsAssetManifestOpen] = useState<boolean>(false);

  // Optional custom .glb character rig state
  const [customCharacterGlbUrl, setCustomCharacterGlbUrl] = useState<
    string | null
  >(null);
  const [customCharacterClips, setCustomCharacterClips] = useState<string[]>([
    'Idle',
    'Walk',
    'Run',
    'Turn',
    'Crouch',
    'Ignite',
    'Celebrate',
  ]);

  const handleUpdateSettings = useCallback(
    (partial: Partial<SimulationSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        saveSettings(next);
        audioSystem.setSettings(next.soundEnabled, next.soundVolume);
        return next;
      });
    },
    []
  );

  const handleCrackerIgnited = useCallback(
    (crackerId: CrackerId, envId: EnvironmentId) => {
      setSessionIgnitedCount((c) => c + 1);
      setStatistics((prev) => recordCrackerIgnition(prev, crackerId, envId));
    },
    []
  );

  const handleResetStatistics = useCallback(() => {
    savePlayerStatistics(DEFAULT_STATISTICS);
    setStatistics(DEFAULT_STATISTICS);
    setSessionIgnitedCount(0);
  }, []);

  const handlePlayNow = useCallback((preselected?: CrackerId) => {
    audioSystem.playUIClick();
    if (preselected) {
      setSelectedCrackerId(preselected);
    }
    setScreen('game');
  }, []);

  const handleCharacterAssetStatusChange = useCallback(
    (_loadedCustom: boolean, clips: string[]) => {
      setCustomCharacterClips(clips);
    },
    []
  );

  return (
    <SimulationErrorBoundary>
      {screen === 'landing' && (
        <LandingPage
          settings={settings}
          statistics={statistics}
          onUpdateSettings={handleUpdateSettings}
          onPlayNow={handlePlayNow}
          onOpenSetup={() => {
            audioSystem.playUIClick();
            setScreen('setup');
          }}
          onOpenCollection={() => {
            audioSystem.playUIClick();
            setIsCollectionOpen(true);
          }}
          onOpenDashboard={() => {
            audioSystem.playUIClick();
            setIsDashboardOpen(true);
          }}
          onOpenAssetManifest={() => {
            audioSystem.playUIClick();
            setIsAssetManifestOpen(true);
          }}
        />
      )}

      {screen === 'setup' && (
        <SetupScreen
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onStartSimulation={() => {
            audioSystem.playUIClick();
            setScreen('game');
          }}
          onBackToLanding={() => {
            audioSystem.playUIClick();
            setScreen('landing');
          }}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          settings={settings}
          selectedCrackerId={selectedCrackerId}
          onSelectCrackerId={setSelectedCrackerId}
          onUpdateSettings={handleUpdateSettings}
          onCrackerIgnited={handleCrackerIgnited}
          onOpenCollection={() => setIsCollectionOpen(true)}
          onOpenDashboard={() => setIsDashboardOpen(true)}
          onOpenAssetManifest={() => setIsAssetManifestOpen(true)}
          onOpenSetupStudio={() => setScreen('setup')}
          onBackToLanding={() => setScreen('landing')}
          customCharacterGlbUrl={customCharacterGlbUrl}
          onCharacterAssetStatusChange={handleCharacterAssetStatusChange}
        />
      )}

      {/* Global Modals accessible from Landing, Setup, and Game */}
      <CrackerCollectionModal
        isOpen={isCollectionOpen}
        selectedCrackerId={selectedCrackerId}
        onSelectCracker={(id) => {
          audioSystem.playUIClick();
          setSelectedCrackerId(id);
          if (screen !== 'game') {
            setScreen('game');
          }
        }}
        onClose={() => setIsCollectionOpen(false)}
        ignitionCounts={statistics.countsByCracker}
      />

      <PlayerDashboardModal
        isOpen={isDashboardOpen}
        statistics={statistics}
        settings={settings}
        sessionIgnitedCount={sessionIgnitedCount}
        onResetStatistics={handleResetStatistics}
        onClose={() => setIsDashboardOpen(false)}
      />

      <AssetManifestModal
        isOpen={isAssetManifestOpen}
        customCharacterGlbUrl={customCharacterGlbUrl}
        customCharacterClipNames={customCharacterClips}
        onUploadCustomCharacterGlb={(url) => {
          setCustomCharacterGlbUrl(url);
        }}
        onResetCharacterGlb={() => {
          setCustomCharacterGlbUrl(null);
        }}
        onClose={() => setIsAssetManifestOpen(false)}
      />

      {/* Mobile Landscape Orientation Lock & Fallback Overlay */}
      <RotateDeviceOverlay />
    </SimulationErrorBoundary>
  );
}

export default App;
