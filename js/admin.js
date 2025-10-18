<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>

<script src="js/firebase.js"></script>
<script src="js/auth.js"></script>
<script src="js/admin.js"></script> 

<script>
  // ====================================================
  // 🔹 SCRIPT ADMIN DA PÁGINA (UI)
  // myAuth e myDB são definidos em firebase.js/auth.js
  // cadastrarInquilino é definido em admin.js
  // ====================================================
  const loginDiv = document.getElementById("adminLogin");
  const painelDiv = document.getElementById("adminPainel");
  const listaInquilinosBody = document.getElementById("listaInquilinos");
  const listaPendentesBody = document.getElementById("listaPendentes");
  
  // LOGIN ADMIN
  document.getElementById("btnAdminLogin").onclick = async () => {
    const email = document.getElementById("adminEmail").value;
    const senha = document.getElementById("adminSenha").value;

    try {
      await myAuth.loginAdmin(email, senha); 
      loginDiv.classList.add("d-none");
      painelDiv.classList.remove("d-none");
      
      // Carrega os dados após o login
      carregarInquilinos();
      carregarPagamentosPendentes();
      
    } catch (e) {
      alert("Erro ao entrar: " + e.message);
    }
  };

  // LOGOUT
  document.getElementById("btnLogout").onclick = async () => {
    await myAuth.logout(); 
    painelDiv.classList.add("d-none");
    loginDiv.classList.remove("d-none");
  };

  // CADASTRAR INQUILINO (Handler do Botão)
  document.getElementById("btnCadastrar").onclick = async () => {
    // 1. Coleta e validação dos dados
    const nome = document.getElementById("nome").value;
    const cpf = document.getElementById("cpf").value;
    const endereco = document.getElementById("endereco").value;
    const aluguel = document.getElementById("aluguel").value;
    const agua = document.getElementById("agua").value;
    const senha = document.getElementById("senha").value;

    if (!nome || !cpf || !endereco || !aluguel || !agua || !senha) {
      alert("Por favor, preencha todos os campos.");
      return;
    }
    
    // 2. Chama a função de cadastro (definida em admin.js)
    try {
      // Verifica se a função está disponível
      if (typeof cadastrarInquilino !== 'function') {
         throw new Error("Função cadastrarInquilino não está disponível. Verifique o admin.js.");
      }
      
      await cadastrarInquilino({ nome, cpf, endereco, aluguel, agua, senha }); 
      alert("Inquilino cadastrado com sucesso!");
      
      // 3. Limpar formulário
      document.getElementById("nome").value = "";
      document.getElementById("cpf").value = "";
      document.getElementById("endereco").value = "";
      document.getElementById("aluguel").value = "";
      document.getElementById("agua").value = "";
      document.getElementById("senha").value = "";
      
    } catch (e) {
      // O erro 'permission_denied' (se persistir) virá daqui
      console.error(e); 
      alert("Erro ao cadastrar: " + e.message);
    }
  };

  // LISTAR INQUILINOS
  async function carregarInquilinos() {
    listaInquilinosBody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";
    try {
      // myDB.getTodosInquilinos é de firebase.js
      const dados = await myDB.getTodosInquilinos();
      if (!dados) {
        listaInquilinosBody.innerHTML = "<tr><td colspan='5'>Nenhum inquilino cadastrado</td></tr>";
        return;
      }
      
      listaInquilinosBody.innerHTML = "";
      Object.entries(dados).forEach(([cpf, info]) => {
        // Verifica se o objeto info existe antes de acessar suas propriedades
        const nome = info.nome || "-";
        const endereco = info.endereco || "-";
        const aluguel = Number(info.aluguel || 0).toFixed(2);
        const agua = Number(info.agua || 0).toFixed(2);
        
        listaInquilinosBody.innerHTML += `
          <tr>
            <td>${nome}</td>
            <td>${cpf}</td>
            <td>${endereco}</td>
            <td>R$ ${aluguel}</td>
            <td>R$ ${agua}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirEditar('${cpf}')">Editar</button>
                <button class="btn btn-sm btn-outline-success" onclick="abrirPagamentos('${cpf}')">Pagamentos</button>
            </td>
          </tr>
        `;
      });
    } catch (e) {
      console.error(e);
      // Este erro era o "permission_denied at /inquilinos" resolvido com a regra .read
      alert("Erro ao carregar inquilinos: " + e.message);
    }
  }

  // LISTAR PAGAMENTOS PENDENTES
  async function carregarPagamentosPendentes() {
    listaPendentesBody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

    try {
        const dados = await myDB.getTodosInquilinos();
        if (!dados) {
            listaPendentesBody.innerHTML = "<tr><td colspan='5'>Nenhum pagamento pendente</td></tr>";
            return;
        }

        listaPendentesBody.innerHTML = "";
        let pendentesEncontrados = false;
        
        for (const [cpf, info] of Object.entries(dados)) {
          const pagamentos = info.pagamentos || {};
          for (const [mes, pagamento] of Object.entries(pagamentos)) {
            if (pagamento.status === "pendente") {
              pendentesEncontrados = true;
              listaPendentesBody.innerHTML += `
                <tr>
                  <td>${info.nome || "-"}</td>
                  <td>${mes}</td>
                  <td>R$ ${parseFloat(pagamento.valor).toFixed(2)}</td>
                  <td>${pagamento.forma}</td>
                  <td>
                    <button class="btn btn-success btn-sm" onclick="aprovarPagamento('${cpf}','${mes}')">Aprovar</button>
                    <button class="btn btn-danger btn-sm" onclick="rejeitarPagamento('${cpf}','${mes}')">Rejeitar</button>
                  </td>
                </tr>
              `;
            }
          }
        }
        
        if (!pendentesEncontrados) {
            listaPendentesBody.innerHTML = "<tr><td colspan='5'>Nenhum pagamento pendente</td></tr>";
        }

    } catch(e) {
        console.error(e);
        alert("Erro ao carregar pagamentos: " + e.message);
    }
  }

  // Funções globais de aprovar/rejeitar (dependem de myDB de firebase.js)
  async function aprovarPagamento(cpf, mes) {
    try {
        await myDB.atualizarStatusPagamento(cpf, mes, "aprovado");
        alert("Pagamento aprovado!");
        carregarPagamentosPendentes();
    } catch(e) {
        alert("Erro ao aprovar: " + e.message);
    }
  }

  async function rejeitarPagamento(cpf, mes) {
    try {
        await myDB.atualizarStatusPagamento(cpf, mes, "rejeitado");
        alert("Pagamento rejeitado!");
        carregarPagamentosPendentes();
    } catch(e) {
        alert("Erro ao rejeitar: " + e.message);
    }
  }
</script>
