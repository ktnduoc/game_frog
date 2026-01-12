// Game configuration constants

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Hook settings
export const HOOK_MAX_LENGTH = 400;
export const HOOK_SPEED = 12;

// Timing
export const INTRO_DURATION = 90; // 1.5 seconds at 60fps
export const FISH_SPAWN_INTERVAL = 240; // Every 4 seconds at 60fps
export const RIBBIT_INTERVAL = 300; // Ribbit every ~5 seconds at 60fps
export const EVOLUTION_DURATION = 600; // 10 seconds at 60fps

// Enemy types configuration
export const ENEMY_TYPES = [
    { color: '#2d3436', width: 30, height: 25, speed: 2.5, points: 10, name: 'Fly', dodgeChance: 0.4, dodgeSpeed: 5, weight: 0.5 },
    { color: '#636e72', width: 35, height: 30, speed: 2, points: 20, name: 'Mosquito', dodgeChance: 0.5, dodgeSpeed: 6, weight: 0.6 },
    { color: '#fdcb6e', width: 45, height: 40, speed: 1.5, points: 30, name: 'Bee', dodgeChance: 0.3, dodgeSpeed: 4, weight: 1.0 },
    { color: '#e17055', width: 50, height: 45, speed: 1, points: 40, name: 'Butterfly', dodgeChance: 0.6, dodgeSpeed: 7, weight: 0.8 },
    { color: '#00b894', width: 55, height: 50, speed: 0.8, points: 50, name: 'Dragonfly', dodgeChance: 0.7, dodgeSpeed: 8, weight: 1.2 },
    { color: '#2d3436', width: 35, height: 30, speed: 1.8, points: 100, name: 'Firefly', dodgeChance: 0.6, dodgeSpeed: 7, weight: 0.4, isSpecial: true }
];

// Fish colors
export const FISH_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#ff8c42'];

// Frog colors
export const FROG_COLORS = {
    normal: {
        main: '#16a34a',
        dark: '#14532d',
        belly: '#4ade80'
    },
    evolved: {
        main: '#dc2626',
        dark: '#991b1b',
        belly: '#fca5a5'
    }
};
