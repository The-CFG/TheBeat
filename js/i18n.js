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
            'lanes': '레인 수',
            'lanes_4': '4 레인',
            'lanes_5': '5 레인',
            'lanes_6': '6 레인',
            'lanes_7': '7 레인',
            'lanes_8': '8 레인',
            'difficulty': '난이도',
            'easy': '쉬움',
            'normal': '보통',
            'hard': '어려움',
            'note_count': '노트 수 (랜덤 모드)',
            'load_chart': '차트 불러오기',
            'load_music': '음악 불러오기',
            
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
            'note_type_color': '노트별 색상',
            'lane_color': '레인별 색상',
            'note_colors': '노트 타입별 색상',
            'tap_note': '기본 노트',
            'long_note': '롱 노트',
            'false_note': '가짜 노트',
            'preview': '미리보기',
            'save': '저장',
            'reset': '초기화',
            'apply': '적용',
            'preset_slots': '색상 프리셋',
            'save_preset': '프리셋 저장',
            
            // 조작 설정
            'left_4': '좌측 4',
            'left_3': '좌측 3',
            'left_2': '좌측 2',
            'left_1': '좌측 1',
            'center': '중앙',
            'right_1': '우측 1',
            'right_2': '우측 2',
            'right_3': '우측 3',
            'right_4': '우측 4',
            
            // 게임 중
            'playing': '플레이 중',
            'paused': '일시정지',
            'score': '점수',
            'combo': '콤보',
            'judgement': '판정',
            'perfect': 'PERFECT',
            'good': 'GOOD',
            'bad': 'BAD',
            'miss': 'MISS',
            'pause': '일시 정지',
            'resume': '계속하기',
            'give_up': '포기하기',
            
            // 결과 화면
            'game_result': '게임 결과',
            'final_score': '최종 점수',
            'rank': '랭크',
            'retry': '다시 하기',
            'main_menu': '메인으로 돌아가기',
            
            // 에디터
            'editor_title': '차트 에디터',
            
            // 메시지
            'settings_applied': '모양 설정이 적용되었습니다.',
            'settings_reset': '모양 설정이 초기화되었습니다.',
            'preset_saved': '프리셋에 저장되었습니다.',
            'key_saved': '키 설정이 저장되었습니다.',
            'language_changed': '언어가 변경되었습니다.',
            
            // 세부 난이도 조정
            'note_fall_speed': '노트 하강 속도',
            'note_spawn_speed': '노트 속도 (생성 빈도)',
            'dongta_probability': '동시타 확률',
            'max_simultaneous': '최대 동시타 개수',
            'dongta_note_type_prob': '동시타 노트 타입 확률',
            'tap_note_short': '기본 노트',
            'long_note_short': '롱 노트',
            'false_note_short': '가짜 노트',
            'long_note_probability': '롱노트 확률',
            'false_note_enable': '가짜 노트 활성화',
            'false_note_spawn_prob': '가짜 노트 등장 확률',
            
            // 에디터
            'load_music_editor': '음악 불러오기',
            'no_file_selected': '선택된 파일 없음',
            'start_time_sec': '시작(초)',
            'preview_label': '미리보기',
            'play': '재생',
            'stop': '정지',
            'pause_btn': '일시정지',
            'chart_settings': '차트 설정',
            'note_speed': '노트속도',
            'fall_speed': '하강속도',
            'snap_division': '분할',
            'measures': '마디',
            'management': '관리',
            'filename': '파일명',
            'open': '열기',
            'reset_chart': '재설정',
            'main_menu': '메인 메뉴',
            'trigger_modal_title': '설정 트리거 배치',
            'trigger_modal_desc': '이 시점부터 BPM, 노트 속도, 하강 속도를 변경합니다.',
            'place': '배치',
            'cancel': '취소',
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
            'lanes_4': '4 Lanes',
            'lanes_5': '5 Lanes',
            'lanes_6': '6 Lanes',
            'lanes_7': '7 Lanes',
            'lanes_8': '8 Lanes',
            'difficulty': 'Difficulty',
            'easy': 'Easy',
            'normal': 'Normal',
            'hard': 'Hard',
            'note_count': 'Note Count (Random)',
            'load_chart': 'Load Chart',
            'load_music': 'Load Music',
            
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
            'note_colors': 'Note Type Colors',
            'tap_note': 'Tap Note',
            'long_note': 'Long Note',
            'false_note': 'False Note',
            'preview': 'Preview',
            'save': 'Save',
            'reset': 'Reset',
            'apply': 'Apply',
            'preset_slots': 'Color Presets',
            'save_preset': 'Save Preset',
            
            // Control settings
            'left_4': 'Left 4',
            'left_3': 'Left 3',
            'left_2': 'Left 2',
            'left_1': 'Left 1',
            'center': 'Center',
            'right_1': 'Right 1',
            'right_2': 'Right 2',
            'right_3': 'Right 3',
            'right_4': 'Right 4',
            
            // In game
            'playing': 'Playing',
            'paused': 'Paused',
            'score': 'Score',
            'combo': 'Combo',
            'judgement': 'Judgement',
            'perfect': 'PERFECT',
            'good': 'GOOD',
            'bad': 'BAD',
            'miss': 'MISS',
            'pause': 'Pause',
            'resume': 'Resume',
            'give_up': 'Give Up',
            
            // Result screen
            'game_result': 'Game Result',
            'final_score': 'Final Score',
            'rank': 'Rank',
            'retry': 'Retry',
            'main_menu': 'Back to Menu',
            
            // Editor
            'editor_title': 'Chart Editor',
            
            // Messages
            'settings_applied': 'Settings applied.',
            'settings_reset': 'Settings reset.',
            'preset_saved': 'Preset saved.',
            'key_saved': 'Key settings saved.',
            'language_changed': 'Language changed.',
            
            // Advanced difficulty settings
            'note_fall_speed': 'Note Fall Speed',
            'note_spawn_speed': 'Note Speed (Spawn Frequency)',
            'dongta_probability': 'Simultaneous Note Probability',
            'max_simultaneous': 'Max Simultaneous Notes',
            'dongta_note_type_prob': 'Simultaneous Note Type Probability',
            'tap_note_short': 'Tap Note',
            'long_note_short': 'Long Note',
            'false_note_short': 'False Note',
            'long_note_probability': 'Long Note Probability',
            'false_note_enable': 'Enable False Notes',
            'false_note_spawn_prob': 'False Note Spawn Probability',
            
            // Editor
            'load_music_editor': 'Load Music',
            'no_file_selected': 'No file selected',
            'start_time_sec': 'Start (sec)',
            'preview_label': 'Preview',
            'play': 'Play',
            'stop': 'Stop',
            'pause_btn': 'Pause',
            'chart_settings': 'Chart Settings',
            'note_speed': 'Note Speed',
            'fall_speed': 'Fall Speed',
            'snap_division': 'Snap',
            'measures': 'Measures',
            'management': 'Management',
            'filename': 'Filename',
            'open': 'Open',
            'reset_chart': 'Reset',
            'main_menu': 'Main Menu',
            'trigger_modal_title': 'Place Settings Trigger',
            'trigger_modal_desc': 'Change BPM, note speed, and fall speed from this point.',
            'place': 'Place',
            'cancel': 'Cancel',
        }
    },
    
    helpContent: {
        ko: `
            <div>
                <h3 class="text-xl font-semibold mb-2 text-white">1. 플레이 방법 및 화면 조작</h3>
                <ul class="list-disc list-inside space-y-1">
                    <li><strong>기본 목표:</strong> 화면 위에서 아래로 내려오는 노트를 판정선에 맞춰 정확한 타이밍에 처리하는 리듬 게임입니다.</li>
                    <li><strong>조작:</strong> 각 레인(세로줄)에 해당하는 키보드 키를 눌러 노트를 처리합니다. 기본 조작키는 <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">A</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">S</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">D</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">F</kbd> / <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Space</kbd> / <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">J</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">K</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">L</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">;</kbd>이며, '환경설정 &gt; 조작' 탭에서 변경할 수 있습니다.</li>
                    <li><strong>일시정지:</strong> 게임 플레이 중 <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">ESC</kbd> 키를 누르거나 일시정지 버튼을 누르면 게임을 일시정지하거나 다시 시작할 수 있습니다.</li>
                </ul>
            </div>
            <div>
                <h3 class="text-xl font-semibold mb-2 text-white">2. 노트의 종류</h3>
                <ul class="list-disc list-inside space-y-1">
                    <li><strong class="text-blue-400">일반 노트 (파란색):</strong> 가장 기본적인 노트입니다. 판정선에 맞춰 한 번 누르면 처리됩니다.</li>
                    <li><strong class="text-purple-400">롱노트 (보라색):</strong> 긴 막대 형태의 노트입니다. 시작 지점에서 키를 누른 상태를 유지하고, 끝 지점에서 정확하게 키를 떼야 합니다.</li>
                    <li><strong class="text-red-400">가짜 노트 (붉은색):</strong> 함정 노트입니다. 절대로 누르지 말고 그대로 통과시켜야 PERFECT 판정을 받으며, 잘못 누르면 MISS가 됩니다. 랜덤 모드에서는 '어려움' 난이도 또는 세부 설정에서 확률을 직접 조절할 때 등장합니다.</li>
                </ul>
            </div>
            <div>
                <h3 class="text-xl font-semibold mb-2 text-white">3. 점수 계산과 종료 화면</h3>
                <ul class="list-disc list-inside space-y-1">
                    <li><strong>판정:</strong> 정확도에 따라 PERFECT, GOOD, BAD, MISS 네 가지로 나뉩니다. GOOD 이상의 판정은 콤보를 쌓고 점수를 줍니다.</li>
                    <li><strong>콤보:</strong> 연속으로 GOOD 이상 판정을 받으면 콤보가 쌓이며, 높은 콤보는 더 많은 추가 점수를 제공합니다.</li>
                    <li><strong>종료 화면:</strong> 곡이 끝나면 최종 점수, 판정별 노트 수, 그리고 성과에 따른 최종 랭크(S, A, B, C)가 표시됩니다.</li>
                </ul>
            </div>
            <div>
                <h3 class="text-xl font-semibold mb-2 text-white">4. 메인 메뉴 설정 가이드</h3>
                <ul class="list-disc list-inside space-y-1">
                    <li><strong>게임 모드:</strong> 노트가 자동으로 생성되는 '랜덤 모드'와 직접 만든 차트를 플레이하는 '뮤직 모드'를 선택할 수 있습니다.</li>
                    <li><strong>레인 수 조정:</strong> 4레인부터 8레인까지 원하는 플레이 환경을 선택할 수 있습니다.</li>
                    <li><strong>난이도 조절 (랜덤 모드 전용):</strong>
                        <ul class="list-circle list-inside ml-4 mt-1 space-y-1">
                            <li><strong>간단 설정:</strong> '쉬움', '보통', '어려움' 버튼으로 난이도를 선택합니다. '어려움'에서는 가짜 노트가 등장합니다.</li>
                            <li><strong>세부 설정:</strong> 화살표 아이콘을 눌러 노트 하강 속도, 노트 생성 속도, 동시타 확률, 최대 동시타 수, 동시타 내 노트 타입 비율, 롱노트 확률, 가짜 노트 등장 여부 및 확률을 세밀하게 조절할 수 있습니다.</li>
                        </ul>
                    </li>
                    <li><strong>뮤직 모드:</strong> '차트 불러오기'로 JSON 차트 파일을, '음악 불러오기'로 차트가 요구하는 음악 파일을 각각 불러온 뒤 게임을 시작합니다.</li>
                </ul>
            </div>
            <div>
                <h3 class="text-xl font-semibold mb-2 text-white">5. 환경설정 (톱니바퀴 아이콘)</h3>
                <ul class="list-disc list-inside space-y-1">
                    <li><strong>음량:</strong> 배경 음악(BGM)과 효과음(SFX)의 크기를 각각 조절합니다.</li>
                    <li><strong>모양:</strong> 노트의 형태(막대형 / 원형)와 색상 모드(노트별 색상 / 레인별 색상)를 설정합니다. 노트별 색상 모드에서는 일반·롱·가짜 노트의 색을 개별 지정할 수 있으며, 자주 쓰는 설정을 최대 3개의 색상 프리셋으로 저장하고 불러올 수 있습니다.</li>
                    <li><strong>조작:</strong> 게임 플레이에 사용할 키를 직접 설정합니다. 키 박스를 클릭한 뒤 원하는 키를 누르면 변경되며, 변경 후에는 반드시 '저장' 버튼을 눌러야 적용됩니다.</li>
                    <li><strong>기타:</strong> 인터페이스 언어(한국어 / English) 전환, 디버그 오버레이 활성화 옵션이 있습니다.</li>
                </ul>
            </div>
            <div>
                <h3 class="text-xl font-semibold mb-2 text-white">6. 에디터 사용법</h3>
                <p class="mb-2">자신만의 차트를 만드는 공간입니다.</p>
                <ul class="list-disc list-inside space-y-1">
                    <li><strong>기본 설정:</strong> 음악 파일, BPM(곡 빠르기), 음악 시작 시간(초), 차트 파일명을 설정합니다. 차트를 저장하려면 반드시 음악 파일을 먼저 불러와야 합니다.</li>
                    <li><strong>노트 종류 선택:</strong> 상단 버튼 또는 단축키 <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">1</kbd> (일반) / <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">2</kbd> (롱노트) / <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">3</kbd> (가짜)로 배치할 노트 종류를 선택합니다.</li>
                    <li><strong>노트 배치:</strong> 타임라인의 원하는 위치를 클릭하여 노트를 배치하거나 삭제합니다. 재생 중에도 키보드로 레인에 노트를 직접 찍을 수 있습니다. (레인 단축키: <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Q</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">W</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">E</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">R</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">T</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Y</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">U</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">I</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">O</kbd>)</li>
                    <li><strong>스냅 설정:</strong> 드롭다운으로 노트가 배치될 타이밍 격자의 세밀함을 조절합니다. (4분음표, 8분음표 등)</li>
                    <li><strong>트리거:</strong> 차트 중간에 BPM이나 노트 속도를 변경할 지점을 설정합니다. 타임라인에 노란 선으로 표시됩니다.</li>
                    <li><strong>마디 조절:</strong> '+' 와 '-' 버튼으로 차트의 전체 길이를 자유롭게 조절할 수 있습니다.</li>
                    <li><strong>미리보기:</strong> '재생/일시정지'로 차트를 재생하면 우측 게임 화면에서 노트 낙하를 실시간으로 미리 볼 수 있습니다. 미리보기 레인 수를 별도로 설정할 수도 있습니다.</li>
                    <li><strong>관리:</strong> '저장'으로 차트를 JSON 파일로 내보내고, '열기'로 기존 차트를 불러옵니다. '재설정'은 배치된 노트를 모두 삭제합니다. <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Ctrl</kbd>+<kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Z</kbd>로 직전 작업을 취소할 수 있습니다. (최대 50단계)</li>
                </ul>
            </div>
            <div>
                <h3 class="text-xl font-semibold mb-2 text-white">7. 문의</h3>
                <p>버그 리포트 및 기타 문의는 디스코드 서버 또는 개인 DM으로 연락 바랍니다.</p>
            </div>
        `,
        en: `
            <div>
                <h3 class="text-xl font-semibold mb-2 text-white">1. How to Play</h3>
                <ul class="list-disc list-inside space-y-1">
                    <li><strong>Objective:</strong> A rhythm game where you hit notes falling from top to bottom in time with the judgement line.</li>
                    <li><strong>Controls:</strong> Press the keyboard key assigned to each lane (column) to hit notes. Default keys are <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">A</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">S</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">D</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">F</kbd> / <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Space</kbd> / <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">J</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">K</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">L</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">;</kbd>. You can remap them in Settings &gt; Controls.</li>
                    <li><strong>Pause:</strong> Press <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">ESC</kbd> or the pause button during gameplay to pause or resume.</li>
                </ul>
            </div>
            <div>
                <h3 class="text-xl font-semibold mb-2 text-white">2. Note Types</h3>
                <ul class="list-disc list-inside space-y-1">
                    <li><strong class="text-blue-400">Tap Note (Blue):</strong> The most basic note. Press the key once when it reaches the judgement line.</li>
                    <li><strong class="text-purple-400">Long Note (Purple):</strong> A note with a tail. Hold the key from its start and release exactly at the end.</li>
                    <li><strong class="text-red-400">False Note (Red):</strong> A trap note. Let it pass without pressing anything to get PERFECT. Pressing it results in a MISS. In Random Mode, false notes appear on Hard difficulty or when you enable them manually in the advanced settings.</li>
                </ul>
            </div>
            <div>
                <h3 class="text-xl font-semibold mb-2 text-white">3. Scoring & Results</h3>
                <ul class="list-disc list-inside space-y-1">
                    <li><strong>Judgements:</strong> Each note is graded as PERFECT, GOOD, BAD, or MISS based on timing accuracy. GOOD or better builds your combo and earns points.</li>
                    <li><strong>Combo:</strong> Consecutive GOOD or better judgements increase your combo. A higher combo grants bonus score.</li>
                    <li><strong>Result Screen:</strong> After the song ends, your final score, note counts by judgement, and your overall rank (S, A, B, C) are displayed.</li>
                </ul>
            </div>
            <div>
                <h3 class="text-xl font-semibold mb-2 text-white">4. Main Menu Settings</h3>
                <ul class="list-disc list-inside space-y-1">
                    <li><strong>Game Mode:</strong> Choose between <em>Random Mode</em>, where notes are generated automatically, and <em>Music Mode</em>, where you play a custom chart.</li>
                    <li><strong>Lanes:</strong> Select between 4 and 8 lanes to suit your preference.</li>
                    <li><strong>Difficulty (Random Mode only):</strong>
                        <ul class="list-circle list-inside ml-4 mt-1 space-y-1">
                            <li><strong>Quick Setting:</strong> Choose Easy, Normal, or Hard. False notes appear on Hard.</li>
                            <li><strong>Advanced Setting:</strong> Click the arrow icon to fine-tune note fall speed, note spawn speed, simultaneous note probability, max simultaneous notes, note type ratios within chords, long note probability, and false note toggle &amp; rate.</li>
                        </ul>
                    </li>
                    <li><strong>Music Mode:</strong> Load a JSON chart file with "Load Chart" and the corresponding audio file with "Load Music", then start the game.</li>
                </ul>
            </div>
            <div>
                <h3 class="text-xl font-semibold mb-2 text-white">5. Settings (Gear Icon)</h3>
                <ul class="list-disc list-inside space-y-1">
                    <li><strong>Volume:</strong> Adjust BGM and SFX volume independently.</li>
                    <li><strong>Appearance:</strong> Set the note shape (Bar / Circle) and color mode (By Note Type / By Lane). In Note Type mode, you can customize colors for tap, long, and false notes individually and save up to 3 color presets.</li>
                    <li><strong>Controls:</strong> Remap your keys. Click a key box, press the desired key, then click Save to apply changes.</li>
                    <li><strong>Etc:</strong> Switch the interface language (한국어 / English) and toggle the debug overlay.</li>
                </ul>
            </div>
            <div>
                <h3 class="text-xl font-semibold mb-2 text-white">6. Editor Guide</h3>
                <p class="mb-2">Create your own custom charts here.</p>
                <ul class="list-disc list-inside space-y-1">
                    <li><strong>Basic Setup:</strong> Load an audio file, then set BPM, music start offset (seconds), and chart filename. The audio file must be loaded before saving.</li>
                    <li><strong>Note Type Selection:</strong> Use the top buttons or shortcuts <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">1</kbd> (Tap) / <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">2</kbd> (Long) / <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">3</kbd> (False) to select the note type to place.</li>
                    <li><strong>Placing Notes:</strong> Click anywhere on the timeline to place or remove a note. You can also press lane keys while playing back to place notes in real time. (Lane shortcuts: <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Q</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">W</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">E</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">R</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">T</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Y</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">U</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">I</kbd> <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">O</kbd>)</li>
                    <li><strong>Snap:</strong> Use the dropdown to set the timing grid resolution (quarter notes, eighth notes, etc.).</li>
                    <li><strong>Triggers:</strong> Set points in the chart where BPM or note speed changes. Shown as yellow lines on the timeline.</li>
                    <li><strong>Measure Count:</strong> Use '+' and '-' to freely adjust the total length of the chart.</li>
                    <li><strong>Preview:</strong> Press Play/Pause to preview your chart. Notes will fall in the game view on the right. You can also set a separate lane count for the preview.</li>
                    <li><strong>File Management:</strong> Use Save to export the chart as a JSON file, and Open to load an existing one. Reset clears all placed notes. Press <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Ctrl</kbd>+<kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Z</kbd> to undo up to 50 steps.</li>
                </ul>
            </div>
            <div>
                <h3 class="text-xl font-semibold mb-2 text-white">7. Contact</h3>
                <p>For bug reports or other inquiries, please reach out via the Discord server or personal DM.</p>
            </div>
        `
    },

    init() {
        // 로컬 스토리지에서 언어 설정 불러오기
        const savedLang = localStorage.getItem('theBeat_language');
        if (savedLang && this.translations[savedLang]) {
            this.currentLang = savedLang;
        }
        
        // 초기 번역 적용
        this.applyTranslations();
        this.applyHelpContent();
        
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
        this.applyHelpContent();
        this.updateButtonStates();
        
        UI.showMessage('settings', this.t('language_changed'));
    },
    
    applyHelpContent() {
        const helpContainer = document.getElementById('tab-content-help');
        if (!helpContainer) return;
        const content = this.helpContent[this.currentLang] || this.helpContent['ko'];
        helpContainer.innerHTML = content;
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
