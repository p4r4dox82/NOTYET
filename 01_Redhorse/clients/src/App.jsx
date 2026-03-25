import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import CreatingPage from './pages/CreatingPage'
import MainPage from './pages/MainPage'
import ResultPage from './pages/ResultPage'
import ShaderComparison from './components/ShaderComparison'
import { getImageURL } from './utils/utils'

function App() {
  useEffect(() => {
    // Favicon 동적으로 설정
    const link = document.querySelector("link[rel~='icon']")
    if (link) {
      link.href = getImageURL('logo_office_notyet.svg')
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/shader_test" element={<ShaderComparison />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
