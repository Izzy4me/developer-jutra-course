/**
 * EnvironmentRenderer - Handles background environment drawing
 * 
 * Renders different environment types:
 * - lot: Parking lot with grid lines
 * - street: Simple asphalt road
 * - street-crossing: Intersection with dashed lines
 * - highway: Multi-lane highway with grass median
 */

export class EnvironmentRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * Render background based on environment type
     * @param {string} environmentType - 'lot', 'street', 'street-crossing', 'highway'
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    drawEnvironment(environmentType, canvasWidth, canvasHeight) {
        switch(environmentType) {
            case 'lot':
                this.drawLotEnvironment(canvasWidth, canvasHeight);
                break;
            case 'street':
                this.drawStreetEnvironment(canvasWidth, canvasHeight);
                break;
            case 'street-crossing':
                this.drawStreetCrossingEnvironment(canvasWidth, canvasHeight);
                break;
            case 'highway':
                this.drawHighwayEnvironment(canvasWidth, canvasHeight);
                break;
            default:
                // Unknown environment type, draw default asphalt
                this.ctx.fillStyle = '#444';
                this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
    }

    /**
     * Draw parking lot environment with grid lines
     */
    drawLotEnvironment(canvasWidth, canvasHeight) {
        const spotWidth = 70;
        const spotDepth = 120;
        const startX = 220;
        const startY = 200; // Top row

        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 4;
        
        // Top Row
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(startX + spotWidth * 6, startY);
        for(let i=0; i<=6; i++) {
            this.ctx.moveTo(startX + i * spotWidth, startY);
            this.ctx.lineTo(startX + i * spotWidth, startY + spotDepth);
        }
        this.ctx.stroke();

        // Bottom Row
        const startY2 = 400;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY2 + spotDepth);
        this.ctx.lineTo(startX + spotWidth * 6, startY2 + spotDepth);
        for(let i=0; i<=6; i++) {
            this.ctx.moveTo(startX + i * spotWidth, startY2);
            this.ctx.lineTo(startX + i * spotWidth, startY2 + spotDepth);
        }
        this.ctx.stroke();
        
        // "PARKING" Text
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
        this.ctx.font = "bold 55px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText("PARKING", canvasWidth/2, 130);
        this.ctx.restore();
    }

    /**
     * Draw simple street environment with center line
     */
    drawStreetEnvironment(canvasWidth, canvasHeight) {
        const roadY = canvasHeight/2;
        // Asphalt
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight); // Full asphalt base
        
        // Center Line
        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([20, 20]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, roadY);
        this.ctx.lineTo(canvasWidth, roadY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    /**
     * Draw intersection environment with crossing roads
     */
    drawStreetCrossingEnvironment(canvasWidth, canvasHeight) {
        const roadY = canvasHeight / 2;
        const roadX = canvasWidth / 2;
        const intersectionHalfSize = 120;

        // Asphalt
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Center Lines
        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([20, 20]);

        // Horizontal
        this.ctx.beginPath();
        this.ctx.moveTo(0, roadY);
        this.ctx.lineTo(roadX - intersectionHalfSize, roadY);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(roadX + intersectionHalfSize, roadY);
        this.ctx.lineTo(canvasWidth, roadY);
        this.ctx.stroke();

        // Vertical
        this.ctx.beginPath();
        this.ctx.moveTo(roadX, 0);
        this.ctx.lineTo(roadX, roadY - intersectionHalfSize);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(roadX, roadY + intersectionHalfSize);
        this.ctx.lineTo(roadX, canvasHeight);
        this.ctx.stroke();

        this.ctx.setLineDash([]);
    }

    /**
     * Draw highway environment with multiple lanes and grass median
     */
    drawHighwayEnvironment(canvasWidth, canvasHeight) {
        const laneHeight = 85; // Wysokość jednego pasa
        const grassHeight = 160; // Wysokość pasa zieleni
        const topLanesY = canvasHeight / 2 - grassHeight / 2 - laneHeight * 2;

        // Asphalt - full background
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // === GÓRNE 2 PASY (→→→) ===
        const lane1Y = topLanesY + laneHeight * 0.5;
        const lane2Y = topLanesY + laneHeight * 1.5;

        // Linia oddzielająca pasy (przerywana biała)
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([30, 20]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, topLanesY + laneHeight);
        this.ctx.lineTo(canvasWidth, topLanesY + laneHeight);
        this.ctx.stroke();

        // === PAS ZIELENI (środek) ===
        const grassY = topLanesY + laneHeight * 2;

        // Rysuj trawę (użyj tekstury lub kolor zielony)
        this.ctx.fillStyle = '#4a7c3a'; // Ciemnozielony base
        this.ctx.fillRect(0, grassY, canvasWidth, grassHeight);

        // Dodaj teksturę trawy (jeśli załadowana)
        const grassImg = new Image();
        grassImg.src = 'grass-textures.jpg';
        if (grassImg.complete) {
            const pattern = this.ctx.createPattern(grassImg, 'repeat');
            if (pattern) {
                this.ctx.fillStyle = pattern;
                this.ctx.fillRect(0, grassY, canvasWidth, grassHeight);
            }
        }

        // === DOLNE 2 PASY (←←←) ===
        const bottomLanesY = grassY + grassHeight;
        const lane3Y = bottomLanesY + laneHeight * 0.5;
        const lane4Y = bottomLanesY + laneHeight * 1.5;

        // Linia oddzielająca pasy (przerywana biała)
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([30, 20]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, bottomLanesY + laneHeight);
        this.ctx.lineTo(canvasWidth, bottomLanesY + laneHeight);
        this.ctx.stroke();

        // === LINIE KRAWĘDZIOWE (ciągłe białe) ===
        this.ctx.setLineDash([]);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3;

        // Górna krawędź autostrady
        this.ctx.beginPath();
        this.ctx.moveTo(0, topLanesY);
        this.ctx.lineTo(canvasWidth, topLanesY);
        this.ctx.stroke();

        // Dolna krawędź autostrady
        this.ctx.beginPath();
        this.ctx.moveTo(0, bottomLanesY + laneHeight * 2);
        this.ctx.lineTo(canvasWidth, bottomLanesY + laneHeight * 2);
        this.ctx.stroke();

        // Krawędzie pasa zieleni
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, grassY);
        this.ctx.lineTo(canvasWidth, grassY);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(0, grassY + grassHeight);
        this.ctx.lineTo(canvasWidth, grassY + grassHeight);
        this.ctx.stroke();

        this.ctx.setLineDash([]);

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255,255,255,0.08)';
        this.ctx.font = "bold 60px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText("S2 (OBWODNICA WARSZAFKI)", canvasWidth/2, 50);
        this.ctx.restore();
    }
}
