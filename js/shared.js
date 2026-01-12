// Shared references to avoid circular dependencies
// This file acts as a central hub for cross-module references

// These will be set by the respective modules when they initialize
export const refs = {
    frog: null,
    hook: null,
    frogLilyPad: null,
    lotusFlower: null,
    lotusFlower2: null,
    enemies: null,
    fishJumps: null,
    waterDroplets: null,
    birds: null
};

// Setter functions
export function setFrogRef(frog) {
    refs.frog = frog;
}

export function setHookRef(hook) {
    refs.hook = hook;
}

export function setFrogLilyPadRef(lilypad) {
    refs.frogLilyPad = lilypad;
}

export function setLotusRefs(lotus1, lotus2) {
    refs.lotusFlower = lotus1;
    refs.lotusFlower2 = lotus2;
}
