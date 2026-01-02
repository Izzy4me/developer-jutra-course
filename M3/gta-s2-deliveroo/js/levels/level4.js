export default function(canvas, { ObstacleCar, ParkingZone, Curb }) {
    return {
        name: "Parking",
        type: 'lot',
        start: { x: 100, y: 360, angle: 0 },
        obstacles: [],
        cars: [
            new ObstacleCar({x: 265, y: 267, angle: 81, type: 'suv', color: '#8e44ad'}),
            new ObstacleCar({x: 384, y: 262, angle: 76, type: 'suv', color: '#c0392b'}),
        ],
        parkingZones: [
            new ParkingZone({x: 325, y: 260, w: 70, l: 120, angle: 90})
        ],
        curbs: [
            new Curb(canvas.width/2, 20, 40, canvas.width, 0),
            new Curb(canvas.width/2, canvas.height-20, 40, canvas.width, 0),
        ]
    };
}
