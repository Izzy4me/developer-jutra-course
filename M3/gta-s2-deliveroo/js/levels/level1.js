export default function(canvas, { Pillar, ParkingZone, Curb }) {
    return {
        name: "Pusty Parking",
        type: 'lot',
        start: { x: 100, y: 360, angle: 0 },
        obstacles: [ new Pillar(255, 430), new Pillar(395, 430), new Pillar(465, 430), new Pillar(605, 430) ],
        cars: [],
        parkingZones: [ new ParkingZone({x: 395, y: 260, w: 70, l: 120, angle: 90}) ],
        curbs: [
            new Curb(canvas.width/2, 20, 40, canvas.width, 0),
            new Curb(canvas.width/2, canvas.height-20, 40, canvas.width, 0),
            // new Curb(20, canvas.height/2, canvas.height, 40, 90 * Math.PI/180),
            // new Curb(canvas.width-20, canvas.height/2, canvas.height, 40, 90 * Math.PI/180)
        ]
    };
}
