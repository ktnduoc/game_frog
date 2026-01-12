// Clouds system with sun blocking effect
import { ctx } from '../utils/canvas.js';
import { CANVAS_WIDTH } from '../config.js';
import { dayNightState } from '../state.js';

// Clouds array
export const clouds = [];

// Sun position (matching background.js)
const sunX = 700;
const sunY = 60;
const sunRadius = 30;

// Sky darkness level (0 = bright, 1 = dark)
export let skyDarkness = 0;

// Initialize clouds
export function initClouds() {
    const cloudCount = 3; // Giảm từ 4 xuống 3
    for (let i = 0; i < cloudCount; i++) {
        clouds.push({
            x: (i * CANVAS_WIDTH / cloudCount) + Math.random() * 100, // Phân bố đều hơn
            y: 30 + Math.random() * 80,
            size: 35 + Math.random() * 25,
            speed: 0.15 + Math.random() * 0.2, // Chậm hơn một chút
            opacity: 0.7 + Math.random() * 0.2, // Mờ hơn
            offsetY: Math.sin(i * 2) * 15,
            // Random shape parameters
            shape: {
                puffs: 3 + Math.floor(Math.random() * 3), // 3-5 puffs
                puffSizes: Array(6).fill(0).map(() => 0.5 + Math.random() * 0.5),
                puffOffsets: Array(6).fill(0).map(() => ({
                    x: -0.5 + Math.random() * 1.5,
                    y: -0.3 + Math.random() * 0.6
                }))
            }
        });
    }
}

// Update clouds
export function updateClouds() {
    let maxDarkness = 0;

    // Check if it's night (skip sun blocking calculation)
    const isNight = dayNightState.phase === 'night' && !dayNightState.isTransitioning;

    for (let cloud of clouds) {
        // Move cloud
        cloud.x += cloud.speed;
        cloud.y = cloud.offsetY + 50 + Math.sin(cloud.x * 0.01) * 8;

        // Wrap around screen
        if (cloud.x > CANVAS_WIDTH + cloud.size * 2) {
            cloud.x = -cloud.size * 2;
            cloud.y = 30 + Math.random() * 80;
            cloud.size = 35 + Math.random() * 25;
            cloud.speed = 0.15 + Math.random() * 0.2;
            // Regenerate random shape
            cloud.shape = {
                puffs: 3 + Math.floor(Math.random() * 3),
                puffSizes: Array(6).fill(0).map(() => 0.5 + Math.random() * 0.5),
                puffOffsets: Array(6).fill(0).map(() => ({
                    x: -0.5 + Math.random() * 1.5,
                    y: -0.3 + Math.random() * 0.6
                }))
            };
        }

        // Check if cloud is blocking sun (only during day)
        if (!isNight) {
            const distanceToSun = Math.sqrt(
                Math.pow(cloud.x - sunX, 2) +
                Math.pow(cloud.y - sunY, 2)
            );

            // Calculate sun coverage (0 = no coverage, 1 = full coverage)
            const coverageDistance = cloud.size * 1.8;
            if (distanceToSun < coverageDistance) {
                const coverage = Math.max(0, 1 - distanceToSun / coverageDistance);
                // Larger clouds create more darkness
                const cloudDarkness = coverage * (cloud.size / 60) * cloud.opacity;
                maxDarkness = Math.max(maxDarkness, cloudDarkness);
            }
        }
    }

    // Smooth transition for darkness (only applies during day)
    const targetDarkness = isNight ? 0 : Math.min(maxDarkness * 0.6, 0.5);
    skyDarkness += (targetDarkness - skyDarkness) * 0.1;
}

// Draw clouds
export function drawClouds() {
    // Calculate night blend for cloud colors
    let nightBlend = 0;
    if (dayNightState.phase === 'night' && !dayNightState.isTransitioning) {
        nightBlend = 1;
    } else if (dayNightState.phase === 'day' && !dayNightState.isTransitioning) {
        nightBlend = 0;
    } else if (dayNightState.isTransitioning) {
        nightBlend = dayNightState.targetPhase === 'night'
            ? dayNightState.transitionProgress
            : 1 - dayNightState.transitionProgress;
    }

    for (let cloud of clouds) {
        ctx.save();
        ctx.globalAlpha = cloud.opacity * (1 - nightBlend * 0.5); // Clouds fade at night

        // Cloud shadow when blocking sun
        const distanceToSun = Math.sqrt(
            Math.pow(cloud.x - sunX, 2) +
            Math.pow(cloud.y - sunY, 2)
        );
        const isNearSun = distanceToSun < cloud.size * 2;

        // Blend cloud colors for day/night
        if (nightBlend > 0) {
            // Night clouds are darker/purple tinted
            const r = Math.round(255 - nightBlend * 155);
            const g = Math.round(255 - nightBlend * 175);
            const b = Math.round(255 - nightBlend * 105);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
        } else if (isNearSun) {
            // Darker edge when near sun (day only)
            ctx.fillStyle = 'rgba(220, 220, 235, 0.9)';
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        }

        drawCloudShape(cloud.x, cloud.y, cloud.size, cloud.shape);

        ctx.restore();
    }
}

// Draw darkness overlay
export function drawSkyDarkness() {
    if (skyDarkness > 0.01) {
        ctx.save();
        ctx.fillStyle = `rgba(20, 40, 80, ${skyDarkness})`;
        ctx.fillRect(0, -1000, CANVAS_WIDTH, 2000);
        ctx.restore();
    }
}

// Helper function to draw cloud shape
function drawCloudShape(x, y, size, shape) {
    ctx.beginPath();
    
    // Main center puff
    ctx.arc(x, y, size, 0, Math.PI * 2);
    
    // Add random puffs based on shape parameters
    for (let i = 0; i < shape.puffs; i++) {
        const offset = shape.puffOffsets[i];
        const puffSize = shape.puffSizes[i];
        ctx.arc(
            x + offset.x * size * 1.5,
            y + offset.y * size,
            size * puffSize,
            0,
            Math.PI * 2
        );
    }
    
    ctx.fill();
}
