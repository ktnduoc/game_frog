// Input handling (mouse, keyboard, and touch)
import { gameState, frogState, addScore, eatFood } from '../state.js';
import { canvas } from './canvas.js';
import { bucketState } from '../environment/background.js';
import { checkCaterpillarHit, killCaterpillar } from '../entities/caterpillar.js';
import { playEatSound } from '../audio/audio.js';

let onShootCallback = null;
let lastTouchPos = { x: 0, y: 0 };

// Virtual joystick state
const joystickState = {
    active: false,
    baseX: 0,
    baseY: 0,
    stickX: 0,
    stickY: 0,
    maxRadius: 80,
    stickRadius: 30,
    opacity: 0,
    fadeSpeed: 0.1
};

export function setShootCallback(callback) {
    onShootCallback = callback;
}

// Draw virtual joystick
export function drawJoystick(ctx) {
    if (joystickState.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = joystickState.opacity;

    // Draw base circle
    ctx.beginPath();
    ctx.arc(joystickState.baseX, joystickState.baseY, joystickState.maxRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw center dot
    ctx.beginPath();
    ctx.arc(joystickState.baseX, joystickState.baseY, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();

    // Draw stick
    ctx.beginPath();
    ctx.arc(joystickState.stickX, joystickState.stickY, joystickState.stickRadius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
        joystickState.stickX, joystickState.stickY, 0,
        joystickState.stickX, joystickState.stickY, joystickState.stickRadius
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
}

// Update joystick opacity
export function updateJoystick() {
    if (joystickState.active) {
        // Fade in
        joystickState.opacity = Math.min(1, joystickState.opacity + joystickState.fadeSpeed);
    } else {
        // Fade out
        joystickState.opacity = Math.max(0, joystickState.opacity - joystickState.fadeSpeed);
    }
}

function getCanvasPosition(e, canvasElement) {
    const rect = canvasElement.getBoundingClientRect();
    const scaleX = canvasElement.width / rect.width;
    const scaleY = canvasElement.height / rect.height;
    
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

export function initInput(canvasElement) {
    // Mouse tracking
    canvasElement.addEventListener('mousemove', (e) => {
        const pos = getCanvasPosition(e, canvasElement);
        gameState.mouseX = pos.x;
        gameState.mouseY = pos.y;
    });

    // Touch tracking - Listen on document to capture touches anywhere on screen
    let touchStartTime = 0;
    const longPressDelay = 200; // ms to activate joystick

    document.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const pos = getCanvasPosition(e, canvasElement);
        touchStartTime = Date.now();
        
        // Initialize joystick at touch position
        joystickState.baseX = pos.x;
        joystickState.baseY = pos.y;
        joystickState.stickX = pos.x;
        joystickState.stickY = pos.y;
        
        gameState.mouseX = pos.x;
        gameState.mouseY = pos.y;
        lastTouchPos = pos;
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const pos = getCanvasPosition(e, canvasElement);
        
        // Check if long press (activate joystick)
        const holdTime = Date.now() - touchStartTime;
        if (holdTime > longPressDelay) {
            joystickState.active = true;
            
            // Calculate stick position relative to base
            const dx = pos.x - joystickState.baseX;
            const dy = pos.y - joystickState.baseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Clamp stick within max radius
            if (distance > joystickState.maxRadius) {
                const angle = Math.atan2(dy, dx);
                joystickState.stickX = joystickState.baseX + Math.cos(angle) * joystickState.maxRadius;
                joystickState.stickY = joystickState.baseY + Math.sin(angle) * joystickState.maxRadius;
            } else {
                joystickState.stickX = pos.x;
                joystickState.stickY = pos.y;
            }
            
            // Calculate target position based on joystick direction
            const stickDx = joystickState.stickX - joystickState.baseX;
            const stickDy = joystickState.stickY - joystickState.baseY;
            const stickDistance = Math.sqrt(stickDx * stickDx + stickDy * stickDy);
            
            if (stickDistance > 5) {
                // Calculate target position far from frog in the stick direction
                const targetDistance = 500; // Distance from base to target
                gameState.mouseX = joystickState.baseX + (stickDx / stickDistance) * targetDistance;
                gameState.mouseY = joystickState.baseY + (stickDy / stickDistance) * targetDistance;
            }
        } else {
            // Normal touch move
            gameState.mouseX = pos.x;
            gameState.mouseY = pos.y;
        }
        
        lastTouchPos = pos;
    }, { passive: false });

    // Keyboard input
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (onShootCallback) {
                onShootCallback();
            }
        }
    });

    // Mouse click to shoot or eat caterpillar
    canvasElement.addEventListener('click', (e) => {
        const pos = getCanvasPosition(e, canvasElement);

        // Check if clicked on bucket
        if (bucketState.clickable &&
            pos.x >= bucketState.bounds.x &&
            pos.x <= bucketState.bounds.x + bucketState.bounds.width &&
            pos.y >= bucketState.bounds.y &&
            pos.y <= bucketState.bounds.y + bucketState.bounds.height) {
            // Start bucket animation
            bucketState.mode = 'lowering';
            bucketState.targetRopeLength = 380; // Lower deeper to water level
            bucketState.clickable = false;
            return;
        }

        // Check if clicked on caterpillar (direct click to kill - caterpillar rolls and falls)
        if (gameState.state === 'playing') {
            const hitCaterpillar = checkCaterpillarHit(pos.x, pos.y);
            if (hitCaterpillar) {
                // Kill caterpillar - triggers dying animation
                let nutrition = killCaterpillar(hitCaterpillar);

                // Double points if buff is active
                if (frogState.doublePointsActive) {
                    nutrition *= 2;
                }

                addScore(nutrition);
                eatFood(nutrition, false);

                // Reset hunger timer
                frogState.hungerTimer = 0;
                frogState.isStarving = false;

                playEatSound();
                return;
            }
        }

        // Normal shoot action
        if (onShootCallback && gameState.state === 'playing') {
            onShootCallback();
        }
    });

    // Touch tap to shoot or eat caterpillar - Listen on document to capture touches anywhere on screen
    document.addEventListener('touchend', (e) => {
        if (gameState.state === 'playing') {
            e.preventDefault();
            
            // Deactivate joystick
            joystickState.active = false;
            
            const pos = lastTouchPos;

            // Check if tapped on bucket
            if (bucketState.clickable &&
                pos.x >= bucketState.bounds.x &&
                pos.x <= bucketState.bounds.x + bucketState.bounds.width &&
                pos.y >= bucketState.bounds.y &&
                pos.y <= bucketState.bounds.y + bucketState.bounds.height) {
                // Start bucket animation
                bucketState.mode = 'lowering';
                bucketState.targetRopeLength = 380; // Lower deeper to water level
                bucketState.clickable = false;
                return;
            }

            // Check if tapped on caterpillar (direct tap to kill - caterpillar rolls and falls)
            const hitCaterpillar = checkCaterpillarHit(pos.x, pos.y);
            if (hitCaterpillar) {
                // Kill caterpillar - triggers dying animation
                let nutrition = killCaterpillar(hitCaterpillar);

                // Double points if buff is active
                if (frogState.doublePointsActive) {
                    nutrition *= 2;
                }

                addScore(nutrition);
                eatFood(nutrition, false);

                // Reset hunger timer
                frogState.hungerTimer = 0;
                frogState.isStarving = false;

                playEatSound();
                return;
            }

            // Normal shoot action
            if (onShootCallback) {
                onShootCallback();
            }
        }
    }, { passive: false });

    // Prevent context menu on long press
    canvasElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}
