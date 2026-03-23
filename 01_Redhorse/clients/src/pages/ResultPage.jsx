import Logo from '../components/Logo'
import resultPageStyles from '../styles/ResultPage.module.scss'
import '../styles/App.css'
import { useNavigate, useLocation } from 'react-router-dom'
import { useRef, useState, useEffect, useCallback } from 'react'
import html2canvas from 'html2canvas'
import { useFootPrint } from '../hooks/useFootPrint'
import { processImageToNormalMap } from '../utils/imageProcessing'
import { getImageURL } from '../utils/utils'
import RenderingPage from './RenderingPage'

function ResultPage(imageQuery) {
  const navigate = useNavigate()
  const location = useLocation()
  const resultImage = location.state?.resultImage
  
  // RenderingPage UI 상태
  const [senderName, setSenderName] = useState('')
  const [isHovered, setIsHovered] = useState(false)
  const [isRenderingStarted, setIsRenderingStarted] = useState(false)
  
  // 3D 렌더링 상태
  const newYearCardRef = useRef(null)
  const footprintCanvasRef = useRef(null)
  const [normalMapTexture, setNormalMapTexture] = useState(null)
  const [originalTexture, setOriginalMapTexture] = useState(null)
  const audioPlayedRef = useRef(false)
  
  // useFootPrint 훅 사용
  const footprintMethods = useFootPrint(newYearCardRef, footprintCanvasRef, normalMapTexture, originalTexture)

  // 이름 입력 변경
  const handleNameChange = useCallback((e) => {
    setSenderName(e.target.value)
  }, [])

  // "Here's my name" 버튼 클릭 - 이미지 처리 시작
  const handleStartRendering = useCallback(() => {
    if (!resultImage) {
      alert('이미지를 먼저 생성해주세요.')
      return
    }
    setIsRenderingStarted(true)
  }, [resultImage])

  const handleMouseEnter = useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = useCallback(() => setIsHovered(false), [])

  // ResultPage 진입 시 사운드 재생
  useEffect(() => {
    if (audioPlayedRef.current) return // 이미 재생했으면 중복 재생 방지
    
    audioPlayedRef.current = true
    const audio = new Audio('./sounds/RenderingSound.mp3')
    window.renderingAudio = audio
    audio.play().catch(error => {
      console.error('사운드 재생 실패:', error)
    })
  }, [])

  // 렌더링 시작 시 이미지 처리
  useEffect(() => {
    if (!isRenderingStarted || !resultImage) return

    processImageToNormalMap(resultImage, setNormalMapTexture, setOriginalMapTexture)
  }, [isRenderingStarted, resultImage])

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
      setIsRenderingStarted(false)
      setSenderName('')
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
    <>
      {/* 렌더링 전: 이름 입력 화면 */}
      {!isRenderingStarted && (
        <RenderingPage onSubmit={handleStartRendering}/>
      )}
      <div className={resultPageStyles.main_container} data-name="Twitter post - 9" data-node-id="110:3">

      {/* 렌더링 후: 결과 화면 */}
      {(
        <>
          <div className={resultPageStyles.layout_container}>
            <div className={resultPageStyles.NewYearCard} ref={newYearCardRef}>
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
                className = {resultPageStyles.CardTextOverlay}
                alt="Card Text Overlay"
              />
              <div className={resultPageStyles.sender_name}>
                By. {senderName}
              </div>
            </div>
            <div className={resultPageStyles.button_container}>
              <div className={resultPageStyles.RetryButton} onClick={navigateRetry}>
                <>RETRY</>
              </div>
              <div className={resultPageStyles.CopyLinkButton} onClick={copyLink}>
                <>COPY THE LINK</>
              </div>
              <div className={resultPageStyles.ExportButton} onClick={exportCardAsImage}>
                <>export for card</>
              </div>
            </div>
          </div>
        </>
      )}

      <Logo color="white"/>
    </div>
    </>
  )
}

export default ResultPage
