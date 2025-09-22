// js/audio.js 파일의 전체 내용을 아래 코드로 교체하세요.

const Audio = {
    isReady: false,
    // 1. 객체를 null로 먼저 선언만 해둡니다.
    hitSound: null,
    missSound: null,
    countdownTickSound: null,
    countdownStartSound: null,

    // 2. 초기화 함수를 따로 만듭니다.
    initializeSynths() {
        this.hitSound = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.1 }
        }).toDestination();

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

        // 볼륨 설정을 초기화 시점에도 적용합니다.
        this.setSfxVolume(Game.state.settings.sfxVolume);
        this.setMusicVolume(Game.state.settings.musicVolume);
    },

    async start() {
        if (Audio.isReady) return;
        try {
            await Tone.start();
            // 3. Tone.start()가 성공한 직후에 Synth 객체들을 초기화합니다.
            this.initializeSynths();
            Audio.isReady = true;
            console.log("Audio context started and synths initialized");
            document.body.removeEventListener('click', Audio.start);
            document.body.removeEventListener('touchstart', Audio.start);
        } catch (e) {
            console.error("Could not start audio context", e);
        }
    },

    // 4. 모든 재생 함수에 isReady 체크를 추가하여 안정성을 높입니다.
    playHitSound() {
        if (!this.isReady || !this.hitSound) return;
        this.hitSound.triggerAttackRelease("G5", "16n", Tone.now());
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

    setMusicVolume(value) { // value: 0 ~ 100
        const volume = value / 100;
        DOM.musicPlayer.volume = volume;
    },

    setSfxVolume(value) { // value: 0 ~ 100
        if (!this.isReady) return; // Synth가 없으면 설정 불가
        const db = (value - 100) * 0.5;
        const volume = (value === 0) ? -Infinity : db;
        this.hitSound.volume.value = volume;
        this.missSound.volume.value = volume;
        this.countdownTickSound.volume.value = volume;
        this.countdownStartSound.volume.value = volume;
    }
};
