export class CentralPatternGenerator {
  private size: number = 20; 
  private weights: number[]; 
  
  // DOUBLE BUFFERING (Optimization)
  // We flip between A and B to avoid creating new arrays every tick
  private bufferA: Float32Array;
  private bufferB: Float32Array;
  private usingBufferA: boolean = true;

  constructor(size: number = 20) {
    this.size = size;
    this.bufferA = new Float32Array(size);
    this.bufferB = new Float32Array(size);
    this.weights = [];
  }

  public initialize(weights: number[]): void {
    this.weights = weights;
    if (this.weights.length < this.size * this.size) {
        const missing = (this.size * this.size) - this.weights.length;
        for(let i=0; i<missing; i++) this.weights.push(Math.random() - 0.5);
    }
  }

  public tick(sensoryInput: number): void {
    // 1. Select Buffers (Read from current, Write to next)
    const currentNeurons = this.usingBufferA ? this.bufferA : this.bufferB;
    const nextNeurons = this.usingBufferA ? this.bufferB : this.bufferA;

    const leak = 0.2; // 20% new info, 80% memory. Makes the brain "slower" and smoother.
    
    // 2. Update State
    for (let i = 0; i < this.size; i++) {
      let sum = 0;
      const rowOffset = i * this.size;

      // Internal Recurrence (Matrix Multiplication)
      for (let j = 0; j < this.size; j++) {
        const w = this.weights[rowOffset + j] || 0;
        sum += currentNeurons[j] * w;
      }
      
      // Sensory Input
      sum += sensoryInput * 0.5;

      // Activation with Inertia (Leaky Integrator)
      const targetActivation = Math.tanh(sum);
      
      // Smooth transition: New = Old * (1-leak) + Target * leak
      nextNeurons[i] = currentNeurons[i] * (1 - leak) + targetActivation * leak;
    }

    // 3. Swap Buffer Flag
    this.usingBufferA = !this.usingBufferA;
  }

  public getSignal(muscleIndex: number, outputWeights: number[]): number {
    const neurons = this.usingBufferA ? this.bufferA : this.bufferB;
    
    let sum = 0;
    const offset = (muscleIndex * this.size) % outputWeights.length;
    
    for (let i = 0; i < this.size; i++) {
        const wIdx = (offset + i) % outputWeights.length;
        sum += neurons[i] * outputWeights[wIdx];
    }
    
    return Math.tanh(sum); 
  }
}