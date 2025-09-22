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
    },
    resetState() {
        this.state.score = 0;
        this.state.combo = 0;
        this.state.judgements = { perfect: 0, good: 0, bad: 0, miss: 0 };
        this.state.processedNotes = 0;
        this.state.isPaused = false;
        this.state.totalPausedTime = 0;
    },
    
    runCountdown(onComplete) {
        this.cancelCountdown(); // 이전 카운트다운이 있다면 취소
    
        let count = 3;
        const countdownEl = DOM.countdownTextEl;
    
        // 1. 즉시 '3'을 표시하고 애니메이션 실행
        countdownEl.textContent = count;
        countdownEl.classList.remove('show');
        void countdownEl.offsetWidth;
        countdownEl.classList.add('show');
        Audio.playCountdownTick();
    
        const tick = () => {
            count--; // 2. 타이머가 호출되면 카운트부터 감소
    
            countdownEl.classList.remove('show'); // 애니메이션 리셋
            void countdownEl.offsetWidth;         // 리플로우 강제
    
            if (count > 0) {
                countdownEl.textContent = count;
                Audio.playCountdownTick();
            } else if (count === 0) {
                countdownEl.textContent = 'START!';
                Audio.playCountdownStart();
            } else {
                this.cancelCountdown(); // setInterval 중지
                onComplete();           // 게임 시작 콜백 실행
                return;                 // 인터벌 콜백 종료
            }
    
            countdownEl.classList.add('show'); // 변경된 내용으로 애니메이션 실행
        };
    
        // 3. 1초 후에 tick 함수를 반복적으로 실행
        this.state.countdownIntervalId = setInterval(tick, 1000);
    },

    cancelCountdown() {
        if (this.state.countdownIntervalId) {
            clearInterval(this.state.countdownIntervalId);
            this.state.countdownIntervalId = null;
        }
        DOM.countdownTextEl.classList.remove('show');
    },

    start() {
        this.resetState();
        resetPlayingScreenUI(); // [추가] 게임 시작 시 플레이 화면 UI를 초기 상태로 리셋

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
            this.loop();
        });
    },
    end() {
        const activeStates = ['playing', 'countdown'];
        if (!activeStates.includes(this.state.gameState) && !this.state.isPaused) {
            return;
        }

        this.cancelCountdown();
        cancelAnimationFrame(this.state.animationFrameId);
        if (this.state.settings.mode === 'music') DOM.musicPlayer.pause();
        
        this.state.gameState = 'result';
        resetPlayingScreenUI();
        UI.updateResultScreen();
        UI.showScreen('result');
    },
    loop(timestamp) {
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
        const noteHeight = isLongNote
          ? (note.duration / 10) * this.state.settings.noteSpeed
          : 25;
        
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
          this.handleJudgement('miss', note);
        }
      }
    },
    handleJudgement(judgement, note) {
      if (note.processed) return;
      note.processed = true;
    
      if (note.type === 'long_tail') {
        const headNote = this.state.notes.find(n => n.noteId === note.noteId && n.type === 'long_head');
        if (headNote && headNote.element) {
          headNote.element.remove();
          headNote.element = null;
        }
      } else if (note.type === 'tap' && note.element) {
        note.element.remove();
        note.element = null;
      }
    
      this.state.judgements[judgement]++;
      if (note.type !== 'long_head') { this.state.processedNotes++; }
    
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
    
      if (judgement === 'perfect' || judgement === 'good') Audio.playHitSound();
      else Audio.playMissSound();
    
      UI.showJudgementFeedback(judgement.toUpperCase(), this.state.combo);
      UI.updateScoreboard();
    },
    handleKeyDown(e) {
        if (e.keyCode === 27) {
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
        
        const hittableNotes = this.state.notes.filter(n =>
            !n.processed && n.lane === laneIndex && (n.type === 'tap' || n.type === 'long_head') && Math.abs(n.time - elapsedTime) <= CONFIG.JUDGEMENT_WINDOWS_MS.miss
        );
        if (hittableNotes.length > 0) {
            const noteToHit = hittableNotes.sort((a, b) => Math.abs(a.time - elapsedTime) - Math.abs(b.time - elapsedTime))[0];
            const timeDiff = Math.abs(noteToHit.time - elapsedTime);
            if (timeDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.perfect) this.handleJudgement('perfect', noteToHit);
            else if (timeDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.good) this.handleJudgement('good', noteToHit);
            else if (timeDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.bad) this.handleJudgement('bad', noteToHit);
        }
    },
    handleInputUp(laneIndex) {
        this.state.activeLanes[laneIndex] = false;
        const laneEl = DOM.lanesContainer.children[laneIndex];
        if (laneEl) laneEl.classList.remove('active-feedback');
        
        const elapsedTime = this.state.settings.mode === 'music' ? 
            DOM.musicPlayer.currentTime * 1000 : 
            performance.now() - this.state.gameStartTime - this.state.totalPausedTime;
        
        const hittableNotes = this.state.notes.filter(n =>
            !n.processed && n.lane === laneIndex && n.type === 'long_tail' && n.headProcessed && Math.abs(n.time - elapsedTime) <= CONFIG.JUDGEMENT_WINDOWS_MS.miss
        );
        if (hittableNotes.length > 0) {
            const noteToHit = hittableNotes.sort((a, b) => Math.abs(a.time - elapsedTime) - Math.abs(b.time - elapsedTime))[0];
            const timeDiff = Math.abs(noteToHit.time - elapsedTime);
            if (timeDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.perfect) this.handleJudgement('perfect', noteToHit);
            else if (timeDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.good) this.handleJudgement('good', noteToHit);
            else if (timeDiff <= CONFIG.JUDGEMENT_WINDOWS_MS.bad) this.handleJudgement('bad', noteToHit);
        }
    },
    togglePause() {
        if (this.state.gameState !== 'playing' && this.state.gameState !== 'countdown') return;

        if (this.state.isPaused) {
            this.resumeGame();
        } else {
            this.cancelCountdown();
            this.state.isPaused = true; 
            this.state.pauseStartTime = performance.now();
            cancelAnimationFrame(this.state.animationFrameId);
            if (this.state.settings.mode === 'music') DOM.musicPlayer.pause();
            
            DOM.pauseGameBtn.classList.add('hidden');
            DOM.resumeGameBtn.classList.remove('hidden');
            DOM.playingStatusLabel.textContent = '일시 정지 중';
            DOM.settings.iconPlaying.classList.remove('hidden'); // [핵심 수정] 일시정지 시 설정 아이콘 보이기
        }
    },
    resumeGame() {
        DOM.pauseGameBtn.classList.remove('hidden');
        DOM.resumeGameBtn.classList.add('hidden');
        DOM.playingStatusLabel.textContent = '플레이 중';
        DOM.settings.iconPlaying.classList.add('hidden'); // [핵심 수정] 재개 시 설정 아이콘 숨기기

        this.runCountdown(() => {
            this.state.isPaused = false;
            this.state.totalPausedTime += performance.now() - this.state.pauseStartTime;
            if (this.state.settings.mode === 'music') DOM.musicPlayer.play();
            // 재개 시에는 gameState를 'playing'으로 유지/복구
            this.state.gameState = 'playing';
            this.loop();
        });
    },
    setupLanes() {
      DOM.lanesContainer.innerHTML = '';
      DOM.lanesContainer.style.width = `${this.state.settings.lanes * 100}px`;
      this.state.activeLanes = Array(this.state.settings.lanes).fill(false);
      
      const keysForCurrentLanes = CONFIG.LANE_KEYS[this.state.settings.lanes];
      if (!keysForCurrentLanes) { console.error(`Invalid number of lanes: ${this.state.settings.lanes}.`); UI.showScreen('menu'); return; }
      this.state.keyMapping = keysForCurrentLanes.map(key => CONFIG.KEY_CODES[key]).filter(Boolean);
  
      const keyHintMap = { 'Space': '⎵', 'Semicolon': ';' };
  
      for (let i = 0; i < this.state.settings.lanes; i++) {
          const lane = document.createElement('div');
          lane.className = 'lane';
          lane.style.width = '100px';
          lane.dataset.laneIndex = i;
  
          const keyHint = document.createElement('div');
          keyHint.className = 'key-hint';
          
          const keyName = keysForCurrentLanes[i];
          keyHint.textContent = keyHintMap[keyName] || keyName || '';
          
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
        if (totalNotesToGenerate < CONFIG.NOTE_COUNT_MIN) totalNotesToGenerate = CONFIG.NOTE_COUNT_MIN;
        if (totalNotesToGenerate > CONFIG.NOTE_COUNT_MAX) totalNotesToGenerate = CONFIG.NOTE_COUNT_MAX;

        const simProbability = this.state.settings.dongtaProbability;
        const longNoteProbability = this.state.settings.longNoteProbability;
        
        let generatedNotesCount = 0;
        let currentTime = 1000;
        let noteIdCounter = 0;

        while (generatedNotesCount < totalNotesToGenerate) {
            const canGenerateSimultaneous = this.state.settings.lanes > 1 && (totalNotesToGenerate - generatedNotesCount >= 2);
            const canGenerateLongNote = (totalNotesToGenerate - generatedNotesCount >= 1);

            if (canGenerateSimultaneous && Math.random() < simProbability) {
                const availableLanes = Array.from({ length: this.state.settings.lanes }, (_, i) => i);
                for (let i = availableLanes.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [availableLanes[i], availableLanes[j]] = [availableLanes[j], availableLanes[i]];
                }
                this.state.notes.push({ lane: availableLanes[0], time: currentTime, type: 'tap' });
                this.state.notes.push({ lane: availableLanes[1], time: currentTime, type: 'tap' });
                generatedNotesCount += 2;
            } else if (canGenerateLongNote && Math.random() < longNoteProbability) {
                const lane = Math.floor(Math.random() * this.state.settings.lanes);
                const duration = 500 + Math.random() * 1000;
                const noteId = noteIdCounter++;
                
                this.state.notes.push({ lane, time: currentTime, duration, type: 'long_head', noteId });
                this.state.notes.push({ lane, time: currentTime + duration, type: 'long_tail', noteId });
                
                currentTime += duration;
                generatedNotesCount += 1;
            } else {
                const lane = Math.floor(Math.random() * this.state.settings.lanes);
                this.state.notes.push({ lane: lane, time: currentTime, type: 'tap' });
                generatedNotesCount++;
            }
            currentTime += 500 - this.state.settings.lanes * CONFIG.NOTE_SPACING_FACTOR;
        }
        this.state.totalNotes = totalNotesToGenerate;
    },
    loadChartNotes(chartData) {
        if (!chartData.lanes || !CONFIG.VALID_LANES.includes(chartData.lanes)) {
            UI.showMessage('menu', `오류: 차트의 레인 수(${chartData.lanes || '없음'})가 잘못되었습니다.`);
            return false;
        }
        this.state.notes = [];
        this.state.settings.lanes = chartData.lanes;
        document.querySelectorAll('#lanes-selector button').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.lanes) === this.state.settings.lanes);
        });
        this.state.notes = chartData.notes.map(note => ({
            ...note,
            type: note.duration ? 'long_head' : 'tap',
            element: null,
            processed: false
        }));
        this.state.totalNotes = this.state.notes.length;
        return true;
    },
};
