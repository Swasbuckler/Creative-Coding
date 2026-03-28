import type { ThreeElement } from "@react-three/fiber";
import { InstancedMesh, MeshBasicNodeMaterial, MeshStandardNodeMaterial, Sprite, SpriteNodeMaterial } from "three/webgpu";

declare module '@react-three/fiber' {
  interface ThreeElements {
    instancedMesh: ThreeElement<typeof InstancedMesh>,
    meshBasicNodeMaterial: ThreeElement<typeof MeshBasicNodeMaterial>,
    meshStandardNodeMaterial: ThreeElement<typeof MeshStandardNodeMaterial>,
    sprite: ThreeElement<typeof Sprite>,
    spriteNodeMaterial: ThreeElement<typeof SpriteNodeMaterial>,
  }
}