import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/App.css'

function MainPage() {
  const [isHovered, setIsHovered] = useState(false)
  const navigate = useNavigate()

  const handleCreateCard = () => {
    navigate('/create')
  }

  return (
    <div className="twitter-post-container" data-name="Twitter post - 10" data-node-id="110:22">
      {/* Background Image */}
      <div className="bg-image" data-name="image 38" data-node-id="129:45">
        <img alt="background" src={"../public/images/main_image.png"} />
      </div>

      {/* Blur Card Background */}
      <div className="blur-card" data-node-id="110:37">
        <button
          className={`create-card-btn ${isHovered ? 'hovered' : ''}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleCreateCard}
        >
          CREATE A CARD
        </button>
      </div>
    </div>
  )
}

export default MainPage
