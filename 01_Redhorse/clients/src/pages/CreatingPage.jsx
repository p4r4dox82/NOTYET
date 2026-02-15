import Logo from '../components/Logo'
import { getImageURL } from '../utils/utils'
import '../styles/App.css'
import '../styles/CreatingPage.css'
import '../styles/Components.css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function CreatingPage() {
  const [isHovered, setIsHovered] = useState(false)
  const navigate = useNavigate()

  const navigateMakeButton = () => {
    navigate('/rendering')
  }

  return (
    <div className="main_container" data-name="Twitter post - 9" data-node-id="110:3">
      {/* Background Image */}
      <div className="bg-image" data-name="image 38" data-node-id="129:68">
        <img alt="background" src={getImageURL('main_background.png')} />
      </div>
      {/* Contents */}
        <div className='create_container'>
          <div className='draw_container'>
            <div className='draw_box'>

            </div>
            <div className='text'>
              <div>DRAW YOUR</div>
              <div>WIDH HERE</div>
            </div>
          </div>
          <div className='result_container'>
            <div className='result_box'>
              <img alt="result" src={getImageURL('horseshoe.png')} />
            </div>  
            <div className={`make_btn ${isHovered ? 'hovered' : ''}`}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={navigateMakeButton}>
              <>MADE UP MY WISHES</>
            </div>
          </div>
        </div>
      <Logo/> 
    </div>
  )
}

export default CreatingPage
