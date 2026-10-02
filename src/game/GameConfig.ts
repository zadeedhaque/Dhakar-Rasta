/**
 * Central tuning file. Every gameplay number lives here — change values here,
 * never inline them in systems. All distances are metres, speeds m/s, times s.
 * World axes: x = lateral (right +), s = distance along the road (forward +).
 */
export const CFG = {
  world: {
    laneWidth: 3.5,
    laneCount: 4,
    roadHalfWidth: 7,
    footpathInner: 7.4, // kerb
    footpathOuter: 11,
    segmentLength: 100,
    segmentsAhead: 5,
    segmentsBehind: 1,
    fogNear: 60,
    fogFar: 215,
    skyColor: 0xc9d4d6,
  },
  player: {
    maxSpeed: 27,
    accel: 9.5,
    brake: 26,
    drag: 2.2,
    reverseMax: 5,
    maxLateralSpeed: 9.5,
    lateralAccel: 48,
    halfW: 0.95,
    halfL: 2.15,
    xLimit: 6.15,
    invulnerableAfterPolice: 3,
  },
  collision: {
    majorClosingSpeed: 9, // m/s relative speed along the travel axis (head-on / rear-end)
    majorLateralSpeed: 14, // side-swipes are almost always just a scrape
    minorCooldown: 0.7,
    minorSpeedRetain: 0.55,
    minorMoneyPenalty: 5,
    minorScorePenalty: 25,
    crashSlowMoTime: 1.5,
    crashSlowMoScale: 0.22,
    hardObstacleMajorSpeed: 7,
    inset: 0.08, // forgiveness: shrink other bodies slightly
  },
  rewards: {
    wrongWayBatteryRickshaw: 50,
    wrongWayRickshaw: 25,
    dangerousPedestrian: 10,
    busEvent: 30,
    nearMiss: 5,
    cleanMilestone: 20,
    motorcycleCrash: 15,
    suddenStop: 10,
    suddenEntry: 15,
  },
  score: {
    perMeter: 1,
    perAvoid: 15,
    perNearMiss: 10,
    cleanMilestoneDistance: 500,
  },
  nearMiss: { gap: 0.85, minRelativeSpeed: 3.5, cooldown: 0.5 },
  dangerousPedestrian: { maxPassGap: 3.6 },
  police: { fine: 200, bribe: 100, walkTime: 1.6 },
  economy: { startingMoney: 100 },
  busJam: {
    stopDuration: 5, // seconds the bus blocks the road
    maxExtraWait: 7, // extra wait if the player is still far away
    sideX: 3.9, // |x| of the parked bus
    entrySpeed: 5,
    minDistanceBehind: 20,
  },
  traffic: {
    maxVehicles: 42,
    spawnAhead: [130, 190] as [number, number],
    despawnBehind: 45,
    despawnAhead: 260,
    spawnCooldown: 0.35,
    followMinGap: 2.2,
    laneChangeSpeed: 3.2,
    kindWeights: { car: 30, cng: 18, rickshaw: 22, battery: 9, motorcycle: 15, bus: 8, truck: 3 } as Record<string, number>,
  },
  pedestrians: {
    maxActive: 70,
    activateAhead: 230,
    despawnBehind: 40,
    crossSpeed: 1.5,
    runnerSpeed: 4.1,
    walkSpeed: 1.25,
  },
  difficulty: {
    // linear interpolation between tiers by distance. Edit freely.
    tiers: [
      { d: 0,    name: 'সহজ',       trafficDensity: 11, pedestrianDensity: 0.7, wrongWayFrequency: 1.0, busEventFrequency: 0.2, motorcycleAggression: 0.15, reactionWindow: 3.2, marketFrequency: 0.5, maxHazards: 1, eventInterval: 9,   speedFactor: 0.9 },
      { d: 500,  name: 'মাঝারি',    trafficDensity: 16, pedestrianDensity: 1.0, wrongWayFrequency: 1.8, busEventFrequency: 0.5, motorcycleAggression: 0.35, reactionWindow: 2.8, marketFrequency: 0.8, maxHazards: 2, eventInterval: 6.5, speedFactor: 1.0 },
      { d: 1500, name: 'কঠিন',      trafficDensity: 22, pedestrianDensity: 1.5, wrongWayFrequency: 2.6, busEventFrequency: 0.8, motorcycleAggression: 0.6,  reactionWindow: 2.4, marketFrequency: 1.1, maxHazards: 3, eventInterval: 4.5, speedFactor: 1.08 },
      { d: 3000, name: 'অতি কঠিন',  trafficDensity: 28, pedestrianDensity: 2.0, wrongWayFrequency: 3.6, busEventFrequency: 1.1, motorcycleAggression: 0.85, reactionWindow: 2.1, marketFrequency: 1.4, maxHazards: 4, eventInterval: 3.2, speedFactor: 1.15 },
    ],
  },
  events: {
    minGapBetweenEvents: 2.4,
    busJamMinDistance: 300,
    batteryMinDistance: 150,
    motoCrashMinDistance: 500,
    suddenEntryMinDistance: 350,
    spawnMargin: 22, // extra metres beyond the reaction distance
  },
  camera: {
    height: 4.6,
    back: 8.6,
    lookAhead: 22,
    fov: 62,
    fovSpeedBoost: 9,
    followLambda: 7,
    shakeDecay: 3.2,
  },
  menuDemo: { speed: 9, difficultyDistance: 700 },
  storageKey: 'dhakar-rasta-v1',
};

export interface DifficultyTier {
  d: number;
  name: string;
  trafficDensity: number;
  pedestrianDensity: number;
  wrongWayFrequency: number;
  busEventFrequency: number;
  motorcycleAggression: number;
  reactionWindow: number;
  marketFrequency: number;
  maxHazards: number;
  eventInterval: number;
  speedFactor: number;
}
