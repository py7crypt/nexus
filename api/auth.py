"""
/api/auth.py — POST login
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from _utils import verify_password, ADMIN_SECRET

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.post("/api/auth")
async def login(data: dict):
    username = data.get("username", "")
    password = data.get("password", "")
    if not verify_password(username, password):
        return JSONResponse({"success": False, "error": "Invalid credentials"}, status_code=401)
    return {"success": True, "token": ADMIN_SECRET, "user": {"username": username, "role": "admin"}}
