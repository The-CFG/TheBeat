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
        this.resetEditorState();
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

        DOM.editor.audioFileInput.addEventListener('change', (e) => this.handleAudioLoad(e));
        DOM.editor.startTimeInput.addEventListener('input', (e) => { this.state.startTimeOffset = parseFloat(e.target.value) || 0; });
        DOM.editor.bpmInput.addEventListener('input', (e) => { this.state.bpm = parseInt(e.target.value) || 120; this.drawTimeline(); this.renderNotes(); });
        DOM.editor.noteTypeSelector.addEventListener('click', (e) => this.handleNoteTypeSelect(e));
        DOM.editor.playPauseBtn.addEventListener('click', () => this.togglePlay());
        DOM.editor.saveBtn.addEventListener('click', () => this.saveChart());
        DOM.editor.loadBtn.addEventListener('click', () => DOM.editor.loadInput.click());
        DOM.editor.loadInput.addEventListener('change', (e) => this.handleChartLoad(e));
        DOM.editor.resetBtn.addEventListener('click', () => this.handleReset());
        DOM.editor.timeline.addEventListener('click', (e) => this.handleTimelineClick(e));

        this.listenersInitialized = true;
    },
    
    drawTimeline() {
        const timeline = DOM.editor.timeline;
        while (timeline.firstChild && timeline.firstChild !== DOM.editor.playhead) {
            timeline.removeChild(timeline.firstChild);
        }
        
        CONFIG.EDITOR_LANE_IDS.forEach(() => {
            const laneEl = document.createElement('div');
            laneEl.className = 'editor-lane';
            timeline.appendChild(laneEl);
        });

        timeline.appendChild(DOM.editor.playhead);
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
            DOM.editor.resetBtn.classList.replace('bg-red-700', 'bg-yellow-500');
            DOM.editor.resetBtn.classList.replace('hover:bg-red-600', 'hover:bg-yellow-400');
            setTimeout(() => {
                if(this.state.isConfirmingReset) {
                    this.state.isConfirmingReset = false;
                    DOM.editor.resetBtn.textContent = '재설정';
                    DOM.editor.resetBtn.classList.replace('bg-yellow-500', 'bg-red-700');
                    DOM.editor.resetBtn.classList.replace('hover:bg-yellow-400', 'hover:bg-red-600');
                }
            }, 3000);
        } else {
            this.resetEditorState();
        }
    },

    handleTimelineClick(e) {
        // 클릭된 요소가 레인 또는 노트가 아니면 무시
        if (!e.target.classList.contains('editor-lane') && !e.target.classList.contains('editor-note')) {
            return;
        }

        // 노트 삭제 로직
        if (e.target.classList.contains('editor-note')) {
            const time = parseFloat(e.target.dataset.time);
            this.state.notes = this.state.notes.filter(n => n.time !== time);
            this.renderNotes();
            return;
        }

        // 노트 추가 로직
        const rect = DOM.editor.timeline.getBoundingClientRect();
        const laneWidth = rect.width / CONFIG.EDITOR_LANE_IDS.length;
        const x = e.clientX - rect.left;
        const laneIndex = Math.floor(x / laneWidth);
        const laneId = CONFIG.EDITOR_LANE_IDS[laneIndex];

        const y = e.clientY - rect.top + DOM.editor.container.scrollTop;
        const beatsPerSecond = this.state.bpm / 60;
        const beat = Math.round(y / CONFIG.EDITOR_BEAT_HEIGHT);
        const timeInMs = Math.round((beat / beatsPerSecond) * 1000);

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

    // [핵심 수정된 함수]
    renderNotes() {
        // 기존에 그려진 모든 노트를 삭제
        document.querySelectorAll('.editor-note').forEach(n => n.remove());
        
        // 타임라인에 있는 모든 레인 div를 가져옴
        const lanes = DOM.editor.timeline.querySelectorAll('.editor-lane');
        if (lanes.length === 0) return;

        const beatsPerSecond = this.state.bpm / 60;

        this.state.notes.forEach(note => {
            // 노트가 속한 레인의 인덱스를 찾음 (e.g., 'L4' -> 0)
            const laneIndex = CONFIG.EDITOR_LANE_IDS.indexOf(note.lane);
            if (laneIndex === -1) return;

            // 해당 인덱스의 레인 div를 부모로 지정
            const parentLane = lanes[laneIndex];
            if (!parentLane) return;

            const noteEl = document.createElement('div');
            noteEl.className = 'editor-note';
            if (note.duration) noteEl.classList.add('long');
            if (note.type === 'false') noteEl.classList.add('false');

            // 부모(레인)를 기준으로 위치를 잡으므로 left는 0, width는 100%가 됨
            noteEl.style.width = '100%';
            noteEl.style.left = '0';
            
            const beats = (note.time / 1000) * beatsPerSecond;
            noteEl.style.top = `${beats * CONFIG.EDITOR_BEAT_HEIGHT - 4}px`;
            
            if (note.duration) {
                const durationInBeats = (note.duration / 1000) * beatsPerSecond;
                noteEl.style.height = `${durationInBeats * CONFIG.EDITOR_BEAT_HEIGHT}px`;
            }
            noteEl.dataset.time = note.time;
            noteEl.dataset.lane = note.lane;
            
            // 올바른 레인 div 안에 노트를 추가
            parentLane.appendChild(noteEl);
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
        document.querySelectorAll('.beat-line').forEach(l => l.remove());
        const duration = DOM.musicPlayer.duration || 300;
        const beatsPerSecond = this.state.bpm / 60;
        const totalBeats = duration * beatsPerSecond;
        const timelineHeight = totalBeats * CONFIG.EDITOR_BEAT_HEIGHT;
        
        DOM.editor.timeline.style.height = `${timelineHeight}px`;

        for (let i = 0; i < totalBeats; i++) {
            const line = document.createElement('div');
            line.className = 'beat-line';
            if (i % 4 === 0) line.classList.add('measure');
            line.style.top = `${i * CONFIG.EDITOR_BEAT_HEIGHT}px`;
            DOM.editor.timeline.insertBefore(line, DOM.editor.playhead);
        }
    },

    togglePlay() {
        if (this.state.isPlaying) {
            DOM.musicPlayer.pause();
            DOM.editor.playPauseBtn.textContent = "재생";
            cancelAnimationFrame(this.state.animationFrameId);
        } else {
            if (!DOM.musicPlayer.src) {
                UI.showMessage('editor', '먼저 음악 파일을 선택해주세요.');
                return;
            }
            DOM.musicPlayer.currentTime = this.state.startTimeOffset;
            DOM.musicPlayer.play();
            DOM.editor.playPauseBtn.textContent = "일시정지";
            this.loop();
        }
        this.state.isPlaying = !this.state.isPlaying;
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
