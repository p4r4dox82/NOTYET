/**
 * 이미지 경로를 반환하는 함수
 * 개발 환경에서는 ../public으로 시작, build 환경에서는 /로 시작
 * @param {string} imagePath - 이미지 경로 (예: images/main_image.png)
 * @returns {string} 환경에 맞는 전체 경로
 */
export const getImageURL = (imagePath) => {
  if (import.meta.env.DEV) {
    return `../public/images/${imagePath}`
  }
  return `/images/${imagePath}`
}
