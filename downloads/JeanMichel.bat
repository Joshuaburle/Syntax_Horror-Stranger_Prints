@echo off
echo Lancement de JeanMichel...
echo.

REM Creer un dossier temp pour le jeu
set "GAME_DIR=%TEMP%\JeanMichel_Game"
if exist "%GAME_DIR%" rmdir /S /Q "%GAME_DIR%"
mkdir "%GAME_DIR%"

REM Copier tous les fichiers necessaires
echo Preparation des fichiers...
xcopy /E /I /Q "%~dp0*" "%GAME_DIR%" >nul

REM Convertir le chemin pour WSL
set "WSL_PATH=%GAME_DIR:\=/%"
set "WSL_PATH=%WSL_PATH:C:=/mnt/c%"
set "WSL_PATH=%WSL_PATH:D:=/mnt/d%"
set "WSL_PATH=%WSL_PATH:E:=/mnt/e%"

REM Lancer le jeu
cd /d "%GAME_DIR%"
wsl python3 "%WSL_PATH%/JeanMichel"

REM Nettoyer (optionnel, garde les fichiers pour debug)
REM rmdir /S /Q "%GAME_DIR%"

if errorlevel 1 (
    echo.
    echo Erreur: Impossible de lancer le jeu.
    echo Verifiez que WSL et Python3 sont installes.
    echo.
    pause
)
