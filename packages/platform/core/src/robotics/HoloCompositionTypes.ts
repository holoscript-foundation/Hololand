export type HoloValue =
  | string
  | number
  | boolean
  | null
  | HoloValue[]
  | { readonly [key: string]: HoloValue };

export interface HoloProperty {
  key: string;
  value: HoloValue;
}

export interface HoloObjectTrait {
  name: string;
  config?: Record<string, HoloValue>;
}

export interface HoloObjectDecl {
  name: string;
  properties?: HoloProperty[];
  traits?: (HoloObjectTrait | string)[];
  children?: HoloObjectDecl[];
}

export interface HoloSpatialGroup {
  name: string;
  properties?: HoloProperty[];
  objects?: HoloObjectDecl[];
  groups?: HoloSpatialGroup[];
}

export interface HoloLight {
  name?: string;
  lightType?: string;
  properties?: HoloProperty[];
}

export interface HoloEnvironment {
  properties?: HoloProperty[];
}

export interface HoloComposition {
  name?: string;
  objects?: HoloObjectDecl[];
  spatialGroups?: HoloSpatialGroup[];
  lights?: HoloLight[];
  environment?: HoloEnvironment;
}
