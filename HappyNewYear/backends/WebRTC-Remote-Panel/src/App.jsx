import { useState, useRef, useEffect } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";

// Import local components
import SignalingClientPanel from "./components/SignalingClientPanel";
import MediaPanel from "./components/MediaPanel";
import ControlPanel from "./components/ControlPanel";

// Handles and util fonctions
import WebRTCConnection from "./utils/webRTCConnection";
import SignalingClient from "./utils/signalingClient";

import "./css/main.css";

function App() {
	// App state management à la React
	const [port, setPort] = useState(0);
	const [address, setAddress] = useState("ws://127.0.0.1");
	const [webSocketClients, setWebSocketClients] = useState([]);
	const [connectedToServer, setConnectedToServer] = useState(false);
	const [mouseDataChannel, setMouseDataChannel] = useState();
	const [keyboardDataChannel, setKeyboardDataChannel] = useState();
	const [signalingClient, setSignalingClient] = useState();
	const [webRTCConnection, setWebRTCConnection] = useState();

	

	/************************************************************************
	 * React app rendering
	 */
	// We need to use the useEffect hook in order to not open a ws at every refresh
	useEffect(() => {
		// WebSocket initialization (runs once on mount)
		const ws = new WebSocket("wss://notyet-c56d3a74349c.herokuapp.com:443");
		
		ws.addEventListener("open", () => {
			console.log("websocket opened");
		});

		ws.addEventListener("message", (event) => {
			if (event.data == 'ping') {
				ws.send('pong')
				return
			}
			
			try {
				const data = JSON.parse(event.data);
				if (data.type === "connection") {
					setPort(data.webrtcport);
					console.log("Set port to", data.webrtcport);
				}
			} catch (e) {
				// If not JSON, ignore
			}
			
			console.log("Received message:", event.data);
		});
		
		console.log("App initialized");
	}, []);

	useEffect(() => {
		if(port !== 0) {
			// Instantiate Websocket and bing its handlers
			let signalingClient = new SignalingClient(
				address,
				port,
				setWebSocketClients,
				setConnectedToServer
			);
			let webRTCConnection = new WebRTCConnection(
				signalingClient,
				setMouseDataChannel,
				setKeyboardDataChannel
			);

			setSignalingClient(signalingClient);
			setWebRTCConnection(webRTCConnection);

			// Cleanup on unmount
			return () => {
				ws.close();
				// Close websocket
				// signalingClient.close();
			};
		}
	}, [port]);

	return (
		<Container id="tdApp" maxWidth="xl">
			<CssBaseline />
			<Grid container spacing={{ xl: 2 }} columns={{ xl: 1 }}>
				<div className="signalingClientPanel">
					<SignalingClientPanel
						address={address}
						port={port}
						clients={webSocketClients}
						connectedToServer={connectedToServer}
						signalingClient={signalingClient}
						webRTCConnection={webRTCConnection}
						setPortHandler={setPort}
						setAddressHandler={setAddress}
					/>
				</div>
				<div className="mainContainer">
					<div className="sliders">
						<ControlPanel></ControlPanel>
					</div>
					<div className="MediaPanel">
						<MediaPanel
							mouseDataChannel={mouseDataChannel}
							keyboardDataChannel={keyboardDataChannel}
						/>
					</div>
				</div>
			</Grid>
		</Container>
	);
}

export default App;
