import { ShapeType } from './types';

export const DEFAULT_SIMULATION_CONFIG = {
  // Physics Core
  gravity: -100.0,
  friction: 0.99,
  groundDamping: 0.5,
  timeStep: 0.016,
  
  // Structural Integrity
  shapeMemoryStrength: 0.8,
  globalStiffness: 0.9,
  globalContractility: 3.0,
  rotationalDrag: 1.0,
  
  // Grip Mechanics
  gripDepletionRate: 1.0,
  gripRechargeRate: 0.5,
  
  // Density
  densityMultiplier: 1.0,

  // Visuals
  showVision: false,
  showMouth: true,
};

export const DEFAULT_EVOLUTION_CONFIG = {
  populationSize: 100,
  mutationRate: 0.05,
  
  // Scarcity / Environment
  foodSpawnCount: 20,
  foodSpawnRadius: 3.0,
  foodSpawnMinHeight: 1.8,
  foodSpawnMaxHeight: 2.1,
  
  // Vision / Interaction
  globalVisionRadius: 4.0,
  eatRadius: 0.3,
  magnetRadius: 0.3,
  
  // Metabolism
  startEnergy: 100,
  baseDecay: 2.5,
  movementCost: 0.1,
  hungerAccel: 1.05,
  foodEnergy: 25,
};

export const INITIAL_SHAPE = ShapeType.CUBE;
