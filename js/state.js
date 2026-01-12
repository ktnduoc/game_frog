// Game state management
import { CANVAS_WIDTH, CANVAS_HEIGHT, EVOLUTION_DURATION } from './config.js';

// Developer Mode (stored in localStorage)
let devMode = localStorage.getItem('devMode') === 'true';

export function toggleDevMode() {
    devMode = !devMode;
    localStorage.setItem('devMode', devMode.toString());
    return devMode;
}

export function isDevMode() {
    return devMode;
}

// Main game state
export const gameState = {
    state: 'intro', // 'intro' | 'playing' | 'gameover' | 'victory'
    score: 0,
    combo: 0,
    mouseX: CANVAS_WIDTH / 2,
    mouseY: 0,
    introTimer: 0
};

// Day/Night cycle state
export const dayNightState = {
    phase: 'day', // 'day' | 'night'
    transitionProgress: 0, // 0 to 1 for smooth transition
    isTransitioning: false,
    targetPhase: 'day',
    sunMoonX: 700, // X position for sun/moon
    sunMoonY: 60,  // Y position for sun/moon
    lastLevel: 0   // Track level changes
};

// Determine if level is day or night
// Pattern: Level 1-3 = day, 4-5 = night, 6-8 = day, 9-10 = night, etc.
export function isNightLevel(level) {
    if (level === 0) return false;
    const cyclePosition = ((level - 1) % 5) + 1; // 1-5 cycle
    return cyclePosition >= 4; // 4, 5 are night
}

// Update day/night state based on level
export function updateDayNight(level) {
    const shouldBeNight = isNightLevel(level);
    const targetPhase = shouldBeNight ? 'night' : 'day';

    // Check if phase should change
    if (targetPhase !== dayNightState.phase && !dayNightState.isTransitioning) {
        dayNightState.isTransitioning = true;
        dayNightState.targetPhase = targetPhase;
        dayNightState.transitionProgress = 0;
    }

    // Update transition
    if (dayNightState.isTransitioning) {
        dayNightState.transitionProgress += 0.008; // Smooth transition ~2 seconds

        if (dayNightState.transitionProgress >= 1) {
            dayNightState.transitionProgress = 1;
            dayNightState.phase = dayNightState.targetPhase;
            dayNightState.isTransitioning = false;
        }
    }

    dayNightState.lastLevel = level;
}

// Frog evolution state
export const frogEvolution = {
    isEvolved: false,
    glowIntensity: 0,
    evolutionTimer: 0,
    evolutionDuration: EVOLUTION_DURATION,
    color: '#22c55e',
    evolvedColor: '#dc2626'
};

// Frog level and chewing state
export const frogState = {
    level: 0,
    targetLevel: 0,
    isVictory: false,
    victoryJumpTimer: 0,
    victoryModalDelay: 180, // 3 seconds at 60fps before showing modal
    victoryModalOffset: 0, // Y offset for slide-up animation
    // Chewing animation
    isChewing: false,
    chewTimer: 0,
    chewDuration: 60, // 1 second at 60fps - cannot shoot tongue while chewing
    chewPhase: 0,
    lastEatenInsect: null,
    // Throat bulge for swallowing
    throatBulge: 0,
    // Base mouth size (grows with level)
    baseMouthOpen: 12,
    maxMouthOpen: 30,
    // Blinking animation
    isBlinking: false,
    blinkTimer: 0,
    blinkDuration: 8, // frames for one blink
    nextBlinkTime: 180, // frames until next blink
    // Glasses
    isWearingGlasses: (localStorage.getItem('glassesType') || 'none') !== 'none',
    glassesType: localStorage.getItem('glassesType') || 'none', // 'none', 'clear', 'dark', 'rainbow'
    // Poison state
    isPoisoned: false,
    poisonTimer: 0,
    poisonDuration: 300, // 5 seconds at 60fps
    isDead: false,
    // Hunger state
    hungerTimer: 0,
    hungerDuration: 1800, // 30 seconds at 60fps
    isStarving: false,
    // Digestion system
    weight: 0,              // Current accumulated weight
    maxWeight: 500,         // Max weight before overload
    digestionTimer: 0,      // Current digestion progress (frames)
    digestionDuration: 0,   // Total digestion time needed (max 300 = 5s)
    isDigesting: false,     // Currently digesting food
    pendingFood: [],        // Queue of food being digested [{points, isFish}]
    digestionSpeed: 1,      // Digestion speed multiplier (2 = 2x faster)
    digestionBoostTimer: 0, // Timer for digestion boost (frames)
    // Double points buff
    doublePointsActive: false, // Whether double points is active
    doublePointsTimer: 0,      // Timer for double points buff (frames)
    // Falling state (when overloaded)
    isFalling: false,
    fallY: 0,
    fallVelocity: 0,
    fallRotation: 0,
    // Shake state (when heavy)
    shakeTimer: 0,
    shakeDuration: 90, // 1.5 seconds shake at 60fps
    shakeInterval: 300, // 5 seconds between shakes at 60fps
    isShaking: false,
    // Potion flash effect
    flashColor: null,      // Color to flash (e.g., '#3b82f6' for blue)
    flashTimer: 0,         // Timer for flash duration
    flashDuration: 30      // 0.5 seconds at 60fps
};

// Timers
export const timers = {
    ribbitTimer: 0,
    fishSpawnTimer: 0
};

// Level thresholds calculation function - arithmetic progression
// Formula: Level n requires total score of 100 * n * (n + 1) / 2
// Level 0: 0, Level 1: 100, Level 2: 300, Level 3: 600, Level 4: 1000, etc.
// Each level needs: 100, 200, 300, 400, ... more points than previous
export function getLevelThreshold(level) {
    const basePoints = isDevMode() ? 20 : 100; // Dev mode: 20, User mode: 100
    return basePoints * level * (level + 1) / 2;
}

// Update score in UI
export function updateScoreUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('combo').textContent = gameState.combo;
    document.getElementById('level').textContent = frogState.targetLevel;

    // Update next level progress
    const currentLevel = frogState.targetLevel;
    const currentThreshold = getLevelThreshold(currentLevel);
    const nextThreshold = getLevelThreshold(currentLevel + 1);
    const progress = gameState.score - currentThreshold;
    const needed = nextThreshold - currentThreshold;
    document.getElementById('next-level').textContent = `${progress}/${needed}`;
}

// Reset combo
export function resetCombo() {
    gameState.combo = 0;
    document.getElementById('combo').textContent = gameState.combo;
}

// Digestion constants
const MAX_DIGESTION_TIME = 300; // 5 seconds at 60fps
const FISH_WEIGHT = 200; // Fish always adds 200 weight
const FISH_DIGESTION_TIME = 600; // 10 seconds at 60fps for fish

// Eat food and add weight
export function eatFood(points, isFish = false) {
    // Calculate weight to add
    const weightToAdd = isFish ? FISH_WEIGHT : points;

    // Check if weight is already above 300 before adding
    const wasAbove300 = frogState.weight > 300;

    // Add weight immediately
    frogState.weight += weightToAdd;

    // If weight was already above 300 and we're eating more, trigger immediate shake
    if (wasAbove300 && frogState.weight > 300) {
        frogState.isShaking = true;
        frogState.shakeTimer = 0;
    }

    // Calculate digestion time
    // Fish takes 10 seconds to digest, insects based on points (max 5 seconds)
    const digestionTime = isFish ? FISH_DIGESTION_TIME : Math.min(points * 3, MAX_DIGESTION_TIME);

    // Add to pending food queue
    frogState.pendingFood.push({
        weight: weightToAdd,
        digestionTime: digestionTime,
        remainingTime: digestionTime
    });

    // Start digestion if not already digesting
    if (!frogState.isDigesting) {
        frogState.isDigesting = true;
        frogState.digestionDuration = digestionTime;
        frogState.digestionTimer = 0;
    } else {
        // Add more digestion time if already digesting
        frogState.digestionDuration += digestionTime;
    }

    // Check for overload
    return frogState.weight >= frogState.maxWeight;
}

// Update digestion (call every frame)
export function updateDigestion() {
    // Update digestion boost timer
    if (frogState.digestionBoostTimer > 0) {
        frogState.digestionBoostTimer--;
        if (frogState.digestionBoostTimer <= 0) {
            frogState.digestionSpeed = 1; // Reset to normal speed
        }
    }

    if (!frogState.isDigesting || frogState.pendingFood.length === 0) {
        return;
    }

    frogState.digestionTimer++;

    // Process pending food - apply digestion speed multiplier
    const currentFood = frogState.pendingFood[0];
    currentFood.remainingTime -= frogState.digestionSpeed;

    // Food fully digested
    if (currentFood.remainingTime <= 0) {
        // Remove weight for digested food
        frogState.weight = Math.max(0, frogState.weight - currentFood.weight);
        frogState.pendingFood.shift();

        // Check if more food to digest
        if (frogState.pendingFood.length === 0) {
            frogState.isDigesting = false;
            frogState.digestionTimer = 0;
            frogState.digestionDuration = 0;
        } else {
            // Reset timer for next food
            frogState.digestionTimer = 0;
            frogState.digestionDuration = frogState.pendingFood[0].remainingTime;
        }
    }
}

// Activate digestion boost
export function activateDigestionBoost() {
    frogState.digestionSpeed = 2;
    frogState.digestionBoostTimer = 600; // 10 seconds at 60fps
}

// Add score
export function addScore(points) {
    const previousLevel = frogState.targetLevel;
    gameState.score += points * (gameState.combo + 1);
    gameState.combo++;
    
    // Calculate level based on score - no upper limit
    // Level n requires 100 * n * (n + 1) / 2 total points
    let newLevel = 0;
    while (gameState.score >= getLevelThreshold(newLevel + 1)) {
        newLevel++;
    }
    frogState.targetLevel = newLevel;
    
    updateScoreUI();
    return frogState.targetLevel > previousLevel; // Return true if leveled up
}
