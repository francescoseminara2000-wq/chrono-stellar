@echo off
echo Avvio di Chrono Stellar...

echo Avvio Backend in una nuova finestra...
start cmd /k "cd backend && npm run dev"

echo Avvio Frontend in una nuova finestra...
start cmd /k "cd frontend && npm run dev"

echo Servizi avviati.
pause
