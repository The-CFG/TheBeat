const Audio = {
    isReady: false,
    hitSound: null,
    missSound: null,
    // [추가] 새로운 사운드 객체
    gameStartSound: null,
    gameEndSound: null,
    countdownTickSound: null,
    countdownStartSound: null,

    initializeSynths() {
        this.hitSound = new Tone.Sampler({ urls: { "C4": "hit.mp3" }, baseUrl: "sfx/" }).toDestination();
        this.missSound = new Tone.Sampler({ urls: { "C4": "miss.mp3" }, baseUrl: "sfx/" }).toDestination();
        
        // [추가] 게임 시작/종료 사운드를 Sampler로 정의합니다.
        // 파일 이름은 실제 파일에 맞게 수정해주세요.
        this.gameStartSound = new Tone.Sampler({ urls: { "C4": "start.mp3" }, baseUrl: "sfx/" }).toDestination();
        this.gameEndSound = new Tone.Sampler({ urls: { "C4": "cancel.mp3" }, baseUrl: "sfx/" }).toDestination();

        this.countdownTickSound = new Tone.Synth({ /* ... */ }).toDestination();
        this.countdownStartSound = new Tone.Synth({ /* ... */ }).toDestination();

        this.setSfxVolume(Game.state.settings.sfxVolume);
        this.setMusicVolume(Game.state.settings.musicVolume);
    },

    async start() { /* ... 기존과 동일 ... */ },

    playHitSound() { /* ... 기존과 동일 ... */ },
    playMissSound() { /* ... 기존과 동일 ... */ },

    // [추가] 새로운 사운드를 재생하는 함수들
    playGameStartSound() {
        if (!this.isReady || !this.gameStartSound) return;
        this.gameStartSound.triggerAttack("C4");
    },
    playGameEndSound() {
        if (!this.isReady || !this.gameEndSound) return;
        this.gameEndSound.triggerAttack("C4");
    },

    playCountdownTick() { /* ... 기존과 동일 ... */ },
    playCountdownStart() { /* ... 기존과 동일 ... */ },
    setMusicVolume(value) { /* ... 기존과 동일 ... */ },

    setSfxVolume(value) {
        if (!this.isReady) return;
        const db = (value - 100) * 0.5;
        const synthVolume = (value === 0) ? -Infinity : db;

        if (this.hitSound) this.hitSound.volume.value = synthVolume;
        if (this.missSound) this.missSound.volume.value = synthVolume;
        
        // [추가] 새로운 사운드도 볼륨 조절에 포함시킵니다.
        if (this.gameStartSound) this.gameStartSound.volume.value = synthVolume;
        if (this.gameEndSound) this.gameEndSound.volume.value = synthVolume;
        
        if (this.countdownTickSound) this.countdownTickSound.volume.value = synthVolume;
        if (this.countdownStartSound) this.countdownStartSound.volume.value = synthVolume;
    }
};
