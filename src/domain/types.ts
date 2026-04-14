// Hexagonal Architecture: Domain Layer (Inner Core)
// Zero dependencies on UI or Rendering libraries.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export enum CellType {
    BODY = 'BODY', // Standard structural (Slippery)
    HEAD = 'HEAD', // Brain/Mouth (The Leader)
    FOOT = 'FOOT'  // Gripper (High Friction)
}

export interface Node {
  id: string;
  pos: Vec3;
  oldPos: Vec3; // For Verlet integration
  mass: number;
  friction: number;
  isFixed?: boolean;
  isHead?: boolean; // NEW: The only node that can eat
  
  // SUCTION MECHANICS (Rhythmic Anchor)
  isGripping?: boolean; 
  gripSignal?: number;    // Deprecated for manual, but kept for compatibility
  
  // NEW: Bio-Mechanical Reflex
  gripStamina?: number;   // 0.0 (Slippery) to 1.0 (Locked). Drains under stress.
  gripCooldown?: number;  // NEW: Hysteresis frames to prevent flickering state
  currentStress?: number; // Visualization/Debug: How much force is pulling this node
  
  // EDITOR METADATA (Preserves shape upon reloading)
  originalGridCoord?: { x: number; y: number; z: number }; 
  cellType?: CellType; // NEW: Stores the type for restoring the blueprint

  // Neural State
  activation?: number; // 0.0 to 1.0 (Visualization Glow)
  // Physics State
}

export interface Muscle {
  id: string;
  nodeA: string; // ID reference
  nodeB: string; // ID reference
  baseLength: number;
  stiffness: number;
  dnaIndex: number; // Maps to a Gene (Index in genome arrays)
  
  // Runtime Physics State
  currentLength?: number; 
  targetLength?: number; 

  // --- RUNTIME OPTIMIZATION (O(1) Access) ---
  nodeRefA?: Node;
  nodeRefB?: Node;
  
  // --- OSCILLATOR STATE (The Anti-Vibration Core) ---
  // The brain controls these parameters, not the length directly.
  phase: number;      // Current position in the sine wave (0 to 2PI)
  freq: number;       // How fast it pulses (Hz). Clamped to prevent jitter.
  amp: number;        // How much it expands (0.0 to 0.4). 
}

// Replaced simple Sine Gene with Neural Genome
export interface NeuralGenome {
  // GNN Weights: How much signal flows through each muscle (Synapse)
  synapseWeights: number[]; 
  // LSM Weights: The chaotic reservoir weights (simplified as a float array)
  reservoirWeights: number[];
  // Output Weights: Mapping the reservoir state to muscle contraction
  outputWeights: number[]; 
  // NEW: Predictive World Model Weights (Reservoir -> Predicted Sensory Input)
  predictionWeights: number[];
  // NEW: Grip Control Weights (Reservoir -> Node Suction Release)
  gripWeights: number[]; 
  // Biases for neurons
  biases: number[];

  // --- EVOLVABLE BRAIN DYNAMICS ---
  internalClockSpeed: number; // Multiplier (0.5 to 2.0). How fast the brain thinks relative to physics.
  waveFreq: number;           // Hz (0.5 to 3.0). Base frequency of the spinal generator.
  waveSpeed: number;          // Propagation speed of the wave along the body.
}

export interface FoodItem {
    id: string;
    pos: Vec3;
    energyValue: number;
    consumed: boolean;
    // DEBUG VISUALIZATION
    seen?: boolean;      // Inside vision radius?
    targeted?: boolean;  // Is this the specific one the brain is looking at?
}

export enum ShapeType {
  CUBE = 'CUBE', // Cartesian Lattice
  WORM = 'WORM', // Linear
}

export interface Organism {
  id: string;
  shape: ShapeType; // NEW: Tracks the lattice type for the Architect
  nodes: Node[];
  muscles: Muscle[];
  // The Blueprint
  neuralGenome: NeuralGenome;
  // The Runtime Brain (Controller instance, not serialized usually, but here for simplicity)
  brain?: any; 
  
  // Stats
  fitness: number; // Total Score
  generation: number;
  
  // NEW: Distance Metrics (Replacing Posture)
  initialHeadPos: Vec3; // BENCHMARK: Where the head started
  distanceTraveled: number; // Real-time distance from start

  // ODOMETER STATE (Sampled distance tracking)
  lastSampledPos?: Vec3;
  odometerTimer?: number;

  // NEW: Metabolism & Survival
  energy: number;          // 0 to 100
  maxEnergy: number;       
  hungerTime: number;      // Time since last meal (drives exponential decay)
  timeAlive: number;       // NEW: Total time survived in ms
  isAlive: boolean;
  foodEaten: number;
  visibleFood: FoodItem[]; // Each creature has its own reality/food track

  // OPTIMIZATION: Cached reference
  headNode?: Node;
}

export interface SimulationConfig {
  gravity: number;
  friction: number;
  groundDamping: number;
  timeStep: number;
  // NEW: Structural Integrity
  shapeMemoryStrength: number;
  
  // NEW: Real-time Physics Tweaks
  globalStiffness: number;     // Multiplier for bone rigidity (0.1 to 2.0)
  globalContractility: number; // Multiplier for muscle power (0.0 to 2.0)
  
  // NEW: Exposed Tuning
  rotationalDrag?: number;

  // NEW: Grip Mechanics
  gripDepletionRate?: number; // How fast stamina drains under stress
  gripRechargeRate?: number;  // How fast it recovers

  // NEW: Visual Toggles
  showVision?: boolean;
  showMouth?: boolean;
}

// --- ARCHITECT TYPES ---
export type GridCoord = { x: number; y: number; z: number };

// NEW: Blueprint Cell now carries Type info
export interface BlueprintCell extends GridCoord {
    type: CellType;
}

export interface Blueprint {
    cells: Map<string, CellType>; // Key "x,y,z" -> CellType
    type: ShapeType;
}

// --- TYPE AUGMENTATION FOR R3F ---
// We explicitly augment global JSX to cover all React/TS configurations.

declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      group: any;
      instancedMesh: any;
      primitive: any;
      
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
      spotLight: any;
      
      boxGeometry: any;
      planeGeometry: any;
      sphereGeometry: any;
      cylinderGeometry: any;
      coneGeometry: any;
      icosahedronGeometry: any;
      
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      meshPhysicalMaterial: any;
      
      gridHelper: any;
      axesHelper: any;
      
      [elemName: string]: any;
    }
  }
}