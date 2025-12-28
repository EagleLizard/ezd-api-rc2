
import promClient, { collectDefaultMetrics } from 'prom-client';

/*
  Singleton
_*/
export class Metrics {
  static instance: Metrics | undefined;
  register = new promClient.Registry();
  private constructor() {
    this.register = new promClient.Registry();
    collectDefaultMetrics({ register: this.register });
  }

  collect(): Promise<string> {
    return this.register.metrics();
  }

  static init(): Metrics {
    if(this.instance !== undefined) {
      return this.instance;
    }
    this.instance = new Metrics();
    return this.instance;
  }
}
