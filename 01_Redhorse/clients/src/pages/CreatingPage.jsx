import '../styles/App.css'
import '../styles/CreatingPage.css'

const imgImage38 = "http://localhost:3845/assets/414d3f20c7e5868d39341dd0b3f025c314908cf1.png"
const imgScreenshot20260125At1532052 = "http://localhost:3845/assets/ff14d9e085965a4ec85496c0f8450d8700b6b960.png"
const imgLayer1 = "http://localhost:3845/assets/0a9f903d9a25c35cca1fba4f7e797b6f37742432.svg"
const imgLayer2 = "http://localhost:3845/assets/42ce6de9d2eea44ca74acdf9fc5cd0868298fd18.svg"

function CreatingPage() {
  return (
    <div className="creating-page-container" data-name="Twitter post - 9" data-node-id="110:3">
      {/* Background Image */}
      <div className="creating-bg-image" data-name="image 38" data-node-id="129:68">
        <img alt="background" src={imgImage38} />
        <img alt="background overlay" src={imgImage38} />
      </div>

      {/* Blur Card Background */}
      <div className="creating-blur-card" data-node-id="127:2" />

      {/* Screenshot Image */}
      <div className="creating-screenshot" data-name="Screenshot 2026-01-25 at 15.32.05 2" data-node-id="128:24">
        <img alt="screenshot" src={imgScreenshot20260125At1532052} />
      </div>

      {/* Black Drawing Canvas */}
      <div className="creating-canvas-black" data-node-id="127:4" />

      {/* Logo 1 */}
      <div className="creating-logo-1" data-name="Layer_1" data-node-id="110:5">
        <img alt="logo" src={imgLayer1} />
      </div>

      {/* Logo 2 */}
      <div className="creating-logo-2" data-name="Layer_1" data-node-id="110:9">
        <img alt="logo" src={imgLayer2} />
      </div>

      {/* MAKE Text */}
      <p className="creating-make-text" data-node-id="114:57">
        MAKE
      </p>

      {/* First, Draw your wish Text */}
      <p className="creating-draw-text" data-node-id="114:59">
        First, Draw your wish
      </p>

      {/* And.... Make your Card Text */}
      <p className="creating-card-text" data-node-id="127:19">
        And.... Make your Card
      </p>

      {/* Note Section */}
      <div className="creating-note" data-node-id="133:6">
        <p>카드 제작 화면</p>
        <ul>
          <li>디자인 디벨롭 중</li>
        </ul>
      </div>
    </div>
  )
}

export default CreatingPage
