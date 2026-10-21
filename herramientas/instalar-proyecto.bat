@echo off
REM ============================================================
REM  Vincula lo de UN proyecto (proyectos\<nombre>) a su carpeta de trabajo.
REM  Uso, desde la raiz de Agentes-Skills-work:
REM      herramientas\instalar-proyecto.bat barnard-sgsi "C:\ruta\barnard-sgsi"
REM  Si proyectos\<nombre> no existe, crea la estructura vacia (proyecto nuevo).
REM  Lo que ya exista en el proyecto se respalda como *.bak-NNNN (no se borra).
REM ============================================================
setlocal
if "%~2"=="" (
  echo Uso: herramientas\instalar-proyecto.bat ^<nombre^> "C:\ruta\al\proyecto"
  echo Proyectos disponibles:
  dir /b "%~dp0..\proyectos"
  exit /b 1
)
set "TK=%~dp0.."
for %%I in ("%TK%") do set "TK=%%~fI"
set "NOMBRE=%~1"
set "PR=%~2"
set "BASE=proyectos\%NOMBRE%"

if not exist "%PR%" (
  echo No existe la carpeta del proyecto: %PR%
  exit /b 1
)
if not exist "%TK%\%BASE%" (
  echo Proyecto nuevo: creando %BASE%\ con skills, agents y generado
  mkdir "%TK%\%BASE%\skills" "%TK%\%BASE%\agents" "%TK%\%BASE%\generado\opencode" "%TK%\%BASE%\generado\antigravity"
)

REM          destino (en el proyecto)   origen (en el repo)
call :link   ".claude\skills"           "%BASE%\skills"
call :link   ".claude\agents"           "%BASE%\agents"
call :link   ".opencode\agent"          "%BASE%\generado\opencode"
call :link   ".agents\workflows"        "%BASE%\generado\antigravity"
call :link   ".agents\skills"           "%BASE%\skills"

echo.
echo Listo. Agrega esto al .gitignore del proyecto:
echo     .claude/skills
echo     .claude/agents
echo     .opencode/agent
echo     .agents/
exit /b 0

:link
set "DEST=%PR%\%~1"
set "SRC=%TK%\%~2"
if not exist "%SRC%" mkdir "%SRC%"
for %%P in ("%DEST%\..") do if not exist "%%~fP" mkdir "%%~fP"
if exist "%DEST%" (
  fsutil reparsepoint query "%DEST%" >nul 2>&1 && (
    rmdir "%DEST%"
  ) || (
    move "%DEST%" "%DEST%.bak-%RANDOM%" >nul
    echo [respaldo] %~1 ya existia, se renombro a .bak
  )
)
mklink /J "%DEST%" "%SRC%" >nul && echo [ok] %~1  -^>  %~2
exit /b 0
