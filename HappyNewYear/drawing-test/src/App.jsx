import React, { Suspense } from 'react'
import './App.css'
import { ShaderComparison } from '../react/components'

// DrawingApp을 동적으로 로드 (에러 격리)
const DrawingApp = React.lazy(() => 
  import('../react/components/DrawingApp').catch(err => {
    console.error('DrawingApp 로드 에러:', err)
    return { default: () => <div style={{ color: 'red', padding: '20px' }}>에러: {err.message}</div> }
  })
)

function App() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', paddingTop: '50px' }}>로딩 중...</div>}>
      {/* <DrawingApp /> */}
      <ShaderComparison />
    </Suspense>
  )
}

export default App
