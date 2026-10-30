import {
  CrackerId,
  EnvironmentId,
  PlayerStatistics,
  SimulationSettings,
} from '../types/game';

const SETTINGS_STORAGE_KEY = 'guessme_diwali_settings_v1';
const STATS_STORAGE_KEY = 'guessme_diwali_stats_v1';

export const DEFAULT_SETTINGS: SimulationSettings = {
  environment: 'indian-street',
  timeOfDay: 'night',
  weather: 'clear',
  weatherEffectsEnabled: true,
  graphicsQuality: 'HIGH',
  soundEnabled: true,
  soundVolume: 0.75,
  reducedFlash: false,
};

export const DEFAULT_STATISTICS: PlayerStatistics = {
  totalCrackersIgnited: 0,
  countsByCracker: {
    phuljhadi: 0,
    'flower-pot': 0,
    chakri: 0,
    rocket: 0,
    'aerial-fireworks': 0,
    'garland-cracker': 0,
  },
  recentCrackers: [],
  favoriteCracker: null,
  environmentsVisited: ['indian-street'],
  sessionsPlayed: 1,
  lastPlayedAt: null,
};

export function loadSavedSettings(): SimulationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: SimulationSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function loadPlayerStatistics(): PlayerStatistics {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return DEFAULT_STATISTICS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATISTICS,
      ...parsed,
      countsByCracker: {
        ...DEFAULT_STATISTICS.countsByCracker,
        ...(parsed.countsByCracker || {}),
      },
    };
  } catch {
    return DEFAULT_STATISTICS;
  }
}

export function savePlayerStatistics(stats: PlayerStatistics): void {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage quota errors
  }
}

export function recordCrackerIgnition(
  current: PlayerStatistics,
  crackerId: CrackerId,
  environmentId: EnvironmentId
): PlayerStatistics {
  const updatedCounts = {
    ...current.countsByCracker,
    [crackerId]: (current.countsByCracker[crackerId] || 0) + 1,
  };

  let fav: CrackerId | null = current.favoriteCracker;
  let maxCount = 0;
  (Object.keys(updatedCounts) as CrackerId[]).forEach((id) => {
    if (updatedCounts[id] > maxCount) {
      maxCount = updatedCounts[id];
      fav = id;
    }
  });

  const recent = [
    crackerId,
    ...current.recentCrackers.filter((id) => id !== crackerId),
  ].slice(0, 6);

  const visited = current.environmentsVisited.includes(environmentId)
    ? current.environmentsVisited
    : [...current.environmentsVisited, environmentId];

  const next: PlayerStatistics = {
    ...current,
    totalCrackersIgnited: current.totalCrackersIgnited + 1,
    countsByCracker: updatedCounts,
    recentCrackers: recent,
    favoriteCracker: fav,
    environmentsVisited: visited,
    lastPlayedAt: new Date().toISOString(),
  };

  savePlayerStatistics(next);
  return next;
}
