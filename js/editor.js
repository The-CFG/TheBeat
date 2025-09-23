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
        
        DOM.musicPlayer.pause();
        DOM.musicPlayer.src = '';

        DOM.editor.bpmInput.value = this.state.bpm;
        DOM.editor.startTimeInput.value = this.state.startTimeOffset;
        DOM.editor.audioFileNameEl.textContent = '선택된 파일 없음';
        DOM.editor.resetBtn.textContent = '재설정';
        DOM.editor.resetBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-400');
        DOM.editor.resetBtn.classList.add('bg-red-700', 'hover:bg-red-600');
        this.state.isConfirmingReset = false;

        this.updateNoteTypeUI();
        this.drawTimeline();
        this.renderNotes();
    },

    setupEventListeners() {
        if (this.listenersInitialized) return;
    
        // 상단 컨트롤
        DOM.editor.audioFileInput.addEventListener('change', (e) => this.handleAudioLoad(e));
        DOM.editor.startTimeInput.addEventListener('input', (e) => { this.state.startTimeOffset = parseFloat(e.target.value) || 0; });
        DOM.editor.bpmInput.addEventListener('input', (e) => { this.state.bpm = parseInt(e.target.value) || 120; this.drawTimeline(); this.renderNotes(); });
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
    },

    handleChartLoad(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const chartData = JSON.parse(event.target.result);
                this.loadChart(chartData);
            } catch (error) { UI.showMessage('editor', '잘못된 차트 파일 형식입니다.'); }
        };
        reader.readAsText(file);
    },

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
            this.resetEditorState();
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
            this.state.notes.push({ time, lane: laneId, type: this.state.selectedNoteType });
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
            this.state.notes.push({ ...this.state.longNoteStart, duration, type: 'long_head' });
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
        downloadAnchorNode.setAttribute("download", this.state.audioFileName.split('.').slice(0, -1).join('.') + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    loadChart(chartData) {
        this.resetEditorState();
        this.state.notes = chartData.notes.map(note => {
            if (note.duration) {
                return { ...note, type: 'long_head' };
            }
             // type 속성이 없는 노트는 tap으로 간주
            if (!note.type) {
                return { ...note, type: 'tap' };
            }
            return note;
        });
        this.state.bpm = chartData.bpm || 120;
        this.state.startTimeOffset = chartData.startTimeOffset || 0;
        
        DOM.editor.bpmInput.value = this.state.bpm;
        DOM.editor.startTimeInput.value = this.state.startTimeOffset;
        DOM.editor.audioFileNameEl.textContent = `요구 파일: ${chartData.songName || '없음'}`;
        
        this.drawTimeline();
        this.renderNotes();
    },

    loop() {
        if (!this.state.isPlaying) return;
        const beatsPerSecond = this.state.bpm / 60;
        const beats = (DOM.musicPlayer.currentTime - this.state.startTimeOffset) * beatsPerSecond;
        const playheadPosition = beats * CONFIG.EDITOR_BEAT_HEIGHT;
        DOM.editor.playhead.style.top = `${playheadPosition}px`;
        DOM.editor.container.scrollTop = playheadPosition - DOM.editor.container.clientHeight / 2;
        this.state.animationFrameId = requestAnimationFrame(this.loop.bind(this));
    },

    drawGrid() {
        DOM.editor.notesContainer.querySelectorAll('.beat-line').forEach(l => l.remove());
    
        const duration = DOM.musicPlayer.duration || 300;
        const beatsPerSecond = this.state.bpm / 60;
        const totalBeats = duration * beatsPerSecond;
        const timelineHeight = totalBeats * CONFIG.EDITOR_BEAT_HEIGHT;
        
        // 전체 타임라인과 노트/그리드 컨테이너 모두에 높이를 설정하여 일관성을 유지합니다.
        DOM.editor.timeline.style.height = `${timelineHeight}px`;
        DOM.editor.notesContainer.style.height = `${timelineHeight}px`;
        DOM.editor.gridContainer.style.height = `${timelineHeight}px`;
    
        for (let i = 0; i < totalBeats; i++) {
            const line = document.createElement('div');
            line.className = 'beat-line';
            if (i % 4 === 0) line.classList.add('measure');
            line.style.top = `${i * CONFIG.EDITOR_BEAT_HEIGHT}px`;
            line.style.width = '100%';
            
            DOM.editor.notesContainer.appendChild(line);
        }
    },

    handlePlayPause() {
        if (!DOM.musicPlayer.src) {
            UI.showMessage('editor', '먼저 음악 파일을 선택해주세요.');
            return;
        }
    
        if (DOM.musicPlayer.paused) { // 정지 또는 일시정지 상태일 때 -> 재생
            DOM.musicPlayer.play();
            DOM.editor.playBtn.textContent = "일시정지";
            this.state.isPlaying = true;
            this.loop();
        } else { // 재생 중일 때 -> 일시정지
            DOM.musicPlayer.pause();
            DOM.editor.playBtn.textContent = "재생";
            this.state.isPlaying = false;
            cancelAnimationFrame(this.state.animationFrameId);
        }
    },

    stopPlayback() {
        this.state.isPlaying = false;
        cancelAnimationFrame(this.state.animationFrameId);
        
        DOM.musicPlayer.pause();
        DOM.musicPlayer.currentTime = this.state.startTimeOffset;
        
        DOM.editor.playBtn.textContent = "재생";
        
        // 플레이헤드 위치와 스크롤을 시작 지점으로 리셋
        const playheadPosition = 0;
        DOM.editor.playhead.style.top = `${playheadPosition}px`;
        DOM.editor.container.scrollTop = playheadPosition;
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
