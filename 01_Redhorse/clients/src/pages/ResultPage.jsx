import Logo from '../components/Logo'
import '../styles/ResultPage.css'
import '../styles/App.css'
import { useNavigate, useLocation } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import html2canvas from 'html2canvas'
import { useFootPrint } from '../hooks/useFootPrint'
import { processImageToNormalMap } from '../utils/imageProcessing'
import { getImageURL } from '../utils/utils'

function ResultPage(imageQuery) {
  const navigate = useNavigate()
  const location = useLocation()
  const newYearCardRef = useRef(null)
  const resultImage = location.state?.resultImage
  const senderName = location.state?.senderName
  
  // useFootPrint용 refs
  const footprintCanvasRef = useRef(null)
  const [normalMapTexture, setNormalMapTexture] = useState(null)
  const [originalTexture, setOriginalMapTexture] = useState(null)
  
  // useFootPrint 훅 사용
  const footprintMethods = useFootPrint(newYearCardRef, footprintCanvasRef, normalMapTexture, originalTexture)

  // 받은 이미지를 normalMapTexture로 변환
  useEffect(() => {
    if (!resultImage) return

    processImageToNormalMap(resultImage, setNormalMapTexture, setOriginalMapTexture)
  }, [resultImage])

  // normalMapTexture가 준비되면 useFootPrint에 적용
  useEffect(() => {
    console.log('normalMapTexture updated:', normalMapTexture)
    console.log('originalTexture updated:', originalTexture)  
    console.log('footprintMethods:', footprintMethods)
    if (normalMapTexture && footprintMethods && footprintMethods.updateNormalMap) {
      console.log('Calling updateNormalMap')
      footprintMethods.updateNormalMap(normalMapTexture)
    }
    if (originalTexture && footprintMethods && footprintMethods.updateOriginalMap) {
      console.log('Calling updateOriginalMap')
      footprintMethods.updateOriginalMap(originalTexture)
    }
  }, [normalMapTexture])

  const navigateRetry = () => {
      navigate('/')
  }

  const copyLink = () => {
    const currentUrl = window.location.href
    navigator.clipboard.writeText(currentUrl).then(() => {
      alert('링크가 복사되었습니다!')
    }).catch(() => {
      alert('복사 실패. 다시 시도해주세요.')
    })
  }

  const exportCardAsImage = async () => {
    try {
      const blob = await footprintMethods.takeScreenshot(senderName ? `By. ${senderName}` : '')
      
      if (!blob) {
        alert('스크린샷 생성 실패')
        return
      }
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'NewYearCard.png'
      link.click()
      
      // 메모리 정리
      URL.revokeObjectURL(url)
    } catch (error) {
      alert('이미지 저장에 실패했습니다.')
      console.error(error)
    }
  }

  return (
    <div className="main_container" data-name="Twitter post - 9" data-node-id="110:3">
      {/* 디버깅: 원본 이미지 표시 */}
      {resultImage && (
        <img 
          src={resultImage} 
          style={{
            position: 'fixed',
            top: 10,
            left: 10,
            width: '200px',
            height: 'auto',
            border: '2px solid red',
            zIndex: 9999,
            backgroundColor: 'white'
          }}
          alt="Debug: Original Image"
        />
      )}
      {/* 조명 밝기 슬라이더 */}
      <div className='layout_container'>
        <div className='NewYearCard' ref={newYearCardRef}>
          {/* 3D 렌더링 컨테이너 */}
            <canvas 
              ref={footprintCanvasRef}
              width={1024}
              height={1448}
              style={{
                display: 'block',
                width: '100%',
                height: '100%'
              }}
            />
            <img 
              src={getImageURL('CardText.svg')}
              className = "CardTextOverlay"
              alt="Card Text Overlay"
            />
            <div className="sender_name">
              By. {senderName}
            </div>
        </div>
        <div className='button_container'>
          <div className='RetryButton' onClick={navigateRetry}>
            <>RETRY</>
          </div>
          <div className='CopyLinkButton' onClick={copyLink}>
            <>COPY THE LINK</>
          </div>
          <div className='ExportButton' onClick={exportCardAsImage}>
            <>export for card</>
          </div>
        </div>
      </div>
      <Logo color="white"/>
    </div>
  )
}

export default ResultPage
