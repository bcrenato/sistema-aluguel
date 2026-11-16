# Sistema de Aluguel de Imóveis

Sistema web simples para gestão de aluguel de imóveis, desenvolvido com Flask, SQLAlchemy e Bootstrap 5.

## Funcionalidades

### Para Proprietários
- ✅ Cadastro e gerenciamento de imóveis (com fotos, detalhes, valores)
- ✅ Criação de contratos de aluguel com geração automática de pagamentos mensais
- ✅ Controle de pagamentos (pendentes, pagos, atrasados, parciais)
- ✅ Finalização de contratos com liberação automática do imóvel
- ✅ Dashboard com estatísticas em tempo real
- ✅ Relatórios gerenciais (recebimentos, inadimplência, imóveis vagos)

### Para Locatários (Inquilinos)
- ✅ Visualização de contratos ativos
- ✅ Acompanhamento de pagamentos
- ✅ Registro de pagamentos realizados
- ✅ Dashboard pessoal

## Tecnologias

- **Backend**: Flask 3.0, Flask-SQLAlchemy, Flask-Login
- **Banco de Dados**: SQLite (desenvolvimento) / PostgreSQL (produção)
- **Frontend**: Bootstrap 5.3, Bootstrap Icons
- **Autenticação**: Werkzeug Security (hash de senhas)

## Instalação

### Pré-requisitos
- Python 3.8+
- pip

### Passos

1. Clone o repositório:
```bash
git clone https://github.com/bcrenato/sistema-aluguel.git
cd sistema-aluguel
```

2. Crie e ative o ambiente virtual:
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

3. Instale as dependências:
```bash
pip install -r requirements.txt
```

4. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

5. Execute a aplicação:
```bash
python app.py
```

6. Acesse no navegador: http://localhost:5000

## Estrutura do Projeto

```
sistema-aluguel/
├── app.py              # Aplicação principal
├── config.py           # Configurações
├── models.py           # Modelos do banco de dados
├── requirements.txt    # Dependências Python
├── .env.example        # Exemplo de variáveis de ambiente
├── .gitignore          # Arquivos ignorados pelo Git
├── templates/          # Templates HTML (Jinja2)
│   ├── base.html       # Template base
│   ├── index.html      # Página inicial
│   ├── login.html      # Login
│   ├── registro.html   # Cadastro
│   ├── dashboard_proprietario.html
│   ├── dashboard_locatario.html
│   ├── imoveis/
│   │   ├── lista.html
│   │   └── form.html
│   ├── contratos/
│   │   ├── lista.html
│   │   └── form.html
│   ├── pagamentos/
│   │   ├── lista.html
│   │   └── pagar.html
│   └── relatorios.html
└── README.md
```

## Modelos de Dados

### Usuario
- Proprietário ou Locatário
- Autenticação com email/senha

### Imovel
- Título, descrição, endereço completo
- Tipo (apartamento, casa, comercial, terreno)
- Características (quartos, banheiros, vagas, área)
- Valores (aluguel, condomínio, IPTU)
- Fotos (URLs)
- Status (disponível/alugado)

### Contrato
- Vincula imóvel + locatário
- Período (início/fim)
- Valor mensal e dia de vencimento
- Geração automática de pagamentos mensais

### Pagamento
- Vinculado a contrato
- Data de vencimento e pagamento
- Valor total e valor pago
- Status (pendente, pago, atrasado, parcial)
- Forma de pagamento e comprovante

## Uso

1. **Cadastre-se** como Proprietário ou Locatário
2. **Proprietário**: Cadastre imóveis → Crie contratos → Acompanhe pagamentos
3. **Locatário**: Visualize contratos → Registre pagamentos

## Deploy em Produção

Para produção, recomenda-se:

1. Use PostgreSQL/MySQL em vez de SQLite
2. Configure `SECRET_KEY` forte no `.env`
3. Use gunicorn/uWSGI + Nginx
4. Configure HTTPS
5. Use variáveis de ambiente para configurações sensíveis

Exemplo com gunicorn:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

## Licença

Este projeto é open source sob a licença MIT.

## Contribuição

1. Faça um fork
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

Desenvolvido com ❤️ para facilitar a gestão de aluguéis.