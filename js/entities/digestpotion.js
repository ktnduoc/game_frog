// Digestion Potion - Orange/Gold Bird delivery (1 bottle)
import { ctx } from '../utils/canvas.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config.js';
import { gameState, frogState, activateDigestionBoost } from '../state.js';
import { frog } from './frog.js';

// Orange/Gold Bird carrier state (Goldfinch style)
export const digestBird = {
    x: 0,
    y: 0,
    active: false,
    direction: 1,
    speed: 3.5,
    wingPhase: 0,
    hasDropped: false,
    dropX: 0,
    spawnTimer: 0,
    spawnInterval: 900 // 15 seconds
};

export const digestPotion = {
    x: 0,
    y: 0,
    width: 35,
    height: 45,
    active: false,
    fallSpeed: 2.5,
    sparkles: [],
    bubbles: []
};

export function updateDigestPotion() {
    if (gameState.state !== 'playing') return;

    digestBird.spawnTimer++;

    // Spawn bird periodically
    if (!digestBird.active && !digestPotion.active && digestBird.spawnTimer >= digestBird.spawnInterval) {
        spawnBird();
        digestBird.spawnTimer = 0;
    }

    // Update bird movement
    if (digestBird.active) {
        digestBird.wingPhase += 0.3;
        digestBird.x += digestBird.speed * digestBird.direction;

        // Check if bird should drop bottle
        if (!digestBird.hasDropped) {
            const reachedDropPoint = digestBird.direction === 1
                ? digestBird.x >= digestBird.dropX
                : digestBird.x <= digestBird.dropX;

            if (reachedDropPoint) {
                digestPotion.x = digestBird.x;
                digestPotion.y = digestBird.y + 20;
                digestPotion.active = true;
                digestPotion.sparkles = [];
                digestPotion.bubbles = [];
                digestBird.hasDropped = true;
            }
        }

        // Deactivate bird when off screen
        if ((digestBird.direction === 1 && digestBird.x > CANVAS_WIDTH + 60) ||
            (digestBird.direction === -1 && digestBird.x < -60)) {
            digestBird.active = false;
        }
    }

    // Update falling potion
    if (digestPotion.active) {
        digestPotion.y += digestPotion.fallSpeed;

        // Check collision with frog
        const dist = Math.sqrt((digestPotion.x - frog.x) ** 2 + (digestPotion.y - frog.y) ** 2);
        if (dist < 35) {
            activateDigestionBoost();
            frogState.doublePointsActive = true;
            frogState.doublePointsTimer = 600;
            frogState.flashColor = '#fb923c';
            frogState.flashTimer = frogState.flashDuration;
            digestPotion.active = false;
            return;
        }

        // Add sparkles
        if (Math.random() < 0.25) {
            digestPotion.sparkles.push({
                x: digestPotion.x + (Math.random() - 0.5) * 20,
                y: digestPotion.y + (Math.random() - 0.5) * 30,
                size: 2 + Math.random() * 2,
                life: 1.0,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5
            });
        }

        // Add bubbles
        if (Math.random() < 0.15) {
            digestPotion.bubbles.push({
                x: (Math.random() - 0.5) * 8,
                y: 6,
                size: 1.5 + Math.random() * 2,
                speed: 0.4 + Math.random() * 0.4
            });
        }

        // Update bubbles
        for (let i = digestPotion.bubbles.length - 1; i >= 0; i--) {
            digestPotion.bubbles[i].y -= digestPotion.bubbles[i].speed;
            if (digestPotion.bubbles[i].y < -12) digestPotion.bubbles.splice(i, 1);
        }

        // Update sparkles
        for (let i = digestPotion.sparkles.length - 1; i >= 0; i--) {
            const s = digestPotion.sparkles[i];
            s.x += s.vx;
            s.y += s.vy;
            s.life -= 0.025;
            if (s.life <= 0) digestPotion.sparkles.splice(i, 1);
        }

        // Off screen
        if (digestPotion.y > CANVAS_HEIGHT + 50) {
            digestPotion.active = false;
        }
    }
}

function spawnBird() {
    digestBird.direction = Math.random() < 0.5 ? 1 : -1;
    digestBird.x = digestBird.direction === 1 ? -60 : CANVAS_WIDTH + 60;
    digestBird.y = 60 + Math.random() * 70;

    const centerRange = CANVAS_WIDTH * 0.5;
    digestBird.dropX = (CANVAS_WIDTH - centerRange) / 2 + Math.random() * centerRange;

    digestBird.active = true;
    digestBird.hasDropped = false;
    digestBird.wingPhase = 0;
}

// Draw ORANGE/GOLD bird (Goldfinch style)
function drawBird() {
    if (!digestBird.active) return;

    ctx.save();
    ctx.translate(digestBird.x, digestBird.y);
    if (digestBird.direction === -1) ctx.scale(-1, 1);

    const wingFlap = Math.sin(digestBird.wingPhase) * 0.6;

    // Body - golden orange
    const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
    bodyGradient.addColorStop(0, '#fcd34d');
    bodyGradient.addColorStop(0.6, '#f59e0b');
    bodyGradient.addColorStop(1, '#d97706');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly - lighter
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.ellipse(0, 4, 10, 6, 0, 0, Math.PI);
    ctx.fill();

    // Wing - black with yellow stripe
    ctx.save();
    ctx.translate(-4, -4);
    ctx.rotate(-0.2 + wingFlap * 0.9);

    // Black wing base
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-12, -18 - wingFlap * 14, -30, -8 - wingFlap * 18);
    ctx.quadraticCurveTo(-22, 0, -8, 4);
    ctx.closePath();
    ctx.fill();

    // Yellow wing stripe
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.quadraticCurveTo(-12, -10 - wingFlap * 8, -20, -5 - wingFlap * 10);
    ctx.quadraticCurveTo(-15, -2, -8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Head - bright yellow
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(14, -4, 9, 0, Math.PI * 2);
    ctx.fill();

    // Black cap on head
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(14, -8, 6, Math.PI, 0);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(17, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(18, -5, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Beak - orange/coral
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.moveTo(22, -4);
    ctx.lineTo(29, -2);
    ctx.lineTo(22, 0);
    ctx.closePath();
    ctx.fill();

    // Tail - black
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.quadraticCurveTo(-22, 3, -28, 10);
    ctx.quadraticCurveTo(-20, 6, -14, 4);
    ctx.closePath();
    ctx.fill();

    // Feet
    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, 9);
    ctx.lineTo(-3, 14);
    ctx.moveTo(2, 9);
    ctx.lineTo(3, 14);
    ctx.stroke();

    // Draw bottle if not dropped
    if (!digestBird.hasDropped) {
        ctx.save();
        ctx.translate(0, 18);
        ctx.scale(0.55, 0.55);
        drawBottle();
        ctx.restore();
    }

    ctx.restore();
}

function drawBottle() {
    // Orange potion bottle
    const gradient = ctx.createLinearGradient(-12, -12, 12, 15);
    gradient.addColorStop(0, '#fed7aa');
    gradient.addColorStop(0.5, '#fb923c');
    gradient.addColorStop(1, '#ea580c');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-12, 8);
    ctx.quadraticCurveTo(-14, 0, -10, -10);
    ctx.lineTo(-6, -15);
    ctx.lineTo(6, -15);
    ctx.lineTo(10, -10);
    ctx.quadraticCurveTo(14, 0, 12, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // x2 label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('x2', 0, 0);

    // Neck
    ctx.fillStyle = '#c2410c';
    ctx.fillRect(-5, -21, 10, 8);

    // Cork - green
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-5, -26, 10, 6);
}

export function drawDigestPotion() {
    drawBird();

    if (!digestPotion.active) return;

    ctx.save();
    ctx.translate(digestPotion.x, digestPotion.y);
    drawBottle();

    // Bubbles
    for (const bubble of digestPotion.bubbles) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Glow
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.006) * 0.2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#fb923c';
    ctx.fillStyle = 'rgba(251, 146, 60, 0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Sparkles
    for (const sparkle of digestPotion.sparkles) {
        ctx.save();
        ctx.globalAlpha = sparkle.life;
        ctx.fillStyle = '#fdba74';
        ctx.beginPath();
        ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
