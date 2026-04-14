import { NeuralGenome } from '../types';

export class GeneticOperator {
    private mutationRate: number;

    constructor(mutationRate: number = 0.05) {
        this.mutationRate = mutationRate;
    }

    public createRandomGenome(numMuscles: number, numNodes: number, reservoirSize: number = 20): NeuralGenome {
        return {
            synapseWeights: this.randomArray(numMuscles * 2),
            reservoirWeights: this.randomArray(reservoirSize * reservoirSize),
            outputWeights: this.randomArray(numMuscles * reservoirSize),
            predictionWeights: this.randomArray(reservoirSize),
            gripWeights: this.randomArray(numNodes * reservoirSize),
            biases: this.randomArray(numNodes),
            // Default Evolvable Params
            internalClockSpeed: 1.0,
            waveFreq: 1.5,
            waveSpeed: 1.0
        };
    }

    public cloneGenome(source: NeuralGenome): NeuralGenome {
        return {
            synapseWeights: [...source.synapseWeights],
            reservoirWeights: [...source.reservoirWeights],
            outputWeights: [...source.outputWeights],
            predictionWeights: source.predictionWeights ? [...source.predictionWeights] : [],
            gripWeights: source.gripWeights ? [...source.gripWeights] : [],
            biases: [...source.biases],
            internalClockSpeed: source.internalClockSpeed ?? 1.0,
            waveFreq: source.waveFreq ?? 1.5,
            waveSpeed: source.waveSpeed ?? 1.0
        };
    }

    public mutateGenome(genome: NeuralGenome): void {
        const mutateArray = (arr: number[]) => {
            if (!arr) return;
            for(let i=0; i<arr.length; i++) {
                if (Math.random() < this.mutationRate) {
                    arr[i] += (Math.random() - 0.5) * 0.5;
                    if (arr[i] > 2) arr[i] = 2;
                    if (arr[i] < -2) arr[i] = -2;
                }
            }
        };

        mutateArray(genome.synapseWeights);
        mutateArray(genome.reservoirWeights);
        mutateArray(genome.outputWeights);
        mutateArray(genome.predictionWeights);
        mutateArray(genome.gripWeights);
        mutateArray(genome.biases);

        // Mutate Parameters
        if (Math.random() < this.mutationRate) {
            genome.internalClockSpeed += (Math.random() - 0.5) * 0.2;
            genome.internalClockSpeed = Math.max(0.5, Math.min(2.0, genome.internalClockSpeed));
        }
        if (Math.random() < this.mutationRate) {
            genome.waveFreq += (Math.random() - 0.5) * 0.5;
            genome.waveFreq = Math.max(0.2, Math.min(4.0, genome.waveFreq));
        }
        if (Math.random() < this.mutationRate) {
            genome.waveSpeed += (Math.random() - 0.5) * 0.2;
            genome.waveSpeed = Math.max(0.1, Math.min(3.0, genome.waveSpeed));
        }
    }

    private randomArray(size: number): number[] {
        return Array.from({ length: size }, () => (Math.random() * 1.0) - 0.5);
    }
}