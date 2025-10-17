// ============================================================
// 🔥 CONFIGURAÇÃO DO FIREBASE
// Substitua abaixo pelos dados do seu projeto no console Firebase
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyBoAk9yyUMEBrCFabZcKglTLo8uNj9bVLs",
  authDomain: "appaluguel-7095f.firebaseapp.com",
  databaseURL: "https://appaluguel-7095f-default-rtdb.firebaseio.com",
  projectId: "appaluguel-7095f",
  storageBucket: "appaluguel-7095f.firebasestorage.app",
  messagingSenderId: "525901149755",
  appId: "1:525901149755:web:bcb5d8786bc20d27cd0e1e"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Instâncias globais
const auth = firebase.auth();
const db = firebase.database();

// ============================================================
// 🔐 FUNÇÕES DE AUTENTICAÇÃO
// ============================================================
const myAuth = {
  // Login do inquilino (CPF + senha)
  loginInquilino: async (cpf, senha) => {
    const emailFake = `${cpf}@aluguelapp.com`;
    return auth.signInWithEmailAndPassword(emailFake, senha);
  },

  // Login do admin (email e senha reais)
  loginAdmin: async (email, senha) => {
    return auth.signInWithEmailAndPassword(email, senha);
  },

  // Cria um novo inquilino (usado pelo admin)
  criarInquilino: async (dados) => {
    const emailFake = `${dados.cpf}@aluguelapp.com`;
    const userCredential = await auth.createUserWithEmailAndPassword(emailFake, dados.senha);
    const cpf = dados.cpf;
    await db.ref("inquilinos/" + cpf).set({
      nome: dados.nome,
      endereco: dados.endereco,
      aluguel: dados.aluguel,
      agua: dados.agua
    });
    return userCredential;
  },

  // Deslogar usuário
  logout: async () => {
    await auth.signOut();
    localStorage.clear();
  }
};

// ============================================================
// 📊 FUNÇÕES DE BANCO DE DADOS
// ============================================================
const myDB = {
  // Obtém os dados de um inquilino
  getInquilino: async (cpf) => {
    const snap = await db.ref("inquilinos/" + cpf).once("value");
    return snap.val();
  },

  // Obtém todos os inquilinos (admin)
  getTodosInquilinos: async () => {
    const snap = await db.ref("inquilinos").once("value");
    return snap.val();
  },

  // Registrar pagamento manual (admin)
  registrarPagamento: async (cpf, mes, valor, forma) => {
    const hoje = new Date();
    const data = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`;
    await db.ref(`inquilinos/${cpf}/pagamentos/${mes}`).set({
      valor,
      forma,
      data
    });
  },

  // Solicitar pagamento (inquilino)
  solicitarPagamento: async (cpf, mes, valor, metodo) => {
    return db.ref("inquilinos/" + cpf + "/pagamentos/" + mes).set({
      valor: valor,
      forma: metodo,
      status: "pendente",
      dataSolicitacao: new Date().toLocaleString("pt-BR")
    });
  },

  // Atualizar status de pagamento (admin aprovar/rejeitar)
  atualizarStatusPagamento: async (cpf, mes, status) => {
    return db.ref("inquilinos/" + cpf + "/pagamentos/" + mes).update({ status });
  }
};
