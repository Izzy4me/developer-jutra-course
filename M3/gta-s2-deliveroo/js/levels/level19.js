export default function(canvas, { NpcCar, ParkingZone, Curb }) {
    return {
        name: "Skrzyżowanie",
        type: 'street_crossing',
        start: { x: canvas.width/2 - 35, y: 100 + 35, angle: 90 },
        obstacles: [],
        cars: [
            new NpcCar({x: canvas.width / 5 * 0, y: canvas.height/2 - 35, angle: 180, speed: -30, type: 'suv', color: '#849292'}),
            new NpcCar({x: canvas.width / 5 * 1, y: canvas.height/2 - 35, angle: 180, speed: -30, type: 'suv', color: '#b4b8ba'}),
            new NpcCar({x: canvas.width / 5 * 2, y: canvas.height/2 - 35, angle: 180, speed: -30, type: 'suv', color: '#ef67ef'}),
            new NpcCar({x: canvas.width / 5 * 3, y: canvas.height/2 - 35, angle: 180, speed: -30, type: 'suv', color: '#8960a8'}),
            new NpcCar({x: canvas.width / 5 * 4, y: canvas.height/2 - 35, angle: 180, speed: -30, type: 'suv', color: '#333333'}),
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
