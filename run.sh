#!/bin/bash

echo "Iniciando Sistema de Aluguel..."
echo

# Verifica se o ambiente virtual existe
if [ ! -d "venv" ]; then
    echo "Criando ambiente virtual..."
    python3 -m venv venv
fi

# Ativa o ambiente virtual
source venv/bin/activate

# Instala dependências se necessário
echo "Verificando dependências..."
pip install -r requirements.txt -q

# Copia .env se não existir
if [ ! -f ".env" ]; then
    echo "Criando arquivo .env..."
    cp .env.example .env
fi

echo
echo "Iniciando servidor em http://localhost:5000"
echo "Pressione Ctrl+C para parar"
echo

python app.py