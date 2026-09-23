@rem Gradle wrapper
@if "%DEBUG%"=="" @echo off
setlocal
set DIR=%~dp0
if exist "%DIR%gradle\wrapper\gradle-wrapper.jar" ( java -jar "%DIR%gradle\wrapper\gradle-wrapper.jar" %* ) else ( gradle %* )
endlocal
