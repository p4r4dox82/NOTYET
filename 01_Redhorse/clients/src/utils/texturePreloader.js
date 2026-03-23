import * as THREE from "three";

const textureCache = {};
const loader = new THREE.TextureLoader();

function loadTexture(path, options = {}) {
  if (!textureCache[path]) {
    console.log(`📦 Preloading texture: ${path}`);
    textureCache[path] = new Promise((resolve) => {
      loader.load(
        path,
        (tex) => {
          if (options.configure) {
            options.configure(tex);
          } else {
            tex.generateMipmaps = true;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
          }
          console.log(`✅ Texture loaded: ${path}`);
          resolve(tex);
        },
        undefined,
        (error) => {
          console.error(`❌ Texture failed: ${path}`, error);
          if (options.onError) options.onError(error);
          resolve(null);
        }
      );
    });
  }
  return textureCache[path];
}

const snowPath = './images/shaders/Snow001_4K-JPG/Snow001_4K-JPG_';

const snowConfigure = (tex) => {
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
};

export function preloadTextures() {
  console.log('🚀 Starting texture preload...');
  loadTexture('./images/shaders/HorseShoe_fill.png');
  loadTexture('./images/shaders/HorseShoe_line.png');

  loadTexture(`${snowPath}Color.jpg`, {
    configure: snowConfigure,
    onError: (e) => console.warn('Color texture not found:', e),
  });
  loadTexture(`${snowPath}Roughness.jpg`, {
    configure: snowConfigure,
    onError: (e) => console.warn('Roughness texture not found:', e),
  });
  loadTexture(`${snowPath}NormalGL.jpg`, {
    configure: snowConfigure,
    onError: (e) => console.warn('Normal texture not found:', e),
  });
}

export function getPreloadedTexture(path) {
  return loadTexture(path);
}
