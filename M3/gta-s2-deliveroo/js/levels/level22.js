export default function(canvas, { NpcCar, ParkingZone, Curb }) {
    return {
        name: "Ciężarówka na skrzyżowaniu",
        type: 'street_crossing',
        requiresVehicle: 'TRUCK', // Force TRUCK selection for this level
        start: { x: canvas.width/2 - 35, y: 100 + 35, angle: 90 },
        obstacles: [],
        cars: [
            // Normal traffic (calm behavior) - 3 cars
            new NpcCar({
                x: canvas.width - 0, 
                y: canvas.height/2 - 35, 
                angle: 180, 
                speed: -5,
                kind: 'normal',
                type: 'sedan', 
                color: '#3498db'
            }),
            new NpcCar({
                x: canvas.width - 300,
                y: canvas.height/2 - 35,
                angle: 180,
                speed: -5,
                kind: 'normal',
                type: 'compact',
                color: '#2ecc71'
            }),
            new NpcCar({
                x: canvas.width - 600,
                y: canvas.height/2 - 35,
                angle: 180,
                speed: -11,
                kind: 'normal',
                type: 'compact',
                color: '#9b59b6'
            }),
            // Aggressive traffic (single sport car) - 1 car
            new NpcCar({
                x: canvas.width / 2, 
                y: canvas.height/2 - 35, 
                angle: 180, 
                speed: -18,
                kind: 'aggressive',
                type: 'sport',
                color: '#e74c3c'
            }),
        ],
        parkingZones: [
            new ParkingZone({
                x: canvas.width/2 - 400, 
                y: canvas.height/2 - 35, 
                w: 70,
                l: 200,  // Extended for TRUCK (180px length)
                angle: 0
            })
        ],
        curbs: [
            // Top-left quadrant
            new Curb((canvas.width/2 - 120)/2, canvas.height/2 - 120, 100, canvas.width/2 - 20, 0),
            new Curb(canvas.width/2 - 120, (canvas.height/2 - 120)/2, 100, canvas.height/2 - 120, 90 * Math.PI/180),
            // Top-right quadrant
            new Curb(canvas.width/2 + 120 + (canvas.width/2 - 120)/2, canvas.height/2 - 120, 100, canvas.width/2 - 20, 0),
            new Curb(canvas.width/2 + 120, (canvas.height/2 - 120)/2, 100, canvas.height/2 - 120, 90 * Math.PI/180),
            // Bottom-left quadrant
            new Curb((canvas.width/2 - 120)/2, canvas.height/2 + 120, 100, canvas.width/2 - 20, 0),
            new Curb(canvas.width/2 - 120, canvas.height/2 + 120 + (canvas.height/2 - 120)/2, 100, canvas.height/2 - 120, 90 * Math.PI/180),
            // Bottom-right quadrant
            new Curb(canvas.width/2 + 120 + (canvas.width/2 - 120)/2, canvas.height/2 + 120, 100, canvas.width/2 - 20, 0),
            new Curb(canvas.width/2 + 120, canvas.height/2 + 120 + (canvas.height/2 - 120)/2, 100, canvas.height/2 - 120, 90 * Math.PI/180),
        ]
    };
}
