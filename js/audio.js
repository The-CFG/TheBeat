const Audio = {
    isReady: false,
    hitSound: null,
    missSound: null,
    countdownTickSound: null,
    countdownStartSound: null,

    initializeSynths() {
        // [핵심 수정] Tone.Player 대신 Tone.Sampler를 사용합니다.
        // Sampler는 여러 개의 동일한 사운드를 겹쳐서 재생할 수 있습니다.
        this.hitSound = new Tone.Sampler({
            urls: {
                // "C4"는 사운드를 트리거하기 위한 임의의 키(노트 이름)입니다.
                "C4": "hit.mp3",
            },
            baseUrl: "sfx/", // sfx 폴더 안에서 파일을 찾도록 경로를 지정합니다.
        }).toDestination();

        this.missSound = new Tone.Sampler({
            urls: {
                "C4": "miss.mp3",
            },
            baseUrl: "sfx/",
        }).toDestination();

        // 카운트다운 소리는 신디사이저를 그대로 유지합니다.
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

    // [핵심 수정] .start() 대신 .triggerAttack()를 사용하여 사운드를 재생합니다.
    playHitSound() {
        if (!this.isReady || !this.hitSound) return;
        // "C4" 키에 매핑된 사운드를 재생합니다.
        this.hitSound.triggerAttack("C4");
    },

    playMissSound() {
        if (!this.isReady || !this.missSound) return;
        this.missSound.triggerAttack("C4");
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
        
        const db = (value - 100) * 0.5;
        const synthVolume = (value === 0) ? -Infinity : db;

        // Tone.Sampler도 동일한 .volume 속성을 사용하므로 수정할 필요가 없습니다.
        if (this.hitSound) this.hitSound.volume.value = synthVolume;
        if (this.missSound) this.missSound.volume.value = synthVolume;
        
        if (this.countdownTickSound) this.countdownTickSound.volume.value = synthVolume;
        if (this.countdownStartSound) this.countdownStartSound.volume.value = synthVolume;
    }
};
