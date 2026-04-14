import { Organism } from '../types';

export interface IFitnessEvaluator {
    evaluate(organism: Organism, dt: number): void;
    finalize(organism: Organism): void;
}

export class StandardFitnessEvaluator implements IFitnessEvaluator {
    evaluate(organism: Organism, dt: number): void {
        // 1. Initialize Time Alive if missing
        if (organism.timeAlive === undefined) {
            organism.timeAlive = 0;
        }

        // 2. Accumulate Time Alive (in milliseconds)
        organism.timeAlive += dt * 1000;

        // 3. Fitness is simply time alive
        organism.fitness = organism.timeAlive;
        
        // Final fallback
        if (!isFinite(organism.fitness)) organism.fitness = 0;
    }

    finalize(organism: Organism): void {
        // No special finalization needed for time-based fitness
    }
}