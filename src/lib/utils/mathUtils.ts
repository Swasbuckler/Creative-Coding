import * as THREE from 'three';

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