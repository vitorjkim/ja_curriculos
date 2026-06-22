# Guia de Deploy - JáCurrículos

## Deploy com Railway + Vercel

Este projeto possui **2 componentes separados** que precisam ser deployados em plataformas diferentes:

- **Backend**: Node.js + Express + PostgreSQL → **Railway**
- **Frontend**: React + Vite → **Vercel**

---

## 1. Backend no Railway

### 1.1 Criar serviço PostgreSQL no Railway

1. Acesse [railway.app](https://railway.app)
2. Crie um novo projeto
3. Adicione um novo serviço → PostgreSQL
4. Copie a `DATABASE_URL` gerada (será usada automaticamente)

### 1.2 Criar serviço Node.js no Railway

1. Conecte seu repositório GitHub
2. Selecione este repositório (`ja_curriculos`)
3. Configure o **Root Directory** como `backend/`
4. Defina as variáveis de ambiente:

```
NODE_ENV=production
JWT_SECRET=sua_chave_secreta_bem_longa_e_aleatoria
FRONTEND_URL=https://seu-frontend.vercel.app
ALLOWED_ORIGINS=https://seu-frontend.vercel.app
```

> **Nota**: `DATABASE_URL` é fornecida automaticamente pelo serviço PostgreSQL

### 1.3 Comando de Start

O Railway executará automaticamente (definido em `backend/package.json`):

```bash
npm start
```

Que roda: `node server.js`

---

## 2. Frontend no Vercel

### 2.1 Preparar ambiente

O build do Vercel precisa conhecer a URL do seu backend. Define a variável de ambiente:

```
VITE_API_URL=https://seu-backend.up.railway.app/api
```

**⚠️ IMPORTANTE**: Deve ser uma URL **absoluta completa**, não relativa!

Exemplos **corretos**:
- ✅ `https://jacurriculos-production.up.railway.app/api`
- ✅ `https://seu-dominio-customizado.com/api`

Exemplos **INCORRETOS**:
- ❌ `/api` (relativo)
- ❌ `localhost:3001/api` (local)
- ❌ `seu-backend.up.railway.app/api` (sem protocolo)

### 2.2 Configurar no Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Importe este repositório
3. **Configuração do Projeto**:
   - **Framework**: Vite
   - **Root Directory**: `.` (raiz)
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install`
   - **Output Directory**: `dist`

4. **Variáveis de Ambiente**:
   - Clique em "Environment Variables"
   - Adicione: `VITE_API_URL=https://seu-backend.up.railway.app/api`

5. Deploy! ✨

---

## 3. Verificação pós-deploy

### Testar Backend

```bash
curl https://seu-backend.up.railway.app/health
```

Deve retornar `{ "status": "ok" }` ou similar.

### Testar CORS

No console do navegador (DevTools → Console), teste:

```javascript
fetch('https://seu-backend.up.railway.app/api/auth/me', {
  headers: { 'Authorization': 'Bearer seu_token' }
})
.then(r => r.json())
.then(console.log)
```

Se der erro CORS, verifique se `FRONTEND_URL` está correto no Railway.

### Testar Login

1. Abra o app no Vercel
2. Vá para /login
3. Tente fazer login
4. Abra DevTools → Network → verifique se as requisições vão para `https://seu-backend.up.railway.app/api/auth/login`

---

## 4. Troubleshooting

### Erro: `Cannot GET /api/auth/me`

**Causa**: URL da API não está chegando ao frontend.

**Solução**:
- [ ] Verifique se `VITE_API_URL` foi adicionado nas Env Vars do Vercel
- [ ] Trigger um novo deploy após adicionar as variáveis
- [ ] Confirme que começa com `https://` e termina com `/api`

### Erro: `Failed to fetch` ou CORS

**Causa**: Backend está bloqueando origem do frontend.

**Solução**:
- [ ] Vá para Railway → seu serviço backend
- [ ] Verifique `FRONTEND_URL` e `ALLOWED_ORIGINS`
- [ ] Devem ser exatamente `https://seu-frontend.vercel.app` (sem trailing slash)

### Erro: `relation "..." does not exist`

**Causa**: Tabelas não foram criadas no banco.

**Solução**:
- [ ] O backend cria tabelas automaticamente no primeiro start
- [ ] Se o banco já tinha dados antigos, verifique se a ordem de criação está correta
- [ ] As migrações usam `CREATE TABLE IF NOT EXISTS`, então são seguras

---

## 5. Redeploy após alterações

### Se alterou o **backend**:
```bash
git add backend/
git commit -m "sua mensagem"
git push
# Railway faz deploy automático
```

### Se alterou o **frontend**:
```bash
git add src/
git commit -m "sua mensagem"
git push
# Vercel faz deploy automático
```

### Se alterou as **variáveis de ambiente**:
- Atualize em Railway ou Vercel
- Trigger um novo deploy manualmente (ou `git push` algo)

---

## 6. URLs de Produção

Após deploy bem-sucedido:

- **Frontend**: https://ja-curriculos.vercel.app (ou seu domínio customizado)
- **Backend**: https://seu-backend.up.railway.app
- **API Base**: https://seu-backend.up.railway.app/api

---

## 7. Próximas etapas (opcional)

- [ ] Configurar domínio customizado no Vercel
- [ ] Configurar domínio customizado no Railway
- [ ] Configurar SSL/TLS (automático em Railway e Vercel)
- [ ] Monitorar logs em tempo real
- [ ] Configurar alertas de falha

