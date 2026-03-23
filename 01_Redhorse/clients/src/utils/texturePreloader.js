import * as THREE from "three";

const textureCache = {};
const loader = new THREE.TextureLoader();
const loadingStatus = {
  isLoading: false,
  loadedCount: 0,
  totalCount: 0,
  callbacks: [],
};

export function addLoadingStatusCallback(callback) {
  loadingStatus.callbacks.push(callback);
}

export function removeLoadingStatusCallback(callback) {
  loadingStatus.callbacks = loadingStatus.callbacks.filter(cb => cb !== callback);
}

function notifyStatusChange() {
  loadingStatus.callbacks.forEach(cb => {
    cb({
      isLoading: loadingStatus.isLoading,
      loadedCount: loadingStatus.loadedCount,
      totalCount: loadingStatus.totalCount,
      progress: loadingStatus.totalCount > 0 ? (loadingStatus.loadedCount / loadingStatus.totalCount) * 100 : 0,
    });
  });
}

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
          loadingStatus.loadedCount++;
          notifyStatusChange();
          resolve(tex);
        },
        undefined,
        (error) => {
          console.error(`❌ Texture failed: ${path}`, error);
          if (options.onError) options.onError(error);
          loadingStatus.loadedCount++;
          notifyStatusChange();
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
  loadingStatus.isLoading = true;
  loadingStatus.loadedCount = 0;
  loadingStatus.totalCount = 5; // 5개의 텍스처
  notifyStatusChange();

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

  // 모든 텍스처가 로드될 때까지 기다렸다가 완료 상태 변경
  Promise.all([
    loadTexture('./images/shaders/HorseShoe_fill.png'),
    loadTexture('./images/shaders/HorseShoe_line.png'),
    loadTexture(`${snowPath}Color.jpg`, { configure: snowConfigure }),
    loadTexture(`${snowPath}Roughness.jpg`, { configure: snowConfigure }),
    loadTexture(`${snowPath}NormalGL.jpg`, { configure: snowConfigure }),
  ]).then(() => {
    loadingStatus.isLoading = false;
    notifyStatusChange();
    console.log('✅ All textures loaded!');
  });
}

export function getPreloadedTexture(path) {
  return loadTexture(path);
}

export function getLoadingStatus() {
  return {
    isLoading: loadingStatus.isLoading,
    loadedCount: loadingStatus.loadedCount,
    totalCount: loadingStatus.totalCount,
    progress: loadingStatus.totalCount > 0 ? (loadingStatus.loadedCount / loadingStatus.totalCount) * 100 : 0,
  };
}
