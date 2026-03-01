import { BananaGenerator } from '../../NanoBanana/banana.generator';
import { SeedreamGenerator } from '../../Seedream/seedream.generator';
import { AIGenerator } from './base.generator';

/**
 * 根据 action 类型返回对应的生成器实例
 */
class GeneratorFactory {
  private generators: Map<string, AIGenerator>;

  constructor() {
    this.generators = new Map();
    this.registerGenerators();
  }

  /** 注册所有生成器 */
  private registerGenerators() {
    const seedreamGenerator = new SeedreamGenerator();
    const bananaGenerator = new BananaGenerator();

    this.generators.set(seedreamGenerator.getSupportedAction(), seedreamGenerator);
    this.generators.set(bananaGenerator.getSupportedAction(), bananaGenerator);
  }

  /** 根据 action 获取对应的生成器 */
  getGenerator(action: string): AIGenerator {
    const generator = this.generators.get(action);

    if (!generator) {
      throw new Error(
        `Unsupported action: ${action}. Available actions: ${Array.from(this.generators.keys()).join(', ')}`
      );
    }

    return generator;
  }

  /** 获取所有支持的 action */
  getSupportedActions(): string[] {
    return Array.from(this.generators.keys());
  }
}

export const generatorFactory = new GeneratorFactory();
