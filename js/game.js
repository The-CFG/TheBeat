const Game = {
    state: {
        gameState: 'menu',
        settings: {
            mode: 'random',
            difficulty: 'normal',
            noteSpeed: CONFIG.DIFFICULTY_SPEED.normal, // 노트 하강 속도
            noteSpawnSpeed: CONFIG.NOTE_SPAWN_SPEED.normal, // 노트 생성 속도
            dongtaProbability: CONFIG.SIMULTANEOUS_NOTE_PROBABILITY.normal,
            maxSimultaneousNotes: CONFIG.MAX_SIMULTANEOUS_NOTES.normal,
            dongtaNoteTypeProbabilities: CONFIG.SIMULTANEOUS_NOTE_TYPE_PROBABILITY.normal,
            longNoteProbability: CONFIG.LONG_NOTE_PROBABILITY.normal,
            falseNoteProbability: 0,
            lanes: 4,
            musicSrc: null,
            musicFileObject: null,
            musicVolume: 100,
            sfxVolume: 100,
            bpm: 120,
            startTimeOffset: 0,
            userKeyMappings: null,
            requiredSongName: null,
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
        chartData: null,
    },

    resetState() {
        this.state.score = 0;
        this.state.combo = 0;
        this.state.judgements = { perfect: 0, good: 0, bad: 0, miss: 0 };
        this.state.processedNotes = 0;
        this.state.isPaused = false;
        this.state.totalPausedTime = 0;
        this.state.unprocessedNoteIndex = 0;
        this.state.settings.requiredSongName = null;
        this.state.settings.startTimeOffset = 0;
        this.state.settings.bpm = 120;
        this.state.animationFrameId = null;
        this.state.countdownIntervalId = null;
        // Bug #2: notes 배열 초기화 (이전 게임 데이터 잔존 방지)
        // Bug #4: notes를 새 배열로 교체하면 모든 headProcessed 플래그도 함께 초기화됨
        this.state.notes = [];
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
        } else { // Music Mode
            if (!this.state.chartData) {
                UI.showMessage('menu', '뮤직 모드를 시작하려면 차트 파일을 먼저 불러와주세요.');
                return;
            }
            if (!this.state.settings.musicFileObject) {
                UI.showMessage('menu', '뮤직 모드를 시작하려면 음악 파일을 먼저 불러와주세요.');
                return;
            }
            this.prepareNotesFromChartData();
        }

        this.setupLanes();
        UI.showScreen('playing');
        UI.updateScoreboard();
        this.state.gameState = 'countdown';
        if (this.state.settings.mode === 'music' && this.state.settings.musicFileObject) {
            const musicUrl = URL.createObjectURL(this.state.settings.musicFileObject);
            DOM.musicPlayer.src = musicUrl;
        }
        this.runCountdown(() => {
            this.state.gameState = 'playing';
            if (this.state.settings.mode === 'music' && DOM.musicPlayer.src) {
                DOM.musicPlayer.currentTime = this.state.settings.startTimeOffset;
                DOM.musicPlayer.play();
            }
            this.state.gameStartTime = performance.now();
            this.loop(performance.now());
        });
    },

    end() {
        try {
            const activeStates = ['playing', 'countdown'];
            if (!activeStates.includes(this.state.gameState) && !this.state.isPaused) return;

            this.cancelCountdown();

            // Bug #22: animationFrameId가 있으면 반드시 취소
            if (this.state.animationFrameId) {
                cancelAnimationFrame(this.state.animationFrameId);
                this.state.animationFrameId = null;
            }

            if (this.state.settings.mode === 'music' && DOM.musicPlayer.src) {
                DOM.musicPlayer.pause();
                // [핵심 수정] 오디오 플레이어의 내부 상태를 완전히 리셋하여
                // 다음 플레이를 위해 깨끗한 상태로 만듭니다.
                DOM.musicPlayer.load();

                // Bug #23: blob URL revoke 처리
                if (DOM.musicPlayer.src && DOM.musicPlayer.src.startsWith('blob:')) {
                    URL.revokeObjectURL(DOM.musicPlayer.src);
                }
            }

            this.state.gameState = 'result';
            resetPlayingScreenUI();
            UI.updateResultScreen();
            UI.showScreen('result');
        } catch (err) {
            Debugger.logError(err, 'Game.end');
        }
    },

    prepareNotesFromChartData() {
        // [핵심 수정] JSON.parse(JSON.stringify(...))를 사용하여
        // 원본 chartData와 완전히 분리된 '깊은 복사본'을 만듭니다.
        const chartData = JSON.parse(JSON.stringify(this.state.chartData));

        const playerLaneCount = this.state.settings.lanes;
        const requiredLaneIds = CONFIG.LANE_KEY_MAPPING_ORDER[playerLaneCount];

        const processedNotes = [];
        let noteIdCounter = 0;

        // 이제부터 사용하는 'note' 객체는 원본과 완전히 분리된 안전한 복사본입니다.
        chartData.notes.forEach(note => {
            const laneId = note.lane;
            const gameLaneIndex = requiredLaneIds.indexOf(laneId);
            if (gameLaneIndex !== -1) {
                const newNoteBase = { time: note.time, lane: gameLaneIndex, processed: false, element: null };
                const type = note.type || 'tap';
                if (note.duration) {
                    const noteId = noteIdCounter++;
                    processedNotes.push({ ...newNoteBase, type: 'long_head', duration: note.duration, noteId, headProcessed: false });
                    processedNotes.push({ ...newNoteBase, time: note.time + note.duration, type: 'long_tail', noteId });
                } else {
                    processedNotes.push({ ...newNoteBase, type: type });
                }
            }
        });

        this.state.notes = processedNotes.sort((a, b) => a.time - b.time);
        this.state.totalNotes = this.state.notes.filter(n => n.type !== 'long_tail').length;
    },

    loop(timestamp) {
        try {
            Debugger.profileStart('Game.loop');
            if (this.state.isPaused) return;

            const self = this;
            let elapsedTime;

            if (self.state.settings.mode === 'music') {
                elapsedTime = Math.max(0, (DOM.musicPlayer.currentTime - self.state.settings.startTimeOffset) * 1000);
            } else { // 'random'
                elapsedTime = timestamp - self.state.gameStartTime - self.state.totalPausedTime;
            }

            self.updateNotes(elapsedTime);

            if (self.state.processedNotes >= self.state.totalNotes && self.state.totalNotes > 0) {
                setTimeout(() => self.end(), 500);
                return;
            }
            self.state.animationFrameId = requestAnimationFrame(self.loop.bind(self));
        } catch (err) {
            Debugger.logError(err, 'Game.loop');
        } finally {
            Debugger.profileEnd('Game.loop');
            if (this.state.gameState === 'playing' || this.state.gameState === 'countdown') {
                Debugger.updatePerf(timestamp);
                Debugger.updateState(this.state);
            }
        }
    },

    updateNotes(elapsedTime) {
        try {
            Debugger.profileStart('Game.updateNotes');
            const gameHeight = DOM.lanesContainer.clientHeight;
            if (gameHeight === 0) return;
            for (let i = this.state.unprocessedNoteIndex; i < this.state.notes.length; i++) {
                const note = this.state.notes[i];
                if (note.processed && !note.element) {
                    if (i === this.state.unprocessedNoteIndex) {
                        this.state.unprocessedNoteIndex++;
                    }
                    continue;
                }
                if (note.type === 'long_head' && note.processed) {
                    const tailNote = this.state.notes.find(n => n.noteId === note.noteId && n.type === 'long_tail');
                    if (tailNote && !tailNote.processed && !this.state.activeLanes[note.lane]) {
                        this.handleJudgement('miss', tailNote);
                    }
                }
                const timeToHit = note.time - elapsedTime;
                // 노트의 중앙이 판정선에 닿도록 조정 (막대형 노트 높이 25px의 절반 = 12.5px)
                const noteCenterOffset = document.body.classList.contains('circle-notes') ? 45 : 12.5;
                const noteCenterPosition = gameHeight - 100 - (timeToHit * this.state.settings.noteSpeed / 10);
                const isLongNote = note.type === 'long_head';
                
                // 롱노트 높이 계산 시 최소 높이 적용
                let noteHeight;
                if (isLongNote) {
                    const minHeight = document.body.classList.contains('circle-notes') ? 90 : 25;
                    const calculatedHeight = (note.duration / 10) * this.state.settings.noteSpeed;
                    noteHeight = Math.max(calculatedHeight, minHeight);
                } else {
                    noteHeight = document.body.classList.contains('circle-notes') ? 90 : 25;
                }
                
                // 노트의 바닥 위치를 중앙 + 높이의 절반으로 계산
                const noteBottomPosition = noteCenterPosition + (noteHeight / 2);
                const noteTopPosition = noteBottomPosition - noteHeight;
                if (!note.element && !note.processed && (note.type === 'tap' || isLongNote || note.type === 'false')) {
                    if (noteTopPosition < gameHeight && noteBottomPosition > -50) {
                        const laneEl = DOM.lanesContainer.children[note.lane];
                        if (laneEl) {
                            note.element = document.createElement('div');
                            note.element.className = 'note';
                            
                            // 레인 ID 저장 (레인별 색상 적용용)
                            if (this.state.laneIdMapping && this.state.laneIdMapping[note.lane]) {
                                note.element.dataset.lane = this.state.laneIdMapping[note.lane];
                            }
                            
                            if (isLongNote) note.element.classList.add('long');
                            if (note.type === 'false') note.element.classList.add('false');
                            
                            // 레인별 색상 모드일 때 인라인 스타일 적용
                            if (typeof Appearance !== 'undefined' && Appearance.settings.colorMode === 'lane' && note.element.dataset.lane) {
                                const laneId = note.element.dataset.lane;
                                const color = Appearance.settings.laneColors[laneId];
                                if (color) {
                                    if (isLongNote) {
                                        const gradientStart = Appearance.adjustColor(color, -20);
                                        note.element.style.background = `linear-gradient(to top, ${gradientStart}, ${color})`;
                                    } else {
                                        note.element.style.backgroundColor = color;
                                        if (note.type === 'false') {
                                            note.element.style.boxShadow = `0 0 8px ${color}`;
                                        }
                                    }
                                }
                            }
                            
                            // 롱노트는 최소 높이 보장 (원형 노트 대응)
                            if (isLongNote) {
                                const minHeight = document.body.classList.contains('circle-notes') ? 90 : 25;
                                note.element.style.height = `${Math.max(noteHeight, minHeight)}px`;
                            }
                            laneEl.appendChild(note.element);
                        }
                    }
                }
                if (note.element && note.element.isConnected) {
                    // 롱노트가 판정되어 수축 중인 경우
                    if (isLongNote && note.shrinking && note.tailTime) {
                        const timeUntilTail = note.tailTime - elapsedTime;
                        const currentDuration = Math.max(0, timeUntilTail);
                        const calculatedHeight = (currentDuration / 10) * this.state.settings.noteSpeed;
                        
                        // 최소 높이 보장 (원형 노트 대응)
                        const minHeight = document.body.classList.contains('circle-notes') ? 90 : 25;
                        const newHeight = Math.max(calculatedHeight, minHeight);
                        
                        // 판정선 위치(gameHeight - 100)에 노트 하단을 고정
                        const fixedBottomPosition = gameHeight - 100;
                        const fixedTopPosition = fixedBottomPosition - newHeight;
                        
                        note.element.style.transform = `translateY(${fixedTopPosition}px)`;
                        note.element.style.height = `${newHeight}px`;
                        
                        // 꼬리에 도달하면 제거
                        if (timeUntilTail <= 0) {
                            note.element.remove();
                            note.element = null;
                        }
                    } else {
                        // 일반 노트 또는 수축 중이 아닌 롱노트
                        note.element.style.transform = `translateY(${noteTopPosition}px)`;
                        
                        // 롱노트는 매 프레임 최소 높이 적용
                        if (isLongNote && !note.shrinking) {
                            const minHeight = document.body.classList.contains('circle-notes') ? 90 : 25;
                            const currentHeight = Math.max(noteHeight, minHeight);
                            note.element.style.height = `${currentHeight}px`;
                        }
                    }
                }
                if (!note.processed && timeToHit < -CONFIG.JUDGEMENT_WINDOWS_MS.miss) {
                    // Bug #15: processed 체크는 handleJudgement 내부에서 이미 처리되나
                    // updateNotes의 auto-miss와 handleInputDown의 miss가 중복되지 않도록
                    // long_tail의 경우 headProcessed 상태 확인
                    if (note.type !== 'long_tail' || note.headProcessed) {
                        this.handleJudgement('miss', note);
                    } else if (note.type === 'long_tail' && !note.headProcessed) {
                        // head가 판정 안 된 tail은 그냥 processed 처리
                        note.processed = true;
                    }
                }
            }
        } catch (err) {
            Debugger.logError(err, 'Game.updateNotes');
        } finally {
            Debugger.profileEnd('Game.updateNotes');
        }
    },

    _processSingleJudgement(judgement, note) {
        note.processed = true;
        if (note.type === 'long_tail') {
            const headNote = this.state.notes.find(n => n.noteId === note.noteId && n.type === 'long_head');
            if (headNote && headNote.element) {
                headNote.element.remove();
                headNote.element = null; // Bug #3: 참조 제거로 메모리 누수 방지
            }
        } else if ((note.type === 'tap' || note.type === 'false') && note.element) {
            note.element.remove();
            note.element = null; // Bug #3: 참조 제거로 메모리 누수 방지
        }
        this.state.judgements[judgement]++;
        if (note.type !== 'long_head') {
            this.state.processedNotes++;
        }
        // Bug #21: NaN 방지 - 점수가 숫자인지 확인
        const points = CONFIG.POINTS[judgement] || 0;
        this.state.score = (isNaN(this.state.score) ? 0 : this.state.score) + points;
        if (judgement === 'miss' || judgement === 'bad') {
            this.state.combo = 0;
            if (note.type === 'long_head') {
                // 롱노트 head가 miss/bad 판정되면 tail도 즉시 processed 처리
                // (updateNotes의 activeLanes 체크로 인한 이중 miss 방지)
                const tailNote = this.state.notes.find(n => n.noteId === note.noteId && n.type === 'long_tail');
                if (tailNote && !tailNote.processed) {
                    tailNote.processed = true;
                    this.state.processedNotes++;
                    // element가 있으면 제거
                    if (note.element) {
                        note.element.remove();
                        note.element = null;
                    }
                }
            }
        } else {
            this.state.combo = (isNaN(this.state.combo) ? 0 : this.state.combo) + 1;
            if (note.type === 'long_head') {
                // 롱노트 헤드가 성공적으로 판정되면 수축 시작
                note.shrinking = true;
                note.shrinkStartTime = performance.now();
                const tailNote = this.state.notes.find(n => n.noteId === note.noteId && n.type === 'long_tail');
                if (tailNote) {
                    tailNote.headProcessed = true;
                    note.tailTime = tailNote.time;
                }
            }
        }
    },

    handleJudgement(judgement, note) {
        try {
            if (note.processed) return;
            if (note.type === 'false') {
                judgement = (judgement === 'miss') ? 'perfect' : 'miss';
            }
            if (judgement === 'miss' && note.time > 0) {
                const notesAtSameTime = this.state.notes.filter(n => !n.processed && n.time === note.time && n.type !== 'false');
                notesAtSameTime.forEach(n => this._processSingleJudgement('miss', n));
                Audio.playMissSound();
                UI.showJudgementFeedback('MISS', 0);
                UI.updateScoreboard();
            } else {
                this._processSingleJudgement(judgement, note);
                if (judgement === 'perfect' || judgement === 'good') Audio.playHitSound();
                else Audio.playMissSound();
                UI.showJudgementFeedback(judgement.toUpperCase(), this.state.combo);
                UI.updateScoreboard();
            }
        } catch (err) {
            Debugger.logError(err, 'Game.handleJudgement');
        }
    },

    handleKeyDown(e) {
        // [개선 #3] 키가 눌린 정확한 시점을 최상단에서 즉시 캡처 (DOM 연산 전)
        const hitTime = performance.now();
        if (e.key === 'Escape') {
            this.togglePause();
            return;
        }
        // Bug #6: 일시정지 중 키 입력 완전히 차단
        if (this.state.gameState !== 'playing' || this.state.isPaused) return;
        
        // 키보드 자동 반복(key repeat) 방지
        if (e.repeat) return;
        
        const laneIndex = this.state.keyMapping.findIndex(code => code === e.keyCode || code === e.key.toUpperCase().charCodeAt(0));
        if (laneIndex === -1) return;
        // 캡처한 hitTime을 파라미터로 전달
        this.handleInputDown(laneIndex, hitTime);
    },

    handleKeyUp(e) {
        // Bug #6: 일시정지 중 키 업 이벤트도 차단
        if (this.state.gameState !== 'playing' || this.state.isPaused) return;
        const laneIndex = this.state.keyMapping.findIndex(code => code === e.keyCode || code === e.key.toUpperCase().charCodeAt(0));
        if (laneIndex === -1) return;
        this.handleInputUp(laneIndex);
    },

    handleInputDown(laneIndex, hitTime) {
        try {
            // 카운트다운 중에는 입력 무시
            if (this.state.gameState !== 'playing') {
                return;
            }
            
            // Bug #5: 동시타 판정 충돌 방지 - isPaused 추가 체크
            if (this.state.isPaused) return;
            
            this.state.activeLanes[laneIndex] = true;
            const laneEl = DOM.lanesContainer.children[laneIndex];
            if (laneEl) laneEl.classList.add('active-feedback');

            // [개선 #3] 전달받은 hitTime 사용 (없으면 현재 시각으로 fallback - 터치 이벤트 등)
            const capturedTime = hitTime || performance.now();

            let elapsedTime;
            if (this.state.settings.mode === 'music') {
                elapsedTime = Math.max(0, (DOM.musicPlayer.currentTime - this.state.settings.startTimeOffset) * 1000);
            } else {
                // [개선 #3] DOM 연산 전에 캡처한 시간으로 elapsed 계산 → 타이밍 오차 최소화
                elapsedTime = capturedTime - this.state.gameStartTime - this.state.totalPausedTime;
            }

            // 원형 노트일 때 판정 윈도우 확장
            const isCircleMode = document.body.classList.contains('circle-notes');
            const noteSize = isCircleMode ? 90 : 25; // 노트 높이
            const extraWindow = isCircleMode ? (noteSize / 2) * (10 / this.state.settings.noteSpeed) : 0;
            
            // Late 판정 윈도우 (노트가 지나간 후)
            const lateWindow = {
                perfect: CONFIG.JUDGEMENT_WINDOWS_MS.perfect + extraWindow,
                good: CONFIG.JUDGEMENT_WINDOWS_MS.good + extraWindow,
                bad: CONFIG.JUDGEMENT_WINDOWS_MS.bad + extraWindow,
                miss: CONFIG.JUDGEMENT_WINDOWS_MS.miss + extraWindow
            };
            
            // Early 판정 윈도우 (노트가 도달하기 전) - 더 엄격함
            const earlyWindow = {
                perfect: CONFIG.EARLY_JUDGEMENT_WINDOWS_MS.perfect + extraWindow,
                good: CONFIG.EARLY_JUDGEMENT_WINDOWS_MS.good + extraWindow,
                bad: CONFIG.EARLY_JUDGEMENT_WINDOWS_MS.bad + extraWindow,
                miss: CONFIG.EARLY_JUDGEMENT_WINDOWS_MS.miss + extraWindow
            };

            let bestMatch = null;
            let smallestDiff = Infinity;
            let tooEarlyNote = null; // 너무 일찍 누른 노트
            
            // [개선 #1, #2] Ghost Tap 방지: 뻘타로 인정할 최대 한계선 설정
            // miss 윈도우보다 200ms 이전까지만 뻘타(tooEarlyNote)로 인정
            const TOO_EARLY_LIMIT = earlyWindow.miss + 200;
            
            for (let i = this.state.unprocessedNoteIndex; i < this.state.notes.length; i++) {
                const note = this.state.notes[i];
                
                if (!note.processed && note.lane === laneIndex && (note.type === 'tap' || note.type === 'long_head' || note.type === 'false')) {
                    const timeDiff = note.time - elapsedTime;
                    
                    // [개선 #1, #2] TOO_EARLY_LIMIT을 초과하면 더 먼 미래 노트이므로 루프 즉시 종료
                    // → 미래 노트 소멸(Ghost Tap Bug) 방지 & O(1) 수준으로 탐색 성능 향상
                    if (timeDiff > TOO_EARLY_LIMIT) {
                        break;
                    }
                    
                    // 노트가 화면에 그려지지 않았으면 판정 불가
                    if (!note.element) {
                        if (timeDiff > earlyWindow.miss) {
                            if (!tooEarlyNote || timeDiff < (tooEarlyNote.time - elapsedTime)) {
                                tooEarlyNote = note;
                            }
                        }
                        continue; // 화면에 없는 노트는 건너뜀
                    }
                    
                    // 너무 일찍 눌렀는지 확인 (early miss 윈도우 초과, TOO_EARLY_LIMIT 이하)
                    if (timeDiff > earlyWindow.miss) {
                        if (!tooEarlyNote || timeDiff < (tooEarlyNote.time - elapsedTime)) {
                            tooEarlyNote = note;
                        }
                        continue; // 아직 판정 불가능한 노트
                    }
                    
                    const isEarly = timeDiff > 0; // 노트가 아직 도달 안 함
                    const absTimeDiff = Math.abs(timeDiff);
                    
                    // Early vs Late 윈도우 선택
                    const currentWindow = isEarly ? earlyWindow : lateWindow;
                    
                    // 해당 윈도우 내에 있는지 확인
                    if (absTimeDiff <= currentWindow.miss && absTimeDiff < smallestDiff) {
                        smallestDiff = absTimeDiff;
                        bestMatch = note;
                    }
                }
            }
            
            if (bestMatch) {
                const timeDiff = bestMatch.time - elapsedTime;
                const isEarly = timeDiff > 0;
                const currentWindow = isEarly ? earlyWindow : lateWindow;
                
                if (smallestDiff <= currentWindow.perfect) this.handleJudgement('perfect', bestMatch);
                else if (smallestDiff <= currentWindow.good) this.handleJudgement('good', bestMatch);
                else if (smallestDiff <= currentWindow.bad) this.handleJudgement('bad', bestMatch);
                
                // 탭 노트나 가짜 노트는 처리 후 즉시 시각적 피드백 제거 (빠른 연타 가능)
                if (bestMatch.type === 'tap' || bestMatch.type === 'false') {
                    this.state.activeLanes[laneIndex] = false;
                    const laneEl = DOM.lanesContainer.children[laneIndex];
                    if (laneEl) laneEl.classList.remove('active-feedback');
                }
            } else if (tooEarlyNote) {
                // 판정 가능한 노트가 없지만 너무 일찍 누른 노트가 있으면 MISS 처리
                this.handleJudgement('miss', tooEarlyNote);
                
                // MISS 처리 후에도 시각적 피드백 제거
                this.state.activeLanes[laneIndex] = false;
                const laneEl = DOM.lanesContainer.children[laneIndex];
                if (laneEl) laneEl.classList.remove('active-feedback');
            } else {
                // [개선 #4] 완벽한 허공 탭: 판정 노트도 없고 tooEarlyNote도 없는 경우
                // 미래 노트를 소멸시키지 않고, 콤보만 초기화 (점수 패널티 없음)
                if (this.state.combo > 0) {
                    this.state.combo = 0;
                    UI.showJudgementFeedback('MISS', 0);
                    UI.updateScoreboard();
                }
                this.state.activeLanes[laneIndex] = false;
                const laneEl = DOM.lanesContainer.children[laneIndex];
                if (laneEl) laneEl.classList.remove('active-feedback');
            }
        } catch (err) {
            Debugger.logError(err, 'Game.handleInputDown');
        }
    },

    handleInputUp(laneIndex) {
        // 시각적 피드백은 항상 제거
        this.state.activeLanes[laneIndex] = false;
        const laneEl = DOM.lanesContainer.children[laneIndex];
        if (laneEl) laneEl.classList.remove('active-feedback');

        // 카운트다운 중에는 판정 무시
        if (this.state.gameState !== 'playing') {
            return;
        }

        let elapsedTime;
        if (this.state.settings.mode === 'music') {
            elapsedTime = Math.max(0, (DOM.musicPlayer.currentTime - this.state.settings.startTimeOffset) * 1000);
        } else {
            elapsedTime = performance.now() - this.state.gameStartTime - this.state.totalPausedTime;
        }

        // 원형 노트일 때 판정 윈도우 확장
        const isCircleMode = document.body.classList.contains('circle-notes');
        const noteSize = isCircleMode ? 90 : 25;
        const extraWindow = isCircleMode ? (noteSize / 2) * (10 / this.state.settings.noteSpeed) : 0;
        
        // Late 판정 윈도우 (노트가 지나간 후)
        const lateWindow = {
            perfect: CONFIG.JUDGEMENT_WINDOWS_MS.perfect + extraWindow,
            good: CONFIG.JUDGEMENT_WINDOWS_MS.good + extraWindow,
            bad: CONFIG.JUDGEMENT_WINDOWS_MS.bad + extraWindow,
            miss: CONFIG.JUDGEMENT_WINDOWS_MS.miss + extraWindow
        };
        
        // Early 판정 윈도우 (노트가 도달하기 전) - 더 엄격함
        const earlyWindow = {
            perfect: CONFIG.EARLY_JUDGEMENT_WINDOWS_MS.perfect + extraWindow,
            good: CONFIG.EARLY_JUDGEMENT_WINDOWS_MS.good + extraWindow,
            bad: CONFIG.EARLY_JUDGEMENT_WINDOWS_MS.bad + extraWindow,
            miss: CONFIG.EARLY_JUDGEMENT_WINDOWS_MS.miss + extraWindow
        };

        let bestMatch = null;
        let smallestDiff = Infinity;
        let tooEarlyNote = null; // 너무 일찍 떤 노트
        
        // [개선 #1, #2] 롱노트 Tail도 동일하게 Ghost Tap 방지 한계선 적용
        const TOO_EARLY_LIMIT = earlyWindow.miss + 200;
        
        for (let i = this.state.unprocessedNoteIndex; i < this.state.notes.length; i++) {
            const note = this.state.notes[i];
            
            // [개선 #1, #2] 모든 노트에 대해 timeDiff 먼저 계산 후 한계선 초과 시 루프 종료
            // (조건 필터 전에 체크해야 long_tail이 아닌 노트 사이에서도 올바르게 break됨)
            const timeDiff = note.time - elapsedTime;
            if (timeDiff > TOO_EARLY_LIMIT) {
                break;
            }

            if (!note.processed && note.lane === laneIndex && note.type === 'long_tail' && note.headProcessed) {
                // 롱노트 head의 element가 있는지 확인 (화면에 그려졌는지)
                const headNote = this.state.notes.find(n => n.noteId === note.noteId && n.type === 'long_head');
                if (headNote && !headNote.element) {
                    // head가 화면에 없으면 tail도 판정 불가
                    continue;
                }
                
                // 너무 일찍 뗐는지 확인 (early miss 윈도우 초과, TOO_EARLY_LIMIT 이하)
                if (timeDiff > earlyWindow.miss) {
                    if (!tooEarlyNote || timeDiff < (tooEarlyNote.time - elapsedTime)) {
                        tooEarlyNote = note;
                    }
                    continue; // 아직 판정 불가능한 노트
                }
                
                const isEarly = timeDiff > 0;
                const absTimeDiff = Math.abs(timeDiff);
                
                // Early vs Late 윈도우 선택
                const currentWindow = isEarly ? earlyWindow : lateWindow;
                
                // 해당 윈도우 내에 있는지 확인
                if (absTimeDiff <= currentWindow.miss && absTimeDiff < smallestDiff) {
                    smallestDiff = absTimeDiff;
                    bestMatch = note;
                }
            }
        }
        
        if (bestMatch) {
            const timeDiff = bestMatch.time - elapsedTime;
            const isEarly = timeDiff > 0;
            const currentWindow = isEarly ? earlyWindow : lateWindow;
            
            if (smallestDiff <= currentWindow.perfect) this.handleJudgement('perfect', bestMatch);
            else if (smallestDiff <= currentWindow.good) this.handleJudgement('good', bestMatch);
            else if (smallestDiff <= currentWindow.bad) this.handleJudgement('bad', bestMatch);
        } else if (tooEarlyNote) {
            // 판정 가능한 노트가 없지만 너무 일찍 뗀 노트가 있으면 MISS 처리
            this.handleJudgement('miss', tooEarlyNote);
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
        
        // 레인 인덱스 → 레인 ID 매핑 저장
        this.state.laneIdMapping = keyOrder;
        
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
            lane.dataset.laneId = keyOrder[i]; // 레인 ID도 저장
            const keyHint = document.createElement('div');
            keyHint.className = 'key-hint';
            const keyName = keysForCurrentLanes[i];
            keyHint.textContent = keyHintMap[keyName] || keyName.toUpperCase();
            lane.appendChild(new DOMParser().parseFromString('<div class="judgement-line"></div>', "text/html").body.firstChild);
            lane.appendChild(keyHint);
            lane.addEventListener('mousedown', (e) => { e.preventDefault(); this.handleInputDown(i); });
            lane.addEventListener('mouseup', (e) => { e.preventDefault(); this.handleInputUp(i); });
            lane.addEventListener('mouseleave', (e) => { if (this.state.activeLanes[i]) this.handleInputUp(i); });
            // Bug #18: touchstart/touchend 이벤트만 사용하고, touch 이벤트가 처리된 경우 mouse 이벤트가 중복 발생하지 않도록
            // preventDefault()는 이미 touch 핸들러에서 호출됨 (e.preventDefault()로 mouse 이벤트 억제)
            lane.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleInputDown(i); }, { passive: false });
            lane.addEventListener('touchend', (e) => { e.preventDefault(); this.handleInputUp(i); }, { passive: false });
            DOM.lanesContainer.appendChild(lane);
        }
    },

    generateRandomNotes() {
        this.state.notes = [];
        let totalNotesToGenerate = parseInt(DOM.noteCountInput.value) || CONFIG.DEFAULT_NOTE_COUNT;
        if (totalNotesToGenerate < CONFIG.NOTE_COUNT_MIN) totalNotesToGenerate = CONFIG.NOTE_COUNT_MIN;
        if (totalNotesToGenerate > CONFIG.NOTE_COUNT_MAX) totalNotesToGenerate = CONFIG.NOTE_COUNT_MAX;
        const simProbability = this.state.settings.dongtaProbability;
        const maxSimultaneous = this.state.settings.maxSimultaneousNotes;
        const dongtaTypeProbs = this.state.settings.dongtaNoteTypeProbabilities;
        const longNoteProbability = this.state.settings.longNoteProbability;
        const falseNoteProbability = this.state.settings.falseNoteProbability;
        let generatedNotesCount = 0;
        let currentTime = 1000;
        let noteIdCounter = 0;
        
        // 노트 타입 결정 함수 (동타용)
        const determineNoteType = () => {
            const rand = Math.random();
            const cumulative = {
                tap: dongtaTypeProbs.tap,
                long: dongtaTypeProbs.tap + dongtaTypeProbs.long,
                false: dongtaTypeProbs.tap + dongtaTypeProbs.long + dongtaTypeProbs.false
            };
            
            if (rand < cumulative.tap) return 'tap';
            if (rand < cumulative.long) return 'long';
            return 'false';
        };
        
        // 각 레인에서 롱노트가 활성화된 시간 추적
        const activeLongNotes = new Map(); // lane -> endTime
        
        while (generatedNotesCount < totalNotesToGenerate) {
            const remainingNotes = totalNotesToGenerate - generatedNotesCount;
            const canGenerateSimultaneous = this.state.settings.lanes > 1 && remainingNotes >= 2;
            const canGenerateLongNote = remainingNotes >= 1;
            
            // 현재 시간에 사용 가능한 레인 찾기 (롱노트가 진행 중이지 않은 레인)
            const getAvailableLanes = () => {
                const available = [];
                for (let i = 0; i < this.state.settings.lanes; i++) {
                    const longNoteEndTime = activeLongNotes.get(i);
                    if (!longNoteEndTime || currentTime >= longNoteEndTime) {
                        available.push(i);
                    }
                }
                return available;
            };
            
            if (canGenerateSimultaneous && Math.random() < simProbability) {
                // 동시타 생성
                const availableLanes = getAvailableLanes();
                if (availableLanes.length < 2) {
                    // 사용 가능한 레인이 부족하면 일반 노트 생성
                    const baseInterval = 500 - this.state.settings.lanes * CONFIG.NOTE_SPACING_FACTOR;
                    currentTime += baseInterval / this.state.settings.noteSpawnSpeed;
                    continue;
                }
                
                const numSimultaneous = Math.min(
                    maxSimultaneous,
                    availableLanes.length,
                    remainingNotes
                );
                const actualCount = Math.max(2, Math.floor(Math.random() * (numSimultaneous - 1)) + 2);
                
                // 사용 가능한 레인 섞기
                for (let i = availableLanes.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [availableLanes[i], availableLanes[j]] = [availableLanes[j], availableLanes[i]];
                }
                
                // 동시타 노트 생성
                for (let i = 0; i < actualCount && i < availableLanes.length; i++) {
                    const lane = availableLanes[i];
                    const noteType = determineNoteType();
                    
                    if (noteType === 'long') {
                        const duration = 500 + Math.random() * 1000;
                        const noteId = noteIdCounter++;
                        this.state.notes.push({ lane, time: currentTime, duration, type: 'long_head', noteId });
                        this.state.notes.push({ lane, time: currentTime + duration, type: 'long_tail', noteId });
                        activeLongNotes.set(lane, currentTime + duration);
                    } else {
                        this.state.notes.push({ lane, time: currentTime, type: noteType });
                    }
                }
                
                generatedNotesCount += actualCount;
            } else if (canGenerateLongNote && Math.random() < longNoteProbability) {
                // 일반 롱노트 (동타 아님)
                const availableLanes = getAvailableLanes();
                if (availableLanes.length === 0) {
                    // 사용 가능한 레인이 없으면 건너뛰기
                    const baseInterval = 500 - this.state.settings.lanes * CONFIG.NOTE_SPACING_FACTOR;
                    currentTime += baseInterval / this.state.settings.noteSpawnSpeed;
                    continue;
                }
                
                const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
                const duration = 500 + Math.random() * 1000;
                const noteId = noteIdCounter++;
                this.state.notes.push({ lane, time: currentTime, duration, type: 'long_head', noteId });
                this.state.notes.push({ lane, time: currentTime + duration, type: 'long_tail', noteId });
                activeLongNotes.set(lane, currentTime + duration);
                generatedNotesCount += 1;
            } else if (falseNoteProbability > 0 && Math.random() < falseNoteProbability) {
                // 일반 가짜 노트
                const availableLanes = getAvailableLanes();
                if (availableLanes.length === 0) {
                    const baseInterval = 500 - this.state.settings.lanes * CONFIG.NOTE_SPACING_FACTOR;
                    currentTime += baseInterval / this.state.settings.noteSpawnSpeed;
                    continue;
                }
                const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
                this.state.notes.push({ lane, time: currentTime, type: 'false' });
                generatedNotesCount++;
            } else {
                // 일반 탭 노트
                const availableLanes = getAvailableLanes();
                if (availableLanes.length === 0) {
                    const baseInterval = 500 - this.state.settings.lanes * CONFIG.NOTE_SPACING_FACTOR;
                    currentTime += baseInterval / this.state.settings.noteSpawnSpeed;
                    continue;
                }
                const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
                this.state.notes.push({ lane, time: currentTime, type: 'tap' });
                generatedNotesCount++;
            }
            // 노트 생성 속도를 적용하여 시간 증가 (속도가 높을수록 간격이 짧아짐)
            const baseInterval = 500 - this.state.settings.lanes * CONFIG.NOTE_SPACING_FACTOR;
            currentTime += baseInterval / this.state.settings.noteSpawnSpeed;
        }
        this.state.totalNotes = generatedNotesCount;
        this.state.notes.sort((a, b) => a.time - b.time);
    },

    loadChartNotes(chartData) {
        try {
            this.state.chartData = chartData;
            this.state.settings.requiredSongName = chartData.songName || null;
            this.state.settings.startTimeOffset = chartData.startTimeOffset || 0;
            const chartBPM = chartData.bpm || 120;
            this.state.settings.bpm = chartBPM;
            const calculatedSpeed = Math.round(chartBPM / 20);
            this.state.settings.noteSpeed = Math.max(1, Math.min(20, calculatedSpeed));
            const playerLaneCount = this.state.settings.lanes;
            const requiredLaneIds = CONFIG.LANE_KEY_MAPPING_ORDER[playerLaneCount];
            if (!requiredLaneIds) {
                throw new Error(`${playerLaneCount}레인에 대한 키 매핑 정보가 없습니다.`);
            }
            const processedNotes = [];
            let noteIdCounter = 0;
            chartData.notes.forEach(note => {
                const laneId = note.lane;
                const gameLaneIndex = requiredLaneIds.indexOf(laneId);
                if (gameLaneIndex !== -1) {
                    const newNoteBase = { time: note.time, lane: gameLaneIndex, processed: false, element: null };
                    const type = note.type || 'tap';
                    if (note.duration) {
                        const noteId = noteIdCounter++;
                        processedNotes.push({ ...newNoteBase, type: 'long_head', duration: note.duration, noteId });
                        processedNotes.push({ ...newNoteBase, time: note.time + note.duration, type: 'long_tail', noteId });
                    } else {
                        processedNotes.push({ ...newNoteBase, type: type });
                    }
                }
            });
            this.state.notes = processedNotes.sort((a, b) => a.time - b.time);
            this.state.totalNotes = this.state.notes.filter(n => n.type !== 'long_tail').length;
            return true;
        } catch (err) {
            Debugger.logError(err, 'Game.loadChartNotes');
            UI.showMessage('menu', `차트 로딩 오류: ${err.message}`);
            return false;
        }
    },
};
