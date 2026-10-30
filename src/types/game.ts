export type EnvironmentId =
  | 'indian-street'
  | 'playground'
  | 'gated-community'
  | 'courtyard';

export type TimeOfDayId = 'day' | 'sunset' | 'dusk' | 'night';

export type WeatherId = 'clear' | 'cloudy' | 'rain' | 'mist';

export type GraphicsQualityId = 'LOW' | 'MEDIUM' | 'HIGH';

export type CrackerId =
  | 'phuljhadi'
  | 'flower-pot'
  | 'chakri'
  | 'rocket'
  | 'aerial-fireworks'
  | 'garland-cracker';

export type CrackerLifecycleState =
  | 'Available'
  | 'Selected'
  | 'Placed'
  | 'Igniting'
  | 'Active'
  | 'Completed';

export type CrackerInteractionState =
  | 'idle'
  | 'approaching'
  | 'reaching_fuse'
  | 'igniting'
  | 'retreating'
  | 'safe'
  | 'exploding'
  | 'celebrating'
  | 'completed';

export type CharacterAnimationState =
  | 'Idle'
  | 'Walk'
  | 'Run'
  | 'Turn'
  | 'Crouch'
  | 'Ignite'
  | 'Celebrate';

export type AppScreen = 'landing' | 'setup' | 'game';

export interface PlayableBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Live rocket / aerial-shell tracking data written by FireworksSystem3D
 * and consumed by SceneEnvironment3D for the cinematic camera follow.
 */
export interface RocketTrackData {
  /** Whether a rocket/shell is currently ascending or still in post-burst hold */
  active: boolean;
  /** World-space X of the projectile */
  x: number;
  /** World-space Y of the projectile (the target lookAt Y) */
  y: number;
  /** World-space Z of the projectile */
  z: number;
  /** Seconds remaining in the post-burst hold before camera returns */
  holdSecondsLeft: number;
  /** Normalized live camera tilt (0 = on street ground, 1 = sky burst peak) */
  cameraTiltProgress?: number;
}

export interface DiyaAnchor {
  x: number;
  z: number;
  scale?: number;
}

export interface EnvironmentConfig {
  id: EnvironmentId;
  name: string;
  subtitle: string;
  description: string;
  tagline: string;
  backgrounds: {
    day: string;
    sunset: string;
    dusk: string;
    night: string;
  };
  publicPaths: {
    day: string;
    night: string;
  };
  backgroundPosition?: string;
  backgroundBaseY?: number;
  backgroundSkyY?: number;
  camera: {
    position: [number, number, number];
    lookAt: [number, number, number];
    fov: number;
  };
  groundY: number;
  characterSpawn: [number, number, number];
  movementBounds: PlayableBounds;
  placementBounds: PlayableBounds;
  groundColor: {
    day: string;
    sunset: string;
    dusk: string;
    night: string;
  };
  groundRoughness: number;
  diyaAnchors: DiyaAnchor[];
  features: string[];
}

export interface TimeOfDayConfig {
  id: TimeOfDayId;
  name: string;
  description: string;
  iconName: string;
  ambientIntensity: number;
  ambientColor: string;
  directionalIntensity: number;
  directionalColor: string;
  directionalPosition: [number, number, number];
  festiveLightIntensity: number;
  festiveLightColor: string;
  skyTint: string;
  horizonGlow: string;
  nightPlateOpacity: number;
  filterCss: string;
  fireworkContrastBoost: number;
}

export interface WeatherConfig {
  id: WeatherId;
  name: string;
  description: string;
  rainCount: number;
  mistDensity: number;
  cloudOpacity: number;
  wetGroundReflectivity: number;
  ambientMultiplier: number;
  backdropFilterCss: string;
}

export interface GraphicsConfig {
  id: GraphicsQualityId;
  name: string;
  description: string;
  dpr: [number, number];
  particleMultiplier: number;
  maxActiveParticles: number;
  enableShadows: boolean;
  enableDynamicLights: boolean;
  enableWeatherParticles: boolean;
  smokeDensity: number;
}

export interface CrackerEffectConfig {
  primaryColors: string[];
  secondaryColors: string[];
  sparkRate: number;
  burstCount: number;
  particlesPerBurst: number;
  launchHeight: number;
  spreadRadius: number;
  gravity: number;
  drag: number;
  smokeAmount: number;
  lightIntensity: number;
  cameraShakeIntensity: number;
}

export interface CrackerConfig {
  id: CrackerId;
  name: string;
  hindiName: string;
  category: 'Sparkler' | 'Fountain' | 'Spinner' | 'Aerial' | 'Garland';
  shortDescription: string;
  detailedDescription: string;
  modelPath: string;
  ignitionDuration: number; // seconds for fuse to burn
  activeDuration: number; // seconds for main firework show
  safetyRadius: number;
  interactionDistance: number;
  isHandheldCapable: boolean;
  accentColor: string;
  badgeText: string;
  effect: CrackerEffectConfig;
}

export interface PlacedCrackerInstance {
  instanceId: string;
  crackerId: CrackerId;
  position: [number, number, number];
  rotationY: number;
  state: CrackerLifecycleState;
  placedAt: number;
  ignitedAt?: number;
  activeStartedAt?: number;
  completedAt?: number;
}

export interface SimulationSettings {
  environment: EnvironmentId;
  timeOfDay: TimeOfDayId;
  weather: WeatherId;
  weatherEffectsEnabled: boolean;
  graphicsQuality: GraphicsQualityId;
  soundEnabled: boolean;
  soundVolume: number;
  reducedFlash: boolean;
}

export interface PlayerStatistics {
  totalCrackersIgnited: number;
  countsByCracker: Record<CrackerId, number>;
  recentCrackers: CrackerId[];
  favoriteCracker: CrackerId | null;
  environmentsVisited: EnvironmentId[];
  sessionsPlayed: number;
  lastPlayedAt: string | null;
}

export interface AssetManifestItem {
  id: string;
  name: string;
  category: 'character' | 'cracker' | 'background' | 'audio';
  canonicalPath: string;
  status: 'bundled' | 'fallback-active' | 'custom-loaded';
  fallbackDescription: string;
  licenseNote: string;
}
