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
            titleEl.addEventListener('mousedown', (e) => this.dragStart(e));
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
        this.dragState.offsetX = coords.x - overlay.offsetLeft;
        this.dragState.offsetY = coords.y - overlay.offsetTop;
        overlay.style.right = 'auto';
        this.boundDragMove = (ev) => this.dragMove(ev);
        this.boundDragEnd = () => this.dragEnd();
        window.addEventListener('mousemove', this.boundDragMove);
        window.addEventListener('mouseup', this.boundDragEnd);
        window.addEventListener('touchmove', this.boundDragMove);
        window.addEventListener('touchend', this.boundDragEnd);
        e.preventDefault();
    },

    dragMove(e) {
        if (!this.dragState.isDragging) return;
        const coords = this._getEventCoords(e);
        const overlay = DOM.debugOverlay;
        let newX = coords.x - this.dragState.offsetX;
        let newY = coords.y - this.dragState.offsetY;
        newX = Math.max(0, Math.min(newX, window.innerWidth - overlay.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - overlay.offsetHeight));
        overlay.style.left = `${newX}px`;
        overlay.style.top = `${newY}px`;
    },

    dragEnd() {
        this.dragState.isDragging = false;
        window.removeEventListener('mousemove', this.boundDragMove);
        window.removeEventListener('mouseup', this.boundDragEnd);
        window.removeEventListener('touchmove', this.boundDragMove);
        window.removeEventListener('touchend', this.boundDragEnd);
    },

    logError(error, context = 'Unknown') {
        console.error(`[${context}]`, error);
        if (!this.isActive) return;
        const logContainer = DOM.debugLogContainer;
        const errorEl = document.createElement('p');
        errorEl.innerHTML = `<span class="error-context">[${context}]</span>: <span class="error-message">${error.message}</span>`;
        logContainer.appendChild(errorEl);
        logContainer.scrollTop = logContainer.scrollHeight;
    },

    updateState(stateObject) {
        if (!this.isActive) return;
        const replacer = (key, value) => {
            if (key === "notes" && Array.isArray(value)) {
                return `[...Array(${value.length})]`;
            }
            return value;
        };
        const sanitizedState = JSON.stringify(stateObject, replacer, 2);
        DOM.debugStateContainer.querySelector('pre').textContent = sanitizedState;
    },

    profileStart(name) {
        if (!this.isActive) return;
        this.perf.timings.set(name, { start: performance.now() });
    },

    profileEnd(name) {
        if (!this.isActive || !this.perf.timings.has(name)) return;
        const timing = this.perf.timings.get(name);
        timing.duration = performance.now() - timing.start;
    },

    updatePerf(timestamp) {
        if (!this.isActive) return;
        this.perf.frames++;
        if (timestamp > this.perf.lastPerfUpdate + 1000) {
            this.perf.fps = Math.round((this.perf.frames * 1000) / (timestamp - this.perf.lastPerfUpdate));
            this.perf.lastPerfUpdate = timestamp;
            this.perf.frames = 0;
        }
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
            } else if (Game.state.gameState === 'editor') {
                Editor.handleEditorKeyPress(e);
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
            if (Editor._confirmDiscardChanges()) {
                Game.state.gameState = 'menu';
                UI.showScreen('menu');
            }
        });

        document.getElementById('mode-selector').addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') return;
            Game.state.settings.mode = e.target.dataset.mode;
            document.querySelectorAll('#mode-selector button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const isMusicMode = Game.state.settings.mode === 'music';
            DOM.musicModeControls.classList.toggle('hidden', !isMusicMode);
            DOM.noteCountContainer.classList.toggle('hidden', isMusicMode);
            DOM.difficultyControls.classList.toggle('hidden', isMusicMode);
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
            DOM.difficulty.dongValue.textContent = `${e.target.value}%`;
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
                const probValue = parseInt(DOM.difficulty.falseNoteProbSlider.value);
                Game.state.settings.falseNoteProbability = probValue / 1000;
            } else {
                Game.state.settings.falseNoteProbability = 0;
            }
            setCustomDifficulty();
        });

        DOM.difficulty.falseNoteProbSlider.addEventListener('input', (e) => {
            const probValue = parseInt(e.target.value);
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
                            DOM.requiredMusicFileNameEl.textContent = '';
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
                Game.state.settings.musicFileObject = file;
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
                if (isListeningForKey) cancelKeyBinding();
                startKeyBinding(box);
            });
        });

        DOM.settings.controls.saveBtn.addEventListener('click', () => saveKeyBindings());

        window.addEventListener('resize', () => {
            if (Game.state.gameState === 'editor') {
                Editor.drawTimeline();
                Editor.renderNotes();
            }
        });

        DOM.editor.audioFileInput.addEventListener('change', (e) => Editor.handleAudioLoad(e));
        DOM.editor.startTimeInput.addEventListener('input', (e) => {
            Editor.state.startTimeOffset = parseFloat(e.target.value) || 0;
            Editor.setDirty(true);
        });
        DOM.editor.bpmInput.addEventListener('input', (e) => {
            Editor.state.bpm = parseInt(e.target.value) || 120;
            Editor.setDirty(true);
            Editor.drawTimeline();
            Editor.renderNotes();
        });
        DOM.editor.snapSelector.addEventListener('change', (e) => Editor.handleSnapChange(e));
        DOM.editor.noteTypeSelector.addEventListener('click', (e) => Editor.handleNoteTypeSelect(e));
        DOM.editor.addMeasureBtn.addEventListener('click', () => Editor.addMeasure());
        DOM.editor.removeMeasureBtn.addEventListener('click', () => Editor.removeMeasure());
        DOM.editor.playBtn.addEventListener('click', () => Editor.handlePlayPause());
        DOM.editor.stopBtn.addEventListener('click', () => Editor.stopPlayback());
        DOM.editor.saveBtn.addEventListener('click', () => Editor.saveChart());
        DOM.editor.loadBtn.addEventListener('click', () => DOM.editor.loadInput.click());
        DOM.editor.loadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                if (Editor._confirmDiscardChanges('저장하지 않은 변경사항이 있습니다. 새 차트를 불러오시겠습니까?')) {
                    try {
                        const chartData = JSON.parse(event.target.result);
                        Editor.loadChart(chartData, file.name);
                    } catch (err) {
                        Debugger.logError(err, 'Editor.handleChartLoad');
                        UI.showMessage('editor', `잘못된 차트 파일 형식입니다: ${err.message}`);
                    }
                }
            };
            reader.readAsText(file);
            e.target.value = null;
        });
        DOM.editor.resetBtn.addEventListener('click', () => Editor.handleReset());
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
