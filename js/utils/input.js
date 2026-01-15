// Input handling (mouse, keyboard, and touch)
import { gameState, frogState, addScore, eatFood } from '../state.js';
import { canvas } from './canvas.js';
import { bucketState } from '../environment/background.js';
import { checkCaterpillarHit, killCaterpillar } from '../entities/caterpillar.js';
import { playEatSound } from '../audio/audio.js';

let onShootCallback = null;
let lastTouchPos = { x: 0, y: 0 };

// Virtual joystick DOM elements
let joystickElement = null;
let joystickStick = null;

// Virtual joystick state
const joystickState = {
    active: false,
    maxRadius: 70, // Max distance stick can move from center
    centerX: 80, // Center of joystick base (relative to base element)
    centerY: 80,
    currentX: 0, // Current stick offset
    currentY: 0
};

export function setShootCallback(callback) {
    onShootCallback = callback;
}

// Initialize joystick DOM references
function initJoystickElements() {
    if (!joystickElement) {
        joystickElement = document.getElementById('virtualJoystick');
        joystickStick = joystickElement?.querySelector('.joystick-stick');
    }
}

// Update joystick visual position
function updateJoystickVisual() {
    if (!joystickStick) return;
    
    if (joystickState.active) {
        joystickElement.classList.add('active');
        // Update stick position
        const translateX = joystickState.currentX;
        const translateY = joystickState.currentY;
        joystickStick.style.transform = `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px))`;
    } else {
        joystickElement.classList.remove('active');
        // Reset to center
        joystickStick.style.transform = 'translate(-50%, -50%)';
    }
}

// No longer need these exports as joystick is HTML-based
export function drawJoystick(ctx) {
    // Not used anymore - joystick is now HTML element
}

export function updateJoystick() {
    updateJoystickVisual();
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
    // Initialize joystick DOM elements
    initJoystickElements();
    
    // Mouse tracking
    canvasElement.addEventListener('mousemove', (e) => {
        const pos = getCanvasPosition(e, canvasElement);
        gameState.mouseX = pos.x;
        gameState.mouseY = pos.y;
    });

    // Touch tracking - Listen on document to capture touches anywhere on screen
    let touchStartTime = 0;
    const longPressDelay = 150; // ms to activate joystick (reduced for faster response)

    document.addEventListener('touchstart', (e) => {
        if (e.cancelable) {
            e.preventDefault();
        }
        const pos = getCanvasPosition(e, canvasElement);
        touchStartTime = Date.now();
        
        // Reset joystick stick to center
        joystickState.currentX = 0;
        joystickState.currentY = 0;
        
        gameState.mouseX = pos.x;
        gameState.mouseY = pos.y;
        lastTouchPos = pos;
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (e.cancelable) {
            e.preventDefault();
        }
        const pos = getCanvasPosition(e, canvasElement);
        
        // Check if long press (activate joystick)
        const holdTime = Date.now() - touchStartTime;
        if (holdTime > longPressDelay) {
            joystickState.active = true;
            
            // Get joystick position on screen (center bottom)
            const joystickScreenX = window.innerWidth / 2;
            const joystickScreenY = window.innerHeight - 52 - 80; // bottom 52px + half of joystick height (160/2)
            
            // Get touch position on screen
            const touchScreenX = e.touches[0].clientX;
            const touchScreenY = e.touches[0].clientY;
            
            // Calculate direction from joystick center to touch position
            const dx = touchScreenX - joystickScreenX;
            const dy = touchScreenY - joystickScreenY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                // Clamp stick within max radius for visual
                const stickDistance = Math.min(distance, joystickState.maxRadius);
                joystickState.currentX = (dx / distance) * stickDistance;
                joystickState.currentY = (dy / distance) * stickDistance;
                
                // Calculate game target position based on direction
                const frogX = canvasElement.width / 2;
                const frogY = canvasElement.height - 80;
                const targetDistance = 500;
                gameState.mouseX = frogX + (dx / distance) * targetDistance;
                gameState.mouseY = frogY + (dy / distance) * targetDistance;
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
            if (e.cancelable) {
                e.preventDefault();
            }
            
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
