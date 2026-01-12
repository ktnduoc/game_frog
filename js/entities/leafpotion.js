// Leaf Potion system - Green Hummingbird delivery (1 bottle)
import { ctx } from '../utils/canvas.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config.js';
import { gameState, frogState } from '../state.js';
import { frog } from './frog.js';
import { frogLilyPad } from '../environment/lilypad.js';
import { playHolyWaterSound } from '../audio/audio.js';

// Green Hummingbird carrier state
export const leafBird = {
    x: 0,
    y: 0,
    active: false,
    direction: 1,
    speed: 4, // Hummingbirds are fast
    wingPhase: 0,
    hasDropped: false,
    dropX: 0,
    hoverY: 0, // For hovering effect
    spawnTimer: 0,
    spawnInterval: 1200, // 20 seconds
    spawnedCount: 0,
    maxSpawns: 10
};

export const leafPotion = {
    x: 0,
    y: 0,
    width: 40,
    height: 50,
    active: false,
    fallSpeed: 2,
    sparkles: [],
    bubbles: []
};

export function updateLeafPotion() {
    if (gameState.state !== 'playing') return;

    leafBird.spawnTimer++;

    // Spawn bird periodically (max 10 per game)
    if (!leafBird.active && !leafPotion.active &&
        leafBird.spawnTimer >= leafBird.spawnInterval &&
        leafBird.spawnedCount < leafBird.maxSpawns) {
        spawnBird();
        leafBird.spawnTimer = 0;
        leafBird.spawnedCount++;
    }

    // Update bird movement
    if (leafBird.active) {
        leafBird.wingPhase += 0.8; // Very fast wing beats for hummingbird
        leafBird.hoverY = Math.sin(Date.now() * 0.01) * 3; // Hovering motion
        leafBird.x += leafBird.speed * leafBird.direction;

        // Check if bird should drop bottle
        if (!leafBird.hasDropped) {
            const reachedDropPoint = leafBird.direction === 1
                ? leafBird.x >= leafBird.dropX
                : leafBird.x <= leafBird.dropX;

            if (reachedDropPoint) {
                leafPotion.x = leafBird.x;
                leafPotion.y = leafBird.y + 15;
                leafPotion.active = true;
                leafPotion.sparkles = [];
                leafPotion.bubbles = [];
                leafBird.hasDropped = true;
            }
        }

        // Deactivate bird when off screen
        if ((leafBird.direction === 1 && leafBird.x > CANVAS_WIDTH + 60) ||
            (leafBird.direction === -1 && leafBird.x < -60)) {
            leafBird.active = false;
        }
    }

    // Update falling potion
    if (leafPotion.active) {
        leafPotion.y += leafPotion.fallSpeed;

        // Check collision with frog
        const dist = Math.sqrt((leafPotion.x - frog.x) ** 2 + (leafPotion.y - frog.y) ** 2);
        if (dist < 35) {
            // Restore lily pad
            frogLilyPad.healthPercentage = 1.0;
            frogLilyPad.color = '#10b981';
            frogLilyPad.petalDamage = 0;

            frogState.flashColor = '#34d399';
            frogState.flashTimer = frogState.flashDuration;

            // Heal particles
            if (!frogLilyPad.healParticles) frogLilyPad.healParticles = [];
            for (let i = 0; i < 15; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 3;
                frogLilyPad.healParticles.push({
                    x: frogLilyPad.x,
                    y: frogLilyPad.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1,
                    life: 1.0,
                    size: 4 + Math.random() * 4,
                    color: '#34d399'
                });
            }

            frogState.hungerTimer = 0;
            frogState.isStarving = false;
            playHolyWaterSound();
            leafPotion.active = false;
            return;
        }

        // Add sparkles
        if (Math.random() < 0.3) {
            leafPotion.sparkles.push({
                x: leafPotion.x + (Math.random() - 0.5) * 25,
                y: leafPotion.y + (Math.random() - 0.5) * 35,
                size: 2 + Math.random() * 3,
                life: 1.0,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2
            });
        }

        // Add bubbles
        if (Math.random() < 0.1) {
            leafPotion.bubbles.push({
                x: (Math.random() - 0.5) * 10,
                y: 8,
                size: 2 + Math.random() * 3,
                speed: 0.5 + Math.random() * 0.5
            });
        }

        // Update bubbles
        for (let i = leafPotion.bubbles.length - 1; i >= 0; i--) {
            leafPotion.bubbles[i].y -= leafPotion.bubbles[i].speed;
            if (leafPotion.bubbles[i].y < -15) leafPotion.bubbles.splice(i, 1);
        }

        // Update sparkles
        for (let i = leafPotion.sparkles.length - 1; i >= 0; i--) {
            const s = leafPotion.sparkles[i];
            s.x += s.vx;
            s.y += s.vy;
            s.life -= 0.02;
            if (s.life <= 0) leafPotion.sparkles.splice(i, 1);
        }

        // Off screen
        if (leafPotion.y > CANVAS_HEIGHT + 50) {
            leafPotion.active = false;
        }
    }
}

function spawnBird() {
    leafBird.direction = Math.random() < 0.5 ? 1 : -1;
    leafBird.x = leafBird.direction === 1 ? -50 : CANVAS_WIDTH + 50;
    leafBird.y = 70 + Math.random() * 60;

    const centerRange = CANVAS_WIDTH * 0.5;
    leafBird.dropX = (CANVAS_WIDTH - centerRange) / 2 + Math.random() * centerRange;

    leafBird.active = true;
    leafBird.hasDropped = false;
    leafBird.wingPhase = 0;
}

// Draw GREEN Hummingbird
function drawBird() {
    if (!leafBird.active) return;

    ctx.save();
    ctx.translate(leafBird.x, leafBird.y + leafBird.hoverY);
    if (leafBird.direction === -1) ctx.scale(-1, 1);

    const wingFlap = Math.sin(leafBird.wingPhase) * 0.7;

    // Body - iridescent green
    const bodyGradient = ctx.createLinearGradient(-8, -8, 8, 8);
    bodyGradient.addColorStop(0, '#6ee7b7');
    bodyGradient.addColorStop(0.5, '#10b981');
    bodyGradient.addColorStop(1, '#047857');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 8, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Iridescent shimmer
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
    ctx.fillStyle = '#a7f3d0';
    ctx.beginPath();
    ctx.ellipse(-3, -2, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Wings - blur effect for fast movement
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.translate(-2, -3);
    ctx.rotate(wingFlap * 1.2);

    const wingGradient = ctx.createLinearGradient(0, 0, -20, -10);
    wingGradient.addColorStop(0, '#34d399');
    wingGradient.addColorStop(1, '#059669');
    ctx.fillStyle = wingGradient;
    ctx.beginPath();
    ctx.ellipse(-12, -5 - wingFlap * 12, 14, 6, -0.5 + wingFlap * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Second wing blur
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.translate(-2, -3);
    ctx.rotate(-wingFlap * 1.2);
    ctx.fillStyle = '#6ee7b7';
    ctx.beginPath();
    ctx.ellipse(-10, -8 + wingFlap * 10, 12, 5, -0.3 - wingFlap * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Head - green
    const headGradient = ctx.createRadialGradient(10, -2, 0, 10, -2, 8);
    headGradient.addColorStop(0, '#6ee7b7');
    headGradient.addColorStop(0.7, '#10b981');
    headGradient.addColorStop(1, '#047857');
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(10, -2, 7, 0, Math.PI * 2);
    ctx.fill();

    // Throat - ruby red gorget
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(12, 1, 4, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Gorget shimmer
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.ellipse(11, 0, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Eye
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(13, -3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(13.5, -3.5, 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Long thin beak
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.moveTo(16, -2);
    ctx.lineTo(28, -1);
    ctx.lineTo(16, 0);
    ctx.closePath();
    ctx.fill();

    // Tail - forked
    ctx.fillStyle = '#047857';
    ctx.beginPath();
    ctx.moveTo(-10, 2);
    ctx.quadraticCurveTo(-18, 0, -22, -3);
    ctx.quadraticCurveTo(-16, 2, -10, 3);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-10, 2);
    ctx.quadraticCurveTo(-18, 4, -22, 8);
    ctx.quadraticCurveTo(-16, 4, -10, 4);
    ctx.closePath();
    ctx.fill();

    // Tiny feet
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-1, 6);
    ctx.lineTo(-2, 10);
    ctx.moveTo(1, 6);
    ctx.lineTo(2, 10);
    ctx.stroke();

    // Draw bottle if not dropped
    if (!leafBird.hasDropped) {
        ctx.save();
        ctx.translate(0, 12);
        ctx.scale(0.5, 0.5);
        drawBottle();
        ctx.restore();
    }

    ctx.restore();
}

function drawBottle() {
    // Green round potion bottle
    const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, 15);
    gradient.addColorStop(0, '#d1fae5');
    gradient.addColorStop(0.5, '#34d399');
    gradient.addColorStop(1, '#10b981');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(-5, -5, 6, 0, Math.PI * 2);
    ctx.fill();

    // Neck
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(-5, -20, 10, 6);

    // Cork
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-5, -25, 10, 6);
}

export function drawLeafPotion() {
    drawBird();

    if (!leafPotion.active) return;

    ctx.save();
    ctx.translate(leafPotion.x, leafPotion.y);
    drawBottle();

    // Bubbles
    for (const bubble of leafPotion.bubbles) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Glow
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#34d399';
    ctx.fillStyle = 'rgba(52, 211, 153, 0.1)';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Sparkles
    for (const sparkle of leafPotion.sparkles) {
        ctx.save();
        ctx.globalAlpha = sparkle.life;
        ctx.fillStyle = '#6ee7b7';
        ctx.beginPath();
        ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
