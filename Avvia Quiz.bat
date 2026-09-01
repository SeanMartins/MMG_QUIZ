@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Quiz Live

echo ================================================
echo   QUIZ LIVE
echo ================================================
echo.

rem Rileva se questa cartella gira da una chiavetta USB (il database del
rem quiz puo' bloccarsi o rischiare danni se eseguito da li' durante un
rem evento). Get-Volume riporta il tipo in inglese sempre, a prescindere
rem dalla lingua di Windows, a differenza di "fsutil" che e' localizzato.
set "SCRIPTDRIVE=%~d0"
set "DRIVELETTER=%SCRIPTDRIVE:~0,1%"
set "DRIVETYPE="
for /f "usebackq delims=" %%D in (`powershell -NoProfile -Command "(Get-Volume -DriveLetter '%DRIVELETTER%' -ErrorAction SilentlyContinue).DriveType" 2^>nul`) do set "DRIVETYPE=%%D"

if /i "%DRIVETYPE%"=="Removable" (
    echo ================================================
    echo   ATTENZIONE: stai avviando da una chiavetta USB
    echo ================================================
    echo Il database del quiz ^(dove sono salvati punteggi e risposte^)
    echo puo' bloccarsi o rischiare danni se eseguito direttamente da
    echo una chiavetta durante un evento dal vivo.
    echo.
    echo Consigliato: copiarla ora sul Desktop e avviarla da li'.
    echo.
    set /p "COPIA=Copiare sul Desktop e avviare da li' adesso? [S/N]: "
    if /i "!COPIA!"=="S" (
        set "DEST=%USERPROFILE%\Desktop\Quiz Live"
        echo.
        echo Copio in "!DEST!"...
        robocopy "%~dp0." "!DEST!" /E /XD ".git" /NFL /NDL /NJH /NJS >nul
        echo Fatto.
        echo.
        echo D'ora in poi lavora sulla copia nel Desktop, non su questa
        echo chiavetta, per evitare di avere due versioni scollegate.
        echo.
        pause
        start "" "!DEST!\Avvia Quiz.bat"
        exit /b 0
    )
    echo Continuo comunque dalla chiavetta...
    echo.
)

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
echo   Server in avvio^^! Tra un istante si aprira'
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
