/**
 * Type declarations for WGSL shader imports.
 *
 * When using Vite, Turbopack, or webpack with raw-loader, .wgsl files
 * can be imported as raw strings via the `?raw` query suffix.
 *
 * For bundlers that support module rules:
 *   Vite: Built-in support for `?raw` suffix
 *   webpack: Use `asset/source` type for .wgsl extension
 *   Turbopack: Use `@turbo/rules` with raw loader for .wgsl
 *
 * @module gaussian-splat-viewer/shaders/wgsl.d.ts
 */

declare module '*.wgsl?raw' {
  const content: string;
  export default content;
}

declare module '*.wgsl' {
  const content: string;
  export default content;
}
