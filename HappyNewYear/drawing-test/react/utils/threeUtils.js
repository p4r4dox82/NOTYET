import * as THREE from 'three';

/**
 * 높이맵에서 노멀맵 생성
 */
export function heightToNormal(srcCanvas, dstContext, intensity) {
    const width = srcCanvas.width;
    const height = srcCanvas.height;
    
    const srcCtx = srcCanvas.getContext('2d');
    const srcData = srcCtx.getImageData(0, 0, width, height);
    const dstData = dstContext.createImageData(width, height);
    
    const srcPixels = srcData.data;
    const dstPixels = dstData.data;

    const offset = 2; 

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            const xLeft = Math.max(0, x - offset);
            const xRight = Math.min(width - 1, x + offset);
            const yUp = Math.max(0, y - offset);
            const yDown = Math.min(height - 1, y + offset);

            const hL = srcPixels[(y * width + xLeft) * 4];
            const hR = srcPixels[(y * width + xRight) * 4];
            const hU = srcPixels[(yUp * width + x) * 4];
            const hD = srcPixels[(yDown * width + x) * 4];

            const dX = (hL - hR) * intensity;
            const dY = (hU - hD) * intensity;
            const dZ = 255.0 / (intensity * 0.5); 

            const len = Math.sqrt(dX * dX + dY * dY + dZ * dZ);

            dstPixels[idx] = ((dX / len) + 1) * 127.5;
            dstPixels[idx + 1] = ((dY / len) + 1) * 127.5;
            dstPixels[idx + 2] = ((dZ / len) + 1) * 127.5;
            dstPixels[idx + 3] = 255;
        }
    }

    dstContext.putImageData(dstData, 0, 0);
}

/**
 * 노멀맵 텍스처 생성
 */
export function createNormalMapTexture(source, renderer, canvasWidth, canvasHeight) {
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = canvasWidth;
    normalCanvas.height = canvasHeight;
    const normalContext = normalCanvas.getContext('2d');
    
    let sourceCanvas = source;
    
    if (source instanceof THREE.WebGLRenderTarget) {
        const rtWidth = 1024;
        const rtHeight = 1024;
        
        const pixelBuffer = new Uint8Array(rtWidth * rtHeight * 4);
        renderer.readRenderTargetPixels(source, 0, 0, rtWidth, rtHeight, pixelBuffer);
        
        const flippedBuffer = new Uint8Array(rtWidth * rtHeight * 4);
        for (let y = 0; y < rtHeight; y++) {
            for (let x = 0; x < rtWidth; x++) {
                const srcIdx = (y * rtWidth + x) * 4;
                const dstIdx = ((rtHeight - 1 - y) * rtWidth + x) * 4;
                flippedBuffer[dstIdx] = pixelBuffer[srcIdx];
                flippedBuffer[dstIdx + 1] = pixelBuffer[srcIdx + 1];
                flippedBuffer[dstIdx + 2] = pixelBuffer[srcIdx + 2];
                flippedBuffer[dstIdx + 3] = pixelBuffer[srcIdx + 3];
            }
        }
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = rtWidth;
        tempCanvas.height = rtHeight;
        const tempCtx = tempCanvas.getContext('2d');
        const imageData = tempCtx.createImageData(rtWidth, rtHeight);
        imageData.data.set(flippedBuffer);
        tempCtx.putImageData(imageData, 0, 0);
        
        sourceCanvas = tempCanvas;
    }
    
    const tempNormalCanvas = document.createElement('canvas');
    tempNormalCanvas.width = sourceCanvas.width;
    tempNormalCanvas.height = sourceCanvas.height;
    const tempNormalContext = tempNormalCanvas.getContext('2d');
    heightToNormal(sourceCanvas, tempNormalContext, 4.0);
    
    normalContext.drawImage(tempNormalCanvas, 0, 0, canvasWidth, canvasHeight);
    
    return normalCanvas;
}

/**
 * 빈 텍스처 캔버스 생성
 */
export function createLeftTexture(canvasWidth, canvasHeight) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const tempContext = tempCanvas.getContext('2d');
    tempContext.fillStyle = '#000000';
    tempContext.fillRect(0, 0, canvasWidth, canvasHeight);
    return tempCanvas;
}

/**
 * 텍스처 로더 유틸
 */
export function loadTexture(path, textureLoader) {
    const texture = textureLoader.load(path);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
}

/**
 * 환경맵 로드 및 적용
 */
export function loadHDRI(path, renderer, scene) {
    return new Promise((resolve) => {
        const { RGBELoader } = require('three/examples/jsm/loaders/RGBELoader.js');
        const rgbeLoader = new RGBELoader();
        
        rgbeLoader.load(path, (texture) => {
            const pmremGenerator = new THREE.PMREMGenerator(renderer);
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            scene.background = envMap;
            scene.environment = envMap;
            pmremGenerator.dispose();
            resolve(envMap);
        });
    });
}
