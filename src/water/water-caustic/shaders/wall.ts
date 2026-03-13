import { helperConstants, helperFunctions } from "./helper-functions";

export const wallVertexShader = `
  ${helperConstants}

  uniform mat4 projectionMatrix;
  uniform mat4 modelViewMatrix;

  attribute vec3 position;
  varying vec3 vPosition;
  
  void main() {
    vPosition = position;
    vPosition.y = (vPosition.y - (wallHeight / 2.0) + 0.1) * wallHeight;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
  }
`;

export const wallFragmentShader = `
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
    vec3 position = vPosition;
    //position.y = position.y - (wallHeight / 2.0) + 0.1) * wallHeight;

    gl_FragColor = vec4(getWallColor(position, light, sphereCenter, sphereRadius, IOR_AIR, IOR_WATER, waterTex, causticTex, wallTex, wallHeight), 1.0);

    vec4 info = texture2D(waterTex, vPosition.xz * 0.5 + 0.5);
    if (vPosition.y < info.r) {
      gl_FragColor.rgb *= waterUnderColor * 1.2;
    }
  }
`;