const I18n = {
    currentLang: 'ko',
    
    translations: {
        ko: {
            // 메인 화면
            'game_title': 'TheBeat',
            'start_game': '게임 시작',
            'editor': '에디터',
            'game_mode': '게임 모드',
            'random_mode': '랜덤 모드',
            'music_mode': '뮤직 모드',
            'lanes': '레인',
            'difficulty': '난이도',
            'easy': '쉬움',
            'normal': '보통',
            'hard': '어려움',
            'note_count': '노트 개수',
            'load_chart': '차트 불러오기',
            
            // 환경설정
            'settings': '환경설정',
            'volume': '음량',
            'appearance': '모양',
            'controls': '조작',
            'help': '도움말',
            'etc': '기타',
            'music_volume': '음악 볼륨',
            'sfx_volume': '효과음 볼륨',
            'back': '돌아가기',
            
            // 언어 설정
            'language': '언어 / Language',
            'debug_mode': '디버그 모드',
            'debug_overlay': '디버그 오버레이 활성화',
            'info': '정보',
            
            // 모양 설정
            'note_shape': '노트 모양',
            'bar_shape': '막대형',
            'circle_shape': '원형',
            'color_mode': '색상 모드',
            'note_type_color': '노트 타입별',
            'lane_color': '레인별',
            'note_colors': '노트 색상',
            'tap_note': '기본 노트',
            'long_note': '롱 노트',
            'false_note': '가짜 노트',
            'preview': '미리보기',
            'save': '저장',
            'reset': '초기화',
            'apply': '적용',
            
            // 게임 중
            'playing': '플레이 중',
            'paused': '일시정지',
            'score': '점수',
            'combo': '콤보',
            
            // 결과 화면
            'game_result': '게임 결과',
            'final_score': '최종 점수',
            'rank': '랭크',
            'perfect': 'PERFECT',
            'good': 'GOOD',
            'bad': 'BAD',
            'miss': 'MISS',
            'retry': '다시 하기',
            'main_menu': '메인 메뉴',
            
            // 에디터
            'editor_title': '에디터',
            'music_settings': '음악 설정',
            'load_music': '음악 로딩',
            'bpm': 'BPM',
            'music_start_time': '음악 시작 시간',
            'note_placement': '노트 배치',
            'note_type': '노트 종류',
            'management': '관리',
            'filename': '파일명',
            'open': '열기',
            'reset_chart': '재설정',
            
            // 메시지
            'settings_applied': '모양 설정이 적용되었습니다.',
            'settings_reset': '모양 설정이 초기화되었습니다.',
            'preset_saved': '프리셋에 저장되었습니다.',
            'key_saved': '키 설정이 저장되었습니다.',
        },
        
        en: {
            // Main screen
            'game_title': 'TheBeat',
            'start_game': 'Start Game',
            'editor': 'Editor',
            'game_mode': 'Game Mode',
            'random_mode': 'Random',
            'music_mode': 'Music',
            'lanes': 'Lanes',
            'difficulty': 'Difficulty',
            'easy': 'Easy',
            'normal': 'Normal',
            'hard': 'Hard',
            'note_count': 'Note Count',
            'load_chart': 'Load Chart',
            
            // Settings
            'settings': 'Settings',
            'volume': 'Volume',
            'appearance': 'Appearance',
            'controls': 'Controls',
            'help': 'Help',
            'etc': 'Etc',
            'music_volume': 'Music Volume',
            'sfx_volume': 'SFX Volume',
            'back': 'Back',
            
            // Language settings
            'language': '언어 / Language',
            'debug_mode': 'Debug Mode',
            'debug_overlay': 'Enable Debug Overlay',
            'info': 'Information',
            
            // Appearance settings
            'note_shape': 'Note Shape',
            'bar_shape': 'Bar',
            'circle_shape': 'Circle',
            'color_mode': 'Color Mode',
            'note_type_color': 'By Note Type',
            'lane_color': 'By Lane',
            'note_colors': 'Note Colors',
            'tap_note': 'Tap Note',
            'long_note': 'Long Note',
            'false_note': 'False Note',
            'preview': 'Preview',
            'save': 'Save',
            'reset': 'Reset',
            'apply': 'Apply',
            
            // In game
            'playing': 'Playing',
            'paused': 'Paused',
            'score': 'Score',
            'combo': 'Combo',
            
            // Result screen
            'game_result': 'Game Result',
            'final_score': 'Final Score',
            'rank': 'Rank',
            'perfect': 'PERFECT',
            'good': 'GOOD',
            'bad': 'BAD',
            'miss': 'MISS',
            'retry': 'Retry',
            'main_menu': 'Main Menu',
            
            // Editor
            'editor_title': 'Editor',
            'music_settings': 'Music Settings',
            'load_music': 'Load Music',
            'bpm': 'BPM',
            'music_start_time': 'Music Start Time',
            'note_placement': 'Note Placement',
            'note_type': 'Note Type',
            'management': 'Management',
            'filename': 'Filename',
            'open': 'Open',
            'reset_chart': 'Reset',
            
            // Messages
            'settings_applied': 'Settings applied.',
            'settings_reset': 'Settings reset.',
            'preset_saved': 'Preset saved.',
            'key_saved': 'Key settings saved.',
        }
    },
    
    init() {
        // 로컬 스토리지에서 언어 설정 불러오기
        const savedLang = localStorage.getItem('theBeat_language');
        if (savedLang && this.translations[savedLang]) {
            this.currentLang = savedLang;
        }
        
        // 초기 번역 적용
        this.applyTranslations();
        
        // 언어 버튼 이벤트 리스너
        const koBtn = document.getElementById('lang-ko');
        const enBtn = document.getElementById('lang-en');
        
        if (koBtn) {
            koBtn.addEventListener('click', () => this.setLanguage('ko'));
        }
        if (enBtn) {
            enBtn.addEventListener('click', () => this.setLanguage('en'));
        }
        
        // 초기 버튼 상태 설정
        this.updateButtonStates();
    },
    
    setLanguage(lang) {
        if (!this.translations[lang]) return;
        
        this.currentLang = lang;
        localStorage.setItem('theBeat_language', lang);
        
        this.applyTranslations();
        this.updateButtonStates();
        
        UI.showMessage('settings', lang === 'ko' ? '언어가 변경되었습니다.' : 'Language changed.');
    },
    
    applyTranslations() {
        // data-i18n 속성을 가진 모든 요소 번역
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.translations[this.currentLang][key];
            if (translation) {
                // 입력 요소의 placeholder
                if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                    el.placeholder = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });
    },
    
    updateButtonStates() {
        const koBtn = document.getElementById('lang-ko');
        const enBtn = document.getElementById('lang-en');
        
        if (koBtn && enBtn) {
            if (this.currentLang === 'ko') {
                koBtn.classList.add('active');
                enBtn.classList.remove('active');
            } else {
                koBtn.classList.remove('active');
                enBtn.classList.add('active');
            }
        }
    },
    
    t(key) {
        return this.translations[this.currentLang][key] || key;
    }
};
