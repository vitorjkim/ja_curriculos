# Funcionalidades de Administrador - CurrículoJá

## Visão Geral

O sistema CurrículoJá agora inclui funcionalidades completas de administração para gerenciar usuários (candidatos e empresas) do sistema.

## Acesso Administrativo

### Login do Administrador
- **URL de Login**: `http://localhost:5174/login` (mesma tela de login dos usuários comuns)
- **Email padrão**: `admin@curriculoja.com`
- **Senha padrão**: `123456`

⚠️ **Importante**: Altere a senha padrão em produção por motivos de segurança.

## Funcionalidades Implementadas

### 1. Dashboard Administrativo
- **URL**: `http://localhost:5174/admin-dashboard`
- **Acesso**: Apenas usuários com tipo 'admin'
- **Funcionalidades**:
  - Visualização de estatísticas gerais (total de usuários, candidatos, empresas, admins)
  - Lista completa de usuários com filtros e busca
  - Exclusão de usuários (exceto o próprio admin)
  - Exportação de dados em Excel
  - Importação em lote via arquivo Excel

### 2. Cadastro Manual de Usuários
- **URL**: `http://localhost:5174/register`
- **Acesso**: Apenas administradores autenticados
- **Funcionalidades**:
  - Cadastro individual de candidatos e empresas
  - Validação de dados
  - Limpeza automática do formulário após cadastro

### 3. Importação em Lote via Excel
- **Formato aceito**: .xlsx, .xls
- **Template disponível**: Download direto no dashboard
- **Validações**:
  - Emails únicos
  - Campos obrigatórios (email, nome, senha, tipo)
  - Tipos válidos (candidate, company)

#### Estrutura do Excel para Importação:
| Campo | Descrição | Obrigatório | Exemplo |
|-------|-----------|-------------|---------|
| email | Email único do usuário | ✅ | joao@email.com |
| nome | Nome do usuário ou empresa | ✅ | João Silva |
| senha | Senha (mín. 6 caracteres) | ✅ | 123456 |
| tipo | candidate ou company | ✅ | candidate |
| telefone | Telefone com DDD | ❌ | (11) 99999-9999 |
| cpf | CPF (apenas candidatos) | ❌ | 123.456.789-00 |
| empresa | Nome da empresa (companies) | ❌ | Empresa XYZ |
| cnpj | CNPJ (apenas empresas) | ❌ | 12.345.678/0001-90 |

### 4. Navegação Administrativa
- Menu específico para administradores no Navbar
- Redirecionamento automático após login
- Controle de acesso por rotas protegidas

## Controle de Acesso

### Validações Implementadas:
1. **AuthContext**: Propriedade `isAdmin` para identificar administradores
2. **Proteção de Rotas**: Verificação automática em páginas administrativas
3. **Redirecionamento**: Usuários não autorizados são redirecionados
4. **Interface**: Menus adaptados conforme tipo de usuário

### Tipos de Usuário:
- `candidate`: Candidatos/usuários normais
- `company`: Empresas
- `admin`: Administradores do sistema

## Estrutura de Arquivos Criados/Modificados

### Novos Arquivos:
- `src/pages/AdminDashboard.jsx` - Dashboard administrativo
- `src/lib/initAdmin.js` - Criação do admin padrão
- `src/lib/excelTemplate.js` - Template para importação Excel

### Arquivos Modificados:
- `src/contexts/AuthContext.jsx` - Adicionado suporte a admin
- `src/pages/Login.jsx` - Redirecionamento para admin
- `src/pages/Register.jsx` - Proteção e adaptação para admin
- `src/components/Navbar.jsx` - Menu administrativo
- `src/App.jsx` - Novas rotas e inicialização

## Dependências Adicionadas

```json
{
  "xlsx": "^0.18.5"
}
```

## Como Testar

1. **Acesse**: `http://localhost:5174/login`
2. **Faça login com**:
   - Email: `admin@curriculoja.com`
   - Senha: `123456`
3. **Você será redirecionado para**: `http://localhost:5174/admin-dashboard`
4. **Teste as funcionalidades**:
   - Visualizar estatísticas
   - Cadastrar novo usuário
   - Baixar template Excel
   - Importar arquivo Excel
   - Exportar dados existentes

## Segurança

### Medidas Implementadas:
- ✅ Verificação de autenticação em todas as rotas admin
- ✅ Validação de tipo de usuário
- ✅ Proteção contra acesso não autorizado
- ✅ Sanitização de dados na importação Excel
- ✅ Validação de emails únicos

### Recomendações para Produção:
- 🔒 Alterar credenciais padrão do admin
- 🔒 Implementar autenticação JWT
- 🔒 Adicionar rate limiting
- 🔒 Logs de auditoria
- 🔒 Criptografia de senhas (bcrypt)

## Próximos Passos Sugeridos

1. **Edição de Usuários**: Funcionalidade para editar dados existentes
2. **Logs de Atividade**: Histórico de ações administrativas
3. **Relatórios Avançados**: Dashboard com gráficos e métricas
4. **Backup/Restore**: Funcionalidades de backup dos dados
5. **Configurações do Sistema**: Painel de configurações gerais
