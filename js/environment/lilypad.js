// Lily pad (frog sits on)
import { ctx } from '../utils/canvas.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config.js';
import { frogState } from '../state.js';

// Lily pad for frog to sit on
export const frogLilyPad = {
    x: CANVAS_WIDTH / 2,
    baseY: CANVAS_HEIGHT - 90,
    y: CANVAS_HEIGHT - 90,
    width: 160,
    height: 55,
    waveOffset: 0,
    waveSpeed: 0.02,
    waveAmplitude: 12,
    // Damage from caterpillars eating
    damage: 0, // 0-10, each bite adds 1
    maxDamage: 10,
    biteMarks: [], // {angle, size, depth} for each bite
    // Flash effect when being eaten
    isFlashing: false,
    flashTimer: 0,
    flashDuration: 30, // Flash for 0.5 seconds (30 frames at 60fps)
    flashIntensity: 0,
    // Ladybug tilt effect
    bugTilt: 0, // -1 to 1, negative = left, positive = right
    bugWeight: 0 // 0 to 1, how much bug affects stem
};

// Draw frog's lily pad
export function drawFrogLilyPad() {
    ctx.save();

    // Heavy weight shake effect - only when actively shaking
    let shakeX = 0;
    let shakeY = 0;
    
    if (frogState.isShaking && frogState.shakeTimer < frogState.shakeDuration) {
        const shakeIntensity = Math.min((frogState.weight - 300) / 200, 1) * 8;
        const shakeProgress = frogState.shakeTimer / frogState.shakeDuration;
        const intensityMultiplier = 1 - (shakeProgress * 0.5);
        
        shakeX = Math.sin(frogState.shakeTimer * 0.5) * shakeIntensity * intensityMultiplier;
        shakeY = Math.cos(frogState.shakeTimer * 0.75) * shakeIntensity * 0.7 * intensityMultiplier;
    }

    // Draw stem first
    const stemStartX = frogLilyPad.x + shakeX;
    const stemStartY = frogLilyPad.y + 10 + shakeY;
    // Extend stem as frog rises - stem always goes down to water
    const stemEndY = CANVAS_HEIGHT + 20;
    
    // Bug tilt effect - cuống nghêng theo bọ rùa
    const bugTiltEffect = frogLilyPad.bugTilt * frogLilyPad.bugWeight * 45; // 45px max - nghiêng nhiều hơn

    // Stem shadow
    ctx.strokeStyle = 'rgba(0, 50, 0, 0.3)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(stemStartX + 3, stemStartY);
    ctx.quadraticCurveTo(
        stemStartX + 20 + Math.sin(frogLilyPad.waveOffset) * 10 + bugTiltEffect,
        (stemStartY + stemEndY) / 2,
        stemStartX + 5,
        stemEndY
    );
    ctx.stroke();

    // Main stem
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(stemStartX, stemStartY);
    ctx.quadraticCurveTo(
        stemStartX + 15 + Math.sin(frogLilyPad.waveOffset) * 8 + bugTiltEffect,
        (stemStartY + stemEndY) / 2,
        stemStartX,
        stemEndY
    );
    ctx.stroke();

    // Stem highlight
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(stemStartX - 2, stemStartY);
    ctx.quadraticCurveTo(
        stemStartX + 13 + Math.sin(frogLilyPad.waveOffset) * 8 + bugTiltEffect,
        (stemStartY + stemEndY) / 2,
        stemStartX - 2,
        stemEndY
    );
    ctx.stroke();

    // Now draw the lily pad
    ctx.translate(frogLilyPad.x + shakeX, frogLilyPad.y + shakeY);

    // Wave tilt + weight-based tilt + bug tilt
    const waveTilt = Math.sin(frogLilyPad.waveOffset) * 0.06;
    // Weight tilt: max ~0.5 radians (~30 degrees) at max weight
    const weightTilt = (frogState.weight / frogState.maxWeight) * 0.5;
    // Bug tilt: nghiêng theo bọ rùa (max 0.25 radians ~ 14 degrees)
    const bugTiltRotation = frogLilyPad.bugTilt * frogLilyPad.bugWeight * 0.25;
    // Add extra shake rotation when actively shaking
    const shakeRotation = frogState.isShaking && frogState.shakeTimer < frogState.shakeDuration 
        ? Math.sin(frogState.shakeTimer * 0.03) * 0.2 
        : 0;
    const tiltAngle = waveTilt + weightTilt + shakeRotation + bugTiltRotation;
    ctx.rotate(tiltAngle);

    // Calculate damage color shift (more yellow/brown as damaged)
    const damageRatio = frogLilyPad.damage / frogLilyPad.maxDamage;
    const healthyGreen = { r: 34, g: 197, b: 94 }; // #22c55e
    const damagedGreen = { r: 120, g: 150, b: 60 }; // yellowish
    const lerpColor = (c1, c2, t) => ({
        r: Math.floor(c1.r + (c2.r - c1.r) * t),
        g: Math.floor(c1.g + (c2.g - c1.g) * t),
        b: Math.floor(c1.b + (c2.b - c1.b) * t)
    });
    const mainColor = lerpColor(healthyGreen, damagedGreen, damageRatio);
    const mainColorStr = `rgb(${mainColor.r}, ${mainColor.g}, ${mainColor.b})`;

    // Shadow on water
    ctx.fillStyle = 'rgba(0, 60, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(6, 10, frogLilyPad.width / 2 + 8, frogLilyPad.height / 2 + 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outer rim
    ctx.fillStyle = lerpColor({ r: 21, g: 128, b: 61 }, { r: 80, g: 100, b: 40 }, damageRatio);
    ctx.fillStyle = `rgb(${ctx.fillStyle.r || 21}, ${ctx.fillStyle.g || 128}, ${ctx.fillStyle.b || 61})`;
    ctx.fillStyle = '#15803d';
    if (damageRatio > 0) {
        const rimColor = lerpColor({ r: 21, g: 128, b: 61 }, { r: 80, g: 100, b: 40 }, damageRatio);
        ctx.fillStyle = `rgb(${rimColor.r}, ${rimColor.g}, ${rimColor.b})`;
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, frogLilyPad.width / 2 + 5, frogLilyPad.height / 2 + 3, 0, 0.12, Math.PI * 2 - 0.12);
    ctx.fill();

    // Main lily pad surface
    ctx.fillStyle = mainColorStr;
    ctx.beginPath();
    ctx.ellipse(0, 0, frogLilyPad.width / 2, frogLilyPad.height / 2, 0, 0.15, Math.PI * 2 - 0.15);
    ctx.fill();

    // Draw bite marks as true transparent holes
    if (frogLilyPad.biteMarks.length > 0) {
        // Cut holes using destination-out
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 1)'; // Full opacity to completely remove
        for (const bite of frogLilyPad.biteMarks) {
            const biteX = Math.cos(bite.angle) * (frogLilyPad.width / 2 - bite.depth);
            const biteY = Math.sin(bite.angle) * (frogLilyPad.height / 2 - bite.depth * 0.6);

            // Irregular hole shape
            ctx.beginPath();
            ctx.ellipse(biteX, biteY, bite.size * 1.2, bite.size * 0.8, bite.angle, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // Draw brown/darker edges around bite marks to show damage
        ctx.strokeStyle = 'rgba(101, 67, 33, 0.8)';
        ctx.lineWidth = 2.5;
        for (const bite of frogLilyPad.biteMarks) {
            const biteX = Math.cos(bite.angle) * (frogLilyPad.width / 2 - bite.depth);
            const biteY = Math.sin(bite.angle) * (frogLilyPad.height / 2 - bite.depth * 0.6);

            ctx.beginPath();
            ctx.ellipse(biteX, biteY, bite.size * 1.2 + 1, bite.size * 0.8 + 1, bite.angle, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Lighter inner area
    const innerColor = lerpColor({ r: 74, g: 222, b: 128 }, { r: 140, g: 180, b: 80 }, damageRatio);
    ctx.fillStyle = `rgb(${innerColor.r}, ${innerColor.g}, ${innerColor.b})`;
    ctx.beginPath();
    ctx.ellipse(0, -2, frogLilyPad.width / 2 - 15, frogLilyPad.height / 2 - 8, 0, 0.2, Math.PI * 2 - 0.2);
    ctx.fill();

    // Veins on lily pad
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI / 4) + 0.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(
            Math.cos(angle) * (frogLilyPad.width / 4),
            Math.sin(angle) * (frogLilyPad.height / 4) - 2,
            Math.cos(angle) * (frogLilyPad.width / 2 - 10),
            Math.sin(angle) * (frogLilyPad.height / 2 - 5)
        );
        ctx.stroke();
    }

    // Secondary veins
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI / 4) + 0.35;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 8);
        ctx.lineTo(
            Math.cos(angle) * (frogLilyPad.width / 2 - 15),
            Math.sin(angle) * (frogLilyPad.height / 2 - 8)
        );
        ctx.stroke();
    }

    // Center connection point
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Water droplets on lily pad
    ctx.fillStyle = 'rgba(200, 240, 255, 0.7)';
    ctx.beginPath();
    ctx.ellipse(-25, -8, 6, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(30, 5, 5, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-10, 10, 4, 2.5, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Droplet highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(-26, -9, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(29, 4, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Red flash effect when being eaten
    if (frogLilyPad.isFlashing && frogLilyPad.flashIntensity > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${frogLilyPad.flashIntensity * 0.4})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, frogLilyPad.width / 2 + 5, frogLilyPad.height / 2 + 3, 0, 0.15, Math.PI * 2 - 0.15);
        ctx.fill();

        // Red glow around edges
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
        ctx.strokeStyle = `rgba(255, 50, 50, ${frogLilyPad.flashIntensity})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, frogLilyPad.width / 2 + 3, frogLilyPad.height / 2 + 2, 0, 0.15, Math.PI * 2 - 0.15);
        ctx.stroke();
    }

    ctx.restore();
}

// Update heal particles
export function updateHealParticles() {
    if (!frogLilyPad.healParticles) return;
    
    for (let i = frogLilyPad.healParticles.length - 1; i >= 0; i--) {
        const particle = frogLilyPad.healParticles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;
        
        if (particle.life <= 0) {
            frogLilyPad.healParticles.splice(i, 1);
        }
    }
}

// Update flash effect
export function updateLilyPadFlash() {
    if (frogLilyPad.isFlashing) {
        frogLilyPad.flashTimer++;
        
        // Pulse effect - fade in and out quickly
        const progress = frogLilyPad.flashTimer / frogLilyPad.flashDuration;
        frogLilyPad.flashIntensity = Math.sin(progress * Math.PI * 4) * (1 - progress);
        
        if (frogLilyPad.flashTimer >= frogLilyPad.flashDuration) {
            frogLilyPad.isFlashing = false;
            frogLilyPad.flashTimer = 0;
            frogLilyPad.flashIntensity = 0;
        }
    }
}

// Draw heal particles
export function drawHealParticles() {
    if (!frogLilyPad.healParticles) return;
    
    for (const particle of frogLilyPad.healParticles) {
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
        
        // Star particle
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2);
            const x = particle.x + Math.cos(angle) * particle.size;
            const y = particle.y + Math.sin(angle) * particle.size;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        // Center dot
        ctx.fillStyle = '#d1fae5';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

