import { helperFunctions, helperConstants } from "./helper-functions";

export const waterVertexShader = `
  uniform mat4 projectionMatrix;
  uniform mat4 modelViewMatrix;
  uniform sampler2D waterTex;

  attribute vec3 position;
  varying vec3 vPosition;

  void main() {
    vec4 textureInfo = texture2D(waterTex, (position.xy * 0.5) + 0.5);
    vPosition = position.xzy;
    vPosition.y += textureInfo.r;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
  }
`;

function createWaterFragmentShader(addedShader: string) {
  return `
    precision highp float;

    ${helperConstants}

    uniform vec3 cameraPosition;
    uniform vec3 light;
    uniform sampler2D waterTex;
    uniform sampler2D causticTex;
    uniform sampler2D wallTex;
    uniform samplerCube sky;
    uniform float sphereRadius;
    uniform vec3 sphereCenter;
    varying vec3 vPosition;

    ${helperFunctions}

    vec3 getSurfaceRayColor(vec3 origin, vec3 ray, vec3 waterColor) {
      vec3 color;
      float q = intersectSphere(origin, ray, sphereCenter, sphereRadius);
      if (q < 1.0e6) {
        color = getSphereColor(origin + ray * q, light, sphereCenter, sphereRadius, IOR_AIR, IOR_WATER, waterTex, causticTex); 
      } else if (ray.y < 0.0) {
        vec2 t = intersectCube(origin, ray, vec3(-1.0, -wallHeight, -1.0), vec3(1.0, 2.0, 1.0));
        color = getWallColor(origin + ray * t.y, light, sphereCenter, sphereRadius, IOR_AIR, IOR_WATER, waterTex, causticTex, wallTex, wallHeight);
      } else {
        vec2 t = intersectCube(origin, ray, vec3(-1.0, -wallHeight, -1.0), vec3(1.0, 2.0, 1.0));
        vec3 hit = origin + ray * t.y;
        if (hit.y < 2.0 / 12.0) {
          color = getWallColor(hit, light, sphereCenter, sphereRadius, IOR_AIR, IOR_WATER, waterTex, causticTex, wallTex, wallHeight);
        } else {
          color = textureCube(sky, ray).rgb;
        }
      }
      if (ray.y < 0.0) color *= waterColor;

      return color;
    }

    void main() {
      vec2 coord = (vPosition.xz * 0.5) + 0.5;
      vec4 textureInfo = texture2D(waterTex, coord);

      for (int i = 0; i < 5; i++) {
        coord += textureInfo.ba * 0.005;
        textureInfo = texture2D(waterTex, coord);
      }

      vec3 normal = vec3(textureInfo.b, sqrt(1.0 - dot(textureInfo.ba, textureInfo.ba)), textureInfo.a);
      vec3 incomingRay = normalize(vPosition - cameraPosition);

      ${addedShader}
    }
  `;
}

export const waterAboveFragmentShader = createWaterFragmentShader(`
  vec3 reflectedRay = reflect(incomingRay, normal);
  vec3 refractedRay = refract(incomingRay, normal, IOR_AIR / IOR_WATER);
  float fresnel = mix(0.25, 1.0, pow(1.0 - dot(normal, -incomingRay), 3.0));
          
  vec3 reflectedColor = getSurfaceRayColor(vPosition, reflectedRay, waterAboveColor);
  vec3 refractedColor = getSurfaceRayColor(vPosition, refractedRay, waterAboveColor);
  
  gl_FragColor = vec4(mix(refractedColor, reflectedColor, fresnel), 1.0);
`);

export const waterUnderFragmentShader = createWaterFragmentShader(`
  normal = -normal;
  vec3 reflectedRay = reflect(incomingRay, normal);
  vec3 refractedRay = refract(incomingRay, normal, IOR_WATER / IOR_AIR);
  float fresnel = mix(0.5, 1.0, pow(1.0 - dot(normal, -incomingRay), 3.0));

  vec3 reflectedColor = getSurfaceRayColor(vPosition, reflectedRay, waterUnderColor);
  vec3 refractedColor = getSurfaceRayColor(vPosition, refractedRay, vec3(1.0)) * vec3(0.8, 1.0, 1.1);
  
  gl_FragColor = vec4(mix(reflectedColor, refractedColor, (1.0 - fresnel) * length(refractedRay)), 1.0);
`);