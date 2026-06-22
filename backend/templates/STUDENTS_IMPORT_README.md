# Importação de Alunos

Este documento define o modelo do arquivo (CSV/Excel) para cadastrar múltiplos alunos no sistema.

## Campos Suportados

| Coluna CSV/Excel | Campo Tabela users/students | Obrigatório | Tipo / Formato | Observações |
|------------------|-----------------------------|-------------|----------------|-------------|
| Nome | users.name | Sim | texto | Nome completo do aluno |
| Email | users.email | Sim | email | Único no sistema |
| Senha / NovaSenha | users.password | Sim (se quiser definir) | texto (>=8) | Use coluna "Senha" ou "NovaSenha"; se ausente o sistema gera uma senha aleatória e retorna no resultado |
| CPF | users.cpf | Opcional (recomendado) | 11 dígitos | Apenas números; validar duplicidade |
| Telefone | users.phone | Opcional | texto | Formato livre, normalizar depois |
| Matricula | students.student_registration | Opcional (recomendado) | texto (<=50) | Única por escola; usada para evitar duplicados |
| CursoID | students.course_id | Opcional | UUID | Deve existir em `courses`; vazio = sem curso agora |
| DataMatricula(YYYY-MM-DD) | students.enrollment_date | Opcional | Data ISO | Se vazio, pode assumir data atual |
| SemestreAtual | students.current_semester | Opcional | inteiro | >=1 e <= TotalSemestres |
| TotalSemestres | students.total_semesters | Opcional | inteiro | Duração planejada do curso |
| ContatoEmergenciaNome | students.emergency_contact_name | Opcional | texto | |
| ContatoEmergenciaTelefone | students.emergency_contact_phone | Opcional | texto | |
| DataNascimento(YYYY-MM-DD) | students.birth_date | Opcional | Data ISO | Validar >= 10 anos de idade |
| Genero | students.gender | Opcional | M/F/Outro | Padronizar (ex: M, F, Outro) |
| Observacoes | students.notes | Opcional | texto | Qualquer anotação inicial |

## Regras de Validação
1. Nome e Email são obrigatórios; Senha é opcional (se faltar será gerada).
2. Email deve ser único (case-insensitive).
3. Matrícula não pode repetir dentro da mesma escola (se fornecida).
4. Se `SemestreAtual` informado, também considerar `TotalSemestres` para coerência (`SemestreAtual <= TotalSemestres`).
5. Datas devem estar no formato `YYYY-MM-DD`.
6. CPF (se fornecido) deve ter 11 dígitos (apenas números) – você pode aplicar validação adicional de CPF futuramente.
7. Gênero: normalizar para conjunto aceito (ex: `M`, `F`, `Outro`).
8. Linha com erro NÃO impede importação das demais (estratégia sugerida). Gerar relatório de erros.

## Fluxo de Importação (Sugerido)
1. Upload do arquivo CSV/XLSX para endpoint `/api/schools/students/import` (a criar).
2. Backend:
   - Detectar tipo (XLSX ou CSV) e converter para objetos.
   - Validar linha a linha.
   - Para cada linha válida:
     - Criar usuário (`type='candidate'`).
     - Criar registro em `students` associando `school_id` (do token) e campos opcionais.
   - Registrar array de resultados: `{ index, email, status: 'created'|'error', message }`.
3. Resposta JSON retorna estatísticas: `total, created, errors, results[]`.
4. (Opcional) Gerar planilha Excel de retorno com colunas extra `Status` e `MensagemErro` para download.

## Exemplo de Objeto Interno (linha válida)
```json
{
  "name": "João da Silva",
  "email": "joao.silva@example.com",
  "password": "Senha@123",
  "cpf": "12345678901",
  "phone": "(11)90000-0000",
  "student_registration": "EST2024001",
  "course_id": null,
  "enrollment_date": "2024-02-01",
  "current_semester": 1,
  "total_semesters": 6,
  "emergency_contact_name": "Maria Silva",
  "emergency_contact_phone": "(11)95555-1111",
  "birth_date": "2006-05-10",
  "gender": "M",
  "notes": "Primeiro aluno de teste"
}
```

## Sugestão de Endpoint (POST)
`POST /api/schools/students/import`

Request: multipart/form-data com campo `file` (CSV/XLSX). Cabeçalho pode conter "Senha" ou "NovaSenha".

Response (exemplo):
```json
{
  "success": true,
  "summary": {"total": 20, "created": 18, "errors": 2},
  "results": [
    {"row": 2, "email": "joao.silva@example.com", "status": "created"},
    {"row": 3, "email": "maria.souza@example.com", "status": "created"},
    {"row": 4, "email": "duplicado@example.com", "status": "error", "message": "Email já está em uso"}
  ]
}
```

## Exportação
Já existe rota: `GET /api/schools/export/students?course_id=&status=` que gera planilha com duas abas (Estudantes, Análise de Desempenho). Use filtros conforme necessário.

## Boas Práticas Futuras
- Rate limiting por importação.
- Tarefas assíncronas para arquivos muito grandes (>2k linhas).
- Log de auditoria (quem importou, quando, quantos estudantes criados).
- Opção de atualização se email já existir (modo upsert controlado por flag).

## Próximos Passos
1. Criar rota de import no backend.
2. Criar página "Alunos" com tabs: Listar, Importar, Exportar.
3. Usar template CSV disponível em `backend/templates/students-import-template.csv`.
4. Implementar feedback de progresso no frontend.

---
Template e documentação prontos para uso.
