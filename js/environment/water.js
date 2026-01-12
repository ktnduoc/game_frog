// Water droplets system
import { ctx, canvas } from '../utils/canvas.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config.js';

// Water droplets array
export const waterDroplets = [];

// Create water splash effect
export function createSplash(x, y, count) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.random() * Math.PI) - Math.PI / 2;
        const speed = 5 + Math.random() * 10;
        waterDroplets.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 0.4,
            size: 3 + Math.random() * 4, // Slightly smaller
            alpha: 0.8 + Math.random() * 0.2,
            fadeSpeed: 0.02 + Math.random() * 0.02, // Fade faster (doubled)
            isOnScreen: false,
            stickX: 0,
            stickY: 0
        });
    }
}

// Update water droplets
export function updateWaterDroplets() {
    for (let i = waterDroplets.length - 1; i >= 0; i--) {
        const drop = waterDroplets[i];

        if (!drop.isOnScreen) {
            // Droplet is still flying
            drop.vy += drop.gravity;
            drop.x += drop.vx;
            drop.y += drop.vy;

            // Bubbles rise up and fade
            if (drop.isBubble) {
                drop.alpha -= drop.fadeSpeed;
                if (drop.alpha <= 0 || drop.y < 0) {
                    waterDroplets.splice(i, 1);
                    continue;
                }
            } else {
                // Check if droplet hits screen boundary
                if (drop.y <= 0 || drop.x <= 0 || drop.x >= CANVAS_WIDTH ||
                    (drop.vy > 0 && Math.random() < 0.1)) {
                    drop.isOnScreen = true;
                    drop.stickX = Math.max(0, Math.min(CANVAS_WIDTH, drop.x));
                    drop.stickY = Math.max(0, Math.min(CANVAS_HEIGHT, drop.y));
                    drop.vx = 0;
                    drop.vy = 0;
                }

                // Remove if goes too far down
                if (drop.y > CANVAS_HEIGHT + 20) {
                    waterDroplets.splice(i, 1);
                    continue;
                }
            }
        } else {
            // Droplet is on screen, slowly drip down
            drop.stickY += 0.5;
            drop.alpha -= drop.fadeSpeed;

            // Remove when faded or dripped off screen
            if (drop.alpha <= 0 || drop.stickY > CANVAS_HEIGHT) {
                waterDroplets.splice(i, 1);
            }
        }
    }
}

// Draw water droplets
export function drawWaterDroplets() {
    for (let drop of waterDroplets) {
        ctx.save();

        if (!drop.isOnScreen) {
            // Flying droplet or bubble
            ctx.globalAlpha = drop.alpha;

            if (drop.isBubble) {
                // Simple bubble - no gradient for performance
                ctx.fillStyle = `rgba(200, 230, 255, ${drop.alpha * 0.3})`;
                ctx.beginPath();
                ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
                ctx.fill();

                // Bubble outline
                ctx.strokeStyle = `rgba(255, 255, 255, ${drop.alpha * 0.5})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                // Simple droplet - no gradient for performance
                ctx.fillStyle = `rgba(180, 220, 255, ${drop.alpha})`;
                ctx.beginPath();
                ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
                ctx.fill();

                // Simple shine
                ctx.fillStyle = `rgba(255, 255, 255, ${drop.alpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(drop.x - drop.size * 0.3, drop.y - drop.size * 0.3, drop.size * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Droplet on screen (dripping) - simplified
            ctx.globalAlpha = drop.alpha;
            ctx.fillStyle = `rgba(180, 220, 255, ${drop.alpha * 0.6})`;

            // Simple circle instead of teardrop
            ctx.beginPath();
            ctx.arc(drop.stickX, drop.stickY, drop.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
