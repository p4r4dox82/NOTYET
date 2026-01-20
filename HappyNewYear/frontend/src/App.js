import { useEffect, useRef, useState } from "react";
import "./App.css";

export default function App() {
  const [controllChan1, setControllChan1] = useState(0.5);
  const [controllChan2, setControllChan2] = useState(0.5);

  const wsRef = useRef(null);

  useEffect(() => {
    // 기존: let ws = new WebSocket(...)
    const ws = new WebSocket("wss://notyet-c56d3a74349c.herokuapp.com:443");
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      console.log("websocket opened");
    });

    ws.addEventListener("message", (event) => {
      if (event.data == 'ping') {
        ws.send('pong')
        return
      }
      // 예시: 서버가 숫자(JSON/문자열) 보내면 controlledByTD에 반영
      // 서버 포맷에 맞춰 여기만 조정하시면 됩니다.
      // let data = JSON.parse(event.data);
      // if ('chan1' in data) {
      //   let val = data['chan1']
      //   setControllChan1(val)
      // } else if ('chan2' in data) {
      //   let val = data['chan2']
      //   setControllChan2(val)
      // }
    });

    ws.addEventListener("error", (error) => {
      console.error("websocket error", error);
    });

    ws.addEventListener("close", () => {
      console.log("websocket closed");
    });

    // 컴포넌트 언마운트 시 소켓 정리 (중요)
    return () => {
      ws.close();
    };
  }, []);

  // 슬라이더1: TD를 컨트롤 → 서버로 보내고 싶으면 여기서 send
  const onChangeControllTD = (e, channelNum) => {
    const v = Number(e.target.value);
    if (channelNum == 1)
      setControllChan1(v);
    else if (channelNum ==2)
      setControllChan2(v);

    // 필요 시 서버로 전송
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      let channelName = "chan"+channelNum
      wsRef.current.send(JSON.stringify({ [channelName] : v/100 })); // 또는 JSON.stringify({ type: "...", value: v })
    }
  };

  return (
    <div className="App" style={{ padding: 24 }}>
      <h2>Slider to control TD</h2>
      <input
        type="range"
        className="controllTD1"
        min="0"
        max="100"
        value={controllChan1}
        onChange={(e) => onChangeControllTD(e, 1)}
      />
      <div>Value: {controllChan1}</div>

      <h2 style={{ marginTop: 24 }}>Slider controlled by TD</h2>
      <input
        type="range"
        className="controllTD2"
        min="0"
        max="100"
        value={controllChan2}
        onChange={(e) => onChangeControllTD(e, 2)}
      />
      <div>Value: {controllChan2}</div>
    </div>
  );
}
