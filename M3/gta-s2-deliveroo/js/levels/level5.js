export default function(canvas, { ObstacleCar, ParkingZone, Curb }) {
    return {
        name: "Parking",
        type: 'lot',
        start: { x: 100, y: 360, angle: 0 },
        obstacles: [],
        cars: [
            new ObstacleCar({x: 265, y: 267, angle: 286, type: 'suv', color: '#3288bd'}),
            new ObstacleCar({x: 384, y: 262, angle: 296, type: 'suv', color: '#a974cf'}),
            new ObstacleCar({x: 465, y: 260, angle: 270, type: 'compact', color: '#990212'}),
            new ObstacleCar({x: 588, y: 269, angle: 293, type: 'suv', color: '#f39c12'}),
            new ObstacleCar({x: 287, y: 460, angle: 79, type: 'compact', color: '#16a085'}),
            new ObstacleCar({x: 572, y: 460, angle: 90, type: 'sedan', color: '#2980b9'})
        ],
        parkingZones: [
            new ParkingZone({x: 325, y: 260, w: 70, l: 120, angle: 90}),
            new ParkingZone({x: 535, y: 260, w: 70, l: 120, angle: 90}),
            new ParkingZone({x: 325, y: 460, w: 70, l: 120, angle: 90}),
            new ParkingZone({x: 535, y: 460, w: 70, l: 120, angle: 90}),
        ],
        curbs: [
            new Curb(canvas.width/2, 20, 40, canvas.width, 0),
            new Curb(canvas.width/2, canvas.height-20, 40, canvas.width, 0),
        ]
    };
}
