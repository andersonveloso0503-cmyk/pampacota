# PampaCota — Marketplace de fornecedores RS

## 1. Configurar o Firebase

Abra `src/lib/firebase.js` e troque o objeto `firebaseConfig` pelos dados do
SEU projeto Firebase (Console → Configurações do projeto → Seus apps → app Web).

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

## 2. Regras de segurança do Firestore

No Console Firebase → Firestore Database → aba **Regras**, cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // qualquer um pode LER perfis de fornecedor (perfil público)
    // só o próprio fornecedor pode editar o próprio documento
    match /fornecedores/{uid} {
      allow read: if true;
      allow create: if request.auth != null && request.auth.uid == uid;
      allow update: if request.auth != null && request.auth.uid == uid;
      allow delete: if false;
    }

    // qualquer um pode criar uma cotação (formulário público)
    // leitura/edição só por usuários autenticados (painel admin / fornecedor)
    match /cotacoes/{id} {
      allow create: if true;
      allow read: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if false;
    }
  }
}
```

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`

## 4. Deploy na Vercel

1. Suba esse projeto pro GitHub (novo repositório, ex: `pampacota`)
2. Em vercel.com → "Add New Project" → importe o repositório
3. Framework preset: Vite (detecta automático)
4. Deploy

## 5. Domínio próprio (pampacota.com.br)

1. Compre o domínio no Registro.br (ou HostGator) — verifique disponibilidade em
   https://registro.br/busca-dominio/
2. Na Vercel → seu projeto → Settings → Domains → adicione `pampacota.com.br`
3. A Vercel vai te dar registros DNS (geralmente um registro tipo A e/ou CNAME)
4. No painel do Registro.br (ou onde comprou o domínio) → DNS → adicione esses
   registros exatamente como a Vercel mostrar
5. Aguarde a propagação (de minutos a algumas horas)

## Estrutura do projeto

```
src/
  lib/
    firebase.js     -> configuração do Firebase (TROCAR credenciais aqui)
    data.js         -> funções de autenticação, cadastro, busca de fornecedor e cotações
  components/
    Header.jsx
    Footer.jsx
    RsMark.jsx      -> silhueta RS (assinatura visual)
  pages/
    Home.jsx                -> landing page + formulário de cotação
    CadastroFornecedor.jsx  -> cadastro de empresa fornecedora (com CNPJ)
    Login.jsx                -> login do fornecedor
    PerfilFornecedor.jsx     -> perfil público (/empresa/:slug)
  styles/
    global.css      -> todos os tokens de cor, tipografia e componentes visuais
```

## Próximos passos sugeridos (fase 2)

- Painel admin para você ver/gerenciar cotações recebidas e aprovar selos de
  verificação dos fornecedores
- Painel do fornecedor (ver os próprios leads recebidos)
- Notificação automática (e-mail ou WhatsApp) quando uma cotação compatível
  com os serviços do fornecedor é criada
- Página de busca/listagem de fornecedores por categoria e cidade
