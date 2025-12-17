export default function(canvas, { NpcCar, ParkingZone, Curb }) {
    return {
        name: "Skrzyżowanie",
        type: 'street_crossing',
        start: { x: canvas.width/2 - 35, y: 100 + 35, angle: 90 },
        obstacles: [],
        cars: [
            new NpcCar({x: canvas.width / 4 * 0, y: canvas.height/2 - 35, angle: 180, speed: -20, type: 'suv', color: '#849292'}),
            new NpcCar({x: canvas.width / 4 * 1, y: canvas.height/2 - 35, angle: 180, speed: -20, type: 'suv', color: '#b4b8ba'}),
            new NpcCar({x: canvas.width / 4 * 2, y: canvas.height/2 - 35, angle: 180, speed: -20, type: 'suv', color: '#ef67ef'}),
            new NpcCar({x: canvas.width / 4 * 3, y: canvas.height/2 - 35, angle: 180, speed: -20, type: 'suv', color: '#8960a8'}),
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
