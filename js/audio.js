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

    setMusicVolume(value) { // value: 0 ~ 100
        const volume = value / 100;
        DOM.musicPlayer.volume = volume;
    },

    setSfxVolume(value) { // value: 0 ~ 100
        // Tone.js의 볼륨은 데시벨(dB) 단위입니다.
        // 0-100 값을 -40dB(거의 안들림) ~ 0dB(최대) 범위로 변환합니다.
        const db = (value - 100) * 0.5; // 0.5 계수는 조절 가능
        const volume = (value === 0) ? -Infinity : db; // 0일때는 음소거

        this.hitSound.volume.value = volume;
        this.missSound.volume.value = volume;
        this.countdownTickSound.volume.value = volume;
        this.countdownStartSound.volume.value = volume;
    }
};
