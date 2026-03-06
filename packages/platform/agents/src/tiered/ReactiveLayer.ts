/**
 * @hololand/agents ReactiveLayer (Layer 1)
 *
 * MobileLLM 125M based reactive behavior. Fast responses (<50ms).
 */

export interface ReactiveInput {
  perception: { detectedObjects: Array<{ objectId: string; confidence: number }>; gazeTarget: string | null; gestureDetected: string | null; speechDetected: boolean };
  agentState: { mood: string; activity: string; position: { x: number; y: number; z: number } };
}

export interface ReactiveOutput {
  action: string;
  targetObject: string | null;
  animationId: string;
  speechResponse: string | null;
  confidence: number;
  latencyMs: number;
}

export class ReactiveLayer {
  private actionCount: number = 0;

  async process(input: ReactiveInput): Promise<ReactiveOutput> {
    const start = performance.now();
    this.actionCount++;

    let action = 'idle';
    let animationId = 'anim_idle';
    let speechResponse: string | null = null;
    let targetObject: string | null = null;

    if (input.perception.gestureDetected === 'wave') {
      action = 'greet';
      animationId = 'anim_wave';
      speechResponse = 'Hello there!';
    } else if (input.perception.speechDetected) {
      action = 'listen';
      animationId = 'anim_listen';
    } else if (input.perception.gazeTarget) {
      action = 'look_at';
      targetObject = input.perception.gazeTarget;
      animationId = 'anim_look';
    }

    return {
      action,
      targetObject,
      animationId,
      speechResponse,
      confidence: 0.8,
      latencyMs: performance.now() - start,
    };
  }

  getActionCount(): number { return this.actionCount; }
}
