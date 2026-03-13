import { helperConstants, helperFunctions } from "./helper-functions";

export const sphereVertexShader = `
  uniform mat4 projectionMatrix;
  uniform mat4 modelViewMatrix;
  uniform float sphereRadius;
  uniform vec3 sphereCenter;

  attribute vec3 position;
  varying vec3 vPosition;
  
  void main() {
    vPosition = position;
    //vPosition = sphereCenter + vPosition.xyz * sphereRadius;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
  }
`;

export const sphereFragmentShader = `
  precision highp float;

  ${helperConstants}

  uniform vec3 light;
  uniform sampler2D waterTex;
  uniform sampler2D causticTex;
  uniform sampler2D wallTex;
  uniform float sphereRadius;
  uniform vec3 sphereCenter;

  varying vec3 vPosition;
  
  ${helperFunctions}

  void main() {
    vec3 position = sphereCenter + vPosition.xyz;

    gl_FragColor = vec4(getSphereColor(position, light, sphereCenter, sphereRadius, IOR_AIR, IOR_WATER, waterTex, causticTex), 1.0);

    vec4 info = texture2D(waterTex, position.xz * 0.5 + 0.5);
    if (position.y < info.r) {
      gl_FragColor.rgb *= waterUnderColor * 1.2;
    }
  }
`;