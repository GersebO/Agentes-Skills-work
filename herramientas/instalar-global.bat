@echo off
REM ============================================================
REM  Instala lo COMUN (sirve en todos los proyectos) a nivel de usuario.
REM  Se corre UNA vez por PC. Uso, desde la raiz de Agentes-Skills-work:
REM      herramientas\instalar-global.bat
REM  Lo que ya exista se respalda como *.bak-NNNN (no se borra).
REM ============================================================
setlocal
set "TK=%~dp0.."
for %%I in ("%TK%") do set "TK=%%~fI"
set "HOME=%USERPROFILE%"

REM          destino (en tu usuario)                 origen (en el repo)
call :link   "%HOME%\.claude\skills"                 "comun\skills"
call :link   "%HOME%\.claude\agents"                 "comun\agents"
call :link   "%HOME%\.config\opencode\agent"         "comun\generado\opencode"
call :link   "%HOME%\.gemini\config\skills"          "comun\skills"

echo.
echo Listo. Lo de comun\ ya esta disponible en todos tus proyectos.
exit /b 0

:link
set "DEST=%~1"
set "SRC=%TK%\%~2"
if not exist "%SRC%" mkdir "%SRC%"
for %%P in ("%DEST%\..") do if not exist "%%~fP" mkdir "%%~fP"
if exist "%DEST%" (
  fsutil reparsepoint query "%DEST%" >nul 2>&1 && (
    rmdir "%DEST%"
  ) || (
    move "%DEST%" "%DEST%.bak-%RANDOM%" >nul
    echo [respaldo] %DEST% ya existia, se renombro a .bak
  )
)
mklink /J "%DEST%" "%SRC%" >nul && echo [ok] %DEST%  -^>  %~2
exit /b 0
