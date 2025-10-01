const Debugger = {
    isActive: false,
    perf: {
        lastFrameTime: 0,
        frames: 0,
        fps: 0,
        timings: new Map(),
        lastPerfUpdate: 0,
    },

    dragState: {
        isDragging: false,
        offsetX: 0,
        offsetY: 0,
    },

    init() {
        DOM.settings.debugModeToggle.addEventListener('change', (e) => {
            this.toggle(e.target.checked);
        });

        const titleEl = DOM.debugTitle;
        if (titleEl) {
            // 마우스 이벤트
            titleEl.addEventListener('mousedown', (e) => this.dragStart(e));
            
            // 터치 이벤트
            titleEl.addEventListener('touchstart', (e) => this.dragStart(e));
        }
    },

    toggle(isEnabled) {
        this.isActive = isEnabled;
        DOM.debugOverlay.classList.toggle('hidden', !isEnabled);
    },

    _getEventCoords(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    },

    dragStart(e) {
        this.dragState.isDragging = true;
        
        const overlay = DOM.debugOverlay;
        const coords = this._getEventCoords(e);
        
        // 클릭 지점과 오버레이의 왼쪽 상단 모서리 사이의 오프셋을 계산
        this.dragState.offsetX = coords.x - overlay.offsetLeft;
        this.dragState.offsetY = coords.y - overlay.offsetTop;
        
        // CSS의 'right' 속성과의 충돌을 막기 위해 'left'로 전환
        overlay.style.right = 'auto';

        // window에 이벤트 리스너를 등록해야 오버레이 밖으로 마우스가 나가도 계속 드래그됨
        this.boundDragMove = (ev) => this.dragMove(ev);
        this.boundDragEnd = () => this.dragEnd();

        window.addEventListener('mousemove', this.boundDragMove);
        window.addEventListener('mouseup', this.boundDragEnd);
        window.addEventListener('touchmove', this.boundDragMove);
        window.addEventListener('touchend', this.boundDragEnd);
        
        // 텍스트가 선택되는 기본 동작 방지
        e.preventDefault();
    },

    dragMove(e) {
        if (!this.dragState.isDragging) return;

        const coords = this._getEventCoords(e);
        const overlay = DOM.debugOverlay;
        
        // 마우스/터치 위치에서 오프셋을 뺀 값으로 오버레이의 새 위치를 계산
        let newX = coords.x - this.dragState.offsetX;
        let newY = coords.y - this.dragState.offsetY;
        
        // 화면 밖으로 나가지 않도록 최소/최대 위치를 제한
        newX = Math.max(0, Math.min(newX, window.innerWidth - overlay.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - overlay.offsetHeight));

        overlay.style.left = `${newX}px`;
        overlay.style.top = `${newY}px`;
    },

    dragEnd() {
        this.dragState.isDragging = false;
        
        // 메모리 누수를 방지하기 위해 window에서 이벤트 리스너를 반드시 제거
        window.removeEventListener('mousemove', this.boundDragMove);
        window.removeEventListener('mouseup', this.boundDragEnd);
        window.removeEventListener('touchmove', this.boundDragMove);
        window.removeEventListener('touchend', this.boundDragEnd);
    },

    logError(error, context = 'Unknown') {
        console.error(`[${context}]`, error);
        if (!this.isActive) return;
        // ... (기존 logError 로직은 동일) ...
    },

    // [신규] 실시간 상태 뷰어 업데이트 함수
    updateState(stateObject) {
        if (!this.isActive) return;
        
        // 거대한 notes 배열이 UI를 멈추게 하는 것을 방지하기 위해 데이터를 정제
        const replacer = (key, value) => {
            if (key === "notes" && Array.isArray(value)) {
                return `[...Array(${value.length})]`;
            }
            return value;
        };

        const sanitizedState = JSON.stringify(stateObject, replacer, 2);
        DOM.debugStateContainer.querySelector('pre').textContent = sanitizedState;
    },

    // [신규] 성능 프로파일링 시작/종료 함수
    profileStart(name) {
        if (!this.isActive) return;
        this.perf.timings.set(name, { start: performance.now() });
    },
    
    profileEnd(name) {
        if (!this.isActive || !this.perf.timings.has(name)) return;
        const timing = this.perf.timings.get(name);
        timing.duration = performance.now() - timing.start;
    },
    
    // [신규] 성능 정보 UI 업데이트 함수 (매 프레임 호출)
    updatePerf(timestamp) {
        if (!this.isActive) return;

        // FPS 계산
        this.perf.frames++;
        if (timestamp > this.perf.lastPerfUpdate + 1000) {
            this.perf.fps = Math.round((this.perf.frames * 1000) / (timestamp - this.perf.lastPerfUpdate));
            this.perf.lastPerfUpdate = timestamp;
            this.perf.frames = 0;
        }

        // UI 업데이트
        let perfHTML = `<p>FPS: ${this.perf.fps}</p>`;
        this.perf.timings.forEach((timing, name) => {
            if (timing.duration !== undefined) {
                perfHTML += `<p>${name}: ${timing.duration.toFixed(2)}ms</p>`;
            }
        });
        
        DOM.debugPerfContainer.innerHTML = perfHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    let isListeningForKey = false;
    let currentBindingElement = null;
    let tempKeyMappings = {};

    function setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (isListeningForKey) {
                handleKeyBinding(e);
            } else {
                Game.handleKeyDown(e);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (!isListeningForKey) {
                Game.handleKeyUp(e);
            }
        });

        window.addEventListener('click', (e) => {
            if (isListeningForKey && !e.target.classList.contains('keybind-box')) {
                cancelKeyBinding();
            }
        });

        DOM.pauseGameBtn.addEventListener('click', () => Game.togglePause());
        DOM.resumeGameBtn.addEventListener('click', () => Game.togglePause());
        DOM.settings.iconMenu.addEventListener('click', showSettingsScreen);
        DOM.settings.iconPlaying.addEventListener('click', showSettingsScreen);

        DOM.settings.backBtn.addEventListener('click', () => {
            cancelKeyBinding();
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
            DOM.gameArea.classList.remove('md:w-2/3');
            DOM.gameArea.classList.add('md:w-1/2');
            DOM.uiArea.classList.remove('md:w-1/3');
            DOM.uiArea.classList.add('md:w-1/2');
            Game.state.gameState = 'editor';
            Editor.init();

            setTimeout(() => {
                Editor.drawTimeline();
                Editor.renderNotes();
            }, 0);
        });

        DOM.editor.backBtn.addEventListener('click', () => {
            Game.state.gameState = 'menu';
            UI.showScreen('menu');
        });

        document.getElementById('mode-selector').addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') return;
        
            Game.state.settings.mode = e.target.dataset.mode;
            document.querySelectorAll('#mode-selector button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        
            const isMusicMode = Game.state.settings.mode === 'music';
        
            // 뮤직 모드일 경우: 노트 수, 난이도 UI 숨기기
            // 랜덤 모드일 경우: 해당 UI 보이기
            DOM.musicModeControls.classList.toggle('hidden', !isMusicMode);
            DOM.noteCountContainer.classList.toggle('hidden', isMusicMode);
            DOM.difficultyControls.classList.toggle('hidden', isMusicMode);
        
            // 랜덤 모드로 전환 시, 뮤직 모드 관련 정보 초기화
            if (!isMusicMode) {
                DOM.chartFileNameEl.textContent = '';
                DOM.musicFileNameEl.textContent = '';
                DOM.requiredMusicFileNameEl.textContent = '';
                Game.state.notes = [];
                Game.state.settings.musicSrc = null;
                Game.state.settings.musicFileObject = null;
                Game.state.settings.requiredSongName = null;
            }
        });

        document.getElementById('difficulty-selector').addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') return;
            const preset = e.target.dataset.difficulty;
            Game.state.settings.difficulty = preset;
            Game.state.settings.noteSpeed = CONFIG.DIFFICULTY_SPEED[preset];
            Game.state.settings.dongtaProbability = CONFIG.SIMULTANEOUS_NOTE_PROBABILITY[preset];
            Game.state.settings.longNoteProbability = CONFIG.LONG_NOTE_PROBABILITY[preset];
            Game.state.settings.falseNoteProbability = CONFIG.FALSE_NOTE_PROBABILITY[preset];
            updateDetailedSettingsUI();
            document.querySelectorAll('#difficulty-selector button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
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

        DOM.difficulty.falseNoteToggle.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            DOM.difficulty.falseNoteProbContainer.classList.toggle('hidden', !isEnabled);
            if (isEnabled) {
                // 켰을 때 슬라이더 값으로 확률 설정
                const probValue = parseInt(DOM.difficulty.falseNoteProbSlider.value);
                Game.state.settings.falseNoteProbability = probValue / 1000; // 50 -> 0.05 (5%)
            } else {
                // 껐을 때 확률 0으로 설정
                Game.state.settings.falseNoteProbability = 0;
            }
            setCustomDifficulty();
        });

        DOM.difficulty.falseNoteProbSlider.addEventListener('input', (e) => {
            const probValue = parseInt(e.target.value);
            // 슬라이더 값(0~50)을 확률(0~0.05) 및 퍼센트(0~5%)로 변환
            Game.state.settings.falseNoteProbability = probValue / 1000;
            DOM.difficulty.falseNoteProbValue.textContent = `${(probValue / 10)}%`; 
            setCustomDifficulty();
        });

        document.getElementById('lanes-selector').addEventListener('change', (e) => {
            Game.state.settings.lanes = parseInt(e.target.value);
            updateGameAreaWidth(Game.state.settings.lanes);
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

                        if (Game.state.settings.requiredSongName) {
                            DOM.requiredMusicFileNameEl.textContent = `요구 음악 파일: ${Game.state.settings.requiredSongName}`;
                        } else {
                            DOM.requiredMusicFileNameEl.textContent = ''; // 없으면 비움
                        }
                    }
                } catch (error) {
                    UI.showMessage('menu', '잘못된 차트 파일 형식입니다.');
                }
            };
            reader.readAsText(file);
            e.target.value = null;
        });

        document.getElementById('music-file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // [핵심 변경] 임시 URL 대신 파일 객체 자체를 저장합니다.
                Game.state.settings.musicFileObject = file;
                // [변경] musicSrc는 게임 시작 시 동적으로 생성되므로 여기서 제거합니다.
                DOM.musicFileNameEl.textContent = `음악: ${file.name}`;
            }
            e.target.value = null;
        });

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

        window.addEventListener('resize', () => {
            if (Game.state.gameState === 'editor') {
                Editor.drawTimeline();
                Editor.renderNotes();
            }
        });

        DOM.editor.audioFileInput.addEventListener('change', (e) => Editor.handleAudioLoad(e));
        DOM.editor.startTimeInput.addEventListener('input', (e) => { Editor.state.startTimeOffset = parseFloat(e.target.value) || 0; });
        DOM.editor.bpmInput.addEventListener('input', (e) => { Editor.state.bpm = parseInt(e.target.value) || 120; Editor.drawTimeline(); Editor.renderNotes(); });
        DOM.editor.snapSelector.addEventListener('change', (e) => Editor.handleSnapChange(e));
        DOM.editor.noteTypeSelector.addEventListener('click', (e) => Editor.handleNoteTypeSelect(e));
        DOM.editor.addMeasureBtn.addEventListener('click', () => Editor.addMeasure());
        DOM.editor.removeMeasureBtn.addEventListener('click', () => Editor.removeMeasure());
        
        // 관리 버튼
        DOM.editor.playBtn.addEventListener('click', () => Editor.handlePlayPause());
        DOM.editor.stopBtn.addEventListener('click', () => Editor.stopPlayback());
        DOM.editor.saveBtn.addEventListener('click', () => Editor.saveChart()); // 이제 여기서 한 번만 등록됩니다.
        DOM.editor.loadBtn.addEventListener('click', () => DOM.editor.loadInput.click());
        DOM.editor.loadInput.addEventListener('change', (e) => Editor.handleChartLoad(e));
        DOM.editor.resetBtn.addEventListener('click', () => Editor.handleReset());
    
        // 타임라인
        DOM.editor.notesContainer.addEventListener('click', (e) => Editor.handleTimelineClick(e));
    }

    function populateKeybindUI() {
        const currentMappings = Game.state.settings.userKeyMappings || CONFIG.DEFAULT_KEYS;
        tempKeyMappings = { ...currentMappings };
        DOM.settings.controls.keybindBoxes.forEach(box => {
            const keyId = box.dataset.keyId;
            let keyName = tempKeyMappings[keyId] || '';
            if (keyName === ' ') keyName = 'Space';
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
            if (DOM.settings.controls.statusLabel.textContent === '저장되었습니다!') {
                DOM.settings.controls.statusLabel.textContent = '';
            }
        }, 2000);
    }

    function showSettingsScreen() {
        if (Game.state.gameState === 'playing' && !Game.state.isPaused) return;
        Game.state.previousScreen = Game.state.gameState === 'countdown' ? 'playing' : Game.state.gameState;
        Game.state.gameState = 'settings';
        UI.showScreen('settings');
        populateKeybindUI();
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
        const falseNoteProb = Game.state.settings.falseNoteProbability;
        DOM.difficulty.speedSlider.value = speed;
        DOM.difficulty.speedValue.textContent = speed;
        DOM.difficulty.dongtaSlider.value = dongtaProb;
        DOM.difficulty.dongtaValue.textContent = `${dongtaProb}%`;
        DOM.difficulty.longNoteSlider.value = longNoteProb;
        DOM.difficulty.longNoteValue.textContent = `${longNoteProb}%`;
        const falseNoteEnabled = falseNoteProb > 0;
        DOM.difficulty.falseNoteToggle.checked = falseNoteEnabled;
        DOM.difficulty.falseNoteProbContainer.classList.toggle('hidden', !falseNoteEnabled);
        
        // 확률(0~0.05)을 슬라이더 값(0~50) 및 퍼센트로 변환
        const sliderValue = Math.round(falseNoteProb * 1000);
        DOM.difficulty.falseNoteProbSlider.value = sliderValue;
        DOM.difficulty.falseNoteProbValue.textContent = `${(sliderValue / 10).toFixed(1)}%`;
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
        Debugger.init();
    }

    initialize();
});
