@echo off
echo ============================================================
echo   PRIFINITY - Push to GitHub
echo ============================================================
echo.

:: Ensure we are in the correct directory
cd /d "%~dp0"

:: Initialize Git if it doesn't exist
if not exist .git (
    echo [1/4] Initializing Git repository...
    git init
) else (
    echo [1/4] Git repository already initialized.
)

:: Set remote URL
echo [2/4] Setting remote URL to: https://github.com/eyuteshome5-beep/prifinty.git
git remote remove origin 2>nul
git remote add origin https://github.com/eyuteshome5-beep/prifinty.git

:: Add and commit
echo [3/4] Staging and committing files...
git add .
git commit -m "Push everything to eyuteshome5-beep/prifinty"

:: Push to remote
echo [4/4] Pushing to GitHub (this may prompt for credentials)...
git branch -M main
git push -u origin main

echo.
echo ============================================================
echo   Done! Please check the output above for any errors.
echo ============================================================
pause
