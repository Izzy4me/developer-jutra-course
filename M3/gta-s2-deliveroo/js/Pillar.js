/**
 * Pillar - Static circular obstacle (pillar) with draw()
 * Represents pillars and circular obstacles in parking lots
 */
export class Pillar {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.r = 12;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); 
        ctx.arc(3, 3, this.r, 0, Math.PI * 2); 
        ctx.fill();
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); 
        ctx.arc(0, 0, this.r, 0, Math.PI * 2); 
        ctx.fill();
        ctx.strokeStyle = '#d35400';
        ctx.lineWidth = 2; 
        ctx.stroke();
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath(); 
        ctx.arc(0, 0, this.r / 2, 0, Math.PI * 2); 
        ctx.fill();
        ctx.restore();
    }
}
