import { helperConstants, helperFunctionsV3 } from "./helper-functions";

export const causticsVertexShader = `
  ${helperConstants}

  uniform mat4 projectionMatrix;
  uniform mat4 modelViewMatrix;
  uniform vec3 light;
  uniform sampler2D waterTex;

  in vec3 position;
  out vec3 vOldPos;
  out vec3 vNewPos;
  out vec3 vRay;
  out vec3 vPosition;

  ${helperFunctionsV3}
  
  vec3 project(vec3 origin, vec3 ray, vec3 refractedLight) {
    vec2 tcube = intersectCube(origin, ray, vec3(-1.0, -wallHeight, -1.0), vec3(1.0, 2.0, 1.0));
    origin += ray * tcube.y;
    float tplane = (-origin.y - 1.0) / refractedLight.y;
    return origin + (refractedLight * tplane);
  }
  
  void main() {
    vPosition = position;
    vec4 info = texture(waterTex, vPosition.xy * 0.5 + 0.5);
    info.ba *= 0.5;
    vec3 normal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);

    vec3 refractedLight = refract(-light, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
    vRay = refract(-light, normal, IOR_AIR / IOR_WATER);
    vOldPos = project(vPosition.xzy, refractedLight, refractedLight);
    vNewPos = project(vPosition.xzy + vec3(0.0, info.r, 0.0), vRay, refractedLight);
    
    gl_Position = vec4((vNewPos.xz + refractedLight.xz / refractedLight.y), 0.0, 1.0);
  }
`;

export const causticsFragmentShader = `
  precision highp float;

  ${helperConstants}

  uniform vec3 light;
  uniform vec3 sphereCenter;
  uniform float sphereRadius;
  uniform sampler2D waterTex;
  uniform vec2 resolution;
  uniform sampler2D oldCausticTex;

  in vec3 vOldPos;
  in vec3 vNewPos;
  in vec3 vRay;
  in vec3 vPosition;
  out vec4 FragColor;

  ${helperFunctionsV3}

  vec3 project(vec3 origin, vec3 ray, vec3 refractedLight) {
    vec2 tcube = intersectCube(origin, ray, vec3(-1.0, -wallHeight, -1.0), vec3(1.0, 2.0, 1.0));
    origin += ray * tcube.y;
    float tplane = (-origin.y - 1.0) / refractedLight.y;
    return origin + (refractedLight * tplane);
  }
  
  void main() {
    vec4 info = texture(waterTex, vPosition.xy * 0.5 + 0.5);
    info.ba *= 0.5;
    vec3 normal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);

    float oldArea = length(vec3(dFdx(vOldPos))) * length(vec3(dFdy(vOldPos)));
    float newArea = length(vec3(dFdx(vNewPos))) * length(vec3(dFdy(vNewPos)));
    FragColor = vec4(oldArea / newArea * 0.2, 1.0, 0.0, 0.0);

    vec3 refractedLight = refract(-light, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
    
    vec3 dir = (sphereCenter - vNewPos) / sphereRadius;
    vec3 area = cross(dir, refractedLight);
    float shadow = dot(area, area);
    float dist = dot(dir, -refractedLight);
    shadow = 1.0 + (shadow - 1.0) / (0.05 + (dist * 0.025));
    shadow = clamp(1.0 / (1.0 + exp(-shadow)), 0.0, 1.0);
    shadow = mix(1.0, shadow, clamp(dist * 2.0, 0.0, 1.0));
    FragColor.g = shadow;
    
    vec2 t = intersectCube(vNewPos, -refractedLight, vec3(-1.0, -wallHeight, -1.0), vec3(1.0, 2.0, 1.0));
    FragColor.r *= 1.0 / (1.0 + exp(-200.0 / (1.0 + 10.0 * (t.y - t.x)) * (vNewPos.y - refractedLight.y * t.y - 2.0 / 12.0)));
  }
`;