import { useNavigate } from "react-router-dom"

function Logo() {
    const navigate = useNavigate()

    const navigateLogo = () => {
        navigate('/')
    }
    return (
        <div className='logo_container' onClick={navigateLogo}>
            <div className='logo'>
            <img alt="logo" src={"../public/images/logo_text.svg"} />
            </div>
            <div className='logo_background'>
            <img alt="logo" src={"../public/images/logo_background.png"} />
            </div>
        </div>
    )
}

export default Logo
