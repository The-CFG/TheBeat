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
};```

#### `js/ui.js`
화면 전환, 점수판 업데이트 등 UI 관련 로직입니다.

```javascript
const UI = {
    showScreen(screenName) {
        Object.values(DOM.screens).forEach(screen => screen.classList.add('hidden'));
        DOM.screens[screenName].classList.remove('hidden');
        Game.state.gameState = screenName;
    },
    showMessage(type, message) {
        const el = DOM.messages[type];
        if (!el) return;
        el.textContent = message;
        el.classList.remove('hidden');
        setTimeout(() => {
            el.classList.add('hidden');
        }, CONFIG.MESSAGE_DURATION_MS);
    },
    updateScoreboard() {
        DOM.scoreEl.textContent = Game.state.score;
        DOM.comboEl.textContent = Game.state.combo;
        document.getElementById('perfect-count').textContent = Game.state.judgements.perfect;
        document.getElementById('good-count').textContent = Game.state.judgements.good;
        document.getElementById('bad-count').textContent = Game.state.judgements.bad;
        document.getElementById('miss-count').textContent = Game.state.judgements.miss;
    },
    showJudgementFeedback(judgement, currentCombo) {
        DOM.judgementTextEl.textContent = judgement;
        DOM.judgementTextEl.className = 'judgement-text';
        void DOM.judgementTextEl.offsetWidth;
        DOM.judgementTextEl.classList.add('show');
        setTimeout(() => DOM.judgementTextEl.classList.remove('show'), CONFIG.JUDGEMENT_ANIMATION_MS);

        if (currentCombo > 2) {
            DOM.comboTextEl.textContent = `${currentCombo} COMBO`;
            DOM.comboTextEl.className = 'combo-text';
            void DOM.comboTextEl.offsetWidth;
            DOM.comboTextEl.classList.add('show');
            setTimeout(() => DOM.comboTextEl.classList.remove('show'), CONFIG.JUDGEMENT_ANIMATION_MS);
        }
    },
    updateResultScreen() {
        DOM.finalScoreEl.textContent = Game.state.score;
        let rank = 'C';
        if (Game.state.totalNotes > 0) {
            const maxScore = Game.state.totalNotes * CONFIG.POINTS.perfect;
            const percentage = (Game.state.score / maxScore) * 100;
            if (percentage === 100) rank = 'S';
            else if (percentage >= 90) rank = 'A';
            else if (percentage >= 70) rank = 'B';
        }
        DOM.rankEl.textContent = rank;
        DOM.finalPerfectEl.textContent = Game.state.judgements.perfect;
        DOM.finalGoodEl.textContent = Game.state.judgements.good;
        DOM.finalBadEl.textContent = Game.state.judgements.bad;
        DOM.finalMissEl.textContent = Game.state.judgements.miss;
    }
};

function resetPlayingScreenUI() {
    DOM.pauseGameBtn.classList.remove('hidden');
    DOM.resumeGameBtn.classList.add('hidden');
    DOM.playingStatusLabel.textContent = '플레이 중';
}