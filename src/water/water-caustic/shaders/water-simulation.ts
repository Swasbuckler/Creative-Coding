export const waterSimulationVertexShader = `
  attribute vec3 position;
  varying vec2 vCoord;

  void main() {
    vCoord = (position.xy * 0.5) + 0.5;

    gl_Position = vec4(position, 1.0);
  }
`;

export const dropFragmentShader = `
  precision highp float;

  const float PI = 3.141592653589793;

  uniform sampler2D waterTex;
  uniform vec2 center;
  uniform float radius;
  uniform float strength;
  varying vec2 vCoord;

  void main() {
    vec4 textureInfo = texture2D(waterTex, vCoord);

    float drop = max(0.0, 1.0 - (length((center * 0.5) + 0.5 - vCoord) / radius));
    drop = 0.5 - (cos(drop * PI) * 0.5);
    textureInfo.r += drop * strength;

    gl_FragColor = textureInfo;
  }
`;

export const updateFragmentShader = `
  precision highp float;

  uniform sampler2D waterTex;
  uniform vec2 delta;
  varying vec2 vCoord;

  void main() {
    vec4 textureInfo = texture2D(waterTex, vCoord);

    vec2 dx = vec2(delta.x, 0.0);
    vec2 dy = vec2(0.0, delta.y);
    float average = (
      texture2D(waterTex, vCoord - dx).r +
      texture2D(waterTex, vCoord - dy).r +
      texture2D(waterTex, vCoord + dx).r +
      texture2D(waterTex, vCoord + dy).r
    ) * 0.25;

    textureInfo.g += (average - textureInfo.r) * 2.0;

    textureInfo.g *= 0.995;

    textureInfo.r += textureInfo.g;

    gl_FragColor = textureInfo;
  }
`;

export const normalFragmentShader = `
  precision highp float;

  uniform sampler2D waterTex;
  uniform vec2 delta;
  varying vec2 vCoord;

  void main() {
    vec4 textureInfo = texture2D(waterTex, vCoord);
      
    vec3 dx = vec3(delta.x, texture2D(waterTex, vec2(vCoord.x + delta.x, vCoord.y)).r - textureInfo.r, 0.0);
    vec3 dy = vec3(0.0, texture2D(waterTex, vec2(vCoord.x, vCoord.y + delta.y)).r - textureInfo.r, delta.y);
    textureInfo.ba = normalize(cross(dy, dx)).xz;
    
    gl_FragColor = textureInfo;
  }
`;

export const moveSphereFragmentShader = `
  precision highp float;

  uniform sampler2D waterTex;
  uniform vec3 oldCenter;
  uniform vec3 newCenter;
  uniform float radius;
  varying vec2 vCoord;
  
  float volumeInSphere(vec3 center) {
    vec3 toCenter = vec3(vCoord.x * 2.0 - 1.0, 0.0, vCoord.y * 2.0 - 1.0) - center;
    float t = length(toCenter) / radius;
    float dy = exp(-pow(t * 1.5, 6.0));
    float ymin = min(0.0, center.y - dy);
    float ymax = min(max(0.0, center.y + dy), ymin + 2.0 * dy);
    return (ymax - ymin) * 0.1;
  }
  
  void main() {
    vec4 info = texture2D(waterTex, vCoord);
    
    info.r += volumeInSphere(oldCenter);
    
    info.r -= volumeInSphere(newCenter);
    
    gl_FragColor = info;
  }
`;