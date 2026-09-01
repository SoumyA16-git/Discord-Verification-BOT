@echo off
echo Adding files to git...
git add .

echo Committing changes...
set /p msg="Enter commit message (press Enter for 'Auto update'): "
if "%msg%"=="" set msg=Auto update
git commit -m "%msg%"

echo Pushing to origin main...
git push -u origin main

echo.
echo Push successful!
pause
