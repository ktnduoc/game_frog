// Audio system using Web Audio API

let audioCtx = null;
let bgMusic = null;
let isMuted = true; // Default muted
let bgMusicGain = null;

export function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

export function getAudioContext() {
    return audioCtx;
}

// Background music
export function loadBackgroundMusic() {
    if (!audioCtx) initAudio();
    
    bgMusic = new Audio('sounds/frog_dance.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    
    return bgMusic;
}

export function playBackgroundMusic() {
    if (bgMusic && !isMuted) {
        bgMusic.play().catch(err => console.log('Audio play failed:', err));
    }
}

export function pauseBackgroundMusic() {
    if (bgMusic) {
        bgMusic.pause();
    }
}

export function toggleMute() {
    isMuted = !isMuted;
    
    // Resume audio context on first interaction
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    if (bgMusic) {
        if (isMuted) {
            bgMusic.pause();
        } else {
            bgMusic.play().catch(err => console.log('Audio play failed:', err));
        }
    }
    
    return isMuted;
}

export function isMusicMuted() {
    return isMuted;
}

// Sound: Tongue shooting out (quick whip sound)
export function playTongueSound() {
    if (!audioCtx || isMuted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.1);
}

// Sound: Catching/eating insect (gulp sound)
export function playEatSound() {
    if (!audioCtx || isMuted) return;
    
    // Play frog eating sound from MP3 file
    const eatAudio = new Audio('sounds/frog.mp3');
    eatAudio.volume = 0.5;
    eatAudio.play().catch(err => console.log('Frog eat sound failed:', err));
}

// Sound: Level up (happy chime)
export function playLevelUpSound() {
    if (!audioCtx || isMuted) return;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
        setTimeout(() => {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.3);
        }, i * 100);
    });
}

// Sound: Holy Water Heal (magical sparkle)
export function playHolyWaterSound() {
    if (!audioCtx) return;
    const notes = [523, 659, 784, 880, 1047]; // C5, E5, G5, A5, C6

    notes.forEach((freq, i) => {
        setTimeout(() => {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.4);
        }, i * 60);
    });
    
    // Add sparkle effect
    setTimeout(() => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1500, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2500, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
    }, 200);
}

// Sound: Miss (sad sound)
export function playMissSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.3);
}

// Sound: Frog ribbit (croak)
export function playRibbitSound() {
    if (!audioCtx || isMuted) return;

    // First croak
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(120, audioCtx.currentTime);
    osc1.frequency.setValueAtTime(180, audioCtx.currentTime + 0.05);
    osc1.frequency.setValueAtTime(100, audioCtx.currentTime + 0.15);
    gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain1.gain.setValueAtTime(0.2, audioCtx.currentTime + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.2);

    // Second croak
    setTimeout(() => {
        if (!audioCtx || isMuted) return;
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc2.frequency.setValueAtTime(150, audioCtx.currentTime + 0.08);
        osc2.frequency.setValueAtTime(80, audioCtx.currentTime + 0.25);
        gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.25, audioCtx.currentTime + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.3);
    }, 250);
}

// Sound: Special firefly catch
export function playFireflySound() {
    if (!audioCtx) return;
    const notes = [880, 1108, 1318, 1760]; // A5, C#6, E6, A6

    notes.forEach((freq, i) => {
        setTimeout(() => {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.4);
        }, i * 80);
    });
}

// Sound: Water splash
export function playWaterSplashSound() {
    if (isMuted) return;
    
    // Play water splash sound from MP3 file
    const waterAudio = new Audio('sounds/water.mp3');
    waterAudio.volume = 0.4;
    waterAudio.play().catch(err => console.log('Water splash sound failed:', err));
}

// Sound: Caterpillar eating warning (munching/alarm sound)
export function playCaterpillarWarningSound() {
    if (!audioCtx || isMuted) return;

    // Quick alarm beep
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc1.frequency.setValueAtTime(600, audioCtx.currentTime + 0.08);
    gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.15);

    // Munching sound (low frequency pulsing)
    setTimeout(() => {
        if (!audioCtx || isMuted) return;
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc2.frequency.setValueAtTime(180, audioCtx.currentTime + 0.05);
        gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.1);
    }, 100);
}

export function playCaptureSound() {
    if (isMuted) return;
    
    const audio = new Audio('sounds/capture.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Capture sound failed:', err));
}

export function playFallInWaterSound() {
    if (isMuted) return;
    
    const audio = new Audio('sounds/water-2.mp3');
    audio.volume = 0.6;
    audio.play().catch(err => console.log('Fall in water sound failed:', err));
}

export function playBoongSound() {
    if (isMuted) return;
    
    const audio = new Audio('sounds/boong.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Boong sound failed:', err));
}
