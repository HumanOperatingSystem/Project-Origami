import { useEffect, useRef, useState, useCallback } from 'react';
import { EvolutionService } from './EvolutionService';
import { ShapeType, Organism } from '../domain/types';
import { DEFAULT_EVOLUTION_CONFIG, DEFAULT_SIMULATION_CONFIG, INITIAL_SHAPE } from '../domain/constants';

export function useEvolutionLoop() {
  const serviceRef = useRef<EvolutionService>(new EvolutionService());
  const requestRef = useRef<number>(0);
  const trackedLeaderIdRef = useRef<string | null>(null);
  const [trackedLeaderId, setTrackedLeaderId] = useState<string | null>(null);
  
  const [population, setPopulation] = useState<Organism[]>([]);
  const [generation, setGeneration] = useState(1);
  const [currentShape, setCurrentShape] = useState<ShapeType>(INITIAL_SHAPE);
  const [isRunning, setIsRunning] = useState(false);
  const [isFastForward, setIsFastForward] = useState(false);
  
  // STATS STATE - OPTIMIZED: We now share a REF, not a state, for high frequency updates
  const [fitnessHistory, setFitnessHistory] = useState<number[]>([]);
  const statsRef = useRef({ 
      fitness: 0, 
      foodEaten: 0, 
      distance: 0, 
      energy: 0, 
      maxEnergy: 100,
      aliveCount: 0,
      totalCount: 0
  });

  // Physics State (UPDATED DEFAULTS TO MATCH REQUEST)
  const [globalStiffness, setGlobalStiffnessState] = useState(DEFAULT_SIMULATION_CONFIG.globalStiffness);
  const [globalContractility, setGlobalContractilityState] = useState(DEFAULT_SIMULATION_CONFIG.globalContractility);
  const [shapeMemory, setShapeMemoryState] = useState(DEFAULT_SIMULATION_CONFIG.shapeMemoryStrength);
  
  const [gravity, setGravityState] = useState(-DEFAULT_SIMULATION_CONFIG.gravity);
  const [friction, setFrictionState] = useState(DEFAULT_SIMULATION_CONFIG.friction);
  const [rotationalDrag, setRotationalDragState] = useState(DEFAULT_SIMULATION_CONFIG.rotationalDrag);
  const [density, setDensityState] = useState(DEFAULT_SIMULATION_CONFIG.densityMultiplier); 

  const [gripDepletion, setGripDepletionState] = useState(DEFAULT_SIMULATION_CONFIG.gripDepletionRate);
  const [gripRecharge, setGripRechargeState] = useState(DEFAULT_SIMULATION_CONFIG.gripRechargeRate);

  // Scarcity Controls (UPDATED DEFAULTS)
  const [foodSpawnCount, setFoodSpawnCountState] = useState(DEFAULT_EVOLUTION_CONFIG.foodSpawnCount);
  const [foodSpawnRadius, setFoodSpawnRadiusState] = useState(DEFAULT_EVOLUTION_CONFIG.foodSpawnRadius);
  
  const [foodSpawnMinHeight, setFoodSpawnMinHeightState] = useState(DEFAULT_EVOLUTION_CONFIG.foodSpawnMinHeight);
  const [foodSpawnMaxHeight, setFoodSpawnMaxHeightState] = useState(DEFAULT_EVOLUTION_CONFIG.foodSpawnMaxHeight);

  // Vision Control
  const [visionRadius, setVisionRadiusState] = useState(DEFAULT_EVOLUTION_CONFIG.globalVisionRadius);
  const [eatRadius, setEatRadiusState] = useState(DEFAULT_EVOLUTION_CONFIG.eatRadius);

  const [baseDecay, setBaseDecayState] = useState(DEFAULT_EVOLUTION_CONFIG.baseDecay);
  const [movementCost, setMovementCostState] = useState(DEFAULT_EVOLUTION_CONFIG.movementCost);
  const [foodEnergy, setFoodEnergyState] = useState(DEFAULT_EVOLUTION_CONFIG.foodEnergy);

  // Visual Toggles
  const [showVision, setShowVision] = useState(DEFAULT_SIMULATION_CONFIG.showVision);
  const [showMouth, setShowMouth] = useState(DEFAULT_SIMULATION_CONFIG.showMouth);

  // Initialize
  useEffect(() => {
    const service = serviceRef.current;
    
    // Wire up listeners
    // Removed the High Frequency Update State trigger
    const unsubUpdate = service.subscribe('update', (pop, time) => {
        // --- STABLE LEADER TRACKING (Hysteresis) ---
        let bestCandidate: Organism | null = null;
        let bestZ = -Infinity;

        // 1. Find the absolute best alive candidate
        for (const org of pop) {
            if (!org.isAlive) continue;
            let cz = 0;
            for (const n of org.nodes) cz += n.pos.z;
            cz /= org.nodes.length;
            if (cz > bestZ) {
                bestZ = cz;
                bestCandidate = org;
            }
        }

        // 2. Determine who to track
        let trackedLeader = pop.find(o => o.id === trackedLeaderIdRef.current);
        
        // If no tracked leader, or tracked leader is dead, switch to best candidate
        if (!trackedLeader || !trackedLeader.isAlive) {
            const nextLeader = bestCandidate || pop[0];
            if (nextLeader?.id !== trackedLeaderIdRef.current) {
                trackedLeaderIdRef.current = nextLeader?.id || null;
                setTrackedLeaderId(trackedLeaderIdRef.current);
            }
            trackedLeader = nextLeader;
        } else if (bestCandidate) {
            // Hysteresis: Only switch if candidate is 4.0m ahead
            let currentZ = 0;
            for (const n of trackedLeader.nodes) currentZ += n.pos.z;
            currentZ /= trackedLeader.nodes.length;

            if (bestZ > currentZ + 4.0) {
                if (bestCandidate.id !== trackedLeaderIdRef.current) {
                    trackedLeaderIdRef.current = bestCandidate.id;
                    setTrackedLeaderId(bestCandidate.id);
                }
                trackedLeader = bestCandidate;
            }
        }

        // 3. Update Stats Ref for UI
        let alive = 0;
        for (const org of pop) if (org.isAlive) alive++;

        if (trackedLeader) {
            statsRef.current.fitness = trackedLeader.fitness;
            statsRef.current.foodEaten = trackedLeader.foodEaten;
            statsRef.current.distance = trackedLeader.distanceTraveled || 0;
            statsRef.current.energy = trackedLeader.energy;
            statsRef.current.maxEnergy = trackedLeader.maxEnergy;
        }
        statsRef.current.aliveCount = alive;
        statsRef.current.totalCount = pop.length;
    });

    const unsubGen = service.subscribe('genComplete', (best, gen) => {
        setGeneration(gen);
        // Track History
        setFitnessHistory(prev => [...prev, best.fitness]);
    });
    
    const unsubNewGen = service.subscribe('newGen', (newPop) => {
        setPopulation([...newPop]);
    });

    service.initializePopulation(currentShape);
    setPopulation([...service.population]); // Initial sync

    return () => {
        cancelAnimationFrame(requestRef.current!);
        unsubUpdate();
        unsubGen();
        unsubNewGen();
    };
  }, []);

  const reset = useCallback((shape: ShapeType) => {
    setIsRunning(false);
    setIsFastForward(false);
    setCurrentShape(shape);
    serviceRef.current.initializePopulation(shape);
    setPopulation([...serviceRef.current.population]);
    setGeneration(1);
    statsRef.current = { 
        fitness: 0, 
        foodEaten: 0, 
        distance: 0, 
        energy: 0, 
        maxEnergy: 100,
        aliveCount: serviceRef.current.population.length,
        totalCount: serviceRef.current.population.length
    };
    trackedLeaderIdRef.current = null;
    setTrackedLeaderId(null);
    setFitnessHistory([]);
  }, []);
  
  const spawnCustom = useCallback((organism: Organism, autoStart: boolean = false) => {
      serviceRef.current.setTemplateAndReset(organism);
      setPopulation([...serviceRef.current.population]);
      setGeneration(1);
      statsRef.current = { 
          fitness: 0, 
          foodEaten: 0, 
          distance: 0, 
          energy: 0, 
          maxEnergy: 100,
          aliveCount: serviceRef.current.population.length,
          totalCount: serviceRef.current.population.length
      };
      trackedLeaderIdRef.current = null;
      setTrackedLeaderId(null);
      setFitnessHistory([]); // Clear history on new spawn
      setCurrentShape(organism.shape);
      
      setIsRunning(autoStart);
      setIsFastForward(false);
  }, []);

  const evolve = useCallback(() => {
    serviceRef.current.evolve();
    setPopulation([...serviceRef.current.population]); // Update React view
    setGeneration(serviceRef.current.currentGeneration);
  }, []);

  // --- PHYSICS CONTROL HANDLERS ---
  const setGlobalStiffness = useCallback((val: number) => {
      setGlobalStiffnessState(val);
      serviceRef.current.setGlobalStiffness(val);
  }, []);

  const setGlobalContractility = useCallback((val: number) => {
      setGlobalContractilityState(val);
      serviceRef.current.setGlobalContractility(val);
  }, []);

  const setGravity = useCallback((val: number) => {
      setGravityState(val);
      serviceRef.current.setGravity(-val);
  }, []);

  const setFriction = useCallback((val: number) => {
      setFrictionState(val);
      serviceRef.current.setFriction(val);
  }, []);

  const setRotationalDrag = useCallback((val: number) => {
      setRotationalDragState(val);
      serviceRef.current.setRotationalDrag(val);
  }, []);

  const setShapeMemory = useCallback((val: number) => {
      setShapeMemoryState(val);
      serviceRef.current.setShapeMemoryStrength(val);
  }, []);
  
  const setDensity = useCallback((val: number) => {
      setDensityState(val);
      serviceRef.current.setDensity(val);
  }, []);

  const setGripDepletion = useCallback((val: number) => {
      setGripDepletionState(val);
      serviceRef.current.setGripDepletionRate(val);
  }, []);

  const setGripRecharge = useCallback((val: number) => {
      setGripRechargeState(val);
      serviceRef.current.setGripRechargeRate(val);
  }, []);

  // --- SCARCITY HANDLERS ---
  const setFoodSpawnCount = useCallback((val: number) => {
      setFoodSpawnCountState(val);
      serviceRef.current.foodSpawnCount = val;
      serviceRef.current.updateFoodDistribution(); // Real-time update
  }, []);

  const setFoodSpawnRadius = useCallback((val: number) => {
      setFoodSpawnRadiusState(val);
      serviceRef.current.foodSpawnRadius = val;
      serviceRef.current.updateFoodDistribution(); // Real-time update
  }, []);
  
  const setFoodSpawnMinHeight = useCallback((val: number) => {
      setFoodSpawnMinHeightState(val);
      serviceRef.current.foodSpawnMinHeight = val;
      serviceRef.current.updateFoodDistribution();
  }, []);

  const setFoodSpawnMaxHeight = useCallback((val: number) => {
      setFoodSpawnMaxHeightState(val);
      serviceRef.current.foodSpawnMaxHeight = val;
      serviceRef.current.updateFoodDistribution();
  }, []);


  // --- VISION HANDLER ---
  const setVisionRadius = useCallback((val: number) => {
      setVisionRadiusState(val);
      serviceRef.current.globalVisionRadius = val;
  }, []);
  
  // --- MOUTH HANDLER ---
  const setEatRadius = useCallback((val: number) => {
      setEatRadiusState(val);
      serviceRef.current.eatRadius = val;
      serviceRef.current.magnetRadius = val;
  }, []);

  const setBaseDecay = useCallback((val: number) => {
      setBaseDecayState(val);
      serviceRef.current.baseDecay = val;
  }, []);

  const setMovementCost = useCallback((val: number) => {
      setMovementCostState(val);
      serviceRef.current.movementCost = val;
  }, []);

  const setFoodEnergy = useCallback((val: number) => {
      setFoodEnergyState(val);
      serviceRef.current.foodEnergy = val;
  }, []);


  // --- DATA IO ---

  const saveCreature = useCallback(() => {
    const best = serviceRef.current.getBestOrganism();
    if (!best) return;
    
    const json = JSON.stringify(best, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `creature_gen${best.generation}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const loadCreature = useCallback((file: File, onLoaded?: (org: Organism) => void) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const json = e.target?.result as string;
              const organism = JSON.parse(json) as Organism;
              
              if (!organism.nodes || !organism.muscles || !organism.neuralGenome) {
                  alert("Invalid Creature File");
                  return;
              }

              spawnCustom(organism, false);
              
              // Notify App
              if (onLoaded) onLoaded(organism);

          } catch (err) {
              console.error(err);
              alert("Failed to load creature file.");
          }
      };
      reader.readAsText(file);
  }, [spawnCustom]);


  // --- MAIN LOOP ---

  const toggleAutoEvolve = useCallback(() => {
      setIsFastForward(prev => !prev);
      // If we fast forward, we ensure we are running
      if (!isFastForward) setIsRunning(true); 
  }, [isFastForward]);

  const loop = useCallback(() => {
    if (!isRunning) return;
    
    // FAST FORWARD LOGIC:
    const iterations = isFastForward ? 8 : 1;
    
    for(let i=0; i<iterations; i++) {
        serviceRef.current.step(0.016);
    }

    requestRef.current = requestAnimationFrame(loop);
  }, [isRunning, isFastForward]);

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(requestRef.current!);
    }
    return () => cancelAnimationFrame(requestRef.current!);
  }, [isRunning, loop]);

  return {
    population,
    generation,
    trackedLeaderId,
    statsRef, // EXPOSED REF INSTEAD OF STATE
    fitnessHistory,
    isRunning,
    isAutoEvolving: isFastForward,
    currentShape,
    // Physics State
    globalStiffness,
    globalContractility,
    setGlobalStiffness,
    setGlobalContractility,
    gravity, setGravity,
    friction, setFriction,
    rotationalDrag, setRotationalDrag,
    shapeMemory, setShapeMemory,
    density, setDensity, // NEW
    gripDepletion, setGripDepletion,
    gripRecharge, setGripRecharge,
    // Scarcity
    foodSpawnCount,
    setFoodSpawnCount,
    foodSpawnRadius,
    setFoodSpawnRadius,
    foodSpawnMinHeight, setFoodSpawnMinHeight,
    foodSpawnMaxHeight, setFoodSpawnMaxHeight,
    // Vision
    visionRadius,
    setVisionRadius,
    // Mouth
    eatRadius,
    setEatRadius,
    // Metabolism
    baseDecay, setBaseDecay,
    movementCost, setMovementCost,
    foodEnergy, setFoodEnergy,
    // Visuals
    showVision, setShowVision,
    showMouth, setShowMouth,
    // Actions
    setIsRunning,
    toggleAutoEvolve, 
    reset,
    evolve,
    spawnCustom,
    saveCreature,
    loadCreature
  };
}