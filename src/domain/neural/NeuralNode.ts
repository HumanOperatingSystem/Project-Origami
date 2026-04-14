import { Node } from '../types';

export class NeuralNode {
  public id: string;
  public inputSum: number = 0;
  public activation: number = 0;
  public output: number = 0;
  
  // Corresponding physical node
  private physicalNode: Node;
  
  constructor(node: Node) {
    this.id = node.id;
    this.physicalNode = node;
  }

  public reset(): void {
    this.inputSum = 0;
    this.activation = 0;
    this.output = 0;
  }

  // 1. Sense: Gather data from the physical world
  public sense(dt: number): void {
    // Proprioception: "Am I touching the ground?"
    const isTouchingGround = this.physicalNode.pos.y <= 0.1 ? 1.0 : 0.0;
    
    // Proprioception: "How fast am I moving?"
    const vx = this.physicalNode.pos.x - this.physicalNode.oldPos.x;
    const vy = this.physicalNode.pos.y - this.physicalNode.oldPos.y;
    const vz = this.physicalNode.pos.z - this.physicalNode.oldPos.z;
    
    let velocity = Math.sqrt(vx*vx + vy*vy + vz*vz) / dt; 
    
    // SENSORY CLAMP: Prevent explosion if physics glitch occurs
    if (velocity > 5.0) velocity = 5.0;

    // Feed into input sum (bias + sense)
    this.inputSum += isTouchingGround * 2.0; 
    this.inputSum += velocity * 0.1; 
  }

  // 2. Propagate: Send signal to neighbors (Handled by BrainController via synapses)
  
  // 3. Activate: Nonlinear transfer function
  public updateActivation(): void {
    // Sigmoid 0-1 for "Glow"
    this.activation = 1 / (1 + Math.exp(-this.inputSum));
    
    // Store in physical node for Renderer to see
    this.physicalNode.activation = this.activation;
    
    // HARD RESET input for next frame (Architecture decision: Discrete timesteps)
    // We clear it here because `sense()` and `think()` rebuild it every frame.
    this.inputSum = 0; 
  }
}