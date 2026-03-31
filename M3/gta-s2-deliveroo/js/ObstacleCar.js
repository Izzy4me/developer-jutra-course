/**
 * ObstacleCar - Static obstacle car (drawable) used for parked cars
 * Represents non-moving vehicles in the game world
 */
export class ObstacleCar {
    constructor(props) {
        this.x = props.x;
        this.y = props.y;
        this.angle = props.angle * (Math.PI / 180);
        
        // Randomize size slightly based on type if not provided
        const type = props.type || 'sedan'; 
        if (type === 'suv') { this.w = 50; this.l = 115; }
        else if (type === 'compact') { this.w = 40; this.l = 80; }
        else { this.w = 44; this.l = 90; } // Sedan default

        this.color = props.color || `hsl(${Math.random()*360}, 60%, 50%)`;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(-this.l/2 + 5, -this.w/2 + 5, this.l, this.w);

        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-this.l/2, -this.w/2, this.l, this.w, 5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Windshield (Front) - Trapezoid
        ctx.fillStyle = 'rgba(180, 200, 255, 0.4)'; // Bluish glass
        ctx.beginPath();
        ctx.moveTo(this.l/2 - 10, -this.w/2 + 5);
        ctx.lineTo(this.l/2 - 10, this.w/2 - 5);
        ctx.lineTo(this.l/2 - 25, this.w/2 - 8);
        ctx.lineTo(this.l/2 - 25, -this.w/2 + 8);
        ctx.closePath();
        ctx.fill();

        // Rear window
        ctx.beginPath();
        ctx.moveTo(-this.l/2 + 10, -this.w/2 + 5);
        ctx.lineTo(-this.l/2 + 10, this.w/2 - 5);
        ctx.lineTo(-this.l/2 + 20, this.w/2 - 8);
        ctx.lineTo(-this.l/2 + 20, -this.w/2 + 8);
        ctx.closePath();
        ctx.fill();

        // Headlights (Front)
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(this.l/2 - 4, -this.w/2 + 4, 4, 8);
        ctx.fillRect(this.l/2 - 4, this.w/2 - 12, 4, 8);

        // Taillights (Rear)
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-this.l/2, -this.w/2 + 4, 2, 8);
        ctx.fillRect(-this.l/2, this.w/2 - 12, 2, 8);

        ctx.restore();
    }
}
