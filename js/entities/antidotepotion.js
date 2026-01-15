// Antidote Potion system - Purple Bird delivery with struggling flight (spawns every 3 levels)
import { ctx } from '../utils/canvas.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config.js';
import { gameState, frogState } from '../state.js';
import { frog } from './frog.js';
import { playHolyWaterSound } from '../audio/audio.js';

// Purple Bird carrier state with struggling flight
export const antidoteBird = {
    x: 0,
    y: 0,
    active: false,
    direction: 1,
    speed: 2.5, // Slower flight due to heavy bottle
    wingPhase: 0,
    hasDropped: false,
    dropX: 0,
    // Struggling flight animation
    verticalOffset: 0, // Current vertical position offset
    verticalSpeed: 0, // Vertical velocity
    gravity: 0.15, // Gravity pulling bird down
    flapStrength: 0.8, // How much bird can push up when flapping
    targetY: 100, // Target Y position bird tries to maintain
    lastSpawnLevel: -3
};

// Array to hold multiple potions on well edge
export const antidotePotions = [];

// Potion template
const potionWidth = 20;
const potionHeight = 26;

export function updateAntidotePotion() {
    if (gameState.state !== 'playing') return;

    // Check if should spawn based on level (every 3 levels)
    const currentLevel = frogState.targetLevel;
    if (!antidoteBird.active) {
        // Spawn at levels 3, 6, 9, 12, etc.
        if (currentLevel >= 3 && currentLevel % 3 === 0 && antidoteBird.lastSpawnLevel < currentLevel) {
            spawnBird();
            antidoteBird.lastSpawnLevel = currentLevel;
        }
    }

    // Update bird movement with struggling flight
    if (antidoteBird.active) {
        // Fast wing flapping (struggling)
        antidoteBird.wingPhase += 0.35;
        
        // Horizontal movement (slow due to heavy load)
        antidoteBird.x += antidoteBird.speed * antidoteBird.direction;
        
        // Struggling vertical movement - bird tries to flap up but gravity pulls down
        // Apply gravity (pulling down)
        antidoteBird.verticalSpeed += antidoteBird.gravity;
        
        // Flapping force (pushing up) - happens every wing beat
        const flapCycle = Math.sin(antidoteBird.wingPhase);
        if (flapCycle > 0.7) { // Strong flap
            antidoteBird.verticalSpeed -= antidoteBird.flapStrength;
        }
        
        // Apply vertical speed with limits
        antidoteBird.verticalOffset += antidoteBird.verticalSpeed;
        
        // Limit vertical drift (don't go too high or low)
        if (antidoteBird.verticalOffset < -30) {
            antidoteBird.verticalOffset = -30;
            antidoteBird.verticalSpeed = 0;
        }
        if (antidoteBird.verticalOffset > 40) {
            antidoteBird.verticalOffset = 40;
            antidoteBird.verticalSpeed = Math.min(0, antidoteBird.verticalSpeed);
        }
        
        // Update actual Y position
        antidoteBird.y = antidoteBird.targetY + antidoteBird.verticalOffset;

        // Check if bird should drop bottle
        if (!antidoteBird.hasDropped) {
            const reachedDropPoint = antidoteBird.direction === 1
                ? antidoteBird.x >= antidoteBird.dropX
                : antidoteBird.x <= antidoteBird.dropX;

            if (reachedDropPoint) {
                // Drop bottle on well edge
                spawnPotionOnWell();
                antidoteBird.hasDropped = true;
                
                // Bird becomes lighter and flies better after dropping
                antidoteBird.gravity = 0.08;
                antidoteBird.flapStrength = 1.2;
                antidoteBird.speed = 3.5;
            }
        }

        // Deactivate bird when off screen
        if ((antidoteBird.direction === 1 && antidoteBird.x > CANVAS_WIDTH + 60) ||
            (antidoteBird.direction === -1 && antidoteBird.x < -60)) {
            antidoteBird.active = false;
        }
    }

    // Update all potions on well edge
    for (let i = antidotePotions.length - 1; i >= 0; i--) {
        const potion = antidotePotions[i];
        potion.glowPhase += 0.08;
        potion.bobPhase += 0.05;

        // Add sparkles
        if (Math.random() < 0.15) {
            potion.sparkles.push({
                x: potion.x + (Math.random() - 0.5) * 15,
                y: potion.y + (Math.random() - 0.5) * 20,
                size: 1 + Math.random() * 2,
                life: 1.0,
                vx: (Math.random() - 0.5) * 1,
                vy: (Math.random() - 0.5) * 1,
                hue: 270 + Math.random() * 30 // Purple range
            });
        }

        // Update sparkles
        for (let j = potion.sparkles.length - 1; j >= 0; j--) {
            const s = potion.sparkles[j];
            s.x += s.vx;
            s.y += s.vy;
            s.life -= 0.02;
            if (s.life <= 0) potion.sparkles.splice(j, 1);
        }
    }
}

// Spawn bird from off-screen
function spawnBird() {
    antidoteBird.active = true;
    antidoteBird.hasDropped = false;
    antidoteBird.direction = Math.random() > 0.5 ? 1 : -1;
    antidoteBird.speed = 2.5; // Slow due to carrying heavy bottle
    antidoteBird.gravity = 0.15; // Heavy load
    antidoteBird.flapStrength = 0.8; // Struggling to stay up
    antidoteBird.verticalOffset = 0;
    antidoteBird.verticalSpeed = 0;
    antidoteBird.targetY = 100;

    if (antidoteBird.direction === 1) {
        antidoteBird.x = -60;
    } else {
        antidoteBird.x = CANVAS_WIDTH + 60;
    }
    antidoteBird.y = antidoteBird.targetY;

    // Calculate where to drop (random position on well edge)
    const wellCenterX = CANVAS_WIDTH / 2;
    const wellRadius = 180;
    const leftSideStart = wellCenterX - wellRadius;
    const leftSideEnd = wellCenterX - 50; // Avoid flag area
    const rightSideStart = wellCenterX + 50;
    const rightSideEnd = wellCenterX + wellRadius;

    if (Math.random() > 0.5) {
        antidoteBird.dropX = leftSideStart + Math.random() * (leftSideEnd - leftSideStart);
    } else {
        antidoteBird.dropX = rightSideStart + Math.random() * (rightSideEnd - rightSideStart);
    }
}

// Spawn potion on well edge (dropped by bird)
function spawnPotionOnWell() {
    // Create new potion and add to array
    const newPotion = {
        x: antidoteBird.dropX - potionWidth / 2,
        y: 150, // Well edge
        width: potionWidth,
        height: potionHeight,
        sparkles: [],
        glowPhase: 0,
        bobPhase: 0
    };
    antidotePotions.push(newPotion);
}

// Update antidote count in UI
function updateAntidoteUI() {
    const element = document.getElementById('antidote-count');
    if (element) {
        element.textContent = frogState.antidoteCount;
    }
}

// Use antidote to cure poison (called automatically when poison timer runs out)
export function useAntidote() {
    if (frogState.antidoteCount > 0 && frogState.isPoisoned) {
        frogState.antidoteCount--;
        frogState.isPoisoned = false;
        frogState.poisonTimer = 0;
        
        // Update UI
        updateAntidoteUI();
        
        // Create healing particles effect
        createAntidoteEffect();
        
        // Flash effect
        frogState.flashColor = '#a855f7';
        frogState.flashTimer = frogState.flashDuration;
        
        // Play sound
        playHolyWaterSound();
        
        return true; // Successfully used antidote
    }
    return false; // No antidote available
}

// Create visual effect when antidote is used
function createAntidoteEffect() {
    // Create purple healing particles around frog
    if (!frog.antidoteParticles) frog.antidoteParticles = [];
    
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const speed = 2 + Math.random() * 2;
        frog.antidoteParticles.push({
            x: frog.x,
            y: frog.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 1.0,
            size: 3 + Math.random() * 4,
            hue: 270 + Math.random() * 30 // Purple
        });
    }
}

// Draw antidote particles
export function drawAntidoteParticles() {
    if (!frog.antidoteParticles) return;
    
    ctx.save();
    for (let i = frog.antidoteParticles.length - 1; i >= 0; i--) {
        const p = frog.antidoteParticles[i];
        
        // Update
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // Gravity
        p.life -= 0.02;
        
        // Remove if dead
        if (p.life <= 0) {
            frog.antidoteParticles.splice(i, 1);
            continue;
        }
        
        // Draw only if valid
        const radius = Math.max(0.1, p.size * p.life); // Ensure positive radius
        ctx.globalAlpha = p.life;
        ctx.fillStyle = `hsl(${p.hue}, 80%, 65%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// Draw Purple Bird with struggling flight - beautiful design
export function drawAntidoteBird() {
    if (!antidoteBird.active) return;

    ctx.save();
    ctx.translate(antidoteBird.x, antidoteBird.y);
    if (antidoteBird.direction === -1) ctx.scale(-1, 1);

    const wingFlap = Math.sin(antidoteBird.wingPhase) * (antidoteBird.hasDropped ? 0.5 : 0.8);

    // Body - Purple/Violet gradient
    const bodyGradient = ctx.createLinearGradient(-8, -8, 8, 8);
    bodyGradient.addColorStop(0, '#c084fc');
    bodyGradient.addColorStop(0.5, '#a855f7');
    bodyGradient.addColorStop(1, '#7e22ce');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 8, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Shimmer effect
    ctx.save();
    ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.008) * 0.2;
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.ellipse(-3, -2, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Head
    ctx.fillStyle = '#9333ea';
    ctx.beginPath();
    ctx.arc(8, -1, 5, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(10, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(10.5, -2, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.moveTo(13, -1);
    ctx.lineTo(16, -1);
    ctx.lineTo(13, 0);
    ctx.closePath();
    ctx.fill();

    // Wings with struggling animation
    ctx.fillStyle = '#a855f7';
    ctx.strokeStyle = '#7e22ce';
    ctx.lineWidth = 1;

    // Left wing
    ctx.beginPath();
    ctx.ellipse(-5, 0, 8, 4, -0.3 + wingFlap, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right wing
    ctx.beginPath();
    ctx.ellipse(-5, 0, 8, 4, 0.3 - wingFlap, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tail feathers - purple
    ctx.fillStyle = '#9333ea';
    for (let i = 0; i < 3; i++) {
        const angle = -0.3 + i * 0.3;
        ctx.beginPath();
        ctx.ellipse(-10, 2, 5, 2, angle, 0, Math.PI * 2);
        ctx.fill();
    }

    // Bottle held in talons (if not dropped)
    if (!antidoteBird.hasDropped) {
        drawBottleInTalons();
    }

    ctx.restore();
}

// Draw bottle in bird's talons
function drawBottleInTalons() {
    ctx.save();
    ctx.translate(0, 10);

    // Bottle body - purple potion
    const bottleGradient = ctx.createLinearGradient(-8, -12, 8, 12);
    bottleGradient.addColorStop(0, '#a855f7');
    bottleGradient.addColorStop(0.5, '#9333ea');
    bottleGradient.addColorStop(1, '#7e22ce');
    
    ctx.fillStyle = bottleGradient;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    
    // Bottle shape
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.lineTo(-7, -2);
    ctx.lineTo(-4, -8);
    ctx.lineTo(4, -8);
    ctx.lineTo(7, -2);
    ctx.lineTo(6, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cork/cap
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-4, -10, 8, 3);

    // Purple glow inside bottle
    ctx.save();
    ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.01) * 0.3;
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sparkles on bottle
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(-3, -3, 1, 0, Math.PI * 2);
    ctx.arc(2, 2, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Draw all antidote potions on well edge
export function drawAntidotePotion() {
    // Draw all potions in the array
    for (const potion of antidotePotions) {
        drawSinglePotion(potion);
    }
}

// Draw a single potion
function drawSinglePotion(potion) {
    // Bobbing animation
    const bobOffset = Math.sin(potion.bobPhase) * 3;

    ctx.save();
    ctx.translate(potion.x, potion.y + bobOffset);

    // Pulsing glow effect
    const glowSize = 25 + Math.sin(potion.glowPhase) * 5;
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
    glowGradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
    glowGradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.2)');
    glowGradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
    ctx.fill();

    // Small bottle body - purple gradient
    const bottleGradient = ctx.createLinearGradient(-6, -10, 6, 10);
    bottleGradient.addColorStop(0, '#c084fc');
    bottleGradient.addColorStop(0.3, '#a855f7');
    bottleGradient.addColorStop(0.7, '#9333ea');
    bottleGradient.addColorStop(1, '#7e22ce');
    
    ctx.fillStyle = bottleGradient;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    
    // Small bottle shape
    ctx.beginPath();
    ctx.moveTo(-5, 8);
    ctx.lineTo(-6, -3);
    ctx.lineTo(-4, -9);
    ctx.lineTo(4, -9);
    ctx.lineTo(6, -3);
    ctx.lineTo(5, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cork
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-4, -11, 8, 3);
    
    // Cork highlight
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-3, -10, 6, 1.5);

    // Liquid glow inside
    ctx.save();
    ctx.globalAlpha = 0.7 + Math.sin(potion.glowPhase) * 0.2;
    const liquidGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 8);
    liquidGradient.addColorStop(0, '#f3e8ff');
    liquidGradient.addColorStop(0.5, '#e9d5ff');
    liquidGradient.addColorStop(1, 'rgba(168, 85, 247, 0.5)');
    ctx.fillStyle = liquidGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Highlight on bottle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-3, -4, 2, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Small sparkles
    ctx.fillStyle = '#fde68a';
    ctx.shadowBlur = 2;
    ctx.shadowColor = '#fde68a';
    ctx.beginPath();
    ctx.arc(-2, -5, 1, 0, Math.PI * 2);
    ctx.arc(2, 0, 1, 0, Math.PI * 2);
    ctx.arc(3, -6, 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw floating sparkles
    for (const s of potion.sparkles) {
        ctx.save();
        ctx.globalAlpha = s.life;
        ctx.fillStyle = `hsl(${s.hue}, 80%, 70%)`;
        ctx.shadowBlur = 3;
        ctx.shadowColor = `hsl(${s.hue}, 80%, 70%)`;
        ctx.beginPath();
        ctx.arc(s.x, s.y + bobOffset, s.size * s.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Reset antidote system
export function resetAntidoteSystem() {
    antidoteBird.active = false;
    antidoteBird.hasDropped = false;
    antidoteBird.lastSpawnLevel = -3;
    antidoteBird.verticalOffset = 0;
    antidoteBird.verticalSpeed = 0;
    
    // Clear all potions
    antidotePotions.length = 0;
    
    if (frog.antidoteParticles) {
        frog.antidoteParticles = [];
    }
}
