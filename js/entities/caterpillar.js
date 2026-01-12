// Caterpillar system - inchworms that climb up the lily pad stem and eat leaves
import { ctx } from '../utils/canvas.js';
import { gameState } from '../state.js';
import { CANVAS_HEIGHT } from '../config.js';
import { playCaterpillarWarningSound, playBoongSound } from '../audio/audio.js';

// Caterpillar state
export const caterpillars = [];

let frogLilyPadRef = null;
let frogStateRef = null;

// Caterpillar spawn timer
let caterpillarSpawnTimer = 0;
const CATERPILLAR_SPAWN_INTERVAL = 360; // 6 seconds (60 fps * 6)

// Initialize caterpillar system
export function initCaterpillars(frogLilyPad, frogState) {
    frogLilyPadRef = frogLilyPad;
    frogStateRef = frogState;
}

// Create a new caterpillar on the stem
function spawnCaterpillar() {
    if (!frogLilyPadRef) return;

    // Level-based multiplier (increases with frogState level)
    // Cap level at 15 to prevent excessive speed
    const cappedLevel = Math.min(frogStateRef ? frogStateRef.level : 1, 15);
    const levelMultiplier = 1 + cappedLevel * 0.15;

    const caterpillar = {
        // Position on stem (0 = bottom, 1 = top at lily pad)
        stemProgress: 0,
        x: frogLilyPadRef.x,
        y: CANVAS_HEIGHT + 10, // Start at bottom of stem

        state: 'climbing', // climbing, movingToEdge, eating, eaten

        // Inchworm movement
        phase: 0, // 0-1 for inchworm cycle
        phaseSpeed: 0.03 * levelMultiplier, // Faster climbing with level
        basePhaseSpeed: 0.03 * levelMultiplier, // Store original speed
        bodyLength: 24, // Keep size constant
        contractedLength: 12, // Keep size constant
        currentLength: 24,

        // Body properties
        segmentCount: 6,
        headY: 0,
        tailY: 0,

        // Growth system
        size: 1.0, // Keep size constant (only grows when eating)
        timesEaten: 0, // How many times it has eaten
        baseNutrition: 5, // Base points
        levelMultiplier: levelMultiplier, // Store for damage calculation

        // Eating
        eatingTimer: 0,
        eatingInterval: 180, // Eat every 3 seconds
        edgeOffset: 0,
        targetEdgeX: 0,
        edgeSide: 0, // -1 left, 1 right

        // Visual
        wiggleOffset: Math.random() * Math.PI * 2,
        color: '#7cb342',
        isEaten: false,

        // Dying state properties
        dyingRotation: 0,
        dyingRotationSpeed: 0,
        dyingVelocityX: 0,
        dyingVelocityY: 0,
        dyingGravity: 0.3,

        // Hover state
        isHovered: false,
        
        // Hit counter (for when on lily pad)
        hitCounter: 0,
        requiredHits: 3 // Needs 3 hits when on lily pad
    };

    caterpillars.push(caterpillar);
}

// Get stem position at a given progress (0-1)
function getStemPosition(progress) {
    if (!frogLilyPadRef) return { x: 0, y: 0 };

    const stemStartY = CANVAS_HEIGHT + 20;
    const stemEndY = frogLilyPadRef.y + 10;

    const t = progress;
    const baseX = frogLilyPadRef.x;
    const curveX = Math.sin(t * Math.PI) * 15 * Math.sin(frogLilyPadRef.waveOffset);

    return {
        x: baseX + curveX,
        y: stemStartY + (stemEndY - stemStartY) * t
    };
}

// Update caterpillars
export function updateCaterpillars() {
    if (gameState.state !== 'playing') return;
    if (!frogLilyPadRef) return;

    // Spawn timer
    caterpillarSpawnTimer++;
    if (caterpillarSpawnTimer >= CATERPILLAR_SPAWN_INTERVAL) {
        caterpillarSpawnTimer = 0;
        // Max 2 caterpillars at a time
        if (caterpillars.length < 2) {
            spawnCaterpillar();
        }
    }

    // Update each caterpillar
    for (let i = caterpillars.length - 1; i >= 0; i--) {
        const cat = caterpillars[i];

        if (cat.isEaten) {
            caterpillars.splice(i, 1);
            continue;
        }

        // Check hover state - hover when mouse is near stem
        cat.isHovered = false;
        let mouseDistance = Infinity;
        if (cat.state !== 'dying') {
            // Simple hover detection: check if mouse is near the stem (X axis)
            const stemX = frogLilyPadRef.x;
            const distanceFromStem = Math.abs(gameState.mouseX - stemX);
            
            // Hover radius: larger when on lily pad for easier targeting
            const hoverRadius = (cat.state === 'eating' || cat.state === 'movingToEdge') ? 50 : 35;
            
            if (distanceFromStem < hoverRadius) {
                // Check if mouse Y is in range of caterpillar position
                const yMin = cat.y - 40;
                const yMax = cat.y + 40;
                if (gameState.mouseY >= yMin && gameState.mouseY <= yMax) {
                    cat.isHovered = true;
                    mouseDistance = distanceFromStem;
                }
            }
        }

        // Slow down caterpillar when hovered or mouse is near
        let speedMultiplier = 1.0;
        if (cat.state !== 'dying') {
            if (cat.isHovered) {
                // When hovered: slow down significantly (10% speed)
                speedMultiplier = 0.1;
            } else if (mouseDistance < 80) {
                // When mouse nearby but not hovered: gradual slowdown
                speedMultiplier = Math.max(0.3, mouseDistance / 80);
            }
        }

        cat.wiggleOffset += 0.05;

        if (cat.state === 'climbing') {
            // Inchworm movement up the stem (with slowdown when mouse near)
            cat.phaseSpeed = cat.basePhaseSpeed * speedMultiplier;
            cat.phase += cat.phaseSpeed;

            if (cat.phase >= 1) {
                cat.phase = 0;
                cat.stemProgress += 0.02;
            }

            // Inchworm body contraction/extension
            if (cat.phase < 0.5) {
                const contractPhase = cat.phase * 2;
                cat.currentLength = cat.bodyLength - (cat.bodyLength - cat.contractedLength) * Math.sin(contractPhase * Math.PI);
            } else {
                const extendPhase = (cat.phase - 0.5) * 2;
                cat.currentLength = cat.contractedLength + (cat.bodyLength - cat.contractedLength) * Math.sin(extendPhase * Math.PI);
            }

            // Get position on stem - ALWAYS update to follow stem movement
            const stemPos = getStemPosition(cat.stemProgress);
            cat.x = stemPos.x; // Update x every frame to follow stem sway
            cat.y = stemPos.y;

            // Check if reached lily pad
            if (cat.stemProgress >= 1) {
                cat.state = 'movingToEdge';
                cat.edgeSide = Math.random() > 0.5 ? 1 : -1;
                cat.targetEdgeX = frogLilyPadRef.x + cat.edgeSide * 50;
                cat.currentLength = cat.bodyLength;
            }
        } else if (cat.state === 'movingToEdge') {
            // Move horizontally to edge of lily pad with inchworm motion (with slowdown)
            cat.phaseSpeed = cat.basePhaseSpeed * speedMultiplier;
            cat.phase += cat.phaseSpeed;

            // Update target edge position to follow lily pad movement
            cat.targetEdgeX = frogLilyPadRef.x + cat.edgeSide * 50;

            if (cat.phase >= 1) {
                cat.phase = 0;
                const dx = cat.targetEdgeX - cat.x;
                cat.x += Math.sign(dx) * 3;
            }

            if (cat.phase < 0.5) {
                cat.currentLength = cat.bodyLength - (cat.bodyLength - cat.contractedLength) * Math.sin(cat.phase * 2 * Math.PI);
            } else {
                cat.currentLength = cat.contractedLength + (cat.bodyLength - cat.contractedLength) * Math.sin((cat.phase - 0.5) * 2 * Math.PI);
            }

            cat.y = frogLilyPadRef.y + 5;

            if (Math.abs(cat.x - cat.targetEdgeX) < 5) {
                cat.state = 'eating';
                cat.eatingTimer = 0;
                cat.currentLength = cat.bodyLength;
            }
        } else if (cat.state === 'eating') {
            // Stay at lily pad edge and eat - follow lily pad position
            cat.x = frogLilyPadRef.x + cat.edgeSide * 50; // Update x to follow lily pad
            cat.y = frogLilyPadRef.y + 5 + Math.sin(cat.wiggleOffset * 0.3) * 2;

            // Eating animation - small contract/extend
            cat.phase += cat.phaseSpeed * 0.5;
            if (cat.phase >= 1) cat.phase = 0;
            cat.currentLength = cat.bodyLength - 4 * Math.sin(cat.phase * Math.PI * 2);

            cat.eatingTimer++;

            // Eat leaf every interval
            if (cat.eatingTimer >= cat.eatingInterval) {
                cat.eatingTimer = 0;

                // Caterpillar grows when eating!
                cat.timesEaten++;
                cat.size = 1.0 + cat.timesEaten * 0.15; // Grow 15% each time
                cat.bodyLength = 24 * cat.size;
                cat.contractedLength = 12 * cat.size;

                // Add bite mark to lily pad
                const biteAngle = cat.edgeSide > 0 ?
                    (Math.random() * 0.8 - 0.4) : // Right side
                    (Math.PI + Math.random() * 0.8 - 0.4); // Left side

                frogLilyPadRef.biteMarks.push({
                    angle: biteAngle,
                    size: 5 + cat.size * 3 + Math.random() * 3,
                    depth: 5 + Math.random() * 10
                });
                // Damage increases with caterpillar's level multiplier
                const damageAmount = Math.ceil(1 * cat.levelMultiplier);
                frogLilyPadRef.damage = Math.min(frogLilyPadRef.damage + damageAmount, frogLilyPadRef.maxDamage);

                // Trigger red flash warning effect
                frogLilyPadRef.isFlashing = true;
                frogLilyPadRef.flashTimer = 0;

                // Play warning sound
                playCaterpillarWarningSound();

                // Reduce max weight of frog (more at higher levels)
                if (frogStateRef && frogStateRef.maxWeight > 100) {
                    const weightReduction = Math.ceil(10 * cat.levelMultiplier);
                    frogStateRef.maxWeight -= weightReduction;

                    // Visual feedback - trigger shake on lily pad
                    if (frogStateRef.weight > 200) {
                        frogStateRef.isShaking = true;
                        frogStateRef.shakeTimer = 0;
                    }
                }
            }
        } else if (cat.state === 'dying') {
            // Rolling and falling animation
            cat.dyingRotation += cat.dyingRotationSpeed;
            cat.x += cat.dyingVelocityX;
            cat.dyingVelocityY += cat.dyingGravity;
            cat.y += cat.dyingVelocityY;

            // Slow down horizontal movement
            cat.dyingVelocityX *= 0.98;

            // Remove when fallen into water (below canvas)
            if (cat.y > CANVAS_HEIGHT + 50) {
                cat.isEaten = true;
            }
        }
    }
}

// Draw caterpillars
export function drawCaterpillars() {
    for (const cat of caterpillars) {
        if (cat.isEaten) continue;

        ctx.save();

        // Apply rotation for dying state
        if (cat.state === 'dying') {
            ctx.translate(cat.x, cat.y);
            ctx.rotate(cat.dyingRotation);
            ctx.translate(-cat.x, -cat.y);
        }

        const scale = cat.size;
        const segmentSpacing = cat.currentLength / (cat.segmentCount - 1);

        // Draw from tail to head
        for (let i = cat.segmentCount - 1; i >= 0; i--) {
            let segmentX, segmentY;

            if (cat.state === 'climbing') {
                const segmentProgress = cat.stemProgress - (i * segmentSpacing / 200);
                const segPos = getStemPosition(Math.max(0, segmentProgress));
                segmentX = segPos.x + Math.sin(cat.wiggleOffset + i * 0.4) * 1.5;
                segmentY = segPos.y;
            } else if (cat.state === 'dying') {
                // Dying state - curled up ball shape
                const angle = (i / cat.segmentCount) * Math.PI * 1.5;
                const radius = 8 * scale;
                segmentX = cat.x + Math.cos(angle) * radius;
                segmentY = cat.y + Math.sin(angle) * radius;
            } else {
                const direction = cat.edgeSide;
                segmentX = cat.x - direction * i * segmentSpacing;
                segmentY = cat.y + Math.sin(cat.wiggleOffset + i * 0.4) * 1.5 * scale;
            }

            const isHead = i === 0;
            const isTail = i === cat.segmentCount - 1;
            let segmentRadius = 4 * scale;
            if (isHead) segmentRadius = 3.5 * scale;
            if (isTail) segmentRadius = 3 * scale;

            // During contraction, middle segments bulge
            if (cat.currentLength < cat.bodyLength * 0.8) {
                const middleness = 1 - Math.abs(i - cat.segmentCount / 2) / (cat.segmentCount / 2);
                segmentRadius += middleness * 1.5 * scale;
            }

            // Segment shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.arc(segmentX + 1, segmentY + 1, segmentRadius, 0, Math.PI * 2);
            ctx.fill();

            // Hover glow effect
            if (cat.isHovered) {
                ctx.save();
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#ef4444';
                ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
                ctx.beginPath();
                ctx.arc(segmentX, segmentY, segmentRadius + 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Segment body - gets darker as it grows, red tint when hovered
            const greenBase = Math.max(60, 123 - cat.timesEaten * 10);
            const greenValue = greenBase + i * 8;
            let segmentColor;
            if (cat.isHovered) {
                // Red/orange tint when hovered
                segmentColor = isHead ? `rgb(${180 + cat.timesEaten * 5}, ${60 - cat.timesEaten * 5}, 42)` :
                    `rgb(${180 + i * 5}, ${80 + i * 5}, ${50 - cat.timesEaten * 5})`;
            } else {
                // Normal green color
                segmentColor = isHead ? `rgb(${50 + cat.timesEaten * 5}, ${100 - cat.timesEaten * 5}, 42)` :
                    `rgb(${76 + i * 5}, ${greenValue}, ${66 - cat.timesEaten * 5})`;
            }
            ctx.fillStyle = segmentColor;
            ctx.beginPath();
            ctx.arc(segmentX, segmentY, segmentRadius, 0, Math.PI * 2);
            ctx.fill();

            // Segment highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.beginPath();
            ctx.arc(segmentX - segmentRadius * 0.3, segmentY - segmentRadius * 0.3, segmentRadius * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Draw head details (skip when dying)
            if (isHead && cat.state !== 'dying') {
                // Eyes - bigger when fat
                ctx.fillStyle = '#000';
                const eyeSize = 0.8 * scale;
                const eyeOffset = cat.state === 'climbing' ?
                    { x: 1.5 * scale, y: -2 * scale } :
                    { x: 2 * scale, y: -1 * scale };
                ctx.beginPath();
                ctx.arc(segmentX - eyeOffset.x, segmentY + eyeOffset.y, eyeSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(segmentX + eyeOffset.x, segmentY + eyeOffset.y, eyeSize, 0, Math.PI * 2);
                ctx.fill();

                // Antennae
                ctx.strokeStyle = `rgb(${50 + cat.timesEaten * 5}, ${100 - cat.timesEaten * 5}, 42)`;
                ctx.lineWidth = 0.8 * scale;
                if (cat.state === 'climbing') {
                    ctx.beginPath();
                    ctx.moveTo(segmentX - 1.5 * scale, segmentY - 3 * scale);
                    ctx.lineTo(segmentX - 3 * scale, segmentY - 6 * scale);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(segmentX + 1.5 * scale, segmentY - 3 * scale);
                    ctx.lineTo(segmentX + 3 * scale, segmentY - 6 * scale);
                    ctx.stroke();
                } else {
                    const dir = cat.edgeSide;
                    ctx.beginPath();
                    ctx.moveTo(segmentX + dir * 3 * scale, segmentY - 1 * scale);
                    ctx.lineTo(segmentX + dir * 6 * scale, segmentY - 3 * scale);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(segmentX + dir * 3 * scale, segmentY + 1 * scale);
                    ctx.lineTo(segmentX + dir * 6 * scale, segmentY + 2 * scale);
                    ctx.stroke();
                }

                // Mouth when eating - bigger when fat
                if (cat.state === 'eating') {
                    const mouthOpen = Math.abs(Math.sin(cat.wiggleOffset * 3));
                    ctx.fillStyle = '#3d6b23';
                    ctx.beginPath();
                    const dir = cat.edgeSide;
                    ctx.arc(segmentX + dir * 3 * scale, segmentY, (1 + mouthOpen) * scale, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Draw prolegs on middle segments (skip when dying)
            if (i > 0 && i < cat.segmentCount - 1 && i % 2 === 0 && cat.state !== 'dying') {
                ctx.strokeStyle = '#5a8c3a';
                ctx.lineWidth = 1 * scale;

                if (cat.state === 'climbing') {
                    ctx.beginPath();
                    ctx.moveTo(segmentX - segmentRadius, segmentY);
                    ctx.lineTo(segmentX - segmentRadius - 2 * scale, segmentY + 1 * scale);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(segmentX + segmentRadius, segmentY);
                    ctx.lineTo(segmentX + segmentRadius + 2 * scale, segmentY + 1 * scale);
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(segmentX, segmentY + segmentRadius);
                    ctx.lineTo(segmentX - 1 * scale, segmentY + segmentRadius + 2 * scale);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(segmentX, segmentY + segmentRadius);
                    ctx.lineTo(segmentX + 1 * scale, segmentY + segmentRadius + 2 * scale);
                    ctx.stroke();
                }
            }
        }

        ctx.restore();
    }
}

// Check if stem is hit (for caterpillar hit detection)
export function checkCaterpillarHit(hookX, hookY) {
    for (const cat of caterpillars) {
        if (cat.isEaten || cat.state === 'dying') continue;

        // Check if click is near the stem
        const stemX = frogLilyPadRef.x;
        const distanceFromStem = Math.abs(hookX - stemX);
        
        // Hit radius: larger when on lily pad
        const hitRadius = (cat.state === 'eating' || cat.state === 'movingToEdge') ? 50 : 35;
        
        if (distanceFromStem < hitRadius) {
            // Check if click Y is in range of caterpillar
            const yMin = cat.y - 40;
            const yMax = cat.y + 40;
            
            if (hookY >= yMin && hookY <= yMax) {
                // Hit detected!
                if (cat.state === 'climbing') {
                    // When climbing: 1 hit = fall
                    return cat;
                } else if (cat.state === 'eating' || cat.state === 'movingToEdge') {
                    // When on lily pad: need 3 hits
                    cat.hitCounter++;
                    
                    // Visual feedback - flash red
                    cat.isHovered = true;
                    
                    if (cat.hitCounter >= cat.requiredHits) {
                        return cat;
                    }
                    // Return null but show visual feedback
                    return null;
                }
            }
        }
    }
    return null;
}

// Mark caterpillar as eaten - returns nutrition based on size
export function eatCaterpillar(cat) {
    cat.isEaten = true;
    // Bigger caterpillars give more points!
    const points = Math.floor(cat.baseNutrition * cat.size);
    return points;
}

// Kill caterpillar - triggers dying animation (roll and fall into water)
export function killCaterpillar(cat) {
    if (cat.state === 'dying') return 0;

    cat.state = 'dying';

    // Play boong sound when hitting caterpillar
    playBoongSound();

    // Random roll direction
    const direction = Math.random() > 0.5 ? 1 : -1;
    cat.dyingRotationSpeed = direction * (0.2 + Math.random() * 0.3);
    cat.dyingVelocityX = direction * (2 + Math.random() * 2);
    cat.dyingVelocityY = -3 - Math.random() * 2; // Initial upward bounce
    cat.currentLength = cat.bodyLength; // Reset to normal length

    // Return points immediately
    const points = Math.floor(cat.baseNutrition * cat.size);
    return points;
}

// Reset caterpillars
export function resetCaterpillars() {
    caterpillars.length = 0;
    caterpillarSpawnTimer = 0;
}
