// Input handling (mouse, keyboard, and touch)
import { gameState, frogState, addScore, eatFood } from '../state.js';
import { canvas } from './canvas.js';
import { bucketState } from '../environment/background.js';
import { checkCaterpillarHit, killCaterpillar } from '../entities/caterpillar.js';
import { playEatSound } from '../audio/audio.js';

let onShootCallback = null;
let lastTouchPos = { x: 0, y: 0 };

export function setShootCallback(callback) {
    onShootCallback = callback;
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

    // Touch tracking
    canvasElement.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const pos = getCanvasPosition(e, canvasElement);
        gameState.mouseX = pos.x;
        gameState.mouseY = pos.y;
        lastTouchPos = pos;
    }, { passive: false });

    canvasElement.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const pos = getCanvasPosition(e, canvasElement);
        gameState.mouseX = pos.x;
        gameState.mouseY = pos.y;
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

    // Touch tap to shoot or eat caterpillar
    canvasElement.addEventListener('touchend', (e) => {
        if (gameState.state === 'playing') {
            e.preventDefault();
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
