export default function(canvas, { NpcCar, ParkingZone, Curb }) {
    return {
        name: "Skrzyżowanie",
        type: 'street_crossing',
        start: { x: canvas.width/2 - 35, y: 100 + 35, angle: 90 },
        obstacles: [],
        cars: [
            new NpcCar({x: canvas.width - 0, y: canvas.height/2 - 35, angle: 180, speed: -5, type: 'sedan', color: '#990212'}),
            new NpcCar({x: canvas.width - 250, y: canvas.height/2 - 35, angle: 180, speed: -5, type: 'compact', color: '#ee8135'}),
            new NpcCar({x: canvas.width - 500, y: canvas.height/2 - 35, angle: 180, speed: -5, type: 'compact', color: '#6e0c21'}),
            new NpcCar({x: canvas.width - 750, y: canvas.height/2 - 35, angle: 180, speed: -5, type: 'suv', color: '#9a8135'}),
            new NpcCar({x: canvas.width - 1000, y: canvas.height/2 - 35, angle: 180, speed: -5, type: 'suv', color: '#e74c3c'}),
            new NpcCar({x: canvas.width - 1250, y: canvas.height/2 - 35, angle: 180, speed: -5, type: 'compact', color: '#71797e'}),
            
        ],
        parkingZones: [
            new ParkingZone({x: canvas.width/2 - 35, y: canvas.height - 100, w: 70, l: 130, angle: 90})
        ],
        curbs: [
            new Curb((canvas.width/2 - 120)/2, canvas.height/2 - 120, 100, canvas.width/2 - 20, 0),
            new Curb(canvas.width/2 - 120, (canvas.height/2 - 120)/2, 100, canvas.height/2 - 120, 90 * Math.PI/180),
            new Curb(canvas.width/2 + 120 + (canvas.width/2 - 120)/2, canvas.height/2 - 120, 100, canvas.width/2 - 20, 0),
            new Curb(canvas.width/2 + 120, (canvas.height/2 - 120)/2, 100, canvas.height/2 - 120, 90 * Math.PI/180),
            new Curb((canvas.width/2 - 120)/2, canvas.height/2 + 120, 100, canvas.width/2 - 20, 0),
            new Curb(canvas.width/2 - 120, canvas.height/2 + 120 + (canvas.height/2 - 120)/2, 100, canvas.height/2 - 120, 90 * Math.PI/180),
            new Curb(canvas.width/2 + 120 + (canvas.width/2 - 120)/2, canvas.height/2 + 120, 100, canvas.width/2 - 20, 0),
            new Curb(canvas.width/2 + 120, canvas.height/2 + 120 + (canvas.height/2 - 120)/2, 100, canvas.height/2 - 120, 90 * Math.PI/180),
        ]
    };
}
