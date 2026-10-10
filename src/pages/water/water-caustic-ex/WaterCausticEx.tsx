import { Environment, MeshTransmissionMaterial, OrbitControls, Stats, useFBO } from "@react-three/drei";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import GUI from "lil-gui";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import GitHubConnection from "../../../lib/components/GitHubConnection";
import InfoBubble from "../../../lib/components/InfoBubble";
import ThreeJSElementContainer from "../../../lib/components/ThreeJSElementContainer";
import * as THREE from 'three/webgpu';
import type { WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.Nodes.js";
import ThreeJSSuspenseElement from "../../../lib/components/ThreeJSSuspenseElement";
import { InstancedMesh, MeshStandardNodeMaterial, MeshBasicNodeMaterial, MeshPhysicalNodeMaterial } from "three/webgpu";
import { abs, add, ceil, cos, cross, div, dot, exp, float, floor, Fn, If, instancedArray, instanceIndex, int, length, lessThan, mul, negate, normalize, PI, positionGeometry, positionLocal, pow, round, sin, sqrt, storage, storageTexture, sub, texture, textureLoad, textureStore, uniform, uv, uvec2, vec2, vec3, vec4 } from "three/tsl";
import { gravity, textureResolution } from "./constants";
import { phillips, hash, gaussianNoise, hTilde, dispersion } from "../../../lib/utils/tslUtils";

extend({InstancedMesh, MeshStandardNodeMaterial, MeshBasicNodeMaterial, MeshPhysicalNodeMaterial});

export default function WaterCausticExCanvas() {

  const statsParentRef = useRef<HTMLDivElement>(document.createElement('div'));
  const guiParentRef = useRef<HTMLDivElement>(document.createElement('div'));

  return (
    <div className="relative size-full flex-1">
      <ThreeJSElementContainer 
        ref={statsParentRef}
        position="TOP_LEFT"
      />
      <ThreeJSElementContainer
        ref={guiParentRef}
        position="TOP_RIGHT"
      />
      <InfoBubble
        position="BOTTOM_LEFT"
        className="text-gray-400 hover:text-gray-200 hover:scale-110"
        infoClassName="text-xs sm:text-sm bg-gray-900 border-1 border-gray-500 rounded-sm p-2"
      >
        <span className="text-xs italic">Additional Info</span>
        <ul className="list-disc pl-4 [&>li]:mb-1">
          <li>This Render is made atop of WebGPU and the ThreeJS Shading Language.</li>
        </ul>
      </InfoBubble>
      <GitHubConnection 
        url="https://github.com/Swasbuckler/Creative-Coding/tree/main/src/pages/water/water-caustics-ex"
        position="BOTTOM_RIGHT"
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
    <Canvas
      camera={{ position: [0, 1, 3] }}
      resize={{ debounce: 250 }}
      gl={async (props) => {
        const renderer = new THREE.WebGPURenderer(props as WebGPURendererParameters);
        await renderer.init();
        return renderer;
      }}
    >
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

  const [resize, setResize] = useState(0);
  const [causticsLight] = useState(() => new THREE.Vector3(5, 5, 5));
  
  const { size, gl } = useThree();
  
  useEffect(() => {
    setResize((value) => value + 1);
  }, [size]);

  useEffect(() => {
  
    const gui = new GUI({container: guiParentRef.current});

    const causticFolder = gui.addFolder('Caustics');
    causticFolder.add(causticsLight, 'x', -10, 10).name('Light Position X');
    causticFolder.add(causticsLight, 'y', -10, 10).name('Light Position Y');
    causticFolder.add(causticsLight, 'z', -10, 10).name('Light Position Z');

    return () => {
      gui.destroy();
    }
  }, []);
  
  return (
    <Suspense
      key={resize} 
      fallback={<ThreeJSSuspenseElement />}
    >
      <group>
        <Water 
          light={causticsLight}
        />
      </group>
      <Environment 
        background 
        preset="lobby"
      />
    </Suspense>
  );
}

function Water({
  light
}: {
  light: THREE.Vector3
}) {

  const [normalCamera] = useState(() => new THREE.PerspectiveCamera());
  const [normalMaterial] = useState(() => new THREE.MeshNormalMaterial());

  const waterRef = useRef<THREE.Mesh>(null);
  const planeRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.Mesh>(null);

  const renderTarget = useFBO(textureResolution, textureResolution, { type: THREE.FloatType });

  const gl = useThree((state) => (state.gl as any)) as THREE.WebGPURenderer;
  
  const { nodes, uniforms } = useMemo(() => {
    
    const uTime = uniform(0);

    return {
      nodes: {

      },
      uniforms: {
        uTime,
      },
    };
  }, []);

  const renderCaustic = useCallback(() => {
    
    const bounds = new THREE.Box3().setFromObject(waterRef.current!, true);

    normalCamera.position.set(light.x, light.y, light.z);
    normalCamera.lookAt(bounds.getCenter(new THREE.Vector3(0, 0, 0)));
    normalCamera.up = new THREE.Vector3(0, 1, 0);
    
    const originalMaterial = waterRef.current!.material;

    waterRef.current!.material = normalMaterial;
    waterRef.current!.material.side = THREE.FrontSide;

    gl.setRenderTarget(renderTarget);
    gl.render(waterRef.current!, normalCamera);

    waterRef.current!.material = originalMaterial;

    (planeRef.current!.material as THREE.MeshBasicMaterial).map = renderTarget.texture;

    gl.setRenderTarget(null);

  }, [renderTarget, normalCamera, normalMaterial]);

  const compute = useCallback(async () => {
    try {
      //await gl.computeAsync(nodes.computeNode);
    } catch (error) {
      console.error(error);
    }
  }, [/*nodes.computeNode,*/ gl]);

  /*useEffect(() => {
    if (!waterRef.current) return;

    compute();
  }, [compute]);*/

  useFrame((state) => {
    const { clock, gl } = state;

    renderCaustic();

    lightRef.current!.position.set(light.x, light.y, light.z);

    //compute();

    uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <group>
      <mesh ref={waterRef} position={[0, 2, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalNodeMaterial 
          ior={1.5}
          color="#ffffff"
          transmission={1}
          thickness={0.5}
          roughness={0}
          clearcoat={1}
          clearcoatRoughness={0.1}
          
        />
        {/*<MeshTransmissionMaterial 
          backsideThickness={0.3}
          //thickness={25}
          //samples={6}
          //transmission={0.9}
          //clearcoat={1}
          //clearcoatRoughness={0.5}
          chromaticAberration={1.5}
          //anisotropy={0.2}
          //roughness={0}
          //distortion={0}
          //distortionScale={0.09}
          //temporalDistortion={0}
          ior={1.5}
          color="#ffffff"
          backside
        />*/}
        {/*<meshBasicNodeMaterial
          //colorNode={nodes.colorNode}
          color="white"
        />*/}
      </mesh>
      <mesh ref={planeRef} position={[1, -1, 1]} rotation={[-Math.PI * 0.5, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh ref={lightRef} position={light}>
        <sphereGeometry args={[0.5, 50, 50]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  );
}

