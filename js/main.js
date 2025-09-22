document.addEventListener('DOMContentLoaded', () => {
    // --- 키 바인딩 상태 관리를 위한 변수 ---
    let isListeningForKey = false;
    let currentBindingElement = null;
    let tempKeyMappings = {}; // 저장 버튼 누르기 전의 임시 변경 사항

    function setupEventListeners() {
        // 키 입력 처리: 키 바인딩 모드와 게임 플레이 모드를 구분
        window.addEventListener('keydown', (e) => {
            if (isListeningForKey) {
                handleKeyBinding(e); // 키 바인딩 모드일 경우
            } else {
                Game.handleKeyDown(e); // 게임 플레이 중일 경우
            }
        });

        window.addEventListener('keyup', (e) => Game.handleKeyUp(e));
        
        // 키 바인딩 중 다른 곳을 클릭하면 취소
        window.addEventListener('click', (e) => {
            if (isListeningForKey && !e.target.classList.contains('keybind-box')) {
                cancelKeyBinding();
            }
        });
        
        // --- 게임 플레이 관련 이벤트 리스너 ---
        DOM.pauseGameBtn.addEventListener('click', () => Game.togglePause());
        DOM.resumeGameBtn.addEventListener('click', () => Game.togglePause());
        
        // --- 화면 전환 관련 이벤트 리스너 ---
        DOM.settings.iconMenu.addEventListener('click', showSettingsScreen);
        DOM.settings.iconPlaying.addEventListener('click', showSettingsScreen);
        
        DOM.settings.backBtn.addEventListener('click', () => {
            cancelKeyBinding(); // 설정 창 나갈 때 키 바인딩 상태 초기화
            Game.state.gameState = Game.state.previousScreen;
            UI.showScreen(Game.state.previousScreen);
            if (Game.state.previousScreen === 'playing' && Game.state.isPaused) {
                DOM.pauseGameBtn.classList.add('hidden');
                DOM.resumeGameBtn.classList.remove('hidden');
            }
        });

        document.getElementById('start-game-btn').addEventListener('click', async () => {
            await Game.start();
        });
        
        document.getElementById('give-up-btn').addEventListener('click', () => Game.end());
        
        document.getElementById('back-to-menu-btn').addEventListener('click', () => {
            DOM.lanesContainer.innerHTML = '';
            resetPlayingScreenUI();
            Game.state.gameState = 'menu';
            UI.showScreen('menu');
        });
        
        document.getElementById('editor-btn').addEventListener('click', () => {
            Game.state.gameState = 'editor';
            Editor.init()
        });

        DOM.editor.backBtn.addEventListener('click', () => {
            Game.state.gameState = 'menu';
            UI.showScreen('menu');
        });

        // --- 메뉴 화면 설정 관련 이벤트 리스너 ---
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

            if (preset === 'hard') {
                Game.state.settings.isFalseNoteEnabled = true;
                Game.state.settings.falseNoteProbability = 0.03;
            } else {
                Game.state.settings.isFalseNoteEnabled = false;
                Game.state.settings.falseNoteProbability = 0;
            }
            updateDetailedSettingsUI();

            document.querySelectorAll('#difficulty-selector button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });

        DOM.difficulty.falseNoteToggle.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            Game.state.settings.isFalseNoteEnabled = isEnabled;
            
            // [수정] 슬라이더 컨테이너의 표시/숨김을 관리
            DOM.difficulty.falseNoteSliderContainer.classList.toggle('hidden', !isEnabled);
            
            // 토글을 끌 경우 확률을 0으로 리셋
            if (!isEnabled) {
                Game.state.settings.falseNoteProbability = 0;
            } else {
                // 켤 경우, 슬라이더의 현재 값을 확률로 설정
                const currentProbValue = parseInt(DOM.difficulty.falseNoteProbSlider.value);
                Game.state.settings.falseNoteProbability = currentProbValue / 100;
            }
            setCustomDifficulty();
        });
        
        DOM.difficulty.falseNoteProbSlider.addEventListener('input', (e) => {
            const prob = parseInt(e.target.value);
            Game.state.settings.falseNoteProbability = prob / 100;
            DOM.difficulty.falseNoteProbValue.textContent = `${prob}%`;
            setCustomDifficulty();
        });


        DOM.difficulty.toggleBtn.addEventListener('click', () => {
            DOM.difficulty.detailsPanel.classList.toggle('hidden');
            DOM.difficulty.toggleIcon.classList.toggle('rotate-180');
        });

        DOM.difficulty.speedSlider.addEventListener('input', (e) => {
            Game.state.settings.noteSpeed = parseInt(e.target.value);
            DOM.difficulty.speedValue.textContent = e.target.value;
            setCustomDifficulty();
        });

        DOM.difficulty.dongtaSlider.addEventListener('input', (e) => {
            Game.state.settings.dongtaProbability = parseInt(e.target.value) / 100;
            DOM.difficulty.dongtaValue.textContent = `${e.target.value}%`;
            setCustomDifficulty();
        });

        DOM.difficulty.longNoteSlider.addEventListener('input', (e) => {
            Game.state.settings.longNoteProbability = parseInt(e.target.value) / 100;
            DOM.difficulty.longNoteValue.textContent = `${e.target.value}%`;
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

        // --- 설정 화면 내부 이벤트 리스너 ---
        DOM.settings.tabsContainer.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') return;
            const tabName = e.target.dataset.tab;
            DOM.settings.tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            DOM.settings.tabContents.forEach(content => content.classList.add('hidden'));
            e.target.classList.add('active');
            document.getElementById(`tab-content-${tabName}`).classList.remove('hidden');
        });

        DOM.settings.musicVolumeSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            Game.state.settings.musicVolume = value;
            DOM.settings.musicVolumeValue.textContent = value;
            Audio.setMusicVolume(value);
        });

        DOM.settings.sfxVolumeSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            Game.state.settings.sfxVolume = value;
            DOM.settings.sfxVolumeValue.textContent = value;
            Audio.setSfxVolume(value);
        });
        
        // 조작 탭 관련 이벤트 리스너
        DOM.settings.controls.keybindBoxes.forEach(box => {
            box.addEventListener('click', () => {
                if (isListeningForKey) {
                    cancelKeyBinding();
                }
                startKeyBinding(box);
            });
        });

        DOM.settings.controls.saveBtn.addEventListener('click', () => {
            saveKeyBindings();
        });
    }

    // --- 키 바인딩 관련 함수들 ---

    function populateKeybindUI() {
        const currentMappings = Game.state.settings.userKeyMappings || CONFIG.DEFAULT_KEYS;
        tempKeyMappings = { ...currentMappings }; // UI를 채울 때 임시 객체도 동기화

        DOM.settings.controls.keybindBoxes.forEach(box => {
            const keyId = box.dataset.keyId;
            let keyName = tempKeyMappings[keyId] || '';
            if (keyName === ' ') keyName = 'Space'; // 표시 텍스트 보정
            box.textContent = keyName.replace('Semicolon', ';');
        });
    }

    function startKeyBinding(element) {
        isListeningForKey = true;
        currentBindingElement = element;
        element.classList.add('listening');
        element.textContent = '...';
        DOM.settings.controls.statusLabel.textContent = '지정을 원하는 키를 입력하세요.';
    }

    function handleKeyBinding(e) {
        e.preventDefault();
        
        if (e.key === 'Escape') {
            cancelKeyBinding();
            return;
        }

        let keyName = e.key;
        if (keyName === ' ') keyName = 'Space';
        if (e.code === 'Semicolon') keyName = 'Semicolon';

        const keyId = currentBindingElement.dataset.keyId;
        tempKeyMappings[keyId] = keyName;

        currentBindingElement.textContent = keyName.replace('Semicolon', ';');
        
        currentBindingElement.classList.remove('listening');
        isListeningForKey = false;
        currentBindingElement = null;
        DOM.settings.controls.statusLabel.textContent = '';
    }

    function cancelKeyBinding() {
        if (!isListeningForKey) return;

        const keyId = currentBindingElement.dataset.keyId;
        const originalMappings = Game.state.settings.userKeyMappings || CONFIG.DEFAULT_KEYS;
        let originalKeyName = originalMappings[keyId] || '';
        if (originalKeyName === ' ') originalKeyName = 'Space';
        currentBindingElement.textContent = originalKeyName.replace('Semicolon', ';');

        currentBindingElement.classList.remove('listening');
        isListeningForKey = false;
        currentBindingElement = null;
        DOM.settings.controls.statusLabel.textContent = '';
    }

    function saveKeyBindings() {
        Game.state.settings.userKeyMappings = { ...tempKeyMappings };
        UI.showMessage('menu', '키 설정이 저장되었습니다.');
        DOM.settings.controls.statusLabel.textContent = '저장되었습니다!';
        setTimeout(() => {
            if(DOM.settings.controls.statusLabel.textContent === '저장되었습니다!') {
                DOM.settings.controls.statusLabel.textContent = '';
            }
        }, 2000);
    }

    // --- 유틸리티 및 헬퍼 함수들 ---

    function showSettingsScreen() {
        if (Game.state.gameState === 'playing' && !Game.state.isPaused) return;

        Game.state.previousScreen = Game.state.gameState === 'countdown' ? 'playing' : Game.state.gameState;
        Game.state.gameState = 'settings';
        UI.showScreen('settings');
        
        populateKeybindUI(); // 설정 창을 열 때마다 현재 키 설정으로 UI를 채움

        DOM.settings.musicVolumeSlider.value = Game.state.settings.musicVolume;
        DOM.settings.musicVolumeValue.textContent = Game.state.settings.musicVolume;
        DOM.settings.sfxVolumeSlider.value = Game.state.settings.sfxVolume;
        DOM.settings.sfxVolumeValue.textContent = Game.state.settings.sfxVolume;
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

        DOM.difficulty.falseNoteToggle.checked = Game.state.settings.isFalseNoteEnabled;

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
