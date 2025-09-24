const Editor = {
    state: {
        notes: [],
        bpm: 120,
        startTimeOffset: 0,
        audioFileName: '',
        isPlaying: false,
        animationFrameId: null,
        selectedNoteType: 'tap',
        isPlacingLongNote: false,
        longNoteStart: null,
        isConfirmingReset: false,
        playbackStartTime: 0, // 재생 시작 시점의 타임스탬프
        timeWhenPaused: 0,
        totalMeasures: 100,
    },

    _getMeasureFromTime(timeInMs) {
        const beatsPerMeasure = 4; // 4/4박자 기준
        const beatsPerSecond = this.state.bpm / 60;
        const totalBeats = (timeInMs / 1000) * beatsPerSecond;
        return Math.floor(totalBeats / beatsPerMeasure);
    },

    init() {
        this.state.isPlaying = false;
        this.state.isConfirmingReset = false;
        this.resetLongNotePlacement();
        
        UI.showScreen('editor');
        this.setupEventListeners();
        this.resetEditorState(); // 에디터 상태 초기화 함수 호출
    },

    resetEditorState() {
        this.state.notes = [];
        this.state.bpm = 120;
        this.state.startTimeOffset = 0;
        this.state.audioFileName = '';
        this.state.selectedNoteType = 'tap';
        this.state.totalMeasures = 100;
        
        DOM.musicPlayer.pause();
        DOM.musicPlayer.src = '';

        DOM.editor.bpmInput.value = this.state.bpm;
        DOM.editor.startTimeInput.value = this.state.startTimeOffset;
        DOM.editor.audioFileNameEl.textContent = '선택된 파일 없음';
        DOM.editor.chartFilenameInput.value = '';
        DOM.editor.resetBtn.textContent = '재설정';
        DOM.editor.resetBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-400');
        DOM.editor.resetBtn.classList.add('bg-red-700', 'hover:bg-red-600');
        this.state.isConfirmingReset = false;

        this.updateNoteTypeUI();
        this.drawTimeline();
        this.renderNotes();
    },

    addMeasure() {
        this.state.totalMeasures++;
        this.drawGrid();
        this.renderNotes();
    },
    
    removeMeasure() {
        if (this.state.totalMeasures > 1) {
            // [수정] 삭제될 마디의 번호 (0부터 시작하므로 -1)
            const measureToRemove = this.state.totalMeasures - 1;
            
            // [수정] 삭제될 마디에 속한 노트를 모두 제거합니다.
            this.state.notes = this.state.notes.filter(note => note.measure !== measureToRemove);
            
            this.state.totalMeasures--;
            this.drawGrid();
            this.renderNotes(); // 노트가 삭제된 상태를 화면에 즉시 반영
        }
    },

    setupEventListeners() {
        if (this.listenersInitialized) return;
    
        // 상단 컨트롤
        DOM.editor.audioFileInput.addEventListener('change', (e) => this.handleAudioLoad(e));
        DOM.editor.startTimeInput.addEventListener('input', (e) => { this.state.startTimeOffset = parseFloat(e.target.value) || 0; });
        DOM.editor.bpmInput.addEventListener('input', (e) => { this.state.bpm = parseInt(e.target.value) || 120; this.drawTimeline(); this.renderNotes(); });
        DOM.editor.addMeasureBtn.addEventListener('click', () => this.addMeasure());
        DOM.editor.removeMeasureBtn.addEventListener('click', () => this.removeMeasure());
        DOM.editor.noteTypeSelector.addEventListener('click', (e) => this.handleNoteTypeSelect(e));
        
        // 관리 버튼
        DOM.editor.playBtn.addEventListener('click', () => this.handlePlayPause());
    DOM.editor.stopBtn.addEventListener('click', () => this.stopPlayback()); // 새로 추가
    DOM.editor.saveBtn.addEventListener('click', () => this.saveChart());
        DOM.editor.saveBtn.addEventListener('click', () => this.saveChart());
        DOM.editor.loadBtn.addEventListener('click', () => DOM.editor.loadInput.click());
        DOM.editor.loadInput.addEventListener('change', (e) => this.handleChartLoad(e));
        DOM.editor.resetBtn.addEventListener('click', () => this.handleReset());
    
        // [핵심 수정] 타임라인 전체가 아닌, 노트가 올라가는 '레이어'에 직접 이벤트 리스너를 답니다.
        DOM.editor.notesContainer.addEventListener('click', (e) => this.handleTimelineClick(e));
    
        this.listenersInitialized = true;
    },
    
    drawTimeline() {
        const gridContainer = DOM.editor.gridContainer;
        gridContainer.innerHTML = ''; // 그리드 컨테이너만 비웁니다.
        
        // 9개의 시각적 레인을 '그리드 컨테이너'에 생성합니다.
        CONFIG.EDITOR_LANE_IDS.forEach(() => {
            const laneEl = document.createElement('div');
            laneEl.className = 'editor-lane';
            gridContainer.appendChild(laneEl);
        });
    
        this.drawGrid();
    },

    handleAudioLoad(e) {
        const file = e.target.files[0];
        if (file) {
            DOM.musicPlayer.src = URL.createObjectURL(file);
            this.state.audioFileName = file.name;
            DOM.editor.audioFileNameEl.textContent = file.name;
            DOM.musicPlayer.onloadedmetadata = () => this.drawGrid();
        }
        e.target.value = null;
    },

    handleChartLoad(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const chartData = JSON.parse(event.target.result);
                this.loadChart(chartData, file.name);
            } catch (error) { UI.showMessage('editor', '잘못된 차트 파일 형식입니다.'); }
        };
        reader.readAsText(file);
        e.target.value = null;
    },

    clearNotes() {
        this.state.notes = [];
        this.renderNotes();
        UI.showMessage('editor', '모든 노트를 삭제했습니다.');
    },
    
    // [수정] handleReset 함수가 clearNotes를 호출하도록 변경
    handleReset() {
        if (!this.state.isConfirmingReset) {
            this.state.isConfirmingReset = true;
            DOM.editor.resetBtn.textContent = '확인?';
            DOM.editor.resetBtn.classList.remove('bg-red-700', 'hover:bg-red-600');
            DOM.editor.resetBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-400');
            setTimeout(() => {
                if(this.state.isConfirmingReset) {
                    this.state.isConfirmingReset = false;
                    DOM.editor.resetBtn.textContent = '재설정';
                    DOM.editor.resetBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-400');
                    DOM.editor.resetBtn.classList.add('bg-red-700', 'hover:bg-red-600');
                }
            }, 3000);
        } else {
            // resetEditorState() 대신 clearNotes()를 호출합니다.
            this.clearNotes();
            this.state.isConfirmingReset = false;
            DOM.editor.resetBtn.textContent = '재설정';
            DOM.editor.resetBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-400');
            DOM.editor.resetBtn.classList.add('bg-red-700', 'hover:bg-red-600');
        }
    },

    handleTimelineClick(e) {
        if (this.state.isPlaying) return;
        // 모든 계산의 기준을 스크롤이 발생하는 'container'로 잡습니다.
        const containerRect = DOM.editor.container.getBoundingClientRect();
        const laneWidth = containerRect.width / CONFIG.EDITOR_LANE_IDS.length;
        
        // X 좌표는 container의 왼쪽 경계를 기준으로 계산합니다.
        const x = e.clientX - containerRect.left;
        const laneIndex = Math.floor(x / laneWidth);
        const laneId = CONFIG.EDITOR_LANE_IDS[laneIndex];
    
        // Y 좌표는 container의 위쪽 경계와 현재 스크롤 위치를 함께 고려하여 계산합니다.
        const y = e.clientY - containerRect.top + DOM.editor.container.scrollTop;
        const beatsPerSecond = this.state.bpm / 60;
        const beat = Math.round(y / CONFIG.EDITOR_BEAT_HEIGHT);
        const timeInMs = Math.round((beat / beatsPerSecond) * 1000);
    
        if (e.target.classList.contains('editor-note')) {
            const time = parseFloat(e.target.dataset.time);
            this.state.notes = this.state.notes.filter(n => n.time !== time);
            this.renderNotes();
            return;
        }
    
        switch (this.state.selectedNoteType) {
            case 'long':
                this.placeLongNote(timeInMs, laneId);
                break;
            case 'tap':
            case 'false':
                this.placeSimpleNote(timeInMs, laneId);
                break;
        }
    },

    placeSimpleNote(time, laneId) {
        if (!this.state.notes.some(n => Math.abs(n.time - time) < 10 && n.lane === laneId)) {
            // [수정] 마디 번호를 계산하여 노트 정보에 포함시킵니다.
            const measure = this._getMeasureFromTime(time);
            this.state.notes.push({ time, lane: laneId, type: this.state.selectedNoteType, measure });
            this.renderNotes();
        }
    },

    placeLongNote(time, laneId) {
        if (!this.state.isPlacingLongNote) {
            this.state.longNoteStart = { time, lane: laneId };
            this.state.isPlacingLongNote = true;
            DOM.editor.statusLabel.textContent = '롱노트의 끝 지점을 지정해주세요.';
        } else {
            if (laneId !== this.state.longNoteStart.lane) {
                UI.showMessage('editor', '시작 지점과 같은 레인을 선택해주세요.');
                return;
            }
            if (time <= this.state.longNoteStart.time) {
                UI.showMessage('editor', '끝 지점은 시작 지점보다 뒤에 있어야 합니다.');
                return;
            }
            const duration = time - this.state.longNoteStart.time;
            // [수정] 마디 번호를 계산하여 노트 정보에 포함시킵니다.
            const measure = this._getMeasureFromTime(this.state.longNoteStart.time);
            this.state.notes.push({ ...this.state.longNoteStart, duration, type: 'long_head', measure });
            this.renderNotes();
            this.resetLongNotePlacement();
            DOM.editor.statusLabel.textContent = '롱노트의 시작 지점을 지정해주세요.';
        }
    },

    renderNotes() {
        DOM.editor.notesContainer.querySelectorAll('.editor-note').forEach(n => n.remove());
        
        // 노트 너비 계산의 기준도 'container'로 통일합니다.
        const containerRect = DOM.editor.container.getBoundingClientRect();
        if (containerRect.width === 0) return;
    
        const laneWidth = containerRect.width / CONFIG.EDITOR_LANE_IDS.length;
        const beatsPerSecond = this.state.bpm / 60;
    
        this.state.notes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = 'editor-note';
            if (note.duration) noteEl.classList.add('long');
            if (note.type === 'false') noteEl.classList.add('false');
    
            const laneIndex = CONFIG.EDITOR_LANE_IDS.indexOf(note.lane);
            if (laneIndex === -1) return;
    
            noteEl.style.width = `${laneWidth}px`;
            noteEl.style.left = `${laneIndex * laneWidth}px`;
            
            const beats = (note.time / 1000) * beatsPerSecond;
            noteEl.style.top = `${beats * CONFIG.EDITOR_BEAT_HEIGHT - 4}px`;
            
            if (note.duration) {
                const durationInBeats = (note.duration / 1000) * beatsPerSecond;
                noteEl.style.height = `${durationInBeats * CONFIG.EDITOR_BEAT_HEIGHT}px`;
            }
            noteEl.dataset.time = note.time;
            noteEl.dataset.lane = note.lane;
            
            DOM.editor.notesContainer.appendChild(noteEl);
        });
    },
    saveChart() {
        if (!this.state.audioFileName) {
            UI.showMessage('editor', '음악 파일을 로딩해주세요!');
            return;
        }
        let chartFilename = DOM.editor.chartFilenameInput.value.trim();
            if (!chartFilename) {
                // 입력값이 없으면 음악 파일 이름에서 확장자를 제거하여 사용합니다.
                chartFilename = this.state.audioFileName.split('.').slice(0, -1).join('.');
            }
        const gameNotes = this.state.notes.map(note => {
            if (note.type === 'long_head') {
                return { time: note.time, lane: note.lane, duration: note.duration };
            }
            // type이 tap일 경우, 용량을 줄이기 위해 type 속성 생략
            if (note.type === 'tap') {
                 return { time: note.time, lane: note.lane };
            }
            return { time: note.time, lane: note.lane, type: note.type };
        }).filter(note => note.type !== 'long_tail');
        
        const chart = {
            songName: this.state.audioFileName,
            bpm: this.state.bpm,
            startTimeOffset: this.state.startTimeOffset,
            notes: gameNotes.sort((a, b) => a.time - b.time),
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chart, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", chartFilename + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    loadChart(chartData) {
        this.resetEditorState();
        
        // BPM을 먼저 설정해야 마디 계산이 정확해집니다.
        this.state.bpm = chartData.bpm || 120;
    
        this.state.notes = chartData.notes.map(note => {
            // [수정] 불러오는 모든 노트에 마디 번호를 계산하여 추가합니다.
            const measure = this._getMeasureFromTime(note.time);
            if (note.duration) {
                return { ...note, type: 'long_head', measure };
            }
            if (!note.type) {
                return { ...note, type: 'tap', measure };
            }
            return { ...note, measure };
        });
        
        // [수정] 불러온 차트의 길이에 맞게 전체 마디 수를 조절합니다.
        let maxMeasure = 0;
        if (this.state.notes.length > 0) {
            maxMeasure = Math.max(...this.state.notes.map(n => n.measure));
        }
        this.state.totalMeasures = maxMeasure + 5; // 작업 편의를 위해 5마디 여유 공간 추가
    
        this.state.startTimeOffset = chartData.startTimeOffset || 0;
        
        DOM.editor.bpmInput.value = this.state.bpm;
        DOM.editor.startTimeInput.value = this.state.startTimeOffset;
        DOM.editor.audioFileNameEl.textContent = `요구 파일: ${chartData.songName || '없음'}`;
        if (loadedFileName) {
            DOM.editor.chartFilenameInput.value = loadedFileName.split('.').slice(0, -1).join('.');
        }
        this.drawTimeline();
        this.renderNotes();
    },

    loop() {
        if (!this.state.isPlaying) return;
    
        let elapsedSeconds;
        const isMusicLoaded = !!DOM.musicPlayer.src;
    
        // [핵심 수정] 음악 유무에 따라 시간 소스를 결정합니다.
        if (isMusicLoaded && !DOM.musicPlayer.paused) {
            // 소스 1: 음악 플레이어의 현재 시간 (가장 정확함)
            elapsedSeconds = DOM.musicPlayer.currentTime;
        } else {
            // 소스 2: performance.now() 기반의 내부 타이머
            const elapsedTimeMs = performance.now() - this.state.playbackStartTime;
            elapsedSeconds = elapsedTimeMs / 1000;
        }
    
        const beatsPerSecond = this.state.bpm / 60;
        const beats = elapsedSeconds * beatsPerSecond;
        const playheadPosition = beats * CONFIG.EDITOR_BEAT_HEIGHT;
        
        DOM.editor.playhead.style.top = `${playheadPosition}px`;
        
        // 플레이헤드가 화면 중앙에 오도록 자동 스크롤
        DOM.editor.container.scrollTop = playheadPosition - DOM.editor.container.clientHeight / 2;
        
        this.state.animationFrameId = requestAnimationFrame(this.loop.bind(this));
    },

    drawGrid() {
        DOM.editor.notesContainer.querySelectorAll('.beat-line').forEach(l => l.remove());
    
        // [핵심 수정] 음악 길이 대신, 수동으로 설정된 마디 수를 기준으로 길이를 계산
        const beatsPerMeasure = 4; // 4/4박자 기준
        const totalBeats = this.state.totalMeasures * beatsPerMeasure;
        
        const timelineHeight = totalBeats * CONFIG.EDITOR_BEAT_HEIGHT;
        
        DOM.editor.timeline.style.height = `${timelineHeight}px`;
        DOM.editor.notesContainer.style.height = `${timelineHeight}px`;
        DOM.editor.gridContainer.style.height = `${timelineHeight}px`;
    
        for (let beatIndex = 0; beatIndex < totalBeats; beatIndex++) {
            const line = document.createElement('div');
            line.className = 'beat-line';
            
            if (beatIndex % beatsPerMeasure === 0) {
                line.classList.add('measure');
            }
            
            line.style.top = `${beatIndex * CONFIG.EDITOR_BEAT_HEIGHT}px`;
            line.style.width = '100%';
            
            DOM.editor.notesContainer.insertBefore(line, DOM.editor.playhead);
        }
    },

    handlePlayPause() {
        // 음악이 없으면 isMusicLoaded는 false가 됩니다.
        const isMusicLoaded = !!DOM.musicPlayer.src;
    
        if (!isMusicLoaded && this.state.notes.length === 0) {
             UI.showMessage('editor', '음악을 불러오거나 노트를 추가해주세요.');
             return;
        }
    
        if (!this.state.isPlaying) { // 정지 또는 일시정지 상태일 때 -> 재생
            // 타이머 시작/재개
            this.state.playbackStartTime = performance.now() - this.state.timeWhenPaused;
            
            if (isMusicLoaded) DOM.musicPlayer.play();
            
            DOM.editor.playBtn.textContent = "일시정지";
            this.state.isPlaying = true;
            this.loop();
    
        } else { // 재생 중일 때 -> 일시정지
            // 타이머 상태 기록
            this.state.timeWhenPaused = performance.now() - this.state.playbackStartTime;
    
            if (isMusicLoaded) DOM.musicPlayer.pause();
    
            DOM.editor.playBtn.textContent = "재생";
            this.state.isPlaying = false;
            cancelAnimationFrame(this.state.animationFrameId);
        }
    },

    stopPlayback() {
        this.state.isPlaying = false;
        cancelAnimationFrame(this.state.animationFrameId);
        
        // 타이머 상태 초기화
        this.state.playbackStartTime = 0;
        this.state.timeWhenPaused = 0;
    
        if (DOM.musicPlayer.src) {
            DOM.musicPlayer.pause();
            DOM.musicPlayer.currentTime = this.state.startTimeOffset;
        }
        
        DOM.editor.playBtn.textContent = "재생";
        
        // 플레이헤드 위치와 스크롤을 시작 지점으로 리셋
        const beatsPerSecond = this.state.bpm / 60;
        const offsetBeats = this.state.startTimeOffset * beatsPerSecond;
        const playheadPosition = offsetBeats * CONFIG.EDITOR_BEAT_HEIGHT;
        DOM.editor.playhead.style.top = `${playheadPosition}px`;
        DOM.editor.container.scrollTop = playheadPosition - DOM.editor.container.clientHeight / 2;
    },

    resetLongNotePlacement(clearMessage = true) {
        this.state.isPlacingLongNote = false;
        this.state.longNoteStart = null;
        if (clearMessage && DOM.editor.statusLabel) {
            DOM.editor.statusLabel.textContent = '';
        }
    },

    updateNoteTypeUI() {
        DOM.editor.noteTypeSelector.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === this.state.selectedNoteType);
        });
    },

    handleNoteTypeSelect(e) {
        if (e.target.tagName !== 'BUTTON') return;
        this.state.selectedNoteType = e.target.dataset.type;
        this.updateNoteTypeUI();
        if (this.state.selectedNoteType === 'long') {
            this.state.isPlacingLongNote = false;
            DOM.editor.statusLabel.textContent = '롱노트의 시작 지점을 지정해주세요.';
        } else {
            this.resetLongNotePlacement();
        }
    }
};
