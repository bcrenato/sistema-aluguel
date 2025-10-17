// js/inquilino.js
// Requer: firebase.js e auth.js carregados antes

async function inicializarPainelInquilino() {
  try {
    // espera até que o usuário esteja autenticado
    myAuth.onAuthChange(async (user) => {
      if (!user) {
        // não autenticado -> redirecionar ao login
        window.location.href = "index.html";
        return;
      }

      // pega CPF associado ao UID
      const cpf = await myAuth.getCpfDoUsuarioAtual();
      if (!cpf) {
        alert("Erro: CPF não encontrado para este usuário. Contate o administrador.");
        await myAuth.logout();
        return;
      }

      carregarDadosInquilino(cpf);
    });
  } catch (e) {
    console.error(e);
    alert("Erro ao iniciar painel: " + e.message);
  }
}

async function carregarDadosInquilino(cpf) {
  const ref = db.ref(`inquilinos/${cpf}`);
  const snap = await ref.once("value");
  const data = snap.val();
  if (!data) {
    alert("Dados do inquilino não encontrados. Contate o administrador.");
    return;
  }

  // preencher a UI
  document.getElementById("dadosInquilino").innerHTML = `
    <p><strong>Nome:</strong> ${data.nome || "-"}</p>
    <p><strong>Endereço:</strong> ${data.endereco || "-"}</p>
    <p><strong>Aluguel:</strong> R$${Number(data.aluguel || 0).toFixed(2)}</p>
    <p><strong>Água:</strong> R$${Number(data.agua || 0).toFixed(2)}</p>
    <p><strong>Total do mês:</strong> R$${(Number(data.aluguel || 0)+Number(data.agua || 0)).toFixed(2)}</p>
  `;

  // pagamentos (histórico)
  const lista = document.getElementById("listaPagamentos");
  lista.innerHTML = "";
  if (data.pagamentos) {
    // ordenar por chave (assume formato mesAno que ordena bem) - inverter para recente primeiro
    Object.keys(data.pagamentos).reverse().forEach(mes => {
      const p = data.pagamentos[mes];
      const li = document.createElement("li");
      li.classList.add("list-group-item");
      li.textContent = `${mes} - R$${Number(p.valor).toFixed(2)} - ${p.forma} - ${p.data || "-"}`;
      lista.appendChild(li);
    });
  } else {
    lista.innerHTML = `<li class="list-group-item">Nenhum pagamento registrado.</li>`;
  }

  // botão Pix
  const btnPix = document.getElementById("btnPix");
  btnPix.onclick = () => gerarPixParaInquilino(cpf, data);

  // botão para informar pagamento em dinheiro (opcional)
  const btnDinheiro = document.getElementById("btnDinheiro");
  if (btnDinheiro) {
    btnDinheiro.onclick = () => marcarPagamentoDinheiro(cpf, data);
  }
}

function gerarPixParaInquilino(cpf, dados) {
  const chavePix = dados.chavePix || "seuemail@banco.com"; // ideal: cada conta proprietario tem chave
  const valor = (Number(dados.aluguel || 0) + Number(dados.agua || 0)).toFixed(2);
  const descricao = `Aluguel ${dados.endereco || cpf} - ${new Date().toLocaleString('pt-BR')}`;
  // Link simples — substitua pelo provider que preferir (Gerencianet, Mercado Pago etc.)
  const linkPix = `https://qrcodepix.herokuapp.com/api/v1/pix?chave=${encodeURIComponent(chavePix)}&valor=${encodeURIComponent(valor)}&descricao=${encodeURIComponent(descricao)}`;
  // (acima é só exemplo de link que muitos providers implementam; você pode abrir o link ou gerar QR localmente)
  window.open(linkPix, "_blank");
}

/// marcarPagamentoDinheiro(cpf, dados)
/// abre prompt para definir mês e registra pagamento em inquilinos/{cpf}/pagamentos/{mes}
async function marcarPagamentoDinheiro(cpf, dados) {
  const mes = prompt("Digite o mês/ano (ex: Outubro2025)");
  if (!mes) return;
  const valor = (Number(dados.aluguel || 0) + Number(dados.agua || 0)).toFixed(2);
  const registro = {
    valor: Number(valor),
    forma: "Dinheiro",
    data: new Date().toLocaleDateString('pt-BR'),
  };

  try {
    await db.ref(`inquilinos/${cpf}/pagamentos/${mes}`).set(registro);
    alert("Pagamento registrado como Dinheiro.");
    carregarDadosInquilino(cpf); // recarrega histórico
  } catch (e) {
    console.error(e);
    alert("Erro ao registrar pagamento: " + e.message);
  }
}

// logout ligado ao botão
document.addEventListener("DOMContentLoaded", () => {
  const btnLogout = document.getElementById("logout");
  if (btnLogout) btnLogout.onclick = async () => {
    await myAuth.logout();
    window.location.href = "index.html";
  };
});
