import { BioPhysicsEngine } from '../domain/BioPhysicsEngine';
import { Organism, ShapeType, NeuralGenome, FoodItem, Node, Muscle, CellType } from '../domain/types';
import { ShapeFactory } from '../domain/ShapeFactory';
import { VectorOps } from '../domain/math';
import { GeneticOperator } from '../domain/genetics/GeneticOperator';
import { IFitnessEvaluator, StandardFitnessEvaluator } from '../domain/fitness/FitnessEvaluator';
import { BrainController } from '../domain/neural/BrainController';
import { DEFAULT_EVOLUTION_CONFIG, DEFAULT_SIMULATION_CONFIG } from '../domain/constants';

export class EvolutionService {
  public population: Organism[] = [];
  public currentGeneration = 1;
  public simulationTime = 0;
  
  private engine: BioPhysicsEngine;
  private geneticOperator: GeneticOperator;
  private fitnessEvaluator: IFitnessEvaluator;

  private populationSize = DEFAULT_EVOLUTION_CONFIG.populationSize;
  private template: Organism | null = null; 
  
  public startEnergy = DEFAULT_EVOLUTION_CONFIG.startEnergy;
  public baseDecay = DEFAULT_EVOLUTION_CONFIG.baseDecay; 
  public movementCost = DEFAULT_EVOLUTION_CONFIG.movementCost; // Energy per meter
  public hungerAccel = DEFAULT_EVOLUTION_CONFIG.hungerAccel; 
  public foodEnergy = DEFAULT_EVOLUTION_CONFIG.foodEnergy;
  
  // Updated: Magnet defaults to same as eat radius for visual consistency
  public magnetRadius = DEFAULT_EVOLUTION_CONFIG.magnetRadius; 
  private readonly MAGNET_FORCE = 0.8;  
  public eatRadius = DEFAULT_EVOLUTION_CONFIG.eatRadius;    

  public foodSpawnCount = DEFAULT_EVOLUTION_CONFIG.foodSpawnCount; 
  public foodSpawnRadius = DEFAULT_EVOLUTION_CONFIG.foodSpawnRadius; 
  
  public foodSpawnMinHeight = DEFAULT_EVOLUTION_CONFIG.foodSpawnMinHeight;
  public foodSpawnMaxHeight = DEFAULT_EVOLUTION_CONFIG.foodSpawnMaxHeight;
  
  public globalVisionRadius = DEFAULT_EVOLUTION_CONFIG.globalVisionRadius;
  
  // DENSITY CONTROL
  private densityMultiplier = DEFAULT_SIMULATION_CONFIG.densityMultiplier;

  private updateListeners: ((pop: Organism[], time: number) => void)[] = [];
  private genCompleteListeners: ((best: Organism, gen: number) => void)[] = [];
  private newGenListeners: ((pop: Organism[]) => void)[] = [];

  constructor() {
    this.engine = new BioPhysicsEngine();
    this.geneticOperator = new GeneticOperator(DEFAULT_EVOLUTION_CONFIG.mutationRate);
    this.fitnessEvaluator = new StandardFitnessEvaluator();
  }
  
  // --- PHYSICS CONFIGURATION ---
  public setGlobalStiffness(val: number) { this.engine.setConfig({ globalStiffness: val }); }
  public setGlobalContractility(val: number) { this.engine.setConfig({ globalContractility: val }); }
  public setGravity(val: number) { this.engine.setConfig({ gravity: val }); }
  public setFriction(val: number) { this.engine.setConfig({ friction: val }); }
  public setRotationalDrag(val: number) { this.engine.setConfig({ rotationalDrag: val }); }
  public setShapeMemoryStrength(val: number) { this.engine.setConfig({ shapeMemoryStrength: val }); }
  
  public setGripDepletionRate(val: number) { this.engine.setConfig({ gripDepletionRate: val }); }
  public setGripRechargeRate(val: number) { this.engine.setConfig({ gripRechargeRate: val }); }
  
  // NEW: DENSITY CONTROL
  public setDensity(val: number) {
      this.densityMultiplier = val;
      // Update existing population immediately
      this.population.forEach(org => {
          org.nodes.forEach(n => {
              // Re-calculate mass based on type and multiplier
              // NEW: Body and Head are much heavier than feet to force stability needs
              let base = 4.0;
              if (n.cellType === CellType.BODY) base = 10.0;
              if (n.cellType === CellType.HEAD) base = 12.0;
              
              n.mass = base * this.densityMultiplier;
          });
      });
  }

  public updateFoodDistribution(): void {
      this.population.forEach(org => {
          org.visibleFood = this.generateFoodTrack(org);
      });
  }

  public initializePopulation(shape: ShapeType): void {
    this.template = ShapeFactory.create(shape, 'template');
    this.spawnGenerationFromTemplate(true);
  }

  public setTemplateAndReset(organism: Organism, startGeneration: number = 1): void {
      // Deep copy for the master template to ensure it's clean
      const safeJson = JSON.stringify(organism, (key, value) => {
          if (key === 'brain') return undefined;
          if (key === 'nodeRefA' || key === 'nodeRefB') return undefined;
          if (key === 'headNode') return undefined; // Avoid circular ref or re-finding
          return value;
      });
      this.template = JSON.parse(safeJson);
      
      // Re-bind headNode if missing from JSON
      if (!this.template!.headNode) {
          this.template!.headNode = this.template!.nodes.find(n => n.isHead);
      }
      
      this.currentGeneration = startGeneration;
      this.spawnGenerationFromTemplate(false); 
  }

  private cleanupCurrentPopulation() {
      // Explicitly break references to prevent leaks
      this.population.forEach(org => {
          if (org.brain && typeof org.brain.dispose === 'function') {
              org.brain.dispose();
          }
          org.brain = undefined;
      });
  }

  private spawnGenerationFromTemplate(resetGen: boolean): void {
      if (!this.template) return;

      this.cleanupCurrentPopulation();

      this.population = [];
      if (resetGen) this.currentGeneration = 1;
      this.simulationTime = 0;

      for (let i = 0; i < this.populationSize; i++) {
          const child = this.createOrganismFromTemplate(this.template, `gen${this.currentGeneration}_${i}`);
          
          if (i > 0) {
              this.geneticOperator.mutateGenome(child.neuralGenome);
          }
          
          child.visibleFood = this.generateFoodTrack(child);
          this.fitnessEvaluator.evaluate(child, 0.016);
          
          this.population.push(child);
      }
      
      this.notifyNewGeneration(this.population);
  }

  private generateFoodTrack(organism: Organism): FoodItem[] {
      const food: FoodItem[] = [];
      const numFood = this.foodSpawnCount; 

      let centerX = 0;
      let centerZ = 0;

      // OPTIMIZATION: Use cached headNode
      const head = organism.headNode;

      if (head) {
          centerX = head.pos.x;
          centerZ = head.pos.z;
      }
      
      const spread = this.foodSpawnRadius; 
      
      // Vertical Range Logic
      const minY = this.foodSpawnMinHeight;
      const maxY = Math.max(minY, this.foodSpawnMaxHeight);
      const rangeY = maxY - minY;

      for(let i=0; i<numFood; i++) {
          const theta = Math.random() * Math.PI * 2;
          const radius = 1.0 + Math.random() * spread; 
          const x = centerX + Math.cos(theta) * radius;
          const z = centerZ + Math.sin(theta) * radius;
          
          // Use configurable height range
          const y = minY + Math.random() * rangeY;

          food.push({
              id: `f_${i}`,
              pos: { x, y, z },
              energyValue: this.foodEnergy,
              consumed: false
          });
      }
      return food;
  }

  public getBestOrganism(): Organism | null {
      if (this.population.length === 0) return null;
      const sorted = [...this.population].sort((a, b) => b.fitness - a.fitness);
      const best = sorted[0];
      
      const safeJson = JSON.stringify(best, (key, value) => {
          if (key === 'brain') return undefined;
          if (key === 'nodeRefA' || key === 'nodeRefB') return undefined;
          if (key === 'headNode') return undefined;
          return value;
      });
      const cleanCopy = JSON.parse(safeJson);
      cleanCopy.generation = this.currentGeneration;
      
      return cleanCopy;
  }
  
  public getLeader(): Organism | null {
      if (this.population.length === 0) return null;
      
      let bestAlive: Organism | null = null;
      let maxZAlive = -Infinity;
      
      let bestDead: Organism | null = null;
      let maxZDead = -Infinity;

      for (const org of this.population) {
          let cz = 0;
          for(const n of org.nodes) cz += n.pos.z;
          cz /= org.nodes.length;
          
          if (org.isAlive) {
              if (cz > maxZAlive) { maxZAlive = cz; bestAlive = org; }
          } else {
              if (cz > maxZDead) { maxZDead = cz; bestDead = org; }
          }
      }
      
      return bestAlive || bestDead || this.population[0];
  }

  public step(dt: number): void {
    this.simulationTime += dt;
    this.updatePhysics(dt, false);
    this.updateMetabolism(dt);
    
    if (Math.floor(this.simulationTime * 100) % 100 === 0) {
        this.applySocialLearning();
    }

    const allDead = !this.population.some(org => org.isAlive);
    if (allDead) {
        this.evolve();
    }

    this.notifyUpdate(this.population, this.simulationTime);
  }
  
  private applySocialLearning() {
      const sorted = [...this.population].sort((a, b) => b.fitness - a.fitness);
      if (sorted.length < 2) return;
      
      const leader = sorted[0];
      const bottomHalfStart = Math.floor(sorted.length / 2);
      
      for(let i=0; i<sorted.length; i++) {
         // Everyone learns a little bit from the leader
         if (i === 0) continue;
         const learner = sorted[i];
         if (!learner.isAlive) continue;
         
         const learningRate = 0.01; 
         const lg = learner.neuralGenome;
         const bg = leader.neuralGenome;
         
         for(let k=0; k<lg.synapseWeights.length; k++) {
             if (bg.synapseWeights[k] !== undefined) {
                 lg.synapseWeights[k] += (bg.synapseWeights[k] - lg.synapseWeights[k]) * learningRate;
             }
         }
      }
  }

  private updatePhysics(dt: number, fastMode: boolean): void {
    this.population.forEach(org => {
      // 1. DEAD CHECK: Remove from calculations (Frozen Statue Logic)
      if (!org.isAlive) return;

      // 2. BRAIN UPDATE
      if (!org.brain) {
          org.brain = new BrainController(org);
      }
      const contractility = (this.engine as any).config.globalContractility;
      // Pass dynamic vision radius to brain
      org.brain.update(dt, contractility, this.globalVisionRadius);
      
      // 3. PHYSICS UPDATE
      this.engine.updateOrganism(org, this.simulationTime, fastMode);
    });
  }

  private updateMetabolism(dt: number): void {
      this.population.forEach(org => {
          // 1. Calculate Fitness
          this.fitnessEvaluator.evaluate(org, dt);

          if (!org.isAlive) return;

          org.hungerTime += dt;
          const hungerMultiplier = Math.pow(this.hungerAccel, org.hungerTime);
          
          // Time-based decay
          const timeLoss = this.baseDecay * hungerMultiplier * dt;
          
          // Movement-based decay
          // 1. Update distanceTraveled based on head movement
          const head = org.headNode;
          if (head) {
              const lastPos = (org as any)._lastHeadPos || { ...head.pos };
              const dx = head.pos.x - lastPos.x;
              const dy = head.pos.y - lastPos.y;
              const dz = head.pos.z - lastPos.z;
              const stepDist = Math.sqrt(dx*dx + dy*dy + dz*dz);
              
              // NaN Guard
              if (isFinite(stepDist)) {
                  org.distanceTraveled += stepDist;
              }
              (org as any)._lastHeadPos = { ...head.pos };
          }

          const prevDist = (org as any)._prevDist || 0;
          const distDelta = Math.max(0, org.distanceTraveled - prevDist);
          (org as any)._prevDist = org.distanceTraveled;
          const moveLoss = distDelta * this.movementCost;

          org.energy -= (timeLoss + moveLoss);

          if (org.energy <= 0) {
              org.energy = 0;
              org.isAlive = false;
              return; 
          }

          // --- ANTI-CHEATING RULE: STABLE STANCE ---
          // A creature can only eat if > 50% of its feet are touching the ground.
          // This prevents "pole vaulting" on minimal limbs.
          let totalFeet = 0;
          let groundedFeet = 0;
          for(const n of org.nodes) {
              // Check for explicit Foot type OR high friction (legacy fallback)
              if (n.cellType === CellType.FOOT || (n.friction > 0.8 && !n.isHead)) {
                  totalFeet++;
                  // Tolerance 0.15 (Slightly more than physics radius 0.1)
                  if (n.pos.y <= 0.15) groundedFeet++;
              }
          }
          
          // Logic: If I have 4 feet, I need 3 grounded (75% > 50%). 2 grounded (50%) fails.
          // If 0 feet (worm/blob), assume valid.
          const isStable = totalFeet === 0 || (groundedFeet / totalFeet > 0.5);

          if (!isStable) {
               // Skip eating this frame.
               return; 
          }
          // -----------------------------------------

          // OPTIMIZATION: Use Cached Head
          let headNode = org.headNode;
          
          // Self-heal just in case
          if (!headNode && org.nodes.length > 0) {
              headNode = org.nodes.find(n => n.isHead);
              if (!headNode) headNode = org.nodes[0];
              org.headNode = headNode;
          }

          if (headNode) {
            for (const food of org.visibleFood) {
                if (food.consumed) continue;

                // INLINED MATH (Optimized)
                // Avoid VectorOps.distance and VectorOps.sub object creation
                const dx = headNode.pos.x - food.pos.x;
                const dy = headNode.pos.y - food.pos.y;
                const dz = headNode.pos.z - food.pos.z;
                const distSq = dx*dx + dy*dy + dz*dz;
                
                // Fast reject check (Squared)
                // Use dynamic magnetRadius
                if (distSq < this.magnetRadius * this.magnetRadius) {
                    const dist = Math.sqrt(distSq);

                    // --- NAN GUARD: PREVENT MERGE SINGULARITY ---
                    // If food is sucked into the EXACT same coordinate as head (dist=0),
                    // the physics/vision vectors will become NaN (div by zero).
                    // We prevent this by gently nudging the food away if it gets too close.
                    if (dist < 0.0001) {
                         food.pos.x += 0.01; 
                         // Recalculate will happen next frame, preventing the NaN now.
                         continue;
                    }
                    
                    // Pull Force
                    const strength = 1.0 - (dist / this.magnetRadius);
                    const force = this.MAGNET_FORCE * (1.0 + strength);
                    
                    // Apply directly (Pull vector is -diff vector)
                    // pull = head - food. so dx = head.x - food.x
                    food.pos.x += dx * force * 0.1;
                    food.pos.y += dy * force * 0.1;
                    food.pos.z += dz * force * 0.1;

                    // Recheck Distance (Cheap approximation: assume it moved closer)
                    const ndx = head.pos.x - food.pos.x;
                    const ndy = head.pos.y - food.pos.y;
                    const ndz = head.pos.z - food.pos.z;
                    const nDistSq = ndx*ndx + ndy*ndy + ndz*ndz;
                    
                    // Use dynamic eatRadius
                    if (nDistSq < this.eatRadius * this.eatRadius) {
                        food.consumed = true;
                        org.energy += food.energyValue;
                        if (org.energy > org.maxEnergy) org.energy = org.maxEnergy;
                        org.hungerTime = 0;
                        org.foodEaten++;
                    }
                }
            }
          }
      });
  }

  private finalizeFitness() {
      this.population.forEach(org => this.fitnessEvaluator.finalize(org));
  }

  public evolve(): void {
    if (!this.template) return;

    this.finalizeFitness(); 

    // 1. Selection
    this.population.sort((a, b) => b.fitness - a.fitness);
    const survivorsCount = Math.floor(this.populationSize * 0.25);
    const survivors = this.population.slice(0, survivorsCount);
    const bestOrganism = survivors[0];

    this.notifyGenComplete(bestOrganism, this.currentGeneration);

    // 2. Reproduction
    this.currentGeneration++;
    const nextGen: Organism[] = [];

    // Elitism
    const champion = this.createOrganismFromTemplate(this.template, `gen${this.currentGeneration}_champ`);
    champion.neuralGenome = this.geneticOperator.cloneGenome(bestOrganism.neuralGenome);
    champion.visibleFood = this.generateFoodTrack(champion);
    this.fitnessEvaluator.evaluate(champion, 0.016);
    nextGen.push(champion);

    // Fill
    while (nextGen.length < this.populationSize) {
      const parent = survivors[Math.floor(Math.random() * survivors.length)];
      const child = this.createOrganismFromTemplate(this.template, `gen${this.currentGeneration}_${nextGen.length}`);
      child.neuralGenome = this.geneticOperator.cloneGenome(parent.neuralGenome);
      this.geneticOperator.mutateGenome(child.neuralGenome);
      child.visibleFood = this.generateFoodTrack(child);
      this.fitnessEvaluator.evaluate(child, 0.016);
      nextGen.push(child);
    }

    // Cleanup Old Population before switching
    this.cleanupCurrentPopulation();

    this.population = nextGen;
    this.simulationTime = 0;

    this.notifyNewGeneration(this.population);
  }

  private createOrganismFromTemplate(template: Organism, newId: string): Organism {
      // 1. Clone Nodes
      const newNodes: Node[] = template.nodes.map(n => {
          // Calculate Initial Mass using the Density Multiplier
          const base = (n.cellType === CellType.BODY) ? 5.0 : 4.0;
          return {
              ...n,
              pos: { ...n.pos },
              oldPos: { ...n.pos }, 
              mass: base * this.densityMultiplier, // APPLY MULTIPLIER
              activation: 0,
              gripSignal: 0,
              isGripping: false
          };
      });

      // 2. Clone Muscles
      const newMuscles: Muscle[] = template.muscles.map(m => ({
          ...m,
          currentLength: undefined,
          targetLength: undefined,
          phase: Math.random() * Math.PI * 2,
          nodeRefA: undefined,
          nodeRefB: undefined
      }));

      // 3. Clone Genome 
      const newGenome = this.geneticOperator.cloneGenome(template.neuralGenome);

      // 4. Construct
      const clone: Organism = {
          id: newId,
          shape: template.shape,
          nodes: newNodes,
          muscles: newMuscles,
          neuralGenome: newGenome,
          fitness: 0,
          generation: 1,
          brain: undefined,
          
          energy: this.startEnergy,
          maxEnergy: this.startEnergy,
          hungerTime: 0,
          isAlive: true,
          foodEaten: 0,
          timeAlive: 0,
          visibleFood: [],
          
          // Distance Stats
          initialHeadPos: template.initialHeadPos ? { ...template.initialHeadPos } : {x:0,y:0,z:0},
          distanceTraveled: 0
      };

      // Safety check for starting pos if template was malformed
      if (!clone.initialHeadPos) {
           const head = clone.nodes.find(n => n.isHead);
           clone.initialHeadPos = head ? { ...head.pos } : { x: 0, y: 0, z: 0 };
      }
      
      // OPTIMIZATION: Cache Head
      const head = clone.nodes.find(n => n.isHead);
      if (head) clone.headNode = head;

      return clone;
  }

  public subscribe(type: 'update', cb: (pop: Organism[], time: number) => void): () => void;
  public subscribe(type: 'genComplete', cb: (best: Organism, gen: number) => void): () => void;
  public subscribe(type: 'newGen', cb: (pop: Organism[]) => void): () => void;
  public subscribe(type: string, cb: any): () => void {
      if (type === 'update') {
          this.updateListeners.push(cb);
          return () => this.updateListeners = this.updateListeners.filter(l => l !== cb);
      }
      if (type === 'genComplete') {
          this.genCompleteListeners.push(cb);
          return () => this.genCompleteListeners = this.genCompleteListeners.filter(l => l !== cb);
      }
      if (type === 'newGen') {
          this.newGenListeners.push(cb);
          return () => this.newGenListeners = this.newGenListeners.filter(l => l !== cb);
      }
      return () => {};
  }
  
  public onUpdate(cb: (pop: Organism[], time: number) => void) { this.subscribe('update', cb); }
  public onGenComplete(cb: (best: Organism, gen: number) => void) { this.subscribe('genComplete', cb); }
  public onNewGeneration(cb: (pop: Organism[]) => void) { this.subscribe('newGen', cb); }

  private notifyUpdate(pop: Organism[], time: number) { this.updateListeners.forEach(l => l(pop, time)); }
  private notifyGenComplete(best: Organism, gen: number) { this.genCompleteListeners.forEach(l => l(best, gen)); }
  private notifyNewGeneration(pop: Organism[]) { this.newGenListeners.forEach(l => l(pop)); }
}