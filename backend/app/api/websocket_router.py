"""
WebSocket endpoint for live cyclone updates.

Pushes real-time storm updates, new forecasts, and alerts to connected clients.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter()

# Connected clients
_clients: Set[WebSocket] = set()


@router.websocket("/live")
async def websocket_live(websocket: WebSocket):
    """
    Live WebSocket connection for real-time storm updates.

    Messages sent to clients:
    - {"type": "storm_update", "data": {...}}     - Updated storm parameters
    - {"type": "forecast_update", "data": {...}}  - New forecast available
    - {"type": "alert", "data": {...}}            - RI alert, new cyclone, etc.
    - {"type": "data_status", "data": {...}}      - Data source health change
    - {"type": "heartbeat", "timestamp": "..."}   - Keep-alive every 30s
    """
    await websocket.accept()
    _clients.add(websocket)
    logger.info("WebSocket client connected. Total: %d", len(_clients))

    try:
        # Send initial state
        await websocket.send_json({
            "type": "connection",
            "message": "Connected to IMD Cyclone Detector live feed",
            "demo_mode": True,
        })

        # Keep-alive loop
        while True:
            try:
                # Wait for client messages (e.g., subscription preferences)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                msg = json.loads(data)
                logger.debug("Received from client: %s", msg)
            except asyncio.TimeoutError:
                # Send heartbeat
                await websocket.send_json({
                    "type": "heartbeat",
                    "timestamp": asyncio.get_event_loop().time(),
                })
    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(websocket)
        logger.info("WebSocket client disconnected. Total: %d", len(_clients))


async def broadcast(message: dict):
    """Broadcast a message to all connected WebSocket clients."""
    dead = set()
    for ws in _clients:
        try:
            await ws.send_json(message)
        except Exception:
            dead.add(ws)
    _clients -= dead
