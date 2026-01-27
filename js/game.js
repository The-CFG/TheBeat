const Game = {
    state: {
        gameState: 'menu',
        settings: {
            mode: 'random',
            difficulty: 'normal',
            noteSpeed: CONFIG.DIFFICULTY_SPEED.normal,
            dongtaProbability: CONFIG.SIMULTANEOUS_NOTE_PROBABILITY.normal,
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
        // 오디오 싱크 및 렌더링 관련 상태
        audioContextStartTime: 0, 
        lastFrameTime: 0,
        
        keyMapping: [],
        activeLanes: [],
        notes: [], // 대기 중인 미래의 노트 데이터
        renderingNotes: [], // 현재 화면에 그려지고 있는(활성화된) 노트 객체들
        
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
        
        // 화면 크기 계산용 캐시 (리사이징 대응)
        laneHeight: 0,
        hitPosition: 0,
    },

    // --- 1. 오브젝트 풀링 시스템 (메모리 최적화) ---
    pool: {
        elements: [] 
    },

    // 풀 초기화: 게임 로딩 시 미리 div를 생성해둠
    initPool(size = 100) {
        // 기존 풀 비우기
        this.pool.elements = [];
        
        for (let i = 0; i < size; i++) {
            const el = document.createElement('div');
            el.className = 'note'; 
            el.style.display = 'none';
            el.style.willChange = 'transform'; // 브라우저에게 변형이 일어날 것임을 힌트로 제공
            // 레인 컨테이너가 존재할 때만 추가
            if (DOM.lanesContainer) {
                DOM.lanesContainer.appendChild(el);
            }
            this.pool.elements.push(el);
        }
    },

    // 풀에서 노트 요소 가져오기
    getNoteElement(type, laneIndex, widthPercent, height = 25) {
        let el;
        // 비활성 상태인 요소 찾기 (display: none인 것)
        const inactiveIndex = this.pool.elements.findIndex(e => e.style.display === 'none');
        
        if (inactiveIndex !== -1) {
            el = this.pool.elements[inactiveIndex];
        } else {
            // 풀이 모자라면 새로 생성하여 추가
            el = document.createElement('div');
            el.style.willChange = 'transform';
            if (DOM.lanesContainer) DOM.lanesContainer.appendChild(el);
            this.pool.elements.push(el);
        }

        // 스타일 및 클래스 초기화
        el.style.display = 'block';
        el.className = 'note'; // 클래스 리셋
        
        if (type === 'false') el.classList.add('false');
        if (type === 'long_head' || type === 'long_body') el.classList.add('long');
        
        el.style.width = `${widthPercent}%`;
        el.style.left = `${laneIndex * widthPercent}%`;
        el.style.height = `${height}px`;
        
        // GPU 가속을 위해 top 대신 transform 사용 준비
        el.style.top = '0px'; 
        el.style.transform = 'translate3d(0, -200px, 0)'; 

        return el;
    },

    // 노트를 풀로 반환 (화면에서 숨김)
    returnNoteElement(el) {
        if (!el) return;
        el.style.display = 'none';
        el.style.transform = 'translate3d(0, -200px, 0)'; 
    },
    // ------------------------------------------------

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
        this.state.animationFrameId = null;
        this.state.countdownIntervalId = null;
        
        // 렌더링 중인 노트들 정리
        this.state.renderingNotes.forEach(note => {
            if (note.element) this.returnNoteElement(note.element);
        });
        this.state.renderingNotes = [];
    },

    // 화면 크기 변경 시 호출 (반응형 대응)
    resize() {
        if (!DOM.lanesContainer) return;
        this.state.laneHeight = DOM.lanesContainer.offsetHeight;
        // 판정선 위치: CSS의 .judgement-line { bottom: 100px; } 에 맞춤
        // 상단 기준 좌표계이므로 전체 높이 - 100px
        this.state.hitPosition = this.state.laneHeight - 100;
        
        // 레인 너비 재설정 등은 setupLanes에서 처리되지만, 필요하다면 여기서도 갱신 가능
    },

    runCountdown(onComplete) {
        this.cancelCountdown();
        let count = 3;
        const countdownEl = DOM.countdownTextEl;
        
        const tick = () => {
            countdownEl.classList.remove('show');
            void countdownEl.offsetWidth; // 리플로우 강제 (애니메이션 리셋)
            
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

        // 1. 노트 데이터 생성
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

        // 2. 레인 및 풀 초기화
        this.setupLanes();
        this.initPool(100); // 넉넉하게 100개 미리 생성
        this.resize();      // 높이 계산

        UI.showScreen('playing');
        UI.updateScoreboard();
        this.state.gameState = 'countdown';

        // 음악 소스 설정
        if (this.state.settings.mode === 'music' && this.state.settings.musicFileObject) {
            const musicUrl = URL.createObjectURL(this.state.settings.musicFileObject);
            DOM.musicPlayer.src = musicUrl;
            DOM.musicPlayer.load();
        }

        this.runCountdown(() => {
            this.state.gameState = 'playing';
            this.state.gameStartTime = performance.now();
            
            if (this.state.settings.mode === 'music') {
                DOM.musicPlayer.currentTime = this.state.settings.startTimeOffset;
                DOM.musicPlayer.volume = this.state.settings.musicVolume / 100;
                DOM.musicPlayer.play().then(() => {
                    // 오디오 재생 성공 시 싱크 기준점 설정
                    this.state.audioContextStartTime = performance.now() - (DOM.musicPlayer.currentTime * 1000);
                    this.loop();
                }).catch(err => {
                    console.error("Audio play failed:", err);
                    // 오디오 실패해도 게임은 진행 (fallback)
                    this.state.audioContextStartTime = performance.now();
                    this.loop();
                });
            } else {
                // 랜덤 모드 등 음악 파일이 없는 경우
                this.state.audioContextStartTime = performance.now();
                this.loop();
            }
        });
    },

    end() {
        try {
            const activeStates = ['playing', 'countdown'];
            if (!activeStates.includes(this.state.gameState) && !this.state.isPaused) return;

            this.cancelCountdown();

            if (this.state.animationFrameId) {
                cancelAnimationFrame(this.state.animationFrameId);
                this.state.animationFrameId = null;
            }

            if (this.state.settings.mode === 'music' && DOM.musicPlayer.src) {
                DOM.musicPlayer.pause();
                DOM.musicPlayer.load(); // 상태 완전 초기화
                
                if (DOM.musicPlayer.src.startsWith('blob:')) {
                    URL.revokeObjectURL(DOM.musicPlayer.src);
                }
            }

            this.state.gameState = 'result';
            resetPlayingScreenUI();
            UI.updateResultScreen();
            UI.showScreen('result');
            
            // 화면에 남은 노트들 정리
            this.state.renderingNotes.forEach(note => {
                if (note.element) this.returnNoteElement(note.element);
            });
            this.state.renderingNotes = [];

        } catch (err) {
            Debugger.logError(err, 'Game.end');
        }
    },

    prepareNotesFromChartData() {
        const chartData = JSON.parse(JSON.stringify(this.state.chartData));
        const playerLaneCount = this.state.settings.lanes;
        const requiredLaneIds = CONFIG.LANE_KEY_MAPPING_ORDER[playerLaneCount];
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

    // --- 3. 핵심 게임 루프 (Update와 Render 분리) ---
    loop() {
        if (this.state.gameState !== 'playing' || this.state.isPaused) return;

        const now = performance.now();
        
        // 1. 시간 계산 (싱크 보정 적용)
        let elapsedTime; // 현재 노래의 진행 시간 (ms)
        
        if (this.state.settings.mode === 'music' && !DOM.musicPlayer.paused) {
            const audioTime = DOM.musicPlayer.currentTime;
            const visualTime = (now - this.state.audioContextStartTime) / 1000;
            
            // 드리프트 보정: 오디오 시간과 비주얼 시간이 0.05초 이상 차이나면 오디오 시간에 맞춤
            if (Math.abs(audioTime - visualTime) > 0.05) {
                this.state.audioContextStartTime = now - (audioTime * 1000);
                elapsedTime = audioTime * 1000;
            } else {
                elapsedTime = visualTime * 1000;
            }
        } else {
            // 랜덤 모드 (음악 없음)
            elapsedTime = now - this.state.audioContextStartTime;
        }
        
        // 2. 로직 업데이트
        this.update(elapsedTime);
        
        // 3. 화면 렌더링
        this.render(elapsedTime);

        // 4. 종료 조건 체크
        if (this.state.processedNotes >= this.state.totalNotes && this.state.totalNotes > 0) {
            // 마지막 노트 처리 후 잠시 대기
            setTimeout(() => this.end(), 1000);
            return;
        }

        // 5. 디버거 업데이트
        if (typeof Debugger !== 'undefined' && Debugger.isActive) {
            Debugger.updatePerf(now);
            Debugger.updateState(this.state);
        }

        this.state.animationFrameId = requestAnimationFrame(() => this.loop());
    },

    update(currentTime) {
        Debugger.profileStart('Game.update');

        const speed = this.state.settings.noteSpeed;
        // 노트가 화면 상단에 등장해야 할 시간 (판정선까지 도달하는 시간 고려)
        // distance = 100%(화면높이) - 판정선여유. 편의상 상단에서 판정선까지를 기준으로 잡음.
        // speed가 10일 때 약 1초 전 등장하도록 설정 (조절 가능)
        const travelTimeMs = 20000 / speed; 

        // 1. 대기열(notes)에서 화면에 등장할 노트들을 renderingNotes로 이동
        while (this.state.notes.length > 0) {
            const note = this.state.notes[0];
            
            // 현재시간 >= 노트시간 - 이동시간 이면 등장
            if (currentTime >= note.time - travelTimeMs) {
                const laneCount = this.state.settings.lanes;
                const widthPercent = 100 / laneCount;
                
                // 풀에서 DOM 요소 가져오기
                let height = 25;
                if (note.type === 'long_head') {
                    // 롱노트 길이는 속도에 비례
                    height = (note.duration / 10) * speed; 
                }
                
                const element = this.getNoteElement(note.type, note.lane, widthPercent, height);
                
                this.state.renderingNotes.push({
                    ...note,
                    element: element,
                    processed: false
                });
                
                this.state.notes.shift(); // 대기열 제거
            } else {
                break; // 아직 등장할 시간이 아님 (정렬되어 있으므로 뒤는 볼 필요 없음)
            }
        }

        // 2. Miss 판정 로직 (화면 밖으로 나간 노트)
        for (let i = this.state.renderingNotes.length - 1; i >= 0; i--) {
            const note = this.state.renderingNotes[i];
            
            // 노트 시간이 현재 시간보다 miss 판정 범위 이상 지났고, 아직 처리 안됨
            if (!note.processed && (currentTime - note.time > CONFIG.JUDGEMENT_WINDOWS_MS.miss)) {
                // 롱노트 꼬리는 헤드가 처리되었으면 Miss 아님
                if (note.type === 'long_tail' && note.headProcessed) {
                    // 그냥 제거
                    this.returnNoteElement(note.element);
                    this.state.renderingNotes.splice(i, 1);
                    continue;
                }
                
                if (note.type !== 'false') {
                    this.handleJudgement('miss', note);
                } else {
                    // 가짜 노트는 놓치면 성공 (그냥 사라짐)
                    this.returnNoteElement(note.element);
                    this.state.renderingNotes.splice(i, 1);
                }
            }
        }
        Debugger.profileEnd('Game.update');
    },

    render(currentTime) {
        Debugger.profileStart('Game.render');
        
        const speedScale = (this.state.settings.noteSpeed / 10); // 속도 계수
        
        // 화면에 있는 노트 위치 업데이트
        for (let i = this.state.renderingNotes.length - 1; i >= 0; i--) {
            const note = this.state.renderingNotes[i];
            
            // 이미 처리되어 요소가 없어진 노트는 스킵
            if (!note.element) {
                // 배열에서도 제거
                this.state.renderingNotes.splice(i, 1);
                continue;
            }

            // 위치 계산: (현재시간 - 노트시간) * 속도
            // 노트시간일 때 판정선(hitPosition)에 있어야 함
            // timeDiff가 0이면 판정선, 음수면 위쪽, 양수면 아래쪽
            const timeDiffMs = currentTime - note.time; 
            
            // 픽셀 단위 위치 계산
            // timeDiffMs(ms) * speedScale을 픽셀로 환산. 보정값 필요.
            // 여기서는 단순하게 시간 차이에 비례하여 Y축 이동
            const yOffset = timeDiffMs * speedScale;
            const y = this.state.hitPosition + yOffset;

            // 화면 밖으로 완전히 벗어났는지 체크 (메모리 회수)
            if (y > this.state.laneHeight + 200) { // 여유 있게 200px
                this.returnNoteElement(note.element);
                this.state.renderingNotes.splice(i, 1);
                continue;
            }

            // GPU 가속을 이용한 위치 이동
            note.element.style.transform = `translate3d(0, ${y}px, 0)`;
        }
        Debugger.profileEnd('Game.render');
    },

    handleJudgement(judgement, note) {
        try {
            if (note.processed && judgement !== 'miss') return; // 이미 처리된 노트 중복 방지

            if (note.type === 'false') {
                // 가짜 노트는 누르면 MISS, Miss판정이면(흘려보내면) 사실상 아무일 없음(Perfect)
                judgement = (judgement === 'miss') ? 'perfect' : 'miss';
            }

            if (judgement === 'miss') {
                // 화면 밖으로 나감 or 잘못 누름
                if (note.element) {
                    this.returnNoteElement(note.element);
                    note.element = null; // 참조 끊기
                }
                note.processed = true;
                
                Audio.playMissSound();
                UI.showJudgementFeedback('MISS', 0);
                
                this.state.judgements['miss']++;
                this.state.combo = 0;
            } else {
                // Perfect, Good, Bad
                note.processed = true;
                
                // 시각적 피드백
                if (note.element) {
                    // 히트 이펙트 등을 추가할 수 있음
                    this.returnNoteElement(note.element);
                    note.element = null;
                }

                // 점수 및 콤보 처리
                this.state.score += CONFIG.POINTS[judgement];
                this.state.judgements[judgement]++;
                
                if (judgement === 'bad') {
                    this.state.combo = 0;
                    Audio.playMissSound();
                } else {
                    this.state.combo++;
                    Audio.playHitSound();
                    
                    // 롱노트 헤드 처리 시 테일에게 알림
                    if (note.type === 'long_head') {
                        const tailNote = this.state.notes.find(n => n.noteId === note.noteId && n.type === 'long_tail') 
                                      || this.state.renderingNotes.find(n => n.noteId === note.noteId && n.type === 'long_tail');
                        if (tailNote) tailNote.headProcessed = true;
                    }
                }
                
                UI.showJudgementFeedback(judgement.toUpperCase(), this.state.combo);
            }
            
            // 노트 카운트 (롱노트 헤드는 제외하거나 포함 정책에 따름. 여기서는 일반노트만)
            if (note.type !== 'long_head' && note.type !== 'long_tail') {
                this.state.processedNotes++;
            } else if (note.type === 'long_tail') {
                this.state.processedNotes++;
            }

            UI.updateScoreboard();

        } catch (err) {
            Debugger.logError(err, 'Game.handleJudgement');
        }
    },

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.togglePause();
            return;
        }
        if (this.state.gameState !== 'playing' || this.state.isPaused) return;
        
        const laneIndex = this.state.keyMapping.findIndex(code => code === e.keyCode || code === e.key.toUpperCase().charCodeAt(0));
        if (laneIndex === -1 || this.state.activeLanes[laneIndex]) return;
        
        this.handleInputDown(laneIndex);
    },

    handleKeyUp(e) {
        if (this.state.gameState !== 'playing' || this.state.isPaused) return;
        
        const laneIndex = this.state.keyMapping.findIndex(code => code === e.keyCode || code === e.key.toUpperCase().charCodeAt(0));
        if (laneIndex === -1) return;
        
        this.handleInputUp(laneIndex);
    },

    handleInputDown(laneIndex) {
        try {
            this.state.activeLanes[laneIndex] = true;
            const laneEl = DOM.lanesContainer.children[laneIndex];
            // 주의: lanesContainer에는 이제 note div들도 포함될 수 있으므로 index 접근 시 주의
            // 하지만 setupLanes에서 lane div를 먼저 만들고, note pool은 그 뒤에 append 됨.
            // 안전하게는 lane div를 별도 배열로 관리하거나 querySelector 사용 권장.
            // 여기서는 기존 구조 유지: lane div들이 먼저 있고, note는 absolute라 순서 상관 없음.
            // 단, DOM.lanesContainer.children[laneIndex]가 정확히 레인 div인지 확인 필요.
            // setupLanes를 보면 lane div를 lanesContainer에 append 함.
            // note pool도 lanesContainer에 append 함.
            // 따라서 children 인덱스가 섞임. 수정 필요.
            
            // [수정] 레인 시각적 피드백을 위해 dataset 활용
            const targetLaneEl = document.querySelector(`.lane[data-lane-index="${laneIndex}"]`);
            if (targetLaneEl) targetLaneEl.classList.add('active-feedback');

            let elapsedTime;
            if (this.state.settings.mode === 'music' && !DOM.musicPlayer.paused) {
                elapsedTime = DOM.musicPlayer.currentTime * 1000;
            } else {
                elapsedTime = performance.now() - this.state.audioContextStartTime;
            }

            // 현재 화면에 보이는 노트들(renderingNotes) 중에서 판정
            // 가장 판정선에 가까운 노트 찾기
            let bestMatch = null;
            let smallestDiff = Infinity;

            for (const note of this.state.renderingNotes) {
                if (note.processed) continue;
                if (note.lane !== laneIndex) continue;
                
                // 탭 노트, 롱노트 헤드, 가짜 노트 대상
                if (note.type !== 'tap' && note.type !== 'long_head' && note.type !== 'false') continue;

                // 노트 시간 vs 현재 시간
                const timeDiff = Math.abs(note.time - elapsedTime);
                
                // Miss 범위 안에 있어야 판정 시도 가능
                if (timeDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.miss) {
                    if (timeDiff < smallestDiff) {
                        smallestDiff = timeDiff;
                        bestMatch = note;
                    }
                }
            }

            if (bestMatch) {
                if (smallestDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.perfect) this.handleJudgement('perfect', bestMatch);
                else if (smallestDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.good) this.handleJudgement('good', bestMatch);
                else if (smallestDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.bad) this.handleJudgement('bad', bestMatch);
                else this.handleJudgement('miss', bestMatch); // 범위 끝자락
            }
        } catch (err) {
            Debugger.logError(err, 'Game.handleInputDown');
        }
    },

    handleInputUp(laneIndex) {
        this.state.activeLanes[laneIndex] = false;
        const targetLaneEl = document.querySelector(`.lane[data-lane-index="${laneIndex}"]`);
        if (targetLaneEl) targetLaneEl.classList.remove('active-feedback');

        let elapsedTime;
        if (this.state.settings.mode === 'music' && !DOM.musicPlayer.paused) {
            elapsedTime = DOM.musicPlayer.currentTime * 1000;
        } else {
            elapsedTime = performance.now() - this.state.audioContextStartTime;
        }

        // 롱노트 떼는 판정
        let bestMatch = null;
        let smallestDiff = Infinity;

        for (const note of this.state.renderingNotes) {
            if (note.processed) continue;
            if (note.lane !== laneIndex) continue;
            
            // 롱노트 꼬리이면서, 머리가 이미 처리된 경우만
            if (note.type === 'long_tail' && note.headProcessed) {
                const timeDiff = Math.abs(note.time - elapsedTime);
                if (timeDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.miss) {
                    if (timeDiff < smallestDiff) {
                        smallestDiff = timeDiff;
                        bestMatch = note;
                    }
                }
            }
        }

        if (bestMatch) {
            if (smallestDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.perfect) this.handleJudgement('perfect', bestMatch);
            else if (smallestDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.good) this.handleJudgement('good', bestMatch);
            else if (smallestDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.bad) this.handleJudgement('bad', bestMatch);
            // 떼는 건 Miss 판정 안 내리는 경우가 많음 (혹은 콤보만 유지)
        }
    },

    togglePause() {
        if (this.state.gameState !== 'playing' && this.state.gameState !== 'countdown') return;
        this.state.isPaused = !this.state.isPaused;
        
        if (this.state.isPaused) {
            this.cancelCountdown();
            this.state.pauseStartTime = performance.now();
            
            if (this.state.animationFrameId) cancelAnimationFrame(this.state.animationFrameId);
            
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
                const pauseDuration = performance.now() - this.state.pauseStartTime;
                this.state.totalPausedTime += pauseDuration;
                
                // 오디오 모드일 경우 currentTime은 유지되므로 contextTime만 조정
                if (this.state.settings.mode === 'music') {
                    DOM.musicPlayer.play();
                    // 재시작 시 싱크 재조정 (현재 시간 - 오디오재생시간)
                    this.state.audioContextStartTime = performance.now() - (DOM.musicPlayer.currentTime * 1000);
                } else {
                    // 랜덤 모드는 기준 시간을 멈춘 시간만큼 뒤로 밀어줌
                    this.state.audioContextStartTime += pauseDuration;
                }
                
                this.state.gameState = 'playing';
                this.loop();
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
            lane.dataset.laneIndex = i; // 식별자 추가
            
            const keyHint = document.createElement('div');
            keyHint.className = 'key-hint';
            const keyName = keysForCurrentLanes[i];
            keyHint.textContent = keyHintMap[keyName] || keyName.toUpperCase();
            
            lane.appendChild(new DOMParser().parseFromString('<div class="judgement-line"></div>', "text/html").body.firstChild);
            lane.appendChild(keyHint);
            
            // 마우스/터치 이벤트
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
        if (totalNotesToGenerate < CONFIG.NOTE_COUNT_MIN) totalNotesToGenerate = CONFIG.NOTE_COUNT_MIN;
        if (totalNotesToGenerate > CONFIG.NOTE_COUNT_MAX) totalNotesToGenerate = CONFIG.NOTE_COUNT_MAX;
        
        const simProbability = this.state.settings.dongtaProbability;
        const longNoteProbability = this.state.settings.longNoteProbability;
        const falseNoteProbability = this.state.settings.falseNoteProbability;
        
        let generatedNotesCount = 0;
        let currentTime = 2000; // 시작 여유 시간
        let noteIdCounter = 0;
        
        while (generatedNotesCount < totalNotesToGenerate) {
            const canGenerateSimultaneous = this.state.settings.lanes > 1 && (totalNotesToGenerate - generatedNotesCount >= 2);
            const canGenerateLongNote = (totalNotesToGenerate - generatedNotesCount >= 1);
            
            if (canGenerateSimultaneous && Math.random() < simProbability) {
                // 동시타
                const availableLanes = Array.from({ length: this.state.settings.lanes }, (_, i) => i);
                // 셔플
                for (let i = availableLanes.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [availableLanes[i], availableLanes[j]] = [availableLanes[j], availableLanes[i]];
                }
                this.state.notes.push({ lane: availableLanes[0], time: currentTime, type: 'tap' });
                this.state.notes.push({ lane: availableLanes[1], time: currentTime, type: 'tap' });
                generatedNotesCount += 2;
            } else if (canGenerateLongNote && Math.random() < longNoteProbability) {
                // 롱노트
                const lane = Math.floor(Math.random() * this.state.settings.lanes);
                const duration = 500 + Math.random() * 1000;
                const noteId = noteIdCounter++;
                this.state.notes.push({ lane, time: currentTime, duration, type: 'long_head', noteId });
                this.state.notes.push({ lane, time: currentTime + duration, type: 'long_tail', noteId });
                currentTime += duration;
                generatedNotesCount += 1;
            } else if (falseNoteProbability > 0 && Math.random() < falseNoteProbability) {
                // 가짜 노트
                const lane = Math.floor(Math.random() * this.state.settings.lanes);
                this.state.notes.push({ lane, time: currentTime, type: 'false' });
                generatedNotesCount++;
            } else {
                // 일반 노트
                const lane = Math.floor(Math.random() * this.state.settings.lanes);
                this.state.notes.push({ lane, time: currentTime, type: 'tap' });
                generatedNotesCount++;
            }
            currentTime += 500 - this.state.settings.lanes * CONFIG.NOTE_SPACING_FACTOR;
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
            
            // 실제 노트 생성은 start()의 prepareNotesFromChartData()에서 수행됨
            return true;
        } catch (err) {
            Debugger.logError(err, 'Game.loadChartNotes');
            UI.showMessage('menu', `차트 로딩 오류: ${err.message}`);
            return false;
        }
    },
};