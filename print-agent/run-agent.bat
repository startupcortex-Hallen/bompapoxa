@echo off
cd /d "%~dp0"
node agent.mjs
if errorlevel 1 (
  echo.
  echo O agente encerrou com erro. Confira agent.config.json e o log acima.
  pause
)
