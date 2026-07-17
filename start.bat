@echo off
setlocal enabledelayedexpansion

pushd "%~dp0"

echo Installing root dev dependencies...
call npm install

echo Installing backend dependencies...
call npm install --prefix backend

echo Installing frontend dependencies...
call npm install --prefix frontend

echo Starting dev servers...
call npm run dev

popd
