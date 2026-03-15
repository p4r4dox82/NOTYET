import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CreatingPage from './pages/CreatingPage'
import MainPage from './pages/MainPage'
import RenderingPage from './pages/RenderingPage'
import ResultPage from './pages/ResultPage'
import ShaderComparison from './components/ShaderComparison'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/create" element={<CreatingPage />} />
        <Route path="/rendering" element={<RenderingPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/shader_test" element={<ShaderComparison />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
