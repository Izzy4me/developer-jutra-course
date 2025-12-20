/**
 * ScoreHistory.js - Manages persistent score tracking via localStorage
 */

import levelFiles from './levels/index.js';

const STORAGE_KEY = 'gta-s2-deliveroo-scores';
const STORAGE_VERSION = 1;

export class ScoreHistory {
    constructor() {
        this.scores = this.loadScores();
    }

    /**
     * Load all scores from localStorage
     * @returns {Object} Scores object or empty structure
     */
    loadScores() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) {
                return this.createEmptyScores();
            }
            const parsed = JSON.parse(data);
            // Validate version for future migrations
            if (parsed.version !== STORAGE_VERSION) {
                console.warn('Score version mismatch, resetting');
                return this.createEmptyScores();
            }
            return parsed;
        } catch (error) {
            console.error('Failed to load scores:', error);
            return this.createEmptyScores();
        }
    }

    /**
     * Save scores to localStorage
     */
    saveScores() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.scores));
            return true;
        } catch (error) {
            console.error('Failed to save scores:', error);
            if (error.name === 'QuotaExceededError') {
                console.error('Storage quota exceeded');
                alert('⚠️ Cannot save progress - browser storage full');
            }
            return false;
        }
    }

    /**
     * Get best score for a specific level
     * @param {number} level - Level number (1-22)
     * @returns {Object|null} Score data or null if no record
     */
    getBestScore(level) {
        return this.scores.scores[level.toString()] || null;
    }

    /**
     * Record a new score (only saves if it's a personal best)
     * @param {number} level - Level number
     * @param {number} score - Parking score (0-100)
     * @param {string} carType - 'COMPACT', 'SPORT', 'SUV', 'TRUCK'
     * @param {number} attempts - Number of tries before success
     * @param {string} levelName - Display name of level
     * @returns {boolean} True if new best score set
     */
    recordScore(level, score, carType, attempts, levelName) {
        const key = level.toString();
        const existing = this.scores.scores[key];
        
        // Only save if this is a new best score
        if (!existing || score > existing.score) {
            this.scores.scores[key] = {
                level,
                score,
                carType,
                attempts,
                timestamp: new Date().toISOString(),
                levelName
            };
            this.saveScores();
            return true; // New record!
        }
        return false; // Not a new record
    }

    /**
     * Get completion statistics
     * @returns {Object} Stats summary
     */
    getStats() {
        const completed = Object.keys(this.scores.scores).length;
        const total = levelFiles.length; // Dynamic level count
        let totalScore = 0;
        let count = 0;

        for (const levelData of Object.values(this.scores.scores)) {
            totalScore += levelData.score;
            count++;
        }

        return {
            completed,
            total,
            completionRate: count > 0 ? (completed / total * 100).toFixed(1) : 0,
            averageScore: count > 0 ? (totalScore / count).toFixed(1) : 0
        };
    }

    /**
     * Clear all scores (for testing or reset)
     */
    clearAll() {
        this.scores = this.createEmptyScores();
        this.saveScores();
    }

    /**
     * Export scores as JSON string
     * @returns {string} JSON representation
     */
    exportJSON() {
        return JSON.stringify(this.scores, null, 2);
    }

    /**
     * Import scores from JSON string
     * @param {string} jsonString - JSON data to import
     * @returns {boolean} Success status
     */
    importJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.version === STORAGE_VERSION && data.scores) {
                this.scores = data;
                this.saveScores();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }

    /**
     * Check if localStorage is available
     * @returns {boolean} True if available
     */
    isLocalStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage not available');
            return false;
        }
    }

    createEmptyScores() {
        return {
            version: STORAGE_VERSION,
            scores: {}
        };
    }
}
