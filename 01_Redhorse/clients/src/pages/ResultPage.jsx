import Logo from '../components/Logo'
import '../styles/ResultPage.css'
import '../styles/App.css'
import { useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import html2canvas from 'html2canvas'
import { getImageURL } from '../utils/utils'

function ResultPage(imageQuery) {
  const navigate = useNavigate()
  const newYearCardRef = useRef(null)

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

  return (
    <div className="main_container" data-name="Twitter post - 9" data-node-id="110:3">
      <div className='layout_container'>
        <div className='NewYearCard' ref={newYearCardRef}>
          <img alt="result" src={getImageURL('horseshoe.png')} />
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
