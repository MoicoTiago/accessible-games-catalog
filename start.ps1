$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "Installing root dev dependencies..." -ForegroundColor Cyan
npm install

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
npm install --prefix backend

Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
npm install --prefix frontend

Write-Host "Starting dev servers..." -ForegroundColor Green
npm run dev
