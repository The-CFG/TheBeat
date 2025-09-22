const Editor = {
    state: {
        notes: [],
        bpm: 120,
        lanes: 4,
        audioFileName: '',
        isPlaying: false,
        animationFrameId: null,
        // 노트 배치 관련 상태
        selectedNoteType: 'tap',
        isPlacingLongNote: false,
        longNoteStart: null,
    },

    init() {
        // 상태 초기화
        this.state.isPlaying = false;
        this.state.notes = [];
        this.state.selectedNoteType = 'tap';
        this.resetLongNotePlacement();

        DOM.musicPlayer.pause();
        DOM.musicPlayer.src = '';
        
        UI.showScreen('editor');
        this.setupEventListeners();
        this.updateNoteTypeUI();
        this.drawGrid();
        this.renderNotes();
    },

    setupEventListeners() {
        // 이벤트 리스너가 중복으로 등록되는 것을 방지
        if (this.listenersInitialized) return;

        // 노트 타입 선택 버튼
        DOM.editor.noteTypeSelector.addEventListener('click', (e) => this.handleNoteTypeSelect(e));
        
        // 타임라인 클릭 (노트 추가/삭제)
        DOM.editor.timeline.addEventListener('click', (e) => this.handleTimelineClick(e));
        
        // 음악 파일 불러오기
        DOM.editor.audioFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                DOM.musicPlayer.src = URL.createObjectURL(file);
                this.state.audioFileName = file.name;
                DOM.editor.audioFileNameEl.textContent = file.name;
                DOM.musicPlayer.onloadedmetadata = () => this.drawGrid();
            }
        });
        
        // BPM 변경
        DOM.editor.bpmInput.addEventListener('input', (e) => {
            this.state.bpm = parseInt(e.target.value) || 120;
            this.drawGrid();
            this.renderNotes();
        });

        // 레인 수 변경
        DOM.editor.lanesSelector.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') return;
            this.state.lanes = parseInt(e.target.dataset.lanes);
            DOM.editor.lanesSelector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            this.renderNotes();
        });

        // 하단 제어 버튼
        DOM.editor.playPauseBtn.addEventListener('click', () => this.togglePlay());
        DOM.editor.saveBtn.addEventListener('click', () => this.saveChart());
        DOM.editor.loadBtn.addEventListener('click', () => DOM.editor.loadInput.click());
        DOM.editor.loadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const chartData = JSON.parse(event.target.result);
                    this.loadChart(chartData);
                } catch (error) {
                    UI.showMessage('editor', '잘못된 차트 파일 형식입니다.');
                }
            };
            reader.readAsText(file);
        });

        this.listenersInitialized = true;
    },
    
    resetLongNotePlacement(clearMessage = true) {
        this.state.isPlacingLongNote = false;
        this.state.longNoteStart = null;
        if (clearMessage) {
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
    },

    renderNotes() {
        DOM.editor.timeline.querySelectorAll('.editor-note').forEach(n => n.remove());
        const laneWidth = 100 / this.state.lanes;
        const beatsPerSecond = this.state.bpm / 60;

        this.state.notes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = 'editor-note';
            
            if (note.duration) noteEl.classList.add('long');
            if (note.type === 'false') noteEl.classList.add('false');

            noteEl.style.width = `${laneWidth}%`;
            noteEl.style.left = `${note.lane * laneWidth}%`;
            
            const timeInSeconds = note.time / 1000;
            const beats = timeInSeconds * beatsPerSecond;
            noteEl.style.top = `${beats * CONFIG.EDITOR_BEAT_HEIGHT - 4}px`;
            
            if (note.duration) {
                const durationInSeconds = note.duration / 1000;
                const durationInBeats = durationInSeconds * beatsPerSecond;
                noteEl.style.height = `${durationInBeats * CONFIG.EDITOR_BEAT_HEIGHT}px`;
            }

            noteEl.dataset.time = note.time;
            noteEl.dataset.lane = note.lane;
            DOM.editor.timeline.insertBefore(noteEl, DOM.editor.playhead);
        });
    },

    handleTimelineClick(e) {
        const rect = DOM.editor.container.getBoundingClientRect();
        const y = e.clientY - rect.top + DOM.editor.container.scrollTop;
        const x = e.clientX - rect.left;
        const lane = Math.floor(x / (rect.width / this.state.lanes));
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
                this.placeLongNote(timeInMs, lane);
                break;
            case 'tap':
            case 'false':
                this.placeSimpleNote(timeInMs, lane);
                break;
        }
    },

    placeSimpleNote(time, lane) {
        if (!this.state.notes.some(n => Math.abs(n.time - time) < 10 && n.lane === lane)) {
            this.state.notes.push({ time: time, lane: lane, type: this.state.selectedNoteType });
            this.renderNotes();
        }
    },

    placeLongNote(time, lane) {
        if (!this.state.isPlacingLongNote) {
            this.state.longNoteStart = { time, lane };
            this.state.isPlacingLongNote = true;
            DOM.editor.statusLabel.textContent = '롱노트의 끝 지점을 지정해주세요.';
        } else {
            if (lane !== this.state.longNoteStart.lane) {
                UI.showMessage('editor', '시작 지점과 같은 레인을 선택해주세요.');
                return;
            }
            if (time <= this.state.longNoteStart.time) {
                UI.showMessage('editor', '끝 지점은 시작 지점보다 뒤에 있어야 합니다.');
                return;
            }

            const duration = time - this.state.longNoteStart.time;
            this.state.notes.push({
                time: this.state.longNoteStart.time,
                lane: this.state.longNoteStart.lane,
                duration: duration,
                type: 'long_head'
            });

            this.renderNotes();
            this.resetLongNotePlacement();
            DOM.editor.statusLabel.textContent = '롱노트의 시작 지점을 지정해주세요.';
        }
    },

    loop() {
        if (!this.state.isPlaying) return;
        const beatsPerSecond = this.state.bpm / 60;
        const beats = DOM.musicPlayer.currentTime * beatsPerSecond;
        const playheadPosition = beats * CONFIG.EDITOR_BEAT_HEIGHT;
        DOM.editor.playhead.style.top = `${playheadPosition}px`;
        DOM.editor.container.scrollTop = playheadPosition - DOM.editor.container.clientHeight / 2;
        this.state.animationFrameId = requestAnimationFrame(this.loop.bind(this));
    },

    drawGrid() {
        while (DOM.editor.timeline.firstChild && DOM.editor.timeline.firstChild !== DOM.editor.playhead) {
            DOM.editor.timeline.removeChild(DOM.editor.timeline.firstChild);
        }
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

    loadChart(chartData) {
        this.state.notes = chartData.notes || [];
        this.state.bpm = chartData.bpm || 120;
        this.state.lanes = chartData.lanes || 4;
        DOM.editor.bpmInput.value = this.state.bpm;
        DOM.editor.lanesSelector.querySelectorAll('button').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.lanes) === this.state.lanes);
        });
        DOM.musicPlayer.src = '';
        this.state.audioFileName = '';
        DOM.editor.audioFileNameEl.textContent = `\"${chartData.songName || 'Unknown'}\" 음악 파일을 선택해주세요.`;
        this.drawGrid();
        this.renderNotes();
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
            DOM.musicPlayer.play();
            DOM.editor.playPauseBtn.textContent = "일시정지";
            this.loop();
        }
        this.state.isPlaying = !this.state.isPlaying;
    },

    saveChart() {
        const songName = this.state.audioFileName ? this.state.audioFileName.split('.')[0] : 'chart';
        
        // 게임 엔진 호환성을 위해 에디터 노트를 변환
        const gameNotes = this.state.notes.map(note => {
            if (note.type === 'long_head') {
                return { time: note.time, lane: note.lane, duration: note.duration };
            }
            return { time: note.time, lane: note.lane, type: note.type };
        }).filter(note => note.type !== 'long_tail'); // 혹시 모를 찌꺼기 데이터 제거
        
        const chart = {
            songName: songName,
            bpm: this.state.bpm,
            lanes: this.state.lanes,
            notes: gameNotes.sort((a, b) => a.time - b.time),
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chart, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", songName + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
};
