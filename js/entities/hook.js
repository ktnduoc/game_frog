// Hook (Tongue) - Catching mechanism
import { ctx } from '../utils/canvas.js';
import { gameState, frogState, frogEvolution, addScore, resetCombo, eatFood, activateDigestionBoost } from '../state.js';
import { HOOK_MAX_LENGTH, HOOK_SPEED, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config.js';
import { frog } from './frog.js';
import { enemies, spawnEnemy } from './enemies.js';
import { fishJumps } from './fish.js';
import { lotusFlower, lotusFlower2 } from './lotus.js';
import { frogLilyPad } from '../environment/lilypad.js';
import { holyWater } from './holywater.js';
import { digestPotion } from './digestpotion.js';
import { leafPotion } from './leafpotion.js';
import { eatCaterpillar } from './caterpillar.js';
import { checkCrabHit, pushCrabDown } from './lazy-bug.js';
import { initAudio, playTongueSound, playEatSound, playLevelUpSound, playMissSound, playFireflySound, playHolyWaterSound, playCaptureSound } from '../audio/audio.js';

// Hook object
export const hook = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 150 - 20,
    angle: -Math.PI / 2,
    length: 0,
    maxLength: HOOK_MAX_LENGTH,
    speed: HOOK_SPEED,
    state: 'ready', // ready, shooting, returning
    targetX: 0,
    targetY: 0,
    hookedEnemy: null,
    hookedFish: null,
    hookedHolyWater: false,
    hookedDigestPotion: false,
    hookedLeafPotion: false,
    hookedCaterpillar: null
};

// Get tongue length based on level (starts at 100, +20 per level)
export function getTongueLength(level) {
    const baseLength = 100;
    const lengthPerLevel = 20;
    const maxLength = HOOK_MAX_LENGTH;
    return Math.min(baseLength + (level * lengthPerLevel), maxLength);
}

// Shoot hook
export function shootHook() {
    // Don't shoot during intro
    if (gameState.state === 'intro') return;
    if (hook.state !== 'ready') return;
    // Don't shoot if dead or falling
    if (frogState.isDead || frogState.isFalling) return;
    // Don't shoot while chewing
    if (frogState.isChewing) return;

    // Initialize audio on first interaction
    initAudio();

    hook.state = 'shooting';
    hook.length = 0;

    // Play tongue sound
    playTongueSound();

    // Calculate angle to mouse
    const dx = gameState.mouseX - frog.x;
    const dy = gameState.mouseY - (frog.y - 20);
    hook.angle = Math.atan2(dy, dx);
}

// Update hook position
export function updateHook() {
    if (hook.state === 'shooting') {
        hook.length += hook.speed;

        // Update max length based on current level
        hook.maxLength = getTongueLength(frogState.level);

        // Check collision with enemies
        const hookTipX = frog.x + Math.cos(hook.angle) * hook.length;
        const hookTipY = (frog.y - 20) + Math.sin(hook.angle) * hook.length;

        // Check collision with fish first
        if (!hook.hookedEnemy) {
            for (let i = fishJumps.length - 1; i >= 0; i--) {
                const fish = fishJumps[i];
                if (fish.state === 'jumping') {
                    const dist = Math.sqrt(
                        (hookTipX - fish.x) ** 2 +
                        (hookTipY - fish.y) ** 2
                    );
                    if (dist < fish.size * 1.2) {
                        hook.hookedFish = fish;
                        hook.state = 'returning';
                        playCaptureSound();
                        fishJumps.splice(i, 1);
                        break;
                    }
                }
            }
        }

        // Check collision with holy water
        if (holyWater.active && !hook.hookedEnemy && !hook.hookedFish && !hook.hookedHolyWater &&
            hookTipX > holyWater.x - holyWater.width / 2 &&
            hookTipX < holyWater.x + holyWater.width / 2 &&
            hookTipY > holyWater.y - holyWater.height / 2 &&
            hookTipY < holyWater.y + holyWater.height / 2) {
            hook.hookedHolyWater = true;
            hook.state = 'returning';
        }

        // Check collision with digest potion
        if (digestPotion.active && !hook.hookedEnemy && !hook.hookedFish && !hook.hookedHolyWater && !hook.hookedDigestPotion &&
            hookTipX > digestPotion.x - digestPotion.width / 2 &&
            hookTipX < digestPotion.x + digestPotion.width / 2 &&
            hookTipY > digestPotion.y - digestPotion.height / 2 &&
            hookTipY < digestPotion.y + digestPotion.height / 2) {
            hook.hookedDigestPotion = true;
            digestPotion.active = false;
            hook.state = 'returning';
        }

        // Check collision with leaf potion
        if (leafPotion.active && !hook.hookedEnemy && !hook.hookedFish && !hook.hookedHolyWater && !hook.hookedDigestPotion && !hook.hookedLeafPotion &&
            hookTipX > leafPotion.x - leafPotion.width / 2 &&
            hookTipX < leafPotion.x + leafPotion.width / 2 &&
            hookTipY > leafPotion.y - leafPotion.height / 2 &&
            hookTipY < leafPotion.y + leafPotion.height / 2) {
            hook.hookedLeafPotion = true;
            leafPotion.active = false;
            hook.state = 'returning';
        }

        // Caterpillars are caught by clicking directly on them, not by tongue
        // (tongue passes through caterpillars)

        // Check collision with crabs (push them down, don't catch)
        if (!hook.hookedEnemy && !hook.hookedFish && !hook.hookedHolyWater && !hook.hookedDigestPotion && !hook.hookedLeafPotion && !hook.hookedCaterpillar) {
            const hitCrab = checkCrabHit(hookTipX, hookTipY);
            if (hitCrab) {
                pushCrabDown(hitCrab);
                hook.state = 'returning';
                playCaptureSound();
            }
        }

        // Check collision with insects
        for (let enemy of enemies) {
            if (!hook.hookedEnemy && !hook.hookedFish && !hook.hookedHolyWater && !hook.hookedDigestPotion && !hook.hookedLeafPotion &&
                hookTipX > enemy.x - enemy.width / 2 &&
                hookTipX < enemy.x + enemy.width / 2 &&
                hookTipY > enemy.y - enemy.height / 2 &&
                hookTipY < enemy.y + enemy.height / 2) {
                hook.hookedEnemy = enemy;
                hook.state = 'returning';
                playCaptureSound();
                break;
            }
        }

        // Max length reached
        if (hook.length >= hook.maxLength) {
            hook.state = 'returning';
        }
    }

    if (hook.state === 'returning') {
        let pullSpeed = hook.speed;
        if (hook.hookedEnemy) {
            pullSpeed = hook.speed / hook.hookedEnemy.weight;
        } else if (hook.hookedFish) {
            pullSpeed = hook.speed / 1.5;
        } else {
            // Rút nhanh hơn khi không câu được gì
            pullSpeed = hook.speed * 1.8;
        }
        hook.length -= pullSpeed;

        // Move hooked enemy
        if (hook.hookedEnemy) {
            hook.hookedEnemy.x = frog.x + Math.cos(hook.angle) * hook.length;
            hook.hookedEnemy.y = (frog.y - 20) + Math.sin(hook.angle) * hook.length;
        }

        // Move hooked fish
        if (hook.hookedFish) {
            hook.hookedFish.x = frog.x + Math.cos(hook.angle) * hook.length;
            hook.hookedFish.y = (frog.y - 20) + Math.sin(hook.angle) * hook.length;
            hook.hookedFish.rotation += 0.2;
        }

        // Move hooked caterpillar
        if (hook.hookedCaterpillar) {
            hook.hookedCaterpillar.x = frog.x + Math.cos(hook.angle) * hook.length;
            hook.hookedCaterpillar.y = (frog.y - 20) + Math.sin(hook.angle) * hook.length;
        }

        // Hook returned
        if (hook.length <= 0) {
            hook.length = 0;
            hook.state = 'ready';

            // Score if fish was hooked
            if (hook.hookedFish) {
                let fishPoints = Math.floor(hook.hookedFish.size * 2);
                
                // Double points if buff is active
                if (frogState.doublePointsActive) {
                    fishPoints *= 2;
                }
                
                const leveledUp = addScore(fishPoints);

                // Add weight (fish = 200 weight regardless of points)
                eatFood(fishPoints, true);

                // Reset hunger timer
                frogState.hungerTimer = 0;
                frogState.isStarving = false;

                // Eating fish cures poison
                if (frogState.isPoisoned) {
                    frogState.isPoisoned = false;
                    frogState.poisonTimer = 0;
                }

                // Trigger chewing animation
                frogState.isChewing = true;
                frogState.chewDuration = 180; // 3 seconds for fish (very big)
                frogState.chewTimer = frogState.chewDuration;
                frogState.chewPhase = 0;
                frogState.throatBulge = 1.5;

                playEatSound();

                if (leveledUp) {
                    playLevelUpSound();
                }

                hook.hookedFish = null;
            }
            // Score if enemy was hooked
            else if (hook.hookedEnemy) {
                const caughtEnemy = hook.hookedEnemy;
                let points = caughtEnemy.points;
                
                // Double points if buff is active
                if (frogState.doublePointsActive) {
                    points *= 2;
                }
                
                const leveledUp = addScore(points);

                // Add weight based on enemy points
                eatFood(caughtEnemy.points, false);

                // Scare nearby insects
                for (let enemy of enemies) {
                    if (enemy === caughtEnemy) continue;

                    const dx = caughtEnemy.x - enemy.x;
                    const dy = caughtEnemy.y - enemy.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 150) {
                        enemy.isScared = true;
                        enemy.scaredTimer = enemy.scaredDuration;

                        const fleeAngle = Math.atan2(enemy.y - caughtEnemy.y, enemy.x - caughtEnemy.x);
                        enemy.directionX = Math.cos(fleeAngle);
                        enemy.directionY = Math.sin(fleeAngle);
                    }
                }

                // Reset hunger timer
                frogState.hungerTimer = 0;
                frogState.isStarving = false;

                // Trigger chewing animation - duration based on enemy points
                frogState.isChewing = true;
                // Up to 30 points: 0.2s (12 frames)
                // Above 30 points: scale from 0.4s to 1s (24 to 60 frames)
                if (caughtEnemy.points <= 30) {
                    frogState.chewDuration = 12; // 0.2s for small/medium insects
                } else {
                    // Formula: 24 + (points - 30) * 1.2 (max 60 frames = 1s)
                    frogState.chewDuration = Math.min(60, 24 + (caughtEnemy.points - 30) * 1.2);
                }
                frogState.chewTimer = frogState.chewDuration;
                frogState.chewPhase = 0;
                frogState.lastEatenInsect = hook.hookedEnemy;
                frogState.throatBulge = 1;

                // Check if ate a Firefly
                if (hook.hookedEnemy.name === 'Firefly') {
                    // Firefly causes poison
                    frogState.isPoisoned = true;
                    frogState.poisonTimer = frogState.poisonDuration;
                    playFireflySound();
                } else {
                    // Eating any other insect while poisoned cures the poison
                    if (frogState.isPoisoned) {
                        frogState.isPoisoned = false;
                        frogState.poisonTimer = 0;
                    }
                    playEatSound();
                }

                if (leveledUp) {
                    playLevelUpSound();
                }

                // Remove enemy and spawn new one only if flowers still have nectar
                const index = enemies.indexOf(hook.hookedEnemy);
                if (index > -1) {
                    enemies.splice(index, 1);
                    
                    // Only spawn new enemy if at least one flower has nectar
                    if (lotusFlower.nectarLevel > 0 || lotusFlower2.nectarLevel > 0) {
                        spawnEnemy();
                    }
                }

                hook.hookedEnemy = null;
            }
            // Score if holy water was caught
            else if (hook.hookedHolyWater) {
                // Cure poison if poisoned
                if (frogState.isPoisoned) {
                    frogState.isPoisoned = false;
                    frogState.poisonTimer = 0;
                }

                // Restore flowers based on their current state
                [lotusFlower, lotusFlower2].forEach(flower => {
                    if (flower.pollenAmount <= 0 || flower.type === 'wilted' || flower.type === 'disappeared') {
                        // If pollen = 0 (completely dead), create new bud
                        flower.type = 'bud';
                        flower.bloomProgress = 0.0;
                        flower.bloomDelay = 30; // Quick bloom
                        flower.pollenAmount = 1000;
                        flower.nectarLevel = flower.maxNectar;
                        flower.wiltedTimer = 0;
                        flower.fadeProgress = 0;
                        flower.petalParticles = [];
                        flower.justRestored = true;
                    } else if (flower.type === 'bud') {
                        // If bud, bloom immediately
                        flower.type = 'bloomed';
                        flower.bloomProgress = 1.0;
                        flower.bloomDelay = 0;
                        flower.pollenAmount = 1000;
                        flower.nectarLevel = flower.maxNectar;
                        flower.justRestored = true;
                    } else {
                        // If bloomed and pollen > 0 (still alive, just wilting), restore to 1000
                        flower.type = 'bloomed';
                        flower.pollenAmount = 1000;
                        flower.nectarLevel = flower.maxNectar;
                        flower.bloomProgress = 1.0;
                        flower.justRestored = true;
                    }
                    
                    // Release any attached insect
                    if (flower.insectAtFlower) {
                        flower.insectAtFlower.isAtFlower = false;
                        flower.insectAtFlower = null;
                    }
                    flower.suckingTimer = 0;
                    flower.suckingProgress = 0;
                    
                    // Create sparkle effect
                    for (let i = 0; i < 20; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = 2 + Math.random() * 3;
                        flower.scentParticles.push({
                            x: 0,
                            y: 0,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            life: 1.0,
                            size: 4 + Math.random() * 4,
                            color: '#3b82f6' // Blue sparkles for holy water (flower restoration)
                        });
                    }
                });

                // Reset hunger timer
                frogState.hungerTimer = 0;
                frogState.isStarving = false;

                // Play healing sound
                playHolyWaterSound();

                // Deactivate holy water
                holyWater.active = false;
                holyWater.sparkles = [];

                hook.hookedHolyWater = false;
            }
            // Digest potion was caught
            else if (hook.hookedDigestPotion) {
                // Cure poison if poisoned
                if (frogState.isPoisoned) {
                    frogState.isPoisoned = false;
                    frogState.poisonTimer = 0;
                }

                // Activate digestion boost (2x speed for 10 seconds)
                activateDigestionBoost();

                // Reset hunger timer
                frogState.hungerTimer = 0;
                frogState.isStarving = false;

                // Play sound
                playHolyWaterSound();

                // Deactivate digest potion
                digestPotion.active = false;
                digestPotion.sparkles = [];

                hook.hookedDigestPotion = false;
            }
            // Leaf potion was caught - restores lily pad ONLY
            else if (hook.hookedLeafPotion) {
                // Cure poison if poisoned
                if (frogState.isPoisoned) {
                    frogState.isPoisoned = false;
                    frogState.poisonTimer = 0;
                }

                // Restore lily pad maxWeight (capped at 500)
                frogState.maxWeight = Math.min(frogState.maxWeight + 10, 500);
                
                // Reduce lily pad damage
                if (frogLilyPad.damage > 0) {
                    frogLilyPad.damage = Math.max(0, frogLilyPad.damage - 2);
                }
                
                // Remove some bite marks (heal the lily pad)
                if (frogLilyPad.biteMarks.length > 0) {
                    const marksToRemove = Math.min(2, frogLilyPad.biteMarks.length);
                    frogLilyPad.biteMarks.splice(0, marksToRemove);
                }

                // Create green sparkle effect around lily pad
                if (!frogLilyPad.healParticles) {
                    frogLilyPad.healParticles = [];
                }
                for (let i = 0; i < 25; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 2 + Math.random() * 3;
                    frogLilyPad.healParticles.push({
                        x: frogLilyPad.x,
                        y: frogLilyPad.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 1,
                        life: 1.0,
                        size: 4 + Math.random() * 4,
                        color: '#34d399' // green
                    });
                }

                // Reset hunger timer
                frogState.hungerTimer = 0;
                frogState.isStarving = false;

                // Play healing sound
                playHolyWaterSound();

                // Deactivate leaf potion
                leafPotion.active = false;
                leafPotion.sparkles = [];

                hook.hookedLeafPotion = false;
            }
            // Caterpillar was caught
            else if (hook.hookedCaterpillar) {
                const caterpillar = hook.hookedCaterpillar;
                let nutrition = eatCaterpillar(caterpillar);
                
                // Double points if buff is active
                if (frogState.doublePointsActive) {
                    nutrition *= 2;
                }
                
                const leveledUp = addScore(nutrition);

                // Caterpillars add small weight (like small insects)
                eatFood(nutrition, false);

                // Reset hunger timer
                frogState.hungerTimer = 0;
                frogState.isStarving = false;

                // Eating caterpillar cures poison (protein-rich food)
                if (frogState.isPoisoned) {
                    frogState.isPoisoned = false;
                    frogState.poisonTimer = 0;
                }

                // Trigger chewing animation
                frogState.isChewing = true;
                frogState.chewDuration = 36; // 0.6 seconds for caterpillar (medium)
                frogState.chewTimer = frogState.chewDuration;
                frogState.chewPhase = 0;
                frogState.throatBulge = 0.8;

                playEatSound();

                if (leveledUp) {
                    playLevelUpSound();
                }

                hook.hookedCaterpillar = null;
            } else {
                resetCombo();
                playMissSound();
            }
        }
    }
}

// Draw tongue
export function drawHook() {
    const startX = frog.x;
    const startY = frog.y - 15;
    const endX = startX + Math.cos(hook.angle) * hook.length;
    const endY = startY + Math.sin(hook.angle) * hook.length;

    // Draw aim line when ready
    if (hook.state === 'ready' && gameState.state === 'playing') {
        const dx = gameState.mouseX - startX;
        const dy = gameState.mouseY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const aimAngle = Math.atan2(dy, dx);

        const aimLength = Math.min(distance, hook.maxLength);
        const aimEndX = startX + Math.cos(aimAngle) * aimLength;
        const aimEndY = startY + Math.sin(aimAngle) * aimLength;

        // Draw gradient aim line (green → yellow → orange → red)
        const gradient = ctx.createLinearGradient(startX, startY, aimEndX, aimEndY);
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');    // Green
        gradient.addColorStop(0.33, 'rgba(234, 179, 8, 0.8)'); // Yellow
        gradient.addColorStop(0.66, 'rgba(251, 146, 60, 0.8)'); // Orange
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.8)');    // Red
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(aimEndX, aimEndY);
        ctx.stroke();

        // Range circle
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(startX, startY, hook.maxLength, Math.PI, 0);
        ctx.stroke();
    }

    // Draw tongue (skip if victory)
    if (hook.length > 0 && gameState.state !== 'victory') {
        // Shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX + 2, startY + 2);
        ctx.lineTo(endX + 2, endY + 2);
        ctx.stroke();

        // Main tongue
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Highlight
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Tongue tip
        ctx.save();
        ctx.translate(endX, endY);

        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f87171';
        ctx.beginPath();
        ctx.arc(-3, -3, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 200, 200, 0.6)';
        ctx.beginPath();
        ctx.arc(5, 5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-6, 4, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Draw hooked fish
    if (hook.hookedFish) {
        const fish = hook.hookedFish;
        ctx.save();
        ctx.globalAlpha = fish.alpha;
        ctx.translate(fish.x, fish.y);
        ctx.rotate(fish.rotation);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(2, 3, fish.size * 1.1, fish.size * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = fish.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, fish.size, fish.size * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(fish.size * 0.4, -fish.size * 0.2, fish.size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(fish.size * 0.45, -fish.size * 0.2, fish.size * 0.08, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = fish.color;
        ctx.beginPath();
        ctx.moveTo(-fish.size * 0.9, 0);
        ctx.lineTo(-fish.size * 1.4, -fish.size * 0.5);
        ctx.lineTo(-fish.size * 1.4, fish.size * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}
