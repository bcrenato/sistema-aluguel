// js/auth.js
// Requer: js/firebase.js já carregado (que define auth e db)

/// loginInquilino(cpf, senha)
// Cria o email "fake" usado para auth e faz signInWithEmailAndPassword
async function loginInquilino(cpf, senha) {
  const emailFake = `${cpf}@aluguelapp.com`;
  try {
    const userCredential = await auth.signInWithEmailAndPassword(emailFake, senha);
    // userCredential.user.uid é o uid real do Firebase Auth
    return userCredential.user;
  } catch (err) {
    throw err;
  }
}

/// logout()
function logout() {
  return auth.signOut();
}

/// getCpfDoUsuarioAtual() -> Promise<string>
/// Pega o UID atual e busca /users/{uid}/cpf no Realtime Database
async function getCpfDoUsuarioAtual() {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  const uid = user.uid;
  const snap = await db.ref(`users/${uid}/cpf`).once("value");
  return snap.val(); // pode ser null se não existir
}

/// onAuthChange(callback)
/// callback recebe (user) (user poderá ser null)
function onAuthChange(callback) {
  auth.onAuthStateChanged(callback);
}

/// helper para criar "email fake" a partir do cpf
function emailFromCpf(cpf) {
  return `${cpf}@aluguelapp.com`;
}

// Export (se estiver usando módulos; se não, ficam globais)
window.myAuth = {
  loginInquilino,
  logout,
  getCpfDoUsuarioAtual,
  onAuthChange,
  emailFromCpf
};
