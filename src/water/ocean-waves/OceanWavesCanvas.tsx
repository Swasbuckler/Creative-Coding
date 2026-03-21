import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import GUI from "lil-gui";
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import GitHubConnection from "../../lib/components/GitHubConnection";
import InfoBubble from "../../lib/components/InfoBubble";
import ThreeJSElementContainer from "../../lib/components/ThreeJSElementContainer";
import * as THREE from 'three/webgpu';
import type { WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.Nodes.js";
import ThreeJSSuspenseElement from "../../lib/components/ThreeJSSuspenseElement";
import { QuadNode, QuadTree, QuadTreeHelper, QuadTreeSetter } from "../../lib/utils/quadTree";

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
  const [updateQuadTree, setUpdateQuadTree] = useState(0);
  
  const { size } = useThree();
  
  const quadTreeRef = useRef<QuadTree>(new QuadTree({
    boundary: new QuadNode(0, 0, 100, 100),
    capacity: 4,
    maxDepth: 3
  }));

  const objectsRef = useRef<(THREE.Mesh | null)[]>([]);
  const raycaster = useRef<THREE.Raycaster>(new THREE.Raycaster());

  const mousePointPlane = useRef<THREE.Mesh>(null);
  const nodeArea = useRef<QuadNode>(new QuadNode(0, 0, 5, 5));
  const nodeAreaMesh = useRef<THREE.Mesh>(null);

  const testObjectRange: {x: number, y: number, rotation: number}[] = useMemo(() => {
    return Array.from({ length: 1000 }, () => {
      const randPositionX = Math.random() * 45 * Math.sign(Math.random() - 0.5);
      const randPositionY = Math.random() * 45 * Math.sign(Math.random() - 0.5);;
      const randRotation = Math.random() * Math.PI;

      return {x: randPositionX, y: randPositionY, rotation: randRotation};
    });
  }, []);

  const {whiteColor, redColor} = useMemo(() => {
    return {
      whiteColor: new THREE.Color('white'),
      redColor: new THREE.Color('red'),
    };
  }, []);
  
  useEffect(() => {
    setResize((value) => value + 1);
  }, [size]);
  
  useEffect(() => {

    setUpdateQuadTree((value) => value + 1);
  
    const gui = new GUI({container: guiParentRef.current});
    setupGui({
      gui,
    });

    return () => {
      gui.destroy();
    }
  }, []);

  useFrame((state) => {

    objectsRef.current.forEach((object) => {
      if (object) {
        (object.material as THREE.MeshBasicMaterial).color = whiteColor;
      }
    })

    raycaster.current.setFromCamera(state.pointer, state.camera);

    if (mousePointPlane.current && nodeAreaMesh.current) {
      const intersect = raycaster.current.intersectObject(mousePointPlane.current);

      if (intersect.length > 0) {
        nodeArea.current.setData({
          x: intersect[0].point.x, 
          y: intersect[0].point.z, 
        });

        nodeAreaMesh.current.position.set(intersect[0].point.x, 0, intersect[0].point.z); 

        const objectList = quadTreeRef.current.searchArea(nodeArea.current);
        objectList.forEach((object) => {
          (object.material as THREE.MeshBasicMaterial).color = redColor;
        })
        //console.log(objectRefs.current.filter((objectRef) => quadTree.current.extractObjects().find((object) => object.object!.uuid === objectRef?.uuid)));
      }
    }
  });
  
  return (
    <Suspense
      key={resize} 
      fallback={<ThreeJSSuspenseElement />}
    >
      <group>
        <mesh 
          ref={mousePointPlane}
          position={[quadTreeRef.current.boundary.x, 0, quadTreeRef.current.boundary.y]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[quadTreeRef.current.boundary.width, quadTreeRef.current.boundary.height]} />
          <meshBasicMaterial
            color="white"
            wireframe
          />
        </mesh>
        <mesh 
          ref={nodeAreaMesh}
          position={[nodeArea.current.x, 0, nodeArea.current.y]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[nodeArea.current.width, nodeArea.current.height]} />
          <meshBasicMaterial
            color="white"
          />
        </mesh>
        {testObjectRange.map((data, index) => {            
          return (
            <mesh 
              ref={(ref) => objectsRef.current[index] = ref} 
              key={index}
              position={[data.x, 0, data.y]}
              rotation={[0, data.rotation, 0]}
            >
              <boxGeometry />
              <meshBasicMaterial color="white" />
            </mesh>
          );
        })}
        <Ocean />
        <QuadTreeSetter
          quadTreeRef={quadTreeRef}
          objectsRef={objectsRef}
          updateQuadTree={updateQuadTree}
        />
        <QuadTreeHelper 
          quadTree={quadTreeRef.current}
          y={0}
          boundaryColor="white"
          objectBoundaryColor="green"
          updateQuadTree={updateQuadTree}
        />
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

function Ocean() {

  const oceanRef = useRef<THREE.Group>(null);

  return (
    <group ref={oceanRef}>

    </group>
  );
}
