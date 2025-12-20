/**
 * EffectsRenderer - Handles visual effects rendering
 * 
 * Renders:
 * - Bonk explosion effect on collision
 * - Parking hint message
 * - Screen shake effect
 */

export class EffectsRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * Apply screen shake effect to canvas transform
     * @param {number} intensity - Shake intensity (0-1)
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @returns {Object} - { offsetX, offsetY } for restoration
     */
    applyScreenShake(intensity, canvasWidth, canvasHeight) {
        if (intensity <= 0) return { offsetX: 0, offsetY: 0 };
        
        // Intensity should be 0-1, multiply by max shake pixels (10)
        const offsetX = (Math.random() - 0.5) * intensity * 10;
        const offsetY = (Math.random() - 0.5) * intensity * 10;
        this.ctx.translate(offsetX, offsetY);
        
        return { offsetX, offsetY };
    }

    /**
     * Draw comic-style explosion effect ("BONK!")
     * @param {Object} position - { x, y }
     */
    drawBonk(position) {
        this.ctx.save();
        this.ctx.translate(position.x, position.y);
        
        // Comic Flash (Star)
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.strokeStyle = '#c0392b';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        for(let i=0; i<16; i++) {
            const angle = (Math.PI*2/16) * i;
            const r = (i%2===0) ? 70 : 45; 
            this.ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Text "BONK!"
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 4;
        this.ctx.font = "bold 28px Verdana";
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        this.ctx.strokeText("BONK!", 0, 0);
        this.ctx.fillText("BONK!", 0, 0);
        
        this.ctx.restore();
    }

    /**
     * Draw parking hint message
     * @param {number} time - Current time for pulsing effect
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    drawParkingHint(time, canvasWidth, canvasHeight) {
        // Draw hint message when player is in parking zone but hasn't applied brake
        const hintY = canvasHeight - 150;
        
        // Semi-transparent background box
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        this.ctx.fillRect(0, hintY - 30, canvasWidth, 60);
        
        // Border
        this.ctx.strokeStyle = '#f39c12';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, hintY - 30, canvasWidth, 60);
        
        // Hint text
        this.ctx.font = 'bold 20px Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Text shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillText('Zaciągnij hamulec ręczny, aby zakończyć parkowanie', canvasWidth / 2 + 2, hintY + 2);
        
        // Main text (pulsing effect)
        const pulse = Math.sin(time * 0.005) * 0.3 + 0.7;
        this.ctx.fillStyle = `rgba(243, 156, 18, ${pulse})`;
        this.ctx.fillText('Zaciągnij hamulec ręczny, aby zakończyć parkowanie', canvasWidth / 2, hintY);
        
        // SPACE key icon
        this.ctx.font = 'bold 16px monospace';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('(SPACJA)', canvasWidth / 2, hintY + 25);
    }
}
