const Editor = {
    state: {
        notes: [],
        bpm: 120,
        snapDivision: 4,
        history: [],
        isDirty: false,
        startTimeOffset: 0,
        audioFileName: '',
        isPlaying: false,
        animationFrameId: null,
        selectedNoteType: 'tap',
        isPlacingLongNote: false,
        longNoteStart: null,
    },

    init() {
        try {
            this.state.isPlaying = false;
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
            this.state.snapDivision = 4;
            this.state.startTimeOffset = 0;
            this.state.audioFileName = '';
            this.state.selectedNoteType = 'tap';
            this.state.totalMeasures = 100;

            DOM.musicPlayer.pause();
            DOM.musicPlayer.src = '';
            DOM.editor.bpmInput.value = this.state.bpm;
            DOM.editor.snapSelector.value = this.state.snapDivision;
            DOM.editor.startTimeInput.value = this.state.startTimeOffset;
            DOM.editor.audioFileNameEl.textContent = '선택된 파일 없음';
            DOM.editor.chartFilenameInput.value = '';

            this.updateNoteTypeUI();
            this.drawTimeline();
            this.renderNotes();
            this.setDirty(false);
        } catch (err) {
            Debugger.logError(err, 'Editor.resetEditorState');
        }
    },

    _getAdjustedBeatHeight() {
        const scaleFactor = Math.max(1, this.state.snapDivision / 4);
        return CONFIG.EDITOR_BEAT_HEIGHT * scaleFactor;
    },

    _updateDirtyIndicator() {
        DOM.editor.dirtyIndicator.textContent = this.state.isDirty ? '*' : '';
    },

    setDirty(isDirty) {
        if (this.state.isDirty === isDirty) return;
        this.state.isDirty = isDirty;
        this._updateDirtyIndicator();
    },

    _confirmDiscardChanges(message = '저장하지 않은 변경사항이 있습니다. 정말로 나가시겠습니까?') {
        if (!this.state.isDirty) {
            return true;
        }
        return confirm(message);
    },

    _saveStateForUndo() {
        this.state.history.push(JSON.parse(JSON.stringify(this.state.notes)));
        if (this.state.history.length > CONFIG.EDITOR_UNDO_HISTORY_LIMIT) {
            this.state.history.shift();
        }
    },

    clearNotes() {
        this._saveStateForUndo();
        this.setDirty(true);
        this.state.notes = [];
        this.renderNotes();
        UI.showMessage('editor', '모든 노트를 삭제했습니다.');
    },

    addMeasure() {
        try {
            this._saveStateForUndo();
            this.setDirty(true);
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
                this._saveStateForUndo();
                this.setDirty(true);
                const measureToRemove = this.state.totalMeasures - 1;
                this.state.notes = this.state.notes.filter(note => this._getMeasureFromTime(note.time) !== measureToRemove);
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
            gridContainer.innerHTML = '';

            CONFIG.EDITOR_LANE_IDS.forEach((id) => {
                const laneEl = document.createElement('div');
                laneEl.className = 'editor-lane';
                laneEl.dataset.laneId = id;
                gridContainer.appendChild(laneEl);
            });

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
                    if (j === 0) {
                        line.classList.add('measure');
                    } else if (j % (this.state.snapDivision / 4) === 0) {
                        line.style.backgroundColor = '#6b7280';
                    } else {
                        line.style.backgroundColor = '#4a5568';
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
                this.setDirty(true);
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
        // 실제 로직은 js/main.js의 이벤트 리스너에서 처리
    },

    handleReset() {
        const confirmMessage = this.state.isDirty
            ? '저장하지 않은 변경사항이 있습니다. 모든 노트를 삭제하고 재설정하시겠습니까?'
            : '모든 노트를 삭제합니다. 정말로 재설정하시겠습니까?';

        if (confirm(confirmMessage)) {
            this._saveStateForUndo();
            this.state.notes = [];
            this.renderNotes();
            UI.showMessage('editor', '모든 노트를 삭제했습니다.');
            this.setDirty(true);
        }
    },

    handleTimelineClick(e) {
        try {
            if (this.state.isPlaying) return;
            this.setDirty(true);
            this._saveStateForUndo();

            if (e.target.classList.contains('editor-note')) {
                const time = parseFloat(e.target.dataset.time);
                const lane = e.target.dataset.lane;
                this.state.notes = this.state.notes.filter(note => note.time !== time || note.lane !== lane);
                this.renderNotes();
                return;
            }

            const container = DOM.editor.container;
            const rect = container.getBoundingClientRect();
            const laneWidth = container.clientWidth / CONFIG.EDITOR_LANE_IDS.length;
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
            const container = DOM.editor.container;
            if (container.clientWidth === 0) return;
            const adjustedBeatHeight = this._getAdjustedBeatHeight();
            const laneWidth = container.clientWidth / CONFIG.EDITOR_LANE_IDS.length;
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
            this.setDirty(false);
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
            this.setDirty(false);
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

            if (!this.state.isPlaying) {
                this.state.playbackStartTime = performance.now() - this.state.timeWhenPaused;
                if (isMusicLoaded) await DOM.musicPlayer.play();
                DOM.editor.playBtn.textContent = "일시정지";
                this.state.isPlaying = true;
                setTimeout(() => { if (this.state.isPlaying) this.loop(); }, 0);
            } else {
                this.state.timeWhenPaused = performance.now() - this.state.playbackStartTime;
                if (isMusicLoaded) DOM.musicPlayer.pause();
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
            const beats = ((isMusicLoaded ? elapsedSeconds : this.state.startTimeOffset + elapsedSeconds)) * beatsPerSecond;
            const playheadPosition = beats * adjustedBeatHeight;
            DOM.editor.playhead.style.top = `${playheadPosition}px`;
            DOM.editor.container.scrollTop = playheadPosition - DOM.editor.container.clientHeight / 2;
            this.state.animationFrameId = requestAnimationFrame(this.loop.bind(this));
        } catch (err) {
            Debugger.logError(err, 'Editor.loop');
            this.stopPlayback();
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
        this.setSelectedNoteType(e.target.dataset.type);
    },

    handleSnapChange(e) {
        this.setDirty(true);
        this.state.snapDivision = parseInt(e.target.value) || 4;
        this.drawGrid();
        this.renderNotes();
    },

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

    placeNoteAtPlayhead(laneId) {
        if (!laneId) return;
        this.setDirty(true);
        this._saveStateForUndo();
        const playheadTop = parseFloat(DOM.editor.playhead.style.top) || 0;
        const adjustedBeatHeight = this._getAdjustedBeatHeight();
        const beatsPerSecond = this.state.bpm / 60;
        const snapsPerBeat = this.state.snapDivision / 4;
        const snapHeight = adjustedBeatHeight / snapsPerBeat;
        const snapIndex = Math.round(playheadTop / snapHeight);
        const snappedBeat = snapIndex / snapsPerBeat;
        const timeInMs = Math.round((snappedBeat / beatsPerSecond) * 1000);
        this.placeSimpleNote(timeInMs, laneId);
    },

    handleUndo() {
        if (this.state.history.length > 0) {
            this.setDirty(true);
            const previousNotes = this.state.history.pop();
            this.state.notes = previousNotes;
            this.renderNotes();
        }
    },

    handleEditorKeyPress(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            this.handleUndo();
            return;
        }

        if (e.ctrlKey || e.altKey || e.metaKey) return;

        switch (e.key) {
            case '1': e.preventDefault(); this.setSelectedNoteType('tap'); return;
            case '2': e.preventDefault(); this.setSelectedNoteType('long'); return;
            case '3': e.preventDefault(); this.setSelectedNoteType('false'); return;
        }

        const laneId = CONFIG.EDITOR_KEY_LANE_MAP[e.code];
        if (laneId) {
            e.preventDefault();
            this.placeNoteAtPlayhead(laneId);
        }
    }
};
