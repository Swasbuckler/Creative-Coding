import * as THREE from 'three/webgpu';
import type { Bin, DataNode, LightDataObject, MaterialObject, MeshType, ObjectUpdaterData, TLASData, TriangleDataObject } from '../types/pathTracingTypes';
import { add, and, array, bool, Break, ceil, Continue, div, EPSILON, float, floor, Fn, If, INFINITY, int, inverse, length, Loop, mat4, mul, normalize, or, Return, round, select, struct, sub, transformDirection, trunc, uint, vec2, vec3, vec4 } from 'three/tsl';
import { boundingBoxIntersect, triangleIntersect, TriangleIntersectStruct } from './tslUtils';
import { combination2P3Digits } from './mathUtils';

const epsilon = 0.000001

const triangleDataAmount = 40
const lightDataAmount = 4
const bvhDataAmount = 8
const tlasDataAmount = 28

function checkMeshType(mesh: THREE.Mesh): MeshType {

  if (mesh.type !== "Mesh") return "NonMesh"

  if (Object.hasOwn(mesh, "isInstancedMesh")) return "InstancedMesh"

  if (!mesh.geometry.index) return "NonMesh"

  return "Mesh"
}

export function initializeDataForBvh(mesh: THREE.Mesh) {

  const totalTriangleAmount = mesh.geometry.index!.array.length / 3

  const triangleArray = new Float32Array(totalTriangleAmount * triangleDataAmount);
  const lightArray = []
  const lightObject: LightDataObject = {}
  const aabbArray = new Float32Array(totalTriangleAmount * 9);
  const aabbIndexList = new Uint32Array(totalTriangleAmount);

  const bbMin = new THREE.Vector3();
  const bbMax = new THREE.Vector3();
  const bbCentroid = new THREE.Vector3();

  const triangleVertexPositions = new Array<THREE.Vector3>(3);
  triangleVertexPositions[0] = new THREE.Vector3();
  triangleVertexPositions[1] = new THREE.Vector3();
  triangleVertexPositions[2] = new THREE.Vector3();
  const triangleVertexNormals = new Array<THREE.Vector3>(3);
  triangleVertexNormals[0] = new THREE.Vector3();
  triangleVertexNormals[1] = new THREE.Vector3();
  triangleVertexNormals[2] = new THREE.Vector3();
  const triangleVertexUVs = new Array<THREE.Vector2>(3);
  triangleVertexUVs[0] = new THREE.Vector2();
  triangleVertexUVs[1] = new THREE.Vector2();
  triangleVertexUVs[2] = new THREE.Vector2();
  
  let nextIndex = 0

  const meshMaterial = mesh.material as THREE.MeshPhysicalMaterial;
    
  const curMaterial: MaterialObject = {//curMesh.material;
    color: {
      r: meshMaterial.color.r ?? 1,
      g: meshMaterial.color.g ?? 1,
      b: meshMaterial.color.b ?? 1,
    },
    roughness: meshMaterial.roughness ?? 0,
    metalness: meshMaterial.metalness ?? 0,
    transmission: meshMaterial.transmission ?? 0,
    refractiveIndex: meshMaterial.ior ?? 1,
    emission: meshMaterial.emissiveIntensity ?? 0,
    subsurface: meshMaterial.userData.subsurface ?? 0,
    anisotropic: meshMaterial.anisotropy ?? 0,
    sheen: meshMaterial.sheen ?? 0,
    clearcoat: meshMaterial.clearcoat ?? 0,
    tint: meshMaterial.specularIntensity ?? 0,
  };
  
  //mesh.updateMatrixWorld()

  const indexes = new Uint32Array(mesh.geometry.index!.array);
  const triangleAmount = indexes.length / 3;
    
  const positions = new Float32Array(mesh.geometry.attributes.position.array);
  const normals = new Float32Array(mesh.geometry.attributes.normal.array);
  const uvs = mesh.geometry.attributes.uv ? new Float32Array(mesh.geometry.attributes.uv.array) : null;

  let index0, index1, index2 = 0;

  for (let j = 0; j < triangleAmount; j++) {
    index0 = indexes[3 * j + 0];
    index1 = indexes[3 * j + 1];
    index2 = indexes[3 * j + 2];
    
    bbMin.set(Infinity, Infinity, Infinity);
    bbMax.set(-Infinity, -Infinity, -Infinity);

    triangleVertexPositions[0].set(positions[3 * index0 + 0], positions[3 * index0 + 1], positions[3 * index0 + 2])//.applyMatrix4(mesh.matrixWorld)
    triangleVertexPositions[1].set(positions[3 * index1 + 0], positions[3 * index1 + 1], positions[3 * index1 + 2])//.applyMatrix4(mesh.matrixWorld)
    triangleVertexPositions[2].set(positions[3 * index2 + 0], positions[3 * index2 + 1], positions[3 * index2 + 2])//.applyMatrix4(mesh.matrixWorld)

    triangleVertexNormals[0].set(normals[3 * index0 + 0], normals[3 * index0 + 1], normals[3 * index0 + 2]).normalize()//.applyMatrix4(mesh.matrixWorld).normalize()
    triangleVertexNormals[1].set(normals[3 * index1 + 0], normals[3 * index1 + 1], normals[3 * index1 + 2]).normalize()//.applyMatrix4(mesh.matrixWorld).normalize()
    triangleVertexNormals[2].set(normals[3 * index2 + 0], normals[3 * index2 + 1], normals[3 * index2 + 2]).normalize()//.applyMatrix4(mesh.matrixWorld).normalize()

    if (uvs) {
      triangleVertexUVs[0].set(uvs[2 * index0 + 0], uvs[2 * index0 + 1]);
      triangleVertexUVs[1].set(uvs[2 * index1 + 0], uvs[2 * index1 + 1]);
      triangleVertexUVs[2].set(uvs[2 * index2 + 0], uvs[2 * index2 + 1]);
    } else {
      triangleVertexUVs[0].set(-1, -1);
      triangleVertexUVs[1].set(-1, -1);
      triangleVertexUVs[2].set(-1, -1);
    }

    const triangleStartingIndex = triangleDataAmount * nextIndex;
    const aabbStartingIndex = 9 * nextIndex;

    triangleArray[triangleStartingIndex + 0] = triangleVertexPositions[0].x;
    triangleArray[triangleStartingIndex + 1] = triangleVertexPositions[0].y;
    triangleArray[triangleStartingIndex + 2] = triangleVertexPositions[0].z;
    triangleArray[triangleStartingIndex + 3] = triangleVertexPositions[1].x;
    triangleArray[triangleStartingIndex + 4] = triangleVertexPositions[1].y;
    triangleArray[triangleStartingIndex + 5] = triangleVertexPositions[1].z;
    triangleArray[triangleStartingIndex + 6] = triangleVertexPositions[2].x;
    triangleArray[triangleStartingIndex + 7] = triangleVertexPositions[2].y;
    triangleArray[triangleStartingIndex + 8] = triangleVertexPositions[2].z;

    triangleArray[triangleStartingIndex + 9] = triangleVertexNormals[0].x;
    triangleArray[triangleStartingIndex + 10] = triangleVertexNormals[0].y;
    triangleArray[triangleStartingIndex + 11] = triangleVertexNormals[0].z;
    triangleArray[triangleStartingIndex + 12] = triangleVertexNormals[1].x;
    triangleArray[triangleStartingIndex + 13] = triangleVertexNormals[1].y;
    triangleArray[triangleStartingIndex + 14] = triangleVertexNormals[1].z;
    triangleArray[triangleStartingIndex + 15] = triangleVertexNormals[2].x;
    triangleArray[triangleStartingIndex + 16] = triangleVertexNormals[2].y;
    triangleArray[triangleStartingIndex + 17] = triangleVertexNormals[2].z;

    triangleArray[triangleStartingIndex + 18] = triangleVertexUVs[0].x;
    triangleArray[triangleStartingIndex + 19] = triangleVertexUVs[0].y;
    triangleArray[triangleStartingIndex + 20] = triangleVertexUVs[1].x;
    triangleArray[triangleStartingIndex + 21] = triangleVertexUVs[1].y;
    triangleArray[triangleStartingIndex + 22] = triangleVertexUVs[2].x;
    triangleArray[triangleStartingIndex + 23] = triangleVertexUVs[2].y;

    // the remaining slots are used for PBR material properties

    triangleArray[triangleStartingIndex + 24] = curMaterial.color.r;
    triangleArray[triangleStartingIndex + 25] = curMaterial.color.g;
    triangleArray[triangleStartingIndex + 26] = curMaterial.color.b;
    triangleArray[triangleStartingIndex + 27] = curMaterial.roughness;
    triangleArray[triangleStartingIndex + 28] = curMaterial.metalness;
    triangleArray[triangleStartingIndex + 29] = curMaterial.transmission;
    triangleArray[triangleStartingIndex + 30] = curMaterial.refractiveIndex;
    triangleArray[triangleStartingIndex + 31] = curMaterial.emission;
    triangleArray[triangleStartingIndex + 32] = curMaterial.subsurface;
    triangleArray[triangleStartingIndex + 33] = curMaterial.anisotropic;
    triangleArray[triangleStartingIndex + 34] = curMaterial.sheen;
    triangleArray[triangleStartingIndex + 35] = curMaterial.clearcoat;
    triangleArray[triangleStartingIndex + 36] = curMaterial.tint;
    triangleArray[triangleStartingIndex + 37] = 0;
    triangleArray[triangleStartingIndex + 38] = 0;
    triangleArray[triangleStartingIndex + 39] = 0;

    // 
    
    bbMin.min(triangleVertexPositions[0]).min(triangleVertexPositions[1]).min(triangleVertexPositions[2]);
    bbMax.max(triangleVertexPositions[0]).max(triangleVertexPositions[1]).max(triangleVertexPositions[2]);

    bbCentroid.copy(triangleVertexPositions[0]).add(triangleVertexPositions[1]).add(triangleVertexPositions[2]).multiplyScalar(0.3333333333333333);

    aabbArray[aabbStartingIndex + 0] = bbMin.x;
    aabbArray[aabbStartingIndex + 1] = bbMin.y;
    aabbArray[aabbStartingIndex + 2] = bbMin.z;
    aabbArray[aabbStartingIndex + 3] = bbMax.x;
    aabbArray[aabbStartingIndex + 4] = bbMax.y;
    aabbArray[aabbStartingIndex + 5] = bbMax.z;
    aabbArray[aabbStartingIndex + 6] = bbCentroid.x;
    aabbArray[aabbStartingIndex + 7] = bbCentroid.y;
    aabbArray[aabbStartingIndex + 8] = bbCentroid.z;

    aabbIndexList[nextIndex] = nextIndex;

    if (curMaterial.emission > 0) {
      lightObject[nextIndex] = lightArray.length / lightDataAmount
      lightArray.push(0);
      lightArray.push(nextIndex)
      lightArray.push(0.5 * (new THREE.Vector3(0, 0, 0).subVectors(triangleVertexPositions[1], triangleVertexPositions[0])).cross(new THREE.Vector3(0, 0, 0).subVectors(triangleVertexPositions[2], triangleVertexPositions[0])).length() * curMaterial.emission)
      lightArray.push(0)
    }
    
    nextIndex++;
    
  }
  
  return {triangleArray, aabbArray, aabbIndexList, lightArray: new Float32Array(lightArray), lightObject}
};

function updateBvhNodeBounds(
  aabbArray: Float32Array, 
  aabbIndexList: Uint32Array, 
  bvhNodes: DataNode[], 
  nodeIndex: number,
) {

  const node = bvhNodes[nodeIndex];
  node.min.set(Infinity, Infinity, Infinity);
	node.max.set(-Infinity, -Infinity, -Infinity);

  const curMin = new THREE.Vector3();
  const curMax = new THREE.Vector3();

  const firstIndex = node.firstIndex;
  let index = 0;
  for (let i = 0; i < node.count; i++) {
    index = 9 * (aabbIndexList[firstIndex + i]);

    curMin.set(aabbArray[index + 0], aabbArray[index + 1], aabbArray[index + 2]);
		curMax.set(aabbArray[index + 3], aabbArray[index + 4], aabbArray[index + 5]);
		node.min.min(curMin);
		node.max.max(curMax);
    //console.log("index", nodeIndex, node.min, node.max)
  }
}

function subdivideBvhNode (
  aabbArray: Float32Array, 
  aabbIndexList: Uint32Array, 
  binAmount: number, 
  maxDepth: number, 
  bvhNodes: DataNode[], 
  thisNodeIndex: number,
  nodeIndex: {value: number}, 
  curDepth: number,
) {
  //console.log('run ' + curDepth);console.log(bvhNodes);
  const bins: Bin[] = [];
  for (let i = 0; i < binAmount; i++) {
		bins[i] = {
      min: new THREE.Vector3(),
      max: new THREE.Vector3(),
      count: 0,
    };
  }
    
  const node = bvhNodes[thisNodeIndex];

  if (curDepth === maxDepth) {
    return;
  }
  if (node.count < 2) {
    return;
  }
  //console.log(nodeIndex)
  let tempIndex = 0;

  const leftCountSumArray = new Uint32Array(binAmount - 1);
	const rightCountSumArray = new Uint32Array(binAmount - 1);
  const leftAreaArray = new Float32Array(binAmount - 1); 
	const rightAreaArray = new Float32Array(binAmount - 1);

  let curCost = 0;
  let curArea = 0;
  let bestCost = Infinity;
  let bestAxis = 0;
  let bestSplitPosition = Infinity;
  const firstIndex = node.firstIndex;

  let min = Infinity; 
  let max = -Infinity;
  let centroid = 0;

  let scale = 0;
  let binIndex = 0;
  const curMin = new THREE.Vector3();
  const curMax = new THREE.Vector3();

  let leftCountSum = 0;
  let rightCountSum = 0;

  const bbLength = new THREE.Vector3();

  let leftCount = 0;

  let index = 0;
  for (let i = 0; i < 3; i++) {

    min = Infinity; 
    max = -Infinity;
    centroid = 0;

    for (let j = 0; j < node.count; j++) {
      index = 9 * aabbIndexList[firstIndex + j];
      
      centroid = aabbArray[index + 6 + i];
      min = Math.min(min, centroid);
      max = Math.max(max, centroid);
    }

    if (min === max) {
      continue;
    }

    for (let j = 0; j < binAmount; j++) {
      bins[j].min.set(Infinity, Infinity, Infinity);
			bins[j].max.set(-Infinity, -Infinity, -Infinity);
			bins[j].count = 0;
    }

    scale = binAmount / (max - min)

    for (let j = 0; j < node.count; j++) {
      index = 9 * aabbIndexList[firstIndex + j];

      curMin.set(aabbArray[index + 0], aabbArray[index + 1], aabbArray[index + 2]);
      curMax.set(aabbArray[index + 3], aabbArray[index + 4], aabbArray[index + 5]);
      centroid = aabbArray[index + 6 + i];

      binIndex = Math.floor(Math.min(binAmount - 1, (centroid - min) * scale));
      
      bins[binIndex].count++;
      bins[binIndex].min.min(curMin);
      bins[binIndex].max.max(curMax);
    }

    leftCountSum = 0;
    rightCountSum = 0;

    scale = (max - min) / binAmount;

    for (let j = 0; j < binAmount - 1; j++) {

      curMin.set(Infinity, Infinity, Infinity);
      curMax.set(-Infinity, -Infinity, -Infinity);
      
      leftCountSum += bins[j].count;
      leftCountSumArray[j] = leftCountSum;
      curMin.min(bins[j].min);
      curMax.max(bins[j].max);
      bbLength.subVectors(curMax, curMin);
      leftAreaArray[j] = 2 * ((bbLength.x * bbLength.y) + (bbLength.y * bbLength.z) + (bbLength.x * bbLength.z));

      curMin.set(Infinity, Infinity, Infinity);
      curMax.set(-Infinity, -Infinity, -Infinity);

      index = binAmount - 1 - j;

      rightCountSum += bins[index].count;
      rightCountSumArray[index] = rightCountSum;
      curMin.min(bins[index].min);
      curMax.max(bins[index].max);
      bbLength.subVectors(curMax, curMin);
      rightAreaArray[index] = 2 * ((bbLength.x * bbLength.y) + (bbLength.y * bbLength.z) + (bbLength.x * bbLength.z));

    }

    for (let j = 0; j < binAmount - 1; j++) {

      curCost = (leftAreaArray[j] * leftCountSumArray[j]) + (rightAreaArray[j] * rightCountSumArray[j]);
      if (curCost < bestCost) {
        bestCost = curCost;
        bestAxis = i;
        bestSplitPosition = min + (scale * (j + 1));
      }

    }

  }
  
  bbLength.subVectors(node.max, node.min);
  curArea = 2 * ((bbLength.x * bbLength.y) + (bbLength.y * bbLength.z) + (bbLength.x * bbLength.z));
  curCost = curArea * node.count;

  if (curCost < bestCost) {
    return;
  }
  
  let leftIndex = firstIndex;
  let rightIndex = leftIndex + node.count - 1;
  
  while (leftIndex <= rightIndex) {
    if (aabbArray[9 * aabbIndexList[leftIndex] + 6 + bestAxis] < bestSplitPosition) {
      leftIndex++;
    } else {
      tempIndex = aabbIndexList[leftIndex];
      aabbIndexList[leftIndex] = aabbIndexList[rightIndex];
      aabbIndexList[rightIndex] = tempIndex;
      rightIndex--;
    }
  }
  
  leftCount = leftIndex - firstIndex;
  //console.log(leftCountSumArray, rightCountSumArray)
  if (leftCount === 0 || leftCount === node.count) {
    return;
  }
  
  nodeIndex.value += 1;
  let leftChildIndex = nodeIndex.value;
  nodeIndex.value += 1;
	let rightChildIndex = nodeIndex.value;

  const leftChildNode: DataNode = {
    min: new THREE.Vector3(),
    max: new THREE.Vector3(),
    firstIndex: firstIndex,
    count: leftCount,
  };

  const rightChildNode: DataNode = {
    min: new THREE.Vector3(),
    max: new THREE.Vector3(),
    firstIndex: leftIndex,
    count: node.count - leftCount,
  };

  bvhNodes.push(leftChildNode);
  bvhNodes.push(rightChildNode);

	node.firstIndex = leftChildIndex;
	node.count = 0;
	updateBvhNodeBounds(aabbArray, aabbIndexList, bvhNodes, leftChildIndex);
	updateBvhNodeBounds(aabbArray, aabbIndexList, bvhNodes, rightChildIndex);
	
	subdivideBvhNode(aabbArray, aabbIndexList, binAmount, maxDepth, bvhNodes, leftChildIndex, nodeIndex, curDepth + 1);
	subdivideBvhNode(aabbArray, aabbIndexList, binAmount, maxDepth, bvhNodes, rightChildIndex, nodeIndex, curDepth + 1);
  //console.log(bvhNodes)
}

export function buildBvh(
  triangleArray: Float32Array, 
  aabbArray: Float32Array, 
  aabbIndexList: Uint32Array, 
  lightArray: Float32Array, 
  lightObject: LightDataObject,
  binAmount: number, 
  maxDepth: number
) {

  const triangleAmount = aabbIndexList.length;

  const newAabbIndexList = new Uint32Array(aabbIndexList);

  const curNodeIndex = {value: 0};

  const bvhNodes: DataNode[] = [];
  
  const rootNode: DataNode = {
    min: new THREE.Vector3(),
    max: new THREE.Vector3(),
    firstIndex: 0,
    count: triangleAmount,
  };

  bvhNodes.push(rootNode);
  updateBvhNodeBounds(aabbArray, newAabbIndexList, bvhNodes, curNodeIndex.value);
  subdivideBvhNode(aabbArray, newAabbIndexList, binAmount, maxDepth, bvhNodes, curNodeIndex.value, curNodeIndex, 0);
  
  let index = 0;

  const newTriangleArray = new Float32Array(triangleArray.length);
  for (let i = 0; i < newAabbIndexList.length; i++) {

    index = newAabbIndexList[i];
    for (let j = 0; j < triangleDataAmount; j++) {
      newTriangleArray[triangleDataAmount * i + j] = triangleArray[triangleDataAmount * index + j];
    }

    if (lightObject[index] !== undefined) {
      lightArray[lightObject[index] * lightDataAmount + 1] = i
    }
  }

  const bvhArray = new Float32Array(bvhNodes.length * bvhDataAmount);
  for (let i = 0; i < bvhNodes.length; i++) {

		index = bvhDataAmount * i;

    const curBvhNode = bvhNodes[i]
		
		bvhArray[index + 0] = curBvhNode.min.x;
		bvhArray[index + 1] = curBvhNode.min.y;
		bvhArray[index + 2] = curBvhNode.min.z;
		bvhArray[index + 3] = curBvhNode.max.x;
		bvhArray[index + 4] = curBvhNode.max.y;
		bvhArray[index + 5] = curBvhNode.max.z;
		bvhArray[index + 6] = curBvhNode.count;
		bvhArray[index + 7] = curBvhNode.firstIndex;
	}
  //console.log(bvhNodes)
  return {triangleArray: newTriangleArray, bvhArray, newAabbIndexList, lightArray};
  
};

export function createBvh(mesh: THREE.Mesh) {

  const {triangleArray: oldTriangleArray, aabbArray, aabbIndexList, lightArray, lightObject} = initializeDataForBvh(mesh);

  const {triangleArray, bvhArray} = buildBvh(oldTriangleArray, aabbArray, aabbIndexList, lightArray, lightObject, 2, 100);

  return {triangleArray, bvhArray, lightArray};
}

export function createTLAS(meshList: THREE.Mesh[]) {

  const tlasData = buildTLAS(meshList)
  const {tlasArray, tlasList} = createTLASArray(tlasData)

  const {triangleArray, bvhArray, lightArray} = generateArraysFromTLAS(tlasData, tlasList)

  return {tlasData, tlasArray, tlasList, triangleArray, bvhArray, lightArray}

}

export function buildTLAS(meshList: THREE.Mesh[]) {

  const tlasData: TLASData = {}
  const curVertex = new THREE.Vector3()
  const curMin = new THREE.Vector3(Infinity)
  const curMax = new THREE.Vector3(-Infinity)

  for (let i = 0; i < meshList.length; i++) {
    const curMesh = meshList[i]

    curMesh.updateMatrixWorld()
    const worldMatrix = new THREE.Matrix4().copy(curMesh.matrixWorld)
    for (let j = 0; j < worldMatrix.elements.length; j++) {
      worldMatrix.elements[j] = Math.abs(worldMatrix.elements[j]) < epsilon ? 0 : worldMatrix.elements[j]
    }
    const inverseMatrix = new THREE.Matrix4().copy(worldMatrix).invert()

    switch(checkMeshType(curMesh)) {
      case 'Mesh': 
        const {triangleArray, bvhArray, lightArray} = createBvh(curMesh)

        curMin.set(Infinity, Infinity, Infinity);
        curMax.set(-Infinity, -Infinity, -Infinity);

        for (let j = 0; j < combination2P3Digits.length; j++) {
          const curCombination = combination2P3Digits[j]
          curVertex.set(bvhArray[curCombination[0]], bvhArray[curCombination[1]], bvhArray[curCombination[2]]).applyMatrix4(worldMatrix)
          curMin.min(curVertex)
          curMax.max(curVertex)
        }

        tlasData[curMesh.userData.id] = {
          mesh: curMesh,
          min: new THREE.Vector3().copy(curMin),
          max: new THREE.Vector3().copy(curMax),
          inverseTransform: new THREE.Matrix4().copy(inverseMatrix),
          triangleArray: triangleArray,
          bvhArray: bvhArray,
          lightArray: lightArray,
        }
        
        break
        
      case 'InstancedMesh':
        
        break

    }

  }

  return tlasData

}

export function createTLASArray(tlas: TLASData) {
  const keys = Object.keys(tlas)
  const nodeIndices = keys.length;
  
  const aabbArray = new Float32Array(nodeIndices * 9);
  const nodeIdx = new Uint32Array(nodeIndices);
  const triangleArrayIdx = new Uint32Array(nodeIndices);
  const bvhArrayIdx = new Uint32Array(nodeIndices);
  const aabbIndexList = new Uint32Array(nodeIndices);

  const bbMin = new THREE.Vector3();
  const bbMax = new THREE.Vector3();
  const bbCentroid = new THREE.Vector3();

  let nextIndex = 0
  let triangleIndex = 0
  let bvhIndex = 0

  for (let i = 0; i < nodeIndices; i++) {
    const tlasData = tlas[Number(keys[i])]
    
    bbMin.copy(new THREE.Vector3(tlasData.min.x, tlasData.min.y, tlasData.min.z));
    bbMax.copy(new THREE.Vector3(tlasData.max.x, tlasData.max.y, tlasData.max.z));

    bbCentroid.copy({
      x: (bbMax.x + bbMin.x) * 0.5,
      y: (bbMax.y + bbMin.y) * 0.5,
      z: (bbMax.z + bbMin.z) * 0.5,
    });

    const aabbStartingIndex = 9 * nextIndex;

    aabbArray[aabbStartingIndex + 0] = bbMin.x;
    aabbArray[aabbStartingIndex + 1] = bbMin.y;
    aabbArray[aabbStartingIndex + 2] = bbMin.z;
    aabbArray[aabbStartingIndex + 3] = bbMax.x;
    aabbArray[aabbStartingIndex + 4] = bbMax.y;
    aabbArray[aabbStartingIndex + 5] = bbMax.z;
    aabbArray[aabbStartingIndex + 6] = bbCentroid.x;
    aabbArray[aabbStartingIndex + 7] = bbCentroid.y;
    aabbArray[aabbStartingIndex + 8] = bbCentroid.z;

    nodeIdx[nextIndex] = Number(keys[nextIndex])
    triangleArrayIdx[nextIndex] = triangleIndex
    bvhArrayIdx[nextIndex] = bvhIndex
    aabbIndexList[nextIndex] = nextIndex;
    
    nextIndex++;
    triangleIndex += tlasData.triangleArray.length / triangleDataAmount
    bvhIndex += tlasData.bvhArray.length / bvhDataAmount
  }
  //console.log(keys, nodeIdx, triangleArrayIdx, bvhArrayIdx)
  const curNodeIndex = {value: 0};

  const bvhNodes: DataNode[] = [];
  
  const rootNode: DataNode = {
    min: new THREE.Vector3(),
    max: new THREE.Vector3(),
    firstIndex: 0,
    count: nodeIndices,
  };

  bvhNodes.push(rootNode);
  updateBvhNodeBounds(aabbArray, aabbIndexList, bvhNodes, curNodeIndex.value);
  subdivideBvhNode(aabbArray, aabbIndexList, 12, 100, bvhNodes, curNodeIndex.value, curNodeIndex, 0);
  
  let index = 0;
  let shiftIndex = 0;
  //console.log(nodeIdx, aabbIndexList, bvhNodes)
  const tlasArray = new Float32Array(bvhNodes.reduce((accumulator, bvhNode) => accumulator + (bvhNode.count === 0 ? 1 : bvhNode.count), 0) * tlasDataAmount);
  
  const tlasList = new Float32Array(nodeIndices)

  for (let i = 0; i < bvhNodes.length; i++) {
    const curBvhNode = bvhNodes[i]
		
    if (curBvhNode.count === 0) {

      tlasArray[index + 0] = curBvhNode.min.x
      tlasArray[index + 1] = curBvhNode.min.y
      tlasArray[index + 2] = curBvhNode.min.z
      tlasArray[index + 3] = curBvhNode.max.x
      tlasArray[index + 4] = curBvhNode.max.y
      tlasArray[index + 5] = curBvhNode.max.z
      tlasArray[index + 6] = 0
      tlasArray[index + 7] = 0
      tlasArray[index + 8] = 0
      tlasArray[index + 9] = 0
      tlasArray[index + 10] = 0
      tlasArray[index + 11] = 0
      tlasArray[index + 12] = 0
      tlasArray[index + 13] = 0
      tlasArray[index + 14] = 0
      tlasArray[index + 15] = 0
      tlasArray[index + 16] = 0
      tlasArray[index + 17] = 0
      tlasArray[index + 18] = 0
      tlasArray[index + 19] = 0
      tlasArray[index + 20] = 0
      tlasArray[index + 21] = 0
      tlasArray[index + 22] = curBvhNode.count
      tlasArray[index + 23] = curBvhNode.firstIndex + shiftIndex
      tlasArray[index + 24] = 0
      tlasArray[index + 25] = 0
      tlasArray[index + 26] = 0
      tlasArray[index + 27] = 0

      index += tlasDataAmount

      shiftIndex += 
        (bvhNodes[curBvhNode.firstIndex].count === 0 ? 0 : bvhNodes[curBvhNode.firstIndex].count - 1) + 
        (bvhNodes[curBvhNode.firstIndex + 1] ? (bvhNodes[curBvhNode.firstIndex + 1].count === 0 ? 0 : bvhNodes[curBvhNode.firstIndex + 1].count - 1) : 0)
    } else {
      //console.log(bvhNodes[i])
      for (let j = 0; j < curBvhNode.count; j++) {
        nextIndex = aabbIndexList[curBvhNode.firstIndex + j]
        //console.log(curBvhNode.firstIndex + j)
        const tlasData = tlas[nodeIdx[nextIndex]]
        const inverseMatrix = tlasData.inverseTransform.elements

        tlasArray[index + 0] = curBvhNode.min.x
        tlasArray[index + 1] = curBvhNode.min.y
        tlasArray[index + 2] = curBvhNode.min.z
        tlasArray[index + 3] = curBvhNode.max.x
        tlasArray[index + 4] = curBvhNode.max.y
        tlasArray[index + 5] = curBvhNode.max.z
        tlasArray[index + 6] = inverseMatrix[0]
        tlasArray[index + 7] = inverseMatrix[1]
        tlasArray[index + 8] = inverseMatrix[2]
        tlasArray[index + 9] = inverseMatrix[3]
        tlasArray[index + 10] = inverseMatrix[4]
        tlasArray[index + 11] = inverseMatrix[5]
        tlasArray[index + 12] = inverseMatrix[6]
        tlasArray[index + 13] = inverseMatrix[7]
        tlasArray[index + 14] = inverseMatrix[8]
        tlasArray[index + 15] = inverseMatrix[9]
        tlasArray[index + 16] = inverseMatrix[10]
        tlasArray[index + 17] = inverseMatrix[11]
        tlasArray[index + 18] = inverseMatrix[12]
        tlasArray[index + 19] = inverseMatrix[13]
        tlasArray[index + 20] = inverseMatrix[14]
        tlasArray[index + 21] = inverseMatrix[15]
        tlasArray[index + 22] = j === 0 ? curBvhNode.count : 1
        tlasArray[index + 23] = triangleArrayIdx[nextIndex]
        tlasArray[index + 24] = bvhArrayIdx[nextIndex]
        tlasArray[index + 25] = 0
        tlasArray[index + 26] = 0
        tlasArray[index + 27] = 0

        tlasList[nextIndex] = index / tlasDataAmount

        index += tlasDataAmount
      }
    }

	}
  //console.log(tlasArray, triangleArrayIdx, bvhArrayIdx)
  return {tlasArray, tlasList}
}

export function generateArraysFromTLAS(tlas: TLASData, tlasList: Float32Array) {
  let triangleIndex = 0
  let bvhIndex = 0
  let lightIndex = 0

  const keys = Object.keys(tlas)

  for (let i = 0; i < keys.length; i++) {

    const key = keys[i]
    const tlasData = tlas[Number(key)]

    triangleIndex += tlasData.triangleArray.length
    bvhIndex += tlasData.bvhArray.length
    lightIndex += tlasData.lightArray.length

  }

  const triangleArray = new Float32Array(triangleIndex);
  const bvhArray = new Float32Array(bvhIndex);
  const lightArray = new Float32Array(lightIndex);

  triangleIndex = 0
  bvhIndex = 0
  lightIndex = 0

  for (let i = 0; i < keys.length; i++) {

    const key = keys[i]
    const tlasData = tlas[Number(key)]

    lightArray.set(tlasData.lightArray, lightIndex)

    lightIndex += tlasData.lightArray.length
  }

  let totalLight = 0

  for (let i = 0; i < (lightArray.length / lightDataAmount); i++) {

    totalLight += lightArray[i + 2]
  }

  let cumulativeLight = 0
  lightIndex = 0

  for (let i = 0; i < keys.length; i++) {

    const key = keys[i]
    const tlasData = tlas[Number(key)]

    triangleArray.set(tlasData.triangleArray, triangleIndex)
    bvhArray.set(tlasData.bvhArray, bvhIndex)

    triangleIndex += tlasData.triangleArray.length
    bvhIndex += tlasData.bvhArray.length

    for (let j = 0; j < tlasData.lightArray.length; j++) {
      lightArray[(j + lightIndex) * lightDataAmount] = i

      cumulativeLight += lightArray[(j + lightIndex) * lightDataAmount + 2] / totalLight

      lightArray[(j + lightIndex) * lightDataAmount + 2] = cumulativeLight
    }

    lightIndex += tlasData.lightArray.length
    
  }

  lightArray[3] = lightArray.length / lightDataAmount

  //console.log(triangleArray, bvhArray)
  return {triangleArray, bvhArray, lightArray}
}

export function updateTLAS(tlas: TLASData, updatedIds: Record<number, ObjectUpdaterData>) {

  const curVertex = new THREE.Vector3()
  const curMin = new THREE.Vector3(Infinity)
  const curMax = new THREE.Vector3(-Infinity)

  let fullUpdate = false

  for (const id in updatedIds) {
    if (tlas[id] && updatedIds[id].update !== 0) {
      const curMesh = tlas[id].mesh
      curMesh.updateMatrixWorld()

      const worldMatrix = new THREE.Matrix4().copy(curMesh.matrixWorld)
      for (let j = 0; j < worldMatrix.elements.length; j++) {
        worldMatrix.elements[j] = Math.abs(worldMatrix.elements[j]) < epsilon ? 0 : worldMatrix.elements[j]
      }
      const inverseMatrix = new THREE.Matrix4().copy(worldMatrix).invert()

      curMin.set(Infinity, Infinity, Infinity);
      curMax.set(-Infinity, -Infinity, -Infinity);

      switch(updatedIds[id].update) {
        case 1:
          switch(updatedIds[id].type) {
            case 'Mesh': 

              for (let j = 0; j < combination2P3Digits.length; j++) {
                const curCombination = combination2P3Digits[j]
                curVertex.set(tlas[id].bvhArray[curCombination[0]], tlas[id].bvhArray[curCombination[1]], tlas[id].bvhArray[curCombination[2]]).applyMatrix4(worldMatrix)
                curMin.min(curVertex)
                curMax.max(curVertex)
              }

              tlas[id].min = new THREE.Vector3().copy(curMin)
              tlas[id].max = new THREE.Vector3().copy(curMax)
              tlas[id].inverseTransform = new THREE.Matrix4().copy(inverseMatrix)
              
              break
              
            case 'InstancedMesh':
              
              break
          }
          break

        case 2:
          fullUpdate = true

          switch(updatedIds[id].type) {
            case 'Mesh': 
              const {triangleArray, bvhArray, lightArray} = createBvh(tlas[id].mesh)

              for (let j = 0; j < combination2P3Digits.length; j++) {
                const curCombination = combination2P3Digits[j]
                curVertex.set(bvhArray[curCombination[0]], bvhArray[curCombination[1]], bvhArray[curCombination[2]]).applyMatrix4(worldMatrix)
                curMin.min(curVertex)
                curMax.max(curVertex)
              }

              tlas[id].min = new THREE.Vector3().copy(curMin)
              tlas[id].max = new THREE.Vector3().copy(curMax)
              tlas[id].inverseTransform = new THREE.Matrix4().copy(inverseMatrix)
              tlas[id].triangleArray = triangleArray
              tlas[id].bvhArray = bvhArray
              tlas[id].lightArray = lightArray
              
              break
              
            case 'InstancedMesh':
              
              break
          }
          break
      }

      if (!updatedIds[id].constant) {
        updatedIds[id].update = 0
      }
    }
  }

  if (fullUpdate) return true
  return false
}

const TlasDataStruct = struct({
  nodeData1: "vec4",
  nodeData2: "vec4",
  nodeData3: "vec4",
  nodeData4: "vec4",
  nodeData5: "vec4",
  nodeData6: "vec4",
  nodeData7: "vec4",
})

const getTlasData = Fn(({
  tlasArray,
  index,
}: {
  tlasArray: THREE.StorageBufferNode<"vec4">,
  index: THREE.Node<"int">,
}) => {
  const nodeData1 = vec4(tlasArray.element(index));
  const nodeData2 = vec4(tlasArray.element(add(index, 1)));
  const nodeData3 = vec4(tlasArray.element(add(index, 2)));
  const nodeData4 = vec4(tlasArray.element(add(index, 3)));
  const nodeData5 = vec4(tlasArray.element(add(index, 4)));
  const nodeData6 = vec4(tlasArray.element(add(index, 5)));
  const nodeData7 = vec4(tlasArray.element(add(index, 6)));

  return TlasDataStruct(nodeData1, nodeData2, nodeData3, nodeData4, nodeData5, nodeData6, nodeData7);
});


const BvhDataStruct = struct({
  nodeData1: "vec4",
  nodeData2: "vec4",
})

const getBvhData = Fn(({
  bvhArray,
  index,
}: {
  bvhArray: THREE.StorageBufferNode<"vec4">,
  index: THREE.Node<"int">,
}) => {
  const nodeData1 = vec4(bvhArray.element(index));
  const nodeData2 = vec4(bvhArray.element(add(index, 1)));

  return BvhDataStruct(nodeData1, nodeData2);
});

const TriangleArrayPositionDataStruct = struct({
  nodeData1: "vec4",
  nodeData2: "vec4",
  nodeData3: "vec4",
})

const getTriangleArrayPositionData = Fn(({
  triangleArray,
  index,
}: {
  triangleArray: THREE.StorageBufferNode<"vec4">,
  index: THREE.Node<"int">,
}) => {
  const nodeData1 = vec4(triangleArray.element(index));
  const nodeData2 = vec4(triangleArray.element(add(index, 1)));
  const nodeData3 = vec4(triangleArray.element(add(index, 2)));

  return TriangleArrayPositionDataStruct(nodeData1, nodeData2, nodeData3);
});

const TriangleArrayDataStruct = struct({
  nodeData1: "vec4",
  nodeData2: "vec4",
  nodeData3: "vec4",
  nodeData4: "vec4",
  nodeData5: "vec4",
  nodeData6: "vec4",
  nodeData7: "vec4",
  nodeData8: "vec4",
  nodeData9: "vec4",
  nodeData10: "vec4",
})

const getTriangleArrayData = Fn(({
  triangleArray,
  index,
}: {
  triangleArray: THREE.StorageBufferNode<"vec4">,
  index: THREE.Node<"int">,
}) => {
  const nodeData1 = vec4(triangleArray.element(index));
  const nodeData2 = vec4(triangleArray.element(add(index, 1)));
  const nodeData3 = vec4(triangleArray.element(add(index, 2)));
  const nodeData4 = vec4(triangleArray.element(add(index, 3)));
  const nodeData5 = vec4(triangleArray.element(add(index, 4)));
  const nodeData6 = vec4(triangleArray.element(add(index, 5)));
  const nodeData7 = vec4(triangleArray.element(add(index, 6)));
  const nodeData8 = vec4(triangleArray.element(add(index, 7)));
  const nodeData9 = vec4(triangleArray.element(add(index, 8)));
  const nodeData10 = vec4(triangleArray.element(add(index, 9)));

  return TriangleArrayDataStruct(nodeData1, nodeData2, nodeData3, nodeData4, nodeData5, nodeData6, nodeData7, nodeData8, nodeData9, nodeData10);
});

export const BvhIntersectStruct = struct({
  triangleUVW: "vec3",
  hitData1: "vec4",
  hitData2: "vec4",
  hitData3: "vec4",
  hitData4: "vec4",
  hitData5: "vec4",
  hitData6: "vec4",
  t: "float",
})

export const bvhIntersect = Fn(({
  tlasArray,
  triangleArray,
  bvhArray,
  rayOrigin,
  rayDirection,
}: {
  tlasArray: THREE.StorageBufferNode<"vec4">,
  triangleArray: THREE.StorageBufferNode<"vec4">,
  bvhArray: THREE.StorageBufferNode<"vec4">,
  rayOrigin: THREE.Node<"vec3">,
  rayDirection: THREE.Node<"vec3">,
}) => {

  const triangleUVW = vec3(0).toVar()
  const hitData1 = vec4(0).toVar()
  const hitData2 = vec4(0).toVar()
  const hitData3 = vec4(0).toVar()
  const hitData4 = vec4(0).toVar()
  const hitData5 = vec4(0).toVar()
  const hitData6 = vec4(0).toVar()
  const t = float(INFINITY).toVar()

  const nodeData1 = vec4(0).toVar();
  const nodeData2 = vec4(0).toVar();
  const nodeData3 = vec4(0).toVar();
  const nodeData4 = vec4(0).toVar();
  const nodeData5 = vec4(0).toVar();
  const nodeData6 = vec4(0).toVar();
  const nodeData7 = vec4(0).toVar();
  const nodeData8 = vec4(0).toVar();
  const nodeData9 = vec4(0).toVar();
  const nodeData10 = vec4(0).toVar();
  const triangleUV = vec2(0).toVar();
  const triangleId = int(0).toVar();

  const hitPosition = vec3(0).toVar();
  const hitNormal = vec3(0).toVar();
  const hitUv = vec2(0).toVar();

  const index = int(0).toVar();
  const triangleIntersection = int(0).toVar();

  const triangleIntersectObject = TriangleIntersectStruct();

  const curTlasT = float(0).toVar()

  const tlasPointer = int(0).toVar();
  const tlasStackArray = array('int', 64);

  tlasStackArray.element(0).assign(0);

  const tlasCount = int(0).toVar()
  const tlasFirstIndex = int(0).toVar()

  const minT = float(INFINITY).toVar();
  const curT = float(0).toVar();
  const transformedCurT = float(0).toVar()

  const pointer = int(0).toVar();
  const stackArray = array('int', 64);

  const inverseMatrix = mat4().toVar()
  const triangleIndex = int(0).toVar()
  const bvhIndex = int(0).toVar()
  const worldMatrix = mat4().toVar()

  const transformedRayOrigin = vec3(0).toVar()
  const scaleFactor = float(0).toVar()
  const transformedRayDirection = vec3(0).toVar()

  const triangleCount = int(0).toVar()
  const triangleFirstIndex = int(0).toVar()

  Loop(10000, () => {
    If(tlasPointer.lessThan(0), () => {
      Break();
    });
    
    index.assign(int(mul(7, tlasStackArray.element(tlasPointer))))

    nodeData1.assign(vec4(tlasArray.element(index)));
    nodeData2.assign(vec4(tlasArray.element(add(index, 1))));
    nodeData3.assign(vec4(tlasArray.element(add(index, 2))));
    nodeData4.assign(vec4(tlasArray.element(add(index, 3))));
    nodeData5.assign(vec4(tlasArray.element(add(index, 4))));
    nodeData6.assign(vec4(tlasArray.element(add(index, 5))));
    nodeData7.assign(vec4(tlasArray.element(add(index, 6))));

    curTlasT.assign(boundingBoxIntersect({
      bbMin: vec3(nodeData1.xyz),
      bbMax: vec3(nodeData1.w, nodeData2.xy),
      rayOrigin,
      rayDirection,
    }));

    If(curTlasT.equal(INFINITY), () => {
      tlasPointer.subAssign(1);
      Continue();
    });

    If(nodeData6.z.equal(0), () => {
      tlasStackArray.element(tlasPointer).assign(nodeData6.w);
      tlasCount.assign(vec4(tlasArray.element(add(mul(7, nodeData6.w), 5))).z)
      tlasPointer.addAssign(1);
      tlasStackArray.element(tlasPointer).assign(add(nodeData6.w, select<"int">(tlasCount.equal(0), int(1), tlasCount)));

      Continue();
    });
    
    tlasCount.assign(nodeData6.z)
    tlasFirstIndex.assign(tlasStackArray.element(tlasPointer))

    inverseMatrix.assign(mat4(
      vec4(nodeData2.z, nodeData2.w, nodeData3.x, nodeData3.y),
      vec4(nodeData3.z, nodeData3.w, nodeData4.x, nodeData4.y),
      vec4(nodeData4.z, nodeData4.w, nodeData5.x, nodeData5.y),
      vec4(nodeData5.z, nodeData5.w, nodeData6.x, nodeData6.y),
    ))
    
    triangleIndex.assign(nodeData6.w)
    bvhIndex.assign(nodeData7.x)

    transformedRayOrigin.assign(mul(inverseMatrix, vec4(rayOrigin, 1)).xyz)
    scaleFactor.assign(length(mul(inverseMatrix, vec4(rayDirection, 0)).xyz))
    scaleFactor.assign(select<"float">(scaleFactor.equal(0), float(1), div(1, scaleFactor)))
    transformedRayDirection.assign(transformDirection(rayDirection, inverseMatrix))

    pointer.assign(0)
    stackArray.element(0).assign(0);

    Loop(10000, () => {
      If(pointer.lessThan(0), () => {
        Break();
      });

      index.assign(int(mul(2, add(stackArray.element(pointer), bvhIndex))))

      nodeData1.assign(vec4(bvhArray.element(index)));
      nodeData2.assign(vec4(bvhArray.element(add(index, 1))));

      curT.assign(boundingBoxIntersect({
        bbMin: vec3(nodeData1.xyz),
        bbMax: vec3(nodeData1.w, nodeData2.xy),
        rayOrigin: transformedRayOrigin,
        rayDirection: transformedRayDirection,
      }));
      transformedCurT.assign(mul(curT, scaleFactor))
      
      If(or(curT.equal(INFINITY), transformedCurT.greaterThanEqual(minT)), () => {
        pointer.subAssign(1);
        Continue();
      });

      If(nodeData2.z.equal(0), () => {
        stackArray.element(pointer).assign(nodeData2.w);
        pointer.addAssign(1);
        stackArray.element(pointer).assign(add(nodeData2.w, 1));

        Continue();
      });

      triangleCount.assign(nodeData2.z)
      triangleFirstIndex.assign(nodeData2.w)
      
      Loop({start: int(0), end: int(triangleCount), type: 'int', condition: '<'}, ({ i }) => {
        index.assign(mul(10, add(add(triangleFirstIndex, triangleIndex), i)));
        
        nodeData1.assign(vec4(triangleArray.element(index)));
        nodeData2.assign(vec4(triangleArray.element(add(index, 1))));
        nodeData3.assign(vec4(triangleArray.element(add(index, 2))));

        triangleIntersectObject.assign(triangleIntersect({
          p1: vec3(nodeData1.xyz),
          p2: vec3(nodeData1.w, nodeData2.xy),
          p3: vec3(nodeData2.zw, nodeData3.x),
          rayOrigin: transformedRayOrigin,
          rayDirection: transformedRayDirection,
        }));
        triangleUV.x.assign(triangleIntersectObject.get("u"));
        triangleUV.y.assign(triangleIntersectObject.get("v"));
        curT.assign(triangleIntersectObject.get("t"));
        transformedCurT.assign(mul(curT, scaleFactor))
        
        If(and(curT.notEqual(INFINITY), transformedCurT.lessThan(minT)), () => {
          minT.assign(transformedCurT);
          triangleIntersection.assign(1);
          triangleUVW.assign(vec3(triangleUV.x, triangleUV.y, float(0)));
          triangleId.assign(index);
          worldMatrix.assign(inverseMatrix)
        });
      });

      pointer.subAssign(1);

    });

    tlasPointer.subAssign(1);
    
    Loop({start: int(1), end: int(tlasCount), type: 'int', condition: '<'}, ({ i }) => {
      tlasPointer.addAssign(1);
      tlasStackArray.element(tlasPointer).assign(add(tlasFirstIndex, i));
    })
  })
  
  If(triangleIntersection.equal(1), () => {
    triangleUVW.z.assign(sub(sub(1, triangleUVW.x), triangleUVW.y));

    nodeData1.assign(vec4(triangleArray.element(triangleId)));
    nodeData2.assign(vec4(triangleArray.element(add(triangleId, 1))));
    nodeData3.assign(vec4(triangleArray.element(add(triangleId, 2))));
    nodeData4.assign(vec4(triangleArray.element(add(triangleId, 3))));
    nodeData5.assign(vec4(triangleArray.element(add(triangleId, 4))));
    nodeData6.assign(vec4(triangleArray.element(add(triangleId, 5))));
    nodeData7.assign(vec4(triangleArray.element(add(triangleId, 6))));
    nodeData8.assign(vec4(triangleArray.element(add(triangleId, 7))));
    nodeData9.assign(vec4(triangleArray.element(add(triangleId, 8))));
    nodeData10.assign(vec4(triangleArray.element(add(triangleId, 9))));
    
    worldMatrix.assign(inverse(worldMatrix))

    hitPosition.assign(mul(worldMatrix, vec4(add(add(mul(triangleUVW.z, vec3(nodeData1.xyz)), mul(triangleUVW.x, vec3(nodeData1.w, nodeData2.xy))), mul(triangleUVW.y, vec3(nodeData2.zw, nodeData3.x))), 1)).xyz);
    hitNormal.assign(transformDirection(vec3(add(add(mul(triangleUVW.z, vec3(nodeData3.yzw)), mul(triangleUVW.x, vec3(nodeData4.xyz))), mul(triangleUVW.y, vec3(nodeData4.w, nodeData5.xy)))), worldMatrix))
    hitUv.assign(add(add(mul(triangleUVW.z, vec2(nodeData5.zw)), mul(triangleUVW.x, vec2(nodeData6.xy))), mul(triangleUVW.y, vec2(nodeData6.zw))));
    
    hitData1.assign(vec4(hitPosition.xyz, hitNormal.x));
    hitData2.assign(vec4(hitNormal.yz, hitUv.xy));
    hitData3.assign(vec4(nodeData7.xyzw));
    hitData4.assign(vec4(nodeData8.xyzw));
    hitData5.assign(vec4(nodeData9.xyzw));
    hitData6.assign(vec4(nodeData10.xyzw));

    t.assign(minT);
  });

  return BvhIntersectStruct(triangleUVW, hitData1, hitData2, hitData3, hitData4, hitData5, hitData6, t);
});