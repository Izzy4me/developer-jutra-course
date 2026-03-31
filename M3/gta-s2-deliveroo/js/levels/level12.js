export default function(canvas, { ObstacleCar, NpcCar, ParkingZone, Curb }) {
    return {
        name: "Koperta na stresie",
        type: 'street',
        start: { x: 100, y: canvas.height/2 + 35, angle: 0 },
        obstacles: [],
        cars: [
            new ObstacleCar({x: 600, y: canvas.height/2 + 35, angle: -3, type: 'suv', color: '#e67e22'}),
            new ObstacleCar({x: 870, y: canvas.height/2 + 35, angle: 5, type: 'suv', color: '#8e44ad'}),
            new NpcCar({x: canvas.width, y: canvas.height/2 - 35, angle: 180, speed: -3, type: 'suv', color: '#9b59b6'}),
            new NpcCar({x: canvas.width * 3/4, y: canvas.height/2 - 35, angle: 180, speed: -3, type: 'suv', color: '#333333'}),
            new NpcCar({x: canvas.width * 1/4, y: canvas.height/2 - 35, angle: 180, speed: -3, type: 'compact', color: '#ee8135'}),
            new NpcCar({x: canvas.width * 2/4, y: canvas.height/2 - 35, angle: 180, speed: -3, type: 'compact', color: '#6e0c21'}),
        ],
        parkingZones: [ new ParkingZone({x: 735, y: canvas.height/2 + 35, w: 70, l: 130, angle: 0 }) ],
        curbs: [
            new Curb(canvas.width/2, canvas.height/2 - 120, 100, canvas.width, 0),
            new Curb(canvas.width/2, canvas.height/2 + 120, 100, canvas.width, 0),
        ]
    };
}
