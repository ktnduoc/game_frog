// Holy Water Potion system - White/Gray Bird delivery (1 bottle)
import { ctx } from '../utils/canvas.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config.js';
import { gameState, frogState } from '../state.js';
import { frog } from './frog.js';
import { lotusFlower, lotusFlower2 } from './lotus.js';
import { playHolyWaterSound } from '../audio/audio.js';

// White/Gray Bird carrier state
export const holyWaterBird = {
    x: 0,
    y: 0,
    active: false,
    direction: 1,
    speed: 3,
    wingPhase: 0,
    hasDropped: false,
    dropX: 0,
    spawnTimer: 0,
    spawnInterval: 900 // 15 seconds
};

export const holyWater = {
    x: 0,
    y: 0,
    width: 40,
    height: 50,
    active: false,
    fallSpeed: 2.5,
    sparkles: [],
    bubbles: []
};

export function updateHolyWater() {
    if (gameState.state !== 'playing') return;

    holyWaterBird.spawnTimer++;

    // Spawn bird periodically
    if (!holyWaterBird.active && !holyWater.active && holyWaterBird.spawnTimer >= holyWaterBird.spawnInterval) {
        spawnBird();
        holyWaterBird.spawnTimer = 0;
    }

    // Update bird movement
    if (holyWaterBird.active) {
        holyWaterBird.wingPhase += 0.5; // Fast propeller spin
        holyWaterBird.x += holyWaterBird.speed * holyWaterBird.direction;

        // Check if bird should drop bottle
        if (!holyWaterBird.hasDropped) {
            const reachedDropPoint = holyWaterBird.direction === 1
                ? holyWaterBird.x >= holyWaterBird.dropX
                : holyWaterBird.x <= holyWaterBird.dropX;

            if (reachedDropPoint) {
                holyWater.x = holyWaterBird.x;
                holyWater.y = holyWaterBird.y + 20;
                holyWater.active = true;
                holyWater.sparkles = [];
                holyWater.bubbles = [];
                holyWaterBird.hasDropped = true;
            }
        }

        // Deactivate bird when off screen
        if ((holyWaterBird.direction === 1 && holyWaterBird.x > CANVAS_WIDTH + 60) ||
            (holyWaterBird.direction === -1 && holyWaterBird.x < -60)) {
            holyWaterBird.active = false;
        }
    }

    // Update falling holy water
    if (holyWater.active) {
        holyWater.y += holyWater.fallSpeed;

        // Check collision with frog
        const dist = Math.sqrt((holyWater.x - frog.x) ** 2 + (holyWater.y - frog.y) ** 2);
        if (dist < 35) {
            applyHolyWaterEffect();
            holyWater.active = false;
            return;
        }

        // Add sparkles
        if (Math.random() < 0.3) {
            holyWater.sparkles.push({
                x: holyWater.x + (Math.random() - 0.5) * 25,
                y: holyWater.y + (Math.random() - 0.5) * 35,
                size: 2 + Math.random() * 3,
                life: 1.0,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2
            });
        }

        // Add bubbles
        if (Math.random() < 0.1) {
            holyWater.bubbles.push({
                x: (Math.random() - 0.5) * 10,
                y: 8,
                size: 2 + Math.random() * 3,
                speed: 0.5 + Math.random() * 0.5
            });
        }

        // Update bubbles
        for (let i = holyWater.bubbles.length - 1; i >= 0; i--) {
            holyWater.bubbles[i].y -= holyWater.bubbles[i].speed;
            if (holyWater.bubbles[i].y < -15) holyWater.bubbles.splice(i, 1);
        }

        // Update sparkles
        for (let i = holyWater.sparkles.length - 1; i >= 0; i--) {
            const s = holyWater.sparkles[i];
            s.x += s.vx;
            s.y += s.vy;
            s.life -= 0.02;
            if (s.life <= 0) holyWater.sparkles.splice(i, 1);
        }

        // Off screen
        if (holyWater.y > CANVAS_HEIGHT + 50) {
            holyWater.active = false;
        }
    }
}

function applyHolyWaterEffect() {
    if (frogState.isPoisoned) {
        frogState.isPoisoned = false;
        frogState.poisonTimer = 0;
    }
    frogState.flashColor = '#3b82f6';
    frogState.flashTimer = frogState.flashDuration;

    [lotusFlower, lotusFlower2].forEach(flower => {
        if (flower.pollenAmount <= 0 || flower.type === 'wilted' || flower.type === 'disappeared') {
            flower.type = 'bud';
            flower.bloomProgress = 0.0;
            flower.bloomDelay = 30;
            flower.pollenAmount = 1000;
            flower.nectarLevel = flower.maxNectar;
            flower.wiltedTimer = 0;
            flower.fadeProgress = 0;
            flower.petalParticles = [];
            flower.justRestored = true;
        } else if (flower.type === 'bud') {
            flower.type = 'bloomed';
            flower.bloomProgress = 1.0;
            flower.bloomDelay = 0;
            flower.pollenAmount = 1000;
            flower.nectarLevel = flower.maxNectar;
            flower.justRestored = true;
        } else {
            flower.type = 'bloomed';
            flower.pollenAmount = 1000;
            flower.nectarLevel = flower.maxNectar;
            flower.bloomProgress = 1.0;
            flower.justRestored = true;
        }
        if (flower.insectAtFlower) {
            flower.insectAtFlower.isAtFlower = false;
            flower.insectAtFlower = null;
        }
    });
    playHolyWaterSound();
}

function spawnBird() {
    holyWaterBird.direction = Math.random() < 0.5 ? 1 : -1;
    holyWaterBird.x = holyWaterBird.direction === 1 ? -60 : CANVAS_WIDTH + 60;
    holyWaterBird.y = 50 + Math.random() * 80;

    const centerRange = CANVAS_WIDTH * 0.4;
    holyWaterBird.dropX = (CANVAS_WIDTH - centerRange) / 2 + Math.random() * centerRange;

    holyWaterBird.active = true;
    holyWaterBird.hasDropped = false;
    holyWaterBird.wingPhase = 0;
}

// Draw BLUE bird with bamboo propeller
function drawBird() {
    if (!holyWaterBird.active) return;

    ctx.save();
    ctx.translate(holyWaterBird.x, holyWaterBird.y);
    if (holyWaterBird.direction === -1) ctx.scale(-1, 1);

    const propellerAngle = holyWaterBird.wingPhase; // Spinning based on wingPhase

    // Body - blue bird
    const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
    bodyGradient.addColorStop(0, '#93c5fd');
    bodyGradient.addColorStop(0.6, '#3b82f6');
    bodyGradient.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly - lighter blue
    ctx.fillStyle = '#bfdbfe';
    ctx.beginPath();
    ctx.ellipse(0, 4, 10, 6, 0, 0, Math.PI);
    ctx.fill();

    // Small wings (folded, not flapping)
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.ellipse(-8, -2, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Wing detail
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, -3);
    ctx.lineTo(-12, -1);
    ctx.moveTo(-5, -1);
    ctx.lineTo(-11, 1);
    ctx.stroke();

    // Head - blue
    const headGradient = ctx.createRadialGradient(14, -4, 0, 14, -4, 10);
    headGradient.addColorStop(0, '#93c5fd');
    headGradient.addColorStop(0.7, '#3b82f6');
    headGradient.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(14, -4, 9, 0, Math.PI * 2);
    ctx.fill();

    // Cheek - light
    ctx.fillStyle = '#bfdbfe';
    ctx.beginPath();
    ctx.ellipse(16, -1, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(17, -5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(18, -6, 1, 0, Math.PI * 2);
    ctx.fill();

    // Beak - yellow/orange
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(22, -4);
    ctx.lineTo(29, -2);
    ctx.lineTo(22, 0);
    ctx.closePath();
    ctx.fill();

    // Tail - blue feathers
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.quadraticCurveTo(-22, 2, -26, 7);
    ctx.quadraticCurveTo(-18, 4, -14, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.moveTo(-14, -1);
    ctx.quadraticCurveTo(-20, 0, -24, 4);
    ctx.quadraticCurveTo(-17, 2, -14, 2);
    ctx.closePath();
    ctx.fill();

    // Feet
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, 9);
    ctx.lineTo(-3, 14);
    ctx.moveTo(2, 9);
    ctx.lineTo(3, 14);
    ctx.stroke();

    // === BAMBOO PROPELLER ON BACK ===
    ctx.save();
    ctx.translate(0, -12); // Position on back

    // Propeller pole (bamboo stick)
    const poleGradient = ctx.createLinearGradient(-2, 0, 2, 0);
    poleGradient.addColorStop(0, '#a3e635');
    poleGradient.addColorStop(0.3, '#84cc16');
    poleGradient.addColorStop(0.7, '#65a30d');
    poleGradient.addColorStop(1, '#4d7c0f');
    ctx.fillStyle = poleGradient;
    ctx.fillRect(-2, -12, 4, 14);

    // Bamboo joints
    ctx.strokeStyle = '#365314';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, -8);
    ctx.lineTo(2, -8);
    ctx.moveTo(-2, -4);
    ctx.lineTo(2, -4);
    ctx.moveTo(-2, 0);
    ctx.lineTo(2, 0);
    ctx.stroke();

    // Propeller hub
    ctx.translate(0, -14);
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Spinning propeller blades (4 blades)
    ctx.rotate(propellerAngle);
    for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 2);

        // Bamboo blade
        const bladeGradient = ctx.createLinearGradient(0, 0, 28, 0);
        bladeGradient.addColorStop(0, '#84cc16');
        bladeGradient.addColorStop(0.5, '#a3e635');
        bladeGradient.addColorStop(1, '#bef264');
        ctx.fillStyle = bladeGradient;
        ctx.beginPath();
        ctx.moveTo(3, -2);
        ctx.quadraticCurveTo(15, -4, 28, -1);
        ctx.lineTo(28, 1);
        ctx.quadraticCurveTo(15, 4, 3, 2);
        ctx.closePath();
        ctx.fill();

        // Blade outline
        ctx.strokeStyle = '#4d7c0f';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Blade center line
        ctx.strokeStyle = '#65a30d';
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(25, 0);
        ctx.stroke();

        ctx.restore();
    }

    ctx.restore();

    // Draw bottle if not dropped
    if (!holyWaterBird.hasDropped) {
        ctx.save();
        ctx.translate(0, 18);
        ctx.scale(0.6, 0.6);
        drawBottle();
        ctx.restore();
    }

    ctx.restore();
}

function drawBottle() {
    const gradient = ctx.createLinearGradient(-15, -15, 15, 20);
    gradient.addColorStop(0, '#bfdbfe');
    gradient.addColorStop(0.5, '#3b82f6');
    gradient.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-15, 10);
    ctx.quadraticCurveTo(0, 12, 15, 10);
    ctx.quadraticCurveTo(12, 0, 10, -15);
    ctx.quadraticCurveTo(0, -13, -10, -15);
    ctx.quadraticCurveTo(-12, 0, -15, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Neck
    ctx.fillStyle = '#0c4a6e';
    ctx.fillRect(-4, -28, 8, 15);

    // Cork
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-5, -33, 10, 6);
}

export function drawHolyWater() {
    drawBird();

    if (!holyWater.active) return;

    ctx.save();
    ctx.translate(holyWater.x, holyWater.y);
    drawBottle();

    // Bubbles
    for (const bubble of holyWater.bubbles) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Glow
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#38bdf8';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Sparkles
    for (const sparkle of holyWater.sparkles) {
        ctx.save();
        ctx.globalAlpha = sparkle.life;
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
