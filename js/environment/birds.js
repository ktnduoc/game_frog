// Birds flying in the sky
import { ctx } from '../utils/canvas.js';
import { CANVAS_WIDTH } from '../config.js';

// Birds array
export const birds = [];

// Initialize birds
export function initBirds() {
    const birdCount = 8 + Math.floor(Math.random() * 5);
    const startX = -100;
    const startY = 80 + Math.random() * 60;

    for (let i = 0; i < birdCount; i++) {
        birds.push({
            x: startX + i * (30 + Math.random() * 20),
            y: startY + (Math.sin(i * 0.5) * 20),
            offsetY: Math.sin(i * 0.5) * 20,
            speed: 0.8 + Math.random() * 0.3,
            wingPhase: Math.random() * Math.PI * 2,
            wingSpeed: 0.15 + Math.random() * 0.1
        });
    }
}

// Update birds
export function updateBirds() {
    for (let i = birds.length - 1; i >= 0; i--) {
        const bird = birds[i];
        bird.x += bird.speed;
        bird.wingPhase += bird.wingSpeed;
        bird.y = bird.offsetY + 80 + Math.sin(bird.x * 0.01) * 10;

        // Reset bird when it goes off screen
        if (bird.x > CANVAS_WIDTH + 50) {
            bird.x = -50;
        }
    }
}

// Draw birds (called from background)
export function drawBirds() {
    for (let bird of birds) {
        ctx.save();
        ctx.translate(bird.x, bird.y);

        const wingFlap = Math.sin(bird.wingPhase);
        const wingAngle = wingFlap * 0.5; // More dynamic wing movement
        const size = 6; // Smaller, more elegant

        // Bird body - slimmer and more streamlined
        ctx.fillStyle = 'rgba(50, 50, 60, 0.8)';
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.5, size * 0.25, 0, 0, Math.PI * 2); // Thinner body
        ctx.fill();

        // Head - smaller and more proportional
        ctx.beginPath();
        ctx.arc(size * 0.35, -size * 0.05, size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Beak - tiny detail
        ctx.fillStyle = 'rgba(255, 200, 100, 0.9)';
        ctx.beginPath();
        ctx.moveTo(size * 0.5, -size * 0.05);
        ctx.lineTo(size * 0.65, -size * 0.08);
        ctx.lineTo(size * 0.5, 0);
        ctx.closePath();
        ctx.fill();

        // Tail feathers - elegant and thin
        ctx.fillStyle = 'rgba(40, 40, 50, 0.7)';
        ctx.beginPath();
        ctx.moveTo(-size * 0.4, 0);
        ctx.lineTo(-size * 0.8, -size * 0.15);
        ctx.lineTo(-size * 0.85, 0);
        ctx.lineTo(-size * 0.8, size * 0.15);
        ctx.closePath();
        ctx.fill();

        // Wings - more elegant and thin strokes
        ctx.strokeStyle = 'rgba(50, 50, 60, 0.85)';
        ctx.lineWidth = 1.8; // Thinner wings
        ctx.lineCap = 'round';

        // Left wing - graceful curve
        ctx.beginPath();
        ctx.moveTo(-size * 0.1, -size * 0.1);
        ctx.bezierCurveTo(
            -size * 0.4,
            -size * (1.2 + wingAngle),
            -size * 0.8,
            -size * (1.3 + wingAngle * 0.6),
            -size * 1.3,
            -size * (0.9 + wingAngle * 0.4)
        );
        ctx.stroke();

        // Wing tip detail
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(-size * 1.0, -size * (1.0 + wingAngle * 0.5));
        ctx.lineTo(-size * 1.35, -size * (0.85 + wingAngle * 0.35));
        ctx.stroke();

        // Right wing - graceful curve
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(size * 0.1, -size * 0.1);
        ctx.bezierCurveTo(
            size * 0.4,
            -size * (1.2 + wingAngle),
            size * 0.8,
            -size * (1.3 + wingAngle * 0.6),
            size * 1.3,
            -size * (0.9 + wingAngle * 0.4)
        );
        ctx.stroke();

        // Wing tip detail
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(size * 1.0, -size * (1.0 + wingAngle * 0.5));
        ctx.lineTo(size * 1.35, -size * (0.85 + wingAngle * 0.35));
        ctx.stroke();

        ctx.restore();
    }
}
