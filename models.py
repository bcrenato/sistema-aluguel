from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Usuario(UserMixin, db.Model):
    __tablename__ = 'usuarios'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    senha_hash = db.Column(db.String(200), nullable=False)
    telefone = db.Column(db.String(20))
    tipo = db.Column(db.String(20), default='locatario')  # 'locatario' ou 'proprietario'
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)

    # Relacionamentos
    imoveis = db.relationship('Imovel', backref='proprietario', lazy=True)
    contratos = db.relationship('Contrato', backref='locatario', lazy=True)

    def set_senha(self, senha):
        self.senha_hash = generate_password_hash(senha)

    def check_senha(self, senha):
        return check_password_hash(self.senha_hash, senha)

    def __repr__(self):
        return f'<Usuario {self.nome}>'


class Imovel(db.Model):
    __tablename__ = 'imoveis'

    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text)
    endereco = db.Column(db.String(200), nullable=False)
    cidade = db.Column(db.String(100), nullable=False)
    estado = db.Column(db.String(2), nullable=False)
    cep = db.Column(db.String(10))
    tipo = db.Column(db.String(20), nullable=False)  # 'apartamento', 'casa', 'comercial', 'terreno'
    quartos = db.Column(db.Integer, default=0)
    banheiros = db.Column(db.Integer, default=0)
    vagas_garagem = db.Column(db.Integer, default=0)
    area = db.Column(db.Float)  # em m²
    valor_aluguel = db.Column(db.Float, nullable=False)
    valor_condominio = db.Column(db.Float, default=0.0)
    valor_iptu = db.Column(db.Float, default=0.0)
    disponivel = db.Column(db.Boolean, default=True)
    data_cadastro = db.Column(db.DateTime, default=datetime.utcnow)
    proprietario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)

    # Relacionamentos
    contratos = db.relationship('Contrato', backref='imovel', lazy=True)
    fotos = db.relationship('FotoImovel', backref='imovel', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Imovel {self.titulo}>'


class FotoImovel(db.Model):
    __tablename__ = 'fotos_imoveis'

    id = db.Column(db.Integer, primary_key=True)
    imovel_id = db.Column(db.Integer, db.ForeignKey('imoveis.id'), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    legenda = db.Column(db.String(200))
    ordem = db.Column(db.Integer, default=0)

    def __repr__(self):
        return f'<FotoImovel {self.id}>'


class Contrato(db.Model):
    __tablename__ = 'contratos'

    id = db.Column(db.Integer, primary_key=True)
    imovel_id = db.Column(db.Integer, db.ForeignKey('imoveis.id'), nullable=False)
    locatario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    data_inicio = db.Column(db.Date, nullable=False)
    data_fim = db.Column(db.Date, nullable=False)
    valor_mensal = db.Column(db.Float, nullable=False)
    dia_vencimento = db.Column(db.Integer, default=5)  # Dia do mês para vencimento
    status = db.Column(db.String(20), default='ativo')  # 'ativo', 'finalizado', 'cancelado'
    observacoes = db.Column(db.Text)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)

    # Relacionamentos
    pagamentos = db.relationship('Pagamento', backref='contrato', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Contrato {self.id} - Imovel {self.imovel_id}>'


class Pagamento(db.Model):
    __tablename__ = 'pagamentos'

    id = db.Column(db.Integer, primary_key=True)
    contrato_id = db.Column(db.Integer, db.ForeignKey('contratos.id'), nullable=False)
    data_vencimento = db.Column(db.Date, nullable=False)
    data_pagamento = db.Column(db.Date)
    valor = db.Column(db.Float, nullable=False)
    valor_pago = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='pendente')  # 'pendente', 'pago', 'atrasado', 'parcial'
    forma_pagamento = db.Column(db.String(20))  # 'pix', 'boleto', 'transferencia', 'dinheiro'
    comprovante = db.Column(db.String(500))  # URL do comprovante
    observacoes = db.Column(db.Text)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Pagamento {self.id} - Contrato {self.contrato_id}>'