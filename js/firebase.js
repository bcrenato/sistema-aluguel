// ============================================================
// 🔥 CONFIGURAÇÃO DO FIREBASE
// Substitua abaixo pelos dados do seu projeto no console Firebase
// (Configurações do Projeto → Suas apps → Firebase SDK snippet → Configuração)
// ============================================================
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "XXXXXXXXXXXX",
  appId: "1:XXXXXXXXXXXX:web:XXXXXXXXXXXXXX"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Instâncias globais
const auth = firebase.auth();
const db = firebase.database();

// ============================================================
// 🔐 FUNÇÕES ÚTEIS DE AUTENTICAÇÃO E BANCO
// ============================================================

// Utilizado pelos demais scripts (auth.js, inquilino.js, admin.js)
const myAuth = {
  // -------------------------------
  // Login do inquilino (CPF + senha)
  // -------------------------------
  loginInquilino: async (cpf, senha) => {
    const emailFake = `${cpf}@aluguelapp.com`;
    return auth.signInWithEmailAndPassword(emailFake, senha);
  },

  // -------------------------------
  // Login do admin (email e senha reais)
  // -------------------------------
  loginAdmin: async (email, senha) => {
    return auth.signInWithEmailAndPassword(email, senha);
  },

  // -------------------------------
  // Cria um novo inquilino (usado pelo admin)
  // -------------------------------
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

  // -------------------------------
  // Deslogar usuário
  // -------------------------------
  logout: async () => {
    await auth.signOut();
    localStorage.clear();
  }
};

// ============================================================
// 📊 FUNÇÕES AUXILIARES DE BANCO DE DADOS
// ============================================================

const myDB = {
  // Obtém os dados de um inquilino
  getInquilino: async (cpf) => {
    const snap = await db.ref("inquilinos/" + cpf).once("value");
    return snap.val();
  },

  // Marca um pagamento manualmente
  registrarPagamento: async (cpf, mes, valor, forma) => {
    const hoje = new Date();
    const data = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
    await db.ref(`inquilinos/${cpf}/pagamentos/${mes}`).set({
      valor,
      forma,
      data
    });
  },

  // Obtém todos os inquilinos (admin)
  getTodosInquilinos: async () => {
    const snap = await db.ref("inquilinos").once("value");
    return snap.val();
  }
};

// ============================================================
// 🔐 VERIFICADOR DE SESSÃO (opcional)
// ============================================================

// Verifica se há usuário logado; se não houver, redireciona
auth.onAuthStateChanged(user => {
  const path = window.location.pathname;
  const onLogin = path.endsWith("index.html") || path.endsWith("/");

  if (!user && !onLogin) {
    // Sem login → volta pra página inicial
    window.location.href = "index.html";
  }
});
