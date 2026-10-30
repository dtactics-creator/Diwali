import { AssetManifestItem } from '../types/game';

export const INITIAL_ASSET_MANIFEST: AssetManifestItem[] = [
  // 2D Environment Backgrounds (Verified & Bundled)
  {
    id: 'bg-indian-street-day',
    name: 'Indian Residential Street — Daylight Plate',
    category: 'background',
    canonicalPath: '/backgrounds/indian-street/day.jpg',
    status: 'bundled',
    fallbackDescription: 'High-resolution perspective-aligned daylight architectural plate bundled locally.',
    licenseNote: 'Project Generated Asset (GuessMe.co Exclusive)',
  },
  {
    id: 'bg-indian-street-night',
    name: 'Indian Residential Street — Festive Night Plate',
    category: 'background',
    canonicalPath: '/backgrounds/indian-street/night.jpg',
    status: 'bundled',
    fallbackDescription: 'High-resolution perspective-aligned festive night plate with diyas, rangoli, and streetlights.',
    licenseNote: 'Project Generated Asset (GuessMe.co Exclusive)',
  },
  {
    id: 'bg-playground-day',
    name: 'Neighborhood Playground — Daylight Plate',
    category: 'background',
    canonicalPath: '/backgrounds/playground/day.jpg',
    status: 'bundled',
    fallbackDescription: 'High-resolution perspective-aligned open park and playground daylight plate.',
    licenseNote: 'Project Generated Asset (GuessMe.co Exclusive)',
  },
  {
    id: 'bg-playground-night',
    name: 'Neighborhood Playground — Festive Night Plate',
    category: 'background',
    canonicalPath: '/backgrounds/playground/night.jpg',
    status: 'bundled',
    fallbackDescription: 'High-resolution perspective-aligned festive park night plate with fairy lights and diyas.',
    licenseNote: 'Project Generated Asset (GuessMe.co Exclusive)',
  },
  {
    id: 'bg-gated-community-day',
    name: 'Gated Residential Community — Daylight Plate',
    category: 'background',
    canonicalPath: '/backgrounds/gated-community/day.jpg',
    status: 'bundled',
    fallbackDescription: 'High-resolution perspective-aligned modern Indian apartment plaza daylight plate.',
    licenseNote: 'Project Generated Asset (GuessMe.co Exclusive)',
  },
  {
    id: 'bg-gated-community-night',
    name: 'Gated Residential Community — Festive Night Plate',
    category: 'background',
    canonicalPath: '/backgrounds/gated-community/night.jpg',
    status: 'bundled',
    fallbackDescription: 'High-resolution perspective-aligned modern gated community festive night plate.',
    licenseNote: 'Project Generated Asset (GuessMe.co Exclusive)',
  },
  {
    id: 'bg-courtyard-day',
    name: 'Traditional Courtyard / Rooftop — Daylight Plate',
    category: 'background',
    canonicalPath: '/backgrounds/courtyard/day.jpg',
    status: 'bundled',
    fallbackDescription: 'High-resolution perspective-aligned traditional Indian haveli courtyard daylight plate.',
    licenseNote: 'Project Generated Asset (GuessMe.co Exclusive)',
  },
  {
    id: 'bg-courtyard-night',
    name: 'Traditional Courtyard / Rooftop — Festive Night Plate',
    category: 'background',
    canonicalPath: '/backgrounds/courtyard/night.jpg',
    status: 'bundled',
    fallbackDescription: 'High-resolution perspective-aligned rooftop courtyard night plate with lanterns and diyas.',
    licenseNote: 'Project Generated Asset (GuessMe.co Exclusive)',
  },

  // 3D Character Rig
  {
    id: 'char-indian-casual',
    name: 'Player Character (Casual Indian Festive Hoodie, Jeans & Sneakers)',
    category: 'character',
    canonicalPath: '/models/characters/indian-casual-player.glb',
    status: 'fallback-active',
    fallbackDescription:
      'External studio GLB file not present in /public/models/characters/. Using built-in articulated 3D skeletal human rig (17-bone hierarchy + THREE.AnimationMixer with Idle, Walk, Run, Turn, Crouch, Ignite, and Celebrate clips). Supports live .glb hot-swap upload.',
    licenseNote: 'Built-in Articulated Three.js Skeletal Rig / GLTFLoader Compatible',
  },

  // 3D Cracker Models
  {
    id: 'cracker-phuljhadi',
    name: 'Phuljhadi (Handheld / Ground Sparkler Rod)',
    category: 'cracker',
    canonicalPath: '/models/crackers/phuljhadi.glb',
    status: 'fallback-active',
    fallbackDescription:
      'Using bespoke multi-part 3D PBR mesh (metallic wire stem, pyrotechnic grey composition coat, brass stand & active glowing ember tip).',
    licenseNote: 'Built-in Multi-Part PBR 3D Mesh / GLTFLoader Compatible',
  },
  {
    id: 'cracker-flower-pot',
    name: 'Anar / Flower Pot (Conical Fountain Cracker)',
    category: 'cracker',
    canonicalPath: '/models/crackers/flower-pot.glb',
    status: 'fallback-active',
    fallbackDescription:
      'Using bespoke multi-part 3D PBR conical terracotta & gold-foil mesh with procedural Indian firework label texture and top fuse wick.',
    licenseNote: 'Built-in Multi-Part PBR 3D Mesh / GLTFLoader Compatible',
  },
  {
    id: 'cracker-chakri',
    name: 'Zameen Chakri (Spinning Ground Wheel)',
    category: 'cracker',
    canonicalPath: '/models/crackers/chakri.glb',
    status: 'fallback-active',
    fallbackDescription:
      'Using bespoke multi-part 3D coiled pyrotechnic wheel mesh with metallic hub, concentric festive bands, and side fuse.',
    licenseNote: 'Built-in Multi-Part PBR 3D Mesh / GLTFLoader Compatible',
  },
  {
    id: 'cracker-rocket',
    name: 'Mehtab Sky Rocket with Launch Bottle',
    category: 'cracker',
    canonicalPath: '/models/crackers/rocket.glb',
    status: 'fallback-active',
    fallbackDescription:
      'Using bespoke multi-part 3D glass launch bottle, bamboo stabilizer rod, crimson-gold rocket motor tube, and metallic nose cone.',
    licenseNote: 'Built-in Multi-Part PBR 3D Mesh / GLTFLoader Compatible',
  },
  {
    id: 'cracker-aerial',
    name: 'Navrang 12-Shot Aerial Sky Shell Battery',
    category: 'cracker',
    canonicalPath: '/models/crackers/aerial-fireworks.glb',
    status: 'fallback-active',
    fallbackDescription:
      'Using bespoke multi-part 3D hexagonal cluster of 7 mortar launch tubes wrapped in crimson/gold festive foil with safety fuse.',
    licenseNote: 'Built-in Multi-Part PBR 3D Mesh / GLTFLoader Compatible',
  },
  {
    id: 'cracker-garland',
    name: '100-Wala Ladi (Braided Garland Firecracker Strip)',
    category: 'cracker',
    canonicalPath: '/models/crackers/garland-cracker.glb',
    status: 'fallback-active',
    fallbackDescription:
      'Using bespoke multi-part 3D braided crimson firecracker cylinders arranged on a woven mat with central twisted tissue fuse.',
    licenseNote: 'Built-in Multi-Part PBR 3D Mesh / GLTFLoader Compatible',
  },

  // Audio Assets
  {
    id: 'audio-sfx-bank',
    name: 'Diwali Pyrotechnic & Weather Sound Bank',
    category: 'audio',
    canonicalPath: '/audio/diwali-sfx-bank.ogg',
    status: 'fallback-active',
    fallbackDescription:
      'External audio files not bundled; using real-time Web Audio API physical acoustic synthesizer (fuse hiss, spark crackle, Doppler chakri spin, rocket whistle, sub-bass aerial boom, rain patter, and night ambience).',
    licenseNote: 'Real-Time Web Audio API Procedural Synthesizer',
  },
];
