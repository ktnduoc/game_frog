// Enemies (Insects) system
import { ctx, canvas } from '../utils/canvas.js';
import { ENEMY_TYPES, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config.js';
import { shadeColor } from '../utils/colors.js';
import { playMissSound } from '../audio/audio.js';
import { frogState } from '../state.js';

// Enemies array
export const enemies = [];

// Reference to hook, frog, and lotus (set via init function)
let hookRef = null;
let frogRef = null;
let lotusFlowerRef = null;
let lotusFlower2Ref = null;

export function initEnemies(hook, frog, lotusFlower, lotusFlower2) {
    hookRef = hook;
    frogRef = frog;
    lotusFlowerRef = lotusFlower;
    lotusFlower2Ref = lotusFlower2;

    // Initialize enemies
    for (let i = 0; i < 5; i++) {
        spawnEnemy();
    }
}

// Spawn enemy
export function spawnEnemy() {
    // Filter out Firefly if level < 3
    let availableTypes = ENEMY_TYPES;
    if (frogState.level < 3) {
        availableTypes = ENEMY_TYPES.filter(type => type.name !== 'Firefly');
    }
    
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const enemy = {
        x: Math.random() * (CANVAS_WIDTH - type.width) + type.width / 2,
        y: Math.random() * 250 + 50,
        width: type.width,
        height: type.height,
        color: type.color,
        speed: type.speed,
        points: type.points,
        name: type.name,
        directionX: (Math.random() - 0.5) * 2,
        directionY: (Math.random() - 0.5) * 2,
        changeTimer: 0,
        changeInterval: Math.random() * 60 + 30,
        dodgeChance: type.dodgeChance,
        dodgeSpeed: type.dodgeSpeed,
        isDodging: false,
        dodgeTimer: 0,
        dodgeCooldown: 0,
        weight: type.weight,
        isSpecial: type.isSpecial || false,
        glowPhase: Math.random() * Math.PI * 2,
        isScared: false,
        scaredTimer: 0,
        scaredDuration: 60,
        fleeSpeed: 8
    };
    enemies.push(enemy);
}

// Update enemies
export function updateEnemies() {
    const hook = hookRef;
    const lotusFlower = lotusFlowerRef;
    const lotusFlower2 = lotusFlower2Ref;

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (hook && enemy === hook.hookedEnemy) continue;

        // Update scared state
        if (enemy.isScared) {
            enemy.scaredTimer--;
            if (enemy.scaredTimer <= 0) {
                enemy.isScared = false;
                enemy.directionX = (Math.random() - 0.5) * 2;
                enemy.directionY = (Math.random() - 0.5) * 2;
            }
        }

        // Update dodge cooldown
        if (enemy.dodgeCooldown > 0) {
            enemy.dodgeCooldown--;
        }

        // Check if hook is coming towards this enemy (but not if attracted to flower)
        if (hook && frogRef && hook.state === 'shooting' && !enemy.isDodging && !enemy.isScared && !enemy.isAtFlower && enemy.dodgeCooldown === 0) {
            const hookTipX = frogRef.x + Math.cos(hook.angle) * hook.length;
            const hookTipY = (frogRef.y - 20) + Math.sin(hook.angle) * hook.length;

            const distToHook = Math.sqrt(
                Math.pow(hookTipX - enemy.x, 2) +
                Math.pow(hookTipY - enemy.y, 2)
            );

            const detectionRange = 120;
            if (distToHook < detectionRange) {
                if (Math.random() < enemy.dodgeChance) {
                    enemy.isDodging = true;
                    enemy.dodgeTimer = 20;

                    const dodgeAngle = hook.angle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
                    enemy.directionX = Math.cos(dodgeAngle);
                    enemy.directionY = Math.sin(dodgeAngle);
                }
                enemy.dodgeCooldown = 60;
            }
        }

        // Update dodge state
        if (enemy.isDodging) {
            enemy.dodgeTimer--;
            if (enemy.dodgeTimer <= 0) {
                enemy.isDodging = false;
                enemy.directionX = (Math.random() - 0.5) * 2;
                enemy.directionY = (Math.random() - 0.5) * 2;
            }
        }

        // Random direction change
        if (!enemy.isDodging && !enemy.isScared && !enemy.isAtFlower) {
            enemy.changeTimer++;
            if (enemy.changeTimer >= enemy.changeInterval) {
                enemy.directionX = (Math.random() - 0.5) * 2;
                enemy.directionY = (Math.random() - 0.5) * 2;
                enemy.changeTimer = 0;
                enemy.changeInterval = Math.random() * 60 + 30;
            }
        }

        // Move enemy (skip if at flower)
        if (!enemy.isAtFlower) {
            let currentSpeed = enemy.speed;
            if (enemy.isDodging) {
                currentSpeed = enemy.dodgeSpeed;
            } else if (enemy.isScared) {
                const scaredProgress = enemy.scaredTimer / enemy.scaredDuration;
                currentSpeed = enemy.fleeSpeed * scaredProgress + enemy.speed * (1 - scaredProgress);
            }

            enemy.x += enemy.directionX * currentSpeed;
            enemy.y += enemy.directionY * currentSpeed;

            // Bounce off walls
            if (enemy.x < enemy.width / 2) {
                enemy.x = enemy.width / 2;
                enemy.directionX *= -1;
            }
            if (enemy.x > CANVAS_WIDTH - enemy.width / 2) {
                enemy.x = CANVAS_WIDTH - enemy.width / 2;
                enemy.directionX *= -1;
            }
            if (enemy.y < enemy.height / 2 + 30) {
                enemy.y = enemy.height / 2 + 30;
                enemy.directionY *= -1;
            }
            // Allow insects to fly down to flowers (increased from 350 to 520)
            if (enemy.y > 520) {
                enemy.y = 520;
                enemy.directionY *= -1;
            }
        }
    }
}

// Draw enemies
export function drawEnemies() {
    const hook = hookRef;

    for (let enemy of enemies) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        // Scared effect - lighter trail with diminishing tail
        if (enemy.isScared) {
            const shake = Math.sin(Date.now() * 0.05) * 2;
            ctx.translate(shake, shake * 0.5);

            ctx.fillStyle = enemy.color;
            for (let i = 5; i >= 1; i--) {
                const scale = 1 - (i * 0.15); // Smaller towards back: 0.25 -> 0.85
                const alpha = 0.08 * (6 - i) / 5; // Lighter: 0.08 -> 0.064
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.ellipse(
                    -enemy.directionX * enemy.fleeSpeed * i * 1.2,
                    -enemy.directionY * enemy.fleeSpeed * i * 1.2,
                    (enemy.width / 2) * scale,
                    (enemy.height / 2) * scale,
                    0, 0, Math.PI * 2
                );
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // Dodge effect - lighter trail with diminishing tail
        if (enemy.isDodging) {
            ctx.fillStyle = enemy.color;
            for (let i = 5; i >= 1; i--) {
                const scale = 1 - (i * 0.15); // Smaller towards back: 0.25 -> 0.85
                const alpha = 0.1 * (6 - i) / 5; // Lighter alpha: 0.1 -> 0.08
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.ellipse(
                    -enemy.directionX * enemy.dodgeSpeed * i * 1.5,
                    -enemy.directionY * enemy.dodgeSpeed * i * 1.5,
                    (enemy.width / 2) * scale,
                    (enemy.height / 2) * scale,
                    0, 0, Math.PI * 2
                );
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // Wing animation
        const wingFlap = Math.sin(Date.now() * 0.03) * 0.3;

        // Draw based on insect type
        if (enemy.name === 'Fly') {
            drawFly(enemy, wingFlap);
        } else if (enemy.name === 'Mosquito') {
            drawMosquito(enemy, wingFlap);
        } else if (enemy.name === 'Bee') {
            drawBee(enemy, wingFlap);
        } else if (enemy.name === 'Butterfly') {
            drawButterfly(enemy, wingFlap);
        } else if (enemy.name === 'Dragonfly') {
            drawDragonfly(enemy, wingFlap);
        } else if (enemy.name === 'Firefly') {
            drawFirefly(enemy, wingFlap);
        }

        // Dodge glow effect
        if (enemy.isDodging) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, enemy.width / 2 + 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// Draw Fly
function drawFly(enemy, wingFlap) {
    // Wings with gradient and detail
    const gradient = ctx.createRadialGradient(-8, -5, 0, -8, -5, 12);
    gradient.addColorStop(0, 'rgba(230, 240, 255, 0.8)');
    gradient.addColorStop(0.7, 'rgba(200, 220, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(180, 200, 255, 0.3)');
    
    // Left wing
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(-8, -5, 11, 7, -0.5 + wingFlap, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 180, 220, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Right wing
    ctx.beginPath();
    ctx.ellipse(8, -5, 11, 7, 0.5 - wingFlap, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Body with segments
    ctx.fillStyle = shadeColor(enemy.color, -10);
    ctx.beginPath();
    ctx.ellipse(0, 2, 10, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body highlight
    ctx.fillStyle = shadeColor(enemy.color, 20);
    ctx.beginPath();
    ctx.ellipse(-2, 1, 4, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Body segments
    ctx.strokeStyle = shadeColor(enemy.color, -30);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-9, 4);
    ctx.lineTo(9, 4);
    ctx.stroke();

    // Head
    ctx.fillStyle = shadeColor(enemy.color, -5);
    ctx.beginPath();
    ctx.arc(0, -9, 7, 0, Math.PI * 2);
    ctx.fill();

    // Compound eyes
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(-4, -10, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -10, 4.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(-5, -11, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3, -11, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Legs (simple)
    ctx.strokeStyle = shadeColor(enemy.color, -40);
    ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 6, 8);
        ctx.lineTo(i * 10, 14);
        ctx.stroke();
    }
}

// Draw Mosquito
function drawMosquito(enemy, wingFlap) {
    ctx.fillStyle = 'rgba(200, 220, 255, 0.7)';
    ctx.shadowColor = 'rgba(150, 200, 255, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(-10, -3, 14, 6, -0.3 + wingFlap, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10, -3, 14, 6, 0.3 - wingFlap, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(-10, -3, 6, 3, -0.3 + wingFlap, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10, -3, 6, 3, 0.3 - wingFlap, 0, Math.PI * 2);
    ctx.fill();

    const bodyGradient = ctx.createLinearGradient(0, -5, 0, 15);
    bodyGradient.addColorStop(0, '#a8b9db');
    bodyGradient.addColorStop(0.5, enemy.color);
    bodyGradient.addColorStop(1, '#4a5568');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 5, 5, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(-5, i * 6 - 2, 10, 2);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(0, -10, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4, -11, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -11, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-4, -11, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -11, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-3, -12, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -12, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(0, -19);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(0, -19, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 182, 193, 0.5)';
    ctx.beginPath();
    ctx.arc(-6, -9, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, -9, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -15);
    ctx.lineTo(-8, -22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, -15);
    ctx.lineTo(8, -22);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(-8, -22, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, -22, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-4, 5 + i * 4);
        ctx.lineTo(-9, 10 + i * 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(4, 5 + i * 4);
        ctx.lineTo(9, 10 + i * 3);
        ctx.stroke();
    }
}

// Draw Bee
function drawBee(enemy, wingFlap) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowColor = 'rgba(255, 255, 200, 0.6)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(-14, -10, 16, 9, -0.4 + wingFlap, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(14, -10, 16, 9, 0.4 - wingFlap, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-14, -10);
    ctx.lineTo(-20, -5);
    ctx.moveTo(-14, -10);
    ctx.lineTo(-10, -15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14, -10);
    ctx.lineTo(20, -5);
    ctx.moveTo(14, -10);
    ctx.lineTo(10, -15);
    ctx.stroke();

    const bodyGradient = ctx.createRadialGradient(0, 5, 0, 0, 5, 18);
    bodyGradient.addColorStop(0, '#ffe066');
    bodyGradient.addColorStop(0.7, enemy.color);
    bodyGradient.addColorStop(1, '#f4b73c');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 5, 13, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 230, 120, 0.3)';
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const fx = Math.cos(angle) * 10;
        const fy = 5 + Math.sin(angle) * 12;
        ctx.beginPath();
        ctx.arc(fx, fy, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = '#3d3d3d';
    for (let i = -1; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(0, i * 7 + 3, 13, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    const headGradient = ctx.createRadialGradient(0, -14, 0, 0, -14, 10);
    headGradient.addColorStop(0, '#ffe066');
    headGradient.addColorStop(1, '#f4b73c');
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(0, -14, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-5, -15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -15, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-5, -15, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -15, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4, -16, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, -16, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#3d3d3d';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -11, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 150, 150, 0.5)';
    ctx.beginPath();
    ctx.arc(-8, -13, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, -13, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#3d3d3d';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -22);
    ctx.lineTo(-7, -28);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, -22);
    ctx.lineTo(7, -28);
    ctx.stroke();

    ctx.fillStyle = '#3d3d3d';
    ctx.beginPath();
    ctx.arc(-7, -28, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -28, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3d3d3d';
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(-2, 18);
    ctx.lineTo(2, 18);
    ctx.closePath();
    ctx.fill();
}

// Draw Butterfly
function drawButterfly(enemy, wingFlap) {
    const wingAngle = wingFlap * 1.5;

    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.ellipse(-15, -5, 18, 14, -0.3 + wingAngle, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fab1a0';
    ctx.beginPath();
    ctx.ellipse(-12, 8, 12, 10, -0.2 + wingAngle, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.ellipse(15, -5, 18, 14, 0.3 - wingAngle, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fab1a0';
    ctx.beginPath();
    ctx.ellipse(12, 8, 12, 10, 0.2 - wingAngle, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-15, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(15, -5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, -16, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-2, -18);
    ctx.quadraticCurveTo(-8, -28, -5, -30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, -18);
    ctx.quadraticCurveTo(8, -28, 5, -30);
    ctx.stroke();
}

// Draw Dragonfly
function drawDragonfly(enemy, wingFlap) {
    // Wings with iridescent effect
    const wingGradient1 = ctx.createRadialGradient(-18, -5, 0, -18, -5, 24);
    wingGradient1.addColorStop(0, 'rgba(180, 255, 220, 0.8)');
    wingGradient1.addColorStop(0.4, 'rgba(150, 240, 200, 0.7)');
    wingGradient1.addColorStop(0.8, 'rgba(120, 200, 255, 0.5)');
    wingGradient1.addColorStop(1, 'rgba(100, 180, 255, 0.2)');
    
    // Upper wings
    ctx.fillStyle = wingGradient1;
    ctx.beginPath();
    ctx.ellipse(-18, -5, 24, 7, -0.2 + wingFlap * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 200, 180, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.ellipse(18, -5, 24, 7, 0.2 - wingFlap * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Lower wings
    ctx.fillStyle = 'rgba(150, 230, 200, 0.6)';
    ctx.beginPath();
    ctx.ellipse(-15, 5, 20, 6, 0.1 - wingFlap * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.ellipse(15, 5, 20, 6, -0.1 + wingFlap * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Wing veins
    ctx.strokeStyle = 'rgba(80, 180, 160, 0.4)';
    ctx.lineWidth = 0.5;
    for (let wing of [{x: -18, y: -5}, {x: 18, y: -5}, {x: -15, y: 5}, {x: 15, y: 5}]) {
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(wing.x, wing.y);
            ctx.lineTo(wing.x + (wing.x < 0 ? -15 : 15), wing.y + i * 4);
            ctx.stroke();
        }
    }

    // Long segmented body (abdomen)
    const bodyGradient = ctx.createLinearGradient(0, 5, 0, 45);
    bodyGradient.addColorStop(0, shadeColor(enemy.color, 20));
    bodyGradient.addColorStop(0.5, enemy.color);
    bodyGradient.addColorStop(1, shadeColor(enemy.color, -20));
    
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 22, 4.5, 27, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body segments with rings
    ctx.strokeStyle = shadeColor(enemy.color, -40);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 10 + i * 6, 4, 1, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Highlight on body
    ctx.fillStyle = shadeColor(enemy.color, 40);
    ctx.beginPath();
    ctx.ellipse(-1, 18, 2, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thorax
    ctx.fillStyle = shadeColor(enemy.color, 10);
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = shadeColor(enemy.color, 5);
    ctx.beginPath();
    ctx.arc(0, -12, 9, 0, Math.PI * 2);
    ctx.fill();

    // Large compound eyes
    ctx.fillStyle = '#0984e3';
    ctx.beginPath();
    ctx.arc(-5.5, -12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5.5, -12, 7, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye facets detail
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
            ctx.beginPath();
            ctx.arc(-5.5 + (i - 1) * 2.5, -12 + (j - 0.5) * 2.5, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(5.5 + (i - 1) * 2.5, -12 + (j - 0.5) * 2.5, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Eye highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(-7, -14, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -14, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Legs
    ctx.strokeStyle = shadeColor(enemy.color, -50);
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5, 3);
        ctx.lineTo(i * 8, 10);
        ctx.lineTo(i * 6, 14);
        ctx.stroke();
    }
}

// Draw Firefly
function drawFirefly(enemy, wingFlap) {
    const glowIntensity = 0.5 + Math.sin(Date.now() * 0.008 + enemy.glowPhase) * 0.5;
    const glowSize = 30 + glowIntensity * 20;

    const gradient = ctx.createRadialGradient(0, 14, 0, 0, 14, glowSize);
    gradient.addColorStop(0, `rgba(255, 255, 150, ${glowIntensity})`);
    gradient.addColorStop(0.2, `rgba(255, 240, 100, ${glowIntensity * 0.9})`);
    gradient.addColorStop(0.4, `rgba(200, 255, 100, ${glowIntensity * 0.7})`);
    gradient.addColorStop(0.6, `rgba(150, 255, 200, ${glowIntensity * 0.4})`);
    gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 14, glowSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(220, 240, 255, 0.7)';
    ctx.shadowColor = 'rgba(150, 200, 255, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(-10, -6, 12, 6, -0.4 + wingFlap, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10, -6, 12, 6, 0.4 - wingFlap, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.ellipse(-10, -6, 5, 3, -0.4 + wingFlap, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10, -6, 5, 3, 0.4 - wingFlap, 0, Math.PI * 2);
    ctx.fill();

    const bodyGradient = ctx.createLinearGradient(0, -8, 0, 8);
    bodyGradient.addColorStop(0, '#4a5568');
    bodyGradient.addColorStop(0.5, enemy.color);
    bodyGradient.addColorStop(1, '#1a202c');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 2, 9, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    const tailGradient = ctx.createRadialGradient(0, 14, 0, 0, 14, 10);
    tailGradient.addColorStop(0, `rgb(${255}, ${255}, ${180 + glowIntensity * 75})`);
    tailGradient.addColorStop(0.5, `rgb(${200 + glowIntensity * 55}, ${240}, ${50 + glowIntensity * 50})`);
    tailGradient.addColorStop(1, `rgb(${150 + glowIntensity * 55}, ${220}, ${100})`);
    ctx.fillStyle = tailGradient;
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 25 * glowIntensity;
    ctx.beginPath();
    ctx.ellipse(0, 14, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = `rgba(255, 255, 255, ${glowIntensity * 0.8})`;
    ctx.beginPath();
    ctx.ellipse(-2, 12, 3, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4a5568';
    ctx.beginPath();
    ctx.arc(0, -14, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4, -15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -15, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-4, -15, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -15, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-3, -16, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -16, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 100, ${glowIntensity * 0.3})`;
    ctx.beginPath();
    ctx.arc(-4, -15, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -15, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -11, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 200, 100, 0.5)';
    ctx.beginPath();
    ctx.arc(-7, -13, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -13, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -20);
    ctx.lineTo(-7, -26);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, -20);
    ctx.lineTo(7, -26);
    ctx.stroke();

    ctx.fillStyle = `rgb(${200 + glowIntensity * 55}, ${230 + glowIntensity * 25}, ${100})`;
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 15 * glowIntensity;
    ctx.beginPath();
    ctx.arc(-7, -26, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -26, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (glowIntensity > 0.5) {
        ctx.fillStyle = `rgba(255, 255, 200, ${glowIntensity * 0.9})`;
        for (let i = 0; i < 6; i++) {
            const sparkleAngle = Date.now() * 0.005 + i * Math.PI / 3;
            const sparkleRadius = 25 + Math.sin(Date.now() * 0.01 + i) * 8;
            const sx = Math.cos(sparkleAngle) * sparkleRadius;
            const sy = 14 + Math.sin(sparkleAngle) * sparkleRadius * 0.6;
            ctx.beginPath();
            ctx.arc(sx, sy, 2 + Math.sin(Date.now() * 0.02 + i) * 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('★', 0, -34);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-6, 2 + i * 4);
        ctx.lineTo(-10, 6 + i * 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(6, 2 + i * 4);
        ctx.lineTo(10, 6 + i * 3);
        ctx.stroke();
    }
}
