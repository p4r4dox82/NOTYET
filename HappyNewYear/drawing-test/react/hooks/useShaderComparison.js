import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {
  createNoiseScene,
  createRampScene,
  createBlurScene,
  createCompScene,
  createCompScene_multiply,
} from "../utils/shaderScenes";
import { BlurShader, CompShader_multiply } from "../constants/shaders";

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
    const SHRINK_FACTOR = 1/8;

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

    // --- EffectComposer 설정 ---
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;
    composer.setSize(width * SHRINK_FACTOR, height * SHRINK_FACTOR);

    let mainScene, mainCamera, mainMaterial;
    let noiseScene, rampScene, blurScene;

    // Shader Mode에 따라 다른 setup
    switch(shaderMode) {
      case 1: // Noise Shader
        const noiseSetup = createNoiseScene();
        mainScene = noiseSetup.scene;
        mainCamera = noiseSetup.camera;
        mainMaterial = noiseSetup.material;
        const renderPass1 = new RenderPass(mainScene, mainCamera);
        renderPass1.renderToScreen = true;
        composer.addPass(renderPass1);
        break;

      case 2: // Ramp Shader
        const rampSetup = createRampScene();
        mainScene = rampSetup.scene;
        mainCamera = rampSetup.camera;
        mainMaterial = rampSetup.material;
        const renderPass2 = new RenderPass(mainScene, mainCamera);
        renderPass2.renderToScreen = true;
        composer.addPass(renderPass2);
        break;

      case 3: // CompShader_average (Noise + Ramp 합성)
        // Noise와 Ramp를 두 개의 RenderTarget으로 렌더링 후 합성
        noiseScene = createNoiseScene();
        rampScene = createRampScene();
        
        // RenderTarget 설정 개선 (WebGL 에러 방지)
        const rtConfig3 = {
          format: THREE.RGBAFormat,
          type: THREE.UnsignedByteType,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          generateMipmaps: false,
          depthBuffer: false,
          stencilBuffer: false
        };
        
        const noiseRT3 = new THREE.WebGLRenderTarget(
          width * SHRINK_FACTOR,
          height * SHRINK_FACTOR,
          rtConfig3
        );
        const rampRT3 = new THREE.WebGLRenderTarget(
          width * SHRINK_FACTOR,
          height * SHRINK_FACTOR,
          rtConfig3
        );

        // Noise 렌더링
        renderer.setRenderTarget(noiseRT3);
        renderer.render(noiseScene.scene, noiseScene.camera);
        
        // Ramp 렌더링
        renderer.setRenderTarget(rampRT3);
        renderer.render(rampScene.scene, rampScene.camera);
        
        // CompShader_average 합성 (ShaderMaterial 직접 생성)
        renderer.setRenderTarget(null);
        mainCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const compAvgScene3 = new THREE.Scene();
        const compAvgMaterial3 = new THREE.ShaderMaterial({
          uniforms: {
            tDiffuse1: { value: noiseRT3.texture },
            tDiffuse2: { value: rampRT3.texture },
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D tDiffuse1;
            uniform sampler2D tDiffuse2;
            varying vec2 vUv;

            void main() {
              vec4 texture1 = texture2D(tDiffuse1, vUv);
              vec4 texture2 = texture2D(tDiffuse2, vUv);
              vec4 result = mix(texture1, texture2, 0.5);
              gl_FragColor = result;
            }
          `
        });
        const compAvgMesh3 = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compAvgMaterial3);
        compAvgScene3.add(compAvgMesh3);
        mainScene = compAvgScene3;
        mainMaterial = compAvgMaterial3;
        const compAvgPass3 = new RenderPass(compAvgScene3, mainCamera);
        compAvgPass3.renderToScreen = true;
        composer.addPass(compAvgPass3);
        break;

      case 4: // Blur Shader with HorseShoe_fill.png
        const blurSetup = createBlurScene();
        mainScene = blurSetup.scene;
        mainCamera = blurSetup.camera;
        mainMaterial = blurSetup.material;

        const horseshoeTexture = new THREE.TextureLoader().load(
          './assets/textures/HorseShoe_fill.png',
          (tex) => {
            tex.generateMipmaps = false;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.needsUpdate = true;
          },
          undefined,
          () => console.error('Failed to load HorseShoe_fill.png')
        );

        mainMaterial.uniforms.tDiffuse.value = horseshoeTexture;
        mainMaterial.uniforms.resolution.value.set(width, height);
        mainMaterial.uniforms.filterSize.value = 320.0;

        const blurRenderPass = new RenderPass(mainScene, mainCamera);
        composer.addPass(blurRenderPass);

        const blurHPass = new ShaderPass(BlurShader, 'tDiffuse');
        blurHPass.uniforms.direction.value.set(1.0, 0.0);
        blurHPass.uniforms.filterSize.value = 320.0;
        blurHPass.uniforms.resolution.value.set(width, height);
        composer.addPass(blurHPass);

        const blurVPass = new ShaderPass(BlurShader, 'tDiffuse');
        blurVPass.uniforms.direction.value.set(0.0, 1.0);
        blurVPass.uniforms.filterSize.value = 320.0;
        blurVPass.uniforms.resolution.value.set(width, height);
        blurVPass.renderToScreen = true;
        composer.addPass(blurVPass);
        break;

      case 5: // CompShader_multiply (Blur + CompAverage 합성)
        // =========================================================
        // Mode 3 결과 (Noise + Ramp 평균) - 수동 렌더링 유지 (브랜치 A)
        // =========================================================
        mainCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const noiseScene5 = createNoiseScene();
        const rampScene5 = createRampScene();

        const shrinkWidth = width * SHRINK_FACTOR;
        const shrinkHeight = height * SHRINK_FACTOR;

        const rtConfig = {
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            generateMipmaps: false,
            depthBuffer: false,
            stencilBuffer: false
        };

        const noiseRT5 = new THREE.WebGLRenderTarget(shrinkWidth, shrinkHeight, rtConfig);
        const rampRT5 = new THREE.WebGLRenderTarget(shrinkWidth, shrinkHeight, rtConfig);
        const compAvgRT5 = new THREE.WebGLRenderTarget(shrinkWidth, shrinkHeight, rtConfig);

        const compAvgScene5 = new THREE.Scene();
        const compAvgMaterial5 = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse1: { value: noiseRT5.texture },
                tDiffuse2: { value: rampRT5.texture },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse1;
                uniform sampler2D tDiffuse2;
                varying vec2 vUv;
                void main() {
                    vec4 texture1 = texture2D(tDiffuse1, vUv);
                    vec4 texture2 = texture2D(tDiffuse2, vUv);
                    vec4 result = mix(texture1, texture2, 0.5);
                    gl_FragColor = result;
                }
            `
        });
        const compAvgMesh5 = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compAvgMaterial5);
        compAvgScene5.add(compAvgMesh5);


        // =========================================================
        // Mode 4 결과 (Blur + Multiply 합성) - EffectComposer로 압축
        // =========================================================
        const blurSetup5 = createBlurScene();
        blurSetup5.material.uniforms.resolution.value.set(shrinkWidth, shrinkHeight);

        // [핵심 1] 커스텀 타겟을 만들어 Composer에 주입 (Pre-Shrink 메모리 최적화)
        const composerTarget = new THREE.WebGLRenderTarget(shrinkWidth, shrinkHeight, rtConfig);
        const composer5 = new EffectComposer(renderer, composerTarget);

        // 1단계: 원본 말굽 텍스처 렌더링 패스
        const basePass5 = new RenderPass(blurSetup5.scene, blurSetup5.camera);
        composer5.addPass(basePass5);

        // 2단계: 가로 블러 패스
        const blurHPass5 = new ShaderPass(BlurShader);
        blurHPass5.uniforms.direction.value.set(1.0, 0.0);
        blurHPass5.uniforms.filterSize.value = 32.0; // 성능을 위해 현실적인 수치로 조정
        blurHPass5.uniforms.resolution.value.set(shrinkWidth, shrinkHeight);
        composer5.addPass(blurHPass5);

        // 3단계: 세로 블러 패스
        const blurVPass5 = new ShaderPass(BlurShader);
        blurVPass5.uniforms.direction.value.set(0.0, 1.0);
        blurVPass5.uniforms.filterSize.value = 32.0;
        blurVPass5.uniforms.resolution.value.set(shrinkWidth, shrinkHeight);
        composer5.addPass(blurVPass5);

        // 4단계: CompShader_multiply 합성 패스
        // [주의] EffectComposer의 ShaderPass는 이전 패스의 결과를 무조건 'tDiffuse'라는 이름으로 넘겨줍니다.
        // 따라서 기존 tDiffuse1 이름을 tDiffuse로 변경해야 합니다.
        const compMultShaderDef = {
            uniforms: {
                tDiffuse: { value: null }, // Composer가 이전 패스(BlurV) 결과를 자동으로 꽂아줌
                tDiffuse2: { value: null }, // 나중에 할당 (RenderTarget 텍스처는 cloneUniforms 불가)
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;  // 블러 처리된 말굽
                uniform sampler2D tDiffuse2; // Noise + Ramp 배경
                varying vec2 vUv;
                void main() {
                    vec4 blurColor = texture2D(tDiffuse, vUv);
                    vec4 bgColor = texture2D(tDiffuse2, vUv);
                    
                    // Multiply 합성
                    vec4 result = blurColor * bgColor;
                    gl_FragColor = result;
                }
            `
        };
        const compMultPass5 = new ShaderPass(compMultShaderDef);
        compMultPass5.uniforms.tDiffuse2.value = compAvgRT5.texture; // ShaderPass 생성 후 할당
        compMultPass5.renderToScreen = true; // 최종 결과를 화면에 출력
        composer5.addPass(compMultPass5);

        // =========================================================
        // 비동기 텍스처 로딩 후 브랜치 A 렌더링 실행
        // =========================================================
        const horseshoeTexture5 = new THREE.TextureLoader().load(
            './assets/textures/HorseShoe_fill.png',
            (tex) => {
                tex.generateMipmaps = false;
                tex.minFilter = THREE.LinearFilter;
                tex.magFilter = THREE.LinearFilter;
                tex.needsUpdate = true;

                blurSetup5.material.uniforms.tDiffuse.value = tex;

                // 브랜치 A 렌더링 (단 한 번만 실행되거나, animate 안에서 실행)
                renderer.setRenderTarget(noiseRT5);
                renderer.render(noiseScene5.scene, noiseScene5.camera);

                renderer.setRenderTarget(rampRT5);
                renderer.render(rampScene5.scene, rampScene5.camera);

                renderer.setRenderTarget(compAvgRT5);
                renderer.render(compAvgScene5, mainCamera);

                // [중요] 타겟을 해제하고 화면에 그릴 준비
                renderer.setRenderTarget(null);
            }
        );

        // Update composerRef to use the new composer5
        composerRef.current = composer5;

        break;

      default:
        const defaultSetup = createNoiseScene();
        mainScene = defaultSetup.scene;
        mainCamera = defaultSetup.camera;
        mainMaterial = defaultSetup.material;
        const defaultPass = new RenderPass(mainScene, mainCamera);
        defaultPass.renderToScreen = true;
        composer.addPass(defaultPass);
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
      const material = materialRef.current;

      if (!composer) return;

      // Shader uniform 업데이트
      // if (material && material.uniforms) {
      //   if (material.uniforms.uTime) {
      //     material.uniforms.uTime.value = elapsed;
      //   }
      //   if (material.uniforms.uPhase) {
      //     material.uniforms.uPhase.value = elapsed * 0.5;
      //   }
      // }

      composer.render();
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
