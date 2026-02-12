const Appearance = {
    settings: {
        noteShape: 'bar', // 'bar' or 'circle'
        colors: {
            tap: '#63b3ed',
            long: '#a78bfa',
            false: '#fca5a5'
        }
    },

    init() {
        try {
            // 로컬 스토리지에서 설정 불러오기
            this.loadSettings();
            
            // 초기 UI 반영
            this.applySettings();
            this.updatePreview();
            
            // 이벤트 리스너 등록
            this.setupEventListeners();
        } catch (err) {
            Debugger.logError(err, 'Appearance.init');
        }
    },

    setupEventListeners() {
        try {
            // 노트 모양 선택
            const shapeSelector = document.getElementById('note-shape-selector');
            if (shapeSelector) {
                shapeSelector.addEventListener('click', (e) => {
                    if (e.target.tagName === 'BUTTON') {
                        const shape = e.target.dataset.shape;
                        this.settings.noteShape = shape;
                        this.updateShapeUI();
                        this.updatePreview();
                    }
                });
            }

            // 색상 변경
            ['tap', 'long', 'false'].forEach(type => {
                const colorInput = document.getElementById(`color-${type}-note`);
                if (colorInput) {
                    colorInput.addEventListener('input', (e) => {
                        this.settings.colors[type] = e.target.value;
                        this.updatePreview();
                    });
                }
            });

            // 저장 버튼
            const saveBtn = document.getElementById('save-appearance-btn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    this.saveSettings();
                    this.applySettings();
                    UI.showMessage('menu', '모양 설정이 저장되었습니다.');
                });
            }

            // 초기화 버튼
            const resetBtn = document.getElementById('reset-appearance-btn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    if (confirm('모든 모양 설정을 초기화하시겠습니까?')) {
                        this.resetSettings();
                        this.updatePreview();
                        UI.showMessage('menu', '모양 설정이 초기화되었습니다.');
                    }
                });
            }
        } catch (err) {
            Debugger.logError(err, 'Appearance.setupEventListeners');
        }
    },

    updateShapeUI() {
        const buttons = document.querySelectorAll('#note-shape-selector button');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.shape === this.settings.noteShape);
        });
    },

    updatePreview() {
        try {
            const tapPreview = document.getElementById('preview-tap-note');
            const longPreview = document.getElementById('preview-long-note');
            const falsePreview = document.getElementById('preview-false-note');

            if (tapPreview) {
                tapPreview.style.backgroundColor = this.settings.colors.tap;
                tapPreview.className = 'note-preview';
                if (this.settings.noteShape === 'circle') {
                    tapPreview.style.borderRadius = '50%';
                    tapPreview.style.width = '60px';
                    tapPreview.style.height = '60px';
                } else {
                    tapPreview.style.borderRadius = '5px';
                    tapPreview.style.width = '80px';
                    tapPreview.style.height = '25px';
                }
            }

            if (longPreview) {
                longPreview.style.background = `linear-gradient(to top, #818cf8, ${this.settings.colors.long})`;
                longPreview.className = 'note-preview note-preview-long';
                if (this.settings.noteShape === 'circle') {
                    longPreview.style.borderRadius = '50% 50% 0 0';
                    longPreview.style.width = '60px';
                } else {
                    longPreview.style.borderRadius = '5px';
                    longPreview.style.width = '80px';
                }
            }

            if (falsePreview) {
                falsePreview.style.backgroundColor = this.settings.colors.false;
                falsePreview.className = 'note-preview';
                if (this.settings.noteShape === 'circle') {
                    falsePreview.style.borderRadius = '50%';
                    falsePreview.style.width = '60px';
                    falsePreview.style.height = '60px';
                } else {
                    falsePreview.style.borderRadius = '5px';
                    falsePreview.style.width = '80px';
                    falsePreview.style.height = '25px';
                }
            }
        } catch (err) {
            Debugger.logError(err, 'Appearance.updatePreview');
        }
    },

    applySettings() {
        try {
            // CSS 변수로 색상 적용
            document.documentElement.style.setProperty('--note-tap-color', this.settings.colors.tap);
            document.documentElement.style.setProperty('--note-long-color', this.settings.colors.long);
            document.documentElement.style.setProperty('--note-false-color', this.settings.colors.false);

            // 노트 모양 클래스 적용
            if (this.settings.noteShape === 'circle') {
                document.body.classList.add('circle-notes');
            } else {
                document.body.classList.remove('circle-notes');
            }

            // UI 업데이트
            this.updateShapeUI();
            this.updateColorInputs();
        } catch (err) {
            Debugger.logError(err, 'Appearance.applySettings');
        }
    },

    updateColorInputs() {
        try {
            const tapInput = document.getElementById('color-tap-note');
            const longInput = document.getElementById('color-long-note');
            const falseInput = document.getElementById('color-false-note');

            if (tapInput) tapInput.value = this.settings.colors.tap;
            if (longInput) longInput.value = this.settings.colors.long;
            if (falseInput) falseInput.value = this.settings.colors.false;
        } catch (err) {
            Debugger.logError(err, 'Appearance.updateColorInputs');
        }
    },

    saveSettings() {
        try {
            localStorage.setItem('theBeat_appearance', JSON.stringify(this.settings));
        } catch (err) {
            Debugger.logError(err, 'Appearance.saveSettings');
        }
    },

    loadSettings() {
        try {
            const saved = localStorage.getItem('theBeat_appearance');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.settings = { ...this.settings, ...parsed };
            }
        } catch (err) {
            Debugger.logError(err, 'Appearance.loadSettings');
        }
    },

    resetSettings() {
        try {
            this.settings = {
                noteShape: 'bar',
                colors: {
                    tap: '#63b3ed',
                    long: '#a78bfa',
                    false: '#fca5a5'
                }
            };
            this.updateColorInputs();
            this.updateShapeUI();
            this.applySettings();
        } catch (err) {
            Debugger.logError(err, 'Appearance.resetSettings');
        }
    },

    getNoteClass() {
        return this.settings.noteShape === 'circle' ? 'circle' : '';
    }
};
