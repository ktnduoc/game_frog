// Lotus flowers system
import { ctx } from '../utils/canvas.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config.js';
import { gameState } from '../state.js';
import { shadeColor } from '../utils/colors.js';
import { frogLilyPad } from '../environment/lilypad.js';
import { enemies } from './enemies.js';

// Lotus flowers
export const lotusFlower = {
    x: CANVAS_WIDTH / 2 + 100,
    baseY: CANVAS_HEIGHT - 200,
    y: CANVAS_HEIGHT - 200,
    waveOffset: Math.PI / 3,
    swayOffset: 0, // Wind sway animation
    swaySpeed: 0.02,
    swayAmount: 8,
    scale: 1,
    type: 'bloomed',
    bloomProgress: 1.0,
    bloomSpeed: 0.001,
    scentTimer: 0,
    scentParticles: [],
    attractedInsects: [],
    health: 5,
    maxHealth: 5,
    isBeingAttacked: false,
    attackTimer: 0,
    nectarLevel: 5,
    maxNectar: 5,
    insectAtFlower: null,
    suckingTimer: 0,
    suckingDuration: 180,
    suckingProgress: 0,
    petalParticles: [], // Falling petals when wilting
    pollenAmount: 1000,
    maxPollen: 1000
};

export const lotusFlower2 = {
    x: CANVAS_WIDTH / 2 - 110,
    baseY: CANVAS_HEIGHT - 200,
    y: CANVAS_HEIGHT - 200,
    waveOffset: Math.PI / 2,
    swayOffset: Math.PI, // Start at different phase
    swaySpeed: 0.02,
    swayAmount: 8,
    scale: 1,
    type: 'bloomed',
    bloomProgress: 1.0,
    bloomSpeed: 0.001,
    scentTimer: 0,
    scentParticles: [],
    attractedInsects: [],
    health: 5,
    maxHealth: 5,
    isBeingAttacked: false,
    attackTimer: 0,
    nectarLevel: 5,
    maxNectar: 5,
    insectAtFlower: null,
    suckingTimer: 0,
    suckingDuration: 180,
    suckingProgress: 0,
    petalParticles: [], // Falling petals when wilting
    pollenAmount: 1000,
    maxPollen: 1000
};

// Update lotus flowers and scent particles
export function updateLotusFlowers() {
    const bothBloomed = lotusFlower.bloomProgress >= 1.0 && lotusFlower2.bloomProgress >= 1.0;
    const attractionMultiplier = bothBloomed ? 2.0 : 1.0;

    // Update wind sway animation
    lotusFlower.swayOffset += lotusFlower.swaySpeed;
    lotusFlower2.swayOffset += lotusFlower2.swaySpeed;

    // Check if insects need to be redirected from wilted flowers to bloomed ones
    [lotusFlower, lotusFlower2].forEach(flower => {
        if (flower.insectAtFlower && flower.nectarLevel <= 0) {
            // Release insect from wilted flower
            const insect = flower.insectAtFlower;
            insect.isAtFlower = false;
            flower.insectAtFlower = null;
            flower.suckingTimer = 0;
            flower.suckingProgress = 0;
            
            // Redirect to other flower if it has nectar
            const otherFlower = flower === lotusFlower ? lotusFlower2 : lotusFlower;
            if (otherFlower.bloomProgress >= 1.0 && otherFlower.nectarLevel > 0) {
                const dx = otherFlower.x - insect.x;
                const dy = otherFlower.y - insect.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    insect.directionX = dx / dist;
                    insect.directionY = dy / dist;
                }
            } else {
                // Both flowers wilted, release insect randomly
                insect.directionX = (Math.random() - 0.5) * 2;
                insect.directionY = (Math.random() - 0.5) * 2;
            }
        }
    });

    [lotusFlower, lotusFlower2].forEach(flower => {
        // Update attack timer
        if (flower.attackTimer > 0) {
            flower.attackTimer--;
            if (flower.attackTimer <= 0) {
                flower.isBeingAttacked = false;
            }
        }

        // Update pollen amount for this flower - ONLY when bloomed (regardless of bloomProgress)
        if (gameState.state === 'playing' && flower.type === 'bloomed') {
            // Skip pollen decrease if just restored from digest potion
            if (flower.justRestored) {
                flower.justRestored = false; // Reset flag after one frame
            } else {
                let decreaseRate;
                
                if (flower.insectAtFlower) {
                    // Decrease faster when insect is sucking: 50 per second
                    decreaseRate = 50 / 60;
                } else {
                    // Variable decrease rate based on pollen amount
                    if (flower.pollenAmount > 500) {
                        // Above 500: slower rate (5 per second)
                        decreaseRate = 5 / 60;
                    } else {
                        // At or below 500: double speed (20 per second)
                        decreaseRate = 20 / 60;
                    }
                }
                
                flower.pollenAmount -= decreaseRate;
                
                // Clamp to 0 minimum
                if (flower.pollenAmount < 0) {
                    flower.pollenAmount = 0;
                }
            }
        }

        // Update flower state based on pollen amount (only for bloomed flowers)
        if (flower.type === 'bloomed') {
            // Calculate wilting stages based on pollen amount
            if (flower.pollenAmount <= 0) {
                // Stage 4: Completely wilted (0 pollen)
                flower.bloomProgress = 0;
                flower.type = 'wilted';
                flower.nectarLevel = 0;
                
                // Release any insect at the flower
                if (flower.insectAtFlower) {
                    const insect = flower.insectAtFlower;
                    insect.isAtFlower = false;
                    flower.insectAtFlower = null;
                    flower.suckingTimer = 0;
                    flower.suckingProgress = 0;
                    insect.directionX = (Math.random() - 0.5) * 2;
                    insect.directionY = (Math.random() - 0.5) * 2;
                }
            } else if (flower.pollenAmount <= 100) {
                // Stage 3: Very wilted (1-100 pollen) - 20% bloom, 10% nectar
                flower.bloomProgress = 0.2 + (flower.pollenAmount / 100) * 0.1; // 0.2 to 0.3
                flower.nectarLevel = (flower.pollenAmount / 100) * 0.5; // 0 to 0.5
            } else if (flower.pollenAmount <= 300) {
                // Stage 2: Moderately wilted (101-300 pollen) - 30-60% bloom, 10-40% nectar
                flower.bloomProgress = 0.3 + ((flower.pollenAmount - 100) / 200) * 0.3; // 0.3 to 0.6
                flower.nectarLevel = 0.5 + ((flower.pollenAmount - 100) / 200) * 1.5; // 0.5 to 2
            } else if (flower.pollenAmount <= 500) {
                // Stage 1: Slightly wilted (301-500 pollen) - 60-100% bloom, 40-80% nectar
                flower.bloomProgress = 0.6 + ((flower.pollenAmount - 300) / 200) * 0.4; // 0.6 to 1.0
                flower.nectarLevel = 2 + ((flower.pollenAmount - 300) / 200) * 2; // 2 to 4
            } else {
                // Fully healthy (>500 pollen) - 100% bloom, 100% nectar
                flower.bloomProgress = 1.0;
                flower.nectarLevel = flower.maxNectar; // Always full nectar when pollen > 500
            }
        }

        // Handle blooming animation
        if (flower.type === 'bud' && gameState.state === 'playing') {
            if (flower.bloomDelay > 0) {
                flower.bloomDelay--;
            } else if (flower.bloomProgress < 1.0) {
                flower.bloomProgress += flower.bloomSpeed;

                if (flower.targetScale) {
                    const startScale = 0.7;
                    flower.scale = startScale + (flower.targetScale - startScale) * flower.bloomProgress;
                }

                if (flower.bloomProgress >= 1.0) {
                    flower.bloomProgress = 1.0;
                    flower.type = 'bloomed';
                    if (flower.targetScale) {
                        flower.scale = flower.targetScale;
                    }
                }
            }
        }

        // Handle wilted flower - disappear after 10 seconds
        if (flower.type === 'wilted' && gameState.state === 'playing') {
            if (!flower.wiltedTimer) {
                flower.wiltedTimer = 0;
            }
            flower.wiltedTimer++;
            
            // Gradually fade out over 10 seconds (600 frames)
            flower.fadeProgress = flower.wiltedTimer / 600;
            
            // After 10 seconds, disappear completely
            if (flower.wiltedTimer >= 600) {
                flower.type = 'disappeared';
                flower.bloomProgress = 0;
                flower.fadeProgress = 1;
            }
        }

        // Handle insect sucking nectar
        if (flower.insectAtFlower) {
            const insect = flower.insectAtFlower;
            const dx = flower.x - insect.x;
            const dy = flower.y - insect.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Keep insect at flower
            if (dist < 30) {
                insect.x = flower.x + Math.sin(Date.now() * 0.005) * 5;
                insect.y = flower.y + Math.cos(Date.now() * 0.005) * 5;
                
                // Check if this is the only bloomed flower
                const otherFlower = flower === lotusFlower ? lotusFlower2 : lotusFlower;
                const isOnlyBloomedFlower = otherFlower.type === 'wilted' || otherFlower.bloomProgress < 1.0;
                
                // If only 1 flower is bloomed, drain nectar faster (2x speed)
                const drainSpeed = isOnlyBloomedFlower ? 2 : 1;
                flower.suckingTimer += drainSpeed;
                
                // Update sucking progress (0 to 1)
                flower.suckingProgress = flower.suckingTimer / flower.suckingDuration;
                
                // Gradually reduce nectar level as insect sucks (only decrease, never increase)
                const targetNectarLevel = flower.maxNectar - (flower.suckingProgress * flower.maxNectar);
                if (targetNectarLevel < flower.nectarLevel) {
                    flower.nectarLevel = targetNectarLevel;
                    
                    // Drop petals gradually - about 10-15 petals total over the duration
                    // Random chance to drop petal each frame
                    if (Math.random() < 0.05) { // 5% chance per frame = ~9 petals over 180 frames
                        const angle = Math.random() * Math.PI * 2;
                        const speed = 0.5 + Math.random() * 1.5;
                        flower.petalParticles.push({
                            x: Math.cos(angle) * 15, // Start from flower edge
                            y: Math.sin(angle) * 15,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed - 1,
                            rotation: Math.random() * Math.PI * 2,
                            rotationSpeed: (Math.random() - 0.5) * 0.2,
                            size: 8 + Math.random() * 6,
                            alpha: 1.0,
                            gravity: 0.15,
                            color: Math.random() > 0.5 ? '#fce7f3' : '#fbcfe8'
                        });
                    }
                }

                // Check if sucking time is up - just release insect, don't force wilt
                // Flower wilting is now controlled by pollenAmount, not nectarLevel
                if (flower.suckingTimer >= flower.suckingDuration) {
                    flower.suckingTimer = 0;
                    flower.suckingProgress = 0;
                    
                    // Release insect
                    insect.isAtFlower = false;
                    flower.insectAtFlower = null;
                    insect.directionX = (Math.random() - 0.5) * 2;
                    insect.directionY = (Math.random() - 0.5) * 2;
                }
            } else {
                // Insect moved away - keep current nectar level (no restoration)
                insect.isAtFlower = false;
                flower.insectAtFlower = null;
                flower.suckingTimer = 0;
                flower.suckingProgress = 0;
            }
        }

        // Direct attraction to flower (always active when flower has pollen)
        if (flower.type === 'bloomed' && flower.pollenAmount > 0 && gameState.state === 'playing' && !flower.insectAtFlower) {
            for (let enemy of enemies) {
                if (enemy.isAtFlower) continue;
                
                const dx = flower.x - enemy.x;
                const dy = flower.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Strong direct attraction within 250 pixels
                if (dist < 250 && dist > 40) {
                    const attractionForce = 0.15 * attractionMultiplier;
                    enemy.directionX += (dx / dist) * attractionForce;
                    enemy.directionY += (dy / dist) * attractionForce;

                    const mag = Math.sqrt(enemy.directionX ** 2 + enemy.directionY ** 2);
                    if (mag > 0) {
                        enemy.directionX /= mag;
                        enemy.directionY /= mag;
                    }
                    
                    // Only attract one insect at a time
                    break;
                }
                
                // If insect is very close to flower, start sucking
                if (dist < 40) {
                    flower.insectAtFlower = enemy;
                    flower.suckingTimer = 0;
                    enemy.isAtFlower = true;
                    break;
                }
            }
        }

        // Clear attracted insects list each frame
        flower.attractedInsects = [];

        // Bloomed flowers with pollen produce scent
        if (flower.type === 'bloomed' && flower.health > 0 && flower.pollenAmount > 0) {
            flower.scentTimer++;

            const scentFrequency = bothBloomed ? 12 : 15;
            const particleCount = bothBloomed ? 6 : 4;

            if (flower.scentTimer % scentFrequency === 0 && gameState.state === 'playing') {
                for (let i = 0; i < particleCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 0.3 + Math.random() * 0.5;
                    flower.scentParticles.push({
                        x: 0,
                        y: -5,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 0.5,
                        life: 1.0,
                        size: bothBloomed ? (3.5 + Math.random() * 3) : (3 + Math.random() * 2.5),
                        color: Math.random() > 0.5 ? '#fbbf24' : '#fde047'
                    });
                }
            }

            // Update scent particles
            for (let i = flower.scentParticles.length - 1; i >= 0; i--) {
                const p = flower.scentParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy -= 0.02;
                p.life -= 0.008;

                // Attract nearby insects
                if (gameState.state === 'playing' && flower.attractedInsects.length < 3) {
                    const worldX = flower.x + p.x;
                    const worldY = flower.y + p.y;

                    for (let enemy of enemies) {
                        if (flower.attractedInsects.length >= 3) break;
                        if (flower.attractedInsects.includes(enemy)) continue;

                        const dx = worldX - enemy.x;
                        const dy = worldY - enemy.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        const attractionRange = bothBloomed ? 200 : 150;

                        if (dist < attractionRange && dist > 10) {
                            flower.attractedInsects.push(enemy);

                            const attractionForce = 0.12 * attractionMultiplier;
                            enemy.directionX += (dx / dist) * attractionForce;
                            enemy.directionY += (dy / dist) * attractionForce;

                            const mag = Math.sqrt(enemy.directionX ** 2 + enemy.directionY ** 2);
                            if (mag > 0) {
                                enemy.directionX /= mag;
                                enemy.directionY /= mag;
                            }
                        }
                    }
                }

                if (p.life <= 0) {
                    flower.scentParticles.splice(i, 1);
                }
            }
        }
        
        // Update falling petal particles
        for (let i = flower.petalParticles.length - 1; i >= 0; i--) {
            const petal = flower.petalParticles[i];
            petal.x += petal.vx;
            petal.y += petal.vy;
            petal.vy += petal.gravity; // Apply gravity
            petal.vx *= 0.98; // Air resistance
            petal.rotation += petal.rotationSpeed;
            petal.alpha -= 0.008;
            
            // Remove petal if off screen or faded
            if (petal.alpha <= 0 || petal.y > 100) {
                flower.petalParticles.splice(i, 1);
            }
        }
    });
}

// Update lotus position based on lily pad wave
export function updateLotusPosition(levelHeightBonus) {
    const lotusRise = levelHeightBonus * 0.3;
    lotusFlower.y = (lotusFlower.baseY - lotusRise) + Math.sin(frogLilyPad.waveOffset + lotusFlower.waveOffset) * (frogLilyPad.waveAmplitude * 0.8);
    lotusFlower2.y = (lotusFlower2.baseY - lotusRise * 0.5) + Math.sin(frogLilyPad.waveOffset + lotusFlower2.waveOffset) * (frogLilyPad.waveAmplitude * 0.7);
}

// Draw lotus flower
export function drawLotusFlower(flower) {
    // Don't draw if completely disappeared
    if (flower.type === 'disappeared') {
        return;
    }
    
    ctx.save();
    ctx.translate(flower.x, flower.y);
    
    // Apply fade effect for wilted flowers
    if (flower.type === 'wilted' && flower.fadeProgress) {
        ctx.globalAlpha = 1 - flower.fadeProgress;
    }

    // Shake effect when being attacked by caterpillar
    if (flower.isBeingAttacked && flower.attackTimer > 0) {
        const shakeIntensity = 3 * (flower.attackTimer / 20);
        const shakeX = Math.sin(flower.attackTimer * 0.8) * shakeIntensity;
        const shakeY = Math.cos(flower.attackTimer * 1.2) * shakeIntensity * 0.5;
        ctx.translate(shakeX, shakeY);
    }
    
    const scale = flower.scale || 1;
    ctx.scale(scale, scale);

    // Calculate wither amount based on pollen
    let witherAmount;
    if (flower.pollenAmount > 500) {
        witherAmount = 0; // Always fresh when pollen > 500
    } else {
        // Wither gradually from 0 (at 500) to 1 (at 0)
        witherAmount = 1 - (flower.pollenAmount / 500);
    }
    const sizeReduction = 1 - (witherAmount * 0.3);
    
    // Draw lotus leaf first (no sway)
    const leafColor = witherAmount > 0 ? shadeColor('#22c55e', -40 * witherAmount * 100) : '#22c55e';
    ctx.fillStyle = leafColor;
    ctx.beginPath();
    ctx.ellipse(0, 130, 22, 11, 0, 0.2, Math.PI * 2 - 0.2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(1, 131, 22, 11, 0, 0.2, Math.PI * 2 - 0.2);
    ctx.fill();

    // Draw stem without sway - keep straight
    ctx.save();
    
    if (witherAmount > 0) {
        ctx.rotate(witherAmount * 0.3);
    }
    
    ctx.scale(sizeReduction, sizeReduction);

    // Stem colors
    const stemColor1 = witherAmount > 0 ? shadeColor('#15803d', -30 * witherAmount * 100) : '#15803d';
    const stemColor2 = witherAmount > 0 ? shadeColor('#16a34a', -30 * witherAmount * 100) : '#16a34a';
    const stemColor3 = witherAmount > 0 ? shadeColor('#166534', -30 * witherAmount * 100) : '#166534';

    // Stem - straight line
    const stemGradient = ctx.createLinearGradient(-2, 130, 2, 0);
    stemGradient.addColorStop(0, stemColor3);
    stemGradient.addColorStop(0.5, stemColor2);
    stemGradient.addColorStop(1, stemColor1);
    ctx.strokeStyle = stemGradient;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 130);
    ctx.lineTo(0, 0);
    ctx.stroke();

    ctx.strokeStyle = `rgba(34, 197, 94, ${0.6 * (1 - witherAmount * 0.8)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, 130);
    ctx.lineTo(-2, 0);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, 132);
    ctx.lineTo(2, 2);
    ctx.stroke();

    // Apply wind sway only to flower (not stem)
    const swayX = Math.sin(flower.swayOffset) * flower.swayAmount;
    const swayRotation = Math.sin(flower.swayOffset) * 0.05;
    ctx.translate(swayX, 0);
    ctx.rotate(swayRotation);

    if (flower.type === 'bloomed' || flower.bloomProgress > 0) {
        const openAmount = flower.bloomProgress;
        
        // Calculate how many petals to show based on pollen amount
        // Above 500: show all 8 petals (fully bloomed)
        // Below 500: gradually lose petals from 8 to 0
        const totalOuterPetals = 8;
        let visibleOuterPetals;
        if (flower.pollenAmount > 500) {
            visibleOuterPetals = totalOuterPetals; // Always 8 petals when healthy
        } else {
            const petalRatio = flower.pollenAmount / 500; // 0 to 1 (based on 0-500 range)
            visibleOuterPetals = Math.ceil(totalOuterPetals * petalRatio);
        }

        // Outer petals (show fewer as nectar depletes)
        ctx.fillStyle = '#ec4899';
        ctx.shadowColor = 'rgba(236, 72, 153, 0.3)';
        ctx.shadowBlur = 8;
        for (let i = 0; i < visibleOuterPetals; i++) {
            const angle = (i * Math.PI / 4) - Math.PI / 2;
            ctx.save();
            ctx.rotate(angle);

            const petalDistance = -28 + (openAmount * 6);
            const petalWidth = 13 * (0.6 + openAmount * 0.4);
            const petalRotation = (1 - openAmount) * 0.8;

            ctx.rotate(petalRotation);

            const petalColor1 = witherAmount > 0 ? shadeColor('#fce7f3', -50 * witherAmount * 100) : '#fce7f3';
            const petalColor2 = witherAmount > 0 ? shadeColor('#f9a8d4', -50 * witherAmount * 100) : '#f9a8d4';
            const petalColor3 = witherAmount > 0 ? shadeColor('#ec4899', -50 * witherAmount * 100) : '#ec4899';

            const petalGradient = ctx.createRadialGradient(0, -22, 0, 0, petalDistance, 12);
            petalGradient.addColorStop(0, petalColor1);
            petalGradient.addColorStop(0.5, petalColor2);
            petalGradient.addColorStop(1, petalColor3);
            ctx.fillStyle = petalGradient;

            ctx.beginPath();
            ctx.ellipse(0, petalDistance, petalWidth, 24, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(236, 72, 153, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(0, petalDistance - 7);
            ctx.stroke();

            ctx.restore();
        }
        ctx.shadowBlur = 0;

        // Middle petals (show fewer as flower wilts)
        if (openAmount > 0.3) {
            const layerAlpha = Math.min((openAmount - 0.3) / 0.7, 1);
            ctx.globalAlpha = layerAlpha;
            
            const totalMiddlePetals = 8;
            let visibleMiddlePetals;
            if (flower.pollenAmount > 500) {
                visibleMiddlePetals = totalMiddlePetals; // Always 8 petals when healthy
            } else {
                const petalRatio = flower.pollenAmount / 500;
                visibleMiddlePetals = Math.ceil(totalMiddlePetals * petalRatio);
            }

            for (let i = 0; i < visibleMiddlePetals; i++) {
                const angle = (i * Math.PI / 4) - Math.PI / 2 + 0.2;
                ctx.save();
                ctx.rotate(angle);

                const petalDistance = -22 + (openAmount * 3);
                const petalWidth = 11 * (0.7 + openAmount * 0.3);
                const petalRotation = (1 - openAmount) * 0.5;

                ctx.rotate(petalRotation);

                const petalGradient = ctx.createRadialGradient(0, -18, 0, 0, petalDistance, 10);
                petalGradient.addColorStop(0, '#fef3c7');
                petalGradient.addColorStop(0.4, '#fbcfe8');
                petalGradient.addColorStop(1, '#f9a8d4');
                ctx.fillStyle = petalGradient;

                ctx.beginPath();
                ctx.ellipse(0, petalDistance, petalWidth, 20, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.beginPath();
                ctx.ellipse(-2, petalDistance - 3, 4, 8, -0.3, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
            ctx.globalAlpha = 1;
        }

        // Inner petals
        if (openAmount > 0.6) {
            const layerAlpha = Math.min((openAmount - 0.6) / 0.4, 1);
            ctx.globalAlpha = layerAlpha;

            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI / 3) - Math.PI / 2 + 0.4;
                ctx.save();
                ctx.rotate(angle);

                const petalDistance = -15 + (openAmount * 2);
                const petalWidth = 9 * (0.8 + openAmount * 0.2);

                const petalGradient = ctx.createRadialGradient(0, -12, 0, 0, petalDistance, 8);
                petalGradient.addColorStop(0, '#fffbeb');
                petalGradient.addColorStop(0.5, '#fce7f3');
                petalGradient.addColorStop(1, '#fbcfe8');
                ctx.fillStyle = petalGradient;

                ctx.beginPath();
                ctx.ellipse(0, petalDistance, petalWidth, 16, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
            ctx.globalAlpha = 1;
        }

        // Center (yellow stamen)
        if (openAmount > 0.4) {
            const centerSize = 10 * Math.min((openAmount - 0.4) / 0.6, 1);
            const centerGradient = ctx.createRadialGradient(0, -5, 0, 0, -5, centerSize);
            centerGradient.addColorStop(0, '#fef08a');
            centerGradient.addColorStop(0.6, '#fbbf24');
            centerGradient.addColorStop(1, '#f59e0b');
            ctx.fillStyle = centerGradient;
            ctx.beginPath();
            ctx.arc(0, -5, centerSize, 0, Math.PI * 2);
            ctx.fill();

            if (openAmount > 0.8) {
                const stamenAlpha = (openAmount - 0.8) / 0.2;
                ctx.globalAlpha = stamenAlpha;

                ctx.fillStyle = '#f59e0b';
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI * 2 / 8) + Date.now() * 0.0005;
                    const radius = 5;
                    ctx.beginPath();
                    ctx.arc(Math.cos(angle) * radius, -5 + Math.sin(angle) * radius, 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.fillStyle = '#dc2626';
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI * 2 / 8) + Date.now() * 0.0005;
                    const radius = 5;
                    ctx.beginPath();
                    ctx.arc(Math.cos(angle) * radius, -5 + Math.sin(angle) * radius, 1, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.globalAlpha = 1;
            }
        }

    } else if (flower.type === 'bud' && flower.bloomProgress === 0) {
        // Lotus bud (closed flower)
        ctx.fillStyle = '#16a34a';
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2 / 5) - Math.PI / 2;
            ctx.save();
            ctx.rotate(angle);

            const sepalGradient = ctx.createLinearGradient(0, -15, 0, -30);
            sepalGradient.addColorStop(0, '#22c55e');
            sepalGradient.addColorStop(1, '#15803d');
            ctx.fillStyle = sepalGradient;

            ctx.beginPath();
            ctx.ellipse(0, -25, 8, 18, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#14532d';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(0, -32);
            ctx.stroke();

            ctx.restore();
        }

        const budGradient = ctx.createRadialGradient(0, -15, 0, 0, -15, 14);
        budGradient.addColorStop(0, '#fce7f3');
        budGradient.addColorStop(0.5, '#f9a8d4');
        budGradient.addColorStop(1, '#ec4899');
        ctx.fillStyle = budGradient;
        ctx.beginPath();
        ctx.ellipse(0, -15, 10, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-3, -20, 4, 8, -0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.ellipse(0, -28, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw scent particles
    if (flower.bloomProgress >= 1.0) {
        for (let p of flower.scentParticles) {
            ctx.save();
            ctx.globalAlpha = p.life * 0.6;

            const scentGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            scentGradient.addColorStop(0, p.color);
            scentGradient.addColorStop(0.5, 'rgba(253, 224, 71, 0.6)');
            scentGradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
            ctx.fillStyle = scentGradient;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            if (p.life > 0.7) {
                ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
                ctx.beginPath();
                ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    // Draw falling petal particles
    for (let petal of flower.petalParticles) {
        ctx.save();
        ctx.globalAlpha = petal.alpha;
        ctx.translate(petal.x, petal.y);
        ctx.rotate(petal.rotation);
        
        // Draw petal shape (ellipse)
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, petal.size);
        gradient.addColorStop(0, petal.color);
        gradient.addColorStop(0.7, '#f9a8d4');
        gradient.addColorStop(1, 'rgba(251, 207, 232, 0.3)');
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.ellipse(0, 0, petal.size, petal.size * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Add highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${petal.alpha * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(-petal.size * 0.3, -petal.size * 0.5, petal.size * 0.3, petal.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    ctx.restore(); // Close the stem and flower rotation
    ctx.restore(); // Close the main translation
    
    // Display pollen amount above the flower - HIDDEN
    // if (flower.type !== 'disappeared') {
    //     ctx.save();
    //     ctx.translate(flower.x, flower.y - 80);
    //     
    //     // Background
    //     ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    //     ctx.fillRect(-30, -12, 60, 20);
    //     
    //     // Border
    //     ctx.strokeStyle = flower.pollenAmount < 500 ? '#ef4444' : '#22c55e';
    //     ctx.lineWidth = 2;
    //     ctx.strokeRect(-30, -12, 60, 20);
    //     
    //     // Text
    //     ctx.fillStyle = flower.pollenAmount < 500 ? '#fca5a5' : '#86efac';
    //     ctx.font = 'bold 12px Arial';
    //     ctx.textAlign = 'center';
    //     ctx.textBaseline = 'middle';
    //     ctx.fillText(Math.floor(flower.pollenAmount), 0, -2);
    //     
    //     ctx.restore();
    // }
}

