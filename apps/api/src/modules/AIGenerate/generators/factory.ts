import { BananaGenerator } from '../../NanoBanana/banana.generator';
import { SeedreamGenerator } from '../../Seedream/seedream.generator';
import type { BananaService } from '../../NanoBanana/banana.services';
import type { SeedreamService } from '../../Seedream/seedream.services';
import { AIGenerator } from './base.generator';

export class GeneratorFactory {
  private generators: Map<string, AIGenerator>;

  constructor(bananaService: BananaService, seedreamService: SeedreamService) {
    this.generators = new Map();
    const seedreamGenerator = new SeedreamGenerator(seedreamService);
    const bananaGenerator = new BananaGenerator(bananaService);

    this.generators.set(seedreamGenerator.getSupportedAction(), seedreamGenerator);
    this.generators.set(bananaGenerator.getSupportedAction(), bananaGenerator);
  }

  getGenerator(action: string): AIGenerator {
    const generator = this.generators.get(action);

    if (!generator) {
      throw new Error(
        `Unsupported action: ${action}. Available actions: ${Array.from(this.generators.keys()).join(', ')}`,
      );
    }

    return generator;
  }

  getSupportedActions(): string[] {
    return Array.from(this.generators.keys());
  }
}
