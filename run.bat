@echo off
echo Iniciando Sistema de Aluguel...
echo.

REM Verifica se o ambiente virtual existe
if not exist venv (
    echo Criando ambiente virtual...
    python -m venv venv
)

REM Ativa o ambiente virtual
call venv\Scripts\activate

REM Instala dependencias se necessario
echo Verificando dependencias...
pip install -r requirements.txt -q

REM Copia .env se nao existir
if not exist .env (
    echo Criando arquivo .env...
    copy .env.example .env
)

echo.
echo Iniciando servidor em http://localhost:5000
echo Pressione Ctrl+C para parar
echo.

python app.py

pause