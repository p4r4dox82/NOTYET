import * as THREE from 'three';
import {
  NoiseShader,
  RampShader,
  BlurShader,
  MultiplyShader,
  CompShader_average,
  CompShader_multiply,
} from '../constants/shaders';

/**
 * 범용 ShaderScene 생성 팩토리
 * shaders.js의 shader 정의(uniforms, vertexShader, fragmentShader)를 받아
 * Three.js에서 바로 사용 가능한 scene/camera/material/mesh 세트를 반환합니다.
 *
 * @param {object} shaderDef - shaders.js에서 가져온 shader 정의
 * @returns {{ scene: THREE.Scene, camera: THREE.OrthographicCamera, material: THREE.ShaderMaterial, mesh: THREE.Mesh }}
 */
export function createShaderScene(shaderDef) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(shaderDef.uniforms),
    vertexShader: shaderDef.vertexShader,
    fragmentShader: shaderDef.fragmentShader,
    toneMapped: false,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  return { scene, camera, material, mesh };
}

// ---------- 각 Shader별 편의 함수 ----------

/** NoiseShader (FBM 노이즈 + 칼레이도스코프) */
export function createNoiseScene() {
  return createShaderScene(NoiseShader);
}

/** RampShader (동심원 파문) */
export function createRampScene() {
  return createShaderScene(RampShader);
}

/**
 * BlurShader (가우시안 블러)
 * 반환 후 외부에서 material.uniforms.tDiffuse.value 에 텍스처를 주입하세요.
 */
export function createBlurScene() {
  return createShaderScene(BlurShader);
}

/**
 * MultiplyShader (노이즈 × 드로잉 합성)
 * 반환 후 외부에서 tDiffuse1 / tDiffuse2 uniforms을 주입하세요.
 */
export function createMultiplyScene() {
  return createShaderScene(MultiplyShader);
}

/**
 * CompShader_average (두 텍스처 단순 평균 합성)
 * 반환 후 외부에서 tDiffuse1 / tDiffuse2 uniforms을 주입하세요.
 */
export function createCompScene() {
  return createShaderScene(CompShader_average);
}

/**
 * CompShader_multiply (두 텍스처 곱셈(Multiply) 합성)
 * 반환 후 외부에서 tDiffuse1 / tDiffuse2 uniforms을 주입하세요.
 */
export function createCompScene_multiply() {
  return createShaderScene(CompShader_multiply);
}
