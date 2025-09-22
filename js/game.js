const Game = {
    state: {
        gameState: 'menu',
        settings: {
            mode: 'random',
            difficulty: 'normal',
            noteSpeed: CONFIG.DIFFICULTY_SPEED.normal,
            dongtaProbability: CONFIG.SIMULTANEOUS_NOTE_PROBABILITY.normal,
            longNoteProbability: CONFIG.LONG_NOTE_PROBABILITY.normal,
            lanes: 4,
            musicSrc: null,
            musicVolume: 100,
            sfxVolume: 100,
            userKeyMappings: null, 
            isFalseNoteEnabled: false,
            falseNoteProbability: 0,
        },
        keyMapping: [],
        activeLanes: [],
        notes: [],
        score: 0,
        combo: 0,
        judgements: { perfect: 0, good: 0, bad: 0, miss: 0 },
        gameStartTime: 0,
        animationFrameId: null,
        totalNotes: 0,
        processedNotes: 0,
        isPaused: false,
        pauseStartTime: 0,
        totalPausedTime: 0,
        previousScreen: 'menu',
        countdownIntervalId: null,
        unprocessedNoteIndex: 0,
    },
    
    resetState() {
        this.state.score = 0;
        this.state.combo = 0;
        this.state.judgements = { perfect: 0, good: 0, bad: 0, miss: 0 };
        this.state.processedNotes = 0;
        this.state.isPaused = false;
        this.state.totalPausedTime = 0;
        this.state.unprocessedNoteIndex = 0; 
    },

    runCountdown(onComplete) {
        this.cancelCountdown();
        let count = 3;
        const countdownEl = DOM.countdownTextEl;
        const tick = () => {
            countdownEl.classList.remove('show');
            void countdownEl.offsetWidth;
            if (count >= 0) {
                if (count > 0) {
                    countdownEl.textContent = count;
                    Audio.playCountdownTick();
                } else {
                    countdownEl.textContent = 'START!';
                    Audio.playCountdownStart();
                }
                countdownEl.classList.add('show');
                count--;
            } else {
                this.cancelCountdown();
                onComplete();
            }
        };
        tick();
        this.state.countdownIntervalId = setInterval(tick, 1000);
    },

    cancelCountdown() {
        if (this.state.countdownIntervalId) {
            clearInterval(this.state.countdownIntervalId);
            this.state.countdownIntervalId = null;
        }
        DOM.countdownTextEl.classList.remove('show');
    },

    async start() {
        await Audio.start();
        this.resetState();
        resetPlayingScreenUI();
        if (this.state.settings.mode === 'random') {
            this.generateRandomNotes();
        } else {
            if (!this.state.notes || this.state.notes.length === 0) {
                UI.showMessage('menu', '뮤직 모드를 시작하려면 차트 파일을 먼저 불러와주세요.');
                return;
            }
            if (!this.state.settings.musicSrc) {
                UI.showMessage('menu', '뮤직 모드를 시작하려면 음악 파일을 먼저 불러와주세요.');
                return;
            }
        }
        this.setupLanes();
        UI.showScreen('playing');
        UI.updateScoreboard();
        this.state.gameState = 'countdown';
        this.runCountdown(() => {
            this.state.gameState = 'playing';
            if (this.state.settings.mode === 'music') {
                DOM.musicPlayer.currentTime = 0;
                DOM.musicPlayer.play();
            }
            this.state.gameStartTime = performance.now();
            this.loop(performance.now());
        });
    },

    end() {
        const activeStates = ['playing', 'countdown'];
        if (!activeStates.includes(this.state.gameState) && !this.state.isPaused) return;
        this.cancelCountdown();
        cancelAnimationFrame(this.state.animationFrameId);
        if (this.state.settings.mode === 'music') DOM.musicPlayer.pause();
        this.state.gameState = 'result';
        resetPlayingScreenUI();
        UI.updateResultScreen();
        UI.showScreen('result');
    },

    loop(timestamp) {
        if (Game.state.isPaused) return; // 일시정지 상태에서는 루프를 돌지 않음
        const self = Game;
        const elapsedTime = self.state.settings.mode === 'music' ?
            DOM.musicPlayer.currentTime * 1000 :
            timestamp - self.state.gameStartTime - self.state.totalPausedTime;
        self.updateNotes(elapsedTime);
        if (self.state.processedNotes >= self.state.totalNotes && self.state.notes.length > 0) {
            setTimeout(() => self.end(), 500);
            return;
        }
        self.state.animationFrameId = requestAnimationFrame(self.loop);
    },

    updateNotes(elapsedTime) {
        const gameHeight = DOM.lanesContainer.clientHeight;
        if (gameHeight === 0) return;
        for (const note of this.state.notes) {
            if (note.processed && !note.element) {
                continue;
            }
            if (note.type === 'long_head' && note.processed) {
                const tailNote = this.state.notes.find(n => n.noteId === note.noteId && n.type === 'long_tail');
                if (tailNote && !tailNote.processed && !this.state.activeLanes[note.lane]) {
                    this.handleJudgement('miss', tailNote);
                }
            }
            const timeToHit = note.time - elapsedTime;
            const noteBottomPosition = gameHeight - 100 - (timeToHit * this.state.settings.noteSpeed / 10);
            const isLongNote = note.type === 'long_head';
            const noteHeight = isLongNote ? (note.duration / 10) * this.state.settings.noteSpeed : 25;
            const noteTopPosition = noteBottomPosition - noteHeight;
            if (!note.element && !note.processed && (note.type === 'tap' || isLongNote)) {
                if (noteTopPosition < gameHeight && noteBottomPosition > -50) {
                    const laneEl = DOM.lanesContainer.children[note.lane];
                    if (laneEl) {
                        note.element = document.createElement('div');
                        note.element.className = 'note';
                        if (isLongNote) {
                            note.element.classList.add('long');
                            note.element.style.height = `${noteHeight}px`;
                        }
                        laneEl.appendChild(note.element);
                    }
                }
            }
            if (note.element && note.element.isConnected) {
                note.element.style.transform = `translateY(${noteTopPosition}px)`;
            }
            if (!note.processed && timeToHit < -CONFIG.JUDGEMENT_WINDOWS_MS.miss) {
                if (note.type === 'false') {
                    this.handleJudgement('perfect', note); // 가짜 노트는 누르지 않으면 PERFECT
                } else {
                    this.handleJudgement('miss', note); // 다른 노트는 MISS
                }
            }
        }
    },

    _processSingleJudgement(judgement, note) {
        note.processed = true;
    
        // 1. 노트 요소 제거
        if (note.type === 'long_tail') {
            const headNote = this.state.notes.find(n => n.noteId === note.noteId && n.type === 'long_head');
            if (headNote && headNote.element) {
                headNote.element.remove();
                headNote.element = null;
            }
        } else if (note.element) {
            note.element.remove();
            note.element = null;
        }
    
        // 2. 점수 및 콤보 계산
        this.state.judgements[judgement]++;
        if (note.type !== 'long_head') {
            this.state.processedNotes++;
        }
        this.state.score += CONFIG.POINTS[judgement];
    
        if (judgement === 'miss' || judgement === 'bad') {
            this.state.combo = 0;
        } else {
            this.state.combo++;
            if (note.type === 'long_head') {
                const tailNote = this.state.notes.find(n => n.noteId === note.noteId && n.type === 'long_tail');
                if (tailNote) tailNote.headProcessed = true;
            }
        }
    },
    
    handleJudgement(judgement, note) {
        if (note.processed) return;
    
        // [핵심 수정] 시간 기반 MISS의 경우, 동일 시간의 모든 노트를 그룹으로 처리
        if (judgement === 'miss' && note.time > 0) {
            const notesAtSameTime = this.state.notes.filter(n =>
                !n.processed && n.time === note.time
            );
    
            notesAtSameTime.forEach(n => this._processSingleJudgement('miss', n));
    
            // 사운드와 UI 피드백은 그룹 전체에 대해 한 번만 실행
            Audio.playMissSound();
            UI.showJudgementFeedback('MISS', this.state.combo);
            UI.updateScoreboard();
    
        } else { // 키 입력으로 인한 판정 (Perfect, Good, Bad)은 개별 처리
            this._processSingleJudgement(judgement, note);
    
            if (judgement === 'perfect' || judgement === 'good') {
                Audio.playHitSound();
            } else { // 'bad' 판정
                Audio.playMissSound();
            }
            
            UI.showJudgementFeedback(judgement.toUpperCase(), this.state.combo);
            UI.updateScoreboard();
        }
    },

    handleKeyDown(e) {
        if (e.keyCode === 27) { // ESC 키
            this.togglePause();
            return;
        }
        if (this.state.gameState !== 'playing' || this.state.isPaused) return;
        const laneIndex = this.state.keyMapping.indexOf(e.keyCode);
        if (laneIndex === -1 || this.state.activeLanes[laneIndex]) return;
        this.handleInputDown(laneIndex);
    },

    handleKeyUp(e) {
        if (this.state.gameState !== 'playing' || this.state.isPaused) return;
        const laneIndex = this.state.keyMapping.indexOf(e.keyCode);
        if (laneIndex === -1) return;
        this.handleInputUp(laneIndex);
    },

    handleInputDown(laneIndex) {
        this.state.activeLanes[laneIndex] = true;
        const laneEl = DOM.lanesContainer.children[laneIndex];
        if (laneEl) laneEl.classList.add('active-feedback');
    
        const elapsedTime = this.state.settings.mode === 'music' ?
            DOM.musicPlayer.currentTime * 1000 :
            performance.now() - this.state.gameStartTime - this.state.totalPausedTime;
    
        let bestMatch = null;
        let smallestDiff = Infinity;
    
        for (let i = this.state.unprocessedNoteIndex; i < this.state.notes.length; i++) {
            const note = this.state.notes[i];
            if (note.time - elapsedTime > CONFIG.JUDGEMENT_WINDOWS_MS.miss) break;
    
            if (!note.processed && note.lane === laneIndex) {
                const timeDiff = Math.abs(note.time - elapsedTime);
                if (timeDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.miss && timeDiff < smallestDiff) {
                    smallestDiff = timeDiff;
                    bestMatch = note;
                }
            }
        }
    
        if (bestMatch) {
            // [수정] 가짜 노트를 눌렀는지 먼저 확인
            if (bestMatch.type === 'false') {
                this.handleJudgement('miss', bestMatch); // 가짜 노트는 누르면 MISS
            } else if (bestMatch.type === 'tap' || bestMatch.type === 'long_head') {
                if (smallestDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.perfect) this.handleJudgement('perfect', bestMatch);
                else if (smallestDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.good) this.handleJudgement('good', bestMatch);
                else if (smallestDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.bad) this.handleJudgement('bad', bestMatch);
            }
        }
    },
    
    handleInputUp(laneIndex) {
        this.state.activeLanes[laneIndex] = false;
        const laneEl = DOM.lanesContainer.children[laneIndex];
        if (laneEl) laneEl.classList.remove('active-feedback');
    
        const elapsedTime = this.state.settings.mode === 'music' ?
            DOM.musicPlayer.currentTime * 1000 :
            performance.now() - this.state.gameStartTime - this.state.totalPausedTime;
    
        let bestMatch = null;
        let smallestDiff = Infinity;
    
        // [수정된 핵심 로직] 롱노트의 꼬리 부분도 효율적으로 탐색합니다.
        for (let i = this.state.unprocessedNoteIndex; i < this.state.notes.length; i++) {
            const note = this.state.notes[i];
            
            // 최적화: 노트가 너무 미래에 있으면 탐색 중단
            if (note.time - elapsedTime > CONFIG.JUDGEMENT_WINDOWS_MS.miss) {
                break;
            }
    
            if (!note.processed && note.lane === laneIndex && note.type === 'long_tail' && note.headProcessed) {
                 const timeDiff = Math.abs(note.time - elapsedTime);
                 if (timeDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.miss && timeDiff < smallestDiff) {
                    smallestDiff = timeDiff;
                    bestMatch = note;
                }
            }
        }
        
        if (bestMatch) {
            if (smallestDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.perfect) this.handleJudgement('perfect', bestMatch);
            else if (smallestDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.good) this.handleJudgement('good', bestMatch);
            else if (smallestDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.bad) this.handleJudgement('bad', bestMatch);
        }
    },

    togglePause() {
        if (this.state.gameState !== 'playing' && this.state.gameState !== 'countdown') return;
        this.state.isPaused = !this.state.isPaused;
        if (this.state.isPaused) {
            this.cancelCountdown();
            this.state.pauseStartTime = performance.now();
            cancelAnimationFrame(this.state.animationFrameId);
            if (this.state.settings.mode === 'music') DOM.musicPlayer.pause();
            DOM.pauseGameBtn.classList.add('hidden');
            DOM.resumeGameBtn.classList.remove('hidden');
            DOM.playingStatusLabel.textContent = '일시 정지 중';
            DOM.settings.iconPlaying.classList.remove('hidden');
        } else {
            DOM.pauseGameBtn.classList.remove('hidden');
            DOM.resumeGameBtn.classList.add('hidden');
            DOM.playingStatusLabel.textContent = '플레이 중';
            DOM.settings.iconPlaying.classList.add('hidden');
            this.runCountdown(() => {
                this.state.totalPausedTime += performance.now() - this.state.pauseStartTime;
                if (this.state.settings.mode === 'music') DOM.musicPlayer.play();
                this.state.gameState = 'playing';
                this.loop(performance.now());
            });
        }
    },
    
    setupLanes() {
        DOM.lanesContainer.innerHTML = '';
        DOM.lanesContainer.style.width = `${this.state.settings.lanes * 100}px`;
        this.state.activeLanes = Array(this.state.settings.lanes).fill(false);
        const laneCount = this.state.settings.lanes;
        const keyOrder = CONFIG.LANE_KEY_MAPPING_ORDER[laneCount];
        const activeKeyMap = this.state.settings.userKeyMappings || CONFIG.DEFAULT_KEYS;
        if (!keyOrder) {
            console.error(`Invalid number of lanes: ${laneCount}.`);
            UI.showScreen('menu');
            return;
        }
        const keysForCurrentLanes = keyOrder.map(keyId => activeKeyMap[keyId]);
        this.state.keyMapping = keysForCurrentLanes.map(keyName => {
            const upperKeyName = keyName.charAt(0).toUpperCase() + keyName.slice(1);
            return CONFIG.KEY_CODES[upperKeyName] || keyName.toUpperCase().charCodeAt(0);
        });
        const keyHintMap = { 'Space': '⎵', 'Semicolon': ';' };
        for (let i = 0; i < laneCount; i++) {
            const lane = document.createElement('div');
            lane.className = 'lane';
            lane.style.width = '100px';
            lane.dataset.laneIndex = i;
            const keyHint = document.createElement('div');
            keyHint.className = 'key-hint';
            const keyName = keysForCurrentLanes[i];
            keyHint.textContent = keyHintMap[keyName] || keyName.toUpperCase();
            lane.appendChild(new DOMParser().parseFromString('<div class="judgement-line"></div>', "text/html").body.firstChild);
            lane.appendChild(keyHint);
            lane.addEventListener('mousedown', (e) => { e.preventDefault(); this.handleInputDown(i); });
            lane.addEventListener('mouseup', (e) => { e.preventDefault(); this.handleInputUp(i); });
            lane.addEventListener('mouseleave', (e) => { if (this.state.activeLanes[i]) this.handleInputUp(i); });
            lane.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleInputDown(i); });
            lane.addEventListener('touchend', (e) => { e.preventDefault(); this.handleInputUp(i); });
            DOM.lanesContainer.appendChild(lane);
        }
    },
    
    generateRandomNotes() {
        this.state.notes = [];
        let totalNotesToGenerate = parseInt(DOM.noteCountInput.value) || CONFIG.DEFAULT_NOTE_COUNT;
        // ... (min/max 검사) ...
        const { isFalseNoteEnabled, falseNoteProbability, dongtaProbability, longNoteProbability, lanes } = this.state.settings;
        
        let generatedNotesCount = 0;
        let currentTime = 1000;
        let noteIdCounter = 0;
    
        // 가짜 노트를 생성할지 결정하는 헬퍼 함수
        const shouldBeFalseNote = () => isFalseNoteEnabled && Math.random() < falseNoteProbability;
    
        while (generatedNotesCount < totalNotesToGenerate) {
            // FIX 1: GitHub 로직을 적용하여 서로 다른 2개의 레인을 안전하게 선택합니다.
            if (Math.random() < dongtaProbability && lanes >= 2) {
                // 전체 레인 목록을 복사해서 사용
                let availableLanes = Array.from(Array(lanes).keys());
                // 첫 번째 레인을 무작위로 뽑아내고 목록에서 제거
                let lane1 = availableLanes.splice(Math.floor(Math.random() * availableLanes.length), 1)[0];
                // 남은 레인 중에서 두 번째 레인을 무작위로 뽑아냄
                let lane2 = availableLanes.splice(Math.floor(Math.random() * availableLanes.length), 1)[0];

                this.state.notes.push({ lane: lane1, time: currentTime, type: shouldBeFalseNote() ? 'false' : 'tap' });
                this.state.notes.push({ lane: lane2, time: currentTime, type: shouldBeFalseNote() ? 'false' : 'tap' });
                generatedNotesCount += 2;

            // FIX 2: GitHub 로직을 적용하여 비어있던 롱노트 생성 기능을 구현합니다.
            } else if (Math.random() < longNoteProbability) {
                const lane = Math.floor(Math.random() * lanes);
                // 0.5초, 0.75초, 1초 길이의 롱노트를 무작위로 생성
                const duration = (Math.floor(Math.random() * 3) + 2) * 250;
                const noteId = noteIdCounter++;
                
                // 롱노트의 시작(head)과 끝(tail)을 한 쌍으로 추가
                this.state.notes.push({ time: currentTime, lane: lane, duration: duration, type: 'long_head', noteId: noteId });
                this.state.notes.push({ time: currentTime + duration, lane: lane, type: 'long_tail', noteId: noteId });
                generatedNotesCount++; // 롱노트는 1개로 카운트

            } else {
                this.state.notes.push({ lane: Math.floor(Math.random() * lanes), time: currentTime, type: shouldBeFalseNote() ? 'false' : 'tap' });
                generatedNotesCount++;
            }
            currentTime += 500 - lanes * CONFIG.NOTE_SPACING_FACTOR;
        }
            currentTime += 500 - lanes * CONFIG.NOTE_SPACING_FACTOR;
        }
        this.state.totalNotes = generatedNotesCount;
    },
    
    loadChartNotes(chartData) {
        if (!chartData.lanes || !CONFIG.VALID_LANES.includes(chartData.lanes)) {
            UI.showMessage('menu', `오류: 차트의 레인 수(${chartData.lanes || '없음'})가 잘못되었습니다.`);
            return false;
        }
        this.state.notes = [];
        this.state.settings.lanes = chartData.lanes;
        document.getElementById('lanes-selector').value = chartData.lanes;
        
        let noteIdCounter = 0;
        const processedNotes = [];
        chartData.notes.forEach(note => {
            if (note.duration) { // 롱노트인 경우
                const noteId = noteIdCounter++;
                processedNotes.push({ ...note, type: 'long_head', noteId, processed: false, element: null });
                processedNotes.push({ time: note.time + note.duration, lane: note.lane, type: 'long_tail', noteId, processed: false, element: null });
            } else { // 일반노트인 경우
                processedNotes.push({ ...note, type: 'tap', processed: false, element: null });
            }
        });
        
        this.state.notes = processedNotes;
        this.state.totalNotes = chartData.notes.length;
        return true;
    }
};
