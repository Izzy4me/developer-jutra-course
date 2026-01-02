/**
 * AchievementStorage.js - Manages persistent achievement tracking via localStorage
 * Follows ScoreHistory.js pattern with schema v2
 */

const STORAGE_KEY = 'gta-s2-deliveroo-achievements';
const STORAGE_VERSION = 2;

export class AchievementStorage {
    constructor() {
        this.data = this.loadData();
    }

    /**
     * Load all achievement data from localStorage
     * @returns {Object} Achievement data or empty structure
     */
    loadData() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                return this.createEmptyData();
            }
            const parsed = JSON.parse(stored);
            
            // Validate version for future migrations
            if (parsed.version !== STORAGE_VERSION) {
                console.warn(`Achievement version mismatch (${parsed.version} vs ${STORAGE_VERSION}), migrating...`);
                return this.migrateData(parsed);
            }
            
            return parsed;
        } catch (error) {
            console.error('Failed to load achievements:', error);
            return this.createEmptyData();
        }
    }

    /**
     * Save achievement data to localStorage
     * @returns {boolean} Success status
     */
    saveData() {
        try {
            if (window.DEBUG_ACHIEVEMENTS) {
                console.time('AchievementStorage.save');
            }
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
            
            if (window.DEBUG_ACHIEVEMENTS) {
                console.timeEnd('AchievementStorage.save');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to save achievements:', error);
            if (error.name === 'QuotaExceededError') {
                console.error('Storage quota exceeded for achievements');
                alert('⚠️ Cannot save achievements - browser storage full');
            }
            return false;
        }
    }

    /**
     * Get achievement state by ID
     * @param {string} id - Achievement ID
     * @returns {Object|null} Achievement state or null
     */
    getAchievement(id) {
        return this.data.achievements[id] || null;
    }

    /**
     * Check if achievement is unlocked
     * @param {string} id - Achievement ID
     * @returns {boolean} True if unlocked
     */
    isUnlocked(id) {
        const achievement = this.data.achievements[id];
        return achievement ? achievement.isUnlocked : false;
    }

    /**
     * Get progress for an achievement
     * @param {string} id - Achievement ID
     * @returns {number} Current progress value
     */
    getProgress(id) {
        const achievement = this.data.achievements[id];
        return achievement ? (achievement.progress || 0) : 0;
    }

    /**
     * Unlock an achievement
     * @param {string} id - Achievement ID
     * @param {Object} options - Optional metadata (timestamp, etc.)
     * @returns {boolean} True if newly unlocked (not previously unlocked)
     */
    unlockAchievement(id, options = {}) {
        if (!this.data.achievements[id]) {
            this.data.achievements[id] = {
                isUnlocked: false,
                progress: 0
            };
        }

        const achievement = this.data.achievements[id];
        
        // Check if already unlocked
        if (achievement.isUnlocked) {
            return false; // Already unlocked
        }

        // Unlock the achievement
        achievement.isUnlocked = true;
        achievement.unlockedDate = options.timestamp || new Date().toISOString();
        
        // Store any additional metadata
        if (options.metadata) {
            achievement.metadata = options.metadata;
        }

        this.saveData();
        return true; // Newly unlocked!
    }

    /**
     * Update progress for an achievement (doesn't unlock it)
     * @param {string} id - Achievement ID
     * @param {number} progress - New progress value
     * @returns {boolean} True if progress was updated
     */
    updateProgress(id, progress) {
        if (!this.data.achievements[id]) {
            this.data.achievements[id] = {
                isUnlocked: false,
                progress: 0
            };
        }

        const achievement = this.data.achievements[id];
        
        // Don't update progress if already unlocked
        if (achievement.isUnlocked) {
            return false;
        }

        // Only update if progress increased
        if (progress > (achievement.progress || 0)) {
            achievement.progress = progress;
            this.saveData();
            return true;
        }

        return false;
    }

    /**
     * Increment progress for an achievement
     * @param {string} id - Achievement ID
     * @param {number} amount - Amount to increment (default 1)
     * @returns {number} New progress value
     */
    incrementProgress(id, amount = 1) {
        if (!this.data.achievements[id]) {
            this.data.achievements[id] = {
                isUnlocked: false,
                progress: 0
            };
        }

        const achievement = this.data.achievements[id];
        
        // Don't increment if already unlocked
        if (achievement.isUnlocked) {
            return achievement.progress || 0;
        }

        achievement.progress = (achievement.progress || 0) + amount;
        this.saveData();
        
        return achievement.progress;
    }

    /**
     * Get all achievements
     * @returns {Object} All achievement data
     */
    getAllAchievements() {
        return { ...this.data.achievements };
    }

    /**
     * Get statistics about achievements
     * @returns {Object} Stats summary
     */
    getStats(totalAchievements) {
        const unlocked = Object.values(this.data.achievements).filter(a => a.isUnlocked).length;
        const total = totalAchievements || 0;
        
        return {
            unlocked,
            total,
            completionRate: total > 0 ? ((unlocked / total) * 100).toFixed(1) : 0
        };
    }

    /**
     * Clear all achievements (for testing or reset)
     */
    clearAll() {
        this.data = this.createEmptyData();
        this.saveData();
    }

    /**
     * Export achievements as JSON string
     * @returns {string} JSON representation
     */
    exportJSON() {
        return JSON.stringify(this.data, null, 2);
    }

    /**
     * Import achievements from JSON string
     * @param {string} jsonString - JSON data to import
     * @returns {boolean} Success status
     */
    importJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.version === STORAGE_VERSION && data.achievements) {
                this.data = data;
                this.saveData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }

    /**
     * Migrate data from older versions
     * @param {Object} oldData - Old version data
     * @returns {Object} Migrated data
     */
    migrateData(oldData) {
        // Currently only v2 exists, but this prepares for future migrations
        console.log('Migrating achievement data to v2');
        return this.createEmptyData();
    }

    /**
     * Create empty data structure
     * @returns {Object} Empty achievement data
     */
    createEmptyData() {
        return {
            version: STORAGE_VERSION,
            achievements: {}
        };
    }

    /**
     * Check if localStorage is available
     * @returns {boolean} True if available
     */
    isLocalStorageAvailable() {
        try {
            const test = '__storage_test_achievements__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage not available for achievements');
            return false;
        }
    }
}
