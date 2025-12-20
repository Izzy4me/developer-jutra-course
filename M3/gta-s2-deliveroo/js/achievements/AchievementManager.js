/**
 * AchievementManager.js - Observer pattern implementation for achievement tracking
 * Subscribes to game events and manages achievement unlock logic
 */

import { AchievementStorage } from './AchievementStorage.js';
import { ACHIEVEMENTS, getAchievementById, getTotalAchievementCount } from './AchievementDefinitions.js';

export class AchievementManager {
    constructor() {
        this.storage = new AchievementStorage();
        this.subscribers = [];
        this.completedLevels = new Set(); // Track unique level completions
        
        // Initialize completed levels from score history
        this.initializeCompletedLevels();
        
        if (window.DEBUG_ACHIEVEMENTS) {
            console.log('AchievementManager initialized', this.getStats());
        }
    }

    /**
     * Subscribe to achievement unlock events
     * @param {Function} callback - Called when achievement is unlocked
     */
    subscribe(callback) {
        if (typeof callback === 'function') {
            this.subscribers.push(callback);
        }
    }

    /**
     * Unsubscribe from achievement unlock events
     * @param {Function} callback - Callback to remove
     */
    unsubscribe(callback) {
        this.subscribers = this.subscribers.filter(cb => cb !== callback);
    }

    /**
     * Notify all subscribers about achievement unlock
     * @param {Object} achievement - Full achievement data
     */
    notify(achievement) {
        if (window.DEBUG_ACHIEVEMENTS) {
            console.time('AchievementNotify');
        }

        this.subscribers.forEach(callback => {
            try {
                callback(achievement);
            } catch (error) {
                console.error('Error in achievement subscriber:', error);
            }
        });

        if (window.DEBUG_ACHIEVEMENTS) {
            console.timeEnd('AchievementNotify');
        }
    }

    /**
     * Process a game event and check for achievement unlocks
     * @param {Object} eventData - Event data from game
     */
    processEvent(eventData) {
        if (window.DEBUG_ACHIEVEMENTS) {
            console.time('AchievementCheck');
            console.log('Processing event:', eventData.type);
        }

        const unlockedAchievements = [];

        // Check each achievement definition
        for (const achievementDef of ACHIEVEMENTS) {
            const storedAchievement = this.storage.getAchievement(achievementDef.id);
            const isAlreadyUnlocked = storedAchievement?.isUnlocked || false;

            // Skip if already unlocked
            if (isAlreadyUnlocked) {
                continue;
            }

            // Get current progress
            const currentProgress = storedAchievement?.progress || 0;

            // Update progress if achievement has progress tracking
            if (achievementDef.updateProgress) {
                const newProgress = achievementDef.updateProgress(eventData, currentProgress);
                if (newProgress !== currentProgress) {
                    this.storage.updateProgress(achievementDef.id, newProgress);
                }
            }

            // Check unlock condition
            const shouldUnlock = achievementDef.checkUnlock(
                eventData,
                this.storage.getProgress(achievementDef.id)
            );

            if (shouldUnlock) {
                const wasUnlocked = this.storage.unlockAchievement(achievementDef.id);
                
                if (wasUnlocked) {
                    // Build full achievement object
                    const unlockedAchievement = {
                        ...achievementDef,
                        isUnlocked: true,
                        unlockedDate: new Date().toISOString(),
                        progress: this.storage.getProgress(achievementDef.id)
                    };
                    
                    unlockedAchievements.push(unlockedAchievement);
                    
                    if (window.DEBUG_ACHIEVEMENTS) {
                        console.log('🏆 Achievement unlocked:', achievementDef.title);
                    }
                }
            }
        }

        // Notify subscribers about all newly unlocked achievements
        unlockedAchievements.forEach(achievement => {
            this.notify(achievement);
        });

        if (window.DEBUG_ACHIEVEMENTS) {
            console.timeEnd('AchievementCheck');
        }

        return unlockedAchievements;
    }

    /**
     * Handle level completion event
     * @param {Object} data - Level completion data
     */
    onLevelComplete(data) {
        const eventData = {
            type: 'levelComplete',
            ...data
        };

        // Track completed levels for "all levels complete" achievement
        this.completedLevels.add(data.levelNumber);
        
        // Check if all levels are completed
        if (this.completedLevels.size === 22) {
            this.processEvent({ type: 'allLevelsComplete' });
        }

        this.processEvent(eventData);
    }

    /**
     * Handle crash event
     * @param {Object} data - Crash data
     */
    onCrash(data) {
        const eventData = {
            type: 'crash',
            ...data
        };
        
        // Increment crash counter for progress-based achievement
        this.storage.incrementProgress('crash_master', 1);
        
        this.processEvent(eventData);
    }

    /**
     * Handle curb bonk event (survived collision)
     * @param {Object} data - Curb bonk data
     */
    onCurbBonk(data) {
        const eventData = {
            type: 'curbBonk',
            crashed: false,
            ...data
        };
        
        this.processEvent(eventData);
    }

    /**
     * Handle speed record event
     * @param {Object} data - Speed data
     */
    onSpeedRecord(data) {
        const eventData = {
            type: 'speedRecord',
            ...data
        };
        
        this.processEvent(eventData);
    }

    /**
     * Handle boost fully charged event (handbrake boost at 100%)
     * @param {Object} data - Boost data
     */
    onBoostFull(data) {
        const eventData = {
            type: 'boostFull',
            ...data
        };

        this.processEvent(eventData);
    }

    /**
     * Get achievement data by ID (includes unlock status)
     * @param {string} id - Achievement ID
     * @returns {Object} Full achievement data
     */
    getAchievement(id) {
        const definition = getAchievementById(id);
        if (!definition) {
            return null;
        }

        const stored = this.storage.getAchievement(id);
        
        return {
            ...definition,
            isUnlocked: stored?.isUnlocked || false,
            progress: stored?.progress || 0,
            unlockedDate: stored?.unlockedDate || null
        };
    }

    /**
     * Get all achievements with their unlock status
     * @returns {Array<Object>} All achievements
     */
    getAllAchievements() {
        return ACHIEVEMENTS.map(def => {
            const stored = this.storage.getAchievement(def.id);
            return {
                ...def,
                isUnlocked: stored?.isUnlocked || false,
                progress: stored?.progress || 0,
                unlockedDate: stored?.unlockedDate || null
            };
        });
    }

    /**
     * Get achievement statistics
     * @returns {Object} Stats summary
     */
    getStats() {
        return this.storage.getStats(getTotalAchievementCount());
    }

    /**
     * Initialize completed levels from score history (if available)
     * This helps track "all levels complete" achievement
     */
    initializeCompletedLevels() {
        // This will be populated from score history when wired into Game.js
        // For now, just initialize empty Set
        this.completedLevels = new Set();
    }

    /**
     * Set completed levels from score history
     * @param {Array<number>} levels - Array of completed level numbers
     */
    setCompletedLevels(levels) {
        this.completedLevels = new Set(levels);
        
        // Check if all levels are now complete
        if (this.completedLevels.size === 22) {
            this.processEvent({ type: 'allLevelsComplete' });
        }
    }

    /**
     * Clear all achievements (for testing)
     */
    clearAll() {
        this.storage.clearAll();
        this.completedLevels.clear();
        if (window.DEBUG_ACHIEVEMENTS) {
            console.log('All achievements cleared');
        }
    }

    /**
     * Export achievement data
     * @returns {string} JSON string
     */
    exportData() {
        return this.storage.exportJSON();
    }

    /**
     * Import achievement data
     * @param {string} jsonString - JSON data
     * @returns {boolean} Success status
     */
    importData(jsonString) {
        return this.storage.importJSON(jsonString);
    }
}
