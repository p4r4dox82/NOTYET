import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

/**
 * 우측 패널 (3D 시각화) 관리 커스텀 훅
 */
export function useRightPanel(containerRef, canvasRef, normalMapTexture) {
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const composerRef = useRef(null);
  const meshRef = useRef(null);
  const materialRef = useRef(null);
  const originalNormalMapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const canvas = canvasRef.current;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setSize(Math.floor(width), Math.floor(height));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // --- Post-Processing ---
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // --- Orbit Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // --- Textures ---
    const textureLoader = new THREE.TextureLoader();
    const path = './assets/textures/Snow001_4K-JPG/Snow001_4K-JPG_';

    let bgBaseMap = null;
    let bgRoughnessMap = null;
    let bgNormalMap = null;

    // 텍스처 로드 시도 (패스가 없을 수 있으므로 기본값 지정)
    try {
      bgBaseMap = textureLoader.load(`${path}Color.jpg`);
      bgRoughnessMap = textureLoader.load(`${path}Roughness.jpg`);
      bgNormalMap = textureLoader.load(`${path}NormalGL.jpg`);
    } catch (e) {
      console.warn('Snow texture not found, using default:', e);
      // 기본 흰색 텍스처 생성
      bgBaseMap = new THREE.Texture();
      bgBaseMap.fillStyle = '#ffffff';
      bgRoughnessMap = new THREE.Texture();
      bgNormalMap = new THREE.Texture();
    }

    [bgBaseMap, bgRoughnessMap, bgNormalMap].forEach((tex) => {
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
    });

    // 원본 노멀맵 저장
    originalNormalMapRef.current = bgNormalMap;

    // --- HDRI 환경맵 로드 (옵션) ---
    try {
      const hdrLoader = new HDRLoader();
      hdrLoader.load('./assets/textures/0_hdri/snowy_cemetery_4k.hdr', (texture) => {
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        scene.background = envMap;
        scene.environment = envMap;
        pmremGenerator.dispose();
      });
    } catch (e) {
      console.warn('HDRI not found:', e);
    }

    // --- Material ---
    // normalMapTexture가 없으면 기본값 사용
    const displayNormalMap = normalMapTexture || bgNormalMap;
    const displacementTexture = bgNormalMap;

    const material = new THREE.MeshPhysicalMaterial({
      map: bgBaseMap,
      normalMap: displayNormalMap,
      normalScale: new THREE.Vector2(3, 3),
      roughnessMap: bgRoughnessMap,

      displacementMap: displacementTexture,
      displacementScale: 1.5,
      displacementBias: 0,

      roughness: 0.7,
      metalness: 0.2,

      clearcoat: 1.0,
      clearcoatRoughness: 0.15,

      opacity: 1,
      transparent: true,
    });

    // --- Mesh ---
    const geometry = new THREE.PlaneGeometry(10, 10, 256, 256);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // --- Lighting ---
    const mainLight = new THREE.PointLight(0xffffff, 1.8, 100);
    mainLight.position.set(10, 3, 5);
    mainLight.castShadow = true;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    // Fill light (음영 부분을 밝히기)
    const fillLight = new THREE.PointLight(0x6699ff, 0.8, 100);
    fillLight.position.set(-8, 2, 3);
    scene.add(fillLight);

    // Ambient light (전체 밝기)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // --- Animation Loop ---
    let animationId;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      controls.update();
      composer.render();
    };

    animate();

    // --- Resize Handler ---
    const handleResize = () => {
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(Math.floor(newWidth), Math.floor(newHeight));
      composer.setSize(Math.floor(newWidth), Math.floor(newHeight));
    };

    window.addEventListener('resize', handleResize);

    // 참조 저장
    sceneRef.current = scene;
    rendererRef.current = renderer;
    composerRef.current = composer;
    meshRef.current = mesh;
    materialRef.current = material;

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);

      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (bgBaseMap) bgBaseMap.dispose();
      if (bgRoughnessMap) bgRoughnessMap.dispose();
      if (bgNormalMap) bgNormalMap.dispose();
      composer.dispose();
      controls.dispose();
    };
  }, []);

  return {
    updateNormalMap(newNormalMapTexture) {
      if (materialRef.current && newNormalMapTexture && originalNormalMapRef.current) {
        // 새 노멀맵과 기존 노멀맵을 blend
        const blendedTexture = blendNormalMaps(originalNormalMapRef.current, newNormalMapTexture);
        // materialRef.current.normalMap = blendedTexture;
        materialRef.current.displacementMap = blendedTexture;
        materialRef.current.needsUpdate = true;
        console.log('Normal maps blended successfully');
      }
    },
  };
}

/**
 * 두 노멀맵을 lighten blend mode로 합치기
 */
function blendNormalMaps(baseTexture, newTexture) {
  const width = 1024;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 기본 텍스처 그리기 (Snow normal map)
  if (baseTexture && baseTexture.image) {
    ctx.drawImage(baseTexture.image, 0, 0, width, height);
  }

  // 새로운 노멀맵 추가 (lighten blend mode로 합치기)
  ctx.globalCompositeOperation = 'lighten';
  if (newTexture && newTexture instanceof THREE.CanvasTexture) {
    const sourceCanvas = newTexture.source.data;
    if (sourceCanvas instanceof HTMLCanvasElement) {
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
    }
  }

  return new THREE.CanvasTexture(canvas);
}
// 블렌딩 어떻게 되는 지 확인 필요 < 지금 새로운 형태로 더해지는 느낌임. 