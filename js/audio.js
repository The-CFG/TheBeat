const Audio = {
    isReady: false,
    hitSound: null, // Tone.Player 객체로 교체될 예정
    missSound: null,
    countdownTickSound: null,
    countdownStartSound: null,

    initializeSynths() {
        // [핵심 수정] new Tone.Synth 대신 new Tone.Player를 사용합니다.
        // "sfx/hit.mp3" 부분은 실제 파일 경로에 맞게 수정해주세요.
        this.hitSound = new Tone.Player({
            url: "sfx/hit.mp3",
            autostart: false,
        }).toDestination();
        
        // 나머지 신디사이저는 그대로 유지됩니다.
        this.missSound = new Tone.Synth({
            oscillator: { type: 'square' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
        }).toDestination();

        this.countdownTickSound = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.2 }
        }).toDestination();

        this.countdownStartSound = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.2 }
        }).toDestination();

        this.setSfxVolume(Game.state.settings.sfxVolume);
        this.setMusicVolume(Game.state.settings.musicVolume);
    },

    async start() {
        if (Audio.isReady) return;
        try {
            await Tone.start();
            this.initializeSynths();
            Audio.isReady = true;
            console.log("Audio context started and synths initialized");
        } catch (err) {
            Debugger.logError(err, 'Audio.start');
            console.error("Could not start audio context", err);
        }
    },

    // [핵심 수정] triggerAttackRelease 대신 .start()를 호출합니다.
    playHitSound() {
        if (!this.isReady || !this.hitSound) return;
        
        // 파일이 로드되었는지 확인 후 재생하여 안정성을 높입니다.
        if (this.hitSound.loaded) {
            this.hitSound.start();
        }
    },

    playMissSound() {
        if (!this.isReady || !this.missSound) return;
        this.missSound.triggerAttackRelease("C3", "8n", Tone.now());
    },

    playCountdownTick() {
        if (!this.isReady || !this.countdownTickSound) return;
        this.countdownTickSound.triggerAttackRelease("A4", "16n", Tone.now());
    },

    playCountdownStart() {
        if (!this.isReady || !this.countdownStartSound) return;
        this.countdownStartSound.triggerAttackRelease("A5", "8n", Tone.now());
    },

    setMusicVolume(value) {
        const volume = value / 100;
        DOM.musicPlayer.volume = volume;
    },

    setSfxVolume(value) {
        if (!this.isReady) return;
        
        // 기존 신디사이저 볼륨 조절 (Tone.js는 데시벨 단위)
        const db = (value - 100) * 0.5;
        const synthVolume = (value === 0) ? -Infinity : db;

        // Tone.Player도 동일한 .volume 속성을 사용합니다.
        if (this.hitSound) this.hitSound.volume.value = synthVolume;
        
        if (this.missSound) this.missSound.volume.value = synthVolume;
        if (this.countdownTickSound) this.countdownTickSound.volume.value = synthVolume;
        if (this.countdownStartSound) this.countdownStartSound.volume.value = synthVolume;
    }
};
