import React from 'react'
import { useNavigate } from "react-router-dom"
import { getImageURL } from '../utils/utils'
import componentsStyles from '../styles/Components.module.scss'

const Logo = React.memo(function Logo({ color }) {
    const navigate = useNavigate()

    const navigateLogo = () => {
        navigate('/')
    }
    return (
        <div className={componentsStyles.logo_container_main} onClick={navigateLogo}>
            <div className={componentsStyles.logo}>
                {color === 'white' ? (
                    <img alt="logo" src={getImageURL('logo_office_notyet_pure_white.svg')} />
                ) : (
                    <img alt="logo" src={getImageURL('logo_office_notyet.svg')} />
                )}
            </div>
            {/* <div className={componentsStyles.logo_background}>
            <img alt="logo" src={getImageURL('logo_background.png')} />
            </div> */}
        </div>
    )
})

export default Logo
