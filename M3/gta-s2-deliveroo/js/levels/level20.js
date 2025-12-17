export default function(canvas, { NpcCar, ParkingZone, Curb }) {
    return {
        name: "Ekspresówka",
        type: 'highway',
        start: { x: 275, y: canvas.height/2 - 120, angle: 0 },
        obstacles: [],
        cars: [
            // Górne pasy (→→→) - jadą w prawo
            // Pas 1 (górny)
            new NpcCar({x: 0, y: canvas.height/2 - 205, angle: 0, speed: 10, type: 'sedan', color: '#e74c3c'}),
            new NpcCar({x: 450, y: canvas.height/2 - 210, angle: 0, speed: 14, kind: 'aggressive', type: 'compact', color: '#3498db'}),
            new NpcCar({x: 750, y: canvas.height/2 - 200, angle: 0, speed: 11, kind: 'aggressive', type: 'suv', color: '#9b59b6'}),
            new NpcCar({x: 1050, y: canvas.height/2 - 205, angle: 0, speed: 13, kind: 'aggressive', type: 'sedan', color: '#f39c12'}),
            new NpcCar({x: 1350, y: canvas.height/2 - 213, angle: 0, speed: 15, kind: 'aggressive', type: 'compact', color: '#1abc9c'}),

            // Pas 2 (środkowy górny)
            new NpcCar({x: 0, y: canvas.height/2 - 125, angle: 0, speed: 10, kind: 'aggressive', type: 'suv', color: '#34495e'}),
            new NpcCar({x: 400, y: canvas.height/2 - 120, angle: 0, speed: 12, kind: 'aggressive', type: 'sedan', color: '#e67e22'}),
            new NpcCar({x: 700, y: canvas.height/2 - 130, angle: 0, speed: 11, type: 'compact', color: '#16a085'}),
            new NpcCar({x: 950, y: canvas.height/2 - 127, angle: 0, speed: 13, kind: 'aggressive', type: 'suv', color: '#c0392b'}),
            new NpcCar({x: 1250, y: canvas.height/2 - 121, angle: 0, speed: 14, kind: 'aggressive', type: 'sedan', color: '#8e44ad'}),
            new NpcCar({x: 1550, y: canvas.height/2 - 130, angle: 0, speed: 10, type: 'compact', color: '#2c3e50'}),

            // Dolne pasy (←←←) - jadą w lewo
            // Pas 3 (środkowy dolny)
            new NpcCar({x: canvas.width - 150, y: canvas.height/2 + 125, angle: 180, speed: -11, kind: 'aggressive', type: 'sedan', color: '#95a5a6'}),
            new NpcCar({x: canvas.width - 450, y: canvas.height/2 + 125, angle: 180, speed: -13, kind: 'aggressive', type: 'compact', color: '#d35400'}),
            new NpcCar({x: canvas.width - 750, y: canvas.height/2 + 125, angle: 180, speed: -12, kind: 'aggressive', type: 'suv', color: '#27ae60'}),
            new NpcCar({x: canvas.width - 1050, y: canvas.height/2 + 125, angle: 180, speed: -14, kind: 'aggressive', type: 'sedan', color: '#2980b9'}),
            new NpcCar({x: canvas.width - 1350, y: canvas.height/2 + 125, angle: 180, speed: -10, type: 'compact', color: '#8e44ad'}),

            // Pas 4 (dolny)
            new NpcCar({x: canvas.width - 250, y: canvas.height/2 + 205, angle: 180, speed: -15, kind: 'aggressive', type: 'suv', color: '#e74c3c'}),
            new NpcCar({x: canvas.width - 500, y: canvas.height/2 + 205, angle: 180, speed: -12, kind: 'aggressive', type: 'sedan', color: '#f39c12'}),
            new NpcCar({x: canvas.width - 800, y: canvas.height/2 + 205, angle: 180, speed: -13, type: 'compact', color: '#1abc9c'}),
            new NpcCar({x: canvas.width - 1100, y: canvas.height/2 + 205, angle: 180, speed: -11, kind: 'aggressive', type: 'suv', color: '#34495e'}),
            new NpcCar({x: canvas.width - 1400, y: canvas.height/2 + 205, angle: 180, speed: -14, kind: 'aggressive', type: 'sedan', color: '#c0392b'}),
            new NpcCar({x: canvas.width - 1650, y: canvas.height/2 + 205, angle: 180, speed: -16, type: 'compact', color: '#16a085'}),
        ],
        parkingZones: [
            // Parking na poboczu (górna strona)
            new ParkingZone({x: 200, y: canvas.height/2 + 123, w: 84, l: 120, angle: 0})
        ],
        curbs: [
            // Górna krawędź
            new Curb(canvas.width/2, canvas.height/2 - 320, 80, canvas.width, 0),
            // Dolna krawędź
            new Curb(canvas.width/2, canvas.height/2 + 320, 80, canvas.width, 0),
        ]
    };
}
