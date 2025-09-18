document.addEventListener('DOMContentLoaded', () => {

    function setupEventListeners() {
        document.body.addEventListener('click', Audio.start);
        document.body.addEventListener('touchstart', Audio.start);
        window.addEventListener('keydown', Game.handleKeyDown);
        window.addEventListener('keyup', Game.handleKeyUp);
        
        DOM.pauseGameBtn.addEventListener('click', () => Game.togglePause());
        DOM.resumeGameBtn.addEventListener('click', () => Game.togglePause());

        document.getElementById('mode-selector').addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') return;
            Game.state.settings.mode = e.target.dataset.mode;
            document.querySelectorAll('#mode-selector button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const isMusicMode = Game.state.settings.mode === 'music';
            DOM.musicModeControls.classList.toggle('hidden', !isMusicMode);
            DOM.noteCountContainer.classList.toggle('hidden', isMusicMode);
            
            if (!isMusicMode) {
                DOM.chartFileNameEl.textContent = '';
                DOM.musicFileNameEl.textContent = '';
                Game.state.notes = [];
                Game.state.settings.musicSrc = null;
            }
        });
        
        document.getElementById('difficulty-selector').addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') return;
            const preset = e.target.dataset.difficulty;
            Game.state.settings.difficulty = preset;
            Game.state.settings.noteSpeed = CONFIG.DIFFICULTY_SPEED[preset];
            Game.state.settings.dongtaProbability = CONFIG.SIMULTANEOUS_NOTE_PROBABILITY[preset];
            Game.state.settings.longNoteProbability = CONFIG.LONG_NOTE_PROBABILITY[preset];
            
            updateDetailedSettingsUI();
            
            document.querySelectorAll('#difficulty-selector button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
        
        DOM.difficulty.toggleBtn.addEventListener('click', () => {
            DOM.difficulty.detailsPanel.classList.toggle('hidden');
            DOM.difficulty.toggleIcon.classList.toggle('rotate-180');
        });

        DOM.difficulty.speedSlider.addEventListener('input', (e) => {
            const newSpeed = parseInt(e.target.value);
            Game.state.settings.noteSpeed = newSpeed;
            DOM.difficulty.speedValue.textContent = newSpeed;
            setCustomDifficulty();
        });

        DOM.difficulty.dongtaSlider.addEventListener('input', (e) => {
            const newProb = parseInt(e.target.value);
            Game.state.settings.dongtaProbability = newProb / 100;
            DOM.difficulty.dongtaValue.textContent = `${newProb}%`;
            setCustomDifficulty();
        });

        DOM.difficulty.longNoteSlider.addEventListener('input', (e) => {
            const newProb = parseInt(e.target.value);
            Game.state.settings.longNoteProbability = newProb / 100;
            DOM.difficulty.longNoteValue.textContent = `${newProb}%`;
            setCustomDifficulty();
        });
        
        document.getElementById('lanes-selector').addEventListener('change', (e) => {
            const selectedLanes = parseInt(e.target.value);
            Game.state.settings.lanes = selectedLanes;
            updateGameAreaWidth(selectedLanes);
        });

        document.getElementById('chart-file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const chartData = JSON.parse(event.target.result);
                    if (Game.loadChartNotes(chartData)) {
                        DOM.chartFileNameEl.textContent = `차트: ${file.name}`;
                    }
                } catch (error) {
                    UI.showMessage('menu', '잘못된 차트 파일 형식입니다.');
                }
            };
            reader.readAsText(file);
        });

        document.getElementById('music-file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                Game.state.settings.musicSrc = URL.createObjectURL(file);
                DOM.musicFileNameEl.textContent = `음악: ${file.name}`;
            }
        });

        document.getElementById('start-game-btn').addEventListener('click', () => Game.start());
        document.getElementById('give-up-btn').addEventListener('click', () => Game.end());
        document.getElementById('back-to-menu-btn').addEventListener('click', () => {
            DOM.lanesContainer.innerHTML = '';
            resetPlayingScreenUI();
            UI.showScreen('menu');
        });
        document.getElementById('editor-btn').addEventListener('click', () => Editor.init());
    }
    
    function updateGameAreaWidth(lanes) {
      if (lanes >= 7) { 
          DOM.gameArea.classList.remove('md:w-1/2');
          DOM.gameArea.classList.add('md:w-2/3');
          DOM.uiArea.classList.remove('md:w-1/2');
          DOM.uiArea.classList.add('md:w-1/3');
      } else {
          DOM.gameArea.classList.remove('md:w-2/3');
          DOM.gameArea.classList.add('md:w-1/2');
          DOM.uiArea.classList.remove('md:w-1/3');
          DOM.uiArea.classList.add('md:w-1/2');
      }
    }

    function updateDetailedSettingsUI() {
        const speed = Game.state.settings.noteSpeed;
        const dongtaProb = Math.round(Game.state.settings.dongtaProbability * 100);
        const longNoteProb = Math.round(Game.state.settings.longNoteProbability * 100);

        DOM.difficulty.speedSlider.value = speed;
        DOM.difficulty.speedValue.textContent = speed;
        
        DOM.difficulty.dongtaSlider.value = dongtaProb;
        DOM.difficulty.dongtaValue.textContent = `${dongtaProb}%`;

        DOM.difficulty.longNoteSlider.value = longNoteProb;
        DOM.difficulty.longNoteValue.textContent = `${longNoteProb}%`;
    }

    function setCustomDifficulty() {
        Game.state.settings.difficulty = 'custom';
        document.querySelectorAll('#difficulty-selector button').forEach(b => b.classList.remove('active'));
    }

    function initialize() {
        setupEventListeners();
        document.querySelector('#mode-selector button[data-mode="random"]').classList.add('active');
        document.querySelector('#difficulty-selector button[data-difficulty="normal"]').classList.add('active');
        updateDetailedSettingsUI();
    }

    initialize();
});