'use client';

import { useFBO } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { fixedTimeStep, maxFocusedSeconds, waterResolution, waterSize } from '../constants';
import { dropFragmentShader, moveSphereFragmentShader, normalFragmentShader, updateFragmentShader, waterSimulationVertexShader } from '../shaders/water-simulation';
import { causticsFragmentShader, causticsVertexShader } from '../shaders/caustics';
import type { AddDrops, Paused } from '../types';

export default function WaterSimulation({
  waterAboveMesh,
  waterUnderMesh,
  waterTexRef,
  causticTexRef,
  lightRef,
  sphereRadius,
  oldSphereCenterRef,
  sphereCenterRef,
  sphereMesh,
  wallMesh,
  physicsPauseRef,
  addDropsRef,
}: {
  waterAboveMesh: RefObject<THREE.Mesh | null>,
  waterUnderMesh: RefObject<THREE.Mesh | null>,
  waterTexRef: RefObject<THREE.WebGLRenderTarget | null>,
  causticTexRef: RefObject<THREE.WebGLRenderTarget | null>,
  lightRef: RefObject<THREE.Vector3>,
  sphereRadius: number,
  oldSphereCenterRef: RefObject<THREE.Vector3>,
  sphereCenterRef: RefObject<THREE.Vector3>,
  sphereMesh: RefObject<THREE.Mesh | null>,
  wallMesh: RefObject<THREE.Mesh | null>,
  physicsPauseRef: RefObject<Paused>,
  addDropsRef: RefObject<AddDrops>,
}) {
  const accumulator = useRef<number>(0);

  const { gl, camera } = useThree();

  const dropMesh = useRef<THREE.Mesh>(null);
  const updateMesh = useRef<THREE.Mesh>(null);
  const normalMesh = useRef<THREE.Mesh>(null);
  const moveSphereMesh = useRef<THREE.Mesh>(null);

  const targetA = useFBO(waterResolution, waterResolution, { type: THREE.FloatType });
  const targetB = useFBO(waterResolution, waterResolution, { type: THREE.FloatType });
  waterTexRef.current = targetA;

  const causticMesh = useRef<THREE.Mesh>(null);
  const causticTargetA = useFBO(waterResolution * 4.0, waterResolution * 4.0, { type: THREE.FloatType });
  const causticTargetB = useFBO(waterResolution * 4.0, waterResolution * 4.0, { type: THREE.FloatType });
  causticTexRef.current = causticTargetA;
  
  const addDrop = (
    gl: THREE.WebGLRenderer, 
    camera: THREE.Camera,
    x: number, 
    y: number, 
    radius: number, 
    strength: number
  ) => {
    (dropMesh.current!.material as THREE.RawShaderMaterial).uniforms['center'].value = [x, y];
    (dropMesh.current!.material as THREE.RawShaderMaterial).uniforms['radius'].value = radius;
    (dropMesh.current!.material as THREE.RawShaderMaterial).uniforms['strength'].value = strength;

    render(gl, dropMesh, camera);
  };

  const addDrops = (
    gl: THREE.WebGLRenderer, 
    camera: THREE.Camera,
    numberOfDrops: number,
  ) => {
    for (var i = 0; i < numberOfDrops; i++) {
      addDrop(
        gl,
        camera,
        Math.random() * 2 - 1, 
        Math.random() * 2 - 1, 
        Math.random() * 0.03 + 0.03, 
        Math.random() * 0.02 + 0.02,
      );
    }
  };

  const render = (
    gl: THREE.WebGLRenderer, 
    mesh: RefObject<THREE.Mesh | null>,
    camera: THREE.Camera
  ) => {
    const oldTarget = waterTexRef.current!;
    const newTarget = waterTexRef.current === targetA ? targetB : targetA;

    const previousTarget = gl.getRenderTarget();

    (mesh.current!.material as THREE.RawShaderMaterial).uniforms['waterTex'].value = oldTarget.texture;

    mesh.current!.visible = true;
    gl.setRenderTarget(newTarget);
    gl.render(mesh.current!, camera);
    mesh.current!.visible = false;

    gl.setRenderTarget(previousTarget);

    waterTexRef.current = newTarget;
  };

  const updateWater = () => {
    (waterAboveMesh.current!.material as THREE.RawShaderMaterial).uniforms['waterTex'].value = waterTexRef.current!.texture;
    (waterUnderMesh.current!.material as THREE.RawShaderMaterial).uniforms['waterTex'].value = waterTexRef.current!.texture;

    (causticMesh.current!.material as THREE.RawShaderMaterial).uniforms['waterTex'].value = waterTexRef.current!.texture;

    (sphereMesh.current!.material as THREE.RawShaderMaterial).uniforms['waterTex'].value = waterTexRef.current!.texture;
    (wallMesh.current!.material as THREE.RawShaderMaterial).uniforms['waterTex'].value = waterTexRef.current!.texture;
  };

  const renderCaustic = (
    gl: THREE.WebGLRenderer,
    mesh: RefObject<THREE.Mesh | null>,
    camera: THREE.Camera
  ) => {

    const oldTarget = causticTexRef.current!;
    const newTarget = causticTexRef.current === causticTargetA ? causticTargetB : causticTargetA;

    const previousTarget = gl.getRenderTarget();

    (mesh.current!.material as THREE.RawShaderMaterial).uniforms['oldCausticTex'].value = oldTarget.texture;

    mesh.current!.visible = true;
    gl.setRenderTarget(newTarget);
    gl.render(mesh.current!, camera);
    mesh.current!.visible = false;

    gl.setRenderTarget(previousTarget);

    causticTexRef.current = newTarget;
  };

  const updateCaustic = () => {
    (waterAboveMesh.current!.material as THREE.RawShaderMaterial).uniforms['causticTex'].value = causticTexRef.current!.texture;
    (waterUnderMesh.current!.material as THREE.RawShaderMaterial).uniforms['causticTex'].value = causticTexRef.current!.texture;
    
    (sphereMesh.current!.material as THREE.RawShaderMaterial).uniforms['causticTex'].value = causticTexRef.current!.texture;
    (wallMesh.current!.material as THREE.RawShaderMaterial).uniforms['causticTex'].value = causticTexRef.current!.texture;
  };

  const moveSphere = (
    gl: THREE.WebGLRenderer, 
    camera: THREE.Camera,
    oldCenter: THREE.Vector3,
    newCenter: THREE.Vector3,
    radius: number
  ) => {
    (moveSphereMesh.current!.material as THREE.RawShaderMaterial).uniforms['oldCenter'].value = oldCenter;
    (moveSphereMesh.current!.material as THREE.RawShaderMaterial).uniforms['newCenter'].value = newCenter;
    (moveSphereMesh.current!.material as THREE.RawShaderMaterial).uniforms['radius'].value = radius;

    render(gl, moveSphereMesh, camera);
  };
  
  useFrame((state, delta) => {

    const { gl, camera } = state;
    const size = new THREE.Vector2();
    gl.getSize(size);

    const pixelRatio = gl.getPixelRatio();

    const actualWidth = size.width * pixelRatio;
    const actualHeight = size.height * pixelRatio;
    (causticMesh.current!.material as THREE.RawShaderMaterial).uniforms['resolution'].value = new THREE.Vector2(actualWidth, actualHeight);

    dropMesh.current!.visible = false;
    updateMesh.current!.visible = false;
    normalMesh.current!.visible = false;
    moveSphereMesh.current!.visible = false;
    causticMesh.current!.visible = false;

    if (addDropsRef.current.trigger) {
      addDropsRef.current.trigger = false;
      addDrops(gl, camera, addDropsRef.current.numOfDrops);
    }

    if (!physicsPauseRef.current.paused) {
      accumulator.current += delta;

      while (accumulator.current >= fixedTimeStep) {
        if (accumulator.current > maxFocusedSeconds) {
          accumulator.current = fixedTimeStep;
        }

        accumulator.current -= fixedTimeStep;

        moveSphere(gl, camera, oldSphereCenterRef.current, sphereCenterRef.current, sphereRadius);
        oldSphereCenterRef.current = sphereCenterRef.current.clone();

        render(gl, updateMesh, camera);
        //render(gl, updateMesh, camera);
        render(gl, normalMesh, camera);
        renderCaustic(gl, causticMesh, camera);
      }

      updateWater();
      updateCaustic();
    }
  });

  useEffect(() => {
    addDrops(gl, camera, 20);
  }, []);

  return (
    <>
      <group>
        <mesh ref={dropMesh}>
          <RenderTargetGeometry />
          <rawShaderMaterial 
            uniforms={{
              center: { value: [0, 0] },
              radius: { value: 0 },
              strength: { value: 0 },
              waterTex: { value: null },
            }}
            vertexShader={waterSimulationVertexShader}
            fragmentShader={dropFragmentShader}
          />
        </mesh>
        <mesh ref={updateMesh}>
          <RenderTargetGeometry />
          <rawShaderMaterial 
            uniforms={{
              delta: { value: [1 / 216, 1 / 216] }, 
              waterTex: { value: null },
            }}
            vertexShader={waterSimulationVertexShader}
            fragmentShader={updateFragmentShader}
          />
        </mesh>
        <mesh ref={normalMesh}>
          <RenderTargetGeometry />
          <rawShaderMaterial 
            uniforms={{
              delta: { value: [1 / 216, 1 / 216] }, 
              waterTex: { value: null },
            }}
            vertexShader={waterSimulationVertexShader}
            fragmentShader={normalFragmentShader}
          />
        </mesh>
         <mesh ref={moveSphereMesh}>
          <RenderTargetGeometry />
          <rawShaderMaterial 
            uniforms={{
              oldCenter: { value: sphereCenterRef.current },
              newCenter: { value: sphereCenterRef.current },
              radius: { value: sphereRadius },
              waterTex: { value: null },
            }}
            vertexShader={waterSimulationVertexShader}
            fragmentShader={moveSphereFragmentShader}
          />
        </mesh>
      </group>
      <mesh 
        ref={causticMesh}
        position={[0.0, 2.0, 0.0]} 
      >
        <planeGeometry args={[waterSize, waterSize, waterResolution, waterResolution]} />
        <rawShaderMaterial 
          uniforms={{
            light: { value: lightRef.current },
            waterTex: { value: null },
            sphereRadius: { value: sphereRadius },
            sphereCenter: { value: sphereCenterRef.current },
            oldCausticTex: { value: null },
            resolution: { value: new THREE.Vector2() },
          }}
          vertexShader={causticsVertexShader}
          fragmentShader={causticsFragmentShader}
          glslVersion={THREE.GLSL3}
        />
      </mesh>
    </>
  );
}

function RenderTargetGeometry() {

  return (
    <planeGeometry args={[waterSize, waterSize]} />
  );
}
