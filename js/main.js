// Main game entry point
import { FISH_SPAWN_INTERVAL, RIBBIT_INTERVAL } from './config.js';
import { gameState, frogState, frogEvolution, timers, updateDigestion, dayNightState, updateDayNight } from './state.js';
import { initCanvas, ctx, canvas, clearCanvas } from './utils/canvas.js';
import { initInput, setShootCallback, drawJoystick, updateJoystick } from './utils/input.js';
import { initAudio, getAudioContext, playRibbitSound, loadBackgroundMusic, playBackgroundMusic, pauseBackgroundMusic, toggleMute, isMusicMuted, playFallInWaterSound } from './audio/audio.js';

// Victory fireworks
const fireworks = [];

// Mute button
const muteButton = {
    x: 0, // Will be set in init
    y: 20,
    size: 40,
    isHovered: false
};

// Glasses button
const glassesButton = {
    x: 0, // Will be set in init
    y: 20,
    size: 40,
    isHovered: false
};

// Pause button
const pauseButton = {
    x: 0, // Will be set in init
    y: 20,
    size: 40,
    isHovered: false
};

// Glasses modal state
const glassesModal = {
    isOpen: false,
    x: 0,
    y: 60,
    width: 150,
    height: 175,
    hoveredOption: null
};

// Glasses types
const glassesTypes = [
    { id: 'none', name: 'No Glasses', icon: '👁️' },
    { id: 'clear', name: 'Clear', color: 'rgba(100, 200, 255, 0.15)' },
    { id: 'dark', name: 'Sunglasses', color: 'rgba(0, 0, 0, 0.7)' },
    { id: 'rainbow', name: 'Rainbow', color: 'rainbow' }
];

// Draw glasses button
function drawGlassesButton() {
    const isWearing = frogState.isWearingGlasses;
    
    ctx.save();
    ctx.translate(glassesButton.x, glassesButton.y);
    
    // Button background with gradient
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glassesButton.size / 2);
    if (glassesButton.isHovered) {
        gradient.addColorStop(0, 'rgba(100, 100, 100, 0.8)');
        gradient.addColorStop(1, 'rgba(60, 60, 60, 0.6)');
    } else {
        gradient.addColorStop(0, 'rgba(80, 80, 80, 0.7)');
        gradient.addColorStop(1, 'rgba(40, 40, 40, 0.5)');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, glassesButton.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Border with glow
    if (glassesButton.isHovered || glassesModal.isOpen) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    }
    ctx.strokeStyle = isWearing ? 'rgba(74, 222, 128, 0.8)' : 'rgba(150, 150, 150, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Glasses icon
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = isWearing ? 'rgba(100, 200, 255, 0.3)' : 'rgba(150, 150, 150, 0.2)';
    ctx.lineWidth = 2.5;
    
    // Left lens
    ctx.beginPath();
    ctx.arc(-6, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Right lens
    ctx.beginPath();
    ctx.arc(6, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Bridge
    ctx.beginPath();
    ctx.moveTo(-0.5, 0);
    ctx.lineTo(0.5, 0);
    ctx.stroke();
    
    // Left arm
    ctx.beginPath();
    ctx.moveTo(-12, -1);
    ctx.lineTo(-15, -2);
    ctx.stroke();
    
    // Right arm
    ctx.beginPath();
    ctx.moveTo(12, -1);
    ctx.lineTo(15, -2);
    ctx.stroke();
    
    ctx.restore();
    
    // Draw modal if open
    if (glassesModal.isOpen) {
        drawGlassesModal();
    }
}

// Draw glasses selection modal
function drawGlassesModal() {
    ctx.save();
    
    // Helper function to draw rounded rectangle
    function drawRoundedRect(x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        ctx.lineTo(x + radius, y + height);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
    }
    
    // Modal background
    ctx.fillStyle = 'rgba(40, 40, 40, 0.95)';
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    
    const modalX = glassesModal.x;
    const modalY = glassesModal.y;
    const modalW = glassesModal.width;
    const modalH = glassesModal.height;
    
    // Rounded rectangle
    drawRoundedRect(modalX, modalY, modalW, modalH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Select Glasses', modalX + modalW / 2, modalY + 20);
    
    // Options
    const optionHeight = 30;
    const optionMargin = 5;
    const startY = modalY + 35;
    
    // Helper function inside modal scope
    function drawRoundedRect(x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        ctx.lineTo(x + radius, y + height);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
    }
    
    glassesTypes.forEach((type, index) => {
        const optionY = startY + index * (optionHeight + optionMargin);
        const isHovered = glassesModal.hoveredOption === type.id;
        const isSelected = frogState.glassesType === type.id;
        
        // Option background
        if (isHovered) {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
        } else if (isSelected) {
            ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
        } else {
            ctx.fillStyle = 'rgba(60, 60, 60, 0.5)';
        }
        
        drawRoundedRect(modalX + 5, optionY, modalW - 10, optionHeight, 5);
        ctx.fill();
        
        // Selected border
        if (isSelected) {
            ctx.strokeStyle = 'rgba(74, 222, 128, 0.8)';
            ctx.lineWidth = 2;
            drawRoundedRect(modalX + 5, optionY, modalW - 10, optionHeight, 5);
            ctx.stroke();
        }
        
        // Light shine effect when hovering
        if (isHovered) {
            const shineTime = Date.now() * 0.003;
            const shineX = modalX + 5 + (Math.sin(shineTime) * 0.5 + 0.5) * (modalW - 10);
            
            const shineGradient = ctx.createLinearGradient(shineX - 30, optionY, shineX + 30, optionY);
            shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
            shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = shineGradient;
            ctx.fillRect(modalX + 5, optionY, modalW - 10, optionHeight);
        }
        
        // Preview glasses
        ctx.save();
        ctx.translate(modalX + 25, optionY + optionHeight / 2);
        
        if (type.id === 'none') {
            // Draw X or empty indicator
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-5, -5);
            ctx.lineTo(5, 5);
            ctx.moveTo(5, -5);
            ctx.lineTo(-5, 5);
            ctx.stroke();
        } else {
            // Draw mini glasses
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            
            // Rainbow gradient for rainbow type
            if (type.id === 'rainbow') {
                const rainbowTime = Date.now() * 0.003;
                const gradient = ctx.createConicGradient(rainbowTime, 0, 0);
                gradient.addColorStop(0, '#ff0000');
                gradient.addColorStop(0.17, '#ff8800');
                gradient.addColorStop(0.33, '#ffff00');
                gradient.addColorStop(0.5, '#00ff00');
                gradient.addColorStop(0.67, '#0088ff');
                gradient.addColorStop(0.83, '#8800ff');
                gradient.addColorStop(1, '#ff0000');
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = type.color;
            }
            
            ctx.beginPath();
            ctx.arc(-4, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(4, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(-0.5, 0);
            ctx.lineTo(0.5, 0);
            ctx.stroke();
        }
        
        ctx.restore();
        
        // Name
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(type.name, modalX + 50, optionY + optionHeight / 2 + 4);
    });
    
    ctx.restore();
}

// Draw pause button
function drawPauseButton() {
    const isPaused = gameState.state === 'paused';
    
    ctx.save();
    ctx.translate(pauseButton.x, pauseButton.y);
    
    // Button background with gradient
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pauseButton.size / 2);
    if (pauseButton.isHovered) {
        gradient.addColorStop(0, 'rgba(100, 100, 100, 0.8)');
        gradient.addColorStop(1, 'rgba(60, 60, 60, 0.6)');
    } else {
        gradient.addColorStop(0, 'rgba(80, 80, 80, 0.7)');
        gradient.addColorStop(1, 'rgba(40, 40, 40, 0.5)');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, pauseButton.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Border with glow
    if (pauseButton.isHovered) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    }
    ctx.strokeStyle = isPaused ? 'rgba(255, 215, 0, 0.8)' : 'rgba(150, 150, 150, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 2;
    
    if (isPaused) {
        // Play icon (triangle)
        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.lineTo(8, 0);
        ctx.lineTo(-6, 8);
        ctx.closePath();
        ctx.fill();
    } else {
        // Pause icon (two bars)
        ctx.fillRect(-7, -8, 5, 16);
        ctx.fillRect(2, -8, 5, 16);
    }
    
    ctx.restore();
}

// Draw pause overlay with play button
function drawPauseOverlay() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Paused text
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;
    ctx.shadowBlur = 40;
    ctx.shadowColor = `rgba(255, 215, 0, ${pulse})`;
    
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 100);
    
    ctx.restore();
    
    // Play button (same style as intro)
    const buttonRadius = 50;
    const buttonX = canvas.width / 2;
    const buttonY = canvas.height / 2 + 20;

    const mouseX = gameState.mouseX;
    const mouseY = gameState.mouseY;
    const distance = Math.sqrt((mouseX - buttonX) ** 2 + (mouseY - buttonY) ** 2);
    const isHovering = distance <= buttonRadius;

    ctx.save();
    
    if (isHovering) {
        ctx.shadowBlur = 25;
        ctx.shadowColor = 'rgba(74, 222, 128, 0.6)';
    }
    
    ctx.fillStyle = isHovering ? '#4ade80' : '#22c55e';
    ctx.beginPath();
    ctx.arc(buttonX, buttonY, buttonRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(buttonX, buttonY, buttonRadius - 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(buttonX, buttonY, buttonRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();

    // Play icon
    ctx.save();
    ctx.translate(buttonX, buttonY);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-12, -18);
    ctx.lineTo(18, 0);
    ctx.lineTo(-12, 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    
    // Instructions
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Nhấn để tiếp tục!', canvas.width / 2, canvas.height / 2 + 100);
    ctx.restore();
}

// Draw mute button
function drawMuteButton() {
    const isMuted = isMusicMuted();
    
    ctx.save();
    ctx.translate(muteButton.x, muteButton.y);
    
    // Button background with gradient
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, muteButton.size / 2);
    if (muteButton.isHovered) {
        gradient.addColorStop(0, 'rgba(100, 100, 100, 0.8)');
        gradient.addColorStop(1, 'rgba(60, 60, 60, 0.6)');
    } else {
        gradient.addColorStop(0, 'rgba(80, 80, 80, 0.7)');
        gradient.addColorStop(1, 'rgba(40, 40, 40, 0.5)');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, muteButton.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Border with glow
    if (muteButton.isHovered) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    }
    ctx.strokeStyle = isMuted ? 'rgba(255, 100, 100, 0.8)' : 'rgba(74, 222, 128, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    if (isMuted) {
        // Muted icon - speaker with slash
        ctx.fillStyle = '#ddd';
        
        // Speaker cone
        ctx.fillRect(-10, -5, 7, 10);
        ctx.beginPath();
        ctx.moveTo(-3, -8);
        ctx.lineTo(4, -8);
        ctx.lineTo(4, 8);
        ctx.lineTo(-3, 8);
        ctx.closePath();
        ctx.fill();
        
        // Speaker grille
        ctx.fillStyle = '#999';
        ctx.fillRect(-10, -2, 5, 1);
        ctx.fillRect(-10, 1, 5, 1);
        
        // Slash line
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(255, 68, 68, 0.8)';
        ctx.beginPath();
        ctx.moveTo(-12, -12);
        ctx.lineTo(12, 12);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // White outline for slash
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-12, -12);
        ctx.lineTo(12, 12);
        ctx.stroke();
    } else {
        // Unmuted icon - speaker with animated sound waves
        ctx.fillStyle = '#fff';
        
        // Speaker cone with shading
        const speakerGradient = ctx.createLinearGradient(-10, -5, -3, 5);
        speakerGradient.addColorStop(0, '#ffffff');
        speakerGradient.addColorStop(1, '#cccccc');
        ctx.fillStyle = speakerGradient;
        ctx.fillRect(-10, -5, 7, 10);
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-3, -8);
        ctx.lineTo(4, -8);
        ctx.lineTo(4, 8);
        ctx.lineTo(-3, 8);
        ctx.closePath();
        ctx.fill();
        
        // Speaker grille detail
        ctx.fillStyle = '#666';
        ctx.fillRect(-10, -2, 5, 1);
        ctx.fillRect(-10, 1, 5, 1);
        
        // Animated sound waves
        const time = Date.now() * 0.003;
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        
        for (let i = 0; i < 3; i++) {
            const offset = i * 0.5;
            const opacity = 0.3 + Math.sin(time - offset) * 0.3 + 0.4;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(4, 0, 8 + i * 4, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        
        // Highlight on speaker
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-7, -3, 2, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

// Entities
import { frog, updateFrog, drawFrog } from './entities/frog.js';
import { hook, shootHook, updateHook, drawHook } from './entities/hook.js';
import { enemies, initEnemies, updateEnemies, drawEnemies, spawnEnemy } from './entities/enemies.js';
import { fishJumps, spawnFish, updateFish, drawFish } from './entities/fish.js';
import { lotusFlower, lotusFlower2, updateLotusFlowers, drawLotusFlower } from './entities/lotus.js';
import { holyWater, updateHolyWater, drawHolyWater } from './entities/holywater.js';
import { digestPotion, updateDigestPotion, drawDigestPotion } from './entities/digestpotion.js';
import { leafPotion, updateLeafPotion, drawLeafPotion } from './entities/leafpotion.js';
import { antidotePotions, updateAntidotePotion, drawAntidotePotion, drawAntidoteBird, drawAntidoteParticles, resetAntidoteSystem } from './entities/antidotepotion.js';
import { caterpillars, initCaterpillars, updateCaterpillars, drawCaterpillars, checkCaterpillarHit, eatCaterpillar, resetCaterpillars } from './entities/caterpillar.js';
import { crabs, initCrabs, updateCrabs, drawCrabs, resetCrabs } from './entities/lazy-bug.js';

// Environment
import { drawBackground, drawVictoryWalls, getFinishLineY, fishingRod, drawFishingRod } from './environment/background.js';
import { initBirds, updateBirds } from './environment/birds.js';
import { initClouds, updateClouds } from './environment/clouds.js';
import { frogLilyPad, drawFrogLilyPad, updateHealParticles, drawHealParticles, updateLilyPadFlash } from './environment/lilypad.js';
import { waterDroplets, updateWaterDroplets, drawWaterDroplets, createSplash } from './environment/water.js';

// Firework particle class
class Firework {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        const particleCount = 30 + Math.random() * 20;
        const color = `hsl(${Math.random() * 360}, 100%, 60%)`;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 2 + Math.random() * 3;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                color: color,
                size: 2 + Math.random() * 2
            });
        }
    }
    
    update() {
        for (let p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
            p.life -= 0.02;
        }
        this.particles = this.particles.filter(p => p.life > 0);
    }
    
    draw() {
        for (let p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    isDead() {
        return this.particles.length === 0;
    }
}

// Spawn firework
function spawnFirework() {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height * 0.5;
    fireworks.push(new Firework(x, y));
}

// Update and draw fireworks
function updateFireworks() {
    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        if (fireworks[i].isDead()) {
            fireworks.splice(i, 1);
        }
    }
}

function drawFireworks() {
    for (let fw of fireworks) {
        fw.draw();
    }
}

// Victory screen
function drawVictoryScreen() {
    // Only show modal after delay (3 seconds)
    if (frogState.victoryJumpTimer < frogState.victoryModalDelay) {
        return; // Don't draw anything yet, let frog celebrate
    }
    
    // Calculate slide-up animation
    const timeSinceDelay = frogState.victoryJumpTimer - frogState.victoryModalDelay;
    const slideUpDuration = 60; // 1 second to slide up
    const slideProgress = Math.min(timeSinceDelay / slideUpDuration, 1);
    // Ease-out animation
    const easedProgress = 1 - Math.pow(1 - slideProgress, 3);
    const modalOffsetY = (1 - easedProgress) * canvas.height;
    
    ctx.save();
    ctx.translate(0, modalOffsetY);
    
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, -modalOffsetY, canvas.width, canvas.height + modalOffsetY);
    
    // Victory text
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Animated glow
    const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
    ctx.shadowBlur = 30;
    ctx.shadowColor = `rgba(74, 222, 128, ${pulse})`;
    
    // Main text
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 60px Arial';
    ctx.fillText('VICTORY!', canvas.width / 2, canvas.height / 2 - 80);
    
    // Sub text
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('Congratulations!', canvas.width / 2, canvas.height / 2 - 20);
    
    // Score info
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText(`Final Score: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 30);
    ctx.fillText(`Level Reached: ${frogState.targetLevel}`, canvas.width / 2, canvas.height / 2 + 60);
    
    ctx.restore();
    
    // Replay button
    const buttonRadius = 45;
    const buttonX = canvas.width / 2;
    const buttonY = canvas.height / 2 + 130;

    // Button hover effect (adjust for modal offset)
    const mouseX = gameState.mouseX;
    const mouseY = gameState.mouseY - modalOffsetY;
    const distance = Math.sqrt((mouseX - buttonX) ** 2 + (mouseY - buttonY) ** 2);
    const isHovering = distance <= buttonRadius;

    ctx.save();
    
    // Outer glow when hovering
    if (isHovering) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    }
    
    // Button background circle
    ctx.fillStyle = isHovering ? '#8b9199' : '#6b7280';
    ctx.beginPath();
    ctx.arc(buttonX, buttonY, buttonRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner darker circle for depth
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.arc(buttonX, buttonY, buttonRadius - 3, 0, Math.PI * 2);
    ctx.fill();
    
    // White border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(buttonX, buttonY, buttonRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();

    // Replay icon
    ctx.save();
    ctx.translate(buttonX, buttonY);
    
    // Arrow circle path
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0.5, Math.PI * 2 - 0.3);
    ctx.stroke();
    
    // Arrow head
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(16, -8);
    ctx.lineTo(22, -2);
    ctx.lineTo(15, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
    
    // Restore modal translation
    ctx.restore();
}

// Intro screen with Play button
function drawIntroScreen() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Game title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Animated glow
    const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;
    ctx.shadowBlur = 40;
    ctx.shadowColor = `rgba(74, 222, 128, ${pulse})`;
    
    // Main title
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 56px Arial';
    ctx.fillText('ẾCH NGỒI', canvas.width / 2, canvas.height / 2 - 100);
    
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 36px Arial';
    ctx.fillText('ĐÁY GIẾNG', canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.restore();
    
    // Play button (circular like restart)
    const buttonRadius = 50;
    const buttonX = canvas.width / 2;
    const buttonY = canvas.height / 2 + 60;

    // Button hover effect
    const mouseX = gameState.mouseX;
    const mouseY = gameState.mouseY;
    const distance = Math.sqrt((mouseX - buttonX) ** 2 + (mouseY - buttonY) ** 2);
    const isHovering = distance <= buttonRadius;

    ctx.save();
    
    // Outer glow when hovering
    if (isHovering) {
        ctx.shadowBlur = 25;
        ctx.shadowColor = 'rgba(74, 222, 128, 0.6)';
    }
    
    // Button background circle
    ctx.fillStyle = isHovering ? '#4ade80' : '#22c55e';
    ctx.beginPath();
    ctx.arc(buttonX, buttonY, buttonRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner darker circle for depth
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(buttonX, buttonY, buttonRadius - 3, 0, Math.PI * 2);
    ctx.fill();
    
    // White border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(buttonX, buttonY, buttonRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();

    // Play icon (triangle)
    ctx.save();
    ctx.translate(buttonX, buttonY);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-12, -18);
    ctx.lineTo(18, 0);
    ctx.lineTo(-12, 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    
    // Instructions
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Nhấn vào để bắt đầu!', canvas.width / 2, canvas.height / 2 + 140);
    ctx.restore();
}

// Hunger Circular Chart UI (left corner)
function drawHungerTimer() {
    if (gameState.state !== 'playing' || frogState.isDead) return;

    const radius = 30;
    const centerX = radius + 15;
    const centerY = canvas.height - radius - 15;
    const lineWidth = 8;

    ctx.save();

    // Background circle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
    ctx.fill();

    // Gray track
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Hunger progress (countdown)
    const hungerProgress = 1 - (frogState.hungerTimer / frogState.hungerDuration);

    // Color changes based on hunger level
    let fillColor;
    if (hungerProgress > 0.5) {
        fillColor = '#22c55e'; // Green
    } else if (hungerProgress > 0.2) {
        fillColor = '#fbbf24'; // Yellow
    } else {
        fillColor = '#dc2626'; // Red
    }

    // Hunger arc (starts from top, goes clockwise)
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * hungerProgress);

    ctx.strokeStyle = fillColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.stroke();

    // Calculate remaining seconds
    const remainingSeconds = Math.ceil((frogState.hungerDuration - frogState.hungerTimer) / 60);

    // Center text - countdown seconds
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${remainingSeconds}`, centerX, centerY);

    // Warning effect when starving
    if (frogState.isStarving) {
        const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
        ctx.strokeStyle = `rgba(220, 38, 38, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

// Digestion Circular Chart UI
function drawDigestionBar() {
    if (frogState.weight <= 0) return;

    const radius = 30;
    const centerX = canvas.width - radius - 15;
    const centerY = canvas.height - radius - 15;
    const lineWidth = 8;

    ctx.save();

    // Background circle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
    ctx.fill();

    // Gray track
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Weight fill (red when high, yellow when medium, green when low)
    const weightPercent = frogState.weight / frogState.maxWeight;
    let fillColor;
    if (weightPercent > 0.7) {
        fillColor = '#ef4444'; // Red - danger
    } else if (weightPercent > 0.4) {
        fillColor = '#f59e0b'; // Yellow - warning
    } else {
        fillColor = '#22c55e'; // Green - safe
    }

    // Weight arc (starts from top, goes clockwise)
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * weightPercent);

    ctx.strokeStyle = fillColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.stroke();

    // Digestion progress overlay (shows how much is being digested)
    if (frogState.isDigesting && frogState.pendingFood.length > 0) {
        const currentFood = frogState.pendingFood[0];
        const digestProgress = 1 - (currentFood.remainingTime / currentFood.digestionTime);
        const digestPercent = (currentFood.weight / frogState.maxWeight) * digestProgress;
        const digestEndAngle = startAngle + (Math.PI * 2 * digestPercent);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = lineWidth - 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, digestEndAngle);
        ctx.stroke();
    }

    // Center text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.floor(frogState.weight)}`, centerX, centerY - 5);

    ctx.font = '9px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`/${frogState.maxWeight}`, centerX, centerY + 8);

    ctx.restore();
}

// Update falling animation
function updateFalling() {
    if (!frogState.isFalling) {
        // Check if should start falling (weight >= maxWeight)
        if (frogState.weight >= frogState.maxWeight) {
            frogState.isFalling = true;
            frogState.fallY = frog.y;
            frogState.fallVelocity = -3; // Small upward bounce first
            frogState.fallRotation = 0;
        }
        return;
    }

    // Apply gravity
    frogState.fallVelocity += 0.5;
    frogState.fallY += frogState.fallVelocity;

    // Rotate while falling
    frogState.fallRotation += 0.1;

    // Check if frog fell into water (below canvas)
    if (frogState.fallY > canvas.height + 50) {
        frogState.isDead = true;
        // Big splash effect when frog falls into water (reduced for performance)
        createSplash(frog.x, canvas.height - 100, 4);
        playFallInWaterSound();
        // Background music continues playing
        // Wait for splash animation before showing game over
        setTimeout(() => {
            gameState.state = 'gameover';
        }, 800);
        // Prevent multiple triggers
        frogState.fallY = canvas.height + 100;
    }
}

// Game Over UI
function drawGameOver() {
    // Update game over timer for animation
    gameState.gameOverTimer++;

    // Calculate slide-up animation
    const slideUpDuration = 60; // 1 second to slide up
    const slideProgress = Math.min(gameState.gameOverTimer / slideUpDuration, 1);
    // Ease-out animation
    const easedProgress = 1 - Math.pow(1 - slideProgress, 3);
    const modalOffsetY = (1 - easedProgress) * canvas.height;

    ctx.save();
    ctx.translate(0, modalOffsetY);

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, -modalOffsetY, canvas.width, canvas.height + modalOffsetY);

    // Death reason message (above restart button)
    if (gameState.deathReason === 'poison') {
        ctx.save();
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Text shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText('Bạn đã thua do trúng độc', canvas.width / 2 + 2, canvas.height / 2 - 80 + 2);

        // Main text - red color for poison
        ctx.fillStyle = '#ef4444';
        ctx.fillText('Bạn đã thua do trúng độc', canvas.width / 2, canvas.height / 2 - 80);
        ctx.restore();
    }

    // Replay icon button (circular)
    const buttonRadius = 45;
    const buttonX = canvas.width / 2;
    const buttonY = canvas.height / 2;

    // Button hover effect (adjust for modal offset)
    const mouseX = gameState.mouseX;
    const mouseY = gameState.mouseY - modalOffsetY;
    const distance = Math.sqrt((mouseX - buttonX) ** 2 + (mouseY - buttonY) ** 2);
    const isHovering = distance <= buttonRadius;

    ctx.save();

    // Outer glow when hovering
    if (isHovering) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    }

    // Button background circle
    ctx.fillStyle = isHovering ? '#8b9199' : '#6b7280';
    ctx.beginPath();
    ctx.arc(buttonX, buttonY, buttonRadius, 0, Math.PI * 2);
    ctx.fill();

    // Inner darker circle for depth
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.arc(buttonX, buttonY, buttonRadius - 3, 0, Math.PI * 2);
    ctx.fill();

    // White border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(buttonX, buttonY, buttonRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // Replay icon
    ctx.save();
    ctx.translate(buttonX, buttonY);

    // Arrow circle path
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0.5, Math.PI * 2 - 0.3);
    ctx.stroke();

    // Arrow head
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(16, -8);
    ctx.lineTo(22, -2);
    ctx.lineTo(15, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Restore modal translation
    ctx.restore();
}

// Reset game function
function resetGame() {
    // Reset game state
    gameState.state = 'intro';
    gameState.score = 0;
    gameState.combo = 0;
    gameState.introTimer = 0;
    gameState.gameOverTimer = 0;
    gameState.deathReason = '';

    // Reset day/night cycle
    dayNightState.phase = 'day';
    dayNightState.transitionProgress = 0;
    dayNightState.isTransitioning = false;
    dayNightState.targetPhase = 'day';
    dayNightState.lastLevel = 0;

    // Clear fireworks
    fireworks.length = 0;

    // Reset frog state
    frogState.level = 0;
    frogState.targetLevel = 0;
    frogState.isVictory = false;
    frogState.victoryJumpTimer = 0;
    frogState.isChewing = false;
    frogState.chewTimer = 0;
    frogState.isPoisoned = false;
    frogState.poisonTimer = 0;
    frogState.isDead = false;
    frogState.antidoteCount = 0; // Reset antidote inventory
    frogState.hungerTimer = 0;
    frogState.isStarving = false;
    // Reset digestion
    frogState.weight = 0;
    frogState.maxWeight = 500; // Reset maxWeight (caterpillars can reduce it)
    frogState.digestionTimer = 0;
    frogState.digestionDuration = 0;
    frogState.isDigesting = false;
    frogState.pendingFood = [];
    frogState.digestionSpeed = 1;
    frogState.digestionBoostTimer = 0;
    frogState.digestionTimeBonus = 0;
    // Reset double points buff
    frogState.doublePointsActive = false;
    frogState.doublePointsTimer = 0;
    // Reset falling
    frogState.isFalling = false;
    frogState.fallY = 0;
    frogState.fallVelocity = 0;
    frogState.fallRotation = 0;
    // Reset shake state
    frogState.shakeTimer = 0;
    frogState.isShaking = false;

    // Reset frog evolution
    frogEvolution.isEvolved = false;
    frogEvolution.glowIntensity = 0;
    frogEvolution.evolutionTimer = 0;

    // Reset frog position
    frog.isInIntro = true;
    frog.introY = canvas.height + 50;
    frog.introVelocityY = -18;

    // Reset lily pad position
    frogLilyPad.baseY = canvas.height - 90;
    frogLilyPad.y = canvas.height - 90;
    frogLilyPad.waveOffset = 0;

    // Reset hook
    hook.state = 'ready';
    hook.length = 0;
    hook.hookedEnemy = null;
    hook.hookedFish = null;
    hook.hookedDigestPotion = false;
    hook.hookedCaterpillar = null;
    hook.hookedByFishingRod = false; // Reset fishing rod hook state
    hook.caughtTimer = 0; // Reset caught timer

    // Reset fishing rod
    fishingRod.isCaught = false;
    fishingRod.hookY = 200; // Reset to initial position (raised 50px higher)
    fishingRod.isLowering = false;
    fishingRod.isActive = false; // Will be activated at level 15

    // Reset caterpillars and lily pad damage
    resetCaterpillars();
    resetCrabs();
    frogLilyPad.damage = 0;
    frogLilyPad.biteMarks = [];
    frogLilyPad.isFlashing = false;
    frogLilyPad.flashTimer = 0;
    frogLilyPad.flashIntensity = 0;

    // Clear and reinit enemies
    enemies.length = 0;
    for (let i = 0; i < 5; i++) {
        spawnEnemy();
    }

    // Clear fish
    fishJumps.length = 0;

    // Reset lotus flowers
    lotusFlower.bloomProgress = 1.0;
    lotusFlower.nectarLevel = 5;
    lotusFlower.insectAtFlower = null;
    lotusFlower.type = 'bloomed';
    lotusFlower.isBeingAttacked = false;
    lotusFlower.attackTimer = 0;
    lotusFlower.pollenAmount = 1000;
    lotusFlower.wiltedTimer = 0;
    lotusFlower.fadeProgress = 0;
    lotusFlower.petalParticles = [];

    lotusFlower2.bloomProgress = 0.0;
    lotusFlower2.nectarLevel = 5;
    lotusFlower2.insectAtFlower = null;
    lotusFlower2.bloomDelay = 180;
    lotusFlower2.type = 'bud';
    lotusFlower2.isBeingAttacked = false;
    lotusFlower2.attackTimer = 0;
    lotusFlower2.pollenAmount = 1000;
    lotusFlower2.wiltedTimer = 0;
    lotusFlower2.fadeProgress = 0;
    lotusFlower2.petalParticles = [];

    // Reset holy water
    holyWater.active = false;
    holyWater.sparkles = [];
    holyWater.spawnTimer = 0;

    // Reset digest potion
    digestPotion.active = false;
    digestPotion.sparkles = [];
    digestPotion.spawnTimer = 0;

    // Reset leaf potion
    leafPotion.active = false;
    leafPotion.sparkles = [];
    leafPotion.spawnTimer = 0;
    leafPotion.spawnedCount = 0; // Reset spawn counter

    // Reset antidote system
    resetAntidoteSystem();

    // Update UI
    document.getElementById('score').textContent = '0';
    document.getElementById('combo').textContent = '0';
    document.getElementById('level').textContent = '0';
    document.getElementById('next-level').textContent = '0/100';
    document.getElementById('antidote-count').textContent = '0';
}

// Initialize game
function init() {
    // Initialize canvas
    const canvasInfo = initCanvas();
    
    // Set mute button position
    muteButton.x = canvas.width - 30;
    
    // Set glasses button position (left side)
    glassesButton.x = 30;
    glassesModal.x = 10;
    
    // Set pause button position (center)
    pauseButton.x = canvas.width / 2;

    // Initialize input
    initInput(canvasInfo.canvas);
    setShootCallback(() => {
        if (hook.state === 'ready') {
            shootHook();
        }
    });
    
    // Initialize audio and background music
    initAudio();
    loadBackgroundMusic();

    // Helper function to check replay button click
    function checkReplayButton(clientX, clientY) {
        if (gameState.state === 'gameover' || gameState.state === 'victory') {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const canvasX = (clientX - rect.left) * scaleX;
            let canvasY = (clientY - rect.top) * scaleY;

            // Calculate modal offset for animation
            let modalOffsetY = 0;
            if (gameState.state === 'gameover') {
                const slideUpDuration = 60;
                const slideProgress = Math.min(gameState.gameOverTimer / slideUpDuration, 1);
                const easedProgress = 1 - Math.pow(1 - slideProgress, 3);
                modalOffsetY = (1 - easedProgress) * canvas.height;
            } else if (gameState.state === 'victory') {
                const timeSinceDelay = frogState.victoryJumpTimer - frogState.victoryModalDelay;
                const slideUpDuration = 60;
                const slideProgress = Math.min(timeSinceDelay / slideUpDuration, 1);
                const easedProgress = 1 - Math.pow(1 - slideProgress, 3);
                modalOffsetY = (1 - easedProgress) * canvas.height;
            }

            // Adjust click position for modal offset
            canvasY = canvasY - modalOffsetY;

            const buttonRadius = 45;
            const buttonX = canvas.width / 2;
            const buttonY = gameState.state === 'gameover' ? canvas.height / 2 : canvas.height / 2 + 130;

            const distance = Math.sqrt((canvasX - buttonX) ** 2 + (canvasY - buttonY) ** 2);
            if (distance <= buttonRadius) {
                resetGame();
            }
        }
    }
    
    // Helper function to check pause button click
    function checkPauseButton(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;

        const distance = Math.sqrt((canvasX - pauseButton.x) ** 2 + (canvasY - pauseButton.y) ** 2);
        if (distance <= pauseButton.size / 2) {
            if (gameState.state === 'playing') {
                gameState.state = 'paused';
                pauseBackgroundMusic();
            } else if (gameState.state === 'paused') {
                gameState.state = 'playing';
                if (!isMusicMuted()) {
                    playBackgroundMusic();
                }
            }
            return true;
        }
        return false;
    }
    
    // Helper function to check pause overlay play button click
    function checkPauseOverlayButton(clientX, clientY) {
        if (gameState.state !== 'paused') return false;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;

        const buttonX = canvas.width / 2;
        const buttonY = canvas.height / 2 + 20;
        const buttonRadius = 50;

        const distance = Math.sqrt((canvasX - buttonX) ** 2 + (canvasY - buttonY) ** 2);
        if (distance <= buttonRadius) {
            gameState.state = 'playing';
            if (!isMusicMuted()) {
                playBackgroundMusic();
            }
            return true;
        }
        return false;
    }
    
    // Helper function to check play button click (intro screen)
    function checkPlayButton(clientX, clientY) {
        if (gameState.state === 'intro') {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            const canvasX = (clientX - rect.left) * scaleX;
            const canvasY = (clientY - rect.top) * scaleY;

            const buttonRadius = 50;
            const buttonX = canvas.width / 2;
            const buttonY = canvas.height / 2 + 60;
            
            const distance = Math.sqrt((canvasX - buttonX) ** 2 + (canvasY - buttonY) ** 2);
            if (distance <= buttonRadius) {
                // Start jumping animation and unmute audio
                gameState.state = 'jumping';
                gameState.introTimer = 0;
                if (isMusicMuted()) {
                    toggleMute(); // This will start the music
                }
                return true;
            }
        }
        return false;
    }
    
    // Helper function to check mute button click
    function checkMuteButton(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;
        
        const distance = Math.sqrt((canvasX - muteButton.x) ** 2 + (canvasY - muteButton.y) ** 2);
        if (distance <= muteButton.size / 2) {
            toggleMute();
            return true;
        }
        return false;
    }
    
    // Helper function to check glasses button/modal click
    function checkGlassesButton(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;
        
        // Check if clicking inside modal
        if (glassesModal.isOpen) {
            const modalX = glassesModal.x;
            const modalY = glassesModal.y;
            const modalW = glassesModal.width;
            const modalH = glassesModal.height;
            
            // Check if clicking outside modal to close it
            if (canvasX < modalX || canvasX > modalX + modalW ||
                canvasY < modalY || canvasY > modalY + modalH) {
                // Check if not clicking the button itself
                const distance = Math.sqrt((canvasX - glassesButton.x) ** 2 + (canvasY - glassesButton.y) ** 2);
                if (distance > glassesButton.size / 2) {
                    glassesModal.isOpen = false;
                    return true;
                }
            } else {
                // Check which option was clicked
                const optionHeight = 30;
                const optionMargin = 5;
                const startY = modalY + 35;
                
                for (let i = 0; i < glassesTypes.length; i++) {
                    const optionY = startY + i * (optionHeight + optionMargin);
                    if (canvasY >= optionY && canvasY <= optionY + optionHeight) {
                        const selectedType = glassesTypes[i].id;
                        frogState.glassesType = selectedType;
                        frogState.isWearingGlasses = selectedType !== 'none';
                        // Save to localStorage
                        localStorage.setItem('glassesType', selectedType);
                        glassesModal.isOpen = false;
                        return true;
                    }
                }
            }
        }
        
        // Check button click to toggle modal
        const distance = Math.sqrt((canvasX - glassesButton.x) ** 2 + (canvasY - glassesButton.y) ** 2);
        if (distance <= glassesButton.size / 2) {
            glassesModal.isOpen = !glassesModal.isOpen;
            return true;
        }
        return false;
    }

    // Add click handler for intro, game over/victory screen and buttons
    canvas.addEventListener('click', (e) => {
        // Check pause overlay button first if paused
        if (gameState.state === 'paused') {
            if (!checkPauseOverlayButton(e.clientX, e.clientY)) {
                checkPauseButton(e.clientX, e.clientY);
            }
            return;
        }
        
        if (!checkGlassesButton(e.clientX, e.clientY)) {
            if (!checkMuteButton(e.clientX, e.clientY)) {
                if (!checkPauseButton(e.clientX, e.clientY)) {
                    if (!checkPlayButton(e.clientX, e.clientY)) {
                        checkReplayButton(e.clientX, e.clientY);
                    }
                }
            }
        }
    });
    
    // Add touch handler for intro, game over/victory screen (mobile support) and buttons
    canvas.addEventListener('touchend', (e) => {
        if (e.changedTouches && e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            
            // Check pause overlay button first if paused
            if (gameState.state === 'paused') {
                if (!checkPauseOverlayButton(touch.clientX, touch.clientY)) {
                    checkPauseButton(touch.clientX, touch.clientY);
                }
                e.preventDefault();
                return;
            }
            
            if (!checkGlassesButton(touch.clientX, touch.clientY)) {
                if (!checkMuteButton(touch.clientX, touch.clientY)) {
                    if (!checkPauseButton(touch.clientX, touch.clientY)) {
                        if (!checkPlayButton(touch.clientX, touch.clientY)) {
                            if (gameState.state === 'gameover' || gameState.state === 'victory') {
                                e.preventDefault();
                                checkReplayButton(touch.clientX, touch.clientY);
                            }
                        } else {
                            e.preventDefault();
                        }
                    } else {
                        e.preventDefault();
                    }
                } else {
                    e.preventDefault();
                }
            } else {
                e.preventDefault();
            }
        }
    }, { passive: false });
    
    // Add mouse move handler for button hover
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const canvasX = (e.clientX - rect.left) * scaleX;
        const canvasY = (e.clientY - rect.top) * scaleY;
        
        const muteDist = Math.sqrt((canvasX - muteButton.x) ** 2 + (canvasY - muteButton.y) ** 2);
        muteButton.isHovered = muteDist <= muteButton.size / 2;
        
        const pauseDist = Math.sqrt((canvasX - pauseButton.x) ** 2 + (canvasY - pauseButton.y) ** 2);
        pauseButton.isHovered = pauseDist <= pauseButton.size / 2;
        
        const glassesDist = Math.sqrt((canvasX - glassesButton.x) ** 2 + (canvasY - glassesButton.y) ** 2);
        glassesButton.isHovered = glassesDist <= glassesButton.size / 2;
        
        // Check hover on modal options
        if (glassesModal.isOpen) {
            const modalX = glassesModal.x;
            const modalY = glassesModal.y;
            const modalW = glassesModal.width;
            const optionHeight = 30;
            const optionMargin = 5;
            const startY = modalY + 35;
            
            glassesModal.hoveredOption = null;
            
            if (canvasX >= modalX && canvasX <= modalX + modalW) {
                for (let i = 0; i < glassesTypes.length; i++) {
                    const optionY = startY + i * (optionHeight + optionMargin);
                    if (canvasY >= optionY && canvasY <= optionY + optionHeight) {
                        glassesModal.hoveredOption = glassesTypes[i].id;
                        break;
                    }
                }
            }
        }
    });

    // Handle tab visibility change - pause music when user switches tab
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            pauseBackgroundMusic();
        } else {
            // Resume music only if game is playing and not muted
            if (gameState.state === 'playing' && !isMusicMuted()) {
                playBackgroundMusic();
            }
        }
    });

    // Initialize birds
    initBirds();

    // Initialize clouds
    initClouds();

    // Initialize enemies (pass references)
    initEnemies(hook, frog, lotusFlower, lotusFlower2);
    
    // Initialize caterpillars (they eat the frog's lily pad)
    initCaterpillars(frogLilyPad, frogState);

    // Initialize crabs (they add weight to frog at level 7+)
    initCrabs(frogLilyPad, frogState);

    // Start game loop
    gameLoop();
}

// Main game loop
function gameLoop() {
    // Clear canvas
    clearCanvas();

    // Calculate camera offset based on frog position
    let cameraOffsetY = 0;
    if (gameState.state === 'playing' || gameState.state === 'victory') {
        // Move camera up when frog rises (frog starts at ~510, finish line at 150)
        const frogY = frog.y;
        const midScreen = canvas.height / 2;
        if (frogY < midScreen) {
            // Camera follows frog when it goes above middle of screen
            cameraOffsetY = midScreen - frogY;
        }
    }

    // Apply camera transform
    ctx.save();
    ctx.translate(0, cameraOffsetY);

    // Draw everything
    drawBackground();
    drawVictoryWalls(); // Draw walls and finish line
    drawFish();
    drawLotusFlower(lotusFlower2); // Draw left lotus (behind)
    drawFrogLilyPad();
    drawLotusFlower(lotusFlower); // Draw right lotus
    drawEnemies(); // Draw insects on top of flowers
    drawHolyWater();
    drawDigestPotion();
    drawLeafPotion();
    drawAntidoteBird();
    drawAntidotePotion();
    drawAntidoteParticles();
    drawFrog(hook.state);
    drawFishingRod(); // Draw fishing rod bait in front of frog
    drawCaterpillars(); // Draw caterpillars on top of frog
    drawCrabs(); // Draw crabs (level 7+)
    drawHook();
    drawHealParticles();
    drawWaterDroplets();
    
    // Restore camera transform before drawing UI elements
    ctx.restore();
    
    // Draw UI elements (not affected by camera)
    drawDigestionBar();
    drawHungerTimer();
    drawGlassesButton();
    drawPauseButton();
    drawMuteButton();
    
    // Draw joystick (always on top)
    drawJoystick(ctx);
    
    // Draw intro screen
    if (gameState.state === 'intro') {
        drawIntroScreen();
    }
    
    // Draw pause overlay
    if (gameState.state === 'paused') {
        drawPauseOverlay();
    }

    // Update day/night cycle based on level
    updateDayNight(frogState.targetLevel);

    // Update only if not game over, victory, intro, paused, or jumping
    if (gameState.state !== 'gameover' && gameState.state !== 'victory' && gameState.state !== 'intro' && gameState.state !== 'paused' && gameState.state !== 'jumping') {
        updateFrog();
        updateHook();
        updateEnemies();
        updateCaterpillars();
        updateCrabs();
        updateFish();
        updateWaterDroplets();
        updateBirds();
        updateClouds();
        updateLotusFlowers();
        updateHolyWater();
        updateDigestPotion();
        updateLeafPotion();
        updateAntidotePotion();
        updateHealParticles();
        updateLilyPadFlash();
        updateDigestion();
        updateFalling();
        updateJoystick(); // Update joystick fade effect

        // Check victory condition - if lily pad reaches finish line
        const finishLineY = getFinishLineY();
        if (frogLilyPad.y <= finishLineY && !frogState.isVictory) {
            frogState.isVictory = true;
            frogState.victoryJumpTimer = 0;
            gameState.state = 'victory';
            // Cure poison on victory
            if (frogState.isPoisoned) {
                frogState.isPoisoned = false;
                frogState.poisonTimer = 0;
            }
        }
    } else if (gameState.state === 'jumping') {
        // During jumping animation, only update frog and water
        updateFrog();
        updateWaterDroplets();
        updateJoystick(); // Update joystick fade effect
    }
    
    // Update victory animations
    if (gameState.state === 'victory') {
        updateFrog(); // Continue frog dancing animation
        updateFireworks();
        updateJoystick(); // Update joystick fade effect
        
        // Spawn fireworks periodically
        if (Math.random() < 0.1) {
            spawnFirework();
        }
    }

    // Draw fireworks and victory screen
    if (gameState.state === 'victory') {
        drawFireworks();
        drawVictoryScreen();
    }
    
    // Draw game over screen
    if (gameState.state === 'gameover') {
        drawGameOver();
        updateJoystick(); // Update joystick fade effect even in game over
    }
    
    // Update joystick in intro and paused states too
    if (gameState.state === 'intro' || gameState.state === 'paused') {
        updateJoystick();
    }

    // Only spawn during gameplay
    if (gameState.state === 'playing') {
        // Spawn fish randomly
        timers.fishSpawnTimer++;
        if (timers.fishSpawnTimer >= FISH_SPAWN_INTERVAL) {
            if (Math.random() < 0.6) {
                spawnFish();
            }
            timers.fishSpawnTimer = 0;
        }
    }

    requestAnimationFrame(gameLoop);
}

// Start game when DOM is ready
document.addEventListener('DOMContentLoaded', init);
