import type { ThreeElement } from "@react-three/fiber";
import type { TeapotGeometry } from "three/examples/jsm/Addons.js";
import { InstancedMesh, MeshBasicNodeMaterial, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, Sprite, SpriteNodeMaterial } from "three/webgpu";

declare module '@react-three/fiber' {
  interface ThreeElements {
    instancedMesh: ThreeElement<typeof InstancedMesh>,
    meshBasicNodeMaterial: ThreeElement<typeof MeshBasicNodeMaterial>,
    meshStandardNodeMaterial: ThreeElement<typeof MeshStandardNodeMaterial>,
    meshPhysicalNodeMaterial: ThreeElement<typeof MeshPhysicalNodeMaterial>,
    sprite: ThreeElement<typeof Sprite>,
    spriteNodeMaterial: ThreeElement<typeof SpriteNodeMaterial>,
    teapotGeometry: ThreeElement<typeof TeapotGeometry>,
  }
}