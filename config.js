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
    LANE_KEYS: {
      4: ['D', 'F', 'J', 'K'],
      5: ['D', 'F', 'Space', 'J', 'K'],
      6: ['S', 'D', 'F', 'J', 'K', 'L'],
      7: ['S', 'D', 'F', 'Space', 'J', 'K', 'L'],
      8: ['A', 'S', 'D', 'F', 'J', 'K', 'L', 'Semicolon']
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