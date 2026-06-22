# Implementação de Validação de CNPJ Único

## Resumo das Alterações

Este documento descreve as alterações implementadas para evitar que empresas diferentes sejam criadas com o mesmo CNPJ.

## Alterações Realizadas

### 1. Banco de Dados

#### 1.1 Script de Limpeza de CNPJs Duplicados
- **Arquivo**: `backend/scripts/cleanup-duplicate-cnpj.js`
- **Função**: Remove CNPJs duplicados existentes no banco de dados
- **Execução**: `node scripts/cleanup-duplicate-cnpj.js`
- **Resultado**: Removidos 2 registros duplicados com CNPJs já existentes

#### 1.2 Constraint Única para CNPJ
- **Arquivo**: `backend/scripts/add-cnpj-unique-constraint.js`
- **Função**: Adiciona constraint única na coluna `cnpj` da tabela `users`
- **Execução**: `node scripts/add-cnpj-unique-constraint.js`
- **SQL Aplicado**:
  ```sql
  ALTER TABLE users 
  ADD CONSTRAINT users_cnpj_unique 
  UNIQUE (cnpj);
  
  CREATE INDEX IF NOT EXISTS idx_users_cnpj ON users(cnpj) 
  WHERE cnpj IS NOT NULL AND cnpj != '';
  ```

### 2. Backend (API)

#### 2.1 Validação no Registro
- **Arquivo**: `backend/routes/auth.js`
- **Alteração**: Adicionada validação antes da inserção
- **Código adicionado**:
  ```javascript
  // Verificar se CNPJ já existe (para empresas)
  if (type === 'company' && cnpj) {
    const existingCNPJ = await client.query(
      'SELECT id FROM users WHERE cnpj = $1 AND type = $2',
      [cnpj, 'company']
    );

    if (existingCNPJ.rows.length > 0) {
      return res.status(400).json({
        error: 'Este CNPJ já está cadastrado por outra empresa',
        code: 'CNPJ_ALREADY_EXISTS'
      });
    }
  }
  ```

#### 2.2 Validação na Atualização
- **Arquivo**: `backend/routes/users.js`
- **Alteração**: Adicionada validação na atualização de dados
- **Código adicionado**:
  ```javascript
  // Verificar se CNPJ já está em uso por outra empresa
  if (cnpj && existingUser.rows[0].type === 'company') {
    const cnpjCheck = await client.query(
      'SELECT id FROM users WHERE cnpj = $1 AND id != $2 AND type = $3',
      [cnpj, id, 'company']
    );

    if (cnpjCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'Este CNPJ já está cadastrado por outra empresa',
        code: 'CNPJ_ALREADY_EXISTS'
      });
    }
  }
  ```

### 3. Frontend

#### 3.1 Validação já Existente
O frontend já possuía validação para CNPJ duplicado em:
- `src/contexts/AuthContext.jsx` (fallback localStorage)
- `src/pages/CompanyRegister.jsx` (validação em tempo real)
- `src/pages/PublicRegister.jsx` (validação no submit)

#### 3.2 Tratamento de Erros
As páginas de registro já tratam corretamente os erros:
- Código de erro `CNPJ_ALREADY_EXISTS`
- Mensagens de usuário amigáveis
- Validação em tempo real durante digitação

## Scripts de Teste

### 1. Teste de Constraint do Banco
- **Arquivo**: `backend/scripts/test-cnpj-validation.js`
- **Função**: Testa a constraint única diretamente no banco
- **Resultado**: ✅ Funcionando corretamente

### 2. Teste da Lógica da API
- **Arquivo**: `backend/scripts/test-api-registration.js`
- **Função**: Testa a validação na camada da API
- **Resultado**: ✅ Funcionando corretamente

## Como Funciona

### Níveis de Proteção

1. **Banco de Dados (Constraint Única)**
   - Impede inserção de CNPJs duplicados a nível de banco
   - Proteção mais baixa e definitiva

2. **Backend (Validação de API)**
   - Verifica CNPJ antes de tentar inserir
   - Retorna erro amigável para o frontend
   - Códigos de erro específicos

3. **Frontend (Validação UX)**
   - Validação em tempo real durante digitação
   - Fallback para localStorage quando API indisponível
   - Mensagens de erro amigáveis

### Fluxo de Validação

1. **Registro de Nova Empresa**:
   ```
   Frontend → Valida formato CNPJ → 
   Envia para API → Backend valida duplicação → 
   Banco aplica constraint → Sucesso ou Erro
   ```

2. **Atualização de CNPJ**:
   ```
   Frontend → Valida formato → 
   Envia para API → Backend valida duplicação (exceto próprio usuário) → 
   Banco aplica constraint → Sucesso ou Erro
   ```

## Códigos de Erro

- `CNPJ_ALREADY_EXISTS`: CNPJ já cadastrado por outra empresa
- `EMAIL_ALREADY_EXISTS`: Email já cadastrado

## Execução dos Scripts

Para aplicar as alterações em um banco existente:

```bash
cd backend

# 1. Limpar CNPJs duplicados (se existirem)
node scripts/cleanup-duplicate-cnpj.js

# 2. Adicionar constraint única
node scripts/add-cnpj-unique-constraint.js

# 3. Testar validação (opcional)
node scripts/test-cnpj-validation.js
node scripts/test-api-registration.js
```

## Status

✅ **Implementação Completa**
- Constraint única aplicada no banco
- Validação no backend implementada
- Frontend já possuía validação adequada
- Testes executados com sucesso

Agora é **impossível** criar empresas diferentes com o mesmo CNPJ no sistema.
