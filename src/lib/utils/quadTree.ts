import * as THREE from 'three';
import type { ObjectBoudingBox, QuadNode } from './types';

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

  insert(obj: THREE.Object3D): boolean {
    const boundingBox: ObjectBoudingBox = new THREE.Box3();
    boundingBox.object = obj;
    boundingBox.setFromObject(obj);
    
    if (!this.contains(boundingBox)) {
      return false;
    }

    if (this.divided) {
      if (this.findAndInsert(obj)) return true;
    }

    if (this.objects.length + 1 > this.capacity) {
      if (this.subdivide()) {
        const extractedObjects = this.extractObjects();
        this.objects = [];

        extractedObjects.forEach((objectBoundingBox) => {
          this.insert(objectBoundingBox.object!);
        });

        if (this.findAndInsert(obj)) return true;
        
      }
    }

    this.objects.push(boundingBox);

    return true;
  }

  findAndInsert(obj: THREE.Object3D): boolean {
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
      { x: x - newWidth, y: y + newHeight, width: newWidth, height: newHeight },
      { x: x + newWidth, y: y + newHeight, width: newWidth, height: newHeight },
      { x: x + newWidth, y: y - newHeight, width: newWidth, height: newHeight },
      { x: x - newWidth, y: y - newHeight, width: newWidth, height: newHeight },
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
    this.childrenNodes = [];

    if (this.divided) {
      return false;
    }

    if (this.maxDepth && this.depth >= this.maxDepth) {
      return false;
    }

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

  contains(boundingBox: ObjectBoudingBox): boolean {
    const x = this.boundary.x;
    const y = this.boundary.y;
    const halfWidth = this.boundary.width / 2;
    const halfHeight = this.boundary.height / 2;
    
    const minX = x - halfWidth;
    const maxX = x + halfWidth;
    const minY = y - halfHeight;
    const maxY = y + halfHeight;

    const objBoundaryMin = boundingBox.min;
    const objBoundaryMax = boundingBox.max;

    return (
      objBoundaryMin.x > minX &&
      objBoundaryMax.x < maxX &&
      objBoundaryMin.y > minY &&
      objBoundaryMax.y < maxY
    );
  }

  extractObjects(): ObjectBoudingBox[] {
    const extractedObjects = [...this.objects];

    this.childrenNodes.forEach((childrenNode) => {
      extractedObjects.push(...childrenNode.extractObjects());
    });

    return extractedObjects;
  }

}
