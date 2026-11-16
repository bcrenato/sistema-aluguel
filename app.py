from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from config import Config
from models import db, Usuario, Imovel, FotoImovel, Contrato, Pagamento
from datetime import datetime, date, timedelta
from sqlalchemy import func

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Por favor, faça login para acessar esta página.'


@login_manager.user_loader
def load_user(user_id):
    return Usuario.query.get(int(user_id))


# Criar tabelas
with app.app_context():
    db.create_all()


# ==================== ROTAS DE AUTENTICAÇÃO ====================

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('index.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        senha = request.form.get('senha')

        usuario = Usuario.query.filter_by(email=email).first()

        if usuario and usuario.check_senha(senha):
            login_user(usuario)
            flash('Login realizado com sucesso!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Email ou senha inválidos.', 'error')

    return render_template('login.html')


@app.route('/registro', methods=['GET', 'POST'])
def registro():
    if request.method == 'POST':
        nome = request.form.get('nome')
        email = request.form.get('email')
        senha = request.form.get('senha')
        confirmar_senha = request.form.get('confirmar_senha')
        telefone = request.form.get('telefone')
        tipo = request.form.get('tipo')

        if senha != confirmar_senha:
            flash('As senhas não coincidem.', 'error')
            return render_template('registro.html')

        if Usuario.query.filter_by(email=email).first():
            flash('Email já cadastrado.', 'error')
            return render_template('registro.html')

        usuario = Usuario(nome=nome, email=email, telefone=telefone, tipo=tipo)
        usuario.set_senha(senha)

        db.session.add(usuario)
        db.session.commit()

        flash('Cadastro realizado com sucesso! Faça login.', 'success')
        return redirect(url_for('login'))

    return render_template('registro.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logout realizado com sucesso.', 'success')
    return redirect(url_for('index'))


# ==================== DASHBOARD ====================

@app.route('/dashboard')
@login_required
def dashboard():
    if current_user.tipo == 'proprietario':
        imoveis = Imovel.query.filter_by(proprietario_id=current_user.id).all()
        contratos_ativos = Contrato.query.join(Imovel).filter(
            Imovel.proprietario_id == current_user.id,
            Contrato.status == 'ativo'
        ).all()

        # Pagamentos pendentes/atrasados
        hoje = date.today()
        pagamentos_pendentes = Pagamento.query.join(Contrato).join(Imovel).filter(
            Imovel.proprietario_id == current_user.id,
            Pagamento.status.in_(['pendente', 'atrasado']),
            Pagamento.data_vencimento <= hoje
        ).count()

        # Total a receber este mês
        inicio_mes = date(hoje.year, hoje.month, 1)
        if hoje.month == 12:
            fim_mes = date(hoje.year + 1, 1, 1) - timedelta(days=1)
        else:
            fim_mes = date(hoje.year, hoje.month + 1, 1) - timedelta(days=1)

        total_receber = db.session.query(func.sum(Pagamento.valor - Pagamento.valor_pago)).join(Contrato).join(Imovel).filter(
            Imovel.proprietario_id == current_user.id,
            Pagamento.status.in_(['pendente', 'atrasado', 'parcial']),
            Pagamento.data_vencimento >= inicio_mes,
            Pagamento.data_vencimento <= fim_mes
        ).scalar() or 0

        return render_template('dashboard_proprietario.html',
                               imoveis=imoveis,
                               contratos=contratos_ativos,
                               pagamentos_pendentes=pagamentos_pendentes,
                               total_receber=total_receber)
    else:
        contratos = Contrato.query.filter_by(locatario_id=current_user.id, status='ativo').all()

        hoje = date.today()
        pagamentos_pendentes = Pagamento.query.filter_by(
            contrato_id=[c.id for c in contratos]
        ).filter(
            Pagamento.status.in_(['pendente', 'atrasado']),
            Pagamento.data_vencimento <= hoje
        ).all() if contratos else []

        return render_template('dashboard_locatario.html',
                               contratos=contratos,
                               pagamentos_pendentes=pagamentos_pendentes)


# ==================== IMÓVEIS ====================

@app.route('/imoveis')
@login_required
def listar_imoveis():
    if current_user.tipo != 'proprietario':
        flash('Acesso negado.', 'error')
        return redirect(url_for('dashboard'))

    imoveis = Imovel.query.filter_by(proprietario_id=current_user.id).all()
    return render_template('imoveis/lista.html', imoveis=imoveis)


@app.route('/imoveis/novo', methods=['GET', 'POST'])
@login_required
def novo_imovel():
    if current_user.tipo != 'proprietario':
        flash('Acesso negado.', 'error')
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        imovel = Imovel(
            titulo=request.form.get('titulo'),
            descricao=request.form.get('descricao'),
            endereco=request.form.get('endereco'),
            cidade=request.form.get('cidade'),
            estado=request.form.get('estado'),
            cep=request.form.get('cep'),
            tipo=request.form.get('tipo'),
            quartos=int(request.form.get('quartos') or 0),
            banheiros=int(request.form.get('banheiros') or 0),
            vagas_garagem=int(request.form.get('vagas_garagem') or 0),
            area=float(request.form.get('area') or 0),
            valor_aluguel=float(request.form.get('valor_aluguel') or 0),
            valor_condominio=float(request.form.get('valor_condominio') or 0),
            valor_iptu=float(request.form.get('valor_iptu') or 0),
            proprietario_id=current_user.id
        )

        db.session.add(imovel)
        db.session.commit()

        # Fotos
        urls_fotos = request.form.getlist('foto_url[]')
        legendas = request.form.getlist('foto_legenda[]')
        for i, url in enumerate(urls_fotos):
            if url.strip():
                foto = FotoImovel(
                    imovel_id=imovel.id,
                    url=url.strip(),
                    legenda=legendas[i] if i < len(legendas) else '',
                    ordem=i
                )
                db.session.add(foto)

        db.session.commit()
        flash('Imóvel cadastrado com sucesso!', 'success')
        return redirect(url_for('listar_imoveis'))

    return render_template('imoveis/form.html')


@app.route('/imoveis/<int:id>/editar', methods=['GET', 'POST'])
@login_required
def editar_imovel(id):
    if current_user.tipo != 'proprietario':
        flash('Acesso negado.', 'error')
        return redirect(url_for('dashboard'))

    imovel = Imovel.query.filter_by(id=id, proprietario_id=current_user.id).first_or_404()

    if request.method == 'POST':
        imovel.titulo = request.form.get('titulo')
        imovel.descricao = request.form.get('descricao')
        imovel.endereco = request.form.get('endereco')
        imovel.cidade = request.form.get('cidade')
        imovel.estado = request.form.get('estado')
        imovel.cep = request.form.get('cep')
        imovel.tipo = request.form.get('tipo')
        imovel.quartos = int(request.form.get('quartos') or 0)
        imovel.banheiros = int(request.form.get('banheiros') or 0)
        imovel.vagas_garagem = int(request.form.get('vagas_garagem') or 0)
        imovel.area = float(request.form.get('area') or 0)
        imovel.valor_aluguel = float(request.form.get('valor_aluguel') or 0)
        imovel.valor_condominio = float(request.form.get('valor_condominio') or 0)
        imovel.valor_iptu = float(request.form.get('valor_iptu') or 0)
        imovel.disponivel = 'disponivel' in request.form

        # Atualizar fotos
        FotoImovel.query.filter_by(imovel_id=id).delete()
        urls_fotos = request.form.getlist('foto_url[]')
        legendas = request.form.getlist('foto_legenda[]')
        for i, url in enumerate(urls_fotos):
            if url.strip():
                foto = FotoImovel(
                    imovel_id=imovel.id,
                    url=url.strip(),
                    legenda=legendas[i] if i < len(legendas) else '',
                    ordem=i
                )
                db.session.add(foto)

        db.session.commit()
        flash('Imóvel atualizado com sucesso!', 'success')
        return redirect(url_for('listar_imoveis'))

    return render_template('imoveis/form.html', imovel=imovel)


@app.route('/imoveis/<int:id>/excluir', methods=['POST'])
@login_required
def excluir_imovel(id):
    if current_user.tipo != 'proprietario':
        flash('Acesso negado.', 'error')
        return redirect(url_for('dashboard'))

    imovel = Imovel.query.filter_by(id=id, proprietario_id=current_user.id).first_or_404()

    # Verificar se tem contratos ativos
    contratos_ativos = Contrato.query.filter_by(imovel_id=id, status='ativo').count()
    if contratos_ativos > 0:
        flash('Não é possível excluir imóvel com contratos ativos.', 'error')
        return redirect(url_for('listar_imoveis'))

    db.session.delete(imovel)
    db.session.commit()
    flash('Imóvel excluído com sucesso!', 'success')
    return redirect(url_for('listar_imoveis'))


# ==================== CONTRATOS ====================

@app.route('/contratos')
@login_required
def listar_contratos():
    if current_user.tipo == 'proprietario':
        contratos = Contrato.query.join(Imovel).filter(Imovel.proprietario_id == current_user.id).all()
    else:
        contratos = Contrato.query.filter_by(locatario_id=current_user.id).all()

    return render_template('contratos/lista.html', contratos=contratos)


@app.route('/contratos/novo', methods=['GET', 'POST'])
@login_required
def novo_contrato():
    if current_user.tipo != 'proprietario':
        flash('Acesso negado.', 'error')
        return redirect(url_for('dashboard'))

    imoveis_disponiveis = Imovel.query.filter_by(proprietario_id=current_user.id, disponivel=True).all()
    locatarios = Usuario.query.filter_by(tipo='locatario').all()

    if request.method == 'POST':
        imovel_id = int(request.form.get('imovel_id'))
        locatario_id = int(request.form.get('locatario_id'))
        data_inicio = datetime.strptime(request.form.get('data_inicio'), '%Y-%m-%d').date()
        data_fim = datetime.strptime(request.form.get('data_fim'), '%Y-%m-%d').date()
        valor_mensal = float(request.form.get('valor_mensal'))
        dia_vencimento = int(request.form.get('dia_vencimento') or 5)
        observacoes = request.form.get('observacoes')

        imovel = Imovel.query.get(imovel_id)
        if not imovel or imovel.proprietario_id != current_user.id:
            flash('Imóvel inválido.', 'error')
            return redirect(url_for('novo_contrato'))

        # Verificar sobreposição de contratos
        conflito = Contrato.query.filter(
            Contrato.imovel_id == imovel_id,
            Contrato.status == 'ativo',
            Contrato.data_inicio <= data_fim,
            Contrato.data_fim >= data_inicio
        ).first()

        if conflito:
            flash('Já existe contrato ativo para este período.', 'error')
            return render_template('contratos/form.html', imoveis=imoveis_disponiveis, locatarios=locatarios)

        contrato = Contrato(
            imovel_id=imovel_id,
            locatario_id=locatario_id,
            data_inicio=data_inicio,
            data_fim=data_fim,
            valor_mensal=valor_mensal,
            dia_vencimento=dia_vencimento,
            observacoes=observacoes
        )

        imovel.disponivel = False

        db.session.add(contrato)
        db.session.commit()

        # Gerar pagamentos mensais
        gerar_pagamentos(contrato)

        flash('Contrato criado com sucesso! Pagamentos gerados automaticamente.', 'success')
        return redirect(url_for('listar_contratos'))

    return render_template('contratos/form.html', imoveis=imoveis_disponiveis, locatarios=locatarios)


def gerar_pagamentos(contrato):
    """Gera pagamentos mensais para o contrato"""
    data_atual = contrato.data_inicio
    while data_atual <= contrato.data_fim:
        # Ajustar para o dia de vencimento
        try:
            data_vencimento = data_atual.replace(day=contrato.dia_vencimento)
        except ValueError:
            # Se o dia não existe no mês (ex: 31 em fevereiro), usar último dia do mês
            if data_atual.month == 12:
                data_vencimento = date(data_atual.year + 1, 1, 1) - timedelta(days=1)
            else:
                data_vencimento = date(data_atual.year, data_atual.month + 1, 1) - timedelta(days=1)

        if data_vencimento <= contrato.data_fim:
            pagamento = Pagamento(
                contrato_id=contrato.id,
                data_vencimento=data_vencimento,
                valor=contrato.valor_mensal,
                status='pendente'
            )
            db.session.add(pagamento)

        # Próximo mês
        if data_atual.month == 12:
            data_atual = date(data_atual.year + 1, 1, 1)
        else:
            data_atual = date(data_atual.year, data_atual.month + 1, 1)


@app.route('/contratos/<int:id>/finalizar', methods=['POST'])
@login_required
def finalizar_contrato(id):
    if current_user.tipo != 'proprietario':
        flash('Acesso negado.', 'error')
        return redirect(url_for('dashboard'))

    contrato = Contrato.query.join(Imovel).filter(
        Contrato.id == id,
        Imovel.proprietario_id == current_user.id
    ).first_or_404()

    contrato.status = 'finalizado'
    contrato.imovel.disponivel = True

    # Cancelar pagamentos futuros pendentes
    hoje = date.today()
    Pagamento.query.filter(
        Pagamento.contrato_id == id,
        Pagamento.data_vencimento > hoje,
        Pagamento.status == 'pendente'
    ).update({Pagamento.status: 'cancelado'})

    db.session.commit()
    flash('Contrato finalizado com sucesso!', 'success')
    return redirect(url_for('listar_contratos'))


# ==================== PAGAMENTOS ====================

@app.route('/pagamentos')
@login_required
def listar_pagamentos():
    if current_user.tipo == 'proprietario':
        pagamentos = Pagamento.query.join(Contrato).join(Imovel).filter(
            Imovel.proprietario_id == current_user.id
        ).order_by(Pagamento.data_vencimento.desc()).all()
    else:
        contratos_ids = [c.id for c in Contrato.query.filter_by(locatario_id=current_user.id).all()]
        pagamentos = Pagamento.query.filter(
            Pagamento.contrato_id.in_(contratos_ids)
        ).order_by(Pagamento.data_vencimento.desc()).all() if contratos_ids else []

    return render_template('pagamentos/lista.html', pagamentos=pagamentos)


@app.route('/pagamentos/<int:id>/pagar', methods=['GET', 'POST'])
@login_required
def pagar_pagamento(id):
    pagamento = Pagamento.query.get_or_404(id)

    # Verificar permissão
    if current_user.tipo == 'proprietario':
        if pagamento.contrato.imovel.proprietario_id != current_user.id:
            flash('Acesso negado.', 'error')
            return redirect(url_for('dashboard'))
    else:
        if pagamento.contrato.locatario_id != current_user.id:
            flash('Acesso negado.', 'error')
            return redirect(url_for('dashboard'))

    if request.method == 'POST':
        valor_pago = float(request.form.get('valor_pago') or 0)
        forma_pagamento = request.form.get('forma_pagamento')
        comprovante = request.form.get('comprovante')
        observacoes = request.form.get('observacoes')

        pagamento.valor_pago = valor_pago
        pagamento.forma_pagamento = forma_pagamento
        pagamento.comprovante = comprovante
        pagamento.observacoes = observacoes
        pagamento.data_pagamento = date.today()

        if valor_pago >= pagamento.valor:
            pagamento.status = 'pago'
        elif valor_pago > 0:
            pagamento.status = 'parcial'
        else:
            pagamento.status = 'pendente'

        db.session.commit()
        flash('Pagamento registrado com sucesso!', 'success')
        return redirect(url_for('listar_pagamentos'))

    return render_template('pagamentos/pagar.html', pagamento=pagamento)


@app.route('/pagamentos/atualizar-status')
@login_required
def atualizar_status_pagamentos():
    """Atualiza status de pagamentos para 'atrasado' se vencidos"""
    if current_user.tipo != 'proprietario':
        flash('Acesso negado.', 'error')
        return redirect(url_for('dashboard'))

    hoje = date.today()
    Pagamento.query.join(Contrato).join(Imovel).filter(
        Imovel.proprietario_id == current_user.id,
        Pagamento.status == 'pendente',
        Pagamento.data_vencimento < hoje
    ).update({Pagamento.status: 'atrasado'})

    db.session.commit()
    flash('Status dos pagamentos atualizados!', 'success')
    return redirect(url_for('listar_pagamentos'))


# ==================== RELATÓRIOS ====================

@app.route('/relatorios')
@login_required
def relatorios():
    if current_user.tipo != 'proprietario':
        flash('Acesso negado.', 'error')
        return redirect(url_for('dashboard'))

    hoje = date.today()
    inicio_mes = date(hoje.year, hoje.month, 1)

    # Recebido no mês
    recebido_mes = db.session.query(func.sum(Pagamento.valor_pago)).join(Contrato).join(Imovel).filter(
        Imovel.proprietario_id == current_user.id,
        Pagamento.data_pagamento >= inicio_mes,
        Pagamento.data_pagamento <= hoje,
        Pagamento.status == 'pago'
    ).scalar() or 0

    # A receber no mês
    if hoje.month == 12:
        fim_mes = date(hoje.year + 1, 1, 1) - timedelta(days=1)
    else:
        fim_mes = date(hoje.year, hoje.month + 1, 1) - timedelta(days=1)

    a_receber_mes = db.session.query(func.sum(Pagamento.valor - Pagamento.valor_pago)).join(Contrato).join(Imovel).filter(
        Imovel.proprietario_id == current_user.id,
        Pagamento.status.in_(['pendente', 'atrasado', 'parcial']),
        Pagamento.data_vencimento >= inicio_mes,
        Pagamento.data_vencimento <= fim_mes
    ).scalar() or 0

    # Inadimplência
    inadimplentes = Pagamento.query.join(Contrato).join(Imovel).join(Usuario).filter(
        Imovel.proprietario_id == current_user.id,
        Pagamento.status == 'atrasado'
    ).all()

    # Imóveis vagos
    imoveis_vagos = Imovel.query.filter_by(proprietario_id=current_user.id, disponivel=True).count()
    total_imoveis = Imovel.query.filter_by(proprietario_id=current_user.id).count()

    return render_template('relatorios.html',
                           recebido_mes=recebido_mes,
                           a_receber_mes=a_receber_mes,
                           inadimplentes=inadimplentes,
                           imoveis_vagos=imoveis_vagos,
                           total_imoveis=total_imoveis)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)