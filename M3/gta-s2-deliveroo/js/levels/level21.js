export default function(canvas, { Pillar, ObstacleCar, ParkingZone, Curb }) {
    return {
        name: "Parkowanie tyłem",
        type: 'lot',
        subtype: 'reverse',
        start: { x: 100, y: 360, angle: 0 },
        obstacles: [
          new Pillar(255, 430),
          new Pillar(325, 520),
          new Pillar(395, 430),
          new Pillar(465, 430),
          new Pillar(535, 520),
          new Pillar(605, 430),
          new Pillar(325, 185),
          new Pillar(535, 185),
          new Pillar(605, 260),
        ],
        cars: [
            new ObstacleCar({x: 255, y: 260, angle: 90, type: 'suv', color: '#8e44ad'}),
            new ObstacleCar({x: 395, y: 260, angle: 90, type: 'sedan', color: '#c0392b'}),
            new ObstacleCar({x: 465, y: 260, angle: 90, type: 'compact', color: '#27ae60'}),
        ],
        parkingZones: [
            new ParkingZone({x: 325, y: 260, w: 70, l: 120, angle: 270, parkingType: 'reverse'}),
            new ParkingZone({x: 535, y: 260, w: 70, l: 120, angle: 270, parkingType: 'reverse'})
        ],
        curbs: [
            new Curb(canvas.width/2, 20, 40, canvas.width, 0),
            new Curb(canvas.width/2, canvas.height-20, 40, canvas.width, 0),
        ]
    };
}
