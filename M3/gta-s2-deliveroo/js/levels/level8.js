export default function(canvas, { Pillar, NpcCar, ParkingZone, Curb }) {
    return {
        name: "Ulica",
        type: 'street',
        start: { x: 100, y: canvas.height/2 + 35, angle: 0 },
        obstacles: [
            new Pillar(500, canvas.height/2 + 35),
            new Pillar(500 + canvas.width/5, canvas.height/2 + 35),
        ],
        cars: [
            new NpcCar({x: canvas.width, y: canvas.height/2 - 35, angle: 180, speed: -4, type: 'compact',color: '#9b59b6'}),
            new NpcCar({x: canvas.width - 600, y: canvas.height/2 - 35, angle: 180, speed: -7, kind: 'aggressive', type: 'sedan', color: '#34495e'}),
            new NpcCar({x: canvas.width - 300, y: canvas.height/2 - 35, angle: 180, speed: -5, type: 'suv', color: '#9b59b6'}),
        ],
        parkingZones: [ new ParkingZone({x: canvas.width - 100, y: canvas.height/2 + 35, w: 70, l: 130, angle: 0}) ],
        curbs: [
            new Curb(canvas.width/2, canvas.height/2 - 120, 100, canvas.width, 0),
            new Curb(canvas.width/2, canvas.height/2 + 120, 100, canvas.width, 0),
        ]
    };
}
