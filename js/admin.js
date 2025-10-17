// js/admin.js
// Requer: firebase.js e auth.js

// Cria inquilino: cria usuário no Firebase Auth com emailFake e senha, grava mapeamento users/{uid}/cpf e grava inquilinos/{cpf}
async function cadastrarInquilino({ cpf, nome, endereco, aluguel, agua, senha }) {
  try {
    const emailFake = myAuth.emailFromCpf(cpf);
    const userCredential = await auth.createUserWithEmailAndPassword(emailFake, senha);
    const uid = userCredential.user.uid;

    // grava mapeamento e dados do inquilino
    await db.ref(`users/${uid}`).set({
      cpf,
      nome,
      role: "tenant"
    });

    await db.ref(`inquilinos/${cpf}`).set({
      nome,
      endereco,
      aluguel: Number(aluguel),
      agua: Number(agua)
    });

    return { uid };
  } catch (e) {
    throw e;
  }
}

// lista todos inquilinos (ouve em tempo real)
function observarListaInquilinos(callback) {
  db.ref("inquilinos").on("value", snapshot => {
    const todos = snapshot.val() || {};
    // callback recebe objeto { cpf: dados, ... }
    callback(todos);
  });
}

// editar dados do inquilino
function editarInquilino(cpf, novosDados) {
  return db.ref(`inquilinos/${cpf}`).update(novosDados);
}

// adicionar pagamento manual (usado por admin)
function adicionarPagamentoManual(cpf, mes, { valor, forma = "Pix", data = null }) {
  if (!data) data = new Date().toLocaleDateString('pt-BR');
  return db.ref(`inquilinos/${cpf}/pagamentos/${mes}`).set({
    valor: Number(valor),
    forma,
    data
  });
}

// remover inquilino (AVISO: remove registro, não remove usuário do Auth)
// se quiser remover Auth também é preciso usar Firebase Admin SDK no servidor
async function removerInquilino(cpf) {
  await db.ref(`inquilinos/${cpf}`).remove();
}

// exemplos de ligação com a UI (DOM) - chamar quando a página admin for carregada
document.addEventListener("DOMContentLoaded", () => {
  const btnCriar = document.getElementById("btnCriar");
  if (btnCriar) {
    btnCriar.onclick = async () => {
      const cpf = document.getElementById("cpf").value.trim();
      const nome = document.getElementById("nome").value.trim();
      const endereco = document.getElementById("endereco").value.trim();
      const aluguel = document.getElementById("aluguel").value.trim();
      const agua = document.getElementById("agua").value.trim();
      const senha = document.getElementById("senha").value.trim();

      try {
        await cadastrarInquilino({ cpf, nome, endereco, aluguel, agua, senha });
        alert("Inquilino cadastrado com sucesso!");
        // limpa campos
        document.getElementById("cpf").value = "";
        document.getElementById("nome").value = "";
        document.getElementById("endereco").value = "";
        document.getElementById("aluguel").value = "";
        document.getElementById("agua").value = "";
        document.getElementById("senha").value = "";
      } catch (e) {
        console.error(e);
        alert("Erro ao cadastrar: " + e.message);
      }
    };
  }

  // popula lista
  const lista = document.getElementById("lista");
  if (lista) {
    observarListaInquilinos(todos => {
      lista.innerHTML = "";
      Object.keys(todos).forEach(cpf => {
        const d = todos[cpf];
        const li = document.createElement("li");
        li.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center");
        li.innerHTML = `
          <div>
            <strong>${d.nome || "-"}</strong><br/>
            <small>${d.endereco || cpf}</small>
          </div>
          <div>
            <span class="me-2">R$${(Number(d.aluguel || 0) + Number(d.agua || 0)).toFixed(2)}</span>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirEditar('${cpf}')">Editar</button>
            <button class="btn btn-sm btn-outline-success" onclick="abrirPagamentos('${cpf}')">Pagamentos</button>
          </div>
        `;
        lista.appendChild(li);
      });
    });
  }
});

// funções de UI chamadas por botões (global)
window.abrirEditar = function(cpf) {
  // simples prompt para editar aluguel/agua/nome/endereco
  db.ref(`inquilinos/${cpf}`).once("value").then(snap => {
    const d = snap.val() || {};
    const nome = prompt("Nome:", d.nome || "");
    if (nome === null) return;
    const endereco = prompt("Endereço:", d.endereco || "");
    if (endereco === null) return;
    const aluguel = prompt("Aluguel (R$):", d.aluguel || 0);
    if (aluguel === null) return;
    const agua = prompt("Água (R$):", d.agua || 0);
    if (agua === null) return;
    editarInquilino(cpf, { nome, endereco, aluguel: Number(aluguel), agua: Number(agua) })
      .then(() => alert("Dados atualizados."))
      .catch(e => alert("Erro: " + e.message));
  });
};

window.abrirPagamentos = function(cpf) {
  const mes = prompt("Mês/ano para registrar (ex: Outubro2025):");
  if (!mes) return;
  const valor = prompt("Valor (use ponto para decimal):", "0.00");
  if (valor === null) return;
  const forma = prompt("Forma (Pix/Dinheiro):", "Pix");
  adicionarPagamentoManual(cpf, mes, { valor: Number(valor), forma })
    .then(() => alert("Pagamento registrado."))
    .catch(e => alert("Erro: " + e.message));
};
