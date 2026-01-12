// Frog - Player entity
import { ctx } from '../utils/canvas.js';
import { gameState, frogState, frogEvolution } from '../state.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config.js';
import { frogLilyPad } from '../environment/lilypad.js';
import { createSplash, waterDroplets } from '../environment/water.js';
import { playWaterSplashSound } from '../audio/audio.js';

// Frog (player) - sits on lily pad
export const frog = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 120,
    width: 35,
    height: 45,
    color: '#4a90d9',
    // Movement now controlled by lily pad
    minY: CANVAS_HEIGHT - 250,
    maxY: CANVAS_HEIGHT - 100,
    speedY: 1.5,
    directionY: 1,
    // Intro animation
    introY: CANVAS_HEIGHT + 50, // Absolute Y position during intro
    introVelocityY: -18, // Jump velocity
    introGravity: 0.6,
    isInIntro: true,
    tilt: 0,
    // Leg animation
    legAnimationTime: 0
};

// Update Frog position (follows lily pad wave motion)
export function updateFrog() {
    // Skip update if falling
    if (frogState.isFalling) return;

    // Handle intro animation (jumping onto lily pad)
    if (gameState.state === 'jumping') {
        gameState.introTimer++;

        if (gameState.introTimer === 1) {
            // Create initial splash (reduced for performance)
            createSplash(frogLilyPad.x, CANVAS_HEIGHT - 100, 8);
            playWaterSplashSound();
        }

        if (frog.isInIntro) {
            // Apply jump physics
            frog.introVelocityY += frog.introGravity;
            frog.introY += frog.introVelocityY;

            // Check if landed on lily pad
            const targetY = frogLilyPad.y - 25;
            if (frog.introY <= targetY && frog.introVelocityY >= 0) {
                // Landed!
                frog.introY = targetY;
                frog.introVelocityY = 0;
                frog.isInIntro = false;

                // Create landing splash (reduced for performance)
                createSplash(frogLilyPad.x, CANVAS_HEIGHT - 100, 5);
                playWaterSplashSound();

                // Transition to playing after a short delay
                setTimeout(() => {
                    gameState.state = 'playing';
                }, 300);
            }

            // Set frog position during intro
            frog.x = frogLilyPad.x;
            frog.y = frog.introY;

            // Create water droplets during jump
            if (frog.introVelocityY < 0 && Math.random() < 0.3) {
                waterDroplets.push({
                    x: frog.x + (Math.random() - 0.5) * 40,
                    y: frog.y,
                    vx: (Math.random() - 0.5) * 3,
                    vy: Math.random() * 2,
                    gravity: 0.4,
                    size: 3 + Math.random() * 4,
                    alpha: 0.7 + Math.random() * 0.3,
                    fadeSpeed: 0.015,
                    isOnScreen: false,
                    stickX: 0,
                    stickY: 0
                });
            }
            return; // Skip normal update during intro
        }
    }

    // Smoothly transition level
    if (frogState.level < frogState.targetLevel) {
        frogState.level += 0.05; // Smooth level transition
    }

    // Calculate lily pad height based on level (rises higher with level)
    const levelHeightBonus = Math.min(frogState.level * 15, 450); // Max 450px rise to reach finish line at Y=150
    const targetBaseY = (CANVAS_HEIGHT - 90) - levelHeightBonus;

    // Smoothly move lily pad to new height
    frogLilyPad.baseY += (targetBaseY - frogLilyPad.baseY) * 0.02;

    // Update lily pad wave animation
    frogLilyPad.waveOffset += frogLilyPad.waveSpeed;
    const waveY = Math.sin(frogLilyPad.waveOffset) * frogLilyPad.waveAmplitude;
    frogLilyPad.y = frogLilyPad.baseY + waveY;

    // Update leg animation
    frog.legAnimationTime += 0.08;

    // Heavy weight shake system - triggers every 5 seconds when weight > 300
    let shakeX = 0;
    let shakeY = 0;
    let bodyShakeX = 0;
    let bodyShakeY = 0;
    
    if (frogState.weight > 300) {
        // Update shake timer
        frogState.shakeTimer++;
        
        // Check if should start shaking (first time reaching 300 or after interval)
        if (!frogState.isShaking && frogState.shakeTimer >= frogState.shakeInterval) {
            frogState.isShaking = true;
            frogState.shakeTimer = 0;
        }
        
        // If currently shaking
        if (frogState.isShaking) {
            if (frogState.shakeTimer < frogState.shakeDuration) {
                // Active shake
                const shakeIntensity = Math.min((frogState.weight - 300) / 200, 1) * 8;
                const shakeProgress = frogState.shakeTimer / frogState.shakeDuration;
                // Fade out shake intensity toward the end
                const intensityMultiplier = 1 - (shakeProgress * 0.5);
                
                shakeX = Math.sin(frogState.shakeTimer * 0.5) * shakeIntensity * intensityMultiplier;
                shakeY = Math.cos(frogState.shakeTimer * 0.75) * shakeIntensity * 0.7 * intensityMultiplier;
                
                // Additional body trembling
                const trembleIntensity = shakeIntensity * 0.4 * intensityMultiplier;
                bodyShakeX = Math.sin(frogState.shakeTimer * 0.15) * trembleIntensity;
                bodyShakeY = Math.cos(frogState.shakeTimer * 0.2) * trembleIntensity;
            } else {
                // Shake finished, reset for next cycle
                frogState.isShaking = false;
                frogState.shakeTimer = 0;
            }
        }
    } else {
        // Reset shake state when weight is normal or trigger first shake when crossing 300
        if (frogState.weight <= 300 && frogState.isShaking) {
            frogState.isShaking = false;
            frogState.shakeTimer = 0;
        }
        // Set timer to trigger immediately when weight crosses 300
        if (frogState.weight <= 300) {
            frogState.shakeTimer = frogState.shakeInterval; // Ready to shake immediately
        }
    }

    // Frog sits on lily pad - follows its movement and shake
    frog.x = frogLilyPad.x + shakeX + bodyShakeX;
    
    // Victory jump animation - happy bouncing with rotation
    if (frogState.isVictory) {
        frogState.victoryJumpTimer++;
        // Higher, more energetic jumps with varied timing
        const jumpSpeed = 0.12;
        const jumpHeight = 35;
        const jumpOffset = Math.abs(Math.sin(frogState.victoryJumpTimer * jumpSpeed)) * jumpHeight;
        // Add small hop variation for more natural movement
        const microHop = Math.sin(frogState.victoryJumpTimer * 0.3) * 5;
        frog.y = frogLilyPad.y - 25 - jumpOffset + microHop + shakeY + bodyShakeY;
        // More dynamic rotation - spins as it jumps
        const spinCycle = frogState.victoryJumpTimer * 0.08;
        frog.tilt = Math.sin(spinCycle) * 0.25 + Math.cos(spinCycle * 1.3) * 0.15;
    } else {
        frog.y = frogLilyPad.y - 25 + shakeY + bodyShakeY; // Offset to sit on top of lily pad + shake
        // Slight tilt effect based on wave + fear tilt when shaking
        const fearTilt = frogState.isShaking ? Math.sin(frogState.shakeTimer * 0.1) * 0.08 : 0;
        frog.tilt = Math.sin(frogLilyPad.waveOffset) * 0.05 + fearTilt;
    }

    // Update chewing animation
    if (frogState.isChewing) {
        frogState.chewTimer--;
        frogState.chewPhase += 0.4; // Speed of chewing motion

        // Throat bulge moves down during chewing
        if (frogState.chewTimer < frogState.chewDuration * 0.3) {
            frogState.throatBulge = Math.max(0, frogState.throatBulge - 0.03);
        }

        if (frogState.chewTimer <= 0) {
            frogState.isChewing = false;
            frogState.throatBulge = 0;
        }
    }

    // Update blinking animation
    if (frogState.isBlinking) {
        frogState.blinkTimer--;
        if (frogState.blinkTimer <= 0) {
            frogState.isBlinking = false;
            frogState.nextBlinkTime = Math.random() * 180 + 180;
        }
    } else {
        frogState.nextBlinkTime--;
        if (frogState.nextBlinkTime <= 0) {
            frogState.isBlinking = true;
            frogState.blinkTimer = frogState.blinkDuration;
        }
    }

    // Update evolution state
    if (frogEvolution.isEvolved) {
        frogEvolution.evolutionTimer--;
        frogEvolution.glowIntensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;

        if (frogEvolution.evolutionTimer <= 0) {
            frogEvolution.isEvolved = false;
            frogEvolution.glowIntensity = 0;
        }
    }

    // Update double points buff timer
    if (frogState.doublePointsActive) {
        frogState.doublePointsTimer--;
        if (frogState.doublePointsTimer <= 0) {
            frogState.doublePointsActive = false;
        }
    }

    // Update flash effect timer
    if (frogState.flashTimer > 0) {
        frogState.flashTimer--;
        if (frogState.flashTimer <= 0) {
            frogState.flashColor = null;
        }
    }

    // Update poison state
    if (frogState.isPoisoned) {
        frogState.poisonTimer--;
        if (frogState.poisonTimer <= 0) {
            // Die from poison
            frogState.isDead = true;
            frogState.isPoisoned = false;
            gameState.state = 'gameover';
        }
    }

    // Update hunger timer (only during playing)
    if (gameState.state === 'playing' && !frogState.isDead) {
        frogState.hungerTimer++;
        
        // Start starving warning at 80% (24 seconds)
        if (frogState.hungerTimer > frogState.hungerDuration * 0.8) {
            frogState.isStarving = true;
        }
        
        // Die from starvation
        if (frogState.hungerTimer >= frogState.hungerDuration) {
            frogState.isDead = true;
            gameState.state = 'gameover';
        }
    }
}

// Draw Frog
export function drawFrog(hookState) {
    ctx.save();

    // Calculate scale based on weight (1.0 to 1.8 max - 80% bigger)
    const weightScale = 1 + (frogState.weight / frogState.maxWeight) * 0.8;

    // Handle falling state
    if (frogState.isFalling) {
        ctx.translate(frog.x + 30, frogState.fallY); // Offset to the right when falling
        ctx.rotate(frogState.fallRotation);
        ctx.scale(weightScale, weightScale);
    } else {
        ctx.translate(frog.x, frog.y);
        // Apply tilt based on lily pad wave
        const tiltAngle = frog.tilt || 0;
        ctx.rotate(tiltAngle);
        // Apply weight scale
        ctx.scale(weightScale, weightScale);
    }

    const isShooting = hookState !== 'ready';
    const isEvolved = frogEvolution.isEvolved;
    const isPoisoned = frogState.isPoisoned;
    const isDead = frogState.isDead;

    // Calculate poison progress (0 = just poisoned, 1 = fully red/dead)
    const poisonProgress = isPoisoned ? (1 - frogState.poisonTimer / frogState.poisonDuration) : 0;
    // The Y position where red color reaches (from bottom +30 to top -60)
    const poisonLineY = 30 - (poisonProgress * 90); // Goes from +30 to -60

    // Colors based on poison/death state
    let mainColor, darkColor, bellyColor;
    if (isDead) {
        mainColor = '#7f1d1d';
        darkColor = '#450a0a';
        bellyColor = '#fca5a5';
    } else if (isEvolved) {
        mainColor = '#dc2626';
        darkColor = '#991b1b';
        bellyColor = '#fca5a5';
    } else {
        mainColor = '#16a34a';
        darkColor = '#14532d';
        bellyColor = '#4ade80';
    }

    // Create poison gradient colors if poisoned
    let mainGradient, darkGradient, bellyGradient;
    if (isPoisoned && !isDead) {
        // Main color gradient (green to red from bottom to top)
        mainGradient = ctx.createLinearGradient(0, 30, 0, -60);
        mainGradient.addColorStop(0, '#dc2626'); // Red at bottom
        mainGradient.addColorStop(Math.max(0, Math.min(1, (30 - poisonLineY) / 90)), '#dc2626');
        mainGradient.addColorStop(Math.max(0, Math.min(1, (30 - poisonLineY) / 90 + 0.05)), '#16a34a');
        mainGradient.addColorStop(1, '#16a34a'); // Green at top

        // Dark color gradient
        darkGradient = ctx.createLinearGradient(0, 30, 0, -60);
        darkGradient.addColorStop(0, '#991b1b');
        darkGradient.addColorStop(Math.max(0, Math.min(1, (30 - poisonLineY) / 90)), '#991b1b');
        darkGradient.addColorStop(Math.max(0, Math.min(1, (30 - poisonLineY) / 90 + 0.05)), '#14532d');
        darkGradient.addColorStop(1, '#14532d');

        // Belly color gradient
        bellyGradient = ctx.createLinearGradient(0, 30, 0, -60);
        bellyGradient.addColorStop(0, '#fca5a5');
        bellyGradient.addColorStop(Math.max(0, Math.min(1, (30 - poisonLineY) / 90)), '#fca5a5');
        bellyGradient.addColorStop(Math.max(0, Math.min(1, (30 - poisonLineY) / 90 + 0.05)), '#4ade80');
        bellyGradient.addColorStop(1, '#4ade80');

        mainColor = mainGradient;
        darkColor = darkGradient;
        bellyColor = bellyGradient;
    }

    // Glow effect when evolved
    if (isEvolved) {
        const glowSize = 60 + frogEvolution.glowIntensity * 20;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        gradient.addColorStop(0, `rgba(255, 100, 50, ${frogEvolution.glowIntensity * 0.6})`);
        gradient.addColorStop(0.5, `rgba(255, 50, 0, ${frogEvolution.glowIntensity * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Fire particles
        for (let i = 0; i < 8; i++) {
            const particleAngle = (Date.now() * 0.003 + i * Math.PI / 4) % (Math.PI * 2);
            const particleRadius = 50 + Math.sin(Date.now() * 0.01 + i) * 10;
            const px = Math.cos(particleAngle) * particleRadius;
            const py = Math.sin(particleAngle) * particleRadius - 10;
            const particleSize = 3 + Math.sin(Date.now() * 0.02 + i * 2) * 2;

            ctx.fillStyle = `rgba(255, ${150 + i * 10}, 0, ${0.5 + Math.sin(Date.now() * 0.01 + i) * 0.3})`;
            ctx.beginPath();
            ctx.arc(px, py, particleSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Back legs with animation (yellowish-green color to match frog body)
    const legWave1 = Math.sin(frog.legAnimationTime) * 3; // Left leg movement
    const legWave2 = Math.sin(frog.legAnimationTime + Math.PI) * 3; // Right leg movement (opposite phase)
    const legRotation1 = Math.sin(frog.legAnimationTime) * 0.1;
    const legRotation2 = Math.sin(frog.legAnimationTime + Math.PI) * 0.1;
    
    // Yellowish-green/lime color for legs (harmonizes with green body)
    const legColor = '#a3e635'; // Lime green
    const footColor = '#84cc16'; // Darker lime green
    
    // Left back leg
    ctx.fillStyle = legColor;
    ctx.save();
    ctx.translate(-35, 15 + legWave1);
    ctx.rotate(-0.3 + legRotation1);
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Right back leg
    ctx.save();
    ctx.translate(35, 15 + legWave2);
    ctx.rotate(0.3 + legRotation2);
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Feet with animation
    // Left foot
    ctx.fillStyle = footColor;
    ctx.save();
    ctx.translate(-50, 20 + legWave1);
    ctx.rotate(-0.5 + legRotation1 * 1.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Right foot
    ctx.save();
    ctx.translate(50, 20 + legWave2);
    ctx.rotate(0.5 + legRotation2 * 1.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Victory flag - draw before body so it's behind
    if (frogState.isVictory) {
        const flagTime = frogState.victoryJumpTimer * 0.1;
        const flagWave = Math.sin(flagTime * 2);
        const armWave = Math.sin(flagTime * 1.5) * 0.2; // Left arm wave
        const rightArmWave = Math.cos(flagTime * 1.2) * 0.15; // Right arm wave (out of phase)
        
        ctx.save();
        // Position flag to the right of frog
        ctx.translate(25, -45);
        
        // Right arm holding flag pole - moves with flag
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-10, 30); // shoulder
        ctx.lineTo(5 + rightArmWave * 8, 10 - rightArmWave * 5); // elbow moves
        ctx.lineTo(10 + rightArmWave * 10, -5 - rightArmWave * 8); // hand position moves up/down
        ctx.stroke();
        
        // Right hand holding pole
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.arc(10 + rightArmWave * 10, -5 - rightArmWave * 8, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Flag pole
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(10 + rightArmWave * 10, -5 - rightArmWave * 8);
        ctx.lineTo(10 + rightArmWave * 10, -45 - rightArmWave * 8);
        ctx.stroke();
        
        // Flag fabric - Vietnam flag (red background)
        const flagWidth = 30;
        const flagHeight = 20;
        const flagBaseX = 10 + rightArmWave * 10;
        const flagBaseY = -45 - rightArmWave * 8;
        ctx.fillStyle = '#da251d'; // Vietnam red
        ctx.strokeStyle = '#b91c1c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(flagBaseX, flagBaseY);
        ctx.bezierCurveTo(
            flagBaseX + 10 + flagWave * 3, flagBaseY + 3,
            flagBaseX + 20 + flagWave * 5, flagBaseY + 7,
            flagBaseX + flagWidth + flagWave * 4, flagBaseY + 10
        );
        ctx.lineTo(flagBaseX + flagWidth + flagWave * 4, flagBaseY + 10 + flagHeight);
        ctx.bezierCurveTo(
            flagBaseX + 20 + flagWave * 5, flagBaseY + 27,
            flagBaseX + 10 + flagWave * 3, flagBaseY + 23,
            flagBaseX, flagBaseY + 20
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Yellow star in center (Vietnam flag star)
        ctx.fillStyle = '#ffcd00'; // Vietnam yellow
        const starX = flagBaseX + 15 + flagWave * 4;
        const starY = flagBaseY + 15;
        const starSize = 6;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const radius = i % 2 === 0 ? starSize : starSize * 0.4;
            const x = starX + Math.cos(angle) * radius;
            const y = starY + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // Left arm waving near flag
        ctx.save();
        ctx.translate(-25, -45);
        
        // Left arm - waving motion (more energetic)
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(10, 30); // shoulder
        ctx.lineTo(-5 - armWave * 15, 15 - armWave * 8); // elbow moves with wave
        ctx.lineTo(-10 - armWave * 25, 0 - armWave * 15); // hand waves up and down more
        ctx.stroke();
        
        // Left hand
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.arc(-10 - armWave * 25, 0 - armWave * 15, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    // Body
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.ellipse(0, 5, 40, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(0, 10, 25, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Digestion boost swirl effect on belly
    if (frogState.digestionBoostTimer > 0 && !isDead) {
        ctx.save();
        ctx.translate(0, 10); // Center on belly

        const time = Date.now() * 0.005;
        const boostAlpha = Math.min(1, frogState.digestionBoostTimer / 60); // Fade out in last second

        // Draw swirling lines
        ctx.strokeStyle = `rgba(251, 146, 60, ${0.7 * boostAlpha})`; // Orange color
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        // Multiple swirl arms
        for (let arm = 0; arm < 3; arm++) {
            ctx.beginPath();
            const armOffset = (arm * Math.PI * 2) / 3;

            for (let i = 0; i < 20; i++) {
                const angle = time * 3 + armOffset + i * 0.3;
                const radius = 3 + i * 0.8;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius * 0.8; // Slightly flattened for belly shape

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }

        // Center glow
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
        glowGradient.addColorStop(0, `rgba(251, 146, 60, ${0.5 * boostAlpha})`);
        glowGradient.addColorStop(0.5, `rgba(251, 146, 60, ${0.2 * boostAlpha})`);
        glowGradient.addColorStop(1, 'rgba(251, 146, 60, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        // Sparkle particles around belly
        for (let i = 0; i < 5; i++) {
            const sparkleAngle = time * 2 + i * Math.PI * 2 / 5;
            const sparkleRadius = 12 + Math.sin(time * 3 + i) * 5;
            const sx = Math.cos(sparkleAngle) * sparkleRadius;
            const sy = Math.sin(sparkleAngle) * sparkleRadius * 0.8;
            const sparkleSize = 2 + Math.sin(time * 4 + i * 2) * 1;

            ctx.fillStyle = `rgba(255, 200, 100, ${0.8 * boostAlpha})`;
            ctx.beginPath();
            ctx.arc(sx, sy, sparkleSize, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // Head
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.ellipse(0, -25, 35, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye bumps
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(-18, -45, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(18, -45, 15, 0, Math.PI * 2);
    ctx.fill();

    // Eyes - handle blinking
    const isBlinking = frogState.isBlinking;
    const blinkProgress = isBlinking ? (1 - frogState.blinkTimer / frogState.blinkDuration) : 0;

    if (isDead) {
        // Dead eyes - X shape @@
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        // Left eye X
        ctx.beginPath();
        ctx.moveTo(-24, -52);
        ctx.lineTo(-12, -42);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-12, -52);
        ctx.lineTo(-24, -42);
        ctx.stroke();
        
        // Right eye X
        ctx.beginPath();
        ctx.moveTo(12, -52);
        ctx.lineTo(24, -42);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(24, -52);
        ctx.lineTo(12, -42);
        ctx.stroke();
    } else if (blinkProgress > 0 && blinkProgress < 1) {
        const eyeOpenAmount = blinkProgress < 0.5 ? (1 - blinkProgress * 2) : ((blinkProgress - 0.5) * 2);
        const eyeHeight = 12 * eyeOpenAmount;

        if (eyeHeight > 1) {
            if (isEvolved) {
                ctx.fillStyle = '#fef08a';
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 15;
            } else {
                ctx.fillStyle = '#fff';
            }
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(-18, -47, 12, eyeHeight, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(18, -47, 12, eyeHeight, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Pupils
            const dx = gameState.mouseX - frog.x;
            const dy = gameState.mouseY - frog.y;
            const angle = Math.atan2(dy, dx);
            const pupilOffset = 4 * eyeOpenAmount;

            ctx.fillStyle = isEvolved ? '#dc2626' : '#000';
            ctx.beginPath();
            ctx.ellipse(-18 + Math.cos(angle) * pupilOffset, -47 + Math.sin(angle) * pupilOffset, 5, 5 * eyeOpenAmount, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(18 + Math.cos(angle) * pupilOffset, -47 + Math.sin(angle) * pupilOffset, 5, 5 * eyeOpenAmount, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Eyelids
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.ellipse(-18, -47 - (12 - eyeHeight), 13, 12 - eyeHeight + 2, 0, 0, Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(18, -47 - (12 - eyeHeight), 13, 12 - eyeHeight + 2, 0, 0, Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-18, -47 + (12 - eyeHeight), 13, 12 - eyeHeight + 2, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(18, -47 + (12 - eyeHeight), 13, 12 - eyeHeight + 2, 0, Math.PI, Math.PI * 2);
        ctx.fill();
    } else {
        // Eyes fully open
        const glassesScale = frogState.isWearingGlasses ? 1.3 : 1; // Bigger eyes with glasses
        const eyeRadius = 12 * glassesScale;
        
        if (isEvolved) {
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 15;
        } else {
            ctx.fillStyle = '#fff';
        }
        ctx.beginPath();
        ctx.arc(-18, -47, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(18, -47, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Check if victory state - draw hearts instead of pupils
        if (frogState.isVictory) {
            // Left heart
            ctx.fillStyle = '#ef4444';
            ctx.save();
            ctx.translate(-18, -47);
            ctx.scale(0.6, 0.6);
            ctx.beginPath();
            ctx.moveTo(0, 2);
            ctx.bezierCurveTo(-5, -2, -8, 0, -8, 5);
            ctx.bezierCurveTo(-8, 8, -5, 10, 0, 13);
            ctx.bezierCurveTo(5, 10, 8, 8, 8, 5);
            ctx.bezierCurveTo(8, 0, 5, -2, 0, 2);
            ctx.fill();
            ctx.restore();

            // Right heart
            ctx.fillStyle = '#ef4444';
            ctx.save();
            ctx.translate(18, -47);
            ctx.scale(0.6, 0.6);
            ctx.beginPath();
            ctx.moveTo(0, 2);
            ctx.bezierCurveTo(-5, -2, -8, 0, -8, 5);
            ctx.bezierCurveTo(-8, 8, -5, 10, 0, 13);
            ctx.bezierCurveTo(5, 10, 8, 8, 8, 5);
            ctx.bezierCurveTo(8, 0, 5, -2, 0, 2);
            ctx.fill();
            ctx.restore();

            // Sparkles around eyes
            const sparkleTime = Date.now() * 0.005;
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI / 3) + sparkleTime;
                const radius = 20 + Math.sin(sparkleTime * 2 + i) * 3;
                const sparkleX = Math.cos(angle) * radius;
                const sparkleY = Math.sin(angle) * radius;
                
                ctx.fillStyle = `rgba(255, 182, 193, ${0.6 + Math.sin(sparkleTime * 3 + i) * 0.4})`;
                ctx.beginPath();
                ctx.arc(-18 + sparkleX, -47 + sparkleY, 2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(18 + sparkleX, -47 + sparkleY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Check if frog is scared (shaking from weight)
            const isScared = frogState.isShaking;
            
            // Check if poisoned - dizzy spinning eyes
            if (frogState.isPoisoned) {
                // Spinning dizzy eyes - larger and more visible
                const spinTime = Date.now() * 0.008; // Slower for more visible rotation
                const spinRadius = 9; // Much larger spirals
                
                ctx.save();
                
                // Left eye - spinning spiral
                ctx.translate(-18, -47);
                ctx.rotate(spinTime);
                
                // Draw spiral pattern
                ctx.strokeStyle = isEvolved ? '#dc2626' : '#000';
                ctx.lineWidth = 3.5; // Thicker lines
                ctx.lineCap = 'round';
                
                // Draw multiple spiral arms
                for (let i = 0; i < 2; i++) {
                    const angle = (i * Math.PI);
                    ctx.beginPath();
                    for (let r = 1; r < spinRadius; r += 0.3) {
                        const a = angle + r * 0.6;
                        const x = Math.cos(a) * r;
                        const y = Math.sin(a) * r;
                        if (r === 1) {
                            ctx.moveTo(x, y);
                        } else {
                            ctx.lineTo(x, y);
                        }
                    }
                    ctx.stroke();
                }
                
                ctx.restore();
                
                // Right eye - spinning spiral (opposite direction)
                ctx.save();
                ctx.translate(18, -47);
                ctx.rotate(-spinTime);
                
                ctx.strokeStyle = isEvolved ? '#dc2626' : '#000';
                ctx.lineWidth = 3.5; // Thicker lines
                ctx.lineCap = 'round';
                
                // Draw multiple spiral arms
                for (let i = 0; i < 2; i++) {
                    const angle = (i * Math.PI);
                    ctx.beginPath();
                    for (let r = 1; r < spinRadius; r += 0.3) {
                        const a = angle + r * 0.6;
                        const x = Math.cos(a) * r;
                        const y = Math.sin(a) * r;
                        if (r === 1) {
                            ctx.moveTo(x, y);
                        } else {
                            ctx.lineTo(x, y);
                        }
                    }
                    ctx.stroke();
                }
                
                ctx.restore();
                
                // Add dizzy stars circling around head - bigger and more visible
                const starTime = Date.now() * 0.004;
                for (let i = 0; i < 4; i++) {
                    const angle = (i * Math.PI * 2 / 4) + starTime;
                    const radius = 40;
                    const starX = Math.cos(angle) * radius;
                    const starY = -60 + Math.sin(angle) * radius * 0.6;
                    
                    // Draw star with glow
                    ctx.save();
                    ctx.translate(starX, starY);
                    ctx.rotate(starTime * 3);
                    
                    // Glow effect
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = '#ffd700';
                    
                    ctx.fillStyle = '#ffd700';
                    ctx.strokeStyle = '#ff8c00';
                    ctx.lineWidth = 2;
                    ctx.lineJoin = 'miter';
                    
                    ctx.beginPath();
                    for (let j = 0; j < 5; j++) {
                        const starAngle = (j * Math.PI * 2 / 5) - Math.PI / 2;
                        const starRadius = j % 2 === 0 ? 7 : 3;
                        const x = Math.cos(starAngle) * starRadius;
                        const y = Math.sin(starAngle) * starRadius;
                        if (j === 0) {
                            ctx.moveTo(x, y);
                        } else {
                            ctx.lineTo(x, y);
                        }
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    ctx.restore();
                }
                
                // Add wavy lines above head to show dizziness
                ctx.strokeStyle = 'rgba(100, 100, 100, 0.6)';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                const waveTime = Date.now() * 0.005;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    const yOffset = -75 - i * 8;
                    for (let x = -20; x <= 20; x += 2) {
                        const y = yOffset + Math.sin((x + waveTime * 50) * 0.3) * 3;
                        if (x === -20) {
                            ctx.moveTo(x, y);
                        } else {
                            ctx.lineTo(x, y);
                        }
                    }
                    ctx.stroke();
                }
            } else if (isScared) {
                // Scared eyes - wider and shaking pupils
                const dx = gameState.mouseX - frog.x;
                const dy = gameState.mouseY - frog.y;
                const angle = Math.atan2(dy, dx);
                const pupilOffset = 3;
                
                // Pupils shake with fear
                const fearShakeX = Math.sin(frogState.shakeTimer * 0.05) * 2;
                const fearShakeY = Math.cos(frogState.shakeTimer * 0.07) * 2;

                // Smaller, trembling pupils
                ctx.fillStyle = isEvolved ? '#dc2626' : '#000';
                ctx.beginPath();
                ctx.arc(-18 + Math.cos(angle) * pupilOffset + fearShakeX, -47 + Math.sin(angle) * pupilOffset + fearShakeY, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(18 + Math.cos(angle) * pupilOffset + fearShakeX, -47 + Math.sin(angle) * pupilOffset + fearShakeY, 3, 0, Math.PI * 2);
                ctx.fill();
                
                // Add sweat drops
                const sweatTime = frogState.shakeTimer * 0.05;
                for (let i = 0; i < 2; i++) {
                    const sweatY = (-30 + Math.sin(sweatTime + i * 2) * 5) % 20 - 30;
                    ctx.fillStyle = 'rgba(100, 150, 255, 0.6)';
                    ctx.beginPath();
                    ctx.ellipse(-35 + i * 70, sweatY, 3, 4, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // Normal pupils
                const dx = gameState.mouseX - frog.x;
                const dy = gameState.mouseY - frog.y;
                const angle = Math.atan2(dy, dx);
                const pupilOffset = 4;
                const pupilSize = frogState.isWearingGlasses ? 6.5 : 5; // Bigger pupils with glasses

                ctx.fillStyle = isEvolved ? '#dc2626' : '#000';
                ctx.beginPath();
                ctx.arc(-18 + Math.cos(angle) * pupilOffset, -47 + Math.sin(angle) * pupilOffset, pupilSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(18 + Math.cos(angle) * pupilOffset, -47 + Math.sin(angle) * pupilOffset, pupilSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // Draw glasses if wearing
    if (frogState.isWearingGlasses && !isDead && frogState.glassesType !== 'none') {
        // Set lens color based on type
        let lensColor = 'rgba(100, 200, 255, 0.15)';
        let frameColor = '#333';
        
        if (frogState.glassesType === 'dark') {
            lensColor = 'rgba(0, 0, 0, 0.85)';
            frameColor = '#000';
        } else if (frogState.glassesType === 'clear') {
            lensColor = 'rgba(100, 200, 255, 0.15)';
        }
        
        ctx.strokeStyle = frameColor;
        ctx.fillStyle = lensColor;
        ctx.lineWidth = 3;
        
        // Draw pixelated "deal with it" style for dark glasses, round for clear
        if (frogState.glassesType === 'dark') {
            // Oval dark sunglasses - wider at top
            ctx.strokeStyle = '#000';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent black so eyes are visible
            ctx.lineWidth = 3;
            
            // Left lens - oval shape (wider horizontally, taller vertically)
            ctx.beginPath();
            ctx.ellipse(-18, -47, 18, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Right lens - oval shape
            ctx.beginPath();
            ctx.ellipse(18, -47, 18, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Bridge
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-2, -47);
            ctx.lineTo(2, -47);
            ctx.stroke();
            
            // Arms
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-36, -47);
            ctx.lineTo(-42, -45);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(36, -47);
            ctx.lineTo(42, -45);
            ctx.stroke();
        } else if (frogState.glassesType === 'rainbow') {
            // Rainbow candy glasses with spiral swirl effect
            const time = Date.now() * 0.003;
            
            // Left lens - draw spiral pattern with alternating red and white
            const colors = ['#f31010', '#ffffff']; // Red, White
            
            ctx.save();
            
            // Clip to lens shape
            ctx.beginPath();
            ctx.arc(-18, -47, 16, 0, Math.PI * 2);
            ctx.clip();
            
            // Draw swirling arms (6 arms, alternating colors)
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            
            for (let arm = 0; arm < 6; arm++) {
                ctx.strokeStyle = colors[arm % 2]; // Alternate between red and yellow
                ctx.beginPath();
                const armOffset = (arm * Math.PI * 2) / 6;
                
                for (let i = 0; i < 15; i++) {
                    const angle = time * 2 + armOffset + i * 0.4;
                    const radius = 1 + i * 1.2;
                    const x = -18 + Math.cos(angle) * radius;
                    const y = -47 + Math.sin(angle) * radius;
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
            }
            
            ctx.restore();
            
            // Left lens border
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(-18, -47, 16, 0, Math.PI * 2);
            ctx.stroke();
            
            // Right lens - same pattern
            ctx.save();
            
            ctx.beginPath();
            ctx.arc(18, -47, 16, 0, Math.PI * 2);
            ctx.clip();
            
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            
            for (let arm = 0; arm < 6; arm++) {
                ctx.strokeStyle = colors[arm % 2];
                ctx.beginPath();
                const armOffset = (arm * Math.PI * 2) / 6;
                
                for (let i = 0; i < 15; i++) {
                    const angle = time * 2 + armOffset + i * 0.4;
                    const radius = 1 + i * 1.2;
                    const x = 18 + Math.cos(angle) * radius;
                    const y = -47 + Math.sin(angle) * radius;
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
            }
            
            ctx.restore();
            
            // Right lens border
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(18, -47, 16, 0, Math.PI * 2);
            ctx.stroke();
            
            // Bridge
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-2, -47);
            ctx.lineTo(2, -47);
            ctx.stroke();
            
            // Arms
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-34, -47);
            ctx.lineTo(-40, -45);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(34, -47);
            ctx.lineTo(40, -45);
            ctx.stroke();
        } else {
            // Clear glasses - round style
            // Left lens
            ctx.beginPath();
            ctx.arc(-18, -47, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Right lens
            ctx.beginPath();
            ctx.arc(18, -47, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        
        // Bridge
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-2, -47);
        ctx.lineTo(2, -47);
        ctx.stroke();
        
        // Arms
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-34, -47);
        ctx.lineTo(-40, -45);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(34, -47);
        ctx.lineTo(40, -45);
        ctx.stroke();
        
        // Shine effect on lenses (only for clear glasses)
        if (frogState.glassesType === 'clear') {
            const shineAlpha = 0.6;
            ctx.fillStyle = `rgba(255, 255, 255, ${shineAlpha})`;
            ctx.beginPath();
            ctx.arc(-22, -51, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(14, -51, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Mouth
    const isChewing = frogState.isChewing;
    const chewCycle = Math.sin(frogState.chewPhase) * 0.5 + 0.5;
    const levelBonus = Math.min(frogState.level * 2, 15);
    const baseMouthWidth = 18 + levelBonus;
    const isAiming = hookState === 'ready' && gameState.state === 'playing';

    if (isDead) {
        // Dead - tongue hanging out with nice curve
        const tongueLength = 45;
        const tongueCurve = Math.sin(Date.now() * 0.002) * 3; // Slight sway

        // Tongue shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.moveTo(-6, -15);
        ctx.quadraticCurveTo(-8 + tongueCurve, tongueLength * 0.5, -4 + tongueCurve * 1.5, tongueLength + 3);
        ctx.lineTo(8 + tongueCurve * 1.5, tongueLength + 3);
        ctx.quadraticCurveTo(10 + tongueCurve, tongueLength * 0.5, 8, -15);
        ctx.closePath();
        ctx.fill();

        // Main tongue with gradient
        const tongueGradient = ctx.createLinearGradient(0, -15, 0, tongueLength);
        tongueGradient.addColorStop(0, '#ef4444');
        tongueGradient.addColorStop(0.5, '#dc2626');
        tongueGradient.addColorStop(1, '#b91c1c');

        ctx.fillStyle = tongueGradient;
        ctx.beginPath();
        ctx.moveTo(-5, -15);
        ctx.quadraticCurveTo(-7 + tongueCurve, tongueLength * 0.5, -3 + tongueCurve * 1.5, tongueLength);
        ctx.lineTo(3 + tongueCurve * 1.5, tongueLength);
        ctx.quadraticCurveTo(7 + tongueCurve, tongueLength * 0.5, 5, -15);
        ctx.closePath();
        ctx.fill();

        // Tongue center line (detail)
        ctx.strokeStyle = '#b91c1c';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.quadraticCurveTo(tongueCurve * 0.5, tongueLength * 0.5, tongueCurve * 1.5, tongueLength - 8);
        ctx.stroke();

        // Forked tongue tip
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        // Left fork
        ctx.moveTo(-2 + tongueCurve * 1.5, tongueLength - 2);
        ctx.quadraticCurveTo(-6 + tongueCurve * 1.5, tongueLength + 8, -8 + tongueCurve * 1.5, tongueLength + 12);
        ctx.quadraticCurveTo(-4 + tongueCurve * 1.5, tongueLength + 6, -1 + tongueCurve * 1.5, tongueLength + 2);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        // Right fork
        ctx.moveTo(2 + tongueCurve * 1.5, tongueLength - 2);
        ctx.quadraticCurveTo(6 + tongueCurve * 1.5, tongueLength + 8, 8 + tongueCurve * 1.5, tongueLength + 12);
        ctx.quadraticCurveTo(4 + tongueCurve * 1.5, tongueLength + 6, 1 + tongueCurve * 1.5, tongueLength + 2);
        ctx.closePath();
        ctx.fill();

        // Open mouth (dead expression)
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.ellipse(0, -15, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mouth outline
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-baseMouthWidth, -18);
        ctx.quadraticCurveTo(-baseMouthWidth * 0.5, -12, 0, -10);
        ctx.quadraticCurveTo(baseMouthWidth * 0.5, -12, baseMouthWidth, -18);
        ctx.stroke();
    } else if (isShooting || isChewing || frogState.isVictory || isAiming) {
        const mouthOpenAmount = frogState.isVictory ? 1 : (isShooting ? 1 : (isAiming ? 0.6 : (0.3 + chewCycle * 0.7)));
        const jawDrop = (12 + levelBonus * 0.8) * mouthOpenAmount;

        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.ellipse(0, -18, baseMouthWidth, 8, 0, 0, Math.PI);
        ctx.fill();

        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.ellipse(0, -18, baseMouthWidth, 4, 0, 0, Math.PI);
        ctx.fill();

        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.ellipse(0, -18 + jawDrop, baseMouthWidth - 2, 10 + levelBonus * 0.3, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.ellipse(0, -18 + jawDrop, baseMouthWidth - 2, 4, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.ellipse(0, -18 + jawDrop * 0.4, baseMouthWidth - 4, jawDrop * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(0, -15 + jawDrop * 0.3, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        if (frogState.throatBulge > 0 && isChewing && frogState.lastEatenInsect) {
            const bulgeY = 5 + (1 - frogState.throatBulge) * 20;
            const bulgeSize = 8 + frogState.lastEatenInsect.width * 0.2 * frogState.throatBulge;

            ctx.fillStyle = bellyColor;
            ctx.beginPath();
            ctx.ellipse(0, bulgeY, 25 + bulgeSize, 20 + bulgeSize * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-baseMouthWidth, -18);
        ctx.quadraticCurveTo(0, -12, baseMouthWidth, -18);
        ctx.stroke();

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-baseMouthWidth + 3, -17);
        ctx.quadraticCurveTo(0, -14, baseMouthWidth - 3, -17);
        ctx.stroke();

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-baseMouthWidth + 2, -17, 4, 0.5, 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(baseMouthWidth - 2, -17, 4, 1.6, 2.6);
        ctx.stroke();
    }

    // Cheeks puff when chewing
    if (isChewing && chewCycle > 0.5) {
        const puffAmount = (chewCycle - 0.5) * 2 * 5;
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.ellipse(-28, -15, 8 + puffAmount, 6 + puffAmount * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(28, -15, 8 + puffAmount, 6 + puffAmount * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Spots on body
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.arc(-15, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(12, -5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, 15, 3, 0, Math.PI * 2);
    ctx.fill();

    // Chewing progress bar
    if (isChewing) {
        const barWidth = 50;
        const barHeight = 5;
        // Progress decreases from 1 to 0 (full to empty)
        const chewProgress = frogState.chewTimer / frogState.chewDuration;
        const barY = 40;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

        // Progress fill - gradient from red to yellow to green
        const gradient = ctx.createLinearGradient(-barWidth / 2, 0, barWidth / 2, 0);
        if (chewProgress > 0.5) {
            // Red to yellow (first half)
            gradient.addColorStop(0, '#ef4444'); // Red
            gradient.addColorStop(0.5, '#fbbf24'); // Yellow
            gradient.addColorStop(1, '#fbbf24'); // Yellow
        } else {
            // Yellow to green (second half)
            gradient.addColorStop(0, '#fbbf24'); // Yellow
            gradient.addColorStop(0.5, '#22c55e'); // Green
            gradient.addColorStop(1, '#22c55e'); // Green
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(-barWidth / 2, barY, barWidth * chewProgress, barHeight);
    }

    // Potion flash effect overlay
    if (frogState.flashColor && frogState.flashTimer > 0) {
        const flashIntensity = Math.sin(frogState.flashTimer * 0.3) * 0.15 + 0.15;
        ctx.save();
        ctx.globalAlpha = flashIntensity;
        ctx.fillStyle = frogState.flashColor;
        ctx.shadowBlur = 15;
        ctx.shadowColor = frogState.flashColor;
        ctx.beginPath();
        ctx.arc(0, -10, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Evolution timer indicator
    if (isEvolved) {
        const timerWidth = 60;
        const timerHeight = 6;
        const timerProgress = frogEvolution.evolutionTimer / frogEvolution.evolutionDuration;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(-timerWidth / 2, 45, timerWidth, timerHeight);

        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-timerWidth / 2, 45, timerWidth * timerProgress, timerHeight);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-timerWidth / 2, 45, timerWidth, timerHeight);
    }

    ctx.restore();
}
