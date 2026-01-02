/**
 * ScoreCalculator - Parking score calculation utilities
 * 
 * Calculates parking quality based on industry-standard metrics:
 * - 50% Lateral centering (most critical for door clearance)
 * - 20% Longitudinal centering
 * - 20% Angular alignment
 * - 10% Margin from edges
 */

import * as geom from './utils/geom.js';

export class ScoreCalculator {
    /**
     * Calculates parking score based on player position relative to parking zone
     * @param {Object} player - Player car object with x, y, angle, w, l properties
     * @param {Object} zone - Parking zone object with x, y, angle, w, l, parkingType properties
     * @returns {number} Score from 0-100
     */
    static calculateParkingScore(player, zone) {
        // 1. Lateral centering (perpendicular to zone orientation)
        // This is the most important - ensures doors can open
        const zoneCenterX = zone.x;
        const zoneCenterY = zone.y;
        const carCenterX = player.x;
        const carCenterY = player.y;
        
        // Calculate distance from zone center
        const dx = carCenterX - zoneCenterX;
        const dy = carCenterY - zoneCenterY;
        
        // Rotate the difference vector to align with zone's local coordinate system
        const zoneAngle = zone.angle || 0;
        const cosAngle = Math.cos(-zoneAngle);
        const sinAngle = Math.sin(-zoneAngle);
        const localX = dx * cosAngle - dy * sinAngle; // Longitudinal offset
        const localY = dx * sinAngle + dy * cosAngle; // Lateral offset
        
        // Calculate lateral centering score (50% weight)
        // Perfect centering = 100%, touching edge = 0%
        const maxLateralOffset = zone.w / 2 - player.w / 2; // Max distance before touching edge
        const lateralOffset = Math.abs(localY);
        const lateralScore = Math.max(0, 100 * (1 - lateralOffset / maxLateralOffset));
        
        // 2. Longitudinal centering score (20% weight)
        const maxLongitudinalOffset = zone.l / 2 - player.l / 2;
        const longitudinalOffset = Math.abs(localX);
        const longitudinalScore = Math.max(0, 100 * (1 - longitudinalOffset / maxLongitudinalOffset));
        
        // 3. Angular alignment score (20% weight)
        // Check how parallel the car is to the parking zone
        let targetAngle = zoneAngle;
        if (zone.parkingType === 'reverse') {
            // For reverse parking, target angle is 180° opposite
            targetAngle = zoneAngle + Math.PI;
        }
        
        const angleDiff = Math.atan2(
            Math.sin(player.angle - targetAngle),
            Math.cos(player.angle - targetAngle)
        );
        const angleDiffDegrees = Math.abs(angleDiff * 180 / Math.PI);
        // Perfect alignment = 100%, 15° off = 0%
        const angularScore = Math.max(0, 100 * (1 - angleDiffDegrees / 15));
        
        // 4. Margin from edges (10% weight)
        // Reward having safety buffer from all edges
        const carCorners = geom.getCorners(player.x, player.y, player.w, player.l, player.angle);
        const zoneCorners = geom.getCorners(zone.x, zone.y, zone.w, zone.l, zone.angle || 0);
        
        // Calculate minimum distance from car edges to zone edges
        let minMarginScore = 100;
        carCorners.forEach(carCorner => {
            // Transform car corner to zone's local space
            const cdx = carCorner.x - zone.x;
            const cdy = carCorner.y - zone.y;
            const localCornerX = cdx * cosAngle - cdy * sinAngle;
            const localCornerY = cdx * sinAngle + cdy * cosAngle;
            
            // Distance from edges (in zone's local space)
            const distFromLeftEdge = Math.abs(localCornerY + zone.w / 2);
            const distFromRightEdge = Math.abs(localCornerY - zone.w / 2);
            const distFromTopEdge = Math.abs(localCornerX + zone.l / 2);
            const distFromBottomEdge = Math.abs(localCornerX - zone.l / 2);
            
            const minDist = Math.min(distFromLeftEdge, distFromRightEdge, distFromTopEdge, distFromBottomEdge);
            
            // Ideal margin is ~10 pixels, anything less reduces score
            const idealMargin = 10;
            const marginRatio = Math.min(minDist / idealMargin, 1);
            minMarginScore = Math.min(minMarginScore, marginRatio * 100);
        });
        
        // Weighted final score
        const finalScore = (
            lateralScore * 0.50 +
            longitudinalScore * 0.20 +
            angularScore * 0.20 +
            minMarginScore * 0.10
        );
        
        return Math.round(finalScore);
    }

    /**
     * Returns medal emoji based on score
     * @param {number} score - Score from 0-100
     * @returns {string} Medal emoji
     */
    static getMedalForScore(score) {
        if (score >= 85) return '🥇'; // Gold
        if (score > 67) return '🥈';  // Silver (>67 and <85)
        if (score >= 50) return '🥉'; // Bronze (50-67)
        return '⭐'; // Star for scores below 50%
    }
}
