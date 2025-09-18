const Editor = {
    state: {
        notes: [],
        bpm: 120,
        lanes: 4,
        audioFileName: '',
        isPlaying: false,
        animationFrameId: null,
    },
    init() {
        this.state.isPlaying = false;
        this.state.notes = [];
        DOM.musicPlayer.pause();
        DOM.musicPlayer.src = '';
        UI.showScreen('editor');
        this.drawGrid();
        this.renderNotes();
    },
    loop() {
        const self = Editor;
        if (!self.state.isPlaying) return;
        const beatsPerSecond = self.state.bpm / 60;
        const beats = DOM.musicPlayer.currentTime * beatsPerSecond;
        const playheadPosition = beats * CONFIG.EDITOR_BEAT_HEIGHT;
        DOM.editor.playhead.style.top = `${playheadPosition}px`;
        DOM.editor.container.scrollTop = playheadPosition - DOM.editor.container.clientHeight / 2;
        self.state.animationFrameId = requestAnimationFrame(self.loop);
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
    renderNotes() {
        DOM.editor.timeline.querySelectorAll('.editor-note').forEach(n => n.remove());
        const laneWidth = 100 / this.state.lanes;
        const beatsPerSecond = this.state.bpm / 60;
        this.state.notes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = 'editor-note';
            noteEl.style.width = `${laneWidth}%`;
            noteEl.style.left = `${note.lane * laneWidth}%`;
            const timeInSeconds = note.time / 1000;
            const beats = timeInSeconds * beatsPerSecond;
            noteEl.style.top = `${beats * CONFIG.EDITOR_BEAT_HEIGHT - 4}px`;
            noteEl.dataset.time = note.time;
            noteEl.dataset.lane = note.lane;
            DOM.editor.timeline.insertBefore(noteEl, DOM.editor.playhead);
        });
    },
    loadChart(chartData) {
        this.state.notes = chartData.notes || [];
        this.state.bpm = chartData.bpm || 120;
        this.state.lanes = chartData.lanes || 4;
        DOM.editor.bpmInput.value = this.state.bpm;
        document.querySelectorAll('#editor-lanes-selector button').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.lanes) === this.state.lanes);
        });
        DOM.musicPlayer.src = '';
        this.state.audioFileName = '';
        DOM.editor.audioFileNameEl.textContent = `"${chartData.songName || 'Unknown'}" 음악 파일을 선택해주세요.`;
        this.drawGrid();
        this.renderNotes();
    },
    handleTimelineClick(e) {
        if (e.target.classList.contains('editor-note')) {
            const time = parseFloat(e.target.dataset.time);
            const lane = parseInt(e.target.dataset.lane);
            this.state.notes = this.state.notes.filter(n => !(n.time === time && n.lane === lane));
            this.renderNotes();
            return;
        }
        const rect = DOM.editor.container.getBoundingClientRect();
        const y = e.clientY - rect.top + DOM.editor.container.scrollTop;
        const x = e.clientX - rect.left;
        const lane = Math.floor(x / (rect.width / this.state.lanes));
        const beatsPerSecond = this.state.bpm / 60;
        const beat = Math.round(y / CONFIG.EDITOR_BEAT_HEIGHT);
        const timeInSeconds = beat / beatsPerSecond;
        const timeInMs = Math.round(timeInSeconds * 1000);
        if (!this.state.notes.some(n => Math.abs(n.time - timeInMs) < 10 && n.lane === lane)) {
            this.state.notes.push({ time: timeInMs, lane: lane });
            this.renderNotes();
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
            DOM.musicPlayer.play();
            DOM.editor.playPauseBtn.textContent = "일시정지";
            this.loop();
        }
        this.state.isPlaying = !this.state.isPlaying;
    },
    saveChart() {
        const songName = this.state.audioFileName ? this.state.audioFileName.split('.')[0] : 'chart';
        const chart = {
            songName: songName,
            bpm: this.state.bpm,
            lanes: this.state.lanes,
            notes: this.state.notes.sort((a, b) => a.time - b.time),
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