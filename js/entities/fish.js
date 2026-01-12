// Fish system
import { ctx } from '../utils/canvas.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, FISH_COLORS } from '../config.js';
import { shadeColor, lightenColor } from '../utils/colors.js';
import { createSplash, waterDroplets } from '../environment/water.js';
import { playWaterSplashSound } from '../audio/audio.js';

// Fish jumps array
export const fishJumps = [];

// Spawn jumping fish
export function spawnFish() {
    const fishX = Math.random() * (CANVAS_WIDTH - 200) + 100;
    const waterLevel = CANVAS_HEIGHT - 100;
    const fish = {
        x: fishX,
        y: waterLevel,
        waterLevel: waterLevel,
        vx: (Math.random() - 0.5) * 6,
        vy: -13 - Math.random() * 5,
        gravity: 0.5,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        size: 18 + Math.random() * 12,
        color: FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)],
        phase: 0,
        alpha: 1.0,
        state: 'jumping', // jumping, swimming, fading
        swimTimer: 0,
        swimDuration: 120,
        direction: Math.random() > 0.5 ? 1 : -1
    };
    fishJumps.push(fish);

    createSplash(fish.x, fish.y, 10);
    playWaterSplashSound();
}

// Update fish jumps
export function updateFish() {
    for (let i = fishJumps.length - 1; i >= 0; i--) {
        const fish = fishJumps[i];
        fish.phase += 0.15;

        if (fish.state === 'jumping') {
            fish.vy += fish.gravity;
            fish.x += fish.vx;
            fish.y += fish.vy;
            fish.rotation += fish.rotationSpeed;

            // Create water droplets while in air
            if (fish.vy < 0 && Math.random() < 0.2) {
                waterDroplets.push({
                    x: fish.x + (Math.random() - 0.5) * 20,
                    y: fish.y + fish.size,
                    vx: (Math.random() - 0.5) * 2,
                    vy: Math.random() * 2,
                    gravity: 0.4,
                    size: 2 + Math.random() * 3,
                    alpha: 0.6 + Math.random() * 0.3,
                    fadeSpeed: 0.01 + Math.random() * 0.01,
                    isOnScreen: false,
                    stickX: 0,
                    stickY: 0
                });
            }

            // Check if fish entered water
            if (fish.y >= fish.waterLevel) {
                fish.state = 'swimming';
                fish.y = fish.waterLevel + 20;
                fish.vy = 0;
                fish.vx = fish.direction * (2 + Math.random() * 2);
                fish.rotation = 0;
                fish.swimTimer = fish.swimDuration;

                createSplash(fish.x, fish.waterLevel, 12);
                playWaterSplashSound();
            }

            if (fish.x < -50 || fish.x > CANVAS_WIDTH + 50) {
                fishJumps.splice(i, 1);
            }
        } else if (fish.state === 'swimming') {
            fish.swimTimer--;

            const swimWave = Math.sin(fish.phase * 0.5) * 0.8;
            fish.x += fish.vx;
            fish.y = fish.waterLevel + 20 + swimWave;
            fish.rotation = Math.sin(fish.phase * 0.5) * 0.1;

            fish.vx *= 0.99;

            // Create bubbles
            if (Math.random() < 0.1) {
                waterDroplets.push({
                    x: fish.x - fish.size * 0.5,
                    y: fish.y,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: -1 - Math.random() * 1.5,
                    gravity: -0.02,
                    size: 2 + Math.random() * 3,
                    alpha: 0.4 + Math.random() * 0.2,
                    fadeSpeed: 0.005,
                    isOnScreen: false,
                    stickX: 0,
                    stickY: 0,
                    isBubble: true
                });
            }

            if (fish.swimTimer <= 60) {
                fish.state = 'fading';
            }

            if (fish.x < -100 || fish.x > CANVAS_WIDTH + 100) {
                fishJumps.splice(i, 1);
            }
        } else if (fish.state === 'fading') {
            const swimWave = Math.sin(fish.phase * 0.5) * 0.8;
            fish.x += fish.vx * 0.5;
            fish.y = fish.waterLevel + 25 + swimWave;
            fish.rotation = Math.sin(fish.phase * 0.5) * 0.1;
            fish.alpha -= 0.015;

            if (fish.alpha <= 0 || fish.x < -100 || fish.x > CANVAS_WIDTH + 100) {
                fishJumps.splice(i, 1);
            }
        }
    }
}

// Draw fish
export function drawFish() {
    for (let fish of fishJumps) {
        ctx.save();
        ctx.globalAlpha = fish.alpha;
        ctx.translate(fish.x, fish.y);
        ctx.rotate(fish.rotation);

        // Flip fish if swimming left
        if (fish.state === 'swimming' || fish.state === 'fading') {
            if (fish.vx < 0) {
                ctx.scale(-1, 1);
            }
        }

        // Fish body shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(2, 3, fish.size * 1.1, fish.size * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail (animated)
        const tailWave = Math.sin(fish.phase) * 0.4;
        const tailGradient = ctx.createRadialGradient(-fish.size * 0.8, 0, 0, -fish.size * 1.5, 0, fish.size * 0.8);
        tailGradient.addColorStop(0, fish.color);
        tailGradient.addColorStop(1, shadeColor(fish.color, -25));
        ctx.fillStyle = tailGradient;

        ctx.beginPath();
        ctx.moveTo(-fish.size * 0.9, 0);
        ctx.quadraticCurveTo(
            -fish.size * 1.4,
            -fish.size * 0.7 + tailWave * fish.size * 0.8,
            -fish.size * 1.7,
            -fish.size * 0.4 + tailWave * fish.size * 0.3
        );
        ctx.quadraticCurveTo(
            -fish.size * 1.5,
            tailWave * fish.size * 0.4,
            -fish.size * 0.9,
            0
        );
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-fish.size * 0.9, 0);
        ctx.quadraticCurveTo(
            -fish.size * 1.4,
            fish.size * 0.7 + tailWave * fish.size * 0.8,
            -fish.size * 1.7,
            fish.size * 0.4 + tailWave * fish.size * 0.3
        );
        ctx.quadraticCurveTo(
            -fish.size * 1.5,
            tailWave * fish.size * 0.4,
            -fish.size * 0.9,
            0
        );
        ctx.closePath();
        ctx.fill();

        // Tail stripes
        ctx.strokeStyle = shadeColor(fish.color, -35);
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(-fish.size * 0.9 - i * fish.size * 0.25, -fish.size * 0.3);
            ctx.lineTo(-fish.size * 0.9 - i * fish.size * 0.25, fish.size * 0.3);
            ctx.stroke();
        }

        // Bottom fin
        ctx.fillStyle = shadeColor(fish.color, -15);
        ctx.beginPath();
        ctx.ellipse(-fish.size * 0.1, fish.size * 0.5, fish.size * 0.25, fish.size * 0.4, 0.8 + tailWave * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Fish body
        const bodyGradient = ctx.createRadialGradient(0, -fish.size * 0.2, 0, 0, 0, fish.size * 1.2);
        bodyGradient.addColorStop(0, lightenColor(fish.color, 40));
        bodyGradient.addColorStop(0.5, fish.color);
        bodyGradient.addColorStop(1, shadeColor(fish.color, -25));
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, fish.size, fish.size * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        // Belly
        ctx.fillStyle = `rgba(255, 255, 255, 0.4)`;
        ctx.beginPath();
        ctx.ellipse(fish.size * 0.1, fish.size * 0.2, fish.size * 0.6, fish.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Scales pattern
        ctx.strokeStyle = `rgba(255, 255, 255, 0.25)`;
        ctx.lineWidth = 1;
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 4; col++) {
                const sx = -fish.size * 0.5 + col * fish.size * 0.35;
                const sy = -fish.size * 0.35 + row * fish.size * 0.35;
                ctx.beginPath();
                ctx.arc(sx, sy, fish.size * 0.15, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Top fin (dorsal)
        ctx.fillStyle = shadeColor(fish.color, -15);
        ctx.beginPath();
        ctx.ellipse(-fish.size * 0.2, -fish.size * 0.55, fish.size * 0.3, fish.size * 0.5, -0.3 + tailWave * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Fin lines
        ctx.strokeStyle = shadeColor(fish.color, -30);
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(-fish.size * 0.2, -fish.size * 0.35);
            ctx.lineTo(-fish.size * 0.2 + i * fish.size * 0.08, -fish.size * 0.8);
            ctx.stroke();
        }

        // Side fin (pectoral)
        ctx.fillStyle = `rgba(${parseInt(fish.color.slice(1, 3), 16)}, ${parseInt(fish.color.slice(3, 5), 16)}, ${parseInt(fish.color.slice(5, 7), 16)}, 0.6)`;
        ctx.beginPath();
        ctx.ellipse(fish.size * 0.2, fish.size * 0.15, fish.size * 0.3, fish.size * 0.4, 0.6 + tailWave * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Head detail
        ctx.strokeStyle = shadeColor(fish.color, -20);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(fish.size * 0.4, 0, fish.size * 0.2, Math.PI * 0.5, Math.PI * 1.5);
        ctx.stroke();

        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(fish.size * 0.55, -fish.size * 0.2, fish.size * 0.22, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = shadeColor(fish.color, -40);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(fish.size * 0.55, -fish.size * 0.2, fish.size * 0.22, 0, Math.PI * 2);
        ctx.stroke();

        // Pupil
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(fish.size * 0.55, -fish.size * 0.2, fish.size * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // Eye shine
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(fish.size * 0.6, -fish.size * 0.25, fish.size * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(fish.size * 0.52, -fish.size * 0.16, fish.size * 0.04, 0, Math.PI * 2);
        ctx.fill();

        // Mouth (smiling)
        ctx.strokeStyle = shadeColor(fish.color, -45);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(fish.size * 0.78, -fish.size * 0.05, fish.size * 0.15, 0.2, Math.PI * 0.4);
        ctx.stroke();

        // Gill
        ctx.strokeStyle = shadeColor(fish.color, -25);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fish.size * 0.25, fish.size * 0.1, fish.size * 0.15, Math.PI * 0.3, Math.PI * 0.8);
        ctx.stroke();

        ctx.restore();
    }
}
