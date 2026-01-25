/**
 * @hololand/playground
 * 
 * Real-time 3D world building with HoloScript in the browser.
 * 
 * @example
 * ```tsx
 * import { Playground, Editor, Preview3D } from '@hololand/playground';
 * 
 * // Full playground
 * <Playground />
 * 
 * // Or use components individually
 * <Editor value={code} onChange={setCode} />
 * <Preview3D ast={ast} />
 * ```
 */

export { App as Playground } from './App';
export { Editor } from './components/Editor';
export { Preview3D } from './components/Preview3D';
export { useHoloScriptCompiler } from './hooks/useHoloScriptCompiler';
export { STARTER_CODE, EXAMPLES } from './templates/starter';
export type { HoloAST, HoloObject, HoloEnvironment, CompileError } from './types';
