import * as THREE from 'three';

export class QuadTree {

  boundary: QuadNode;
  capacity: number;
  objects: ObjectBoudingBox[] = [];
  childrenNodes: QuadTree[] = [];
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
  }

  insert(obj: THREE.Object3D) {
    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject(obj);
    
    // TO DO: Add Recursive insert Function
    // After each node exceeds capacity, create new children nodes and distribute objects. 
    // If an object intersects multiple nodes, it should be referenced in multiple nodes. (Hard part)
  }

}

export class QuadNode {

  x: number;
  y: number;
  width: number;
  height: number;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

interface ObjectBoudingBox extends THREE.Box3 {
  object: THREE.Object3D;
}