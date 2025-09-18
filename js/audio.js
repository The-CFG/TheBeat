const Audio = {
    isReady: false,
    hitSound: new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.1 }
    }).toDestination(),
    missSound: new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
    }).toDestination(),
    countdownTickSound: new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.2 }
    }).toDestination(),
    countdownStartSound: new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.2 }
    }).toDestination(),
    async start() {
        if (Audio.isReady) return;
        try {
            await Tone.start();
            Audio.isReady = true;
            console.log("Audio context started");
            document.body.removeEventListener('click', Audio.start);
            document.body.removeEventListener('touchstart', Audio.start);
        } catch (e) {
            console.error("Could not start audio context", e);
        }
    },
    playHitSound() {
        if (!this.isReady) return;
        this.hitSound.triggerAttackRelease("G5", "16n", Tone.now());
    },
    playMissSound() {
        if (!this.isReady) return;
        this.missSound.triggerAttackRelease("C3", "8n", Tone.now());
    },
    playCountdownTick() {
        if (!this.isReady) return;
        this.countdownTickSound.triggerAttackRelease("A4", "16n", Tone.now());
    },
    
    playCountdownStart() {
        if (!this.isReady) return;
        this.countdownStartSound.triggerAttackRelease("A5", "8n", Tone.now());
    }
};