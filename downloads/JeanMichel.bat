@echo off
echo ========================================
echo    Jean-Michel Pointeur - Lancement
echo ========================================
echo.

REM Creer un dossier temp pour le jeu
set "GAME_DIR=%TEMP%\JeanMichel_Game"
echo Preparation du dossier temporaire...
if exist "%GAME_DIR%" rmdir /S /Q "%GAME_DIR%"
mkdir "%GAME_DIR%"

REM Copier tous les fichiers necessaires
echo Copie des fichiers du jeu...
copy /Y "%~dp0JeanMichel" "%GAME_DIR%\" >nul
if errorlevel 1 (
    echo ERREUR: Impossible de copier JeanMichel
    pause
    exit /b 1
)

xcopy /E /I /Q /Y "%~dp0images" "%GAME_DIR%\images\" >nul
if errorlevel 1 (
    echo ERREUR: Impossible de copier le dossier images
    pause
    exit /b 1
)

xcopy /E /I /Q /Y "%~dp0game" "%GAME_DIR%\game\" >nul
if errorlevel 1 (
    echo ERREUR: Impossible de copier le dossier game
    pause
    exit /b 1
)

echo Fichiers copies avec succes!
echo.

REM Convertir le chemin pour WSL (support multi-lecteurs)
set "WSL_PATH=%GAME_DIR:\=/%"
set "WSL_PATH=%WSL_PATH:C:=/mnt/c%"
set "WSL_PATH=%WSL_PATH:D:=/mnt/d%"
set "WSL_PATH=%WSL_PATH:E:=/mnt/e%"
set "WSL_PATH=%WSL_PATH:F:=/mnt/f%"
set "WSL_PATH=%WSL_PATH:G:=/mnt/g%"

REM Lancer le jeu via WSL
echo Lancement de JeanMichel...
echo.
cd /d "%GAME_DIR%"
wsl python3 "%WSL_PATH%/JeanMichel"

if errorlevel 1 (
    echo.
    echo ========================================
    echo ERREUR: Impossible de lancer le jeu
    echo ========================================
    echo.
    echo Verifications necessaires:
    echo 1. WSL est-il installe? (tapez 'wsl --version' dans PowerShell)
    echo 2. Python3 est-il installe dans WSL? (tapez 'wsl python3 --version')
    echo 3. Les bibliotheques sont-elles installees? (voir README.md)
    echo.
    echo Si WSL n'est pas installe, ouvrez PowerShell en admin et tapez:
    echo    wsl --install
    echo.
    pause
    exit /b 1
)

REM Nettoyage optionnel (decommente pour supprimer les fichiers temp)
REM echo Nettoyage...
REM rmdir /S /Q "%GAME_DIR%"

echo.
echo Programme termine.
pause
