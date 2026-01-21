/**
 * @hololand/holoscript-compiler
 *
 * Compiles HoloScript (.holo, .hsplus) to React Three Fiber components.
 */

export { R3FCompiler, type CompilerOptions, type CompilationResult } from './R3FCompiler.js';
export { compile, compileFile, compileToFile, compileDirectory, watchFile } from './compile.js';
export { generateComponent, generateWorld, generateMaterial, generatePhysicsWrapper, generateAudio } from './generators.js';
export {
  HotReloadServer,
  type HotReloadOptions,
  startHotReload,
  viteHoloScriptPlugin,
  WebpackHoloScriptPlugin,
} from './hotReload.js';
