'use client';

import { OrbitControls, Stats, useTexture } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from 'three';
import Water from "./components/Water";
import { sphereFragmentShader, sphereVertexShader } from "./shaders/sphere";
import { wallFragmentShader, wallVertexShader } from "./shaders/wall";
import GUI from "lil-gui";
import { createRotationXMatrix3, createRotationYMatrix3, createRotationZMatrix3, dotProductMatrix3Vector } from "../../lib/MathUtils";
import type { AddDrops, Paused } from "./types";
import { lightDir, sphereCenter, sphereRadius } from "./constants";
import GitHubConnection from "../../lib/components/GitHubConnection";
import ThreeJSElementContainer from "../../lib/components/ThreeJSElementContainer";
import InfoBubble from "../../lib/components/InfoBubble";

export default function WaterCanvas() {

  const statsParentRef = useRef<HTMLDivElement>(document.createElement('div'));
  const guiParentRef = useRef<HTMLDivElement>(document.createElement('div'));

  return (
    <div className="relative size-full flex-1">
      <ThreeJSElementContainer 
        ref={statsParentRef}
        position="TOP_LEFT"
      />
      <div className="absolute left-1/2 transform -translate-x-1/2 w-1/4 text-center text-sm z-10">
        Simulation shown is based on the work of&nbsp;
        <a 
          className="text-blue-500 no-underline visited:text-purple-500 hover:underline" 
          href="https://github.com/evanw/webgl-water"
          target="_blank"
        >
          Evan Wallace
        </a>
        <br /><span className="font-bold">(I do not claim ownership over this render)</span>
      </div>
      <ThreeJSElementContainer 
        ref={guiParentRef}
        position="TOP_RIGHT"
      />
      <InfoBubble
        position="BOTTOM_LEFT"
        size={8}
        className="text-gray-400 hover:text-gray-200 hover:scale-110"
        infoClassName="text-sm bg-gray-900 border-1 border-gray-500 rounded-sm p-2"
      >
        <span className="text-xs italic">Additional Info</span>
        <ul className="list-disc pl-4">
          <li>This render is based on Evan Wallace's work. Other than porting their render to a ThreeJS and React Three Fiber Environment, <span className="font-bold">I do not claim ownership over this render.</span></li>
          <li>The Shaders used for this render are from Evan Wallace with minor tweaks applied for them to function in ThreeJS.</li>
          <li>This Render is made atop of WebGL.</li>
        </ul>
      </InfoBubble>
      <GitHubConnection 
        url="https://github.com/Swasbuckler/Creative-Coding/tree/main/src/water/water-caustic"
        position="BOTTOM_RIGHT"
        size={8}
        className="text-gray-400 hover:text-gray-200 hover:scale-110"
      />
      <CanvasContainer 
        statsParentRef={statsParentRef} 
        guiParentRef={guiParentRef}
      />
    </div>
  );
}

function CanvasContainer({
  statsParentRef,
  guiParentRef
}: {
  statsParentRef: RefObject<HTMLDivElement>,
  guiParentRef: RefObject<HTMLDivElement>,
}) {

  return (
    <Canvas camera={{ position: [0, 1, 3] }}>
      <Scene guiParentRef={guiParentRef} />
      <OrbitControls />
      <Stats parent={statsParentRef} />
    </Canvas>
  );
}

function Scene({
  guiParentRef
}: {
  guiParentRef: RefObject<HTMLDivElement>
}) {

  const waterTexRef = useRef<THREE.WebGLRenderTarget>(null);
  const causticTexRef = useRef<THREE.WebGLRenderTarget>(null);

  const wallTex = useTexture(import.meta.env.VITE_PUBLIC_BASE_URL + '/water-caustic/tiles.jpg');
  wallTex.wrapS = THREE.RepeatWrapping;
  wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.minFilter = THREE.LinearMipmapLinearFilter;
  wallTex.format = THREE.RGBAFormat;

  const lightRef = useRef<THREE.Vector3>(lightDir.clone());
  const oldSphereCenterRef = useRef<THREE.Vector3>(sphereCenter.clone());
  const sphereCenterRef = useRef<THREE.Vector3>(sphereCenter.clone());
  
  const sphereMesh = useRef<THREE.Mesh>(null);
  const wallMesh = useRef<THREE.Mesh>(null);

  const lightRotationRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const spherePositionRef = useRef<THREE.Vector3>(sphereCenter.clone());
  const physicsPauseRef = useRef<Paused>({paused: false});
  const addDropsRef = useRef<AddDrops>({numOfDrops: 0});

  const waterRef = useRef<any>(null);

  const [resize, setResize] = useState(0);

  const { size } = useThree();

  useEffect(() => {
    setResize((value) => value + 1);
  }, [size])

  useEffect(() => {

    const gui = new GUI({container: guiParentRef.current});
    setupGui({
      gui,
      lightRotationRef,
      lightRef,
      spherePositionRef,
      sphereCenterRef,
      sphereMesh,
      physicsPauseRef,
      addDropsRef,
      waterRef,
    });

    return () => {
      gui.destroy();
    }
  }, []);

  return (
    <Suspense key={resize} fallback={<div>Loading...</div>}>
      <group>
        <mesh 
          ref={sphereMesh}
          position={sphereCenterRef.current}
        >
          <sphereGeometry args={[sphereRadius, 50, 50]} />
          <rawShaderMaterial 
            uniforms={{
              light: { value: lightRef.current },
              waterTex: { value: null },
              causticTex: { value: null },
              wallTex: { value: wallTex },
              sphereRadius: { value: sphereRadius },
              sphereCenter: { value: sphereCenterRef.current },
            }}
            vertexShader={sphereVertexShader}
            fragmentShader={sphereFragmentShader}
          />
        </mesh>
        <mesh 
          ref={wallMesh}
          position={[0, 0, 0]}
        >
          <WallGeometry />
          <rawShaderMaterial 
            uniforms={{
              light: { value: lightRef.current },
              waterTex: { value: null },
              causticTex: { value: null },
              wallTex: { value: wallTex },
              sphereRadius: { value: sphereRadius },
              sphereCenter: { value: sphereCenterRef.current },
            }}
            vertexShader={wallVertexShader}
            fragmentShader={wallFragmentShader}
            side={THREE.BackSide}
          />
        </mesh>
      </group>
      <Water 
        ref={waterRef}
        waterTexRef={waterTexRef}
        causticTexRef={causticTexRef}
        wallTex={wallTex}
        lightRef={lightRef}
        sphereRadius={sphereRadius}
        oldSphereCenterRef={oldSphereCenterRef}
        sphereCenterRef={sphereCenterRef}
        sphereMesh={sphereMesh}
        wallMesh={wallMesh}
        physicsPauseRef={physicsPauseRef}
        addDropsRef={addDropsRef}
      />
    </Suspense>
  );
}

function setupGui({
  gui,
  lightRotationRef,
  lightRef,
  spherePositionRef,
  sphereCenterRef,
  sphereMesh,
  physicsPauseRef,
  addDropsRef,
  waterRef,
}: {
  gui: GUI,
  lightRotationRef: RefObject<THREE.Vector3>,
  lightRef: RefObject<THREE.Vector3>,
  spherePositionRef: RefObject<THREE.Vector3>,
  sphereCenterRef: RefObject<THREE.Vector3>,
  sphereMesh: RefObject<THREE.Mesh | null>,
  physicsPauseRef: RefObject<Paused>,
  addDropsRef: RefObject<AddDrops>,
  waterRef: RefObject<any>,
}) {

  const lightRotationFolder = gui.addFolder('Light Rotation');
  lightRotationFolder.add(lightRotationRef.current, 'x', 0, 2 * Math.PI)
    .onChange((value: number) => {
      let vectorArray = dotProductMatrix3Vector(createRotationXMatrix3(value), lightDir);
      vectorArray = dotProductMatrix3Vector(createRotationYMatrix3(lightRotationRef.current.y), vectorArray);
      vectorArray = dotProductMatrix3Vector(createRotationZMatrix3(lightRotationRef.current.z), vectorArray);

      lightRef.current.copy(vectorArray);
    });
  lightRotationFolder.add(lightRotationRef.current, 'y', 0, 2 * Math.PI)
    .onChange((value: number) => {
      let vectorArray = dotProductMatrix3Vector(createRotationXMatrix3(lightRotationRef.current.x), lightDir);
      vectorArray = dotProductMatrix3Vector(createRotationYMatrix3(value), vectorArray);
      vectorArray = dotProductMatrix3Vector(createRotationZMatrix3(lightRotationRef.current.z), vectorArray);

      lightRef.current.copy(vectorArray);
    });
  lightRotationFolder.add(lightRotationRef.current, 'z', 0, 2 * Math.PI)
    .onChange((value: number) => {
      let vectorArray = dotProductMatrix3Vector(createRotationXMatrix3(lightRotationRef.current.x), lightDir);
      vectorArray = dotProductMatrix3Vector(createRotationYMatrix3(lightRotationRef.current.y), vectorArray);
      vectorArray = dotProductMatrix3Vector(createRotationZMatrix3(value), vectorArray);

      lightRef.current.copy(vectorArray);
    });

  const spherePositionFolder = gui.addFolder('Sphere Position');
  spherePositionFolder.add(spherePositionRef.current, 'x', -0.65, 0.65)
    .onChange((value: number) => {
      const vectorArray = new THREE.Vector3(value, spherePositionRef.current.y, spherePositionRef.current.z);

      sphereCenterRef.current.copy(vectorArray);
      sphereMesh.current?.position.copy(vectorArray);
    });
  spherePositionFolder.add(spherePositionRef.current, 'y', -0.65, 1)
    .onChange((value: number) => {
      const vectorArray = new THREE.Vector3(spherePositionRef.current.x, value, spherePositionRef.current.z);

      sphereCenterRef.current.copy(vectorArray);
      sphereMesh.current?.position.copy(vectorArray);
    });
  spherePositionFolder.add(spherePositionRef.current, 'z', -0.65, 0.65)
    .onChange((value: number) => {
      const vectorArray = new THREE.Vector3(spherePositionRef.current.x, spherePositionRef.current.y, value);

      sphereCenterRef.current.copy(vectorArray);
      sphereMesh.current?.position.copy(vectorArray);
    });

  const physicsFolder = gui.addFolder('Physics Controls');
  physicsFolder.add(physicsPauseRef.current, 'paused')
    .name('Paused');

  const dropletFolder = gui.addFolder('Droplet Controls');
  dropletFolder.add(addDropsRef.current, 'numOfDrops', 0, 20, 1)
    .name('Number of Drops');
  dropletFolder.add({addDropTrigger: waterRef.current.handleAddDrops}, 'addDropTrigger')
    .name('Add Drops');
}

function WallGeometry() {

  const { positions, normals, uvs, indexes } = useMemo(() => {
    const thisPositions = new Float32Array([1, 0.5, 1, 1, 0.5, -1, 1, -0.5, 1, 1, -0.5, -1, -1, 0.5, -1, -1, 0.5, 1, -1, -0.5, -1, -1, -0.5, 1, /*-1, 0.5, -1, 1, 0.5, -1, -1, 0.5, 1, 1, 0.5, 1,*/ -1, -0.5, 1, 1, -0.5, 1, -1, -0.5, -1, 1, -0.5, -1, -1, 0.5, 1, 1, 0.5, 1, -1, -0.5, 1, 1, -0.5, 1, 1, 0.5, -1, -1, 0.5, -1, 1, -0.5, -1, -1, -0.5, -1]);
    const thisNormals = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, /*1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,*/ -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
    const thisUvs = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, /*0, 1, 1, 1, 0, 0, 1, 0,*/ 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0]);
    const thisIndexes = new Uint16Array([0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5, 8, 10, 9, 10, 11, 9, 12, 14, 13, 14, 15, 13, 16, 18, 17, 18, 19, 17, 20, 22, /*21, 22, 23, 21*/]);
  
    return {
      positions: thisPositions,
      normals: thisNormals,
      uvs: thisUvs,
      indexes: thisIndexes,
    };
  }, []);
  
  return (
    <bufferGeometry>
      <float32BufferAttribute
        args={[positions, 3]}
        attach='attributes-position'
        count={positions.length / 3}
      />
      <float32BufferAttribute
        args={[normals, 3]}
        attach='attributes-normal'
        count={normals.length / 3}
      />
      <float32BufferAttribute
        args={[uvs, 2]}
        attach='attributes-uv'
        count={uvs.length / 2}
      />
      <uint16BufferAttribute
        args={[indexes, 1]}
        attach='index'
        count={indexes.length}
      />
    </bufferGeometry>
  )
}