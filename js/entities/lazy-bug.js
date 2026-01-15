// Ladybug system - ladybugs that climb up the lily pad stem and add weight to the frog
// Appears at level 8+, frog uses tongue to push them down
// Ladybug stops 50px below frog when reaching 200 weight, continues climbing if frog moves up
import { ctx } from '../utils/canvas.js';
import { gameState } from '../state.js';
import { CANVAS_HEIGHT } from '../config.js';
import { playFallInWaterSound } from '../audio/audio.js';

// Ladybug state
export const crabs = [];

let frogLilyPadRef = null;
let frogStateRef = null;

// Ladybug spawn timer - only spawn if no ladybug exists
let crabSpawnTimer = 0;
const CRAB_SPAWN_INTERVAL = 300; // 5 seconds (60 fps * 5)

// Constants for weight calculation
const WEIGHT_PER_PROGRESS = 200; // Full climb (progress 0->1) = 200 weight
const MAX_CRAB_WEIGHT = 200; // Maximum weight a ladybug can add (level <= 15)
const MAX_CRAB_WEIGHT_HIGH_LEVEL = 300; // Maximum weight for level > 15

// Color thresholds for weight (green → yellow → orange → red)
function getCrabColor(weight) {
    const percent = weight / MAX_CRAB_WEIGHT;
    if (percent < 0.25) {
        // Green
        return { body: '#27ae60', dark: '#1e8449', light: '#2ecc71' };
    } else if (percent < 0.5) {
        // Yellow
        return { body: '#f1c40f', dark: '#d4ac0d', light: '#f4d03f' };
    } else if (percent < 0.75) {
        // Orange
        return { body: '#e67e22', dark: '#ca6f1e', light: '#f39c12' };
    } else {
        // Red
        return { body: '#e74c3c', dark: '#922b21', light: '#c0392b' };
    }
}

// Initialize ladybug system
export function initCrabs(frogLilyPad, frogState) {
    frogLilyPadRef = frogLilyPad;
    frogStateRef = frogState;
}

// Get stem position at a given progress (0-1) - same as caterpillar
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

// Create a new crab
function spawnCrab() {
    if (!frogLilyPadRef) return;

    // Spawn on left or right side of the stem
    const side = Math.random() > 0.5 ? 1 : -1;
    const speed = 0.003 + Math.random() * 0.002; // Random speed (faster)

    const crab = {
        // Position on stem (0 = bottom, 1 = top at lily pad)
        stemProgress: 0,
        x: 0,
        y: CANVAS_HEIGHT + 20,

        // Movement
        climbSpeed: speed, // Progress per frame - chậm hơn
        baseClimbSpeed: speed, // Lưu tốc độ ban đầu
        walkPhase: 0,
        walkSpeed: 0.1,

        // Side of stem: -1 = left, 1 = right
        side: side,

        // State
        state: 'climbing', // climbing, falling, waiting
        respawnTimer: 0,
        hasReachedTarget: false, // Đã đến vị trí mục tiêu chưa
        weightRemoved: false, // Đã trừ cân nặng khi rơi chưa

        // Weight contribution
        currentWeight: 0,

        // Visual
        size: 12,
        clawAngle: 0,
        eyeOffset: 0,
        bubbles: [],
        scaleAnim: 1,

        // Animation
        bodyWobble: 0,
        legPhase: Math.random() * Math.PI * 2,

        // Falling animation
        fallVelocity: 0,
        fallRotation: 0
    };

    crabs.push(crab);
}

// Get weight based on whether ladybug reached target position
function calculateCrabWeight(crab) {
    if (crab.state !== 'climbing') return 0;
    
    // Only apply weight if ladybug has reached target position
    if (crab.hasReachedTarget) {
        return MAX_CRAB_WEIGHT; // 200
    }
    
    return 0; // No weight while climbing
}

// Update crabs
export function updateCrabs() {
    if (gameState.state !== 'playing') return;
    if (!frogLilyPadRef || !frogStateRef) return;

    // Only spawn crabs at level 8+
    if (frogStateRef.level < 8) return;

    // Only 1 crab at a time - spawn if no crab exists
    if (crabs.length === 0) {
        crabSpawnTimer++;
        if (crabSpawnTimer >= CRAB_SPAWN_INTERVAL) {
            crabSpawnTimer = 0;
            spawnCrab();
        }
    }

    // Update each crab
    for (let i = crabs.length - 1; i >= 0; i--) {
        const crab = crabs[i];

        // Update animation
        crab.walkPhase += crab.walkSpeed;
        crab.bodyWobble = Math.sin(crab.walkPhase * 2) * 2;
        crab.legPhase += 0.15;
        crab.clawAngle = Math.sin(crab.walkPhase) * 0.3;
        crab.eyeOffset = Math.sin(crab.walkPhase * 0.5) * 2;
        crab.scaleAnim = 1 + Math.sin(crab.walkPhase * 1.5) * 0.08;

        // Update bubbles
        if (Math.random() < 0.03 && crab.state === 'climbing') {
            crab.bubbles.push({
                x: crab.x + (Math.random() - 0.5) * 15,
                y: crab.y - 10,
                size: 2 + Math.random() * 3,
                life: 1.0,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -1 - Math.random()
            });
        }

        // Update bubble positions
        for (let j = crab.bubbles.length - 1; j >= 0; j--) {
            const bubble = crab.bubbles[j];
            bubble.x += bubble.vx;
            bubble.y += bubble.vy;
            bubble.life -= 0.02;
            if (bubble.life <= 0) {
                crab.bubbles.splice(j, 1);
            }
        }

        if (crab.state === 'climbing') {
            // Climb up the stem
            crab.stemProgress += crab.climbSpeed;

            // Get position on stem - stay close to stem like caterpillar
            const stemPos = getStemPosition(crab.stemProgress);
            crab.x = stemPos.x + crab.side * 2; // Bám sát vào cuống hơn
            crab.y = stemPos.y;

            // Cập nhật bug tilt effect cho lily pad
            if (frogLilyPadRef) {
                frogLilyPadRef.bugTilt = crab.side; // -1 hoặc 1
                frogLilyPadRef.bugWeight = crab.stemProgress * 0.8; // Tăng theo độ cao
            }

            // Logic khác nhau cho level <= 15 và level > 15
            const currentLevel = frogStateRef ? frogStateRef.level : 1;

            if (currentLevel > 15) {
                // Level > 15: Cân nặng tăng dần khi bò lên, tối đa 300
                const maxWeight = MAX_CRAB_WEIGHT_HIGH_LEVEL; // 300
                const newWeight = Math.min(Math.floor(crab.stemProgress * maxWeight), maxWeight);
                const weightDiff = newWeight - crab.currentWeight;

                if (weightDiff !== 0 && frogStateRef) {
                    frogStateRef.weight += weightDiff;
                    crab.currentWeight = newWeight;

                    // Trigger shake khi cân nặng cao
                    if (frogStateRef.weight >= 200 && !frogStateRef.isShaking) {
                        frogStateRef.isShaking = true;
                        frogStateRef.shakeTimer = 0;
                        frogStateRef.shakeDuration = 60;
                    }
                }

                // Dừng khi đạt 300 cân nặng
                if (crab.currentWeight >= maxWeight) {
                    crab.hasReachedTarget = true;
                    crab.climbSpeed = 0; // Ngừng bò
                }
            } else {
                // Level <= 15: Logic cũ - chỉ áp dụng cân nặng khi đến vị trí mục tiêu
                // Tính vị trí mục tiêu: thấp hơn ếch 50px
                const stemStartY = CANVAS_HEIGHT + 20;
                const stemEndY = frogLilyPadRef.y + 10;
                const targetY = frogLilyPadRef.y + 50; // Thấp hơn ếch 50px
                const targetProgress = (targetY - stemStartY) / (stemEndY - stemStartY);

                // Kiểm tra xem đã đến vị trí mục tiêu chưa
                if (crab.stemProgress >= targetProgress && !crab.hasReachedTarget) {
                    crab.hasReachedTarget = true;
                    crab.climbSpeed = 0; // Ngừng bò

                    // Chỉ lúc này mới áp dụng cân nặng 200
                    const newWeight = calculateCrabWeight(crab);
                    const weightDiff = newWeight - crab.currentWeight;

                    if (weightDiff !== 0 && frogStateRef) {
                        frogStateRef.weight += weightDiff;
                        crab.currentWeight = newWeight;

                        // Trigger shake when reaching 200 weight
                        if (frogStateRef.weight >= 200 && !frogStateRef.isShaking) {
                            frogStateRef.isShaking = true;
                            frogStateRef.shakeTimer = 0;
                            frogStateRef.shakeDuration = 60; // 1 giây rung
                        }
                    }
                } else if (crab.hasReachedTarget && crab.stemProgress < targetProgress) {
                    // Nếu ếch leo cao hơn, bọ rùa tiếp tục bò theo
                    crab.hasReachedTarget = false;
                    crab.climbSpeed = crab.baseClimbSpeed;

                    // Trừ cân nặng khi bọ rùa bắt đầu bò lại
                    if (crab.currentWeight > 0 && frogStateRef) {
                        frogStateRef.weight -= crab.currentWeight;
                        crab.currentWeight = 0;
                    }
                }
            }

            // Check if reached max progress (backup)
            if (crab.stemProgress >= 1) {
                crab.stemProgress = 1;
            }

        } else if (crab.state === 'falling') {
            // Fall down with gravity
            crab.fallVelocity += 0.5;
            crab.y += crab.fallVelocity;
            crab.x += crab.side * 1.5;
            crab.fallRotation += crab.side * 0.15;
            
            // Reset bug tilt khi rơi
            if (frogLilyPadRef) {
                frogLilyPadRef.bugTilt = 0;
                frogLilyPadRef.bugWeight = 0;
            }

            // Remove weight when falling - chỉ trừ 1 lần
            if (crab.currentWeight > 0 && frogStateRef && !crab.weightRemoved) {
                frogStateRef.weight -= crab.currentWeight;
                crab.currentWeight = 0;
                crab.weightRemoved = true; // Đánh dấu đã trừ rồi
            }

            // When reached bottom, remove crab and reset spawn timer
            if (crab.y >= CANVAS_HEIGHT + 50) {
                crabs.splice(i, 1);
                crabSpawnTimer = 0; // Reset timer, will spawn new crab after 10s
            }
        }
    }
}

// Draw ladybugs
export function drawCrabs() {
    for (const crab of crabs) {
        if (crab.state === 'waiting') continue;

        ctx.save();
        ctx.translate(crab.x, crab.y);

        // Không xoay - để bọ rùa bò đứng lên trên
        let rotation = 0;
        if (crab.state === 'falling') {
            rotation += crab.fallRotation;
        }
        ctx.rotate(rotation);

        const size = crab.size;

        // Draw bubbles
        for (const bubble of crab.bubbles) {
            ctx.save();
            ctx.rotate(Math.PI / 2); // Undo rotation for bubbles
            ctx.fillStyle = `rgba(255, 255, 255, ${bubble.life * 0.5})`;
            ctx.beginPath();
            ctx.arc(bubble.x - crab.x, bubble.y - crab.y, bubble.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, size + 3, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // === VẼ BỌ RÙA (LADYBUG) - VỚI ANIMATION NHỊP CÁNH ===
        
        // Thân đen phía sau cánh (vẽ trước)
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.55, size * 0.95, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Animation đập cánh
        const wingBeat = Math.sin(crab.walkPhase * 2) * 0.12; // Dao động -0.12 đến 0.12
        
        // Cánh trái
        ctx.save();
        ctx.rotate(-wingBeat); // Xoay ngược chiều kim đồng hồ
        
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.ellipse(-size * 0.65, 0, size * 0.65, size, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Chấm đen cánh trái
        ctx.fillStyle = '#000000';
        [
            {x: -size * 0.85, y: -size * 0.1, r: size * 0.2},
            {x: -size * 0.5, y: size * 0.4, r: size * 0.18},
            {x: -size * 0.12, y: -size * 0.3, r: size * 0.22} // Nửa chấm giữa
        ].forEach(spot => {
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
        
        // Cánh phải
        ctx.save();
        ctx.rotate(wingBeat); // Xoay cùng chiều kim đồng hồ
        
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.ellipse(size * 0.65, 0, size * 0.65, size, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Chấm đen cánh phải
        ctx.fillStyle = '#000000';
        [
            {x: size * 0.85, y: -size * 0.05, r: size * 0.21},
            {x: size * 0.55, y: size * 0.35, r: size * 0.19},
            {x: size * 0.12, y: -size * 0.3, r: size * 0.22} // Nửa chấm giữa
        ].forEach(spot => {
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // Đường giữa tách 2 cánh (vẽ sau để đè lên)
        ctx.strokeStyle = '#2c2c2c';
        ctx.lineWidth = size * 0.08;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(0, size);
        ctx.stroke();

        // Đầu đen - bán nguyệt cao
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(0, -size * 0.95, size * 0.65, Math.PI, 0, false);
        ctx.fill();

        // Mắt trắng to tròn với animation nhấp nháy nhẹ
        const eyeSize = size * 0.18 * (1 + Math.sin(crab.walkPhase * 3) * 0.05);
        ctx.fillStyle = '#ffffff';
        for (let side = -1; side <= 1; side += 2) {
            ctx.beginPath();
            ctx.arc(side * size * 0.28, -size * 1.25, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Con ngươi đen
        ctx.fillStyle = '#000000';
        for (let side = -1; side <= 1; side += 2) {
            ctx.beginPath();
            ctx.arc(side * size * 0.28, -size * 1.25, size * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Ánh sáng mắt
        ctx.fillStyle = '#ffffff';
        for (let side = -1; side <= 1; side += 2) {
            ctx.beginPath();
            ctx.arc(side * size * 0.33 - size * 0.06, -size * 1.31, size * 0.06, 0, Math.PI * 2);
            ctx.fill();
        }

        // Râu cong nhẹ với animation lay động
        const antennaWave = Math.sin(crab.walkPhase * 1.5) * 0.08;
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = size * 0.07;
        ctx.lineCap = 'round';
        
        // Râu trái
        ctx.beginPath();
        ctx.moveTo(-size * 0.35, -size * 1.3);
        ctx.quadraticCurveTo(-size * 0.75, -size * 1.7 + antennaWave * size, -size * 0.95, -size * 1.75 + antennaWave * size);
        ctx.stroke();
        
        // Râu phải
        ctx.beginPath();
        ctx.moveTo(size * 0.35, -size * 1.3);
        ctx.quadraticCurveTo(size * 0.75, -size * 1.7 - antennaWave * size, size * 0.95, -size * 1.75 - antennaWave * size);
        ctx.stroke();

        ctx.restore();
    }
}

// Check if crab is hit by hook (tongue)
export function checkCrabHit(hookX, hookY) {
    for (const crab of crabs) {
        if (crab.state !== 'climbing') continue;

        const dx = hookX - crab.x;
        const dy = hookY - crab.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Hit radius based on crab size (wider body + claws)
        const hitRadius = crab.size * 1.5;

        if (distance < hitRadius) {
            return crab;
        }
    }
    return null;
}

// Push crab down (called when tongue hits crab)
export function pushCrabDown(crab) {
    if (!crab || crab.state !== 'climbing') return;

    crab.state = 'falling';
    crab.fallVelocity = -3; // Small bounce up first
    // Weight will be removed in update function
    
    // Play water splash sound when crab falls
    playFallInWaterSound();
}

// Reset crabs
export function resetCrabs() {
    // Remove any weight contribution before clearing
    for (const crab of crabs) {
        if (crab.currentWeight > 0 && frogStateRef) {
            frogStateRef.weight -= crab.currentWeight;
        }
    }
    crabs.length = 0;
    crabSpawnTimer = 0;
    
    // Reset bug tilt effect
    if (frogLilyPadRef) {
        frogLilyPadRef.bugTilt = 0;
        frogLilyPadRef.bugWeight = 0;
    }
}
