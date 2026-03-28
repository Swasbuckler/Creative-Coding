import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import GUI from "lil-gui";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import GitHubConnection from "../../lib/components/GitHubConnection";
import InfoBubble from "../../lib/components/InfoBubble";
import ThreeJSElementContainer from "../../lib/components/ThreeJSElementContainer";
import * as THREE from 'three/webgpu';
import type { WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.Nodes.js";
import ThreeJSSuspenseElement from "../../lib/components/ThreeJSSuspenseElement";
import { abs, add, cameraPosition, cos, div, float, floor, Fn, instancedArray, instanceIndex, length, min, mix, mul, positionLocal, pow, reciprocal, sin, smoothstep, sub, uniform, uv, vec2, vec3 } from "three/tsl";
import { InstancedMesh, SpriteNodeMaterial } from "three/webgpu";
import { hash, lookAtPoint, rotateY } from "../../lib/utils/tslUtils";
import { COUNT } from "./constants";

extend({InstancedMesh, SpriteNodeMaterial});

export default function GalaxyCanvas() {

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
          <li>This is a WIP</li>
          <li>This work is based off the related <a href="https://threejsroadmap.com/blog/galaxy-simulation-webgpu-compute-shaders" target="_blank">Article</a> from Three.js Roadmap.</li>
          <li>The code has been modified and was a good base to learn WebGPU and TSL from.</li>
          <li>This Render is made atop of WebGPU and the ThreeJS Shading Language.</li>
        </ul>
      </InfoBubble>
      <GitHubConnection 
        url="https://github.com/Swasbuckler/Creative-Coding/tree/main/src/space/galaxy"
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
      camera={{ position: [0, 50, 100] }}
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
        <Galaxy />
      </group>
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

function Galaxy() {

  const galaxyRef = useRef<THREE.Group>(null);
  const starInstancedMeshRef = useRef<THREE.InstancedMesh>(null);

  const gl = useThree((state) => (state.gl as any)) as THREE.WebGPURenderer;

  const { nodes, uniforms } = useMemo(() => {

    const positionBuffer = instancedArray(COUNT, 'vec3');
    const densityFactorBuffer = instancedArray(COUNT, 'float');

    const armCount = uniform(4);
    const galaxyRadius = uniform(50.0);
    const spiralTightness = uniform(2.0);
    const armWidth = uniform(8.0);
    const thickness = uniform(5.0);
    const randomness = uniform(5.0);

    const time = uniform(0);

    const scale = uniform(0.8);

    const computeInstancePosition = Fn(({
      instanceIndex,
      positionBuffer,
      densityFactorBuffer,
      armCount,
      galaxyRadius,
      spiralTightness,
      armWidth,
      thickness,
      randomness,
    }: {
      instanceIndex: THREE.IndexNode,
      positionBuffer: THREE.StorageBufferNode<"vec3">,
      densityFactorBuffer: THREE.StorageBufferNode<"float">,
      armCount: THREE.UniformNode<"float", number>,
      galaxyRadius: THREE.UniformNode<"float", number>,
      spiralTightness: THREE.UniformNode<"float", number>,
      armWidth: THREE.UniformNode<"float", number>,
      thickness: THREE.UniformNode<"float", number>,
      randomness: THREE.UniformNode<"float", number>,
    }) => {

      const index = instanceIndex;
      const seed = index.toFloat();
      
      const amountOfHashes = 5;

      const radius = mul(pow(hash({seed: add(mul(seed, amountOfHashes), 0)}), 0.5), galaxyRadius);
      const normalizedRadius = div(radius, galaxyRadius);

      const armIndex = floor(mul(hash({seed: add(mul(seed, amountOfHashes), 1)}), armCount));
      const armAngle = div(mul(armIndex, 6.28318), armCount);

      const spiralAngle = mul(mul(normalizedRadius, spiralTightness), 6.28318);
      const totalAngle = add(armAngle, spiralAngle);

      const radiusOffset = mul(mul(sub(hash({seed: add(mul(seed, amountOfHashes), 2)}), 0.5), 2.0), armWidth);
      const angleOffset = div(mul(mul(sub(hash({seed: add(mul(seed, amountOfHashes), 3)}), 0.5), 2.0), randomness), add(radius, 1.0));
      const finalAngle = add(totalAngle, angleOffset);
      const finalRadius = add(radius, radiusOffset);

      const x = mul(cos(finalAngle), finalRadius);
      const z = mul(sin(finalAngle), finalRadius);

      const maxThickness = mul(thickness, sub(float(1.0), mul(normalizedRadius, 0.7)));
      const y = mul(mul(sub(hash({seed: add(mul(seed, amountOfHashes), 4)}), 0.5), 2.0), maxThickness);

      const position = vec3(x, y, z);
      positionBuffer.element(index).assign(position);

      const radialSparsity = div(abs(radiusOffset), add(mul(armWidth, 0.5), 0.01));
      const angularSparsity = div(abs(angleOffset), add(mul(randomness, 0.5), 0.01));
      const sparsityFactor = min(mul(add(radialSparsity, angularSparsity), 0.5), 1.0);

      densityFactorBuffer.element(index).assign(sparsityFactor);
    });
    
    const computeNode = computeInstancePosition({
      instanceIndex,
      positionBuffer,
      densityFactorBuffer,
      armCount,
      galaxyRadius,
      spiralTightness,
      armWidth,
      thickness,
      randomness,
    }).compute(COUNT);

    const updatePosition = Fn(({
      position,
      positionLocal,
      cameraPosition,
      time,
    }: {
      position: THREE.Node<"vec3">,
      positionLocal: THREE.AttributeNode<"vec3">,
      cameraPosition: THREE.UniformNode<"vec3", THREE.Vector3>,
      time: THREE.UniformNode<"float", number>,
    }) => {

      const distFromCenter = length(vec2(position.x, position.z));

      const offsetRadius = add(distFromCenter, 0.5);
      const orbitalSpeed = mul(reciprocal(offsetRadius), 5.0);
      const velocityAngle = add(distFromCenter, 1.5708);
      const velocity = vec3(
        mul(cos(velocityAngle), orbitalSpeed),
        0,
        mul(sin(velocityAngle), orbitalSpeed)
      );
      const velocityAmount = length(velocity);

      const rotationFactor = reciprocal(add(mul(distFromCenter, 0.5), velocityAmount));
      const rotationAmount = mul(rotationFactor, time);

      const newPosition = rotateY({
        point: position, 
        angle: rotationAmount,
      });
      
      const rotatedPosition = lookAtPoint({
        origin: newPosition,
        vFrom: positionLocal,
        vTo: cameraPosition,
      });
      const newVertexPosition = add(rotatedPosition, newPosition);

      return newVertexPosition;
    });
    
    const positionNode = updatePosition({
      position: positionBuffer.element(instanceIndex),
      positionLocal: positionLocal,
      cameraPosition: cameraPosition,
      time,
    })

    const starShape = Fn(() => {
      const dist = mul(length(sub(uv(), 0.5)), 2.0);
      const circleShape = smoothstep(1.0, 0.6, dist);

      return circleShape;
    });

    const opacityNode = starShape();

    const starColor = Fn(({
      densityFactor,
    }: {
      densityFactor: THREE.StorageArrayElementNode<"float">,
    }) => {
      const denseColor = vec3(0.4, 0.6, 1.0); 
      const sparseColor = vec3(1.0, 0.6, 0.3);
      const starColor = mix(denseColor, sparseColor, densityFactor);

      return starColor;
    });

    const colorNode = starColor({densityFactor: densityFactorBuffer.element(instanceIndex)});

    return {
      nodes: {
        computeNode,
        positionNode,
        opacityNode,
        colorNode,
      },
      uniforms: {
        armCount,
        galaxyRadius,
        spiralTightness,
        armWidth,
        thickness,
        randomness,
        time,
        scale,
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
    if (!starInstancedMeshRef.current) return;

    compute();
  }, [compute]);

  useFrame((state) => {
    const { clock } = state

    uniforms.time.value = clock.getElapsedTime();
  });

  return (
    <group ref={galaxyRef}>
      <instancedMesh 
        ref={starInstancedMeshRef}
        args={[undefined, undefined, COUNT]}
      >
        <planeGeometry args={[0.5, 0.5]} />
        <spriteNodeMaterial 
          positionNode={nodes.positionNode}
          opacityNode={nodes.opacityNode}
          colorNode={nodes.colorNode}
          scaleNode={uniforms.scale}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}

