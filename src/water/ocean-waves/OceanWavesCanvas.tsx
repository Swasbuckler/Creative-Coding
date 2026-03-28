import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas, extend, useThree } from "@react-three/fiber";
import GUI from "lil-gui";
import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import GitHubConnection from "../../lib/components/GitHubConnection";
import InfoBubble from "../../lib/components/InfoBubble";
import ThreeJSElementContainer from "../../lib/components/ThreeJSElementContainer";
import * as THREE from 'three/webgpu';
import type { WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.Nodes.js";
import ThreeJSSuspenseElement from "../../lib/components/ThreeJSSuspenseElement";
import { InstancedMesh, MeshStandardNodeMaterial } from "three/webgpu";

extend({InstancedMesh, MeshStandardNodeMaterial});

export default function OceanWavesCanvas() {

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
        url="https://github.com/Swasbuckler/Creative-Coding/tree/main/src/water/ocean-waves"
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
  
  const { size } = useThree();
  
  useEffect(() => {
    setResize((value) => value + 1);
  }, [size]);

  useEffect(() => {
  
    const gui = new GUI({container: guiParentRef.current});
    setupGui({
      gui,
    });

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
        <Ocean />
      </group>
      <directionalLight 
        args={['white', 4]}
        position={[10, 10, 10]} 
      />
      <ambientLight args={['white', 0.25]} />
    </Suspense>
  );
}

function setupGui({
  gui,
}: {
  gui: GUI,
}) {
  gui.addFolder('WIP');
}

function Ocean() {

  const oceanRef = useRef<THREE.Group>(null);

  //const gl = useThree((state) => (state.gl as any)) as THREE.WebGPURenderer;

  return (
    <group ref={oceanRef}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardNodeMaterial color="white" />
      </mesh>
    </group>
  );
}

