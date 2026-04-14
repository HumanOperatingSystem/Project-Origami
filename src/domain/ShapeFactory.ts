import { Organism, ShapeType, Node, Muscle, NeuralGenome, CellType } from './types';
import { VectorOps } from './math';
import { GeneticOperator } from './genetics/GeneticOperator';

export class ShapeFactory {
  
  static create(type: ShapeType, id: string): Organism {
    let nodes: Node[] = [];
    let muscles: Muscle[] = [];

    if (type === ShapeType.WORM) {
        ({ nodes, muscles } = this.createWorm(4));
    } else {
        // Default to Cube
        ({ nodes, muscles } = this.createCube());
    }

    // Initialize Neural Genome
    const operator = new GeneticOperator();
    const genome = operator.createRandomGenome(muscles.length, nodes.length);

    // Optimized loop instead of forEach
    for(let i=0; i<muscles.length; i++) {
        muscles[i].dnaIndex = i;
    }

    // Identify Head (Furthest Forward, then Highest Up)
    let maxZ = -Infinity;
    for(let i=0; i<nodes.length; i++) {
        if (nodes[i].pos.z > maxZ) maxZ = nodes[i].pos.z;
    }

    let candidates: Node[] = [];
    for(let i=0; i<nodes.length; i++) {
        if (Math.abs(nodes[i].pos.z - maxZ) < 0.1) candidates.push(nodes[i]);
    }

    let headNode: Node | undefined = undefined;
    let maxY = -Infinity;
    for(let i=0; i<candidates.length; i++) {
        if (candidates[i].pos.y > maxY) {
            maxY = candidates[i].pos.y;
            headNode = candidates[i];
        }
    }

    if (headNode) {
        // @ts-ignore
        headNode.isHead = true;
        headNode.cellType = CellType.HEAD;
    }
    
    const initialHeadPos = headNode ? { ...headNode.pos } : { x: 0, y: 0, z: 0 };

    return {
      id,
      shape: type, // Store shape type for editor consistency
      nodes,
      muscles,
      neuralGenome: genome,
      fitness: 0,
      generation: 1,
      // Metabolism Defaults
      energy: 100,
      maxEnergy: 100,
      hungerTime: 0,
      isAlive: true,
      foodEaten: 0,
      visibleFood: [],
      // Metabolism Defaults
      timeAlive: 0,
      // Distance Metrics (Replaces Posture)
      initialHeadPos,
      distanceTraveled: 0,
      headNode // OPTIMIZATION
    };
  }

  // HELPER: Factory for optimized Node creation
  // Initializes all fields to ensure stable V8 Hidden Class
  private static createNode(id: string, x: number, y: number, z: number, mass: number, friction: number): Node {
      return {
          id,
          pos: { x, y, z },
          oldPos: { x, y, z },
          mass,
          friction,
          // Explicitly init optional fields to avoid de-opt
          isHead: false,
          isFixed: false,
          isGripping: false,
          gripSignal: 0,
          gripStamina: 1.0, // Start full
          currentStress: 0,
          activation: 0,
          originalGridCoord: undefined,
          cellType: CellType.BODY, // Default
          gripCooldown: 0 // Init for stability
      };
  }

  private static createCube() {
    const nodes: Node[] = [];
    const size = 1.0;
    const startY = 0.5;
    
    for(let x=0; x<=1; x++) {
      for(let y=0; y<=1; y++) {
        for(let z=0; z<=1; z++) {
          const px = (x - 0.5) * size;
          const py = startY + y * size;
          const pz = (z - 0.5) * size;
          
          const isFoot = y === 0;
          
          // NEW: Top-heavy mass distribution (Body=10, Foot=4)
          const mass = isFoot ? 4.0 : 10.0;
          const friction = isFoot ? 0.95 : 0.2; // Feet stick, Body slides
          
          const node = this.createNode(`n${x}${y}${z}`, px, py, pz, mass, friction);
          node.cellType = isFoot ? CellType.FOOT : CellType.BODY;
          
          nodes.push(node);
        }
      }
    }
    const muscles = this.connectDistanceThreshold(nodes, size * 1.8);
    return { nodes, muscles };
  }

  private static createWorm(segments: number) {
    const nodes: Node[] = [];
    const size = 1.0;
    const bellyFriction = 0.5; 
    const footFriction = 0.98; 
    const m = 4.0; // Feet
    const mTop = 12.0; // Heavy Spine

    for (let i = 0; i < segments; i++) {
        const offset = i * size;
        
        const footA = this.createNode(`n${i}_a`, -0.5, 0, offset, m, footFriction);
        footA.cellType = CellType.FOOT;
        
        const footB = this.createNode(`n${i}_b`, 0.5, 0, offset, m, footFriction);
        footB.cellType = CellType.FOOT;
        
        const top = this.createNode(`n${i}_top`, 0, 1, offset + 0.5, mTop, bellyFriction);
        top.cellType = CellType.BODY;

        nodes.push(footA, footB, top);
    }
    return { nodes, muscles: this.connectDistanceThreshold(nodes, size * 1.5) };
  }

    private static connectDistanceThreshold(nodes: Node[], threshold: number): Muscle[] {
      const muscles: Muscle[] = [];
      let mCount = 0;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = VectorOps.distance(nodes[i].pos, nodes[j].pos);
          if (dist <= threshold) {
            muscles.push({
              id: `m${mCount++}`,
              nodeA: nodes[i].id,
              nodeB: nodes[j].id,
              baseLength: dist,
              stiffness: 1.0,
              dnaIndex: 0,
              phase: Math.random() * Math.PI * 2,
              freq: 1.0,
              amp: 0.0,
              currentLength: dist,
              targetLength: dist,
              nodeRefA: undefined,
              nodeRefB: undefined
            });
          }
        }
      }
      return muscles;
    }
}