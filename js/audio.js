const Audio = {
    isReady: false,
    hitSound: null,
    missSound: null, // Tone.Player 객체로 교체될 예정
    countdownTickSound: null,
    countdownStartSound: null,

    initializeSynths() {
        // 성공 타격음
        this.hitSound = new Tone.Player({
            url: "sfx/hit.mp3", // 실제 파일 경로
            autostart: false,
        }).toDestination();
        
        // [핵심 수정] 실패음도 new Tone.Player를 사용합니다.
        // "sfx/miss.mp3" 부분은 실제 파일 경로에 맞게 수정해주세요.
        this.missSound = new Tone.Player({
            url: "sfx/miss.mp3", // 실제 파일 경로
            autostart: false,
        }).toDestination();

        // 카운트다운 소리는 신디사이저를 그대로 유지
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

    playHitSound() {
        if (!this.isReady || !this.hitSound) return;
        if (this.hitSound.loaded) {
            this.hitSound.start();
        }
    },

    // [핵심 수정] triggerAttackRelease 대신 .start()를 호출합니다.
    playMissSound() {
        if (!this.isReady || !this.missSound) return;
        if (this.missSound.loaded) {
            this.missSound.start();
        }
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

        // Tone.Player 객체들의 볼륨을 조절
        if (this.hitSound) this.hitSound.volume.value = synthVolume;
        if (this.missSound) this.missSound.volume.value = synthVolume;
        
        // 나머지 신디사이저 볼륨을 조절
        if (this.countdownTickSound) this.countdownTickSound.volume.value = synthVolume;
        if (this.countdownStartSound) this.countdownStartSound.volume.value = synthVolume;
    }
};
