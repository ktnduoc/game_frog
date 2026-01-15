// Background drawing (pond/swamp theme)
import { ctx } from '../utils/canvas.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config.js';
import { birds, drawBirds } from './birds.js';
import { drawClouds, drawSkyDarkness } from './clouds.js';
import { dayNightState, frogState, gameState } from '../state.js';
import { frog } from '../entities/frog.js';
import { hook } from '../entities/hook.js';

// Stars for night sky
const stars = [];
for (let i = 0; i < 50; i++) {
    stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT * 0.4 - CANVAS_HEIGHT * 0.3,
        size: Math.random() * 2 + 0.5,
        twinkleSpeed: Math.random() * 0.05 + 0.02,
        twinkleOffset: Math.random() * Math.PI * 2
    });
}

// Owl state for night time animation
const owlState = {
    blinkTimer: 0,
    isBlinking: false,
    headTilt: 0,
    eyeGlow: 0,
    side: Math.random() > 0.5 ? 'right' : 'left', // Random left or right
    lastNightBlend: 0 // Track when night starts to randomize position
};

// Cute ghosts floating above water at night
const ghosts = [];
for (let i = 0; i < 4; i++) {
    ghosts.push({
        x: 80 + Math.random() * (CANVAS_WIDTH - 160),
        y: CANVAS_HEIGHT - 80 + Math.random() * 40,
        size: 18 + Math.random() * 10,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: 0,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.02 + Math.random() * 0.015,
        wobbleOffset: Math.random() * Math.PI * 2,
        blinkTimer: Math.random() * 200,
        isBlinking: false,
        expression: Math.floor(Math.random() * 3) // 0: happy, 1: surprised, 2: sleepy
    });
}

// Fishing rod state - trap for frog
export const fishingRod = {
    x: -30, // Position from left edge (negative to be closer to edge)
    y: -100, // Extremely high - way above the well
    rodEndX: 380, // Rod extends longer to center-right
    rodEndY: 0, // Very high end position
    hookY: 200, // Y position of the bait/hook (much higher)
    hookSwing: 0, // Swinging animation offset
    swingSpeed: 0.015, // Slower swing
    swingAmount: 50, // Much wider swing range
    lineLength: 175, // Longer line
    isActive: false, // Show fishing rod only from level 15
    isCaught: false, // Frog caught by fishing rod
    pullUpSpeed: 2,
    minHookY: 175, // Stop pulling at this Y (keep frog below well mouth)
    baitSize: 8, // Smaller bait (reduced from 12 to 8)
    loweringSpeed: 0.3, // Speed of lowering bait
    isLowering: false, // Animation state
    targetHookY: 200, // Target Y position (updated to match hookY)
    // Bait position for collision detection
    getBaitX() {
        return this.rodEndX + Math.sin(this.hookSwing) * this.swingAmount;
    },
    getBaitY() {
        return this.hookY;
    }
};

// Bucket state for interaction
export const bucketState = {
    mode: 'idle', // 'idle', 'lowering', 'filling', 'raising'
    ropeLength: 100, // Current rope length
    targetRopeLength: 100,
    waterLevel: 0, // 0 to 1 (how full the bucket is)
    clickable: true,
    bounds: { x: 0, y: 0, width: 60, height: 70 }
};

// Draw background
export function drawBackground() {
    // Calculate day/night blend factor
    let nightBlend = 0;
    if (dayNightState.phase === 'night' && !dayNightState.isTransitioning) {
        nightBlend = 1;
    } else if (dayNightState.phase === 'day' && !dayNightState.isTransitioning) {
        nightBlend = 0;
    } else if (dayNightState.isTransitioning) {
        if (dayNightState.targetPhase === 'night') {
            nightBlend = dayNightState.transitionProgress;
        } else {
            nightBlend = 1 - dayNightState.transitionProgress;
        }
    }

    // Sky gradient - extend higher to cover camera offset
    const skyHeight = CANVAS_HEIGHT * 1.5;
    const skyGradient = ctx.createLinearGradient(0, -CANVAS_HEIGHT * 0.5, 0, CANVAS_HEIGHT * 0.6);

    // Day colors
    const dayTop = [74, 144, 226];      // #4a90e2
    const dayMid = [135, 206, 235];     // #87CEEB
    const dayBot = [152, 251, 152];     // #98FB98

    // Night colors
    const nightTop = [15, 23, 42];      // #0f172a
    const nightMid = [30, 41, 82];      // #1e2952
    const nightBot = [49, 46, 129];     // #312e81

    // Blend colors
    const blendColor = (day, night, t) => {
        const r = Math.round(day[0] + (night[0] - day[0]) * t);
        const g = Math.round(day[1] + (night[1] - day[1]) * t);
        const b = Math.round(day[2] + (night[2] - day[2]) * t);
        return `rgb(${r}, ${g}, ${b})`;
    };

    skyGradient.addColorStop(0, blendColor(dayTop, nightTop, nightBlend));
    skyGradient.addColorStop(0.3, blendColor(dayMid, nightMid, nightBlend));
    skyGradient.addColorStop(1, blendColor(dayBot, nightBot, nightBlend));
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, -CANVAS_HEIGHT * 0.5, CANVAS_WIDTH, skyHeight);

    // Draw stars at night
    if (nightBlend > 0) {
        const time = Date.now() * 0.001;
        ctx.save();
        for (const star of stars) {
            const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255, 255, 255, ${nightBlend * twinkle * 0.8})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // Rainbow (fade out at night)
    if (nightBlend < 1) {
        const rainbowAlpha = 0.15 * (1 - nightBlend);
        const rainbowColors = [
            `rgba(255, 0, 0, ${rainbowAlpha})`,
            `rgba(255, 127, 0, ${rainbowAlpha})`,
            `rgba(255, 255, 0, ${rainbowAlpha})`,
            `rgba(0, 255, 0, ${rainbowAlpha})`,
            `rgba(0, 0, 255, ${rainbowAlpha})`,
            `rgba(75, 0, 130, ${rainbowAlpha})`,
            `rgba(148, 0, 211, ${rainbowAlpha})`
        ];
        const rainbowCenterX = CANVAS_WIDTH / 2;
        const rainbowCenterY = CANVAS_HEIGHT - 50;
        const rainbowStartRadius = 250;
        const rainbowWidth = 18;

        for (let i = 0; i < rainbowColors.length; i++) {
            ctx.strokeStyle = rainbowColors[i];
            ctx.lineWidth = rainbowWidth;
            ctx.beginPath();
            ctx.arc(
                rainbowCenterX,
                rainbowCenterY,
                rainbowStartRadius + i * rainbowWidth,
                Math.PI,
                0
            );
            ctx.stroke();
        }
    }

    // Draw birds (only during day)
    if (nightBlend < 0.7) {
        drawBirds();
    }

    // Pond water - darker at night
    const waterGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT - 120, 0, CANVAS_HEIGHT);
    const waterTop = [59, 130, 246];    // #3b82f6
    const waterMid = [29, 78, 216];     // #1d4ed8
    const waterBot = [30, 58, 95];      // #1e3a5f
    const nightWaterTop = [20, 40, 80];
    const nightWaterMid = [15, 30, 60];
    const nightWaterBot = [10, 20, 40];

    waterGradient.addColorStop(0, blendColor(waterTop, nightWaterTop, nightBlend));
    waterGradient.addColorStop(0.5, blendColor(waterMid, nightWaterMid, nightBlend));
    waterGradient.addColorStop(1, blendColor(waterBot, nightWaterBot, nightBlend));
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, CANVAS_HEIGHT - 120, CANVAS_WIDTH, 120);

    // Water ripples
    const rippleAlpha = 0.2 - nightBlend * 0.1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${rippleAlpha})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        const rippleY = CANVAS_HEIGHT - 100 + i * 20;
        ctx.beginPath();
        ctx.moveTo(0, rippleY);
        for (let x = 0; x < CANVAS_WIDTH; x += 30) {
            ctx.quadraticCurveTo(x + 15, rippleY + Math.sin(Date.now() * 0.002 + x * 0.1) * 3, x + 30, rippleY);
        }
        ctx.stroke();
    }

    // Lily pads (decorative) - darker at night
    const lilyPadColor = blendColor([34, 197, 94], [20, 80, 50], nightBlend);
    ctx.fillStyle = lilyPadColor;
    const lilyPads = [[100, CANVAS_HEIGHT - 80], [250, CANVAS_HEIGHT - 60], [600, CANVAS_HEIGHT - 70], [700, CANVAS_HEIGHT - 90]];
    for (let [lx, ly] of lilyPads) {
        ctx.beginPath();
        ctx.ellipse(lx, ly, 25, 15, 0, 0.2, Math.PI * 2 - 0.2);
        ctx.fill();
        ctx.strokeStyle = blendColor([22, 163, 74], [15, 60, 40], nightBlend);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx, ly - 10);
        ctx.stroke();
    }

    // Draw seaweed
    drawSeaweed(50, CANVAS_HEIGHT - 120, 60, 0);
    drawSeaweed(120, CANVAS_HEIGHT - 120, 80, 0.5);
    drawSeaweed(CANVAS_WIDTH - 80, CANVAS_HEIGHT - 120, 70, 1);
    drawSeaweed(CANVAS_WIDTH - 150, CANVAS_HEIGHT - 120, 90, 1.5);
    drawSeaweed(CANVAS_WIDTH / 2 - 180, CANVAS_HEIGHT - 120, 65, 2);

    // Sun and Moon with transition animation
    drawSunMoon(nightBlend);

    // Draw moving clouds (after sun so they can cover it)
    drawClouds();

    // Draw sky darkness overlay when clouds block sun
    drawSkyDarkness();

    // Draw cute ghosts floating at night
    drawGhosts(nightBlend);

    // Flying zone indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = '12px Arial';
}

// Draw sun or moon based on day/night state with transition
function drawSunMoon(nightBlend) {
    const time = Date.now() * 0.001;
    const transitionX = 700; // Center X for celestial bodies
    const baseY = 60;

    // During transition, sun goes down and moon comes up (or vice versa)
    // Sun position: goes from baseY to below horizon (CANVAS_HEIGHT + 50)
    // Moon position: comes from above (-50) to baseY

    let sunY, moonY, sunOpacity, moonOpacity;

    if (nightBlend <= 0) {
        // Full day
        sunY = baseY;
        moonY = -100;
        sunOpacity = 1;
        moonOpacity = 0;
    } else if (nightBlend >= 1) {
        // Full night
        sunY = CANVAS_HEIGHT + 100;
        moonY = baseY;
        sunOpacity = 0;
        moonOpacity = 1;
    } else {
        // Transition
        // Sun sets: moves down and fades
        sunY = baseY + nightBlend * (CANVAS_HEIGHT - baseY + 100);
        sunOpacity = 1 - nightBlend;

        // Moon rises: moves down from above and appears
        moonY = -100 + nightBlend * (baseY + 100);
        moonOpacity = nightBlend;
    }

    // Draw Sun (if visible)
    if (sunOpacity > 0 && sunY < CANVAS_HEIGHT + 50) {
        ctx.save();
        ctx.globalAlpha = sunOpacity;

        // Sun glow
        const sunGlow = ctx.createRadialGradient(transitionX, sunY, 0, transitionX, sunY, 60);
        sunGlow.addColorStop(0, 'rgba(255, 200, 50, 0.6)');
        sunGlow.addColorStop(0.5, 'rgba(255, 180, 50, 0.2)');
        sunGlow.addColorStop(1, 'rgba(255, 150, 50, 0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(transitionX, sunY, 60, 0, Math.PI * 2);
        ctx.fill();

        // Sun rays
        ctx.strokeStyle = 'rgba(255, 200, 50, 0.3)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time * 0.2;
            const innerRadius = 35;
            const outerRadius = 50 + Math.sin(time * 2 + i) * 5;
            ctx.beginPath();
            ctx.moveTo(
                transitionX + Math.cos(angle) * innerRadius,
                sunY + Math.sin(angle) * innerRadius
            );
            ctx.lineTo(
                transitionX + Math.cos(angle) * outerRadius,
                sunY + Math.sin(angle) * outerRadius
            );
            ctx.stroke();
        }

        // Sun body
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(transitionX, sunY, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fcd34d';
        ctx.beginPath();
        ctx.arc(transitionX, sunY, 25, 0, Math.PI * 2);
        ctx.fill();

        // Sun highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(transitionX - 8, sunY - 8, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Draw Moon (if visible)
    if (moonOpacity > 0 && moonY > -50) {
        ctx.save();
        ctx.globalAlpha = moonOpacity;

        // Moon glow
        const moonGlow = ctx.createRadialGradient(transitionX, moonY, 0, transitionX, moonY, 50);
        moonGlow.addColorStop(0, 'rgba(200, 220, 255, 0.4)');
        moonGlow.addColorStop(0.5, 'rgba(180, 200, 240, 0.15)');
        moonGlow.addColorStop(1, 'rgba(150, 180, 220, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(transitionX, moonY, 50, 0, Math.PI * 2);
        ctx.fill();

        // Moon body
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(transitionX, moonY, 28, 0, Math.PI * 2);
        ctx.fill();

        // Moon highlight
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(transitionX - 5, moonY - 5, 22, 0, Math.PI * 2);
        ctx.fill();

        // Moon craters
        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.beginPath();
        ctx.arc(transitionX - 8, moonY + 5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(transitionX + 10, moonY - 8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(transitionX + 5, moonY + 12, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// Helper function to draw clouds
function drawCloud(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size * 1.5, y, size * 0.8, 0, Math.PI * 2);
    ctx.arc(x + size * 0.5, y + size * 0.3, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
}

// Helper function to draw seaweed
function drawSeaweed(x, baseY, height, timeOffset) {
    const time = Date.now() * 0.001 + timeOffset;
    const segments = 15;
    const segmentHeight = height / segments;
    const waveAmplitude = 8;
    
    ctx.save();
    
    // Draw seaweed stem
    ctx.strokeStyle = '#065f46';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    
    for (let i = 1; i <= segments; i++) {
        const progress = i / segments;
        const y = baseY - i * segmentHeight;
        const wave = Math.sin(time + progress * 3) * waveAmplitude * (1 - progress * 0.3);
        ctx.lineTo(x + wave, y);
    }
    ctx.stroke();
    
    // Draw leaves
    ctx.fillStyle = '#059669';
    for (let i = 2; i < segments; i += 2) {
        const progress = i / segments;
        const y = baseY - i * segmentHeight;
        const wave = Math.sin(time + progress * 3) * waveAmplitude * (1 - progress * 0.3);
        const leafX = x + wave;
        
        // Left leaf
        ctx.beginPath();
        ctx.ellipse(leafX - 8, y, 6, 12, -0.5 + Math.sin(time * 2) * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Right leaf
        ctx.beginPath();
        ctx.ellipse(leafX + 8, y - 5, 6, 12, 0.5 - Math.sin(time * 2) * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Highlight on stem
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 1, baseY);
    
    for (let i = 1; i <= segments; i++) {
        const progress = i / segments;
        const y = baseY - i * segmentHeight;
        const wave = Math.sin(time + progress * 3) * waveAmplitude * (1 - progress * 0.3);
        ctx.lineTo(x + wave - 1, y);
    }
    ctx.stroke();
    
    ctx.restore();
}

// Draw victory walls and finish line
export function drawVictoryWalls() {
    const wallWidth = 50;
    const finishLineY = 150;
    const wallStartY = finishLineY;
    const wallHeight = CANVAS_HEIGHT - finishLineY; // Walls from finish line to bottom

    // Left wall - stone texture
    ctx.save();
    
    // Base wall color
    const leftWallGradient = ctx.createLinearGradient(0, 0, wallWidth, 0);
    leftWallGradient.addColorStop(0, '#57534e');
    leftWallGradient.addColorStop(0.3, '#78716c');
    leftWallGradient.addColorStop(0.7, '#a8a29e');
    leftWallGradient.addColorStop(1, '#78716c');
    ctx.fillStyle = leftWallGradient;
    ctx.fillRect(0, wallStartY, wallWidth, wallHeight);

    // Left wall stones
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 2;
    const stoneHeight = 25;
    for (let y = wallStartY; y < CANVAS_HEIGHT; y += stoneHeight) {
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(wallWidth, y);
        ctx.stroke();
        
        // Vertical lines (offset every other row)
        const offset = (Math.floor((y - wallStartY) / stoneHeight) % 2) * (wallWidth / 2);
        ctx.beginPath();
        ctx.moveTo(wallWidth / 2 + offset, y);
        ctx.lineTo(wallWidth / 2 + offset, y + stoneHeight);
        ctx.stroke();
    }

    // Left wall edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(3, wallStartY);
    ctx.lineTo(3, CANVAS_HEIGHT);
    ctx.stroke();

    // Left wall inner shadow
    const leftShadowGradient = ctx.createLinearGradient(wallWidth - 10, 0, wallWidth, 0);
    leftShadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    leftShadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = leftShadowGradient;
    ctx.fillRect(wallWidth - 10, wallStartY, 10, wallHeight);

    // Right wall - stone texture
    const rightWallGradient = ctx.createLinearGradient(CANVAS_WIDTH - wallWidth, 0, CANVAS_WIDTH, 0);
    rightWallGradient.addColorStop(0, '#78716c');
    rightWallGradient.addColorStop(0.3, '#a8a29e');
    rightWallGradient.addColorStop(0.7, '#78716c');
    rightWallGradient.addColorStop(1, '#57534e');
    ctx.fillStyle = rightWallGradient;
    ctx.fillRect(CANVAS_WIDTH - wallWidth, wallStartY, wallWidth, wallHeight);

    // Right wall stones
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 2;
    for (let y = wallStartY; y < CANVAS_HEIGHT; y += stoneHeight) {
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH - wallWidth, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
        
        // Vertical lines (offset every other row)
        const offset = (Math.floor((y - wallStartY) / stoneHeight) % 2) * (wallWidth / 2);
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH - wallWidth / 2 - offset, y);
        ctx.lineTo(CANVAS_WIDTH - wallWidth / 2 - offset, y + stoneHeight);
        ctx.stroke();
    }

    // Right wall edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH - 3, wallStartY);
    ctx.lineTo(CANVAS_WIDTH - 3, CANVAS_HEIGHT);
    ctx.stroke();

    // Right wall inner shadow
    const rightShadowGradient = ctx.createLinearGradient(CANVAS_WIDTH - wallWidth, 0, CANVAS_WIDTH - wallWidth + 10, 0);
    rightShadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    rightShadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rightShadowGradient;
    ctx.fillRect(CANVAS_WIDTH - wallWidth, wallStartY, 10, wallHeight);

    ctx.restore();

    // Well opening / finish line - wooden slats with gaps for light
    ctx.save();

    const slotWidth = 18;
    const gapWidth = 35;
    const beamHeight = 14;
    const beamY = finishLineY - beamHeight / 2;
    const totalWidth = CANVAS_WIDTH - wallWidth * 2;

    // Draw light rays coming through gaps first (behind the beams)
    const time = Date.now() * 0.001;
    for (let x = wallWidth + slotWidth; x < CANVAS_WIDTH - wallWidth; x += slotWidth + gapWidth) {
        // Light beam through gap
        const lightGradient = ctx.createLinearGradient(x, beamY, x, beamY + 150);
        lightGradient.addColorStop(0, 'rgba(255, 250, 200, 0.4)');
        lightGradient.addColorStop(0.3, 'rgba(255, 245, 180, 0.2)');
        lightGradient.addColorStop(0.7, 'rgba(255, 240, 150, 0.08)');
        lightGradient.addColorStop(1, 'rgba(255, 235, 100, 0)');

        ctx.fillStyle = lightGradient;
        ctx.beginPath();
        // Light spreads wider as it goes down
        const spreadFactor = 1.5;
        ctx.moveTo(x, beamY + beamHeight);
        ctx.lineTo(x + gapWidth, beamY + beamHeight);
        ctx.lineTo(x + gapWidth + gapWidth * spreadFactor, beamY + 180);
        ctx.lineTo(x - gapWidth * spreadFactor, beamY + 180);
        ctx.closePath();
        ctx.fill();

        // Dust particles in light
        for (let i = 0; i < 4; i++) {
            const dustY = beamY + 30 + i * 35 + Math.sin(time * 2 + i + x) * 10;
            const dustX = x + gapWidth / 2 + Math.sin(time + i * 2) * 15;
            const dustSize = 1.5 + Math.sin(time * 3 + i) * 0.5;
            const dustAlpha = 0.3 + Math.sin(time * 2 + i) * 0.2;

            ctx.fillStyle = `rgba(255, 250, 220, ${dustAlpha})`;
            ctx.beginPath();
            ctx.arc(dustX, dustY, dustSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw wooden slats with gaps
    let currentX = wallWidth;
    while (currentX < CANVAS_WIDTH - wallWidth) {
        // Draw wooden slat
        const slotEnd = Math.min(currentX + slotWidth, CANVAS_WIDTH - wallWidth);
        const actualSlotWidth = slotEnd - currentX;

        if (actualSlotWidth > 5) {
            // Wood gradient
            const woodGradient = ctx.createLinearGradient(0, beamY, 0, beamY + beamHeight);
            woodGradient.addColorStop(0, '#c9a66b');
            woodGradient.addColorStop(0.2, '#b8956a');
            woodGradient.addColorStop(0.5, '#a67c52');
            woodGradient.addColorStop(0.8, '#8b6914');
            woodGradient.addColorStop(1, '#6b4c12');

            ctx.fillStyle = woodGradient;
            ctx.fillRect(currentX, beamY, actualSlotWidth, beamHeight);

            // Wood grain
            ctx.strokeStyle = 'rgba(80, 50, 20, 0.3)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const grainY = beamY + 3 + i * 4;
                ctx.beginPath();
                ctx.moveTo(currentX, grainY);
                ctx.lineTo(currentX + actualSlotWidth, grainY + (Math.random() - 0.5) * 2);
                ctx.stroke();
            }

            // Top highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(currentX, beamY, actualSlotWidth, 2);

            // Bottom shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(currentX, beamY + beamHeight - 2, actualSlotWidth, 2);

            // Side shadows for 3D effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(currentX, beamY, 2, beamHeight);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(currentX + actualSlotWidth - 2, beamY, 2, beamHeight);
        }

        currentX += slotWidth + gapWidth;
    }

    // Golden glow on the edges of gaps
    currentX = wallWidth + slotWidth;
    while (currentX < CANVAS_WIDTH - wallWidth - slotWidth) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#fbbf24';
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
        ctx.lineWidth = 2;

        // Left edge of gap
        ctx.beginPath();
        ctx.moveTo(currentX, beamY);
        ctx.lineTo(currentX, beamY + beamHeight);
        ctx.stroke();

        // Right edge of gap
        ctx.beginPath();
        ctx.moveTo(currentX + gapWidth, beamY);
        ctx.lineTo(currentX + gapWidth, beamY + beamHeight);
        ctx.stroke();

        ctx.shadowBlur = 0;
        currentX += slotWidth + gapWidth;
    }

    // Connecting rope/wire between slats
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wallWidth, beamY + beamHeight / 2);
    for (let x = wallWidth; x < CANVAS_WIDTH - wallWidth; x += 10) {
        const sag = Math.sin((x - wallWidth) / totalWidth * Math.PI) * 4;
        ctx.lineTo(x, beamY + beamHeight / 2 + sag);
    }
    ctx.stroke();

    // Rope highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wallWidth, beamY + beamHeight / 2 - 1);
    for (let x = wallWidth; x < CANVAS_WIDTH - wallWidth; x += 10) {
        const sag = Math.sin((x - wallWidth) / totalWidth * Math.PI) * 4;
        ctx.lineTo(x, beamY + beamHeight / 2 + sag - 1);
    }
    ctx.stroke();

    // Coiled rope on the well opening (at rope attachment point)
    const coilX = wallWidth + totalWidth * 0.75; // Same X as bucket rope
    const coilY = beamY + 8;
    const coilRadius = 25; // Larger coil
    
    ctx.save();
    ctx.translate(coilX, coilY);
    
    // Shadow under coil
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 3, coilRadius + 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Rope coils (spiral) - 6 coils for larger size
    for (let i = 0; i < 6; i++) {
        const r = coilRadius - i * 4;
        const offset = i * 0.5;
        
        // Main coil
        ctx.strokeStyle = i === 0 ? '#8b7355' : '#78716c';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, offset, r, 0, Math.PI * 2);
        ctx.stroke();
        
        // Rope texture
        ctx.strokeStyle = '#a8a29e';
        ctx.lineWidth = 3;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.arc(0, offset, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Highlight
        if (i < 3) {
            ctx.strokeStyle = 'rgba(200, 180, 160, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(-r * 0.3, offset - r * 0.2, r * 0.6, Math.PI * 0.2, Math.PI * 0.8);
            ctx.stroke();
        }
    }
    
    // Loose end of rope coming out
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(coilRadius * 0.7, -3);
    ctx.quadraticCurveTo(coilRadius + 8, -8, coilRadius + 12, 3);
    ctx.stroke();
    
    // Rope end texture
    ctx.strokeStyle = '#a8a29e';
    ctx.lineWidth = 3;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(coilRadius * 0.7, -3);
    ctx.quadraticCurveTo(coilRadius + 8, -8, coilRadius + 12, 3);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Frayed rope end
    for (let i = 0; i < 7; i++) {
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        const angle = (Math.random() - 0.5) * 0.6;
        const length = 4 + Math.random() * 4;
        ctx.moveTo(coilRadius + 12, 3);
        ctx.lineTo(coilRadius + 12 + length * Math.cos(angle), 3 + length * Math.sin(angle));
        ctx.stroke();
    }
    
    ctx.restore();

    // Wooden water bucket hanging in the well with pendulum swaying animation
    const bucketTime = Date.now() * 0.001;
    
    // Update bucket state (animation)
    if (bucketState.mode === 'lowering') {
        bucketState.ropeLength += 3; // Lower speed
        if (bucketState.ropeLength >= bucketState.targetRopeLength) {
            bucketState.ropeLength = bucketState.targetRopeLength;
            bucketState.mode = 'filling';
            setTimeout(() => {
                bucketState.waterLevel = 1;
                bucketState.mode = 'raising';
            }, 500); // Fill delay
        }
    } else if (bucketState.mode === 'raising') {
        bucketState.ropeLength -= 2; // Raise speed (slower, bucket is heavy with water)
        if (bucketState.ropeLength <= 100) {
            bucketState.ropeLength = 100;
            bucketState.mode = 'idle';
            bucketState.clickable = true;
            // Empty water after a moment
            setTimeout(() => {
                bucketState.waterLevel = 0;
            }, 1000);
        }
    }
    
    // Pendulum motion parameters (only sway when idle or slightly when moving)
    const ropeLength = bucketState.ropeLength;
    const swayAmount = bucketState.mode === 'idle' ? 0.15 : 0.05; // Less sway when moving
    const pendulumAngle = Math.sin(bucketTime * 0.6) * swayAmount; // Swaying angle (radians)
    
    // Fixed attachment point on beam
    const ropeStartX = wallWidth + totalWidth * 0.75;
    const ropeStartY = beamY + beamHeight;
    
    // Calculate bucket position based on pendulum angle
    const bucketX = ropeStartX + Math.sin(pendulumAngle) * ropeLength;
    const bucketY = ropeStartY + Math.cos(pendulumAngle) * ropeLength;
    
    const bucketWidth = 60;
    const bucketHeight = 70;
    const bucketTopWidth = 65;
    
    // Update bucket bounds for click detection
    bucketState.bounds.x = bucketX - bucketWidth / 2;
    bucketState.bounds.y = bucketY - 35;
    bucketState.bounds.width = bucketWidth;
    bucketState.bounds.height = bucketHeight;
    
    // Draw straight taut rope from beam to bucket apex
    const ropeEndY = bucketY - 35; // Connect to bucket apex
    
    ctx.save();
    
    // Main rope - straight line (taut)
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ropeStartX, ropeStartY);
    ctx.lineTo(bucketX, ropeEndY);
    ctx.stroke();
    
    // Rope texture (twisted rope effect)
    ctx.strokeStyle = '#a8a29e';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(ropeStartX, ropeStartY);
    ctx.lineTo(bucketX, ropeEndY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Rope shadow (straight)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(ropeStartX + 2, ropeStartY);
    ctx.lineTo(bucketX + 2, ropeEndY);
    ctx.stroke();
    
    // Rope attachment point at beam
    ctx.fillStyle = '#6b5c4e';
    ctx.beginPath();
    ctx.arc(ropeStartX, ropeStartY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a3c2e';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
    
    // Calculate water surface level in well (approximately)
    const waterSurfaceY = ropeStartY + 240; // Water surface is about 240 pixels below beam
    
    // Draw bucket with slight rotation from swaying
    ctx.save();
    ctx.translate(bucketX, bucketY);
    
    // Check if bucket is submerged in water
    const bucketTopY = bucketY - 35; // Top of bucket (handle apex)
    const bucketBottomY = bucketY + 35; // Bottom of bucket
    const isSubmerged = bucketBottomY > waterSurfaceY;
    const submersionDepth = isSubmerged ? Math.min(bucketBottomY - waterSurfaceY, bucketHeight) : 0;
    
    // Add tilt and opacity when submerged
    let tiltAngle = pendulumAngle * 0.5; // Normal slight rotation
    let bucketOpacity = 1.0;
    
    if (isSubmerged) {
        // More tilt when in water (water resistance effect)
        tiltAngle += Math.sin(bucketTime * 0.8) * 0.3 + 0.15;
        // Fade based on submersion depth
        bucketOpacity = Math.max(0.3, 1.0 - (submersionDepth / bucketHeight) * 0.6);
    }
    
    ctx.rotate(tiltAngle);
    ctx.globalAlpha = bucketOpacity;
    
    // Bucket body (wooden barrel shape)
    const bodyGradient = ctx.createLinearGradient(0, 0, 0, bucketHeight);
    bodyGradient.addColorStop(0, '#b8956a'); // light brown
    bodyGradient.addColorStop(0.3, '#a67c52'); // medium brown
    bodyGradient.addColorStop(0.7, '#8b6914'); // dark brown
    bodyGradient.addColorStop(1, '#6b4c12'); // darker brown
    
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(-bucketWidth / 2, bucketHeight);
    ctx.lineTo(-bucketTopWidth / 2, 0);
    ctx.lineTo(bucketTopWidth / 2, 0);
    ctx.lineTo(bucketWidth / 2, bucketHeight);
    ctx.closePath();
    ctx.fill();
    
    // Wooden planks (vertical lines)
    ctx.strokeStyle = 'rgba(80, 50, 20, 0.4)';
    ctx.lineWidth = 1.5;
    const numPlanks = 8;
    for (let i = 0; i < numPlanks; i++) {
        const x = -bucketTopWidth / 2 + (bucketTopWidth / numPlanks) * i;
        const bottomX = -bucketWidth / 2 + (bucketWidth / numPlanks) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(bottomX, bucketHeight);
        ctx.stroke();
    }
    
    // Metal bands around bucket (4 bands for taller bucket)
    const bandPositions = [5, bucketHeight * 0.33, bucketHeight * 0.66, bucketHeight - 8];
    bandPositions.forEach(y => {
        // Band shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        const topWidth = bucketTopWidth - ((bucketTopWidth - bucketWidth) * (y / bucketHeight));
        ctx.fillRect(-topWidth / 2, y, topWidth, 5);
        
        // Band metal
        const metalGradient = ctx.createLinearGradient(0, y, 0, y + 4);
        metalGradient.addColorStop(0, '#9ca3af');
        metalGradient.addColorStop(0.5, '#6b7280');
        metalGradient.addColorStop(1, '#4b5563');
        ctx.fillStyle = metalGradient;
        ctx.fillRect(-topWidth / 2, y, topWidth, 4);
        
        // Band highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(-topWidth / 2, y, topWidth, 1);
    });
    
    // Wood grain texture
    ctx.strokeStyle = 'rgba(139, 105, 20, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
        const y = 10 + i * 7;
        ctx.beginPath();
        ctx.moveTo(-bucketTopWidth / 2 + 5, y);
        ctx.quadraticCurveTo(0, y + (Math.random() * 0.1 - 0.05) * 3, bucketTopWidth / 2 - 5, y);
        ctx.stroke();
    }
    
    // Highlight on wooden bucket
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.ellipse(-12, bucketHeight / 3, 8, 25, -0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Water inside bucket (if any)
    if (bucketState.waterLevel > 0) {
        const waterHeight = bucketHeight * 0.6 * bucketState.waterLevel;
        const waterY = bucketHeight - waterHeight + 2;
        const waterTopWidth = bucketTopWidth - ((bucketTopWidth - bucketWidth) * (waterY / bucketHeight));
        const waterBottomWidth = bucketWidth - 4;
        
        // Water surface (ellipse)
        ctx.fillStyle = 'rgba(100, 200, 255, 0.7)';
        ctx.beginPath();
        ctx.ellipse(0, waterY, waterTopWidth / 2 - 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Water body
        const waterGradient = ctx.createLinearGradient(0, waterY, 0, bucketHeight);
        waterGradient.addColorStop(0, 'rgba(100, 200, 255, 0.6)');
        waterGradient.addColorStop(1, 'rgba(70, 150, 220, 0.8)');
        ctx.fillStyle = waterGradient;
        ctx.beginPath();
        ctx.moveTo(-waterBottomWidth / 2, bucketHeight);
        ctx.lineTo(-waterTopWidth / 2 + 4, waterY);
        ctx.lineTo(waterTopWidth / 2 - 4, waterY);
        ctx.lineTo(waterBottomWidth / 2, bucketHeight);
        ctx.closePath();
        ctx.fill();
        
        // Water shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(-8, waterY + waterHeight * 0.3, 6, 12, -0.2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Dark interior opening (on top of water if any)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 2, bucketTopWidth / 2 - 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Wooden bucket handle attached to rope
    const handleY = -30; // Handle position (where rope connects)
    
    // Wooden bucket handle - triangle shape with apex at top
    const apexY = -35; // Top point where main rope connects
    const leftAttachX = -bucketTopWidth / 2 - 3;
    const rightAttachX = bucketTopWidth / 2 + 3;
    
    // Handle attachment points on bucket rim (metal rings)
    [leftAttachX, rightAttachX].forEach(x => {
        ctx.fillStyle = '#6b5c4e';
        ctx.beginPath();
        ctx.arc(x, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4a3c2e';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
    
    // Left rope from apex down to left bucket attachment
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, apexY);
    ctx.lineTo(leftAttachX, 0);
    ctx.stroke();
    
    // Right rope from apex down to right bucket attachment
    ctx.beginPath();
    ctx.moveTo(0, apexY);
    ctx.lineTo(rightAttachX, 0);
    ctx.stroke();
    
    // Rope texture on left side
    ctx.strokeStyle = '#a8a29e';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(0, apexY);
    ctx.lineTo(leftAttachX, 0);
    ctx.stroke();
    
    // Rope texture on right side
    ctx.beginPath();
    ctx.moveTo(0, apexY);
    ctx.lineTo(rightAttachX, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Apex connection point (wooden triangle piece at top)
    ctx.fillStyle = '#a67c52';
    ctx.strokeStyle = '#6b4c12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, apexY - 8); // Top point
    ctx.lineTo(-6, apexY); // Left bottom
    ctx.lineTo(6, apexY); // Right bottom
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Metal ring at apex where main rope attaches
    ctx.fillStyle = '#6b5c4e';
    ctx.beginPath();
    ctx.arc(0, apexY - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a3c2e';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Short vertical rope from apex to main rope
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, apexY - 8);
    ctx.lineTo(0, apexY - 2);
    ctx.stroke();
    
    ctx.restore();
    
    // Draw water surface effect over submerged part of bucket
    if (isSubmerged && submersionDepth > 0) {
        ctx.save();
        ctx.translate(bucketX, bucketY);
        ctx.rotate(tiltAngle);
        
        // Calculate water line position relative to bucket
        const waterLineY = waterSurfaceY - bucketY;
        
        // Water surface shimmer effect
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const waveOffset = Math.sin(bucketTime * 2) * 3;
        ctx.moveTo(-bucketTopWidth / 2, waterLineY + waveOffset);
        for (let x = -bucketTopWidth / 2; x <= bucketTopWidth / 2; x += 5) {
            const wave = Math.sin(bucketTime * 2 + x * 0.2) * 2;
            ctx.lineTo(x, waterLineY + wave);
        }
        ctx.stroke();
        
        // Water ripples around bucket
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, waterLineY, 35 + i * 8, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    // Center wooden slat to hold flag pole
    const centerSlotX = CANVAS_WIDTH / 2 - 12;
    const centerSlotWidth = 24;

    // Wood gradient for center slat
    const centerWoodGradient = ctx.createLinearGradient(0, beamY, 0, beamY + beamHeight);
    centerWoodGradient.addColorStop(0, '#c9a66b');
    centerWoodGradient.addColorStop(0.2, '#b8956a');
    centerWoodGradient.addColorStop(0.5, '#a67c52');
    centerWoodGradient.addColorStop(0.8, '#8b6914');
    centerWoodGradient.addColorStop(1, '#6b4c12');

    ctx.fillStyle = centerWoodGradient;
    ctx.fillRect(centerSlotX, beamY, centerSlotWidth, beamHeight);

    // Wood grain for center slat
    ctx.strokeStyle = 'rgba(80, 50, 20, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        const grainY = beamY + 3 + i * 4;
        ctx.beginPath();
        ctx.moveTo(centerSlotX, grainY);
        ctx.lineTo(centerSlotX + centerSlotWidth, grainY);
        ctx.stroke();
    }

    // Top highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(centerSlotX, beamY, centerSlotWidth, 2);

    // Bottom shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(centerSlotX, beamY + beamHeight - 2, centerSlotWidth, 2);

    // Side shadows for 3D effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(centerSlotX, beamY, 2, beamHeight);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(centerSlotX + centerSlotWidth - 2, beamY, 2, beamHeight);

    // Metal ring/holder for flag pole
    ctx.fillStyle = '#4a5568';
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH / 2, beamY + beamHeight / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#718096';
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH / 2, beamY + beamHeight / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Vietnamese flag in the center
    const flagPoleX = CANVAS_WIDTH / 2;
    const flagPoleHeight = 80;
    const flagWidth = 50;
    const flagHeight = 33;
    const flagY = beamY - flagPoleHeight;

    // Flag pole
    const poleGradient = ctx.createLinearGradient(flagPoleX - 3, 0, flagPoleX + 3, 0);
    poleGradient.addColorStop(0, '#8b7355');
    poleGradient.addColorStop(0.3, '#d4a574');
    poleGradient.addColorStop(0.7, '#c9a66b');
    poleGradient.addColorStop(1, '#6b4c12');
    ctx.fillStyle = poleGradient;
    ctx.fillRect(flagPoleX - 3, flagY, 6, flagPoleHeight);

    // Pole top ornament (golden ball)
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(flagPoleX, flagY - 5, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(flagPoleX - 2, flagY - 7, 3, 0, Math.PI * 2);
    ctx.fill();

    // Waving flag animation
    const waveTime = time * 3;
    const waveSegments = 12;
    const segmentWidth = flagWidth / waveSegments;

    // Draw flag with wave effect
    ctx.save();
    ctx.translate(flagPoleX + 3, flagY + 5);

    // Flag red background with wave
    for (let i = 0; i < waveSegments; i++) {
        const x = i * segmentWidth;
        const waveOffset1 = Math.sin(waveTime + i * 0.5) * 3;
        const waveOffset2 = Math.sin(waveTime + (i + 1) * 0.5) * 3;
        const stretch = 1 + Math.sin(waveTime + i * 0.3) * 0.05;

        ctx.fillStyle = '#da251d';
        ctx.beginPath();
        ctx.moveTo(x, waveOffset1);
        ctx.lineTo(x + segmentWidth * stretch, waveOffset2);
        ctx.lineTo(x + segmentWidth * stretch, flagHeight + waveOffset2);
        ctx.lineTo(x, flagHeight + waveOffset1);
        ctx.closePath();
        ctx.fill();
    }

    // Yellow star in center
    const starCenterX = flagWidth / 2;
    const starCenterY = flagHeight / 2;
    const starWaveOffset = Math.sin(waveTime + 3) * 2;
    const starSize = 10;

    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
        const x = starCenterX + Math.cos(angle) * starSize;
        const y = starCenterY + starWaveOffset + Math.sin(angle) * starSize;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    ctx.fill();

    // Flag shadow/depth effect
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < waveSegments; i++) {
        const x = i * segmentWidth;
        const waveOffset = Math.sin(waveTime + i * 0.5) * 3;
        ctx.beginPath();
        ctx.moveTo(x, flagHeight + waveOffset);
        ctx.lineTo(x + segmentWidth, flagHeight + Math.sin(waveTime + (i + 1) * 0.5) * 3);
        ctx.stroke();
    }

    // Flag edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, Math.sin(waveTime) * 3);
    for (let i = 0; i <= waveSegments; i++) {
        const x = i * segmentWidth;
        const waveOffset = Math.sin(waveTime + i * 0.5) * 3;
        ctx.lineTo(x, waveOffset);
    }
    ctx.stroke();

    ctx.restore();

    // Flag pole shadow on beam
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(flagPoleX + 5, beamY + 2, 8, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Calculate nightBlend for owl
    let nightBlend = 0;
    if (dayNightState.phase === 'night' && !dayNightState.isTransitioning) {
        nightBlend = 1;
    } else if (dayNightState.phase === 'day' && !dayNightState.isTransitioning) {
        nightBlend = 0;
    } else if (dayNightState.isTransitioning) {
        if (dayNightState.targetPhase === 'night') {
            nightBlend = dayNightState.transitionProgress;
        } else {
            nightBlend = 1 - dayNightState.transitionProgress;
        }
    }

    // Draw owl on well edge at night
    drawOwl(nightBlend);

    return finishLineY;
}

// Get finish line Y position
export function getFinishLineY() {
    return 150;
}

// Draw cute owl on well edge at night
function drawOwl(nightBlend) {
    if (nightBlend <= 0) return;

    // Randomize owl position when night starts (transition from day to night)
    if (nightBlend > 0.1 && owlState.lastNightBlend <= 0.1) {
        owlState.side = Math.random() > 0.5 ? 'right' : 'left';
    }
    owlState.lastNightBlend = nightBlend;

    const time = Date.now() * 0.001;
    const wallWidth = 50;
    const owlX = owlState.side === 'left' ? 25 : CANVAS_WIDTH - 25; // On left or right wall
    const owlY = 130; // Just above finish line

    // Update owl animation state
    owlState.blinkTimer++;
    if (owlState.blinkTimer > 180 + Math.random() * 120) {
        owlState.isBlinking = true;
        owlState.blinkTimer = 0;
    }
    if (owlState.isBlinking && owlState.blinkTimer > 8) {
        owlState.isBlinking = false;
    }

    // Head tilt animation - cute bobbing
    owlState.headTilt = Math.sin(time * 0.8) * 0.15;

    // Eye glow animation
    owlState.eyeGlow = 0.6 + Math.sin(time * 2) * 0.3;

    ctx.save();
    ctx.globalAlpha = nightBlend; // Fade in with night
    ctx.translate(owlX, owlY);

    // Body - round and fluffy (soft brown)
    const bodyGradient = ctx.createRadialGradient(0, 10, 0, 0, 10, 20);
    bodyGradient.addColorStop(0, '#c4a882');
    bodyGradient.addColorStop(0.6, '#a08060');
    bodyGradient.addColorStop(1, '#7a6048');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 10, 18, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fluffy belly - cream colored
    ctx.fillStyle = '#f5e6d3';
    ctx.beginPath();
    ctx.ellipse(0, 14, 12, 14, 0, 0, Math.PI);
    ctx.fill();

    // Belly feather pattern (cute scallops)
    ctx.strokeStyle = '#e8d4be';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(0, 6 + i * 5, 9 - i, 0.4, Math.PI - 0.4);
        ctx.stroke();
    }

    // Small cute wings
    ctx.fillStyle = '#9a7a5a';
    // Left wing
    ctx.beginPath();
    ctx.ellipse(-15, 8, 5, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.ellipse(15, 8, 5, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Head with tilt animation
    ctx.save();
    ctx.rotate(owlState.headTilt);

    // Big round head (cuter proportions)
    const headGradient = ctx.createRadialGradient(0, -10, 0, 0, -10, 18);
    headGradient.addColorStop(0, '#d4b896');
    headGradient.addColorStop(0.7, '#a08060');
    headGradient.addColorStop(1, '#7a6048');
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(0, -10, 16, 0, Math.PI * 2);
    ctx.fill();

    // Small cute ear tufts
    ctx.fillStyle = '#7a6048';
    // Left ear
    ctx.beginPath();
    ctx.moveTo(-10, -22);
    ctx.lineTo(-13, -30);
    ctx.lineTo(-7, -24);
    ctx.closePath();
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.moveTo(10, -22);
    ctx.lineTo(13, -30);
    ctx.lineTo(7, -24);
    ctx.closePath();
    ctx.fill();

    // Ear fluff
    ctx.fillStyle = '#d4b896';
    ctx.beginPath();
    ctx.moveTo(-9, -22);
    ctx.lineTo(-11, -27);
    ctx.lineTo(-7, -23);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9, -22);
    ctx.lineTo(11, -27);
    ctx.lineTo(7, -23);
    ctx.closePath();
    ctx.fill();

    // Facial disc - heart shaped cream area
    ctx.fillStyle = '#f5e6d3';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-16, -4, -14, -16);
    ctx.quadraticCurveTo(-10, -22, 0, -20);
    ctx.quadraticCurveTo(10, -22, 14, -16);
    ctx.quadraticCurveTo(16, -4, 0, 0);
    ctx.fill();

    // Big cute eyes
    const eyeSize = owlState.isBlinking ? 2 : 8;
    const eyeY = -12;
    const eyeSpacing = 8;

    // Eye glow effect
    if (!owlState.isBlinking) {
        ctx.save();
        ctx.globalAlpha = nightBlend * owlState.eyeGlow * 0.4;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#fcd34d';
        ctx.fillStyle = '#fcd34d';
        ctx.beginPath();
        ctx.arc(-eyeSpacing, eyeY, 10, 0, Math.PI * 2);
        ctx.arc(eyeSpacing, eyeY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Eye whites/base
    ctx.fillStyle = '#1a1612';
    ctx.beginPath();
    ctx.arc(-eyeSpacing, eyeY, eyeSize + 1, 0, Math.PI * 2);
    ctx.arc(eyeSpacing, eyeY, eyeSize + 1, 0, Math.PI * 2);
    ctx.fill();

    // Eye color - big golden eyes
    const eyeGradient = ctx.createRadialGradient(-eyeSpacing, eyeY, 0, -eyeSpacing, eyeY, eyeSize);
    eyeGradient.addColorStop(0, '#fef3c7');
    eyeGradient.addColorStop(0.3, '#fcd34d');
    eyeGradient.addColorStop(0.7, '#f59e0b');
    eyeGradient.addColorStop(1, '#d97706');
    ctx.fillStyle = eyeGradient;
    ctx.beginPath();
    ctx.arc(-eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    const eyeGradient2 = ctx.createRadialGradient(eyeSpacing, eyeY, 0, eyeSpacing, eyeY, eyeSize);
    eyeGradient2.addColorStop(0, '#fef3c7');
    eyeGradient2.addColorStop(0.3, '#fcd34d');
    eyeGradient2.addColorStop(0.7, '#f59e0b');
    eyeGradient2.addColorStop(1, '#d97706');
    ctx.fillStyle = eyeGradient2;
    ctx.beginPath();
    ctx.arc(eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // Big cute pupils
    if (!owlState.isBlinking) {
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath();
        ctx.arc(-eyeSpacing, eyeY, 3.5, 0, Math.PI * 2);
        ctx.arc(eyeSpacing, eyeY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Big sparkly eye shine (2 highlights per eye)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(-eyeSpacing - 2, eyeY - 2, 2, 0, Math.PI * 2);
        ctx.arc(eyeSpacing - 2, eyeY - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(-eyeSpacing + 2, eyeY + 2, 1, 0, Math.PI * 2);
        ctx.arc(eyeSpacing + 2, eyeY + 2, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Rosy cheeks
    ctx.fillStyle = 'rgba(255, 150, 150, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-12, -6, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(12, -6, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Small cute beak
    ctx.fillStyle = '#f4a460';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(-3, -1);
    ctx.lineTo(0, 2);
    ctx.lineTo(3, -1);
    ctx.closePath();
    ctx.fill();

    // Beak highlight
    ctx.fillStyle = '#ffc080';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(-1.5, -2);
    ctx.lineTo(0, 0);
    ctx.lineTo(1.5, -2);
    ctx.closePath();
    ctx.fill();

    ctx.restore(); // End head rotation

    // Cute small feet
    ctx.fillStyle = '#f4a460';
    // Left foot
    ctx.beginPath();
    ctx.ellipse(-6, 28, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Right foot
    ctx.beginPath();
    ctx.ellipse(6, 28, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tiny toes
    ctx.strokeStyle = '#e08030';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    // Left toes
    ctx.beginPath();
    ctx.moveTo(-8, 29);
    ctx.lineTo(-10, 31);
    ctx.moveTo(-6, 29);
    ctx.lineTo(-6, 32);
    ctx.moveTo(-4, 29);
    ctx.lineTo(-2, 31);
    ctx.stroke();
    // Right toes
    ctx.beginPath();
    ctx.moveTo(8, 29);
    ctx.lineTo(10, 31);
    ctx.moveTo(6, 29);
    ctx.lineTo(6, 32);
    ctx.moveTo(4, 29);
    ctx.lineTo(2, 31);
    ctx.stroke();

    ctx.restore();
}

// Draw cute ghosts floating above water at night
function drawGhosts(nightBlend) {
    if (nightBlend <= 0.3) return;

    const time = Date.now() * 0.001;
    const ghostAlpha = Math.min(1, (nightBlend - 0.3) / 0.7); // Fade in after 30% night

    for (const ghost of ghosts) {
        // Update ghost position
        ghost.x += ghost.speedX;
        ghost.floatOffset += ghost.floatSpeed;
        ghost.wobbleOffset += 0.03;

        // Float up and down
        const floatY = Math.sin(ghost.floatOffset) * 12;
        const wobble = Math.sin(ghost.wobbleOffset) * 0.1;

        // Bounce off edges
        if (ghost.x < 60 || ghost.x > CANVAS_WIDTH - 60) {
            ghost.speedX *= -1;
        }

        // Blinking
        ghost.blinkTimer++;
        if (ghost.blinkTimer > 180 + Math.random() * 100) {
            ghost.isBlinking = true;
            ghost.blinkTimer = 0;
        }
        if (ghost.isBlinking && ghost.blinkTimer > 10) {
            ghost.isBlinking = false;
        }

        ctx.save();
        ctx.globalAlpha = ghostAlpha * 0.4;
        ctx.translate(ghost.x, ghost.y + floatY);
        ctx.rotate(wobble);

        const size = ghost.size;

        // Ghost glow
        ctx.save();
        ctx.globalAlpha = ghostAlpha * 0.15;
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(200, 220, 255, 0.8)';
        ctx.fillStyle = 'rgba(200, 220, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, size + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Ghost body - soft white/blue gradient
        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
        bodyGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        bodyGradient.addColorStop(0.5, 'rgba(230, 240, 255, 0.4)');
        bodyGradient.addColorStop(1, 'rgba(200, 220, 250, 0.3)');
        ctx.fillStyle = bodyGradient;

        // Main body shape (rounded top, wavy bottom)
        ctx.beginPath();
        ctx.arc(0, -size * 0.2, size, Math.PI, 0);

        // Wavy bottom tail
        const waveTime = time * 3 + ghost.floatOffset;
        ctx.lineTo(size, size * 0.3);
        ctx.quadraticCurveTo(size * 0.7, size * 0.8 + Math.sin(waveTime) * 4, size * 0.5, size * 0.5);
        ctx.quadraticCurveTo(size * 0.3, size * 0.9 + Math.sin(waveTime + 1) * 4, 0, size * 0.6);
        ctx.quadraticCurveTo(-size * 0.3, size * 0.9 + Math.sin(waveTime + 2) * 4, -size * 0.5, size * 0.5);
        ctx.quadraticCurveTo(-size * 0.7, size * 0.8 + Math.sin(waveTime + 3) * 4, -size, size * 0.3);
        ctx.closePath();
        ctx.fill();

        // Rosy cheeks
        ctx.fillStyle = 'rgba(255, 180, 200, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-size * 0.5, size * 0.1, size * 0.2, size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(size * 0.5, size * 0.1, size * 0.2, size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes based on expression
        const eyeY = -size * 0.15;
        const eyeSpacing = size * 0.3;

        if (ghost.isBlinking) {
            // Closed eyes - happy line
            ctx.strokeStyle = '#4a5568';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(-eyeSpacing, eyeY, size * 0.12, 0.2, Math.PI - 0.2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(eyeSpacing, eyeY, size * 0.12, 0.2, Math.PI - 0.2);
            ctx.stroke();
        } else {
            if (ghost.expression === 0) {
                // Happy eyes - dots
                ctx.fillStyle = '#2d3748';
                ctx.beginPath();
                ctx.arc(-eyeSpacing, eyeY, size * 0.1, 0, Math.PI * 2);
                ctx.arc(eyeSpacing, eyeY, size * 0.1, 0, Math.PI * 2);
                ctx.fill();

                // Eye shine
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.arc(-eyeSpacing - 2, eyeY - 2, size * 0.04, 0, Math.PI * 2);
                ctx.arc(eyeSpacing - 2, eyeY - 2, size * 0.04, 0, Math.PI * 2);
                ctx.fill();
            } else if (ghost.expression === 1) {
                // Surprised eyes - big round
                ctx.fillStyle = '#2d3748';
                ctx.beginPath();
                ctx.arc(-eyeSpacing, eyeY, size * 0.14, 0, Math.PI * 2);
                ctx.arc(eyeSpacing, eyeY, size * 0.14, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.arc(-eyeSpacing - 2, eyeY - 3, size * 0.06, 0, Math.PI * 2);
                ctx.arc(eyeSpacing - 2, eyeY - 3, size * 0.06, 0, Math.PI * 2);
                ctx.fill();

                // Small "o" mouth
                ctx.fillStyle = '#4a5568';
                ctx.beginPath();
                ctx.ellipse(0, size * 0.2, size * 0.08, size * 0.1, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Sleepy eyes - half closed
                ctx.fillStyle = '#2d3748';
                ctx.beginPath();
                ctx.ellipse(-eyeSpacing, eyeY, size * 0.12, size * 0.06, 0, 0, Math.PI * 2);
                ctx.ellipse(eyeSpacing, eyeY, size * 0.12, size * 0.06, 0, 0, Math.PI * 2);
                ctx.fill();

                // ZZZ effect
                ctx.fillStyle = 'rgba(100, 150, 200, 0.6)';
                ctx.font = `${size * 0.3}px Arial`;
                ctx.fillText('z', size * 0.6, -size * 0.4);
                ctx.font = `${size * 0.25}px Arial`;
                ctx.fillText('z', size * 0.8, -size * 0.6);
            }
        }

        // Cute smile for happy ghost (when not blinking)
        if (!ghost.isBlinking && ghost.expression === 0) {
            ctx.strokeStyle = '#4a5568';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(0, size * 0.15, size * 0.15, 0.3, Math.PI - 0.3);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// Draw fishing rod with bait dangling from well edge
export function drawFishingRod() {
    // Only show fishing rod from level 15 onwards
    if (frogState.level < 15) {
        fishingRod.isActive = false;
        return;
    }
    
    fishingRod.isActive = true;
    
    if (!fishingRod.isActive) return;

    const time = Date.now() * 0.001;
    
    // Update swing animation
    fishingRod.hookSwing += fishingRod.swingSpeed;
    
    // Lowering animation
    if (fishingRod.isLowering && fishingRod.hookY < fishingRod.targetHookY) {
        fishingRod.hookY += fishingRod.loweringSpeed;
    }
    
    // If frog is caught, pull up (stop at minimum height to keep frog below well mouth)
    if (fishingRod.isCaught) {
        // Increment caught timer
        if (hook.hookedByFishingRod) {
            hook.caughtTimer++;
            
            // After 3 seconds (180 frames at 60fps), check for antidote rescue
            if (hook.caughtTimer >= 180) {
                if (frogState.antidoteCount >= 3) {
                    // Use 3 antidotes to escape
                    frogState.antidoteCount -= 3;
                    
                    // Update UI
                    const antidoteElement = document.getElementById('antidote-count');
                    if (antidoteElement) {
                        antidoteElement.textContent = frogState.antidoteCount;
                    }
                    
                    // Create massive escape effect with purple particles
                    if (!frog.antidoteParticles) frog.antidoteParticles = [];
                    for (let i = 0; i < 50; i++) {
                        const angle = (Math.PI * 2 * i) / 50;
                        const speed = 4 + Math.random() * 4;
                        frog.antidoteParticles.push({
                            x: frog.x,
                            y: frog.y,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed - 3,
                            life: 1.0,
                            size: 5 + Math.random() * 6,
                            hue: 270 + Math.random() * 30 // Purple
                        });
                    }
                    
                    // Flash effect
                    frogState.flashColor = '#a855f7';
                    frogState.flashTimer = frogState.flashDuration * 3; // Long flash
                    
                    // Play sound
                    import('../audio/audio.js').then(module => {
                        module.playHolyWaterSound();
                    });
                    
                    // Release the frog!
                    hook.hookedByFishingRod = false;
                    fishingRod.isCaught = false;
                    hook.caughtTimer = 0;
                    gameState.deathReason = '';
                    
                    // Reset fishing rod
                    fishingRod.hookY = 200;
                    fishingRod.isLowering = false;
                }
                // If not enough antidotes, frog stays caught (will eventually game over)
            }
        }
        
        if (fishingRod.hookY > fishingRod.minHookY) {
            fishingRod.hookY -= fishingRod.pullUpSpeed;
            fishingRod.lineLength = fishingRod.hookY - fishingRod.y;
        } else {
            fishingRod.hookY = fishingRod.minHookY; // Lock at minimum height
        }
    }
    
    // Calculate bait position with swing (or frog position if caught)
    let baitX = fishingRod.getBaitX();
    let baitY = fishingRod.getBaitY();
    
    // If frog is caught, use frog's actual position for line drawing
    if (fishingRod.isCaught) {
        baitX = frog.x;
        baitY = frog.y - 20; // Connect to frog's mouth area
    }
    
    ctx.save();
    
    // Bamboo fishing rod - curved like in image (màu xanh lá)
    const rodStartX = fishingRod.x;
    const rodStartY = fishingRod.y;
    const rodEndX = fishingRod.rodEndX;
    const rodEndY = fishingRod.rodEndY;
    
    // Draw curved bamboo rod with tapering (thick to thin)
    const segments = 50; // More segments for smooth tapering
    const maxWidth = 14; // Thick at base
    const minWidth = 4;  // Thin at tip
    
    // Calculate control points for bezier curve
    const controlX1 = rodStartX + (rodEndX - rodStartX) * 0.3;
    const controlY1 = rodStartY - 30;
    const controlX2 = rodStartX + (rodEndX - rodStartX) * 0.7;
    const controlY2 = rodStartY + 10;
    
    // Draw rod with gradually decreasing width
    for (let i = 0; i < segments; i++) {
        const t1 = i / segments;
        const t2 = (i + 1) / segments;
        
        // Calculate positions on bezier curve
        const mt1 = 1 - t1;
        const mt1_2 = mt1 * mt1;
        const mt1_3 = mt1_2 * mt1;
        const t1_2 = t1 * t1;
        const t1_3 = t1_2 * t1;
        
        const x1 = mt1_3 * rodStartX + 3 * mt1_2 * t1 * controlX1 + 3 * mt1 * t1_2 * controlX2 + t1_3 * rodEndX;
        const y1 = mt1_3 * rodStartY + 3 * mt1_2 * t1 * controlY1 + 3 * mt1 * t1_2 * controlY2 + t1_3 * rodEndY;
        
        const mt2 = 1 - t2;
        const mt2_2 = mt2 * mt2;
        const mt2_3 = mt2_2 * mt2;
        const t2_2 = t2 * t2;
        const t2_3 = t2_2 * t2;
        
        const x2 = mt2_3 * rodStartX + 3 * mt2_2 * t2 * controlX1 + 3 * mt2 * t2_2 * controlX2 + t2_3 * rodEndX;
        const y2 = mt2_3 * rodStartY + 3 * mt2_2 * t2 * controlY1 + 3 * mt2 * t2_2 * controlY2 + t2_3 * rodEndY;
        
        // Width decreases from base to tip
        const width = maxWidth - (maxWidth - minWidth) * t1;
        
        // Main rod color
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Darker inner line for depth
        if (i % 2 === 0) {
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = width * 0.6;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }
    
    // Bamboo segments/nodes (mấu tre) - more nodes for longer rod
    ctx.fillStyle = '#15803d';
    const nodePositions = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
    nodePositions.forEach(t => {
        // Calculate position on bezier curve
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;
        
        const nodeX = mt3 * rodStartX + 3 * mt2 * t * controlX1 + 3 * mt * t2 * controlX2 + t3 * rodEndX;
        const nodeY = mt3 * rodStartY + 3 * mt2 * t * controlY1 + 3 * mt * t2 * controlY2 + t3 * rodEndY;
        
        // Node size decreases with rod thickness
        const nodeWidth = maxWidth - (maxWidth - minWidth) * t;
        const nodeSize = nodeWidth * 0.5;
        
        // Draw node ring
        ctx.beginPath();
        ctx.arc(nodeX, nodeY, nodeSize + 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Node outline
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
    
    // Highlight on bamboo for shine effect
    ctx.strokeStyle = 'rgba(134, 239, 172, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rodStartX + 2, rodStartY);
    ctx.bezierCurveTo(controlX1, controlY1 - 2, controlX2, controlY2 - 2, rodEndX - 5, rodEndY);
    ctx.stroke();
    
    // Fishing line (thin nylon string) - from end of rod
    ctx.strokeStyle = 'rgba(220, 220, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(rodEndX, rodEndY);
    
    // Draw curved line (catenary curve effect)
    const lineSegments = 30;
    for (let i = 1; i <= lineSegments; i++) {
        const t = i / lineSegments;
        const lineX = rodEndX + (baitX - rodEndX) * t;
        const sag = Math.sin(t * Math.PI) * 15; // More pronounced sag
        const lineY = rodEndY + (baitY - rodEndY) * t + sag;
        ctx.lineTo(lineX, lineY);
    }
    ctx.stroke();
    
    // Line shimmer effect
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rodEndX, rodEndY);
    for (let i = 1; i <= lineSegments; i++) {
        const t = i / lineSegments;
        const lineX = rodEndX + (baitX - rodEndX) * t;
        const sag = Math.sin(t * Math.PI) * 15;
        const lineY = rodEndY + (baitY - rodEndY) * t + sag;
        if (i % 3 === 0) ctx.lineTo(lineX, lineY);
    }
    ctx.stroke();
    
    // Don't draw bait if frog has caught it
    if (!fishingRod.isCaught) {
    // Fake bait (looks like juicy insect)
    const baitSize = fishingRod.baitSize;
    const wobble = Math.sin(time * 3) * 0.1; // Slight rotation
    
    ctx.save();
    ctx.translate(baitX, baitY);
    ctx.rotate(wobble);
    
    // Bait glow (make it look tempting)
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
    
    // Fake wings (larger, more visible)
    const wingFlap = Math.sin(time * 8) * 0.2;
    ctx.fillStyle = 'rgba(200, 230, 255, 0.6)';
    ctx.strokeStyle = 'rgba(150, 180, 220, 0.8)';
    ctx.lineWidth = 1;
    
    // Left wing
    ctx.beginPath();
    ctx.ellipse(-baitSize * 0.9, -baitSize * 0.4, baitSize * 0.7, baitSize * 1.5, -0.4 - wingFlap, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Right wing
    ctx.beginPath();
    ctx.ellipse(baitSize * 0.9, -baitSize * 0.4, baitSize * 0.7, baitSize * 1.5, 0.4 + wingFlap, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Wing veins
    ctx.strokeStyle = 'rgba(100, 130, 180, 0.4)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-baitSize * 0.9, -baitSize * 0.4);
        ctx.lineTo(-baitSize * 1.3, -baitSize * 0.4 + i * baitSize * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(baitSize * 0.9, -baitSize * 0.4);
        ctx.lineTo(baitSize * 1.3, -baitSize * 0.4 + i * baitSize * 0.4);
        ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
    
    // Bait body (plump and juicy looking)
    const bodyGradient = ctx.createRadialGradient(-2, -2, 0, 0, 0, baitSize * 1.2);
    bodyGradient.addColorStop(0, '#fef3c7');
    bodyGradient.addColorStop(0.3, '#fbbf24');
    bodyGradient.addColorStop(0.7, '#f59e0b');
    bodyGradient.addColorStop(1, '#d97706');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, baitSize, baitSize * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body segments (like a grub)
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) {
        const segY = -baitSize * 0.8 + i * (baitSize * 1.6 / 4);
        ctx.beginPath();
        ctx.ellipse(0, segY, baitSize * 0.9, 2, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Bait shine (glossy, appetizing)
    ctx.fillStyle = 'rgba(255, 255, 230, 0.8)';
    ctx.beginPath();
    ctx.ellipse(-baitSize * 0.3, -baitSize * 0.5, baitSize * 0.4, baitSize * 0.6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Small highlight spots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(-baitSize * 0.4, -baitSize * 0.6, baitSize * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Fake legs
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const legPositions = [-0.5, 0, 0.5];
    legPositions.forEach((pos, i) => {
        const legY = pos * baitSize;
        const legAngle = Math.sin(time * 5 + i) * 0.3;
        // Left leg
        ctx.beginPath();
        ctx.moveTo(-baitSize * 0.7, legY);
        ctx.lineTo(-baitSize * 1.2, legY + baitSize * 0.3 + Math.sin(time * 6 + i) * 3);
        ctx.stroke();
        // Right leg
        ctx.beginPath();
        ctx.moveTo(baitSize * 0.7, legY);
        ctx.lineTo(baitSize * 1.2, legY + baitSize * 0.3 + Math.sin(time * 6 + i + 1) * 3);
        ctx.stroke();
    });
    
    // Fake antenna (more prominent)
    ctx.strokeStyle = '#b8956a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const antennaWave = Math.sin(time * 4) * 0.2;
    ctx.beginPath();
    ctx.moveTo(-baitSize * 0.3, -baitSize * 1.2);
    ctx.quadraticCurveTo(-baitSize * 0.5, -baitSize * 1.8, -baitSize * 0.4 - antennaWave * baitSize, -baitSize * 2.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(baitSize * 0.3, -baitSize * 1.2);
    ctx.quadraticCurveTo(baitSize * 0.5, -baitSize * 1.8, baitSize * 0.4 + antennaWave * baitSize, -baitSize * 2.2);
    ctx.stroke();
    
    // Antenna tips (bright)
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(-baitSize * 0.4 - antennaWave * baitSize, -baitSize * 2.2, 2.5, 0, Math.PI * 2);
    ctx.arc(baitSize * 0.4 + antennaWave * baitSize, -baitSize * 2.2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Hook (metal, partially visible)
    ctx.strokeStyle = '#71717a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, baitSize * 0.8);
    ctx.lineTo(0, baitSize * 1.4);
    ctx.arc(baitSize * 0.4, baitSize * 1.6, 4, Math.PI, 0, true);
    ctx.stroke();
    
    // Hook shine
    ctx.strokeStyle = '#d4d4d8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-1, baitSize * 0.9);
    ctx.lineTo(-1, baitSize * 1.3);
    ctx.stroke();
    
    ctx.restore();
    } // End of bait drawing (hidden when caught)
    
    ctx.restore();
}
