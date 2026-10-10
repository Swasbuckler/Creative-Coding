import * as THREE from 'three';
import type { CameraData } from '../types/pathTracingTypes';

export function createRotationXMatrix3(angle: number) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  return new THREE.Matrix3(
    1, 0, 0,
    0, cosA, -sinA,
    0, sinA, cosA,
  );
}

export function createRotationYMatrix3(angle: number) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  return new THREE.Matrix3(
    cosA, 0, sinA,
    0, 1, 0,
    -sinA, 0, cosA,
  );
}

export function createRotationZMatrix3(angle: number) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  return new THREE.Matrix3(
    cosA, -sinA, 0,
    sinA, cosA, 0,
    0, 0, 1,
  );
}

export function dotProductMatrix3Vector(matrix: THREE.Matrix3, vector: THREE.Vector3) {

  const matrix3d = matrix.elements;
  
  const r0c0 = matrix3d[0];
  const r0c1 = matrix3d[1];
  const r0c2 = matrix3d[2];
  const r1c0 = matrix3d[3];
  const r1c1 = matrix3d[4];
  const r1c2 = matrix3d[5];
  const r2c0 = matrix3d[6];
  const r2c1 = matrix3d[7];
  const r2c2 = matrix3d[8];

  const x = vector.x;
  const y = vector.y;
  const z = vector.z;

  const resultX = x * r0c0 + y * r0c1 + z * r0c2;
  const resultY = x * r1c0 + y * r1c1 + z * r1c2;
  const resultZ = x * r2c0 + y * r2c1 + z * r2c2;

  return new THREE.Vector3(resultX, resultY, resultZ);
}

export function createFixedArray(arraySize: number) {
  return new Array(arraySize).fill(0);
}

export function createFixedFloat32Array(arraySize: number) {
  return new Float32Array(arraySize).fill(0);
}

export function convertToFixedFloat32Array(
  arraySize: number,
  array: Float32Array,
) {
  if (array.length > arraySize) {
    console.log("Array bigger than array size")
    return array
  }
  return createFixedFloat32Array(arraySize).map((_, index) => array[index] == undefined ? 0 : array[index]);
}

/**
 * 
 * Converts a given Float32Array into an array that stores indexed values sequentially into Vector4
 * 
 * @param arraySize The number of items in the returning array / The number of Vector4s in the returning array
 * @param array The Float32Array that holds the data to be stored in the returning array.
 * @returns An Array that holds all of the values from the given array in Vector4s
 */

export function float32ArrayToVec4Array(
  arraySize: number,
  array: Float32Array,
) {
  return createFixedArray(arraySize).map((_, index) => array[4 * index] == undefined ? new THREE.Vector4(0, 0, 0, 0) : new THREE.Vector4(
    array[4 * index + 0] || 0,
    array[4 * index + 1] || 0,
    array[4 * index + 2] || 0,
    array[4 * index + 3] || 0,
  ));
}

export function roundToDecimalPlace(n: number, decimalPlace: number) {
  return Number(n.toFixed(decimalPlace))
}

export const combination2P3Digits = [
  [0, 1, 2],
  [3, 1, 2],
  [0, 4, 2],
  [0, 1, 5],
  [3, 4, 2],
  [3, 1, 5],
  [0, 4, 5],
  [3, 4, 5],
]

export const resolutions = [1280, 1920, 2560, 3840]

export function compareCameraData(cameraData: CameraData, camera: THREE.Camera) {
  if (
    cameraData.position.equals(camera.position) && 
    cameraData.rotation.equals(camera.rotation)
  ) 
    return true

  return false
}