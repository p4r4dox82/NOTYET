import asyncio
import websockets

async def echo(ws):
    print("client connected")
    try:
        async for msg in ws:
            print("recv:", msg)
            await ws.send(msg)  # 그대로 되돌려주기
    except websockets.ConnectionClosed:
        print("client disconnected")

async def main():
    async with websockets.serve(echo, "127.0.0.1", 8765):
        print("ws://127.0.0.1:8765")
        await asyncio.Future()  # run forever

asyncio.run(main())
