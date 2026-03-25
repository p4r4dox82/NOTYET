import { useState, useEffect } from 'react'
import { getImageURL } from '../utils/utils'
import { preloadTextures } from '../utils/texturePreloader'
import '../styles/App.css'
import mainPageStyles from '../styles/MainPage.module.scss'
import Logo from '../components/Logo'
import CreatingPage from './CreatingPage'

function MainPage() {
  const [page, setPage] = useState('main') // 'main' | 'creating'
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    preloadTextures()
  }, [])

  const handleCreateCard = () => {
    setIsHovered(false)
    setPage('creating')
  }

  return (
    <div className="main_container" data-name="Twitter post - 10" data-node-id="110:22">
      {/* Background Video */}
      <div className="bg-image" data-name="video" data-node-id="129:45">
        <video autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }}>
          <source src={getImageURL('MainBackground.mp4')} type="video/mp4" />
        </video>
      </div>

      {page === 'main' ? (
        <>
          {/* Start Banner */}
          <div className={mainPageStyles.start_banner_container} data-node-id="110:37">
            <div className={mainPageStyles.logo_container}>
              <img alt="logo" src={getImageURL('logo_office_notyet_white.svg')} />
            </div>
            <div className={mainPageStyles.text_container}>
              <div className={mainPageStyles.main_text}>Make own happy new year invitation</div>
              <div className={mainPageStyles.sub_text_container}>
                <div className={mainPageStyles.production}></div>
                <div className={mainPageStyles.instruction_container}>
                  <div className={mainPageStyles.instruction}>
                    <div>No spam. Just New</div>
                    <div>Year greetings. </div>
                  </div>
                  <div
                    className={`${mainPageStyles['create-card-btn']} ${isHovered ? mainPageStyles.hovered : ''}`}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={handleCreateCard}
                  >
                    <>CREATE A CARD</>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <CreatingPage />
      )}

      <Logo/>
    </div>
  )
}

export default MainPage
