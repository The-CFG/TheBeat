const Audio = {
    isReady: false,
    hitSound: null,
    missSound: null,
    gameStartSound: null,
    gameEndSound: null,
    countdownTickSound: null,
    countdownStartSound: null,

    initializeSynths() {
        // 성공/실패 타격음 (파일 기반)
        this.hitSound = new Tone.Sampler({
            urls: { "C4": "hit.mp3" },
            baseUrl: "sfx/",
        }).toDestination();
        
        this.missSound = new Tone.Sampler({
            urls: { "C4": "miss.mp3" },
            baseUrl: "sfx/",
        }).toDestination();

        // 게임 시작/종료 효과음 (파일 기반)
        this.gameStartSound = new Tone.Sampler({
            urls: { "C4": "start.mp3" },
            baseUrl: "sfx/",
        }).toDestination();
        
        this.gameEndSound = new Tone.Sampler({
            urls: { "C4": "cancel.mp3" },
            baseUrl: "sfx/",
        }).toDestination();

        // 카운트다운 효과음 (신디사이저 기반)
        this.countdownTickSound = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.2 }
        }).toDestination();

        this.countdownStartSound = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.2 }
        }).toDestination();

        // 초기 볼륨 설정
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

    playHitSound() {
        if (!this.isReady || !this.hitSound) return;
        this.hitSound.triggerAttack("C4");
    },

    playMissSound() {
        if (!this.isReady || !this.missSound) return;
        this.missSound.triggerAttack("C4");
    },

    playGameStartSound() {
        if (!this.isReady || !this.gameStartSound) return;
        this.gameStartSound.triggerAttack("C4");
    },

    playGameEndSound() {
        if (!this.isReady || !this.gameEndSound) return;
        this.gameEndSound.triggerAttack("C4");
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

        // 모든 Sampler와 Synth의 볼륨을 조절
        if (this.hitSound) this.hitSound.volume.value = synthVolume;
        if (this.missSound) this.missSound.volume.value = synthVolume;
        if (this.gameStartSound) this.gameStartSound.volume.value = synthVolume;
        if (this.gameEndSound) this.gameEndSound.volume.value = synthVolume;
        if (this.countdownTickSound) this.countdownTickSound.volume.value = synthVolume;
        if (this.countdownStartSound) this.countdownStartSound.volume.value = synthVolume;
    }
};
