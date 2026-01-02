/**
 * Car Configuration Module
 * Defines specifications for all available car types
 */

export const CAR_CONFIGS = {
    COMPACT: {
        id: 'compact',
        name: 'Compact',
        displayName: 'Compact',
        color: { r: 52, g: 152, b: 219 }, // Blue-ish
        dimensions: {
            carWidth: 44,
            carLength: 90,
            wheelBase: 60
        },
        performance: {
            maxSpeed: 18.0,
            maxReverseSpeed: -5.0,
            carMode: 'normal',
            accelerationNormal: 0.021,
            accelerationSport: 0.15,
            friction: 0.06,
            brakingForce: 0.5,
            maxSteerAngle: 0.65,
            steerSpeed: 0.03,
            tireGrip: 0.85
        }
    },
    SPORT: {
        id: 'sport',
        name: 'Sport',
        displayName: 'Sport',
        color: { r: 255, g: 40, b: 0 }, // Vibrant red
        dimensions: {
            carWidth: 40,
            carLength: 95,
            wheelBase: 65
        },
        performance: {
            maxSpeed: 28.0,
            maxReverseSpeed: -8.0, // Faster reverse
            carMode: 'sport',
            accelerationNormal: 0.08, // Normal mode for sport car
            accelerationSport: 0.18, // Higher sport acceleration
            friction: 0.04, // Less friction = more responsive
            brakingForce: 0.65, // Better brakes
            maxSteerAngle: 0.45, // Sharper steering
            steerSpeed: 0.05, // Faster steering response
            tireGrip: 1.1, // Better grip
            angularDamping: 0.96,
            lateralForceMultiplier: 3.0
        }
    },
    SUV: {
        id: 'suv',
        name: 'SUV',
        displayName: 'SUV',
        color: { r: 46, g: 48, b: 52 }, // Dark gray
        dimensions: {
            carWidth: 50,
            carLength: 110,
            wheelBase: 75
        },
        performance: {
            maxSpeed: 16.0,
            maxReverseSpeed: -4.5,
            carMode: 'normal',
            accelerationNormal: 0.018,
            accelerationSport: 0.025,
            friction: 0.04,
            brakingForce: 0.65,
            maxSteerAngle: 0.55,
            steerSpeed: 0.025,
            tireGrip: 0.75,
            angularDamping: 0.90,
            lateralForceMultiplier: 1.5
        }
    },
    TRUCK: {
        id: 'truck',
        name: 'Truck',
        displayName: 'Truck',
        color: { r: 255, g: 102, b: 0 }, // Orange
        dimensions: {
            carWidth: 55,
            carLength: 180,
            wheelBase: 130
        },
        performance: {
            maxSpeed: 10.0,
            maxReverseSpeed: -3.0,
            carMode: 'normal',
            accelerationNormal: 0.008,
            accelerationSport: 0.008, // Truck has no sport mode boost - fast workaround before removing it from selectable options
            friction: 0.04,
            brakingForce: 0.65,
            maxSteerAngle: 0.35,
            steerSpeed: 0.015,
            tireGrip: 0.60,
            angularDamping: 0.85,
            lateralForceMultiplier: 1.0
        },
        locked: true,
        lockMessage: 'Not implemented now, please buy DLC: Wide and fuel-hungry'
    }
};

export const DEFAULT_CAR = 'COMPACT';

export default CAR_CONFIGS;
