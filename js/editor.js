const Editor = {
    state: {
        notes: [],
        bpm: 120,
        snapDivision: 4,
        history: [],
        startTimeOffset: 0,
        audioFileName: '',
        isPlaying: false,
        animationFrameId: null,
        selectedNoteType: 'tap',
        isPlacingLongNote: false,
        longNoteStart: null,
        isConfirmingReset: false,
        totalMeasures: 100,
        playbackStartTime: 0,
        timeWhenPaused: 0,
    },

    init() {
        try {
            this.state.isPlaying = false;
            this.state.isConfirmingReset = false;
            this.resetLongNotePlacement();
            UI.showScreen('editor');
            this.resetEditorState();
        } catch (err) {
            Debugger.logError(err, 'Editor.init');
        }
    },

    resetEditorState() {
        try {
            this.state.history = [];
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
        } catch (err) {
            Debugger.logError(err, 'Editor.resetEditorState');
        }
    },

    clearNotes() {
        this._saveStateForUndo();
        this.state.notes = [];
        this.renderNotes();
        UI.showMessage('editor', '모든 노트를 삭제했습니다.');
    },

    addMeasure() {
        try {
            this.state.totalMeasures++;
            this.drawGrid();
            this.renderNotes();
        } catch (err) {
            Debugger.logError(err, 'Editor.addMeasure');
        }
    },

    removeMeasure() {
        try {
            if (this.state.totalMeasures > 1) {
                const measureToRemove = this.state.totalMeasures - 1;
                this.state.notes = this.state.notes.filter(note => note.measure !== measureToRemove);
                this.state.totalMeasures--;
                this.drawGrid();
                this.renderNotes();
            }
        } catch (err) {
            Debugger.logError(err, 'Editor.removeMeasure');
        }
    },

    _getMeasureFromTime(timeInMs) {
        const beatsPerMeasure = 4;
        const beatsPerSecond = this.state.bpm / 60;
        const totalBeats = (timeInMs / 1000) * beatsPerSecond;
        return Math.floor(totalBeats / beatsPerMeasure);
    },

    drawTimeline() {
        try {
            const gridContainer = DOM.editor.gridContainer;
            // [핵심 수정] 타임라인 전체가 아닌, 그리드 컨테이너만 비웁니다.
            gridContainer.innerHTML = '';
            
            // [핵심 수정] 시각적 레인을 'gridContainer'에 생성합니다.
            CONFIG.EDITOR_LANE_IDS.forEach((id) => {
                const laneEl = document.createElement('div');
                laneEl.className = 'editor-lane';
                laneEl.dataset.laneId = id;
                gridContainer.appendChild(laneEl);
            });
    
            // 비트라인 그리기를 호출합니다.
            this.drawGrid();
        } catch (err) {
            Debugger.logError(err, 'Editor.drawTimeline');
        }
    },

    drawGrid() {
        try {
            DOM.editor.notesContainer.querySelectorAll('.beat-line').forEach(l => l.remove());

            const adjustedBeatHeight = this._getAdjustedBeatHeight();
            const beatsPerMeasure = 4;
            const totalBeats = this.state.totalMeasures * beatsPerMeasure;
            const timelineHeight = totalBeats * adjustedBeatHeight;
    
            DOM.editor.timeline.style.height = `${timelineHeight}px`;
            DOM.editor.notesContainer.style.height = `${timelineHeight}px`;
            DOM.editor.gridContainer.style.height = `${timelineHeight}px`;
    
            const measureHeight = beatsPerMeasure * adjustedBeatHeight; 
    
            for (let i = 0; i < this.state.totalMeasures; i++) {
                for (let j = 0; j < this.state.snapDivision; j++) {
                    const line = document.createElement('div');
                    line.className = 'beat-line';
    
                    // 마디선 (가장 굵게)
                    if (j === 0) {
                        line.classList.add('measure');
                    }
                    // 4분박자선 (중간 굵기, 기존 선)
                    else if (j % (this.state.snapDivision / 4) === 0) {
                        line.style.backgroundColor = '#6b7280'; // Tailwind gray-500
                    }
                    // 나머지 분할선 (가장 가늘게)
                    else {
                        line.style.backgroundColor = '#4a5568'; // Tailwind gray-600
                    }
    
                    const yPosition = (i * measureHeight) + (j / this.state.snapDivision) * measureHeight;
                    line.style.top = `${yPosition}px`;
                    line.style.width = '100%';
                    DOM.editor.notesContainer.insertBefore(line, DOM.editor.playhead);
                }
            }
        } catch (err) {
            Debugger.logError(err, 'Editor.drawGrid');
        }
    },

    handleAudioLoad(e) {
        try {
            const file = e.target.files[0];
            if (file) {
                DOM.musicPlayer.src = URL.createObjectURL(file);
                this.state.audioFileName = file.name;
                DOM.editor.audioFileNameEl.textContent = file.name;
                DOM.musicPlayer.onloadedmetadata = () => this.drawGrid();
            }
            e.target.value = null;
        } catch (err) {
            Debugger.logError(err, 'Editor.handleAudioLoad');
        }
    },

    handleChartLoad(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const chartData = JSON.parse(event.target.result);
                this.loadChart(chartData, file.name);
            } catch (err) {
                Debugger.logError(err, 'Editor.handleChartLoad');
                UI.showMessage('editor', `잘못된 차트 파일 형식입니다: ${err.message}`);
            }
        };
        reader.readAsText(file);
        e.target.value = null;
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
            this.clearNotes();
            this.state.isConfirmingReset = false;
            DOM.editor.resetBtn.textContent = '재설정';
            DOM.editor.resetBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-400');
            DOM.editor.resetBtn.classList.add('bg-red-700', 'hover:bg-red-600');
        }
    },

    handleTimelineClick(e) {
        try {
            if (this.state.isPlaying) return;
            this._saveStateForUndo();
            if (e.target.classList.contains('editor-note')) {
                const time = parseFloat(e.target.dataset.time);
                const lane = e.target.dataset.lane;
                this.state.notes = this.state.notes.filter(note => note.time !== time || note.lane !== lane);
                this.renderNotes();
                return;
            }
    
            // [핵심 수정] 모든 계산의 기준을 'container'와 'clientWidth'로 통일합니다.
            const container = DOM.editor.container;
            const rect = container.getBoundingClientRect(); // 화면상 위치를 얻기 위해 필요
            const laneWidth = container.clientWidth / CONFIG.EDITOR_LANE_IDS.length; // 스크롤바를 제외한 실제 너비 사용
            
            const x = e.clientX - rect.left;
            const laneIndex = Math.floor(x / laneWidth);
            const laneId = CONFIG.EDITOR_LANE_IDS[laneIndex];
    
            const y = e.clientY - rect.top + container.scrollTop;
            const adjustedBeatHeight = this._getAdjustedBeatHeight();
            const beatsPerSecond = this.state.bpm / 60;
            const snapsPerBeat = this.state.snapDivision / 4;
            const snapHeight = adjustedBeatHeight / snapsPerBeat;
            const snapIndex = Math.round(y / snapHeight);
            const snappedBeat = snapIndex / snapsPerBeat;
            const timeInMs = Math.round((snappedBeat / beatsPerSecond) * 1000);
            
            switch (this.state.selectedNoteType) {
                case 'long': this.placeLongNote(timeInMs, laneId); break;
                case 'tap': case 'false': this.placeSimpleNote(timeInMs, laneId); break;
            }
        } catch (err) {
            Debugger.logError(err, 'Editor.handleTimelineClick');
        }
    },

    handleSnapChange(e) {
        this.state.snapDivision = parseInt(e.target.value) || 4;
        this.drawGrid();
    },

    _getAdjustedBeatHeight() {
        // 기본 높이(20)에 분할 값에 따른 보정치를 곱합니다.
        // 1/4 분할일 때 기본 높이(x1), 1/8일 때 1.5배, 1/16일 때 2배 등으로 점차 늘어납니다.
        const scaleFactor = Math.max(1, this.state.snapDivision / 4);
        return CONFIG.EDITOR_BEAT_HEIGHT * scaleFactor;
    },

    placeSimpleNote(time, laneId) {
        if (!this.state.notes.some(n => Math.abs(n.time - time) < 10 && n.lane === laneId)) {
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
            const measure = this._getMeasureFromTime(this.state.longNoteStart.time);
            this.state.notes.push({ ...this.state.longNoteStart, duration, type: 'long_head', measure });
            this.renderNotes();
            this.resetLongNotePlacement();
            DOM.editor.statusLabel.textContent = '롱노트의 시작 지점을 지정해주세요.';
        }
    },

    renderNotes() {
        try {
            DOM.editor.notesContainer.querySelectorAll('.editor-note').forEach(n => n.remove());
            
            // [핵심 수정] 노트 너비 계산의 기준도 'container.clientWidth'로 통일합니다.
            const container = DOM.editor.container;
            if (container.clientWidth === 0) return;

            const adjustedBeatHeight = this._getAdjustedBeatHeight();
            const laneWidth = container.clientWidth / CONFIG.EDITOR_LANE_IDS.length; // 스크롤바를 제외한 실제 너비 사용
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
                noteEl.style.top = `${beats * adjustedBeatHeight - 4}px`;
                if (note.duration) {
                    const durationInBeats = (note.duration / 1000) * beatsPerSecond;
                    noteEl.style.height = `${durationInBeats * adjustedBeatHeight}px`;
                }
                noteEl.dataset.time = note.time;
                noteEl.dataset.lane = note.lane;
                DOM.editor.notesContainer.appendChild(noteEl);
            });
        } catch (err) {
            Debugger.logError(err, 'Editor.renderNotes');
        }
    },

    saveChart() {
        try {
            if (!this.state.audioFileName) {
                UI.showMessage('editor', '음악 파일을 로딩해주세요!');
                return;
            }
            let chartFilename = DOM.editor.chartFilenameInput.value.trim();
            if (!chartFilename) {
                chartFilename = this.state.audioFileName.split('.').slice(0, -1).join('.');
            }
            const gameNotes = this.state.notes.map(note => {
                if (note.type === 'long_head') return { time: note.time, lane: note.lane, duration: note.duration };
                if (note.type === 'tap') return { time: note.time, lane: note.lane };
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
        } catch (err) {
            Debugger.logError(err, 'Editor.saveChart');
            UI.showMessage('editor', `저장 실패: ${err.message}`);
        }
    },

    loadChart(chartData, loadedFileName) {
        try {
            this.resetEditorState();
            this.state.history = [];
            this.state.bpm = chartData.bpm || 120;
            this.state.notes = chartData.notes.map(note => {
                const measure = this._getMeasureFromTime(note.time);
                let newNote = { ...note, measure };
                if (note.duration) newNote.type = 'long_head';
                else if (note.type === 'false') newNote.type = 'false';
                else newNote.type = 'tap';
                return newNote;
            });
            let maxMeasure = 0;
            if (this.state.notes.length > 0) {
                maxMeasure = Math.max(...this.state.notes.map(n => n.measure));
            }
            this.state.totalMeasures = maxMeasure + 5;
            this.state.startTimeOffset = chartData.startTimeOffset || 0;
            DOM.editor.bpmInput.value = this.state.bpm;
            DOM.editor.startTimeInput.value = this.state.startTimeOffset;
            DOM.editor.audioFileNameEl.textContent = `요구 파일: ${chartData.songName || '없음'}`;
            if (loadedFileName) {
                DOM.editor.chartFilenameInput.value = loadedFileName.split('.').slice(0, -1).join('.');
            }
            this.drawTimeline();
            this.renderNotes();
        } catch (err) {
            Debugger.logError(err, 'Editor.loadChart');
            UI.showMessage('editor', `차트 해석 오류: ${err.message}`);
        }
    },

    async handlePlayPause() {
        try {
            const isMusicLoaded = !!DOM.musicPlayer.src;
            if (!isMusicLoaded && this.state.notes.length === 0) {
                UI.showMessage('editor', '음악을 불러오거나 노트를 추가해주세요.');
                return;
            }
    
            if (!this.state.isPlaying) { // 정지 또는 일시정지 상태일 때 -> 재생
                this.state.playbackStartTime = performance.now() - this.state.timeWhenPaused;
                
                if (isMusicLoaded) {
                    await DOM.musicPlayer.play();
                }
                
                DOM.editor.playBtn.textContent = "일시정지";
                this.state.isPlaying = true;
    
                // [핵심 수정] 시각적 루프를 다음 이벤트 틱에서 시작하여 오디오 엔진이 준비될 시간을 줍니다.
                setTimeout(() => {
                    // 사용자가 그 짧은 순간에 다시 일시정지를 눌렀을 경우를 대비한 안전장치
                    if (this.state.isPlaying) {
                        this.loop();
                    }
                }, 0);
    
            } else { // 재생 중일 때 -> 일시정지
                this.state.timeWhenPaused = performance.now() - this.state.playbackStartTime;
                if (isMusicLoaded) {
                    DOM.musicPlayer.pause();
                }
                DOM.editor.playBtn.textContent = "재생";
                this.state.isPlaying = false;
                cancelAnimationFrame(this.state.animationFrameId);
            }
        } catch (err) {
            Debugger.logError(err, 'Editor.handlePlayPause');
            UI.showMessage('editor', '음악을 재생할 수 없습니다.');
        }
    },

    stopPlayback() {
        try {
            this.state.isPlaying = false;
            cancelAnimationFrame(this.state.animationFrameId);
            this.state.playbackStartTime = 0;
            this.state.timeWhenPaused = 0;
            if (DOM.musicPlayer.src) {
                DOM.musicPlayer.pause();
                DOM.musicPlayer.currentTime = this.state.startTimeOffset;
            }
            DOM.editor.playBtn.textContent = "재생";
            const adjustedBeatHeight = this._getAdjustedBeatHeight();
            const beatsPerSecond = this.state.bpm / 60;
            const offsetBeats = this.state.startTimeOffset * beatsPerSecond;
            const playheadPosition = offsetBeats * adjustedBeatHeight;
            DOM.editor.playhead.style.top = `${playheadPosition}px`;
            DOM.editor.container.scrollTop = playheadPosition - DOM.editor.container.clientHeight / 2;
        } catch (err) {
            Debugger.logError(err, 'Editor.stopPlayback');
        }
    },

    loop() {
        try {
            if (!this.state.isPlaying) return;
            let elapsedSeconds;
            const isMusicLoaded = !!DOM.musicPlayer.src;
            if (isMusicLoaded && !DOM.musicPlayer.paused) {
                elapsedSeconds = DOM.musicPlayer.currentTime;
            } else {
                const elapsedTimeMs = performance.now() - this.state.playbackStartTime;
                elapsedSeconds = elapsedTimeMs / 1000;
            }
            const adjustedBeatHeight = this._getAdjustedBeatHeight();
            const beatsPerSecond = this.state.bpm / 60;
            // startTimeOffset을 빼는 것이 아니라, 오디오가 없을 때의 타이머에 오프셋을 더해주는 방식으로 변경
            const beats = ((isMusicLoaded ? elapsedSeconds : this.state.startTimeOffset + elapsedSeconds)) * beatsPerSecond;
            const playheadPosition = beats * adjustedBeatHeight;
            DOM.editor.playhead.style.top = `${playheadPosition}px`;
            DOM.editor.container.scrollTop = playheadPosition - DOM.editor.container.clientHeight / 2;
            this.state.animationFrameId = requestAnimationFrame(this.loop.bind(this));
        } catch (err) {
            Debugger.logError(err, 'Editor.loop');
            this.stopPlayback(); // 루프에서 에러 발생 시 재생 중지
        }
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
    },

    _saveStateForUndo() {
        this.state.history.push(JSON.parse(JSON.stringify(this.state.notes)));
        if (this.state.history.length > CONFIG.EDITOR_UNDO_HISTORY_LIMIT) {
            this.state.history.shift(); // 가장 오래된 기록 제거
        }
    },
    
    // 노트 타입 변경 단축키를 위한 함수
    setSelectedNoteType(type) {
        this.state.selectedNoteType = type;
        this.updateNoteTypeUI();
        if (type === 'long') {
            this.state.isPlacingLongNote = false;
            DOM.editor.statusLabel.textContent = '롱노트의 시작 지점을 지정해주세요.';
        } else {
            this.resetLongNotePlacement();
        }
    },
    
    // 재생 헤드 위치에 노트를 배치하는 함수
    placeNoteAtPlayhead(laneId) {
        if (!laneId) return;
    
        // 1. 재생 헤드의 현재 y 좌표 가져오기
        const playheadTop = parseFloat(DOM.editor.playhead.style.top) || 0;
    
        // 2. y 좌표를 시간(ms)으로 변환 (handleTimelineClick 로직 재사용)
        const adjustedBeatHeight = this._getAdjustedBeatHeight();
        const beatsPerSecond = this.state.bpm / 60;
        const snapsPerBeat = this.state.snapDivision / 4;
        const snapHeight = adjustedBeatHeight / snapsPerBeat;
        const snapIndex = Math.round(playheadTop / snapHeight);
        const snappedBeat = snapIndex / snapsPerBeat;
        const timeInMs = Math.round((snappedBeat / beatsPerSecond) * 1000);
    
        // 3. 노트 배치
        this._saveStateForUndo();
        this.placeSimpleNote(timeInMs, laneId);
    },
    
    // 실행 취소 함수
    handleUndo() {
        if (this.state.history.length > 0) {
            const previousNotes = this.state.history.pop();
            this.state.notes = previousNotes;
            this.renderNotes();
        }
    },
    
    // 모든 에디터 키 입력을 처리할 메인 핸들러
    handleEditorKeyPress(e) {
        // 텍스트 입력 필드에 포커스가 있을 때는 단축키를 무시
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            return;
        }
    
        // Ctrl + Z (실행 취소)
        if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            this.handleUndo();
            return;
        }
    
        // 단축키가 Ctrl, Alt 등과 함께 눌렸을 경우 무시 (Undo 제외)
        if (e.ctrlKey || e.altKey || e.metaKey) return;
    
        // 노트 타입 변경 (1, 2, 3)
        switch (e.key) {
            case '1':
                e.preventDefault();
                this.setSelectedNoteType('tap');
                return;
            case '2':
                e.preventDefault();
                this.setSelectedNoteType('long');
                return;
            case '3':
                e.preventDefault();
                this.setSelectedNoteType('false');
                return;
        }
    
        // 노트 배치 (Q, W, E, ...)
        const laneId = CONFIG.EDITOR_KEY_LANE_MAP[e.code];
        if (laneId) {
            e.preventDefault();
            this.placeNoteAtPlayhead(laneId);
        }
    }
};
