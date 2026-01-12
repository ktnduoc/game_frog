@echo off
title Frog Tongue Game Server
echo ========================================
echo    FROG TONGUE GAME - Local Server
echo ========================================
echo.
echo Starting server at http://localhost:9999
echo Press Ctrl+C to stop the server
echo.
start http://localhost:9999
npx serve . -p 9999
