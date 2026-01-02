/**
 * ToastRenderer.js - Renders achievement toast notifications at bottom of screen
 * Displays unlocked achievements with slide-in animation
 */

export class ToastRenderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.toastQueue = []; // Queue of active toasts
        this.maxToasts = 3; // Maximum simultaneous toasts
        
        // Animation timing (in seconds)
        this.slideInDuration = 0.75;
        this.displayDuration = 3.5;
        this.fadeOutDuration = 0.75;
        this.totalDuration = this.slideInDuration + this.displayDuration + this.fadeOutDuration;
    }

    /**
     * Show a new achievement toast
     * @param {Object} achievement - Achievement data with title, description, etc.
     */
    show(achievement) {
        // Don't add more than max toasts
        if (this.toastQueue.length >= this.maxToasts) {
            // Could optionally queue for later, but for now just skip
            console.warn('Toast queue full, skipping:', achievement.title);
            return;
        }

        const toast = {
            achievement,
            startTime: Date.now(),
            state: 'sliding-in', // 'sliding-in', 'displaying', 'fading-out', 'done'
        };

        this.toastQueue.push(toast);
    }

    /**
     * Update toast states and remove completed ones
     */
    update() {
        const now = Date.now();

        // Remove completed toasts
        this.toastQueue = this.toastQueue.filter(toast => {
            const elapsed = (now - toast.startTime) / 1000; // Convert to seconds
            return elapsed < this.totalDuration;
        });

        // Update states
        this.toastQueue.forEach(toast => {
            const elapsed = (now - toast.startTime) / 1000;

            if (elapsed < this.slideInDuration) {
                toast.state = 'sliding-in';
            } else if (elapsed < this.slideInDuration + this.displayDuration) {
                toast.state = 'displaying';
            } else {
                toast.state = 'fading-out';
            }
        });
    }

    /**
     * Draw all active toasts
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    draw(canvasWidth, canvasHeight) {
        if (this.toastQueue.length === 0) {
            return;
        }

        this.update();

        // Draw toasts from bottom up
        this.toastQueue.forEach((toast, index) => {
            const yOffset = index * 100; // Stack toasts vertically
            this.drawToast(toast, canvasWidth, canvasHeight, yOffset);
        });
    }

    /**
     * Draw a single toast notification
     * @param {Object} toast - Toast data
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @param {number} yOffset - Vertical offset for stacking
     */
    drawToast(toast, canvasWidth, canvasHeight, yOffset) {
        const now = Date.now();
        const elapsed = (now - toast.startTime) / 1000;

        // Calculate base position (bottom center, matching parking hint)
        const baseY = canvasHeight - 80 - yOffset;
        const toastWidth = 400;
        const toastHeight = 80;
        const centerX = canvasWidth / 2;
        const toastX = centerX - toastWidth / 2;

        // Calculate animation offset and opacity
        let yPosition = baseY;
        let opacity = 1.0;

        if (toast.state === 'sliding-in') {
            // Slide in from bottom
            const progress = elapsed / this.slideInDuration;
            const slideOffset = (1 - this.easeOutCubic(progress)) * 100; // Slide up 100px
            yPosition = baseY + slideOffset;
            opacity = progress; // Fade in simultaneously
        } else if (toast.state === 'fading-out') {
            // Fade out
            const fadeElapsed = elapsed - (this.slideInDuration + this.displayDuration);
            const progress = fadeElapsed / this.fadeOutDuration;
            opacity = 1 - progress;
        }

        // Don't draw if fully transparent
        if (opacity <= 0) {
            return;
        }

        // Save context state
        this.ctx.save();
        this.ctx.globalAlpha = opacity;

        // Draw background with gradient
        const gradient = this.ctx.createLinearGradient(toastX, yPosition - 40, toastX, yPosition + 40);
        gradient.addColorStop(0, 'rgba(46, 204, 113, 0.95)'); // Green
        gradient.addColorStop(1, 'rgba(39, 174, 96, 0.95)'); // Darker green

        // Background
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(toastX, yPosition - 40, toastWidth, toastHeight);

        // Border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(toastX, yPosition - 40, toastWidth, toastHeight);

        // Trophy icon (left side)
        this.ctx.font = 'bold 32px Arial, sans-serif';
        this.ctx.fillStyle = '#FFD700'; // Gold
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🏆', toastX + 30, yPosition);

        // Achievement title
        this.ctx.font = 'bold 16px Arial, sans-serif';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(toast.achievement.title, toastX + 60, yPosition - 28);

        // Achievement description
        this.ctx.font = '12px Arial, sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillText(toast.achievement.description, toastX + 60, yPosition - 8);

        // Unlock date (if available)
        if (toast.achievement.unlockedDate) {
            const date = new Date(toast.achievement.unlockedDate);
            const dateStr = date.toLocaleTimeString('pl-PL', { 
                hour: '2-digit', 
                minute: '2-digit'
            });
            this.ctx.font = '10px Arial, sans-serif';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(dateStr, toastX + toastWidth - 10, yPosition + 20);
        }

        // Category badge (top right)
        if (toast.achievement.category) {
            this.ctx.font = 'bold 10px Arial, sans-serif';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(toast.achievement.category, toastX + toastWidth - 10, yPosition - 28);
        }

        // Restore context state
        this.ctx.restore();
    }

    /**
     * Easing function for smooth animation
     * @param {number} t - Progress (0-1)
     * @returns {number} Eased value
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Clear all toasts
     */
    clearAll() {
        this.toastQueue = [];
    }

    /**
     * Get number of active toasts
     * @returns {number} Active toast count
     */
    getActiveCount() {
        return this.toastQueue.length;
    }
}
