# PampaCota — Marketplace de fornecedores RS

## 1. Configurar o Supabase

Abra `src/lib/supabase.js` e troque pelos dados do SEU projeto Supabase
(Project Settings → API → Project URL e anon public key).

```js
const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJ...";
```

## 2. Criar as tabelas e políticas de segurança

No painel do Supabase → **SQL Editor** → **New query**, cole todo o conteúdo
do arquivo `supabase/schema.sql` (deste projeto) e clique em **Run**.

Isso cria:
- Tabela `fornecedores` (cadastro de empresas)
- Tabela `cotacoes` (pedidos de cotação dos compradores)
- Políticas de RLS (Row Level Security) equivalentes às regras do Firestore
- Função `pegar_cotacao` (garante o limite de 4 fornecedores por cotação, de forma
  atômica, evitando que dois fornecedores "peguem" a última vaga ao mesmo tempo)
- Bucket de Storage `cotacoes-fotos` para as fotos do local

## 3. Confirmação de e-mail (opcional, recomendado depois)

Por padrão o Supabase exige confirmação de e-mail antes do primeiro login.
Para testes iniciais, você pode desativar isso temporariamente em:
**Authentication → Providers → Email → Confirm email** (desmarque a opção).
Lembre de reativar antes de divulgar o site publicamente.

## 4. Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`

## 5. Deploy na Vercel

1. Suba esse projeto pro GitHub (você já tem o repositório `pampacota`)
2. Em vercel.com → seu projeto já existente vai fazer redeploy automático após o push
3. Framework preset: Vite (detecta automático)
4. Root Directory: `pampacota-app` (já configurado)

## 6. Domínio próprio (pampacota.com.br)

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

## 7. Variáveis de ambiente (Asaas + Supabase admin)

As funções serverless em `/api` (criar cobrança, webhook de pagamento) precisam
de credenciais que NUNCA devem ir para o código nem para o GitHub. Configure
na Vercel: **seu projeto → Settings → Environment Variables**.

| Nome | Onde pegar |
|---|---|
| `ASAAS_API_KEY` | Painel Asaas → Configurações → Integrações → API |
| `ASAAS_ENV` | `sandbox` (testes) ou `production` (quando a conta real for aprovada) |
| `ASAAS_WEBHOOK_TOKEN` | Defina uma senha qualquer e cole a mesma no Asaas (Webhooks) |
| `SUPABASE_URL` | Mesma URL usada em `src/lib/supabase.js` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role secret |

Depois de configurar, é preciso fazer um novo deploy para as variáveis valerem.

## 8. Configurar o webhook no Asaas

1. No painel Asaas (sandbox por enquanto) → Configurações → Integrações → Webhooks
2. URL: `https://pampacota.vercel.app/api/webhook-asaas` (ajuste para seu domínio)
3. Eventos: marque pelo menos `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED`
4. Token de acesso: use o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
5. Salve

## 9. Rodar a migração de Moedas RS

No SQL Editor do Supabase, execute o conteúdo de `supabase/migracao_moedas.sql`.
Isso adiciona saldo de moedas, histórico de transações, registro de pagamentos
e atualiza a função `pegar_cotacao` para debitar moedas automaticamente.

## Próximos passos sugeridos (fase 2)

- Painel admin para você ver/gerenciar cotações recebidas e aprovar selos de
  verificação dos fornecedores
- Painel do fornecedor (ver os próprios leads recebidos)
- Notificação automática (e-mail ou WhatsApp) quando uma cotação compatível
  com os serviços do fornecedor é criada
- Página de busca/listagem de fornecedores por categoria e cidade
