import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CreatingPage from './pages/CreatingPage'
import MainPage from './pages/MainPage'
import RenderingPage from './pages/RenderingPage'
import ResultPage from './pages/ResultPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/create" element={<CreatingPage />} />
        <Route path="/rendering" element={<RenderingPage />} />
        <Route path="/result" element={<ResultPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
