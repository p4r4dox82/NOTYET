import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CreatingPage from './pages/CreatingPage'
import MainPage from './pages/MainPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/create" element={<CreatingPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
