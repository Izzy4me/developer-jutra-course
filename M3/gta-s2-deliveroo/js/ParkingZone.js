/**
 * ParkingZone - Drawable parking zone (rotated rect)
 * Represents target parking areas for level completion
 */
export class ParkingZone {
    constructor(props) {
        this.x = props.x;
        this.y = props.y;
        this.w = props.w;
        this.l = props.l;
        this.angle = props.angle * (Math.PI / 180);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.strokeStyle = 'rgba(46, 204, 113, 0.8)';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(-this.l/2, -this.w/2, this.l, this.w);
        
        ctx.fillStyle = 'rgba(46, 204, 113, 0.1)';
        ctx.fillRect(-this.l/2, -this.w/2, this.l, this.w);
        
        ctx.restore();
    }
}
