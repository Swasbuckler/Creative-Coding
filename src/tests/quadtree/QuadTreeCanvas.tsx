import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import GUI from "lil-gui";
import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import GitHubConnection from "../../lib/components/GitHubConnection";
import InfoBubble from "../../lib/components/InfoBubble";
import ThreeJSElementContainer from "../../lib/components/ThreeJSElementContainer";
import * as THREE from 'three/webgpu';
import ThreeJSSuspenseElement from "../../lib/components/ThreeJSSuspenseElement";
import { QuadNode, QuadTree, QuadTreeHelper } from "../../lib/utils/QuadTree";

export default function QuadTreeCanvas() {

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
          <li>This Render is used to Test the functionality of a Quad Tree implementation.</li>
        </ul>
      </InfoBubble>
      <GitHubConnection 
        url="https://github.com/Swasbuckler/Creative-Coding/tree/main/src/tests/quadtree"
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
      camera={{ position: [0, 75, 75] }}
      resize={{ debounce: 250 }}
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
  const [updatedQuadTree, setUpdatedQuadTree] = useState(0);
  
  const { size } = useThree();
  
  const quadTreeRef = useRef<QuadTree>(new QuadTree({
    boundary: new QuadNode(0, 0, 100, 100),
    capacity: 4,
    maxDepth: 3
  }));

  const raycaster = useRef<THREE.Raycaster>(new THREE.Raycaster());

  const mousePointPlane = useRef<THREE.Mesh>(null);
  const nodeArea = useRef<QuadNode>(new QuadNode(0, 0, 20, 20));
  const nodeAreaMesh = useRef<THREE.Mesh>(null);

  const [testObjects, setTestObjects] = useState<Record<string, THREE.Mesh>>(() => {
    const objectData = Array.from({ length: 1000 }, () => {
      const randPositionX = Math.random() * 45 * Math.sign(Math.random() - 0.5);
      const randPositionY = Math.random() * 45 * Math.sign(Math.random() - 0.5);;
      const randRotation = Math.random() * Math.PI;

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1, 1, 1, 1),
        new THREE.MeshBasicMaterial({color: 'white'})
      );
      mesh.position.set(randPositionX, 0, randPositionY);
      mesh.rotation.set(0, randRotation, 0);

      return mesh;
    });

    const testObjects: Record<string, THREE.Mesh> = {};
    for (const data of objectData) {
      testObjects[data.uuid] = data;
    }
    return testObjects;
  });
  
  useEffect(() => {
    setResize((value) => value + 1);
  }, [size]);
  
  useEffect(() => {

    for (const uuid in testObjects) {
      quadTreeRef.current.insert(testObjects[uuid]);
    }
  
    const gui = new GUI({container: guiParentRef.current});
    setupGui({
      gui,
    });

    return () => {
      gui.destroy();
      quadTreeRef.current.clear();
    }
  }, []);

  useFrame((state) => {

    raycaster.current.setFromCamera(state.pointer, state.camera);

    if (mousePointPlane.current && nodeAreaMesh.current) {
      const intersect = raycaster.current.intersectObject(mousePointPlane.current);

      if (intersect.length > 0) {
        nodeArea.current.setData({
          x: intersect[0].point.x, 
          y: intersect[0].point.z, 
        });

        nodeAreaMesh.current.position.set(intersect[0].point.x, 0, intersect[0].point.z); 

        const boundaryList = quadTreeRef.current.searchArea(nodeArea.current);

        if (boundaryList.length > 0) {

          const uuidsRemoved: string[] = [];
          boundaryList.forEach((boundingBox) => {
            const removedBoundingBox = boundingBox.parentNode!.remove(boundingBox);
            if (removedBoundingBox) {
              uuidsRemoved.push(removedBoundingBox.object!.uuid);
            }
          });

          setTestObjects((testObjects) => {
            const newTestObjects = testObjects;
            
            uuidsRemoved.forEach((uuid) => {
              delete newTestObjects[uuid];
            });

            return newTestObjects;
          });

          setUpdatedQuadTree((value) => value + 1);
        }
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
        {Object.values(testObjects).map((object, index) => (
          <primitive 
            key={index}
            object={object} 
          />
        ))}
        <QuadTreeHelper 
          quadTree={quadTreeRef.current}
          y={0}
          boundaryColor="white"
          objectBoundaryColor="green"
          updatedQuadTree={updatedQuadTree}
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
  gui.title('Nothing Here for Now');
}