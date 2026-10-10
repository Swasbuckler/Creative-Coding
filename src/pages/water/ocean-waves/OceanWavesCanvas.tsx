import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import GUI from "lil-gui";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import GitHubConnection from "../../../lib/components/GitHubConnection";
import InfoBubble from "../../../lib/components/InfoBubble";
import ThreeJSElementContainer from "../../../lib/components/ThreeJSElementContainer";
import * as THREE from 'three/webgpu';
import type { WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.Nodes.js";
import ThreeJSSuspenseElement from "../../../lib/components/ThreeJSSuspenseElement";
import { InstancedMesh, MeshStandardNodeMaterial, MeshBasicNodeMaterial } from "three/webgpu";
import { abs, add, ceil, cos, cross, div, dot, exp, float, floor, Fn, If, instancedArray, instanceIndex, int, length, lessThan, mul, negate, normalize, PI, positionGeometry, positionLocal, pow, round, sin, sqrt, storage, storageTexture, sub, texture, textureLoad, textureStore, uint, uniform, uv, uvec2, vec2, vec3, vec4 } from "three/tsl";
import { CHUNK_RESOLUTION, gravity } from "./constants";
import { phillips, hash, gaussianNoise, hTilde, dispersion } from "../../../lib/utils/tslUtils";

extend({InstancedMesh, MeshStandardNodeMaterial, MeshBasicNodeMaterial});

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
        url="https://github.com/Swasbuckler/Creative-Coding/tree/main/src/pages/water/ocean-waves"
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

  const oceanRef = useRef<THREE.Mesh>(null);
  const baseTexture = useMemo(() => {
    return new THREE.StorageTexture(CHUNK_RESOLUTION, CHUNK_RESOLUTION);
  }, []);

  const gl = useThree((state) => (state.gl as any)) as THREE.WebGPURenderer;
  
  const { nodes, uniforms } = useMemo(() => {
    
    const uTime = uniform(0);

    const randomTexture = storageTexture(baseTexture);
    const windDirection = vec2(float(31), float(0));

    const computeRandomTexture = Fn(({
      randomTexture,
      CHUNK_RESOLUTION,
      windDirection,
    }: {
      randomTexture: THREE.StorageTextureNode,
      CHUNK_RESOLUTION: THREE.Node<"uint">,
      windDirection: THREE.Node<"vec2">,
    }) => {
      
      const x = instanceIndex.mod(CHUNK_RESOLUTION);
      const y = instanceIndex.div(CHUNK_RESOLUTION);
      const indexUV = uvec2(x, y);

      const hTilde0 = hTilde({
        x: x,
        y: y,
        N: CHUNK_RESOLUTION,
        A: 1,
        w: windDirection,
        wL: 1000,
      });
      const hTilde0Conjugate = hTilde({
        x: negate(float(x)),
        y: negate(float(y)),
        N: CHUNK_RESOLUTION,
        A: 1,
        w: windDirection,
        wL: 1000,
      });

      const dis = mul(dispersion({x: x, y: y, N: CHUNK_RESOLUTION, wL: 1000, g: gravity}), float(uTime));
      const cos0 = cos(dis);
      const sin0 = sin(dis);

      const c0 = vec2(cos0,  sin0);
      const c1 = vec2(cos0, negate(sin0));

      const value = add(mul(hTilde0, c0), mul(hTilde0Conjugate, c1));

      textureStore(randomTexture, indexUV, vec4(value.x, value.y, 0.0, 1.0))
    });

    const computeNode = computeRandomTexture({
      randomTexture,
      CHUNK_RESOLUTION: uint(CHUNK_RESOLUTION),
      windDirection,
    }).compute(CHUNK_RESOLUTION * CHUNK_RESOLUTION);

    const textureExtract = Fn(({
      randomTexture,
    }: {
      randomTexture: THREE.StorageTextureNode,
    }) => {
      const texel = textureLoad(randomTexture, mul(uv(), CHUNK_RESOLUTION));
      return vec3(texel.rgb);
    });

    const colorNode = textureExtract({
      randomTexture
    })

    return {
      nodes: {
        computeNode,
        colorNode,
      },
      uniforms: {
        uTime,
      },
    };
  }, []);

  const compute = useCallback(async () => {
    try {
      await gl.computeAsync(nodes.computeNode);
    } catch (error) {
      console.error(error);
    }
  }, [nodes.computeNode, gl]);

  useEffect(() => {
    if (!oceanRef.current) return;

    compute();
  }, [compute]);

  useFrame((state) => {
    const { clock } = state

    compute();

    uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <group>
      <mesh position={[0, 0, 0]} ref={oceanRef}>
        <planeGeometry args={[1.0, 1.0, CHUNK_RESOLUTION, CHUNK_RESOLUTION]} />
        <meshBasicNodeMaterial
          colorNode={nodes.colorNode}
          //color="white"
        />
      </mesh>
    </group>
  );
}

