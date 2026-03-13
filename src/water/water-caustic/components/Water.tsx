'use client';

import * as THREE from 'three';
import { useImperativeHandle, useRef, type RefObject } from "react"
import { waterResolution, waterSize } from '../constants';
import { waterAboveFragmentShader, waterUnderFragmentShader, waterVertexShader } from '../shaders/water';
import WaterSimulation from './WaterSimulation';
import { useCubeTexture } from '@react-three/drei';
import type { AddDrops, Paused } from '../types';

export default function Water({
  ref,
  waterTexRef,
  causticTexRef,
  wallTex,
  lightRef,
  sphereRadius,
  oldSphereCenterRef,
  sphereCenterRef,
  sphereMesh,
  wallMesh,
  physicsPauseRef,
  addDropsRef,
}: {
  ref: RefObject<any>,
  waterTexRef: RefObject<THREE.WebGLRenderTarget | null>,
  causticTexRef: RefObject<THREE.WebGLRenderTarget | null>,
  wallTex: THREE.Texture,
  lightRef: RefObject<THREE.Vector3>,
  sphereRadius: number,
  oldSphereCenterRef: RefObject<THREE.Vector3>,
  sphereCenterRef: RefObject<THREE.Vector3>,
  sphereMesh: RefObject<THREE.Mesh | null>,
  wallMesh: RefObject<THREE.Mesh | null>,
  physicsPauseRef: RefObject<Paused>,
  addDropsRef: RefObject<AddDrops>,
}) {

  const waterAboveMesh = useRef<THREE.Mesh>(null);
  const waterUnderMesh = useRef<THREE.Mesh>(null);

  const waterSimulationRef = useRef<any>(null);

  const skybox = useCubeTexture([
    'xpos.png',
    'xneg.png', 
    'ypos.png', 
    'yneg.png',
    'zpos.png', 
    'zneg.png',
  ], {path: import.meta.env.VITE_PUBLIC_BASE_URL + '/water-caustic/'});

  useImperativeHandle(ref, () => {
    return {
      handleAddDrops() {
        waterSimulationRef.current.handleAddDrops();
      }
    };
  });

  return (
    <>
      <group>
        <mesh ref={waterAboveMesh}>
          <WaterGeometry />
          <rawShaderMaterial 
            uniforms={{
              light: { value: lightRef.current },
              waterTex: { value: null },
              causticTex: { value: null },
              wallTex: { value: wallTex },
              sky: { value: skybox },
              sphereRadius: { value: sphereRadius },
              sphereCenter: { value: sphereCenterRef.current },
            }}
            vertexShader={waterVertexShader}
            fragmentShader={waterAboveFragmentShader}
            side={THREE.BackSide}
          />
        </mesh>
        <mesh ref={waterUnderMesh}>
          <WaterGeometry />
          <rawShaderMaterial 
            uniforms={{
              light: { value: lightRef.current },
              waterTex: { value: null },
              causticTex: { value: null },
              wallTex: { value: wallTex },
              sky: { value: skybox },
              sphereRadius: { value: sphereRadius },
              sphereCenter: { value: sphereCenterRef.current },
            }}
            vertexShader={waterVertexShader}
            fragmentShader={waterUnderFragmentShader}
            side={THREE.FrontSide}
          />
        </mesh>
      </group>
      <WaterSimulation
        ref={waterSimulationRef}
        waterAboveMesh={waterAboveMesh}
        waterUnderMesh={waterUnderMesh}
        waterTexRef={waterTexRef}
        causticTexRef={causticTexRef}
        lightRef={lightRef}
        sphereRadius={sphereRadius}
        oldSphereCenterRef={oldSphereCenterRef}
        sphereCenterRef={sphereCenterRef}
        sphereMesh={sphereMesh}
        wallMesh={wallMesh}
        physicsPauseRef={physicsPauseRef}
        addDropsRef={addDropsRef}
      />
    </>
  )
}

function WaterGeometry() {

  return (
    <planeGeometry args={[waterSize, waterSize, waterResolution, waterResolution]} />
  );
}