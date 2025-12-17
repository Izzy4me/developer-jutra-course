export default function(canvas, { Pillar, ObstacleCar, ParkingZone, Curb }) {
    return {
        name: "Parking",
        type: 'lot',
        start: { x: 100, y: 360, angle: 0 },
        obstacles: [ new Pillar(255, 430), new Pillar(395, 430), new Pillar(465, 430), new Pillar(605, 430) ],
        cars: [
            new ObstacleCar({x: 255, y: 260, angle: 90, type: 'suv', color: '#8e44ad'}),
            new ObstacleCar({x: 395, y: 260, angle: 90, type: 'sedan', color: '#c0392b'}),
            new ObstacleCar({x: 465, y: 260, angle: 90, type: 'compact', color: '#27ae60'}),
            new ObstacleCar({x: 605, y: 260, angle: 90, type: 'suv', color: '#f39c12'}),
            new ObstacleCar({x: 325, y: 460, angle: 90, type: 'compact', color: '#16a085'}),
            new ObstacleCar({x: 535, y: 460, angle: 90, type: 'sedan', color: '#2980b9'})
        ],
        parkingZones: [
            new ParkingZone({x: 325, y: 260, w: 70, l: 120, angle: 90}),
            new ParkingZone({x: 535, y: 260, w: 70, l: 120, angle: 90})
        ],
        curbs: [
            new Curb(canvas.width/2, 20, 40, canvas.width, 0),
            new Curb(canvas.width/2, canvas.height-20, 40, canvas.width, 0),
            // new Curb(20, canvas.height/2, canvas.height, 40, 90 * Math.PI/180),
            // new Curb(canvas.width-20, canvas.height/2, canvas.height, 40, 90 * Math.PI/180)
        ]
    };
}
