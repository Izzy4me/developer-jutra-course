/**
 * Curb - Static curb / sidewalk drawable rectangle
 * Represents road barriers and sidewalks in the game
 */
export class Curb {
    constructor(x, y, w, l, angle = 0) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.l = l;
        this.angle = angle;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(-this.l/2, -this.w/2, this.l, this.w);
        // Bevel look
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.l/2, -this.w/2, this.l, this.w);
        ctx.restore();
    }
}
