# Modelo de Importação de Alunos

Envie este modelo para as escolas preencherem. Elas devem **manter exatamente os nomes das colunas** e enviar de volta em **CSV (.csv)** ou **Excel (.xlsx)**.

## Colunas
| Coluna | O que colocar | Observações |
|--------|---------------|-------------|
| Nome | Nome completo do aluno | Obrigatório |
| Email | Email do aluno | Obrigatório. Usado para login. Precisa ser único. |
| CPF | CPF do aluno | Apenas números ou formatado. Opcional (pode ficar vazio). |
| Telefone | Telefone do aluno | Opcional. Pode usar (99) 99999-9999 ou só números. |
| Senha | RA do aluno (ou senha inicial desejada) | Se vazio será gerada uma senha automática. Aparece no relatório de importação e exportação até o primeiro login. |
| Data de Nascimento | Data no formato DD/MM/AAAA | Opcional. Aceita também AAAA-MM-DD.

## Exemplo
```
Nome,Email,CPF,Telefone,Senha,Data de Nascimento
nome do aluno,email do aluno,CPF do aluno,telefone do aluno,RA do aluno,data de nascimento do aluno
```

## Regras de Processamento
- Emails duplicados são ignorados e listados como erro.
- RA/Senha vazia: o sistema cria uma senha aleatória segura.
- CPF: caracteres não numéricos são removidos automaticamente.
- Datas: tenta converter DD/MM/AAAA ou AAAA-MM-DD; formatos inválidos são ignorados.
- A senha inicial fica salva em `initial_password` até políticas futuras (opcional limpar depois do primeiro login).

## Boas Práticas ao Preencher
1. Revise se não existem espaços extras no final das células.
2. Não altere a ordem ou o nome das colunas.
3. Gere o arquivo final preferencialmente em UTF-8 (no Excel: Salvar como CSV UTF-8).
4. Caso a escola use o RA como senha, coloque exatamente o RA na coluna Senha.

## Como Importar (interno)
Endpoint: POST /api/schools/students/import (multipart/form-data, campo `file`).

## Como Baixar os Modelos (interno)
- CSV já disponível em: backend/templates/students-import-template.csv (servido estático se configurado).
- XLSX: GET /api/schools/export/students-template

Qualquer ajuste novo no modelo: atualizar este README e ambos os templates.
