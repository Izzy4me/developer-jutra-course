export default function(canvas, { NpcCar, ParkingZone, Curb }) {
    return {
        name: "Ulica (Wyprzedzanie)",
        type: 'street',
        start: { x: 100, y: canvas.height/2 + 35, angle: 0 },
        obstacles: [],
        cars: [
            new NpcCar({x: canvas.width - 300, y: canvas.height/2 - 35, angle: 180, speed: -4, color: '#9b59b6'}),
            new NpcCar({x: canvas.width - 100, y: canvas.height/2 - 35, angle: 180, speed: -5.5, kind: 'aggressive', type: 'suv', color: '#812c2c'}),
            new NpcCar({x: canvas.width + 100, y: canvas.height/2 - 35, angle: 180, speed: -3, type: 'suv', color: '#9b59b6'}),
            new NpcCar({x: canvas.width * 1/4, y: canvas.height/2 + 35, angle: 0, speed: 2, color: '#1abc9c'}),
            new NpcCar({x: canvas.width * 2/4, y: canvas.height/2 + 35, angle: 0, speed: 2, color: '#225522'}),
            new NpcCar({x: canvas.width * 3/4, y: canvas.height/2 + 35, angle: 0, speed: 2, color: '#726834'})
        ],
        parkingZones: [ new ParkingZone({x: canvas.width - 100, y: canvas.height/2 + 35, w: 70, l: 100, angle: 0}) ],
        curbs: [
            new Curb(canvas.width/2, canvas.height/2 - 120, 100, canvas.width, 0),
            new Curb(canvas.width/2, canvas.height/2 + 120, 100, canvas.width, 0),
        ]
    };
}
