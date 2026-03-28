import * as THREE from 'three/webgpu';
import { add, cos, cross, dot, float, Fn, fract, mat4, mul, negate, normalize, oneMinus, pow, reciprocal, sin, sqrt, sub, vec3, vec4 } from "three/tsl";

export const hash = Fn(({
  seed
}: {
  seed: THREE.Node<"float">
}) => {
  let h = fract(mul(seed, 0.1031));
  h = mul(h, add(h, 33.33))
  h = mul(h, add(h, h));
  return fract(h);
});

export const rotateY = Fn(({
  point,
  angle,
}: {
  point: THREE.Node<"vec3">,
  angle: THREE.Node<"float">,
}) => {
  const cosA = cos(angle);
  const sinA = sin(angle);

  return vec3(
    add(mul(point.x, cosA), mul(point.z, sinA)),
    point.y,
    add(mul(point.x, negate(sinA)), mul(point.z, cosA)),
  );
});

export const getQuaternionFromUnitVectors = Fn(({
  vFrom,
  vTo,
}: {
  vFrom: THREE.Node<"vec3">,
  vTo: THREE.Node<"vec3">,
}) => {
  const start = normalize(vFrom);
  const end = normalize(vTo);

  const dotProduct = dot(start, end);
  let rotationAxis = cross(start, end);

	const s = sqrt(mul(add(1.0, dotProduct), 2.0));
	const invs = reciprocal(s);

	return vec4(
		mul(rotationAxis.x, invs),
		mul(rotationAxis.y, invs),
		mul(rotationAxis.z, invs),
    mul(s, 0.5), 
	);
});

export const getConjugateQuaternion = Fn(({
  quaternion,
}: {
  quaternion: THREE.Node<"vec4">,
}) => {
  const normalized = normalize(quaternion);

  return vec4(negate(normalized.x), negate(normalized.y), negate(normalized.z), normalized.w);
});

export const getRotationMatrix = Fn(({
  vector,
  angle,
}: {
  vector: THREE.Node<"vec3">,
  angle: THREE.Node<"float">,
}) => {
  const normalized = normalize(vector);

  const x = normalized.x;
  const y = normalized.y;
  const z = normalized.z;

  const cosA = cos(angle);
  const sinA = sin(angle);
  const ic = oneMinus(cosA);

  return mat4(
    add(cosA, mul(pow(x, 2), ic)), sub(mul(mul(x, y), ic), mul(z, sinA)), add(mul(mul(x, z), ic), mul(y, sinA)), float(0.0),
    add(mul(mul(x, y), ic), mul(z, sinA)), add(cosA, mul(pow(y, 2), ic)), sub(mul(mul(y, z), ic), mul(x, sinA)), float(0.0),
    sub(mul(mul(x, z), ic), mul(y, sinA)), add(mul(mul(y, z), ic), mul(x, sinA)), add(cosA, mul(pow(z, 2), ic)), float(0.0),
    float(0.0), float(0.0), float(0.0), float(1.0),
  );
});

export const getQuaternion = Fn(({
  vector,
  angle,
}: {
  vector: THREE.Node<"vec3">,
  angle: THREE.Node<"float">,
}) => {
  const normalized = normalize(vector);

  const cosA = cos(mul(angle, 0.5));
  const sinA = sin(mul(angle, 0.5));

  return vec4(mul(normalized.x, sinA), mul(normalized.y, sinA), mul(normalized.z, sinA), cosA);
});

export const lookAtPoint = Fn(({
  origin,
  vFrom,
  vTo,
}: {
  origin: THREE.Node<"vec3">,
  vFrom: THREE.Node<"vec3">,
  vTo: THREE.Node<"vec3">,
}) => {
  const planeNormal = normalize(sub(vTo, origin));
  const quaternion = getQuaternionFromUnitVectors({
    vFrom: vec3(0, 0, 1), 
    vTo: planeNormal,
  });
  
  return add(vFrom, mul(float(2.0), cross(quaternion.xyz, add(cross(quaternion.xyz, vFrom), mul(quaternion.w, vFrom)))));
});