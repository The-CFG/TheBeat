const CONFIG = {
    DIFFICULTY_SPEED: { easy: 4, normal: 7, hard: 10 },
    JUDGEMENT_WINDOWS_MS: { perfect: 50, good: 100, bad: 150, miss: 200 },
    VALID_LANES: [4, 5, 6, 7, 8],
    SIMULTANEOUS_NOTE_PROBABILITY: {
        easy: 0.1,
        normal: 0.25,
        hard: 0.4,
    },
    LONG_NOTE_PROBABILITY: {
        easy: 0.1,
        normal: 0.15,
        hard: 0.2,
    },
    KEY_BINDING_IDS: ['L4', 'L3', 'L2', 'L1', 'C1', 'R1', 'R2', 'R3', 'R4'],
    
    DEFAULT_KEYS: {
        L4: 'A', L3: 'S', L2: 'D', L1: 'F',
        C1: 'Space',
        R1: 'J', R2: 'K', R3: 'L', R4: 'Semicolon'
    },

    LANE_KEY_MAPPING_ORDER: {
        4: ['L2', 'L1', 'R1', 'R2'],
        5: ['L2', 'L1', 'C1', 'R1', 'R2'],
        6: ['L3', 'L2', 'L1', 'R1', 'R2', 'R3'],
        7: ['L3', 'L2', 'L1', 'C1', 'R1', 'R2', 'R3'],
        8: ['L4', 'L3', 'L2', 'L1', 'R1', 'R2', 'R3', 'R4'],
    },

    KEY_CODES: {
        A: 65, S: 83, D: 68, F: 70, J: 74, K: 75, L: 76, Space: 32, Semicolon: 186
    },
    POINTS: { perfect: 10, good: 5, bad: 2, miss: 0 },
    NOTE_COUNT_MIN: 10,
    NOTE_COUNT_MAX: 500,
    DEFAULT_NOTE_COUNT: 100,
    NOTE_SPACING_FACTOR: 20,
    FEEDBACK_DURATION_MS: 50,
    MESSAGE_DURATION_MS: 3000,
    JUDGEMENT_ANIMATION_MS: 300,
    EDITOR_BEAT_HEIGHT: 20,
};
