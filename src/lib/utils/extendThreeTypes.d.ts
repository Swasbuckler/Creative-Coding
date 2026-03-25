import type { ThreeElement } from "@react-three/fiber";
import { MeshBasicNodeMaterial } from "three/webgpu";

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshBasicNodeMaterial: ThreeElement<typeof MeshBasicNodeMaterial>
  }
}