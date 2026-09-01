@echo off
setlocal
cd /d "%~dp0"
title Quiz Live

echo ================================================
echo   QUIZ LIVE
echo ================================================
echo.

rem Se e' presente una copia di Node.js inclusa nella cartella "tools",
rem usa quella (nessuna installazione richiesta su questo PC). Altrimenti
rem ripiega sul Node.js eventualmente gia' installato sul sistema.
if exist "%~dp0tools\node-portable\node.exe" (
    set "PATH=%~dp0tools\node-portable;%PATH%"
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERRORE] Node.js non risulta disponibile su questo PC.
    echo Scarica e installa la versione LTS da https://nodejs.org
    echo poi rilancia questo file.
    echo.
    pause
    exit /b 1
)

if not exist "server\node_modules" (
    echo Prima esecuzione su questo PC: installo le dipendenze del server...
    echo ^(serve una connessione a Internet, puo' richiedere un minuto^)
    echo.
    call npm install --prefix server
    if errorlevel 1 goto :errore
) else (
    node -e "require('./server/node_modules/better-sqlite3')" >nul 2>&1
    if errorlevel 1 (
        echo Le dipendenze del server appartengono a un altro PC o versione di Node.
        echo Le reinstallo per questo PC...
        echo.
        rmdir /s /q "server\node_modules"
        call npm install --prefix server
        if errorlevel 1 goto :errore
    )
)

if not exist "client\node_modules" (
    echo Prima esecuzione su questo PC: installo le dipendenze dell'interfaccia...
    echo.
    call npm install --prefix client
    if errorlevel 1 goto :errore
)

echo Preparo l'interfaccia...
call npm run build --prefix client
if errorlevel 1 goto :errore

echo.
echo ================================================
echo   Server in avvio! Tra un istante si aprira'
echo   il browser. NON chiudere questa finestra
echo   finche' il quiz e' in corso.
echo ================================================
echo.

start "" cmd /c "timeout /t 2 >nul && start http://localhost:3001"
call npm start --prefix server

echo.
echo Il server si e' fermato.
pause
exit /b 0

:errore
echo.
echo ================================================
echo   Qualcosa e' andato storto. Leggi il messaggio
echo   sopra per capire cosa e' successo, poi riprova.
echo ================================================
pause
exit /b 1
