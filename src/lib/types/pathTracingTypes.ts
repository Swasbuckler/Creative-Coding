import * as THREE from 'three/webgpu';

export type MaterialObject = {
	color: MaterialColor;
	roughness: number;
	metalness: number;
  transmission: number;
	refractiveIndex: number;
  emission: number;
  subsurface: number;
  anisotropic: number;
  sheen: number;
  clearcoat: number;
  tint: number;
};

export type MaterialColor = {
  r: number,
  g: number,
  b: number,
};

export type LightDataObject = Record<number, number>
export type TLASData = Record<number, BLASData>

export type BLASData = {
  mesh: THREE.Mesh,
  min: THREE.Vector3,
  max: THREE.Vector3,
  inverseTransform: THREE.Matrix4,
  triangleArray: Float32Array<ArrayBuffer>,
  bvhArray: Float32Array<ArrayBuffer>,
  lightArray: Float32Array<ArrayBuffer>,
}

export type DataNode = {
  min: THREE.Vector3,
  max: THREE.Vector3,
  firstIndex: number,
  count: number,
};

export type Bin = {
  min: THREE.Vector3,
  max: THREE.Vector3,
  count: number,
};

export type TriangleDataObject = {
  totalTriangleAmount: number,
}

export type MeshType = "Mesh" | "InstancedMesh" | "NonMesh"

export type ObjectUpdaterData = {
  type: MeshType,
  constant: boolean,
  update: 0 | 1 | 2,
  children?: ObjectUpdaterData[],
}

export type CameraData = {
  position: THREE.Vector3,
  rotation: THREE.Euler,
}