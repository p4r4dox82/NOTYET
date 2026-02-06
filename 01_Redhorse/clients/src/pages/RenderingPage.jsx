import '../styles/RenderingPage.css'
import '../styles/App.css'
import Logo from '../components/Logo'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

function RenderingPage() {
    const [isHovered, setIsHovered] = useState(false)
    const navigate = useNavigate()

    const navigateMakeButton = () => {
        navigate('/result')
    }
    return (
        <div className="rendering-page-container">
            
            <div className='layout_container'>
                <Logo />
                <div className={`result_btn ${isHovered ? 'hovered' : ''}`}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={navigateMakeButton}>
                    <>DONE</>
                </div>
            </div>
        </div>
    )
}

export default RenderingPage
