/**
 * AchievementDefinitions.js - Central registry of all achievements
 * Each achievement has: id, title, description, category, unlock conditions
 */

export const ACHIEVEMENT_CATEGORIES = {
    PARKING: 'Parkowanie',
    CRASHES: 'Kolizje',
    SPEED: 'Prędkość',
    VEHICLES: 'Pojazdy',
    COMPLETION: 'Ukończenie',
    OTHER: 'Inne'
};

/**
 * All achievements in the game
 * @type {Array<Object>}
 */
export const ACHIEVEMENTS = [
    // Parking achievements
    {
        id: 'parking_master',
        title: 'Mistrz parkowania',
        description: 'Ukończ dowolny poziom z wynikiem lepszym niż 90 punktów',
        category: ACHIEVEMENT_CATEGORIES.PARKING,
        isUnlocked: false,
        checkUnlock: (data) => {
            return data.type === 'levelComplete' && data.score > 90;
        }
    },
    {
        id: 'parking_fail',
        title: 'Karna nalepka!',
        description: 'Ukończ dowolny poziom z wynikiem niższym niż 15 punktów',
        category: ACHIEVEMENT_CATEGORIES.PARKING,
        isUnlocked: false,
        checkUnlock: (data) => {
            return data.type === 'levelComplete' && data.score < 15;
        }
    },
    {
        id: 'reverse_parking',
        title: 'Kamery są dla słabych',
        description: 'Ukończ poziom z parkowaniem tyłem (poziom 21)',
        category: ACHIEVEMENT_CATEGORIES.PARKING,
        isUnlocked: false,
        checkUnlock: (data) => {
            return data.type === 'levelComplete' && data.levelNumber === 21;
        }
    },
    {
        id: 'insured_always',
        title: 'Przezorny zawsze ubezpieczony',
        description: 'Zaparkuj zostawiając zaciągnięty hamulec ręczny',
        category: ACHIEVEMENT_CATEGORIES.PARKING,
        isUnlocked: false,
        checkUnlock: (data) => {
            return data.type === 'levelComplete' && data.handbrakeHeldAtCompletion === true;
        }
    },

    // Crash achievements
    {
        id: 'first_scratch',
        title: 'Pierwsza rysa',
        description: 'Po raz pierwszy rozbiłeś samochód',
        category: ACHIEVEMENT_CATEGORIES.CRASHES,
        isUnlocked: false,
        checkUnlock: (data) => {
            return data.type === 'crash';
        }
    },
    {
        id: 'crash_master',
        title: 'Andrzeju to się wyklepie',
        description: 'Rozbiłeś samochód co najmniej 50 razy',
        category: ACHIEVEMENT_CATEGORIES.CRASHES,
        isUnlocked: false,
        progress: 0,
        progressMax: 50,
        checkUnlock: (data, currentProgress) => {
            if (data.type === 'crash') {
                return currentProgress >= 50;
            }
            return false;
        },
        updateProgress: (data, currentProgress) => {
            if (data.type === 'crash') {
                return currentProgress + 1;
            }
            return currentProgress;
        }
    },
    {
        id: 'curb_survival',
        title: 'Życie przeleciało mi między oczami',
        description: 'Uderzyłeś w krawężnik, ale oszukałeś przeznaczenie',
        category: ACHIEVEMENT_CATEGORIES.CRASHES,
        isUnlocked: false,
        checkUnlock: (data) => {
            return data.type === 'curbBonk' && !data.crashed;
        }
    },

    {
        id: 'hard_learner',
        title: 'Lepiej późno niż wcale',
        description: `Rozbij samochód min. 7 razy na danym poziomie zanim go ukończysz`,
        category: ACHIEVEMENT_CATEGORIES.CRASHES,
        isUnlocked: false,
        checkUnlock: (data) => {
            const crashes = data.attempts - 1 || 0;
            return data.type === 'levelComplete' && crashes >= 7;
        }
    },

    // Speed achievements
    {
        id: 'speed_demon',
        title: 'Fast and stupid',
        description: 'Prowadziłeś samochód z prędkością większą niż 200 km/h.',
        category: ACHIEVEMENT_CATEGORIES.SPEED,
        isUnlocked: false,
        checkUnlock: (data) => {
            return data.type === 'speedRecord' && data.speed > 200;
        }
    },
    {
        id: 'over_9000_rpms',
        title: 'Over 9000 (RPMs)!',
        description: 'Naładuj boost do 100%',
        category: ACHIEVEMENT_CATEGORIES.SPEED,
        isUnlocked: false,
        checkUnlock: (data) => {
            return data.type === 'boostFull';
        }
    },
    {
        id: 'first_for_buns',
        title: 'Pierwszy po bułki',
        description: 'Ukończ dowolny poziom parkingowy w mniej niż 10 sekund',
        category: ACHIEVEMENT_CATEGORIES.SPEED,
        isUnlocked: false,
        checkUnlock: (data) => {
            return data.type === 'levelComplete'
                && data.levelType === 'lot'
                && typeof data.elapsedSeconds === 'number'
                && data.elapsedSeconds < 10;
        }
    },
    {
        id: 'highway_u_turn',
        title: 'Zawracanie na obwodnicy',
        description: 'Ukończ poziom 20 w poniżej 10 sekund',
        category: ACHIEVEMENT_CATEGORIES.SPEED,
        isUnlocked: false,
        checkUnlock: (data) => {
            return data.type === 'levelComplete'
                && data.levelNumber === 20
                && typeof data.elapsedSeconds === 'number'
                && data.elapsedSeconds < 10;
        }
    },

    // Vehicle achievements
    {
        id: 'big_boy_toy',
        title: 'Duzi chłopcy lubią duże zabawki',
        description: 'Ukończ dowolny poziom z użyciem pojazdem SUV',
        category: ACHIEVEMENT_CATEGORIES.VEHICLES,
        isUnlocked: false,
        checkUnlock: (data) => {
            return data.type === 'levelComplete' && data.carType === 'SUV';
        }
    },
    {
        id: 'beer_holder',
        title: 'Potrzymaj mi piwo!',
        description: 'Ukończ poziom 22',
        category: ACHIEVEMENT_CATEGORIES.COMPLETION,
        isUnlocked: false,
        checkUnlock: (data) => {
            return data.type === 'levelComplete' && data.levelNumber === 22;
        }
    },
    {
        id: 'natural_talent',
        title: 'Masz ten dryg!',
        description: 'Ukończ dowolny poziom (poza level 1) w pierwszym podejściu',
        category: ACHIEVEMENT_CATEGORIES.COMPLETION,
        isUnlocked: false,
        checkUnlock: (data) => {
            return data.type === 'levelComplete'
                && data.levelNumber !== 1
                && data.attempts === 1;
        }
    },

    // Completion achievements
    {
        id: 'all_levels_complete',
        title: 'Gdzie moje prawko?',
        description: 'Ukończ wszystkie dostępne poziomy',
        category: ACHIEVEMENT_CATEGORIES.COMPLETION,
        isUnlocked: false,
        progressMax: 22, // Total levels
        checkUnlock: (data, currentProgress) => {
            // This will be checked against total unique levels completed
            return data.type === 'allLevelsComplete';
        }
    }
];

/**
 * Get achievement definition by ID
 * @param {string} id - Achievement ID
 * @returns {Object|null} Achievement definition or null
 */
export function getAchievementById(id) {
    return ACHIEVEMENTS.find(a => a.id === id) || null;
}

/**
 * Get all achievements by category
 * @param {string} category - Category name
 * @returns {Array<Object>} Achievements in category
 */
export function getAchievementsByCategory(category) {
    return ACHIEVEMENTS.filter(a => a.category === category);
}

/**
 * Get all achievement IDs
 * @returns {Array<string>} Array of achievement IDs
 */
export function getAllAchievementIds() {
    return ACHIEVEMENTS.map(a => a.id);
}

/**
 * Get total number of achievements
 * @returns {number} Total count
 */
export function getTotalAchievementCount() {
    return ACHIEVEMENTS.length;
}
