// Type declarations for React Three Fiber JSX elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      primitive: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      ambientLight: any;
      pointLight: any;
    }
  }
}

export {};
