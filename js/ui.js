const UI = {
    showScreen(screenName) {
        Object.values(DOM.screens).forEach(screen => screen.classList.add('hidden'));
        DOM.screens[screenName].classList.remove('hidden');
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
        let displayText = judgement.toUpperCase();
    
        // [핵심 수정] 여기서 화면에 표시될 텍스트를 원하는 대로 바꿀 수 있습니다.
        switch (judgement) {
            case 'perfect':
                displayText = '순산!!'; // 예: 'MARVELOUS'
                break;
            case 'good':
                displayText = '호잇쨔!!'; // 예: 'NICE'
                break;
            case 'bad':
                displayText = '!!쨔잇호'; // 이 부분도 원하시면 바꿀 수 있습니다.
                break;
            case 'miss':
                displayText = '난산...'; // 이 부분도 원하시면 바꿀 수 있습니다.
                break;
        }
    
        // 판정 텍스트를 설정하고 애니메이션을 시작합니다.
        DOM.judgementTextEl.textContent = displayText;
        DOM.judgementTextEl.className = 'judgement-text';
        void DOM.judgementTextEl.offsetWidth;
        DOM.judgementTextEl.classList.add('show');
        setTimeout(() => DOM.judgementTextEl.classList.remove('show'), CONFIG.JUDGEMENT_ANIMATION_MS);
    
        // 콤보 텍스트 표시 로직 (기존과 동일)
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
    DOM.settings.iconPlaying.classList.add('hidden');
}
