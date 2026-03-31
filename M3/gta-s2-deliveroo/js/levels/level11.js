export default function(canvas, { ObstacleCar, ParkingZone, Curb }) {
    return {
        name: "Koperta",
        type: 'street',
        start: { x: 100, y: canvas.height/2 + 35, angle: 0 },
        obstacles: [],
        cars: [
            new ObstacleCar({x: 600, y: canvas.height/2 + 35, angle: -3, type: 'suv', color: '#e67e22'}),
            new ObstacleCar({x: 870, y: canvas.height/2 + 35, angle: 5, type: 'suv', color: '#8e44ad'})
        ],
        parkingZones: [ new ParkingZone({x: 735, y: canvas.height/2 + 35, w: 70, l: 130, angle: 0 }) ],
        curbs: [
            new Curb(canvas.width/2, canvas.height/2 - 120, 100, canvas.width, 0),
            new Curb(canvas.width/2, canvas.height/2 + 120, 100, canvas.width, 0),
        ]
    };
}
