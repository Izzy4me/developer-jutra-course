export default function(canvas, { ObstacleCar, ParkingZone, Curb }) {
    return {
        name: "Parking",
        type: 'lot',
        start: { x: 100, y: 360, angle: 0 },
        obstacles: [],
        cars: [
            new ObstacleCar({x: 255, y: 267, angle: 86, type: 'suv', color: '#298049'}),
            new ObstacleCar({x: 395, y: 262, angle: 94, type: 'suv', color: '#34495e'}),
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
