import { Environment, Instance, Instances, OrbitControls, OrthographicCamera, PerspectiveCamera, Stats, useFBO } from "@react-three/drei";
import { Canvas, extend, useFrame, useThree, type CameraProps } from "@react-three/fiber";
import GUI from "lil-gui";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import GitHubConnection from "../../../lib/components/GitHubConnection";
import InfoBubble from "../../../lib/components/InfoBubble";
import ThreeJSElementContainer from "../../../lib/components/ThreeJSElementContainer";
import * as THREE from 'three/webgpu';
import type { WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.Nodes.js";
import ThreeJSSuspenseElement from "../../../lib/components/ThreeJSSuspenseElement";
import { MeshPhysicalNodeMaterial } from "three/webgpu";
import { abs, add, array, cameraPosition, cameraWorldMatrix, clamp, cos, div, float, floor, Fn, hash, If, instancedArray, instanceIndex, int, length, mat4, max, min, mix, mod, mul, negate, not, PI, positionGeometry, positionLocal, positionWorld, pow, reciprocal, screenCoordinate, screenUV, sin, smoothstep, storage, sub, texture, textureSize, textureStore, uint, uniform, uniformArray, uniformTexture, uv, uvec2, varying, vec2, vec3, vec4 } from "three/tsl";
import { arraySize, maxArraySize } from "./constants";
import { generateRayFromCamaraAndUV, boundingBoxIntersect, globalSeed2, rng2, hash2, rng, bvhPathTrace } from "../../../lib/utils/tslUtils";
import { bvhIntersect, createBvh, createTLAS, createTLASArray, generateArraysFromTLAS, updateTLAS } from "../../../lib/utils/bvhUtils";
import { createFixedArray, float32ArrayToVec4Array, createFixedFloat32Array, resolutions, compareCameraData } from "../../../lib/utils/mathUtils";
import type { CameraData, ObjectUpdaterData, TLASData } from "../../../lib/types/pathTracingTypes";
import { FrameLimiter, useDelta } from "../../../lib/components/FrameLimiter";
import { TeapotGeometry } from "three/examples/jsm/Addons.js";

extend({MeshPhysicalNodeMaterial, TeapotGeometry});

export default function PathTracingCanvas() {

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
          <li>This Render is made atop of WebGPU and the ThreeJS Shading Language.</li>
        </ul>
      </InfoBubble>
      <GitHubConnection 
        url="https://github.com/Swasbuckler/Creative-Coding/tree/main/src/pages/rendering/path-tracing"
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
      resize={{ debounce: 250 }}
      gl={async (props) => {
        const renderer = new THREE.WebGPURenderer(props as WebGPURendererParameters);
        await renderer.init();
        return renderer;
      }}
    >
      <FrameLimiter /*limit={1}*/>
        <PathTracingScene guiParentRef={guiParentRef} />
      </FrameLimiter>
      <Stats parent={statsParentRef} />
    </Canvas>
  );
}

function PathTracingScene({
  guiParentRef,
}: {
  guiParentRef: RefObject<HTMLDivElement>,
}) {

  const [resize, setResize] = useState(0);
  
  const { size, gl } = useThree();
  
  useEffect(() => {
    //console.log(window.innerWidth, window.innerHeight)
    setResize((value) => value + 1);
  }, [size]);

  useEffect(() => {
  
    const gui = new GUI({container: guiParentRef.current});

    const optionsFolder = gui.addFolder('Path Tracing');

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
        <WorldScene />
      </group>
      {/*<Environment 
        background 
        preset="lobby"
      />*/}
    </Suspense>
  );
}

function WorldScene() {

  const orthographicCamera = useRef<THREE.OrthographicCamera>(new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
  const perspectiveCamera = useRef<THREE.PerspectiveCamera>(null);

  const { delta } = useDelta()

  const groupRef = useRef<THREE.Group>(null);
  const boxRef = useRef<THREE.Mesh>(null);
  const viewPlaneRef = useRef<THREE.Mesh>(null);
  const planeRef = useRef<THREE.Mesh>(null);

  const objectIDTracker = useRef<number>(0);
  const tlasDataRef = useRef<TLASData>({});
  const objectUpdaterRef = useRef<Record<number, ObjectUpdaterData>>({})

  const targetDprRef = useRef<number>(resolutions[0] / window.innerWidth)
  const previousCameraDataRef = useRef<CameraData>({
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
  })

  const width = window.innerWidth * (targetDprRef.current > 1 ? 1 : targetDprRef.current) 
  const height = window.innerHeight * (targetDprRef.current > 1 ? 1 : targetDprRef.current) 

  const renderTargetA = useFBO(width, height, { 
    minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat,
		type: THREE.FloatType,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
  renderTargetA.texture.repeat.y = -1;
  renderTargetA.texture.offset.y = 1;

  const renderTargetB = useFBO(width, height, { 
    minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat,
		type: THREE.FloatType,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
  renderTargetB.texture.repeat.y = -1;
  renderTargetB.texture.offset.y = 1;

  const renderTargetRef = useRef<THREE.WebGLRenderTarget>(renderTargetA);

  const gl = useThree((state) => (state.gl as any)) as THREE.WebGPURenderer;

  const { scene, setDpr } = useThree()
  
  const { nodes, uniforms } = useMemo(() => {
    
    const uTime = uniform(0);

    const uResolution = uniform(gl.getDrawingBufferSize(new THREE.Vector2()));
    const uFov = uniform(75);
    //const uCameraWorldMatrix = uniform("mat4")
    //const uCameraPosition = uniform("vec3")

    const tlasArray = new THREE.StorageBufferAttribute(createFixedFloat32Array(maxArraySize), 4);
    const tlasList = new THREE.StorageBufferAttribute(createFixedFloat32Array(arraySize), 4);
    const triangleArray = new THREE.StorageBufferAttribute(createFixedFloat32Array(maxArraySize), 4);
    const bvhArray = new THREE.StorageBufferAttribute(createFixedFloat32Array(maxArraySize), 4);
    const lightArray = new THREE.StorageBufferAttribute(createFixedFloat32Array(maxArraySize), 4);

    const uTlasArray = storage(tlasArray, 'vec4', maxArraySize);
    const uTlasList = storage(tlasList, 'vec4', arraySize);
    const uTriangleArray = storage(triangleArray, 'vec4', maxArraySize);
    const uBvhArray = storage(bvhArray, 'vec4', maxArraySize);
    const uLightArray = storage(lightArray, 'vec4', maxArraySize);

    //const storageTexture = new THREE.StorageTexture(width, height);

    //const uFrameCount = uniform(0);

    const uSampleCount = uniform(1)
    const uPreviousFrame = uniformTexture()
    const uCameraIsMoving = uniform(false)

    const vertexNode = Fn(() => {
      return vec4(mul(positionGeometry, 2), 1);
    })();

    const colorNode = Fn(() => {
      const rayDir = generateRayFromCamaraAndUV({
        cameraMatrix: cameraWorldMatrix,
        cameraPosition: cameraPosition,
        uv: uv(),
        resolution: uResolution,
        fov: uFov,
      });

      const rayOrigin = vec3(cameraPosition).toVar();
      const rayDirection = vec3(rayDir).toVar();
      const pixelColour = vec3(0).toVar();

      globalSeed2.assign(mul(vec2(uSampleCount, add(uSampleCount, 1)), add(uv(), 1)));
      
      pixelColour.assign(bvhPathTrace({
        tlasArray: uTlasArray,
        tlasList: uTlasList,
        triangleArray: uTriangleArray,
        bvhArray: uBvhArray,
        lightArray: uLightArray,
        rayOrigin,
        rayDirection,
        maxBounces: int(4),
      }));
      //test({pixelColour: pixelColour})
      //const yes = test({pixelColour});
      //pixelColour.assign(yes.get('p1'))

      If(uCameraIsMoving, () => {
        //pixelColour.assign(add(mul(pixelColour, 0.9), mul(texture(uPreviousFrame, uv()).xyz, 0.1)))
      }).Else(() => {
        pixelColour.assign(div(add(pixelColour, mul(texture(uPreviousFrame, uv()).xyz, max(1, sub(uSampleCount, 1)))), uSampleCount))
      })
      //mul(texture(uPreviousFrame, vec2(uv().x, uv().y.oneMinus())), 0)))

      return pixelColour;
    })();

    /*const computeNode = Fn(({
      cameraMatrix,
      cameraPosition,
      utlasArray,
      utriangleArray,
      ubvhArray,
    }: {
      cameraMatrix: THREE.Node<"mat4">,
      cameraPosition: THREE.Node<"vec3">,
      utlasArray: THREE.StorageBufferNode<"vec4">,
      utriangleArray: THREE.StorageBufferNode<"vec4">,
      ubvhArray: THREE.StorageBufferNode<"vec4">,
    }) => {
      
      const posX = mod(instanceIndex, width);
      const posY = div(instanceIndex, width);
      const pixelCoord = vec2(posX, posY);
      const uv = div(pixelCoord, vec2(width, height));

      const rayDir = generateRayFromCamaraAndUV({
        cameraMatrix: cameraMatrix,
        cameraPosition: cameraPosition,
        uv: uv,
        resolution: uResolution,
        fov: uFov,
      });

      const rayOrigin = vec3(cameraPosition).toVar();
      const rayDirection = vec3(rayDir).toVar();
      const pixelColour = vec3(0).toVar();

      globalSeed2.assign(mul(vec2(uSampleCount, add(uSampleCount, 1)), uv));
      
      pixelColour.assign(bvhPathTrace({
        tlasArray: utlasArray,
        triangleArray: utriangleArray,
        bvhArray: ubvhArray,
        rayOrigin,
        rayDirection,
        maxBounces: int(1),
      }));
      //test({pixelColour: pixelColour})
      //const yes = test({pixelColour});
      //pixelColour.assign(yes.get('p1'))

      return textureStore(storageTexture, pixelCoord, pixelColour);
    })({
      cameraMatrix: uCameraWorldMatrix,
      cameraPosition: uCameraPosition,
      utlasArray: tlasArray,
      utriangleArray: triangleArray,
      ubvhArray: bvhArray,
    }).compute(width * height);*/

    /*const colorNode = Fn(() => {
      return texture(storageTexture, uv())
      //return vec3(1)
    })();*/

    return {
      nodes: {
        vertexNode,
        colorNode,
        //computeNode,
      },
      uniforms: {
        uTime,
        uResolution,
        uFov,
        //uCameraWorldMatrix,
        //uCameraPosition,
        tlasArray,
        tlasList,
        triangleArray,
        bvhArray,
        lightArray,
        uSampleCount,
        uPreviousFrame,
        uCameraIsMoving,
      },
    };
  }, [gl]);

  useEffect(() => {
    console.log(groupRef.current);

    setDpr(targetDprRef.current > 1 ? 1 : targetDprRef.current)
    uniforms.uFov.value = perspectiveCamera.current ? perspectiveCamera.current.fov : 75

    const meshList = groupRef.current?.children! as THREE.Mesh[]
    for (let i = 0; i < meshList.length; i++) {
      const curMesh = meshList[i]

      curMesh.userData = {
        id: objectIDTracker.current
      }

      objectIDTracker.current++
    }

    //console.time("timertest");
    const {tlasData, tlasArray, tlasList, triangleArray, bvhArray, lightArray} = createTLAS(meshList);
    //console.timeEnd("timertest");
    
    tlasDataRef.current = tlasData
    uniforms.tlasArray.set(tlasArray)
    uniforms.tlasArray.needsUpdate = true
    uniforms.tlasList.set(tlasList)
    uniforms.tlasList.needsUpdate = true
    uniforms.triangleArray.set(triangleArray)
    uniforms.triangleArray.needsUpdate = true
    uniforms.bvhArray.set(bvhArray)
    uniforms.bvhArray.needsUpdate = true
    uniforms.lightArray.set(lightArray)
    uniforms.lightArray.needsUpdate = true
    /*objectUpdaterRef.current[boxRef.current?.userData.id] = {
      type: 'Mesh',
      constant: true,
      update: 1,
    }*/
    
    //console.log(uniforms.tlasArray.value, uniforms.triangleArray.value, uniforms.bvhArray.value)

    //console.log(gl.debug.getShaderAsync(scene, perspectiveCamera.current!, viewPlaneRef.current!))
  }, []);

  /*const compute = useCallback(async () => {
    try {
      //console.log('run')
      await gl.compute(nodes.computeNode);
    } catch (error) {
      console.error(error);
    }
  }, [nodes.computeNode, gl]);*/
  const testRef = useRef<number>(0);
  const testingRef = useRef<number>(0);

  useFrame((state) => {
    const { scene, clock } = state;
    testingRef.current++
    const oldTarget = renderTargetRef.current;
    const newTarget = renderTargetRef.current === renderTargetA ? renderTargetB : renderTargetA;

    const previousTarget = gl.getRenderTarget()

    uniforms.uPreviousFrame.value = oldTarget.texture;

    //viewPlaneRef.current!.visible = true;
    gl.setRenderTarget(newTarget)
    gl.render(viewPlaneRef.current!, perspectiveCamera.current!)
    //viewPlaneRef.current!.visible = false;
    
    gl.setRenderTarget(previousTarget);

    renderTargetRef.current = newTarget;

    //(planeRef.current!.material as THREE.MeshBasicMaterial).map = oldTarget.texture
    
    testRef.current += delta.current * 10

    /*boxRef.current!.position.x = Math.cos(testRef.current)
    boxRef.current!.position.z = Math.sin(testRef.current)
    boxRef.current!.rotation.y += delta.current*/

    //planeRef.current!.rotation.set(perspectiveCamera.current!.rotation.x, perspectiveCamera.current!.rotation.y, perspectiveCamera.current!.rotation.z)
    
    let fullUpdate = updateTLAS(tlasDataRef.current, objectUpdaterRef.current)
    const {tlasArray, tlasList} = createTLASArray(tlasDataRef.current)
    uniforms.tlasArray.set(tlasArray)
    uniforms.tlasArray.needsUpdate = true
    uniforms.tlasList.set(tlasList)
    uniforms.tlasList.needsUpdate = true
    
    if (fullUpdate) {
      const {triangleArray, bvhArray, lightArray} = generateArraysFromTLAS(tlasDataRef.current, tlasList)
      uniforms.triangleArray.set(triangleArray);
      uniforms.triangleArray.needsUpdate = true
      uniforms.bvhArray.set(bvhArray);
      uniforms.bvhArray.needsUpdate = true
      uniforms.lightArray.set(lightArray);
      uniforms.lightArray.needsUpdate = true
    }
    
    uniforms.uTime.value = clock.getElapsedTime();

    if (compareCameraData(previousCameraDataRef.current, perspectiveCamera.current!)) {
      uniforms.uSampleCount.value++;
      uniforms.uCameraIsMoving.value = false
      
    } else {
      uniforms.uSampleCount.value = 1;
      uniforms.uCameraIsMoving.value = true
      previousCameraDataRef.current.position.copy(perspectiveCamera.current!.position)
      previousCameraDataRef.current.rotation.copy(perspectiveCamera.current!.rotation)
    }
    //console.log(uniforms.uSampleCount.value)
    /*if (perspectiveCamera.current) {
      uniforms.uCameraWorldMatrix.value = perspectiveCamera.current.matrixWorld
      uniforms.uCameraPosition.value = perspectiveCamera.current.position
      //compute()
    }*/
  });

  return (
    <>
      <group ref={groupRef}>
        {/*<mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshPhysicalMaterial color="white" />
        </mesh>*/}
        {/*Array.from({length: 1}, (_, i) => i + 1).map(() => (
          <mesh position={[1.5, 0, 0]} rotation={[-Math.PI * 0.5, 0, 0]}>
            <planeGeometry args={[5, 5]} />
            <meshPhysicalMaterial color="gray" />
          </mesh>
        ))*/}
        <mesh position={[-1.75, 3, 0]} rotation={[0, Math.PI * 0.5, Math.PI * 0.5]}>
          <planeGeometry args={[6, 6]} />
          <meshPhysicalMaterial color={[0, 1, 0]} emissiveIntensity={0} roughness={1} metalness={0} transmission={0} specularIntensity={0} userData={{
            subsurface: 0
          }} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[-Math.PI * 0.5, 0, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshPhysicalMaterial color={[1, 0.1, 0.1]} emissiveIntensity={0} roughness={1} metalness={0} transmission={0} specularIntensity={0} userData={{
            subsurface: 0
          }} />
        </mesh>
        <pointLight position={[0, 5, 0]} color="white" intensity={10} />
        <mesh position={[0, 5, 2.5]} rotation={[Math.PI * 0.5, 0, 0]}>
          <planeGeometry args={[3, 3]} />
          <meshPhysicalMaterial color="white" emissiveIntensity={5} emissive="white" />
        </mesh>
        <mesh position={[0, 5, -2.5]} rotation={[Math.PI * 0.5, 0, 0]}>
          <planeGeometry args={[3, 3]} />
          <meshPhysicalMaterial color="white" emissiveIntensity={5} emissive="white" />
        </mesh>
        {/*<mesh position={[2.5, 2.5, 0]} rotation={[0, -Math.PI * 0.5, 0]}>
          <planeGeometry args={[5, 5]} />
          <meshPhysicalMaterial color="white" />
        </mesh>
        <mesh position={[0, 2.5, -2.5]}>
          <planeGeometry args={[5, 5]} />
          <meshPhysicalMaterial color="white" />
        </mesh>
        <mesh position={[-2.5, 2.5, 0]} rotation={[0, Math.PI * 0.5, 0]}>
          <planeGeometry args={[5, 5]} />
          <meshPhysicalMaterial color={[0.18, 0.18, 0.18]} />
        </mesh>*/}
        <mesh ref={boxRef} position={[0, 1, 0]} rotation={[0, Math.PI * 0.5, 0]}>
          <teapotGeometry args={[1]} />
          <meshPhysicalMaterial color={[1, 1, 1]} emissiveIntensity={0} roughness={1} metalness={0} transmission={0} specularIntensity={0} userData={{
            subsurface: 0
          }} />
        </mesh>
        {/*<Instances limit={100} position={[0, 1, 0]}>
          <boxGeometry />
          <meshPhysicalMaterial color="orange" />
          {Array.from({ length: 50 }).map((_, i) => (
            <Instance 
              key={i} 
              position={[i * 1.5, 0, 0]}
            />
          ))}
        </Instances>*/}
      </group>
      <mesh ref={viewPlaneRef} frustumCulled={false} visible>
        <planeGeometry args={[1, 1, 5, 5]} />
        <meshBasicNodeMaterial
          vertexNode={nodes.vertexNode}
          colorNode={nodes.colorNode}
        />
      </mesh>
      <mesh ref={planeRef} position={[0, 3, 0]} rotation={[-Math.PI * 0.5, 0, 0]}>
        <planeGeometry args={[4, 4]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>
      <OrbitControls
        enableDamping={false}
        ref={(node) => {
          perspectiveCamera.current = node?.object as THREE.PerspectiveCamera || null;
          if (perspectiveCamera.current) perspectiveCamera.current.position.set(6, 0.5, 6)
          //if (perspectiveCamera.current) perspectiveCamera.current.fov = 90
        }}
      />
    </>
  );
}

