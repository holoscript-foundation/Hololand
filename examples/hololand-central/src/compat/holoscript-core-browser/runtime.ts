import { HoloScriptPlusRuntimeImpl, parseHoloScriptPlus } from './index';

export function createRuntime(source: string, options: Record<string, unknown> = {}) {
  const parsed = typeof source === 'string' ? parseHoloScriptPlus(source).ast : source;
  const runtime = new HoloScriptPlusRuntimeImpl(parsed as never, options as never);

  return {
    start() {
      runtime.mount(null);
    },
    stop() {
      runtime.unmount();
    },
    runtime,
  };
}
