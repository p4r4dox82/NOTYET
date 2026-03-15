import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { getImageURL } from '../utils/utils';

/**
 * 발자국 (3D 시각화) 관리 커스텀 훅
 */
export function useFootPrint(containerRef, canvasRef, normalMapTexture, originalTexture) {
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const composerRef = useRef(null);
  const meshRef = useRef(null);
  const materialRef = useRef(null);
  const originalNormalMapRef = useRef(null);
  const newNormalMapRef = useRef(null);
  const originalDisplacementMapRef = useRef(null);
  const newDisplacementMapRef = useRef(null);
  const mainLightRef = useRef(null);
  const fillLightRef = useRef(null);
  const ambientLightRef = useRef(null);

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

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      canvas,
      preserveDrawingBuffer: true // 스크린샷 캡처를 위해 필요
    });
    renderer.setSize(Math.floor(width), Math.floor(height));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 8.0;
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
    const path = './images/shaders/Snow001_4K-JPG/Snow001_4K-JPG_';

    let bgBaseMap = null;
    let bgRoughnessMap = null;
    let bgNormalMap = null;

    // 텍스처 로드 (에러 핸들러 포함)
    bgBaseMap = textureLoader.load(
      `${path}Color.jpg`,
      undefined, // onLoad
      undefined, // onProgress
      (error) => console.warn('Color texture not found:', error)
    );
    bgRoughnessMap = textureLoader.load(
      `${path}Roughness.jpg`,
      undefined,
      undefined,
      (error) => console.warn('Roughness texture not found:', error)
    );
    bgNormalMap = textureLoader.load(
      `${path}NormalGL.jpg`,
      undefined,
      undefined,
      (error) => console.warn('Normal texture not found:', error)
    );

    [bgBaseMap, bgRoughnessMap, bgNormalMap].forEach((tex) => {
      if (tex) {
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
      }
    });

    // 원본 노멀맵 저장
    originalNormalMapRef.current = bgNormalMap;
    originalDisplacementMapRef.current = bgNormalMap;

    // --- Material ---
    // normalMapTexture가 없으면 기본값 사용
    const displayNormalMap = normalMapTexture || bgNormalMap;
    const displacementTexture = originalTexture || bgNormalMap;

    const material = new THREE.MeshPhysicalMaterial({
      map: bgBaseMap,
      normalMap: displayNormalMap,
      normalScale: new THREE.Vector2(4, 4),
      roughnessMap: bgRoughnessMap,

      displacementMap: displacementTexture,
      displacementScale: 1.5,
      displacementBias: 0.0,

      aoMap: displacementTexture,
      aoMapIntensity: 1.5,

      roughness: 0.7,
      metalness: 0.05,

      clearcoat: 0.5,
      clearcoatRoughness: 1.0,

      opacity: 1.0,
      transparent: true,

    });

    // --- Mesh ---
    const geometry = new THREE.PlaneGeometry(10, 10, 256, 256);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // --- Lighting ---
    const mainLight = new THREE.PointLight(0xffffff, 50.0, 100);
    mainLight.position.set(0, 10, 10);
    mainLight.castShadow = true;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);
    mainLightRef.current = mainLight;

    // Fill light (음영 부분을 밝히기)
    const fillLight = new THREE.PointLight(0x6699ff, 3.0, 100);
    fillLight.position.set(0, 10, -8);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    // Ambient light (전체 밝기)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

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
    cameraRef.current = camera;
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
      console.log('asdfasdf', originalNormalMapRef.current)
      if (materialRef.current && newNormalMapTexture && originalNormalMapRef.current) {
        console.log('qwerqwer', originalNormalMapRef.current)
        // 새 노멀맵 저장
        newNormalMapRef.current = newNormalMapTexture;
        // 새 노멀맵과 기존 노멀맵을 blend
        const blendedTexture = blendNormalMaps(originalNormalMapRef.current, newNormalMapTexture, rendererRef.current);
        materialRef.current.normalMap = blendedTexture;
        materialRef.current.needsUpdate = true;
        console.log('Normal maps blended successfully');
      }
    },
    updateOriginalMap(newOriginalMapTexture) {
      if (materialRef.current && newOriginalMapTexture) {
        // 새 원본 맵 저장
        newDisplacementMapRef.current = newOriginalMapTexture;
        // const blendedTexture = blendNormalMapsRNM(originalDisplacementMapRef.current, newOriginalMapTexture);
        materialRef.current.displacementMap = newOriginalMapTexture; // 원본 맵 유지 (변경하지 않음)
        materialRef.current.needsUpdate = true;
        console.log('Displacement maps blended successfully');
      }
    },
    async takeScreenshot(sender_name) {
      return new Promise(async (resolve) => {
        if (!canvasRef.current) {
          resolve(null);
          return;
        }

        try {
          // 원본 canvas 크기
          const sourceCanvas = canvasRef.current;
          const width = sourceCanvas.width;
          const height = sourceCanvas.height;

          const paddingTop = 126;
          const paddingLeft = 63;
          const targetWidth = 236;
          const targetHeight = 244;

          const paddingBottom_text = 120;
          const paddingLeft_text = 80;

          const scale = 2;

          const canvasWidth = width * scale;
          const canvasHeight = height * scale;

          // 2배 크기의 임시 canvas 생성
          const scaledCanvas = document.createElement('canvas');
          scaledCanvas.width = canvasWidth;
          scaledCanvas.height = canvasHeight;
          const ctx = scaledCanvas.getContext('2d');

          // canvas 초기화
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          ctx.beginPath();

          // 2배로 스케일링하여 그리기
          ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);

          // SVG 로드 및 그리기
          const img = new Image();
          img.src = getImageURL('CardText.svg');
          
          try {
            await img.decode(); // 이미지가 완전히 디코딩될 때까지 대기
            ctx.drawImage(img, paddingLeft * scale, paddingTop * scale, targetWidth * scale, targetHeight * scale);
          } catch (error) {
            console.error('Failed to load/decode SVG:', error);
          }
          
          // sender_name을 텍스트로 그리기
          if (sender_name) {
            ctx.font = `normal ${22 * scale}px TalkFile_tratatello`;
            ctx.fillStyle = '#de0000';
            ctx.textAlign = 'center';
            ctx.fillText(sender_name, paddingLeft_text * scale, canvasHeight - paddingBottom_text * scale - 5 * scale);
          }
          
          // blob으로 변환
          scaledCanvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/png');
        } catch (error) {
          console.error('Screenshot error:', error);
          resolve(null);
        }
      });
    },
  };
}

/**
 * 두 노멀맵을 lighten blend mode로 합치기
 */
function blendNormalMaps(baseTexture, newTexture, renderer) {
  const width = 1024;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // canvas 초기화
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();

  // 기본 텍스처 그리기 (Snow normal map)
  if (baseTexture && baseTexture.image) {
    console.log('Drawing baseTexture.image');
    ctx.drawImage(baseTexture.image, 0, 0, width, height);
  } else {
    console.warn('baseTexture.image not available');
  }

  // 새로운 노멀맵 추가 (lighten blend mode로 합치기)
  ctx.globalCompositeOperation = 'overlay';
  if (newTexture && newTexture instanceof THREE.CanvasTexture) {
    const sourceCanvas = newTexture.source.data;
    if (sourceCanvas instanceof HTMLCanvasElement) {
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
    }
  } else {
    console.warn('newTexture is not CanvasTexture or invalid');
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  // // GPU에 즉시 업로드
  // if (renderer) {
  //   renderer.initTexture(texture);
  // }
  
  console.log('Blended texture created:', texture);
  return texture;
}

function getPixels(tex, width = 1024, height = 1024) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d');
    if (tex && tex.image) {
      tCtx.drawImage(tex.image, 0, 0, width, height);
    } else if (tex && tex.source && tex.source.data) {
      tCtx.drawImage(tex.source.data, 0, 0, width, height);
    }
    return tCtx.getImageData(0, 0, width, height);
  }

function blendNormalMapsWhiteout(baseTexture, newTexture, renderer) {
  const width = 1024;
  const height = 1024;
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // canvas 초기화
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();

  // 1. 두 텍스처를 각각 임시 캔버스에 그려서 픽셀 데이터 추출
  const baseData = getPixels(baseTexture);
  const newData = getPixels(newTexture);
  const resultData = ctx.createImageData(width, height);

  // 2. Whiteout Blending 연산
  for (let i = 0; i < baseData.data.length; i += 4) {
    // [0, 255] -> [-1, 1] 범위로 변환
    const nx1 = (baseData.data[i] / 127.5) - 1.0;
    const ny1 = (baseData.data[i + 1] / 127.5) - 1.0;
    const nz1 = (baseData.data[i + 2] / 127.5) - 1.0;

    const nx2 = (newData.data[i] / 127.5) - 1.0;
    const ny2 = (newData.data[i + 1] / 127.5) - 1.0;
    const nz2 = (newData.data[i + 2] / 127.5) - 1.0;

    // Whiteout 공식 적용
    let rx = nx1 + nx2;
    let ry = ny1 + ny2;
    let rz = nz1 * nz2;

    // 정규화 (Normalization)
    const len = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1.0;
    rx /= len;
    ry /= len;
    rz /= len;

    // [-1, 1] -> [0, 255] 범위로 복구
    resultData.data[i] = (rx + 1.0) * 127.5;
    resultData.data[i + 1] = (ry + 1.0) * 127.5;
    resultData.data[i + 2] = (rz + 1.0) * 127.5;
    resultData.data[i + 3] = 255;
  }

  ctx.putImageData(resultData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  // GPU에 즉시 업로드
  if (renderer) {
    renderer.initTexture(texture);
  }
  
  return texture;
}

function blendNormalMapsRNM(baseTexture, newTexture, renderer) {
  const width = 1024;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // canvas 초기화
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();

  // (getPixels 함수는 위와 동일하므로 생략하거나 공통 사용 가능)
  const baseData = getPixels(baseTexture);
  const newData = getPixels(newTexture);
  const resultData = ctx.createImageData(width, height);

  for (let i = 0; i < baseData.data.length; i += 4) {
    // n1 (Base)와 n2 (Detail) 벡터 추출
    const n1 = {
      x: (baseData.data[i] / 127.5) - 1.0,
      y: (baseData.data[i + 1] / 127.5) - 1.0,
      z: (baseData.data[i + 2] / 127.5) - 1.0
    };
    const n2 = {
      x: (newData.data[i] / 127.5) - 1.0,
      y: (newData.data[i + 1] / 127.5) - 1.0,
      z: (newData.data[i + 2] / 127.5) - 1.0
    };

    // RNM 공식 적용
    const g = { x: n1.x, y: n1.y, z: n1.z + 1.0 };
    const f = { x: -n2.x, y: -n2.y, z: n2.z };
    
    const dotGF = g.x * f.x + g.y * f.y + g.z * f.z;
    const factor = dotGF / g.z;

    let rx = g.x * factor - f.x;
    let ry = g.y * factor - f.y;
    let rz = g.z * factor - f.z;

    const len = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1.0;
    rx /= len;
    ry /= len;
    rz /= len;

    resultData.data[i] = (rx + 1.0) * 127.5;
    resultData.data[i + 1] = (ry + 1.0) * 127.5;
    resultData.data[i + 2] = (rz + 1.0) * 127.5;
    resultData.data[i + 3] = 255;
  }

  ctx.putImageData(resultData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  // GPU에 즉시 업로드
  if (renderer) {
    renderer.initTexture(texture);
  }
  
  return texture;
}