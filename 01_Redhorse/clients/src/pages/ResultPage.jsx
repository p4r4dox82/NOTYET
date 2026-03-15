import Logo from '../components/Logo'
import '../styles/ResultPage.css'
import '../styles/App.css'
import { useNavigate, useLocation } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import html2canvas from 'html2canvas'
import { useFootPrint } from '../hooks/useFootPrint'
import { processImageToNormalMap } from '../utils/imageProcessing'

function ResultPage(imageQuery) {
  const navigate = useNavigate()
  const location = useLocation()
  const newYearCardRef = useRef(null)
  const resultImage = location.state?.resultImage
  
  // useFootPrint용 refs
  const footprintCanvasRef = useRef(null)
  const [normalMapTexture, setNormalMapTexture] = useState(null)
  const [originalTexture, setOriginalMapTexture] = useState(null)
  const [lightIntensity, setLightIntensity] = useState(3)
  
  // useFootPrint 훅 사용
  const footprintMethods = useFootPrint(newYearCardRef, footprintCanvasRef, normalMapTexture, originalTexture)

  // 조명 밝기 변경 시 적용
  useEffect(() => {
    if (footprintMethods && footprintMethods.setLightIntensity) {
      footprintMethods.setLightIntensity(lightIntensity)
    }
  }, [lightIntensity, footprintMethods])

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
  }, [normalMapTexture, originalTexture])

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
    if (!newYearCardRef.current) return
    
    try {
      const canvas = await html2canvas(newYearCardRef.current)
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = 'NewYearCard.png'
      link.click()
    } catch (error) {
      alert('이미지 저장에 실패했습니다.')
      console.error(error)
    }
  }

  const exportNormalMap = () => {
    if (footprintMethods && footprintMethods.exportNormalMapImage) {
      footprintMethods.exportNormalMapImage()
    }
  }

  return (
    <div className="main_container" data-name="Twitter post - 9" data-node-id="110:3">
      {/* 조명 밝기 슬라이더 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: '10px 15px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <label style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
          Light:
        </label>
        <input 
          type="range" 
          min="0" 
          max="5" 
          step="0.1" 
          value={lightIntensity}
          onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
          style={{ width: '100px', cursor: 'pointer' }}
        />
        <span style={{ color: '#fff', fontSize: '12px', minWidth: '30px' }}>
          {lightIntensity.toFixed(1)}
        </span>
      </div>

      <div className='layout_container'>
        <div className='NewYearCard' ref={newYearCardRef}>
          {/* 3D 렌더링 컨테이너 */}
            <canvas 
              ref={footprintCanvasRef}
              style={{
                display: 'block',
                width: '100%',
                height: '100%'
              }}
            />
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
          <div className='ExportButton' onClick={exportNormalMap}>
            <>export normalmap</>
          </div>
        </div>
      </div>
      <Logo color="white"/>
    </div>
  )
}

export default ResultPage
