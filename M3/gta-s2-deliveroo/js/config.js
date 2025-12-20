export const CONFIG = {
    // Shared parameters (not car-specific)
    wheelWidth: 10,
    wheelLength: 20,
    kmhFactor: 8,
    steerRestoringDriving: 0.02,
    handbrakeBoostRate: 0.018,
    handbrakeBoostMax: 1.0,
    handbrakeBoostMultiplier: 6.0,
    handbrakeBoostDecay: 0.05,
    tireGripBraking: 0.65,
    driftThreshold: 2.0,
    driftFriction: 0.98,
    curbSafeSpeed: 1.5,
    
    // Car-specific parameters (will be overridden by selected car)
    carWidth: 44,
    carLength: 90,
    wheelBase: 60,
    maxSpeed: 18.0,
    maxReverseSpeed: -5.0,
    carMode: 'normal',
    accelerationNormal: 0.021,
    accelerationSport: 0.15,
    friction: 0.06,
    brakingForce: 0.5,
    maxSteerAngle: 0.65,
    steerSpeed: 0.03,
    tireGrip: 0.85,
    angularDamping: 0.94,
    lateralForceMultiplier: 2.0,
    
    get acceleration() { 
        return this.carMode === 'sport' ? this.accelerationSport : this.accelerationNormal; 
    },
    
    /**
     * Apply car configuration from carConfigs.js
     * @param {Object} carConfig - Configuration object with dimensions and performance
     */
    applyCarConfig(carConfig) {
        // Apply dimensions
        Object.assign(this, carConfig.dimensions);
        
        // Apply performance parameters individually (avoid overwriting getter)
        const perf = carConfig.performance;
        this.maxSpeed = perf.maxSpeed;
        this.maxReverseSpeed = perf.maxReverseSpeed;
        this.carMode = perf.carMode;
        this.friction = perf.friction;
        this.brakingForce = perf.brakingForce;
        this.maxSteerAngle = perf.maxSteerAngle;
        this.steerSpeed = perf.steerSpeed;
        this.tireGrip = perf.tireGrip;
        
        // Apply acceleration values directly from config
        this.accelerationNormal = perf.accelerationNormal;
        this.accelerationSport = perf.accelerationSport;
        
        // Apply optional car-specific physics parameters
        if (perf.angularDamping !== undefined) {
            this.angularDamping = perf.angularDamping;
        }
        if (perf.lateralForceMultiplier !== undefined) {
            this.lateralForceMultiplier = perf.lateralForceMultiplier;
        }
    }
};

export default CONFIG;
