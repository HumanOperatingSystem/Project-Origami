import { Organism, Node } from '../types';
import { NeuralNode } from './NeuralNode';
import { CentralPatternGenerator } from './CentralPatternGenerator';
import { VectorOps } from '../math';

// Optimization Structure
interface Synapse {
    nodeA: NeuralNode;
    nodeB: NeuralNode;
    weightIndex: number;
}

export class BrainController {
  // CHANGED: Map -> Array for fast iteration without iterator objects
  private neuralNodesList: NeuralNode[] = [];
  private neuralNodesMap: Map<string, NeuralNode> = new Map(); // Keep map only for initialization lookups
  
  private cpg: CentralPatternGenerator;
  private organism: Organism | null; 
  private isInitialized = false;

  private synapses: Synapse[] = []; 
  private synapseWeightsCache: Float32Array = new Float32Array(0);

  private internalTime = 0;
  private muscleRestDistances: Float32Array;

  private decisionTimer = 0;
  private readonly DECISION_INTERVAL_BASE = 0.08; 

  private previousEnergy: number = 0;
  private previousDistanceToFood: number = Infinity;
  private readonly HEBBIAN_RATE = 0.15; 

  private currentTargetId: string | null = null;
  private currentAttention: number = 0.0; 
  private readonly ATTENTION_SPAN = 6.0; 

  constructor(organism: Organism) {
    this.organism = organism;
    this.cpg = new CentralPatternGenerator(20);
    this.previousEnergy = organism.energy;
    
    // Initialize Neural Nodes into Array
    const nodes = organism.nodes;
    for(let i=0; i<nodes.length; i++) {
        const nn = new NeuralNode(nodes[i]);
        this.neuralNodesList.push(nn);
        this.neuralNodesMap.set(nodes[i].id, nn);
    }
    
    this.muscleRestDistances = new Float32Array(organism.muscles.length);

    if (organism.neuralGenome) {
        this.cpg.initialize(organism.neuralGenome.reservoirWeights);
    }
  }
  
  public dispose() {
      this.organism = null;
      this.neuralNodesList = [];
      this.neuralNodesMap.clear();
      this.synapses = [];
      this.synapseWeightsCache = new Float32Array(0);
      this.muscleRestDistances = new Float32Array(0);
      if (this.cpg) {
         // @ts-ignore
         this.cpg.bufferA = null;
         // @ts-ignore
         this.cpg.bufferB = null;
      }
  }

  private initializeNervousSystem() {
      if (!this.organism || this.organism.nodes.length === 0) return;

      let headNode = this.organism.headNode;
      if (!headNode) {
          headNode = this.organism.nodes[0];
          // @ts-ignore
          headNode.isHead = true; 
      }

      // 1. Build Distance Cache
      this.organism.muscles.forEach((m, i) => {
          const nA = this.organism!.nodes.find(n => n.id === m.nodeA);
          const nB = this.organism!.nodes.find(n => n.id === m.nodeB);
          if (nA && nB) {
              const midX = (nA.pos.x + nB.pos.x) / 2;
              const midY = (nA.pos.y + nB.pos.y) / 2;
              const midZ = (nA.pos.z + nB.pos.z) / 2;
              
              const dist = VectorOps.distance(
                  headNode!.pos, 
                  { x: midX, y: midY, z: midZ }
              );
              this.muscleRestDistances[i] = dist;
          }
      });

      // 2. Build Synapse Cache
      this.synapses = [];
      const weightCount = this.organism.neuralGenome?.synapseWeights.length || 1;
      this.synapseWeightsCache = new Float32Array(this.organism.neuralGenome.synapseWeights);

      this.organism.muscles.forEach((muscle, i) => {
          const nnA = this.neuralNodesMap.get(muscle.nodeA);
          const nnB = this.neuralNodesMap.get(muscle.nodeB);
          if (nnA && nnB) {
              this.synapses.push({
                  nodeA: nnA,
                  nodeB: nnB,
                  weightIndex: i % weightCount
              });
          }
      });

      this.organism.muscles.forEach(m => {
          m.targetLength = m.baseLength;
          m.phase = Math.random() * Math.PI * 2; 
          m.freq = 1.0; 
          m.amp = 0.0;
      });

      this.isInitialized = true;
  }

  public update(dt: number, powerScale: number = 1.0, visionRadius: number = 4.0): void {
    if (!this.organism) return;
    const genome = this.organism.neuralGenome;
    if (!genome) return;

    const safeDt = Math.min(dt, 0.1); 
    const brainDt = safeDt * (genome.internalClockSpeed || 1.0);

    if (!this.isInitialized) {
        this.initializeNervousSystem();
    }

    this.internalTime += brainDt;
    this.decisionTimer += brainDt;
    
    if (this.currentAttention > 0) {
        const decayPerSecond = 1.0 / this.ATTENTION_SPAN;
        this.currentAttention -= decayPerSecond * safeDt;
        if (this.currentAttention < 0) this.currentAttention = 0;
    }

    if (this.decisionTimer >= this.DECISION_INTERVAL_BASE) {
        this.think(brainDt, visionRadius);
        this.learn();
        this.decisionTimer = 0;
    }

    // --- SPINAL WAVE (Optimized Loop) ---
    const WAVE_FREQ = genome.waveFreq || 1.5; 
    const WAVE_SPEED = genome.waveSpeed || 1.0; 
    const FORCED_AMP = 0.15; 
    const MAX_DEFORMATION = 0.3; 
    const PI2 = Math.PI * 2;
    const muscles = this.organism.muscles;
    const mLen = muscles.length;

    for(let i=0; i<mLen; i++) {
        const m = muscles[i];
        
        m.phase += m.freq * brainDt * PI2;
        if (m.phase > PI2) m.phase -= PI2;
        const brainSignal = Math.sin(m.phase) * m.amp;

        const dist = this.muscleRestDistances[i]; 
        const nerveLag = dist * WAVE_SPEED;
        const spinalSignal = Math.sin(this.internalTime * WAVE_FREQ * PI2 - nerveLag) * FORCED_AMP;

        let totalSignal = (spinalSignal + brainSignal) * powerScale;

        if (isNaN(totalSignal)) totalSignal = 0;
        if (totalSignal > MAX_DEFORMATION) totalSignal = MAX_DEFORMATION;
        if (totalSignal < -MAX_DEFORMATION) totalSignal = -MAX_DEFORMATION;

        const desiredLength = m.baseLength * (1 + totalSignal);
        
        m.targetLength = (m.targetLength || m.baseLength);
        m.targetLength += (desiredLength - m.targetLength) * 0.05;
        m.currentLength = m.targetLength;
    }
  }

  private think(dt: number, visionRadius: number): void {
    if (!this.organism) return;
    const genome = this.organism.neuralGenome;
    
    // 1. GATHER PROPRIOCEPTION (Optimized Loop)
    let globalSensoryInput = 0;
    const nnLen = this.neuralNodesList.length;
    for (let i=0; i<nnLen; i++) {
        const nn = this.neuralNodesList[i];
        nn.sense(dt);
        globalSensoryInput += nn.inputSum;
    }
    
    // 2. VISION & DESIRE SYSTEM
    const head = this.organism.headNode;
    if (head) {
        const stability = Math.min(1.0, Math.max(0, (head.pos.y - 0.2))); 
        const vRadSq = visionRadius * visionRadius;

        for(const food of this.organism.visibleFood) {
            food.seen = false;
            food.targeted = false;
        }

        // A. Validate Current Lock
        let lockedFood = null;
        let lockedRealDistSq = Infinity;
        
        if (this.currentTargetId) {
            const found = this.organism.visibleFood.find(f => f.id === this.currentTargetId);
            if (found && !found.consumed) {
                 const dx = found.pos.x - head.pos.x;
                 const dy = found.pos.y - head.pos.y;
                 const dz = found.pos.z - head.pos.z;
                 const dSq = dx*dx + dy*dy + dz*dz;
                 
                 if (dSq < vRadSq * 1.5) { 
                     lockedFood = found;
                     lockedRealDistSq = dSq;
                 }
            }
        }

        if (!lockedFood) {
            this.currentAttention = 0;
            this.currentTargetId = null;
        }

        let currentPerceivedCost = Infinity;
        if (lockedFood) {
            const lockFactor = this.currentAttention * 0.95;
            currentPerceivedCost = lockedRealDistSq * (1.0 - lockFactor);
        }

        let bestCandidate = lockedFood;
        let bestCost = currentPerceivedCost;
        let switched = false;

        const foods = this.organism.visibleFood;
        for (let i=0; i<foods.length; i++) {
            const food = foods[i];
            if (food.consumed) continue;
            if (lockedFood && food.id === lockedFood.id) continue;
            
            const dx = food.pos.x - head.pos.x;
            const dy = food.pos.y - head.pos.y;
            const dz = food.pos.z - head.pos.z;
            const distSq = dx*dx + dy*dy + dz*dz;
            
            if (distSq < vRadSq) {
                food.seen = true;
                const cost = distSq;
                if (cost < bestCost) {
                    bestCost = cost;
                    bestCandidate = food;
                    switched = true;
                }
            }
        }

        if (bestCandidate) {
            if (switched) {
                this.currentTargetId = bestCandidate.id;
                this.currentAttention = 1.0; 
            }
            
            bestCandidate.targeted = true; 

            if (stability > 0.1) {
                const dist = Math.sqrt(bestCandidate === lockedFood ? lockedRealDistSq : bestCost);
                const dx = bestCandidate.pos.x - head.pos.x;
                const dy = bestCandidate.pos.y - head.pos.y;
                const dz = bestCandidate.pos.z - head.pos.z;

                const headNeural = this.neuralNodesMap.get(head.id);
                if (headNeural && dist > 0.0001) {
                    const signalStrength = Math.max(0, 1.0 - (dist / visionRadius)) * stability;
                    headNeural.inputSum += (dx / dist) * signalStrength * 3.0; 
                    headNeural.inputSum += (dy / dist) * signalStrength * 3.0; 
                    headNeural.inputSum += (dz / dist) * signalStrength * 3.0; 
                    globalSensoryInput += signalStrength * 2.0;
                }
            }
            this.previousDistanceToFood = Math.sqrt(bestCandidate === lockedFood ? lockedRealDistSq : bestCost);
        } else {
            this.previousDistanceToFood = Infinity;
        }
    }

    globalSensoryInput /= (nnLen || 1);
    if (isNaN(globalSensoryInput)) globalSensoryInput = 0; 

    // 3. SYNAPTIC PROPAGATION (Optimized Loop)
    const sLen = this.synapses.length;
    for(let i=0; i<sLen; i++) {
        const s = this.synapses[i];
        const w = this.synapseWeightsCache[s.weightIndex]; 
        s.nodeB.inputSum += s.nodeA.activation * w;
        s.nodeA.inputSum += s.nodeB.activation * w;
    }

    for (let i=0; i<nnLen; i++) {
        this.neuralNodesList[i].updateActivation();
    }

    // 4. RESERVOIR COMPUTING
    this.cpg.tick(globalSensoryInput);
    
    // 5. MOTOR OUTPUT
    const mus = this.organism!.muscles;
    const len = mus.length;
    for(let i=0; i<len; i++) {
        const muscle = mus[i];
        const rawAmp = this.cpg.getSignal(i, genome.outputWeights); 
        const rawFreq = this.cpg.getSignal(i + 1, genome.outputWeights); 
        
        const targetAmp = Math.min(1.0, Math.abs(rawAmp)) * 0.3; 
        const targetFreq = 0.5 + ((rawFreq + 1) / 2) * 2.5;

        muscle.amp += (targetAmp - muscle.amp) * 0.1;
        muscle.freq += (targetFreq - muscle.freq) * 0.1;
    }

    // 6. SUCTION OUTPUT
    if (genome.gripWeights && genome.gripWeights.length > 0) {
        const nodes = this.organism!.nodes;
        const nLen = nodes.length;
        for(let i=0; i<nLen; i++) {
            const rawSignal = this.cpg.getSignal(i, genome.gripWeights);
            const normalized = (rawSignal + 1) / 2;
            const node = nodes[i];
            const oldGrip = node.gripSignal || 0;
            node.gripSignal = oldGrip + (normalized - oldGrip) * 0.2;
        }
    }
  }

  private learn(): void {
      if (!this.organism) return;
      const genome = this.organism.neuralGenome;
      let learningSignal = 0;

      const currentEnergy = this.organism.energy;
      const energyDelta = currentEnergy - this.previousEnergy;
      if (energyDelta > 0.5) learningSignal += 1.0;
      this.previousEnergy = currentEnergy;

      const head = this.organism.headNode;
      if (head && head.pos.y < 0.2) {
          learningSignal -= 0.5; 
      }

      if (Math.abs(learningSignal) > 0.1) {
          const len = this.synapses.length;
          for(let i=0; i<len; i++) {
              const s = this.synapses[i];
              const coActivity = s.nodeA.activation * s.nodeB.activation;
              
              if (coActivity > 0.1) {
                  let w = this.synapseWeightsCache[s.weightIndex]; 
                  w += this.HEBBIAN_RATE * learningSignal * coActivity;
                  
                  if (w > 3.0) w = 3.0;
                  else if (w < -3.0) w = -3.0;
                  
                  this.synapseWeightsCache[s.weightIndex] = w;
                  genome.synapseWeights[s.weightIndex] = w;
              }
          }
      }
  }
}