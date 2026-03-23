import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {
  createNoiseScene,
  createRampScene,
  createBlurScene,
  createBlurLineScene,
  createCompScene,
  createCompScene_multiply,
  createCompOverScene,
} from "../utils/shaderScenes";
import { BlurShader, SimpleTextureShader, CompShader_multiply } from "../constants/shaders";

// HMR (Hot Module Replacement) 개선을 위한 설정
if (import.meta.hot) {
  // 셰이더 파일 변경 감지 및 자동 새로고침
  import.meta.hot.accept('../constants/shaders', () => {
    console.log('🔄 Shader files updated - reloading...');
    window.location.reload(); // 완전한 페이지 새로고침으로 셰이더 변경사항 반영
  });
}

/**
 * Shader Mode에 따라 다양한 shader 렌더링하는 커스텀 훅
 * @param {number} shaderMode - 1: Noise, 2: Ramp, 3: CompAverage, 4: Blur, 5: CompMultiply
 */
export function useShaderComparison(
  containerRef,
  canvasRef,
  overlayCanvasRef,
  shaderMode = 1,
) {
  const rendererRef = useRef(null);
  const composerRef = useRef(null);
  const shaderSceneRef = useRef(null);
  const shaderCameraRef = useRef(null);
  const materialRef = useRef(null);
  const allMaterialsRef = useRef({}); // 모든 material들을 추적
  const stateRef = useRef({
    isDrawing: false,
    lastX: 0,
    lastY: 0,
  });

  const handlersRef = useRef({});
  const animationIdRef = useRef(null);

  // --- Clock 저장 (애니메이션용) ---
  const clockRef = useRef(null);

  useEffect(() => {
    if (!containerRef?.current || !canvasRef?.current) return;

    const LINE_RADIUS = 3;
    const CANVAS_SIZE = 1024;

    // --- Overlay Canvas 설정 (드로잉 캔버스) ---
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;

    overlayCanvas.width = CANVAS_SIZE;
    overlayCanvas.height = CANVAS_SIZE;
    const overlayContext = overlayCanvas.getContext("2d");
    overlayContext.fillStyle = "#000000";
    overlayContext.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // --- 메인 캔버스 및 렌더러 설정 ---
    const canvas = canvasRef.current;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    canvas.width = Math.floor(width);
    canvas.height = Math.floor(height);

    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(Math.floor(width), Math.floor(height));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    // =========================================================
    // [핵심 추가] Composer가 사용할 렌더 타겟에 Mipmap 속성 켜기
    // =========================================================
    const renderTargetConfig = {
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter, // 👈 밉맵 필터 필수
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        generateMipmaps: true // 👈 패스가 끝날 때마다 밉맵을 새로 굽도록 지시!
    };
    const customRenderTarget = new THREE.WebGLRenderTarget(width, height, renderTargetConfig);

    // 기본 생성 대신, 커스텀 타겟을 장착한 Composer 생성
    const composer = new EffectComposer(renderer, customRenderTarget);

    // --- EffectComposer 설정 ---
    composerRef.current = composer;
    composer.setSize(width, height);

    // =========================================================
    // 1. 모든 노드(Scene)와 메모리(RenderTarget)를 1번만 생성합니다.
    // =========================================================
    let mainScene, mainCamera, mainMaterial; // 변수 선언
    mainCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // [Node 1, 2] Noise와 Ramp
    const noiseSetup = createNoiseScene();
    const rampSetup = createRampScene();

    // [Node 3] Average 합성
    const compAvgSetup = createCompScene();

    // [Node 4] Blur 원본 이미지
    const blurSetup = createBlurScene();

    // [Node 6] Blur Line 이미지 (다른 파라미터)
    const blurLineSetup = createBlurLineScene();

    // 모든 material들을 ref에 저장 (animate 루프에서 모두 업데이트하기 위해)
    allMaterialsRef.current = {
      noise: noiseSetup.material,
      ramp: rampSetup.material,
      compAvg: compAvgSetup.material,
      blur: blurSetup.material,
      blurLine: blurLineSetup.material,
    };

    // 텍스처 로드 (1번만)
    const horseshoeTexture = new THREE.TextureLoader().load('./assets/textures/HorseShoe_fill.png', (tex) => {
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        blurSetup.material.uniforms.tDiffuse.value = tex;
    });

    // HorseShoe_line.png 텍스처 로드 (shader 6용)
    const horseshoeLineTexture = new THREE.TextureLoader().load('./assets/textures/HorseShoe_line.png', (tex) => {
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        blurLineSetup.material.uniforms.tDiffuse.value = tex;
    });

    // RenderTargets (도화지들 - 메모리 절약을 위해 공용으로 씁니다)
    const rtConfig = { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter };
    const noiseRT = new THREE.WebGLRenderTarget(width, height, rtConfig);
    const rampRT = new THREE.WebGLRenderTarget(width, height, rtConfig);
    const compAvgRT = new THREE.WebGLRenderTarget(width, height, rtConfig);

    // [핵심] 단일 EffectComposer 생성 및 패스 미리 세팅
    // 패스들을 미리 만들어둡니다. (씬은 나중에 할당)
    const dummyScene = new THREE.Scene();
    const renderPass = new RenderPass(dummyScene, mainCamera); // 더미 씬으로 시작
    
    // Shader 4용 블러 패스 (강한 블러)
    const blur4HPass = new ShaderPass(BlurShader);
    blur4HPass.uniforms.direction.value.set(1.0, 0.0);
    blur4HPass.uniforms.filterSize.value = 32.0;
    blur4HPass.uniforms.uPreShrink.value = 6.0;
    blur4HPass.uniforms.resolution.value.set(width, height);

    const blur4VPass = new ShaderPass(BlurShader);
    blur4VPass.uniforms.direction.value.set(0.0, 1.0);
    blur4VPass.uniforms.filterSize.value = 32.0;
    blur4VPass.uniforms.uPreShrink.value = 6.0;
    blur4VPass.uniforms.resolution.value.set(width, height);

    // Shader 6용 블러 패스 (약한 블러)
    const blur6HPass = new ShaderPass(BlurShader);
    blur6HPass.uniforms.direction.value.set(1.0, 0.0);
    blur6HPass.uniforms.filterSize.value = 24.0;
    blur6HPass.uniforms.uPreShrink.value = 3.0;
    blur6HPass.uniforms.resolution.value.set(width, height);

    const blur6VPass = new ShaderPass(BlurShader);
    blur6VPass.uniforms.direction.value.set(0.0, 1.0);
    blur6VPass.uniforms.filterSize.value = 24.0;
    blur6VPass.uniforms.uPreShrink.value = 3.0;
    blur6VPass.uniforms.resolution.value.set(width, height);

    const compMultPass = new ShaderPass(CompShader_multiply); // Mode 5용

    // =========================================================
    // [만능 렌더링 씬] Mode 7의 직접 렌더링 파이프라인용
    // =========================================================
    const processScene = new THREE.Scene();
    const processMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    processScene.add(processMesh);

    // 헬퍼: 입력 텍스처 -> 쉐이더 연산 -> 타겟에 저장
    const applyShader = (material, inputTexture, outputTarget) => {
        if (material.uniforms.tDiffuse) {
            material.uniforms.tDiffuse.value = inputTexture;
        }
        processMesh.material = material;
        renderer.setRenderTarget(outputTarget);
        renderer.render(processScene, mainCamera);
    };

    const rtConf = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };

    // Case 5 (Fill) 용 도화지
    const fillBaseRT   = new THREE.WebGLRenderTarget(width, height, rtConf);
    const fillHRT      = new THREE.WebGLRenderTarget(width, height, rtConf);
    const fillVRT      = new THREE.WebGLRenderTarget(width, height, rtConf);
    const case5FinalRT = new THREE.WebGLRenderTarget(width, height, rtConf);

    // Case 6 (Line) 용 도화지
    const lineBaseRT   = new THREE.WebGLRenderTarget(width, height, rtConf);
    const lineHRT      = new THREE.WebGLRenderTarget(width, height, rtConf);
    const case6FinalRT = new THREE.WebGLRenderTarget(width, height, rtConf);

    // Mode 7용 직접 블러 Material (강한 블러 - Fill)
    const blurFillHMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(BlurShader.uniforms),
        vertexShader: BlurShader.vertexShader,
        fragmentShader: BlurShader.fragmentShader,
    });
    blurFillHMaterial.uniforms.direction.value.set(1.0, 0.0);
    blurFillHMaterial.uniforms.filterSize.value = 32.0;
    blurFillHMaterial.uniforms.uPreShrink.value = 6.0;
    blurFillHMaterial.uniforms.resolution.value.set(width, height);

    const blurFillVMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(BlurShader.uniforms),
        vertexShader: BlurShader.vertexShader,
        fragmentShader: BlurShader.fragmentShader,
    });
    blurFillVMaterial.uniforms.direction.value.set(0.0, 1.0);
    blurFillVMaterial.uniforms.filterSize.value = 32.0;
    blurFillVMaterial.uniforms.uPreShrink.value = 6.0;
    blurFillVMaterial.uniforms.resolution.value.set(width, height);

    // Mode 7용 직접 블러 Material (약한 블러 - Line)
    const blurLineHMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(BlurShader.uniforms),
        vertexShader: BlurShader.vertexShader,
        fragmentShader: BlurShader.fragmentShader,
    });
    blurLineHMaterial.uniforms.direction.value.set(1.0, 0.0);
    blurLineHMaterial.uniforms.filterSize.value = 24.0;
    blurLineHMaterial.uniforms.uPreShrink.value = 3.0;
    blurLineHMaterial.uniforms.resolution.value.set(width, height);

    const blurLineVMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(BlurShader.uniforms),
        vertexShader: BlurShader.vertexShader,
        fragmentShader: BlurShader.fragmentShader,
    });
    blurLineVMaterial.uniforms.direction.value.set(0.0, 1.0);
    blurLineVMaterial.uniforms.filterSize.value = 24.0;
    blurLineVMaterial.uniforms.uPreShrink.value = 3.0;
    blurLineVMaterial.uniforms.resolution.value.set(width, height);

    // Mode 7용 Multiply Material + Scene
    const compMultMaterial_7 = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(CompShader_multiply.uniforms),
        vertexShader: CompShader_multiply.vertexShader,
        fragmentShader: CompShader_multiply.fragmentShader,
    });
    const compMultMesh_7 = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compMultMaterial_7);
    const compMultScene_7 = new THREE.Scene();
    compMultScene_7.add(compMultMesh_7);

    // Mode 7용 CompOver 씬 변수
    let compOverSetup = null;

    // =========================================================
    // 2. 모드에 따라 렌더링 파이프라인 조립 (Routing)
    // =========================================================

    // (초기화) 매번 모드가 바뀔 때마다 Composer 패스를 비워줍니다.
    composer.passes = []; 
    renderPass.renderToScreen = false;
    blur4VPass.renderToScreen = false;
    blur6VPass.renderToScreen = false;
    compMultPass.renderToScreen = false;

    switch(shaderMode) {
        case 1: // Noise
            renderPass.scene = noiseSetup.scene;
            renderPass.renderToScreen = true;
            composer.addPass(renderPass);
            mainScene = noiseSetup.scene;
            mainCamera = noiseSetup.camera;
            mainMaterial = noiseSetup.material;
            break;

        case 2: // Ramp
            renderPass.scene = rampSetup.scene;
            renderPass.renderToScreen = true;
            composer.addPass(renderPass);
            mainScene = rampSetup.scene;
            mainCamera = rampSetup.camera;
            mainMaterial = rampSetup.material;
            break;

        case 3: // Comp Average (Noise + Ramp)
            // 결과물을 Average Material에 꽂아줌
            compAvgSetup.material.uniforms.tDiffuse1.value = noiseRT.texture;
            compAvgSetup.material.uniforms.tDiffuse2.value = rampRT.texture;

            renderPass.scene = compAvgSetup.scene;
            renderPass.renderToScreen = true;
            composer.addPass(renderPass);
            mainScene = compAvgSetup.scene;
            mainCamera = compAvgSetup.camera;
            mainMaterial = compAvgSetup.material;
            break;

        case 4: // Blur 
            // 원본 씬 추가
            renderPass.scene = blurSetup.scene;
            composer.addPass(renderPass);
            
            // 블러 패스 추가 (강한 블러)
            composer.addPass(blur4HPass);
            composer.addPass(blur4VPass);
            blur4VPass.renderToScreen = true; // 여기서 출력!
            mainScene = blurSetup.scene;
            mainCamera = blurSetup.camera;
            mainMaterial = blurSetup.material;
            break;

        case 5: // Multiply (Case 3 + Case 4 의 결합!!!)
            // [Case 4의 파이프라인 재사용] 원본 씬 -> 블러
            renderPass.scene = blurSetup.scene;
            composer.addPass(renderPass);
            composer.addPass(blur4HPass);
            blur4VPass.renderToScreen = false; // 여기서 renderToScreen 안 함!
            composer.addPass(blur4VPass);

            // [최종 결합] 블러 결과물(tDiffuse) * Average 텍스처(tDiffuse2)
            compMultPass.uniforms.tDiffuse2.value = compAvgRT.texture;
            compMultPass.renderToScreen = true; // 최종 출력!
            composer.addPass(compMultPass);
            mainScene = blurSetup.scene;
            mainCamera = blurSetup.camera;
            mainMaterial = blurSetup.material;
            break;

        case 6: // Blur Line (HorseShoe_line.png with different parameters)
            // 원본 씬을 blurLineSetup으로 설정
            renderPass.scene = blurLineSetup.scene;
            composer.addPass(renderPass);
            
            // 블러 패스 추가 (약한 블러) 
            composer.addPass(blur6HPass);
            composer.addPass(blur6VPass);
            blur6VPass.renderToScreen = true; // 여기서 출력!
            mainScene = blurLineSetup.scene;
            mainCamera = blurLineSetup.camera;
            mainMaterial = blurLineSetup.material;
            break;

        case 7: // CompShader_over (Mode 5 결과 Over Mode 6 결과) - 직접 렌더링
            compOverSetup = createCompOverScene();
            allMaterialsRef.current.compOver = compOverSetup.material;
            // 모든 렌더링은 animate 루프에서 직접 수행 (composer 미사용)
            mainScene = compOverSetup.scene;
            mainCamera = compOverSetup.camera;
            mainMaterial = compOverSetup.material;
            break;

        default:
            renderPass.scene = noiseSetup.scene;
            renderPass.renderToScreen = true;
            composer.addPass(renderPass);
            mainScene = noiseSetup.scene;
            mainCamera = noiseSetup.camera;
            mainMaterial = noiseSetup.material;
    }

    shaderSceneRef.current = mainScene;
    shaderCameraRef.current = mainCamera;
    materialRef.current = mainMaterial;

    // --- 단일 애니메이션 루프 ---
    clockRef.current = new THREE.Clock();

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const elapsed = clockRef.current.getElapsedTime();
      const composer = composerRef.current;

      if (!composer) return;

      // 모든 material들의 uniforms 업데이트
      const updateMaterialUniforms = (material) => {
        if (material && material.uniforms) {
          if (material.uniforms.uTime) {
            material.uniforms.uTime.value = elapsed;
          }
          if (material.uniforms.uPhase) {
            material.uniforms.uPhase.value = elapsed * 0.5;
          }
        }
      };

      Object.values(allMaterialsRef.current).forEach(updateMaterialUniforms);

      // shaderMode가 3, 5인 경우, 매 프레임 노이즈와 램프를 리렌더링
      if (shaderMode === 3 || shaderMode === 5) {
        renderer.setRenderTarget(noiseRT);
        renderer.render(noiseSetup.scene, mainCamera);
        renderer.setRenderTarget(rampRT);
        renderer.render(rampSetup.scene, mainCamera);
        renderer.setRenderTarget(null);

        compAvgSetup.material.uniforms.tDiffuse1.value = noiseRT.texture;
        compAvgSetup.material.uniforms.tDiffuse2.value = rampRT.texture;

        if (shaderMode === 5) {
          renderer.setRenderTarget(compAvgRT);
          renderer.render(compAvgSetup.scene, mainCamera);
          renderer.setRenderTarget(null);
        }
      }

      // Mode 7: 직접 렌더링 파이프라인
      if (shaderMode === 7 && compOverSetup) {
        // [1] 배경 (Noise + Ramp) 굽기 -> compAvgRT
        renderer.setRenderTarget(noiseRT);
        renderer.render(noiseSetup.scene, mainCamera);
        renderer.setRenderTarget(rampRT);
        renderer.render(rampSetup.scene, mainCamera);
        compAvgSetup.material.uniforms.tDiffuse1.value = noiseRT.texture;
        compAvgSetup.material.uniforms.tDiffuse2.value = rampRT.texture;
        renderer.setRenderTarget(compAvgRT);
        renderer.render(compAvgSetup.scene, mainCamera);

        // [2] Case 5 브랜치 (Fill Blur + Multiply)
        renderer.setRenderTarget(fillBaseRT);
        renderer.render(blurSetup.scene, mainCamera);
        applyShader(blurFillHMaterial, fillBaseRT.texture, fillHRT);
        applyShader(blurFillVMaterial, fillHRT.texture, fillVRT);
        compMultMaterial_7.uniforms.tDiffuse.value = fillVRT.texture;
        compMultMaterial_7.uniforms.tDiffuse2.value = compAvgRT.texture;
        renderer.setRenderTarget(case5FinalRT);
        renderer.render(compMultScene_7, mainCamera);

        // [3] Case 6 브랜치 (Line Blur)
        renderer.setRenderTarget(lineBaseRT);
        renderer.render(blurLineSetup.scene, mainCamera);
        applyShader(blurLineHMaterial, lineBaseRT.texture, lineHRT);
        applyShader(blurLineVMaterial, lineHRT.texture, case6FinalRT);

        // [4] 최종 Over 합성 (화면에 출력)
        // compOverSetup.material.uniforms.tForeground.value = case6FinalRT.texture;
        compOverSetup.material.uniforms.tBackground.value = case5FinalRT.texture;
        renderer.setRenderTarget(null);
        renderer.render(compOverSetup.scene, mainCamera);
      } else {
        composer.render();
      }
    };

    animate();

    // --- 공용 드로잉 이벤트 핸들러 ---
    const handleMouseDown = (event) => {
      const rect = overlayCanvas.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        return;
      }

      stateRef.current.isDrawing = true;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      stateRef.current.lastX = x;
      stateRef.current.lastY = y;
    };

    const handleMouseUp = () => {
      stateRef.current.isDrawing = false;
    };

    const handleMouseMove = (event) => {
      if (!stateRef.current.isDrawing) return;

      const rect = overlayCanvas.getBoundingClientRect();
      const scaleX = overlayCanvas.width / rect.width;
      const scaleY = overlayCanvas.height / rect.height;

      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        return;
      }

      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;

      const dx = x - stateRef.current.lastX;
      const dy = y - stateRef.current.lastY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // --- BlurShader 파라미터 조절 ---
      if (materialRef.current && Math.abs(dy) > 1) {
        materialRef.current.uniforms.filterSize.value +=
          dy * 0.01;
        materialRef.current.uniforms.filterSize.value =
          Math.max(
            0.1,
            Math.min(
              5.0,
              materialRef.current.uniforms.filterSize.value,
            ),
          );
      }

      // --- 드로잉 ---
      const steps = Math.ceil(distance / (LINE_RADIUS * 0.25));

      overlayContext.shadowBlur = 0;

      for (let i = 0; i <= steps; i++) {
        const t = steps > 0 ? i / steps : 0;
        const interpX = stateRef.current.lastX + dx * t;
        const interpY = stateRef.current.lastY + dy * t;

        const grad = overlayContext.createRadialGradient(
          interpX,
          interpY,
          0,
          interpX,
          interpY,
          LINE_RADIUS,
        );

        grad.addColorStop(0, "rgba(255, 255, 255, 0.2)");
        grad.addColorStop(0.5, "rgba(255, 255, 255, 0.05)");
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");

        overlayContext.fillStyle = grad;
        overlayContext.beginPath();
        overlayContext.arc(interpX, interpY, LINE_RADIUS, 0, Math.PI * 2);
        overlayContext.fill();
      }

      stateRef.current.lastX = x;
      stateRef.current.lastY = y;
    };

    // --- 이벤트 리스너 등록 ---
    overlayCanvas.addEventListener("mousedown", handleMouseDown);
    overlayCanvas.addEventListener("mouseup", handleMouseUp);
    overlayCanvas.addEventListener("mousemove", handleMouseMove);

    handlersRef.current = {
      handleMouseDown,
      handleMouseUp,
      handleMouseMove,
    };

    // --- Cleanup ---
    return () => {
      // Cancel animation
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      // Dispose composer
      if (composerRef.current) {
        composerRef.current.dispose();
      }

      // Dispose mode 7 render targets and materials
      fillBaseRT.dispose(); fillHRT.dispose(); fillVRT.dispose(); case5FinalRT.dispose();
      lineBaseRT.dispose(); lineHRT.dispose(); case6FinalRT.dispose();
      blurFillHMaterial.dispose(); blurFillVMaterial.dispose();
      blurLineHMaterial.dispose(); blurLineVMaterial.dispose();
      compMultMaterial_7.dispose();
      if (compOverSetup) compOverSetup.material.dispose();

      // Dispose renderer
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      // Cleanup shader material
      if (materialRef.current) {
        materialRef.current.dispose();
      }

      overlayCanvas.removeEventListener(
        "mousedown",
        handlersRef.current.handleMouseDown,
      );
      overlayCanvas.removeEventListener(
        "mouseup",
        handlersRef.current.handleMouseUp,
      );
      overlayCanvas.removeEventListener(
        "mousemove",
        handlersRef.current.handleMouseMove,
      );
    };
  }, [shaderMode]);

  return {
    getRenderer() {
      return rendererRef.current;
    },
    getMaterial() {
      return materialRef.current;
    },
    getShaderScene() {
      return shaderSceneRef.current;
    },
    getCanvas() {
      return canvasRef.current;
    },
  };
}

export default useShaderComparison;
