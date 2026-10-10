import * as THREE from 'three/webgpu';
import { abs, acos, add, and, array, atan, Break, cameraPosition, cameraWorldMatrix, clamp, cos, cross, distance, div, dot, EPSILON, equal, exp, float, floor, Fn, fract, If, INFINITY, int, inverse, inverseSqrt, length, log, Loop, mat4, max, min, mix, mul, negate, normalize, oneMinus, or, PI, PI2, pow, radians, reciprocal, Return, select, sign, sin, sqrt, struct, sub, tan, uvec2, vec2, vec3, vec4 } from "three/tsl";
import { bvhIntersect, BvhIntersectStruct } from './bvhUtils';

// Global Variables

export const globalSeed = float(0).toVar();
export const globalSeed2 = vec2(0).toVar();
export const luminance = vec3(0.2126, 0.7152, 0.0722).toVar()

// Functions for Random Value

export const hash = Fn(({
  seed
}: {
  seed: THREE.Node<"float">
}) => {
  const h = fract(mul(seed, 0.1031)).toVar();
  h.assign(mul(h, add(h, 33.33)))
  h.assign(mul(h, add(h, h)));
  return fract(h);
});

export const hash2 = Fn(({
  seed
}: {
  seed: THREE.Node<"vec2">
}) => {
  const p3 = fract(mul(vec3(seed.xyx), 0.1031)).toVar();
  p3.assign(add(p3, dot(p3, add(p3.yzx, 33.33))));
  return fract(mul(add(p3.x, p3.y), p3.z));
});

export const rng = Fn(() => {
  globalSeed.assign(add(globalSeed, 1));
  return hash({seed: globalSeed});
});

export const rng2 = Fn(() => {
  globalSeed2.assign(add(globalSeed2, 1));
  return hash2({seed: globalSeed2});
});

// Functions for Rotational Features

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
    add(cosA, mul(pow(x, 2), ic)), sub(mul(mul(x, y), ic), mul(z, sinA)), add(mul(mul(x, z), ic), mul(y, sinA)), 0.0,
    add(mul(mul(x, y), ic), mul(z, sinA)), add(cosA, mul(pow(y, 2), ic)), sub(mul(mul(y, z), ic), mul(x, sinA)), 0.0,
    sub(mul(mul(x, z), ic), mul(y, sinA)), add(mul(mul(y, z), ic), mul(x, sinA)), add(cosA, mul(pow(z, 2), ic)), 0.0,
    0.0, 0.0, 0.0, 1.0,
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
  
  return add(vFrom, mul(2.0, cross(quaternion.xyz, add(cross(quaternion.xyz, vFrom), mul(quaternion.w, vFrom)))));
});

// Miscellaneous Functions

export const phillips = Fn(({
  x,
  y,
  N,
  A,
  w,
  wL,
}: {
  x: THREE.Node<"float">,
  y: THREE.Node<"float">,
  N: THREE.Node<"float">,
  A: THREE.Node<"float">,
  w: THREE.Node<"vec2">,
  wL: THREE.Node<"float">,
}) => {
  const k = vec2(div(mul(PI, sub(mul(2.0, float(x)), float(N))), float(wL)), div(mul(PI, sub(mul(float(2.0), float(y)), float(N))), float(wL)));
  const k_length = k.length();

  const k_length2 = mul(k_length, k_length);
  const k_length4 = mul(k_length2, k_length2);
 
  const k_dot_w = dot(normalize(k), normalize(w));
  const k_dot_w2 = mul(k_dot_w, k_dot_w);
  const k_dot_w4 = mul(k_dot_w2, k_dot_w2);
  const k_dot_w6 = mul(k_dot_w4, k_dot_w2);
 
  const w_length = length(w);
  const L = mul(w_length, w_length);
  const L2 = mul(L, L);
 
  const damping = float(0.001);
  const l2 = mul(L2, damping, damping);

  return mul(float(A), mul(mul(div(exp(div(float(-1.0), mul(k_length2, L2))), k_length4), k_dot_w6), exp(mul(negate(k_length2), l2))));
});

export const gaussianNoise = Fn(({
  x,
  y,
  mean,
  std,
}: {
  x: THREE.Node<"float">,
  y: THREE.Node<"float">,
  mean: THREE.Node<"float">,
  std: THREE.Node<"float">,
}) => {
  const u1 = hash2({seed: vec2(float(x), float(y))});
  const u2 = hash2({seed: add(vec2(float(x), float(y)), vec2(1.0))});
    
  const z = mul(sqrt(mul(-2.0, log(float(u1)))), cos(mul(2.0, PI, float(u2))));
  
  return min(add(mul(z, float(std)), float(mean)), 1);
});

export const gaussianRandomVariable = Fn(({
  x,
  y,
}: {
  x: THREE.Node<"float">,
  y: THREE.Node<"float">,
}) => {
  const x1 = sub(mul(2.0, hash2({seed: vec2(float(x), float(y))})), 1.0);
  const x2 = sub(mul(2.0, hash2({seed: add(vec2(float(x), float(y)), vec2(0.5))})), 1.0);
  const w = add(mul(x1, x1), mul(x2, x2));
  const w2 = sqrt(div(mul(-2.0, log(w)), w));
  return vec2(mul(x1, w2), mul(x2, w2));
});

export const dispersion = Fn(({
  x,
  y,
  N,
  wL,
  g,
}: {
  x: THREE.Node<"float">,
  y: THREE.Node<"float">,
  N: THREE.Node<"float">,
  wL: THREE.Node<"float">,
  g: THREE.Node<"float">,
}) => {
  const w_0 = div(mul(2.0, PI), 200.0);
  const kx = mul(PI, div(sub(mul(2.0, float(x)), float(N)), float(wL)));
  const ky = mul(PI, div(sub(mul(2.0, float(y)), float(N)), float(wL)));
  return mul(floor(div(sqrt(mul(float(g), sqrt(add(mul(kx, kx), mul(ky, ky))))), w_0)), w_0);
});

export const hTilde = Fn(({
  x,
  y,
  N,
  A,
  w,
  wL,
}: {
  x: THREE.Node<"float">,
  y: THREE.Node<"float">,
  N: THREE.Node<"float">,
  A: THREE.Node<"float">,
  w: THREE.Node<"vec2">,
  wL: THREE.Node<"float">,
}) => {
  const r = gaussianRandomVariable({x: float(x), y: float(y)});
  return mul(r, sqrt(div(phillips({
    x,
    y,
    N,
    A,
    w,
    wL,
  }), 2.0)));
});

export const uniformHemisphereSampling = Fn(({
  r1,
  r2,
}: {
  r1: THREE.Node<"float">,
  r2: THREE.Node<"float">,
}) => {
  const sinTheta = sqrt(sub(1, mul(r1, r1)));
  const phi = mul(2, mul(PI, r2));
  const x = mul(sinTheta, cos(phi));
  const z = mul(sinTheta, sin(phi));
  
  return vec3(x, r1, z);
})

export const transformDirectionWithNormal = Fn(({
  normal,
  rayDirection,
}: {
  normal: THREE.Node<"vec3">,
  rayDirection: THREE.Node<"vec3">,
}) => {

  const nT = vec3().toVar()

  If(abs(normal.x).greaterThan(abs(normal.y)), () => {
    nT.assign(div(vec3(normal.z, 0, negate(normal.x)), sqrt(add(mul(normal.x, normal.x), mul(normal.z, normal.z)))))
  }).Else(() => {
    nT.assign(div(vec3(0, negate(normal.z), normal.y), sqrt(add(mul(normal.y, normal.y), mul(normal.z, normal.z)))))
  })

  const nB = cross(normal, nT).toVar()

  return vec3(
    add(add(mul(rayDirection.x, nB.x), mul(rayDirection.y, normal.x)), mul(rayDirection.z, nT.x)),
    add(add(mul(rayDirection.x, nB.y), mul(rayDirection.y, normal.y)), mul(rayDirection.z, nT.y)),
    add(add(mul(rayDirection.x, nB.z), mul(rayDirection.y, normal.z)), mul(rayDirection.z, nT.z)),
  )
})

export const quaternionFromUnitVectors = Fn(({
  vFrom,
  vTo,
}: {
  vFrom: THREE.Node<"vec3">,
  vTo: THREE.Node<"vec3">,
}) => {
  const r = add(dot(vFrom, vTo), 1).toVar();
  const newQuad = vec4(0).toVar();

  If(r.lessThan(EPSILON), () => {

    If(abs(vTo.x).greaterThan(abs(vFrom.z)), () => {
      newQuad.assign(vec4(negate(vFrom.y), vFrom.x, 0, 0));
    }).Else(() => {
      newQuad.assign(vec4(0, negate(vFrom.z), vFrom.y, 0));
    });
  }).Else(() => {
    newQuad.xyz.assign(cross(vFrom, vTo));
    newQuad.w.assign(r);
  });

  return normalize(newQuad);
});

export const rotateVectorByQuaternion = Fn(({
  vector,
  quat,
}: {
  vector: THREE.Node<"vec3">,
  quat: THREE.Node<"vec4">,
}) => {
  return add(vector, mul(2, cross(mul(add(cross(vector, quat.xyz), quat.w), vector), quat.xyz)));
});

// Functions for Rays

export const generateRayFromCamaraAndUV = Fn(({
  cameraMatrix,
  cameraPosition,
  uv,
  resolution,
  fov,
}: {
  cameraMatrix: THREE.Node<"mat4">,
  cameraPosition: THREE.Node<"vec3">,
  uv: THREE.Node<"vec2">,
  resolution: THREE.Node<"vec2">,
  fov: THREE.Node<"float">
}) => {
  const aspectRatio = div(resolution.x, resolution.y);
  const fovScale = tan(mul(radians(fov), 0.5))

  const screenCoordinate = mul(sub(uv, 0.5), 2).toVar();
  screenCoordinate.x.assign(mul(mul(screenCoordinate.x, aspectRatio), fovScale));
  screenCoordinate.y.assign(mul(screenCoordinate.y, fovScale));
  const rayDir = cameraMatrix.mul(vec3(screenCoordinate.x, screenCoordinate.y, -1));
  const rayDirection = sub(rayDir, cameraPosition);

  return normalize(rayDirection.xyz);
  /*const ndc = vec2(
    mul(mul(sub(div(mul(uv.x, 2), resolution.x), 1), aspectRatio), fovScale),
    mul(sub(1, div(mul(uv.y, 2), resolution.y)), fovScale),
  );

  const m0 = vec4(cameraMatrix.element(int(0)));
  const m1 = vec4(cameraMatrix.element(int(1)));
  const m2 = vec4(cameraMatrix.element(int(2)));

  const right = vec3(m0.x, m0.y, m0.z);
  const up = vec3(m1.x, m1.y, m1.z);
  const forward = vec3(m2.x, m2.y, m2.z);

  return normalize(add(add(forward, mul(right, ndc.x)), mul(up, ndc.y)));*/
})

export const boundingBoxIntersect = Fn(({
  bbMin,
  bbMax,
  rayOrigin,
  rayDirection,
}: {
  bbMin: THREE.Node<"vec3">,
  bbMax: THREE.Node<"vec3">,
  rayOrigin: THREE.Node<"vec3">,
  rayDirection: THREE.Node<"vec3">,
}) => {
  const near = mul(div(1, rayDirection), sub(bbMin, rayOrigin));
  const far = mul(div(1, rayDirection), sub(bbMax, rayOrigin));
  
  const tMin = min(near, far);
  const tMax = max(near, far);
  
  const tEnter = max(max(tMin.x, tMin.y), tMin.z);
  const tExit = min(min(tMax.x, tMax.y), tMax.z);
  
  const t = float(INFINITY).toVar();

  If(tExit.greaterThanEqual(tEnter), () => {
    t.assign(tEnter);
  });

  return t;
});

export const TriangleIntersectStruct = struct({
  u: "float",
  v: "float",
  t: "float",
});

export const triangleIntersect = Fn(({
  p1,
  p2,
  p3,
  rayOrigin,
  rayDirection,
}: {
  p1: THREE.Node<"vec3">,
  p2: THREE.Node<"vec3">,
  p3: THREE.Node<"vec3">,
  rayOrigin: THREE.Node<"vec3">,
  rayDirection: THREE.Node<"vec3">,
}) => {
  const edge1 = sub(p2, p1);
  const edge2 = sub(p3, p1);

  const rayCross = cross(rayDirection, edge2);
  const det = dot(edge1, rayCross);

  const u = float(0).toVar();
  const v = float(0).toVar();
  const t = float(INFINITY).toVar();

  If(abs(det).greaterThanEqual(EPSILON), () => {
    const inverseDet = div(1, det);
    const s = sub(rayOrigin, p1);
    u.assign(mul(inverseDet, dot(s, rayCross)));

    If(and(u.greaterThanEqual(0), u.lessThanEqual(1)), () => {
      const sCross = cross(s, edge1);
      v.assign(mul(inverseDet, dot(rayDirection, sCross)));

      If(and(v.greaterThanEqual(0), add(u, v).lessThanEqual(1)), () => {
        const returnValue = mul(inverseDet, dot(edge2, sCross));

        If(returnValue.greaterThan(EPSILON), () => {
          t.assign(returnValue);
        });
      });
    });
  });

  return TriangleIntersectStruct(u, v, t);
});

// Functions for Path Tracing 

export const bvhPathTrace = Fn(({
  tlasArray,
  tlasList,
  triangleArray,
  bvhArray,
  lightArray,
  rayOrigin,
  rayDirection,
  maxBounces,
}: {
  tlasArray: THREE.StorageBufferNode<"vec4">,
  tlasList: THREE.StorageBufferNode<"vec4">,
  triangleArray: THREE.StorageBufferNode<"vec4">,
  bvhArray: THREE.StorageBufferNode<"vec4">,
  lightArray: THREE.StorageBufferNode<"vec4">,
  rayOrigin: THREE.Node<"vec3">,
  rayDirection: THREE.Node<"vec3">,
  maxBounces: THREE.Node<"int">,
}) => {

  const currentRayOrigin = vec3(rayOrigin).toVar()
  const currentRayDirection = vec3(rayDirection).toVar()

  const triangleUVW = vec3(0).toVar();
  const hitData1 = vec4(0).toVar();
  const hitData2 = vec4(0).toVar();
  const hitData3 = vec4(0).toVar();
  const hitData4 = vec4(0).toVar();
  const hitData5 = vec4(0).toVar();
  const hitData6 = vec4(0).toVar();
  const t = float(INFINITY).toVar();
  const pixelColour = vec3(0).toVar();

  const bvhIntersectObject = BvhIntersectStruct()
  const throughput = vec3(1).toVar()
  const weights = vec4(0).toVar()
  const probabilities = vec4(0).toVar()
  const pdf = vec3(1).toVar()
  
  const smoothness = vec2(0).toVar()
  const tangent = vec3(0).toVar()
  const biTangent = vec3(0).toVar()

  const diffuse = vec3(0).toVar()
  const specular = vec3(0).toVar()
  const sheen = vec3(0).toVar()
  const clearcoat = vec3(0).toVar()
  const transmission = vec3(0).toVar()

  const emitted = vec3(0).toVar()
  const indirect = vec3(0).toVar()

  const extraFloat = float(0).toVar()
  const extraVec3 = vec3(0).toVar()

  const iorPointer = int(0).toVar();
  const iorStackArray = array('float', 32);
  iorStackArray.element(0).assign(1)
  const iorData = vec2(0).toVar()

  const uVec2 = uvec2(0).toVar()

  const randomData = vec2(0).toVar()

  const nextRayOrigin = vec3(0).toVar()
  const nextRayDirection = vec3(0).toVar()
  const normal = vec3(0).toVar()
  const halfwayVector = vec3(0).toVar()

  Loop({start: int(0), end: int(maxBounces), type: 'int', condition: '<'}, ({ i }) => {

    bvhIntersectObject.assign(bvhIntersect({
      tlasArray,
      triangleArray,
      bvhArray,
      rayOrigin: currentRayOrigin,
      rayDirection: currentRayDirection,
    }));
    triangleUVW.assign(bvhIntersectObject.get("triangleUVW"));
    hitData1.assign(bvhIntersectObject.get("hitData1"));
    hitData2.assign(bvhIntersectObject.get("hitData2"));
    hitData3.assign(bvhIntersectObject.get("hitData3"));
    hitData4.assign(bvhIntersectObject.get("hitData4"));
    hitData5.assign(bvhIntersectObject.get("hitData5"));
    hitData6.assign(bvhIntersectObject.get("hitData6"));
    t.assign(bvhIntersectObject.get("t"));

    If(t.equal(INFINITY), () => {
      Break()
    })

    normal.assign(vec3(hitData1.w, hitData2.xy))

    If(dot(normal, currentRayDirection).lessThan(0), () => {

      extraVec3.assign(fresnelApprox({
        metalness: hitData4.x,
        color: hitData3.xyz,
        rayDirection: negate(currentRayDirection),
        normal: normal,
      }))
      extraFloat.assign(clamp(dot(extraVec3, luminance), 0, 1))

      /*weights.y.assign(mul(add(hitData4.x, mul(sub(1, hitData4.x), hitData4.y)), extraFloat))
      weights.z.assign(mul(sub(1, hitData4.x), mul(hitData4.y, sub(1, extraFloat))))
      weights.x.assign(sub(sub(1, weights.y), weights.z))*/

      //weights.y.assign(extraFloat)
      //weights.x.assign(sub(1, extraFloat))

      weights.x.assign(1)

      If(hitData4.y.notEqual(0), () => {
        iorData.x.assign(iorStackArray.element(iorPointer))
        iorData.y.assign(hitData4.z)

        iorPointer.addAssign(1)
        iorStackArray.element(iorPointer).assign(iorData.y)
      }).Else(() => {
        iorData.x.assign(iorStackArray.element(iorPointer))
        iorData.y.assign(iorStackArray.element(iorPointer))
      })

    }).Else(() => {
      normal.assign(negate(normal))
      
      extraVec3.assign(fresnelApprox({
        metalness: hitData4.x,
        color: hitData3.xyz,
        rayDirection: negate(currentRayDirection),
        normal: normal,
      }))
      extraFloat.assign(clamp(dot(extraVec3, luminance), 0, 1))

      /*weights.y.assign(mul(add(hitData4.x, mul(sub(1, hitData4.x), hitData4.y)), extraFloat))
      weights.z.assign(mul(sub(1, hitData4.x), mul(hitData4.y, sub(1, extraFloat))))
      weights.x.assign(sub(sub(1, weights.y), weights.z))*/

      //weights.y.assign(extraFloat)
      //weights.x.assign(sub(1, extraFloat))
      weights.x.assign(1)

      If(hitData4.y.notEqual(0), () => {
        iorData.x.assign(iorStackArray.element(iorPointer))
        iorData.y.assign(select<"float">(iorPointer.equal(0), iorStackArray.element(iorPointer), iorStackArray.element(sub(iorPointer, 1))))

        uVec2.x.assign(iorPointer)
        
        Loop({start: int(0), end: int(uVec2.x), type: 'int', condition: '<'}, ({ i: j }) => {

          uVec2.y.assign(sub(iorPointer, j))

          If(checkFloatsEqual({
            a: iorStackArray.element(uVec2.y),
            b: hitData4.z,
          }), () => {

            Loop({start: int(uVec2.y), end: int(uVec2.x), type: 'int', condition: '<'}, ({ i: k }) => {
              iorStackArray.element(k).assign(iorStackArray.element(add(k, 1)))
            })

            iorPointer.subAssign(1)

            Break()
          })

        })
      }).Else(() => {
        iorData.x.assign(iorStackArray.element(iorPointer))
        iorData.y.assign(iorStackArray.element(iorPointer))
      })

    })

    randomData.x.assign(add(add(weights.x, weights.y), add(weights.z, weights.w)))

    probabilities.assign(vec4(
      div(weights.x, randomData.x),
      div(weights.y, randomData.x),
      div(weights.z, randomData.x),
      div(weights.w, randomData.x),
    ))

    randomData.x.assign(rng2())
    randomData.y.assign(rng2())

    nextRayOrigin.assign(hitData1.xyz)

    extraFloat.assign(sqrt(sub(1, mul(0.9, hitData5.y))))
    smoothness.assign(vec2(
      max(0.0001, div(mul(hitData3.w, hitData3.w), extraFloat)),
      max(0.0001, mul(mul(hitData3.w, hitData3.w), extraFloat)),
    ))

    extraVec3.assign(vec3(0, 1, 0))
    If(abs(dot(normal, extraVec3)).greaterThan(0.99), () => {
      extraVec3.assign(vec3(0, 0, 1))
    })

    tangent.assign(normalize(cross(normal, extraVec3)))
    biTangent.assign(normalize(cross(normal, tangent)))

    halfwayVector.assign(getHalfwayVectorWithGGX({
      smoothness: smoothness,
      tangent: tangent,
      biTangent: biTangent,
      normal: normal,
      rayDirection: negate(currentRayDirection),
      randomData: randomData,
    }))

    If(randomData.x.lessThan(probabilities.x), () => {
      
      nextRayDirection.assign(transformDirectionWithNormal({
        normal: normal,
        rayDirection: uniformHemisphereSampling({
          r1: randomData.x,
          r2: randomData.y,
        }),
      }))

    }).ElseIf(randomData.x.lessThan(add(probabilities.x, probabilities.y)), () => {

      nextRayDirection.assign(reflect({
        rayDirection: currentRayDirection,
        normal: normal,
      }))

    }).ElseIf(randomData.x.lessThan(add(probabilities.x, add(probabilities.y, probabilities.z))), () => {

      nextRayDirection.assign(refract({
        rayDirection: currentRayDirection,
        normal: halfwayVector,
        iorA: iorData.x,
        iorB: iorData.y,
      }))

    }).Else(() => {

    })

    /*diffuse.assign(mul(div(hitData3.xyz, PI), mul(mul(
      fresnelDiffuse({
        roughness: hitData3.w,
        normal: normal,
        rayDirection: negate(newRayDirection),
        lightDirection: nextRayDirection,
        halfwayVector: halfwayVector
      }), 
      fresnelDiffuse({
        roughness: hitData3.w,
        normal: normal,
        rayDirection: nextRayDirection,
        lightDirection: nextRayDirection,
        halfwayVector: halfwayVector
      })
    ), abs(dot(normal, nextRayDirection)))))

    extraVec3.assign(mul(div(mul(1.25, hitData3.xyz), PI), mul(add(mul(mul(
      fresnelSubsurface({
        roughness: hitData3.w,
        normal: normal,
        rayDirection: negate(newRayDirection),
        lightDirection: nextRayDirection,
        halfwayVector: halfwayVector
      }), 
      fresnelSubsurface({
        roughness: hitData3.w,
        normal: normal,
        rayDirection: nextRayDirection,
        lightDirection: nextRayDirection,
        halfwayVector: halfwayVector
      })
    ), sub(div(1, add(abs(dot(normal, negate(newRayDirection))), abs(dot(normal, nextRayDirection)))), 0.5)), 0.5), abs(dot(normal, nextRayDirection)))))

    diffuse.assign(add(mul(sub(1, hitData5.x), diffuse), mul(hitData5.x, extraVec3)))

    metal.assign(div(mul(
      fresnelMetal({
        color: hitData3.xyz,
        metallic: hitData4.x,
        tint: hitData6.x,
        specularReflectance: getSpecularReflectance({
          iorA: iorData.x,
          iorB: iorData.y,
        }),
        lightDirection: nextRayDirection,
        halfwayVector: halfwayVector,
      }), mul(
        distributionMetal({
          smoothness: smoothness,
          tangent: tangent,
          biTangent: biTangent,
          normal: normal,
          halfwayVector: halfwayVector,
        }),
        smithMetal({
          smoothness: smoothness,
          tangent: tangent,
          biTangent: biTangent,
          normal: normal,
          rayDirection: negate(newRayDirection),
          lightDirection: nextRayDirection,
        })
      )), mul(4, abs(dot(normal, negate(newRayDirection))))
    ))

    If(mul(dot(normal, negate(newRayDirection)), dot(normal, nextRayDirection)).greaterThan(0), () => {
      transmission.assign(div(mul(mul(hitData3.xyz,
        fresnelTransmission({
          iorA: iorData.x,
          iorB: iorData.y,
          rayHalfwayDot: dot(negate(rayDirection), halfwayVector),
          lightHalfwayDot: dot(nextRayDirection, halfwayVector),
        })), mul(
          distributionMetal({
            smoothness: smoothness,
            tangent: tangent,
            biTangent: biTangent,
            normal: normal,
            halfwayVector: halfwayVector,
          }),
          smithMetal({
            smoothness: smoothness,
            tangent: tangent,
            biTangent: biTangent,
            normal: normal,
            rayDirection: negate(newRayDirection),
            lightDirection: nextRayDirection,
          })
        )), mul(4, abs(dot(normal, negate(newRayDirection))))
      ))
    }).Else(() => {
      transmission.assign(div(mul(mul(sqrt(hitData3.xyz), sub(1, 
        fresnelTransmission({
          iorA: iorData.x,
          iorB: iorData.y,
          rayHalfwayDot: dot(negate(rayDirection), halfwayVector),
          lightHalfwayDot: dot(nextRayDirection, halfwayVector),
        }))), mul(mul(
          distributionMetal({
            smoothness: smoothness,
            tangent: tangent,
            biTangent: biTangent,
            normal: normal,
            halfwayVector: halfwayVector,
          }),
          smithMetal({
            smoothness: smoothness,
            tangent: tangent,
            biTangent: biTangent,
            normal: normal,
            rayDirection: negate(newRayDirection),
            lightDirection: nextRayDirection,
          })
        ), abs(mul(dot(nextRayDirection, halfwayVector), dot(negate(rayDirection), halfwayVector))))), mul(abs(dot(negate(rayDirection), halfwayVector)), pow(add(dot(negate(rayDirection), halfwayVector), mul(div(iorData.x, iorData.y), dot(nextRayDirection, halfwayVector))), 2))
      ))
    })

    sheen.assign(fSheen({
      color: hitData3.xyz,
      tint: hitData6.x,
      normal: normal,
      lightDirection: nextRayDirection,
      halfwayVector: halfwayVector,
    }))*/
   
    /*extraVec3.assign(fresnelApprox({
      metalness: hitData4.x,
      color: hitData3.xyz,
      rayDirection: negate(currentRayDirection),
      normal: normal,
    }))*/
    extraVec3.assign(vec3(0))

    diffuse.assign(mul(sub(1, extraVec3), div(hitData3.xyz, PI)))
    /*specular.assign(div(mul(extraVec3, mul(
      distributionGGX({
        smoothness: smoothness,
        tangent: tangent,
        biTangent: biTangent,
        normal: normal,
        halfwayVector: normalize(add(negate(currentRayDirection), nextRayDirection)),
      }),
      smithGGX({
        smoothness: smoothness,
        tangent: tangent,
        biTangent: biTangent,
        normal: normal,
        rayDirection: negate(currentRayDirection),
        lightDirection: nextRayDirection,
      })
    )), mul(4, mul(abs(dot(negate(currentRayDirection), normal)), abs(dot(nextRayDirection, normal))))))*/

    emitted.assign(mul(hitData4.w, hitData3.xyz))

    //extraFloat.assign(acos(dot(negate(currentRayDirection), normal)))
    //pdf.assign(mul(1, div(mul(dot(negate(currentRayDirection), normal), 1), PI)))

    /*pdf.assign(add(pdf, mul(extraVec3, div(mul(1, distributionGGX({
      smoothness: smoothness,
      tangent: tangent,
      biTangent: biTangent,
      normal: normal,
      halfwayVector: normalize(add(negate(currentRayDirection), nextRayDirection)),
    })), mul(4, abs(dot(nextRayDirection, normal)))))))*/

    extraFloat.assign(max(EPSILON, abs(dot(nextRayDirection, normal))))
    indirect.assign(mul(diffuse, extraFloat))
    indirect.assign(div(indirect, div(extraFloat, PI)))

    //indirect.assign(div(add(diffuse, 0), pdf))
    /*indirect.assign(div(add(add(add(add(
      mul(mul(sub(1, hitData4.y), sub(1, hitData4.x)), diffuse), 
      0),//mul(sub(1, hitData4.x), mul(hitData5.z, sheen))),
      0),//mul(sub(1, mul(hitData4.y, sub(1, hitData4.x))), metal)),
      0),//mul(sub(1, hitData4.x), mul(hitData4.y, transmission))),
      0), 
      1//pdf
    ))*/

    pixelColour.addAssign(mul(throughput, emitted));
    throughput.assign(mul(throughput, indirect))

    currentRayOrigin.assign(nextRayOrigin)
    currentRayDirection.assign(nextRayDirection)

  });

  return vec3(pixelColour);
});

// Space //

export const reflect = Fn(({
  rayDirection,
  normal,
}: {
  rayDirection: THREE.Node<"vec3">,
  normal: THREE.Node<"vec3">,
}) => {
  return sub(rayDirection, mul(2, mul(dot(rayDirection, normal), normal))); 
}) 

export const refract = Fn(({
  rayDirection,
  normal,
  iorA,
  iorB,
}: {
  rayDirection: THREE.Node<"vec3">,
  normal: THREE.Node<"vec3">,
  iorA: THREE.Node<"float">,
  iorB: THREE.Node<"float">,
}) => {

  const cosRay = dot(rayDirection, normal).toVar()

  const eta = div(iorA, iorB).toVar()
  const k = sub(1, mul(mul(eta, eta), sub(1, mul(cosRay, cosRay)))).toVar()

  const refractedRay = vec3(0).toVar()

  /*If(k.lessThan(0), () => {
    refractedRay.assign(reflect({
      normal: normal,
      rayDirection: rayDirection,
    }))
  }).Else(() => {
    refractedRay.assign(sub(mul(eta, rayDirection), mul(add(mul(eta, cosRay), sqrt(k)), normal)))
  })*/
  refractedRay.assign(sub(mul(eta, rayDirection), mul(add(mul(eta, cosRay), sqrt(k)), normal)))
  return refractedRay
}) 

export const fresnel = Fn(({
  rayDirection,
  normal,
  pior,
  nior,
}: {
  rayDirection: THREE.Node<"vec3">,
  normal: THREE.Node<"vec3">,
  pior: THREE.Node<"float">,
  nior: THREE.Node<"float">,
}) => {
  const cosRay = clamp(dot(rayDirection, normal), -1, 1).toVar()

  const pIor = float(pior).toVar()
  const nIor = float(nior).toVar()
  const tempIor = float(0).toVar()

  If(cosRay.greaterThan(0), () => {
    tempIor.assign(pIor)
    pIor.assign(nIor)
    nIor.assign(tempIor)
  })

  const sinT = mul(div(pIor, nIor), sqrt(max(0, sub(1, mul(cosRay, cosRay))))).toVar()

  const k = float(0).toVar()

  If(sinT.greaterThanEqual(1), () => {
    k.assign(1)
  }).Else(() => {
    const cosT = sqrt(max(0, sub(1, mul(sinT, sinT))));
    cosRay.assign(abs(cosRay));
    const Rs = div(sub(mul(nIor, cosRay), mul(pIor, cosT)), add(mul(nIor, cosRay), mul(pIor, cosT)));
    const Rp = div(sub(mul(pIor, cosRay), mul(nIor, cosT)), add(mul(pIor, cosRay), mul(nIor, cosT)));
    k.assign(div(add(mul(Rs, Rs), mul(Rp, Rp)), 2));
  })

  return k
})

export const fresnelDiffuse = Fn(({
  roughness,
  normal,
  rayDirection,
  lightDirection,
  halfwayVector,
}: {
  roughness: THREE.Node<"float">,
  normal: THREE.Node<"vec3">,
  rayDirection: THREE.Node<"vec3">,
  lightDirection: THREE.Node<"vec3">,
  halfwayVector: THREE.Node<"vec3">,
}) => {
  const fresnel90 = add(0.5, mul(mul(2, roughness), pow(dot(halfwayVector, lightDirection), 2))).toVar()

  return add(1, mul(sub(fresnel90, 1), pow(sub(1, abs(dot(normal, rayDirection))), 5)))
})

export const fresnelSubsurface = Fn(({
  roughness,
  normal,
  rayDirection,
  lightDirection,
  halfwayVector,
}: {
  roughness: THREE.Node<"float">,
  normal: THREE.Node<"vec3">,
  rayDirection: THREE.Node<"vec3">,
  lightDirection: THREE.Node<"vec3">,
  halfwayVector: THREE.Node<"vec3">,
}) => {
  const fresnel90 = mul(roughness, pow(dot(halfwayVector, lightDirection), 2)).toVar()

  return add(1, mul(sub(fresnel90, 1), pow(sub(1, abs(dot(normal, rayDirection))), 5)))
})

export const fresnelMetal = Fn(({
  color,
  metallic,
  tint,
  specularReflectance,
  lightDirection,
  halfwayVector,
}: {
  color: THREE.Node<"vec3">,
  metallic: THREE.Node<"float">,
  tint: THREE.Node<"float">,
  specularReflectance: THREE.Node<"float">,
  lightDirection: THREE.Node<"vec3">,
  halfwayVector: THREE.Node<"vec3">,
}) => {

  const c0 = add(mul(div(specularReflectance, 0.08), mul(specularReflectance, mul(sub(1, metallic), add(sub(1, tint), mul(tint, div(color, getLuminance({ color: color }))))))), mul(metallic, color)).toVar()

  return add(c0, mul(sub(1, c0), pow(sub(1, dot(halfwayVector, lightDirection)), 5)))
})

export const fresnelTransmission = Fn(({
  iorA,
  iorB,
  rayHalfwayDot,
  lightHalfwayDot,
}: {
  iorA: THREE.Node<"float">,
  iorB: THREE.Node<"float">,
  rayHalfwayDot: THREE.Node<"float">,
  lightHalfwayDot: THREE.Node<"float">,
}) => {

  const n = div(iorA, iorB).toVar()
  const rs = div(sub(rayHalfwayDot, mul(n, lightHalfwayDot)), add(rayHalfwayDot, mul(n, lightHalfwayDot))).toVar()
  const rp = div(sub(mul(n, rayHalfwayDot), lightHalfwayDot), add(mul(n, rayHalfwayDot), lightHalfwayDot)).toVar()
  
  return mul(0.5, add(pow(rs, 2), pow(rp, 2)))
})

export const fSheen = Fn(({
  color,
  tint,
  normal,
  lightDirection,
  halfwayVector,
}: {
  color: THREE.Node<"vec3">,
  tint: THREE.Node<"float">,
  normal: THREE.Node<"vec3">,
  lightDirection: THREE.Node<"vec3">,
  halfwayVector: THREE.Node<"vec3">,
}) => {

  return mul(add(sub(1, tint), mul(tint, div(color, getLuminance({ color: color })))), mul(pow(sub(1, abs(dot(halfwayVector, lightDirection))), 5), abs(dot(normal, lightDirection))))
})

export const fresnelApprox = Fn(({
  metalness,
  color,
  rayDirection,
  normal,
}: {
  metalness: THREE.Node<"float">,
  color: THREE.Node<"vec3">,
  rayDirection: THREE.Node<"vec3">,
  normal: THREE.Node<"vec3">,
}) => {

  const reflectivity = mix(vec3(0.04), color, metalness)

  return add(reflectivity, mul(sub(1, reflectivity), pow(sub(1, dot(rayDirection, normal)), 5)))
})

export const distributionGGX = Fn(({
  smoothness,
  tangent,
  biTangent,
  normal,
  halfwayVector,
}: {
  smoothness: THREE.Node<"vec2">,
  tangent: THREE.Node<"vec3">,
  biTangent: THREE.Node<"vec3">,
  normal: THREE.Node<"vec3">,
  halfwayVector: THREE.Node<"vec3">,
}) => {

  const halfwayVectorLocal = vec3(abs(dot(halfwayVector, tangent)), abs(dot(halfwayVector, biTangent)), abs(dot(halfwayVector, normal))).toVar()

  return div(1, mul(mul(PI, mul(smoothness.x, smoothness.y)), pow(add(add(div(pow(halfwayVectorLocal.x, 2), pow(smoothness.x, 2)), div(pow(halfwayVectorLocal.y, 2), pow(smoothness.y, 2))), pow(halfwayVectorLocal.z, 2)), 2)))
})

export const distributionGTR = Fn(({
  alpha2,
  cosValue,
}: {
  alpha2: THREE.Node<"float">,
  cosValue: THREE.Node<"float">,
}) => {

  return div(sub(alpha2, 1), mul(mul(PI, log(alpha2)), add(1, mul(sub(alpha2, 1), pow(cosValue, 2)))))
})

export const distributionTrowbridge = Fn(({
  roughness,
  normal,
  rayDirection,
  lightDirection,
  r1,
}: {
  roughness: THREE.Node<"float">,
  normal: THREE.Node<"vec3">,
  rayDirection: THREE.Node<"vec3">,
  lightDirection: THREE.Node<"vec3">,
  r1: THREE.Node<"float">,
}) => {
  const alphaSquared = pow(mul(roughness, roughness), 2).toVar()
  const halfwayVector = normalize(add(lightDirection, negate(rayDirection))).toVar()
  const theta = atan(mul(mul(roughness, roughness), sqrt(div(r1, sub(1, r1))))).toVar()
  //return div(alphaSquared, mul(PI, pow(add(mul(pow(dot(normal, halfwayVector), 2), sub(alphaSquared, 1)), 1), 2)))
  return max(0, sub(div(alphaSquared, add(mul(pow(cos(theta), 2), pow(sub(alphaSquared, 1), 2)), sub(alphaSquared, 1))), div(1, sub(alphaSquared, 1))))
})

export const schlickGGX = Fn(({
  smoothness,
  tangent,
  biTangent,
  normal,
  rayDirection,
}: {
  smoothness: THREE.Node<"vec2">,
  tangent: THREE.Node<"vec3">,
  biTangent: THREE.Node<"vec3">,
  normal: THREE.Node<"vec3">,
  rayDirection: THREE.Node<"vec3">,
}) => {

  const halfwayVectorLocal = vec3(abs(dot(rayDirection, tangent)), abs(dot(rayDirection, biTangent)), abs(dot(rayDirection, normal))).toVar()
  
  return div(1, add(1, div(sub(sqrt(add(1, div(add(pow(mul(halfwayVectorLocal.x, smoothness.x), 2), pow(mul(halfwayVectorLocal.y, smoothness.y), 2)), pow(halfwayVectorLocal.z, 2)))), 1), 2)))
})

export const smithGGX = Fn(({
  smoothness,
  tangent,
  biTangent,
  normal,
  rayDirection,
  lightDirection,
}: {
  smoothness: THREE.Node<"vec2">,
  tangent: THREE.Node<"vec3">,
  biTangent: THREE.Node<"vec3">,
  normal: THREE.Node<"vec3">,
  rayDirection: THREE.Node<"vec3">,
  lightDirection: THREE.Node<"vec3">,
}) => {

  return mul(
    schlickGGX({
      smoothness,
      tangent,
      biTangent,
      normal,
      rayDirection: rayDirection,
    }), 
    schlickGGX({
      smoothness,
      tangent,
      biTangent,
      normal,
      rayDirection: lightDirection,
    })
  )
})

export const ggxSchlick = Fn(({
  roughness,
  normal,
  rayDirection,
}: {
  roughness: THREE.Node<"float">,
  normal: THREE.Node<"vec3">,
  rayDirection: THREE.Node<"vec3">,
}) => {
  const dotNR = max(dot(normal, rayDirection), 0).toVar()
  const k = div(pow(add(mul(roughness, roughness), 1), 2), 8).toVar()

  return div(dotNR, add(mul(dotNR, sub(1, k)), k))
})

export const ggxSmith = Fn(({
  roughness,
  normal,
  rayDirection,
  lightDirection,
}: {
  roughness: THREE.Node<"float">,
  normal: THREE.Node<"vec3">,
  rayDirection: THREE.Node<"vec3">,
  lightDirection: THREE.Node<"vec3">,
}) => {

  return mul(
    ggxSchlick({
      roughness,
      normal,
      rayDirection: negate(rayDirection),
    }), 
    ggxSchlick({
      roughness,
      normal,
      rayDirection: lightDirection,
    })
  )
})

export const getHalfwayVectorWithGGX = Fn(({
  smoothness,
  tangent,
  biTangent,
  normal,
  rayDirection,
  randomData,
}: {
  smoothness: THREE.Node<"vec2">,
  tangent: THREE.Node<"vec3">,
  biTangent: THREE.Node<"vec3">,
  normal: THREE.Node<"vec3">,
  rayDirection: THREE.Node<"vec3">,
  randomData: THREE.Node<"vec2">,
}) => {

  const rayDirectionLocal = vec3(abs(dot(rayDirection, tangent)), abs(dot(rayDirection, biTangent)), abs(dot(rayDirection, normal))).toVar()

  const vh = normalize(vec3(mul(rayDirectionLocal.x, smoothness.x), mul(rayDirectionLocal.y, smoothness.y), rayDirectionLocal.z)).toVar()

  const lensq = add(mul(vh.x, vh.x), mul(vh.y, vh.y)).toVar()
  const T1 = select<"vec3">(lensq.greaterThan(0), mul(vec3(negate(vh.y), vh.x, 0), inverseSqrt(lensq)), vec3(1, 0, 0)).toVar()
  const T2 = cross(vh, T1).toVar()

  const r = sqrt(randomData.x).toVar()
  const phi = mul(2, mul(PI, randomData.y)).toVar()
  const t1 = mul(r, cos(phi)).toVar()
  const t2 = mul(r, sin(phi)).toVar()
  const s = mul(0.5, add(1, vh.z)).toVar()
  t2.assign(add(mul(sub(1, s), sqrt(sub(1, mul(t1, t1)))), mul(s, t2)))

  const nh = add(add(mul(t1, T1), mul(t2, T2)), mul(sqrt(max(0, sub(sub(1, mul(t1, t1)), mul(t2, t2)))), vh)).toVar()
  const ne = normalize(vec3(mul(smoothness.x, nh.x), mul(smoothness.y, nh.y), max(0, nh.z))).toVar()

  const h = normalize(vec3(
    add(mul(ne.x, tangent.x), add(mul(ne.y, biTangent.x), mul(ne.z, normal.x))),
    add(mul(ne.x, tangent.y), add(mul(ne.y, biTangent.y), mul(ne.z, normal.y))),
    add(mul(ne.x, tangent.z), add(mul(ne.y, biTangent.z), mul(ne.z, normal.z))),
  )).toVar()

  return h
})

export const getSpecularReflectance = Fn(({
  iorA,
  iorB,
}: {
  iorA: THREE.Node<"float">,
  iorB: THREE.Node<"float">,
}) => {

  const r = div(sub(iorA, iorB), add(iorA, iorB)).toVar()
  return mul(r, r);
});

export const getLuminance = Fn(({
  color,
}: {
  color: THREE.Node<"vec3">,
}) => {

  return dot(color, vec3(0.2126, 0.7152, 0.0722));
});

const checkFloatsEqual = Fn(({
  a,
  b,
}: {
  a: THREE.Node<"float">,
  b: THREE.Node<"float">,
}) => {

  return abs(sub(b, a)).lessThan(EPSILON);
});
