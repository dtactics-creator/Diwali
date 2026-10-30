import { EnvironmentConfig, EnvironmentId } from '../types/game';

import indianStreetDay from '../../public/backgrounds/indian-street/day.png';
import indianStreetNight from '../../public/backgrounds/indian-street/night.png';
import playgroundDay from '../../public/backgrounds/playground/day.jpg';
import playgroundNight from '../../public/backgrounds/playground/night.jpg';
import gatedCommunityDay from '../../public/backgrounds/gated-community/day.jpg';
import gatedCommunityNight from '../../public/backgrounds/gated-community/night.jpg';
import courtyardDay from '../../public/backgrounds/courtyard/day.jpg';
import courtyardNight from '../../public/backgrounds/courtyard/night.jpg'

export const ENVIRONMENTS: Record<EnvironmentId, EnvironmentConfig> = {
  'indian-street': {
    id: 'indian-street',
    name: 'Indian Residential Street',
    subtitle: 'Traditional Neighborhood Lane',
    tagline: 'Balconies, glowing windows, doorstep rangoli & warm streetlights',
    description:
      'Celebrate along a classic Indian neighborhood lane lined with independent homes, ornate gates, marigold garlands, doorstep rangolis, and warm glowing windows.',
    backgrounds: {
      day: indianStreetDay,
      sunset: indianStreetDay,
      dusk: indianStreetNight,
      night: indianStreetNight,
    },
    publicPaths: {
      day: '/backgrounds/indian-street/day.jpg',
      night: '/backgrounds/indian-street/night.png',
    },
    backgroundPosition: 'center bottom',
    camera: {
      position: [0, 2.1, 7.2],
      lookAt: [0, 0.85, 0],
      fov: 40,
    },
    groundY: 0,
    characterSpawn: [-0.95, 0, 1.4],
    movementBounds: {
      minX: -2.8,
      maxX: 2.8,
      minZ: -0.6,
      maxZ: 3.2,
    },
    placementBounds: {
      minX: -2.2,
      maxX: 2.2,
      minZ: -0.4,
      maxZ: 2.8,
    },
    groundColor: {
      day: '#4a484c',
      sunset: '#47393e',
      dusk: '#252334',
      night: '#181724',
    },
    groundRoughness: 0.78,
    diyaAnchors: [
      { x: -3.9, z: -1.5, scale: 1.0 },
      { x: -2.8, z: -1.7, scale: 0.9 },
      { x: 2.8, z: -1.7, scale: 0.9 },
      { x: 3.9, z: -1.5, scale: 1.0 },
      { x: -4.1, z: 0.5, scale: 1.1 },
      { x: 4.1, z: 0.5, scale: 1.1 },
    ],
    features: [
      'Asphalt street lane with safe central ignition zone',
      'Doorstep Rangoli & flickering clay diyas along house gates',
      'Warm balcony & window illumination at Dusk and Night',
    ],
  },

  playground: {
    id: 'playground',
    name: 'Neighborhood Playground',
    subtitle: 'Open Festive Park & Maidan',
    tagline: 'Wide grassy grounds, fairy-lit trees, park benches & wide sky view',
    description:
      'An expansive neighborhood park and playground with wide open ground ideal for large aerial repeaters, spinning chakris, and high-altitude rockets.',
    backgrounds: {
      day: playgroundDay,
      sunset: playgroundDay,
      dusk: playgroundNight,
      night: playgroundNight,
    },
    publicPaths: {
      day: '/backgrounds/playground/day.jpg',
      night: '/backgrounds/playground/night.jpg',
    },
    camera: {
      position: [0, 2.5, 8.2],
      lookAt: [0, 1.0, -0.2],
      fov: 44,
    },
    groundY: 0,
    characterSpawn: [-1.8, 0, 1.3],
    movementBounds: {
      minX: -5.0,
      maxX: 5.0,
      minZ: -2.3,
      maxZ: 3.3,
    },
    placementBounds: {
      minX: -4.4,
      maxX: 4.4,
      minZ: -1.9,
      maxZ: 2.8,
    },
    groundColor: {
      day: '#5c5346',
      sunset: '#524038',
      dusk: '#26282a',
      night: '#171b1e',
    },
    groundRoughness: 0.88,
    diyaAnchors: [
      { x: -4.5, z: -2.0, scale: 1.0 },
      { x: -2.2, z: -2.2, scale: 0.95 },
      { x: 0.0, z: -2.3, scale: 1.0 },
      { x: 2.2, z: -2.2, scale: 0.95 },
      { x: 4.5, z: -2.0, scale: 1.0 },
    ],
    features: [
      'Largest open ground placement zone for multi-cracker setups',
      'Trees wrapped in warm golden festive string lights',
      'Unobstructed panoramic sky for aerial shells and rockets',
    ],
  },

  'gated-community': {
    id: 'gated-community',
    name: 'Gated Residential Community',
    subtitle: 'Modern Enclave & Cobblestone Plaza',
    tagline: 'High-rise towers, landscaped avenue, decorative bollards & festive lights',
    description:
      'A contemporary Indian residential enclave featuring manicured palm gardens, cobblestone avenues, illuminated apartment balconies, and a grand central celebration plaza.',
    backgrounds: {
      day: gatedCommunityDay,
      sunset: gatedCommunityDay,
      dusk: gatedCommunityNight,
      night: gatedCommunityNight,
    },
    publicPaths: {
      day: '/backgrounds/gated-community/day.jpg',
      night: '/backgrounds/gated-community/night.jpg',
    },
    camera: {
      position: [0, 2.4, 7.8],
      lookAt: [0, 1.0, 0],
      fov: 43,
    },
    groundY: 0,
    characterSpawn: [-1.5, 0, 1.2],
    movementBounds: {
      minX: -4.5,
      maxX: 4.5,
      minZ: -2.0,
      maxZ: 3.1,
    },
    placementBounds: {
      minX: -3.9,
      maxX: 3.9,
      minZ: -1.6,
      maxZ: 2.7,
    },
    groundColor: {
      day: '#58565c',
      sunset: '#4e3f45',
      dusk: '#282636',
      night: '#191826',
    },
    groundRoughness: 0.68,
    diyaAnchors: [
      { x: -4.0, z: -1.7, scale: 1.05 },
      { x: -1.8, z: -1.9, scale: 1.0 },
      { x: 1.8, z: -1.9, scale: 1.0 },
      { x: 4.0, z: -1.7, scale: 1.05 },
      { x: -4.3, z: 0.8, scale: 1.1 },
      { x: 4.3, z: 0.8, scale: 1.1 },
    ],
    features: [
      'Paved cobblestone plaza with crisp specular light reflections',
      'Modern apartment towers draped in vertical Diwali fairy lights',
      'Designated community firework zone with ornamental lighting',
    ],
  },

  courtyard: {
    id: 'courtyard',
    name: 'Traditional Courtyard / Rooftop',
    subtitle: 'Heritage Haveli Terrace',
    tagline: 'Terracotta tiles, carved parapets, hanging lanterns, marigold torans & diyas',
    description:
      'An intimate heritage Indian home rooftop terrace and courtyard adorned with intricate floral rangoli, rows of flickering clay diyas along carved stone parapets, and festive lanterns.',
    backgrounds: {
      day: courtyardDay,
      sunset: courtyardDay,
      dusk: courtyardNight,
      night: courtyardNight,
    },
    publicPaths: {
      day: '/backgrounds/courtyard/day.jpg',
      night: '/backgrounds/courtyard/night.jpg',
    },
    camera: {
      position: [0, 2.25, 7.1],
      lookAt: [0, 0.9, 0.1],
      fov: 40,
    },
    groundY: 0,
    characterSpawn: [-1.2, 0, 1.0],
    movementBounds: {
      minX: -3.6,
      maxX: 3.6,
      minZ: -1.5,
      maxZ: 2.8,
    },
    placementBounds: {
      minX: -3.1,
      maxX: 3.1,
      minZ: -1.2,
      maxZ: 2.3,
    },
    groundColor: {
      day: '#704d3e',
      sunset: '#5e392f',
      dusk: '#362328',
      night: '#24171d',
    },
    groundRoughness: 0.62,
    diyaAnchors: [
      { x: -3.3, z: -1.4, scale: 1.1 },
      { x: -2.0, z: -1.5, scale: 1.0 },
      { x: -0.7, z: -1.5, scale: 1.0 },
      { x: 0.7, z: -1.5, scale: 1.0 },
      { x: 2.0, z: -1.5, scale: 1.0 },
      { x: 3.3, z: -1.4, scale: 1.1 },
      { x: -3.5, z: 0.4, scale: 1.1 },
      { x: 3.5, z: 0.4, scale: 1.1 },
    ],
    features: [
      'Intimate terracotta & stone-tiled courtyard floor with central Rangoli',
      'Dense perimeter of glowing clay diyas and hanging festive lanterns',
      'Warm close-up camera framing ideal for sparklers, flower pots & chakris',
    ],
  },
};

export const ENVIRONMENT_LIST: EnvironmentConfig[] = Object.values(ENVIRONMENTS);
