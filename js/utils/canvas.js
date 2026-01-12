// Canvas utilities

export let canvas = null;
export let ctx = null;

export function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    return { canvas, ctx };
}

export function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function getCanvasSize() {
    return {
        width: canvas.width,
        height: canvas.height
    };
}
