# Guia de Instalação — Figurinhas Copa 2026 (Firebase)

## Visão Geral

O app usa três serviços gratuitos do Google Firebase:

| Serviço | Função | Custo |
|---|---|---|
| **Firebase Authentication** | Login com conta Google | Gratuito |
| **Cloud Firestore** | Banco de dados das coleções | Gratuito até 50k leituras/dia |
| **Firebase Hosting** | Hospedagem do app | Gratuito (10 GB/mês) |

Tempo estimado de instalação: **15 a 20 minutos**.

---

## Passo 1 — Criar o Projeto no Firebase Console

1. Acesse [https://console.firebase.google.com](https://console.firebase.google.com) com sua conta Google
2. Clique em **"Adicionar projeto"**
3. Dê um nome ao projeto (ex: `figurinhas-copa-2026`)
4. Desative o Google Analytics (opcional) e clique em **"Criar projeto"**
5. Aguarde a criação e clique em **"Continuar"**

---

## Passo 2 — Ativar o Login com Google

1. No menu lateral, clique em **"Build" → "Authentication"**
2. Clique em **"Começar"**
3. Na aba **"Sign-in method"**, clique em **"Google"**
4. Ative o toggle e preencha o **"E-mail de suporte do projeto"** com seu email
5. Clique em **"Salvar"**

---

## Passo 3 — Criar o Banco de Dados Firestore

1. No menu lateral, clique em **"Build" → "Firestore Database"**
2. Clique em **"Criar banco de dados"**
3. Selecione **"Iniciar no modo de produção"** e clique em **"Próximo"**
4. Escolha a região **`southamerica-east1 (São Paulo)`** e clique em **"Ativar"**

### 3.1 — Configurar as Regras de Segurança

1. Na aba **"Regras"** do Firestore, substitua todo o conteúdo pelo seguinte:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /authorized_users/{email} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /collections/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /duplicates/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

2. Clique em **"Publicar"**

### 3.2 — Autorizar Usuários

Para cada pessoa que terá acesso ao app, adicione um documento no Firestore:

1. Clique em **"+ Iniciar coleção"**
2. ID da coleção: `authorized_users`
3. Clique em **"Próximo"**
4. **ID do documento**: o email da pessoa em **letras minúsculas** (ex: `icaroregis@gmail.com`)
5. Adicione um campo:
   - Campo: `name` | Tipo: `string` | Valor: nome da pessoa (ex: `Ícaro`)
6. Clique em **"Salvar"**
7. Repita para cada usuário autorizado

> **Dica:** Para adicionar mais usuários depois, acesse o Firestore Console, abra a coleção `authorized_users` e clique em **"+ Adicionar documento"**.

---

## Passo 4 — Obter as Configurações do Firebase

1. No menu lateral, clique no ícone de engrenagem **⚙️ → "Configurações do projeto"**
2. Role até a seção **"Seus aplicativos"**
3. Clique no ícone **`</>`** (Web) para adicionar um app web
4. Dê um apelido (ex: `figurinhas-web`) e clique em **"Registrar app"**
5. Copie o objeto `firebaseConfig` que aparece. Ele terá este formato:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "figurinhas-copa-2026.firebaseapp.com",
  projectId: "figurinhas-copa-2026",
  storageBucket: "figurinhas-copa-2026.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## Passo 5 — Configurar o Código do App

1. Abra o arquivo **`public/app.js`** em um editor de texto (Bloco de Notas, VS Code, etc.)
2. Localize as linhas no início do arquivo:

```javascript
const firebaseConfig = {
  apiKey: "COLE_AQUI_SUA_API_KEY",
  authDomain: "COLE_AQUI.firebaseapp.com",
  ...
};
```

3. **Substitua** esse bloco pelo `firebaseConfig` que você copiou no Passo 4
4. Salve o arquivo

---

## Passo 6 — Ativar o Domínio no Firebase Auth

1. No Firebase Console, vá em **"Authentication" → "Settings" → "Authorized domains"**
2. Verifique se o domínio do seu app aparece na lista (será algo como `figurinhas-copa-2026.web.app`)
3. Se não aparecer, clique em **"Add domain"** e adicione-o

---

## Passo 7 — Publicar o App (Firebase Hosting)

### Opção A — Usando o Firebase CLI (recomendado)

1. Instale o Node.js em [https://nodejs.org](https://nodejs.org) (versão LTS)
2. Abra o terminal (Prompt de Comando no Windows) e execute:

```bash
npm install -g firebase-tools
firebase login
```

3. Navegue até a pasta do projeto:

```bash
cd caminho/para/figurinhas-firebase
```

4. Inicialize e publique:

```bash
firebase use --add
# Selecione seu projeto na lista
firebase deploy
```

5. Ao final, o terminal exibirá o link do seu app (ex: `https://figurinhas-copa-2026.web.app`)

### Opção B — Upload manual pelo Console

1. No Firebase Console, vá em **"Hosting"**
2. Clique em **"Começar"** e siga o assistente
3. Na etapa de upload, faça o upload de todos os arquivos da pasta `public/`

---

## Passo 8 — Testar o App

1. Acesse o link do seu app (ex: `https://figurinhas-copa-2026.web.app`)
2. Clique em **"Entrar com Google"** e faça login com um email autorizado
3. O app deve carregar em menos de 3 segundos com todas as 980 figurinhas

---

## Estrutura dos Arquivos

```
figurinhas-firebase/
├── public/
│   ├── index.html       ← Estrutura da interface
│   ├── style.css        ← Design elegante (tema escuro)
│   ├── app.js           ← Lógica do app + Firebase
│   └── stickers.json    ← As 980 figurinhas (não editar)
├── firebase.json        ← Configuração do Firebase Hosting
├── firestore.rules      ← Regras de segurança do banco
└── GUIA_INSTALACAO.md   ← Este guia
```

---

## Gerenciamento de Usuários

Para **adicionar** um novo usuário:
1. Acesse o [Firebase Console](https://console.firebase.google.com)
2. Vá em **Firestore Database → authorized_users**
3. Clique em **"+ Adicionar documento"**
4. ID do documento: email em letras minúsculas
5. Campo `name`: nome da pessoa

Para **remover** um usuário:
1. Acesse **Firestore Database → authorized_users**
2. Clique no documento do email
3. Clique no ícone de lixeira **🗑️**

---

## Limites do Plano Gratuito (Spark)

| Recurso | Limite gratuito |
|---|---|
| Leituras Firestore | 50.000 / dia |
| Escritas Firestore | 20.000 / dia |
| Armazenamento Firestore | 1 GB |
| Hosting (transferência) | 10 GB / mês |
| Usuários autenticados | Ilimitado |

Para um grupo de até 20 colecionadores, esses limites são mais que suficientes.

---

## Suporte

Em caso de dúvidas, consulte a documentação oficial do Firebase:
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Cloud Firestore](https://firebase.google.com/docs/firestore)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
