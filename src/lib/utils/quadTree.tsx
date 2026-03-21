import * as THREE from 'three';
import type { ObjectBoudingBox } from './types';
import { useEffect, useMemo, useRef, type JSX, type RefObject } from 'react';

export class QuadTree {

  boundary: QuadNode;
  capacity: number;
  objects: ObjectBoudingBox[] = [];
  childrenNodes: QuadTree[] = [];
  childrenNodeSizes: QuadNode[] = [];
  divided: boolean = false;
  depth: number = 0;
  maxDepth?: number;

  constructor(
    params: {
      boundary: QuadNode,
      capacity: number,
      depth?: number,
      maxDepth?: number,
    }
  ) {
    this.boundary = params.boundary;
    this.capacity = params.capacity;
    this.depth = params.depth ? params.depth : 0;
    this.maxDepth = params.maxDepth ? params.maxDepth : undefined;

    this.resize(this.boundary);
  }

  insert(obj: THREE.Mesh): boolean {
    const boundingBox: ObjectBoudingBox = new THREE.Box3();
    boundingBox.setFromObject(obj);
    boundingBox.object = obj;
    
    if (!this.boundary.containsObject(boundingBox)) {
      return false;
    }

    if (this.divided) {
      if (this.searchAndInsert(obj)) return true;
    }

    if (this.objects.length + 1 > this.capacity) {
      if (this.subdivide()) {
        const extractedObjects = this.extractObjects();
        this.objects = [];

        extractedObjects.forEach((objectBoundingBox) => {
          this.insert(objectBoundingBox.object!);
        });

        if (this.searchAndInsert(obj)) return true;
        
      }
    }

    this.objects.push(boundingBox);

    return true;
  }

  searchAndInsert(obj: THREE.Mesh): boolean {
    let foundBox = false;

    for (const childrenNode of this.childrenNodes) {
      const contained = childrenNode.insert(obj);

      if (contained) {
        foundBox = true;
        break;
      }
    }

    return foundBox;
  }

  searchArea(node: QuadNode): THREE.Mesh[] {

    let objectList: THREE.Mesh[] = [];

    if (!this.boundary.intersectsNode(node)) {
      return objectList;
    }

    this.objects.forEach((objectBoundingBox) => {
      if (this.boundary.intersectsObject(objectBoundingBox)) {
        objectList.push(objectBoundingBox.object!);
      };
    });

    if (this.divided) {
      for (const childrenNode of this.childrenNodes) {
        objectList.push(...childrenNode.searchArea(node));
      }
    }

    return objectList;

  }

  size() {
    let objectCount = this.objects.length;

    this.childrenNodes.forEach((childrenNode) => {
      objectCount += childrenNode.size();
    });

    return objectCount;
  }

  resize(boundary: QuadNode) {
    const x = boundary.x;
    const y = boundary.y;
    const newWidth = boundary.width / 2;
    const newHeight = boundary.height / 2;

    this.childrenNodeSizes = [
      new QuadNode(x - (newWidth / 2), y + (newHeight / 2), newWidth, newHeight),
      new QuadNode(x + (newWidth / 2), y + (newHeight / 2), newWidth, newHeight),
      new QuadNode(x + (newWidth / 2), y - (newHeight / 2), newWidth, newHeight),
      new QuadNode(x - (newWidth / 2), y - (newHeight / 2), newWidth, newHeight),
    ];

    const extractedObjects = this.extractObjects();
    this.clear();

    extractedObjects.forEach((objectBoundingBox) => {
      this.insert(objectBoundingBox.object!);
    });
  }

  clear() {
    this.divided = false;
    this.objects = [];
    this.childrenNodes = [];
  }

  subdivide(): boolean {
    if (this.divided) {
      return false;
    }

    if (this.maxDepth && this.depth >= this.maxDepth) {
      return false;
    }

    this.childrenNodes = [];

    this.childrenNodeSizes.forEach((childrenNodeSize) => {
      this.childrenNodes.push(new QuadTree({
        boundary: childrenNodeSize,
        capacity: this.capacity,
        depth: this.depth + 1,
        maxDepth: this.maxDepth,
      }));
    });

    this.divided = true;

    return true;
  }

  extractObjects(): ObjectBoudingBox[] {
    const extractedObjects = [...this.objects];

    this.childrenNodes.forEach((childrenNode) => {
      extractedObjects.push(...childrenNode.extractObjects());
    });

    return extractedObjects;
  }

}

export class QuadNode {
  x: number = 0;
  y: number = 0;
  width: number = 1;
  height: number = 1;

  min: {x: number, y: number} = {
    x: this.x - (this.width / 2),
    y: this.y - (this.height / 2),
  };
  max: {x: number, y: number} = {
    x: this.x + (this.width / 2),
    y: this.y + (this.height / 2),
  };

  constructor(
    x: number, 
    y: number, 
    width: number, 
    height: number,
  ) {
    this.setData({
      x, 
      y, 
      width, 
      height,
    });
  }

  setData(data: {
    x?: number, 
    y?: number, 
    width?: number, 
    height?: number
  }) {
    this.x = data.x ? data.x : this.x;
    this.y = data.y ? data.y : this.y;
    this.width = data.width ? data.width : this.width;
    this.height = data.height ? data.height : this.height;

    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;

    this.min = {
      x: this.x - halfWidth,
      y: this.y - halfHeight,
    };
    this.max = {
      x: this.x + halfWidth,
      y: this.y + halfHeight,
    }
  }

  containsObject(boundingBox: ObjectBoudingBox): boolean {
    const objBoundaryMin = boundingBox.min;
    const objBoundaryMax = boundingBox.max;

    return (
      objBoundaryMin.x > this.min.x &&
      objBoundaryMax.x < this.max.x &&
      objBoundaryMin.z > this.min.y &&
      objBoundaryMax.z < this.max.y
    );
  }

  containsNode(node: QuadNode) {
    return (
      node.min.x > this.min.x &&
      node.max.x < this.max.x &&
      node.min.y > this.min.y &&
      node.max.y < this.max.y
    );
  }
  
  intersectsObject(boundingBox: ObjectBoudingBox) {
    const objBoundaryMin = boundingBox.min;
    const objBoundaryMax = boundingBox.max;

    return (
      (
        (
          objBoundaryMin.x > this.min.x &&
          objBoundaryMin.x < this.max.x
        ) || (
          objBoundaryMax.x > this.min.x &&
          objBoundaryMax.x < this.max.x
        )
      ) && (
        (
          objBoundaryMin.z > this.min.y &&
          objBoundaryMin.z < this.max.y
        ) || (
          objBoundaryMax.z > this.min.y &&
          objBoundaryMax.z < this.max.y
        )
      )
    );
  }

  intersectsNode(node: QuadNode) {
    return (
      (
        (
          node.min.x > this.min.x &&
          node.min.x < this.max.x
        ) || (
          node.max.x > this.min.x &&
          node.max.x < this.max.x
        )
      ) && (
        (
          node.min.y > this.min.y &&
          node.min.y < this.max.y
        ) || (
          node.max.y > this.min.y &&
          node.max.y < this.max.y
        )
      )
    );
  }
}

export function QuadTreeSetter({
  quadTreeRef,
  objectsRef, 
  updateQuadTree, 
}: {
  quadTreeRef: RefObject<QuadTree>,
  objectsRef: RefObject<(THREE.Mesh | null)[]>, 
  updateQuadTree: number, 
}) {

  useEffect(() => {
    quadTreeRef.current.clear();

    for (const object of objectsRef.current) {
      if (object) {
        quadTreeRef.current.insert(object);
      }
    }

    console.log(objectsRef.current.filter((objectTarget) => quadTreeRef.current.extractObjects().find((object) => object.object!.uuid === objectTarget?.uuid)));

    return () => {
      quadTreeRef.current.clear();
    }
  }, [updateQuadTree]);

  return (
    <></>
  );
}

export function QuadTreeHelper({
  quadTree,
  y, 
  boundaryColor, 
  objectBoundaryColor,
  updateQuadTree,
}: {
  quadTree: QuadTree,
  y: number, 
  boundaryColor: string, 
  objectBoundaryColor: string,
  updateQuadTree: number,
}) {

  const {x, z, width, height} = useMemo(() => {
    const x = quadTree.boundary.x;
    const z = quadTree.boundary.y;
    const width = quadTree.boundary.width;
    const height = quadTree.boundary.height;
    
    return {x, z, width, height};
  }, [updateQuadTree]);

  const blueColor = useMemo(() => {
    return new THREE.Color('blue');
  }, []);

  return (
    <group>
      {!quadTree.divided && 
        <mesh 
          position={[x, y, z]} 
          rotation={[Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[width, height, 1, 1]} />
          <meshBasicMaterial 
            color={boundaryColor}
            wireframe
          />
        </mesh>
      }
      {quadTree.objects.map((objectBoundingBox, index) => {
        
        (objectBoundingBox.object!.material as THREE.MeshBasicMaterial).color = blueColor;

        const objectPosition = objectBoundingBox.object!.position;
        const objectWidth = Math.abs(objectBoundingBox.max.x - objectBoundingBox.min.x);
        const objectHeight = Math.abs(objectBoundingBox.max.z - objectBoundingBox.min.z);

        return (
          <mesh 
            key={index}
            position={[objectPosition.x, y, objectPosition.z]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[objectWidth, objectHeight, 1, 1]} />
            <meshBasicMaterial 
              color={objectBoundaryColor}
              wireframe
            />
          </mesh>
        );
      })}
      {quadTree.childrenNodes.map((childrenNode, index) => {
        return (
          <QuadTreeHelper 
            key={index}
            quadTree={childrenNode}
            y={y}
            boundaryColor={boundaryColor}
            objectBoundaryColor={objectBoundaryColor}
            updateQuadTree={updateQuadTree}
          />
        );
      })}
    </group>
  )
}