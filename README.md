# Autoescola DAD

Sistema desktop do Grupo 4, com Electron, TypeScript, Bootstrap e MySQL.
Integrantes: Samuel, Lucas, Felipe e Tiago.

O dono administra alunos, instrutores, acessos, veículos, aulas, exames,
relatórios, quilometragem e manutenção. O instrutor acompanha sua agenda,
seus alunos e os relatórios das aulas sob sua responsabilidade.

## Instalação

Pré-requisitos do projeto: Node.js 24 com npm e MySQL 8.0.16 ou superior.

```bash
npm ci
cp .env.example .env
```

Edite o `.env` com a conexão MySQL e as credenciais do administrador.
Defina uma senha própria em `ADMIN_PASSWORD`, com pelo menos 12 caracteres,
incluindo maiúscula, minúscula, número e símbolo. O arquivo pessoal do ZIP
original não faz parte deste repositório.

```bash
npm run db:setup
npm run dev
```

Para executar a versão compilada:

```bash
npm run build
npm start
```

O `dist/` é gerado localmente. Depois de clonar, `npm start` exige build prévio.
O MySQL deve estar acessível para entrar no sistema e gravar dados.

## Dados fictícios opcionais

Escolha uma carga de demonstração depois de preparar o banco:

```bash
npm run db:demo
```

Essa carga adiciona 12 alunos, três instrutores, três veículos e 60 aulas.
As contas são `demo.marcos`, `demo.patricia` e `demo.renato`.
Se `DEMO_PASSWORD` não estiver definida, a senha fica no arquivo local
`.demo-credentials.local.json`, ignorado pelo Git.

A alternativa `npm run db:demo:sql` usa `database/demonstracao.sql`.
Não é necessário executar todas as cargas. Consulte
[dados de demonstração](docs/DADOS-DEMONSTRACAO.md).

## Arquitetura

| Pasta | Conteúdo |
| --- | --- |
| `src/main/` | Electron, autenticação, serviços, regras e banco |
| `src/preload/` | Ponte de comunicação restrita |
| `src/renderer/` | Telas, componentes e estilos |
| `src/shared/` | Tipos e contratos |
| `database/` | Esquema, migração e dados fictícios |
| `scripts/` | Execução, build e preparação do banco |
| `docs/` | Requisitos, decisões e instalação |

As regras principais usam `CatalogService`, `ScheduleService`,
`LessonReportService`, `FleetService`, `ExamService`, `AppService` e `Integrations`.
O banco possui 14 tabelas; `p2_app_lock` é uma tabela técnica de coordenação.

## Integrações

| Serviço | Finalidade no aplicativo |
| --- | --- |
| ViaCEP | Preencher endereço pelo CEP no cadastro do aluno |
| BrasilAPI | Exibir feriados nacionais na agenda |
| Open-Meteo | Consultar clima e previsão das aulas |
| Resend | Enviar lembrete de aula, com confirmação do dono |

As três primeiras dependem de internet. O Resend também exige
`RESEND_API_KEY` e `REMINDER_FROM` válidos no `.env`, além do e-mail do aluno.
O envio é solicitado na véspera da aula. Falhas externas são informadas na tela.

## Segurança e comandos

Senhas usam scrypt com salt. Permissões são verificadas no processo principal;
hashes e credenciais não são entregues à interface. O Electron utiliza sandbox,
isolamento de contexto e `nodeIntegration: false`. As operações do banco usam
transações e parâmetros para valores SQL.

Comandos adicionais: `npm run typecheck`, `npm run format` e `npm run package`.
O último gera o instalador Windows em `release/`.

Esta distribuição não inclui suítes, comandos ou dependências de testes.
Não versionar `.env`, credenciais locais, `node_modules/`, `dist/` ou `release/`.

## Documentação

- [Instalação](docs/INSTALACAO.md)
- [Banco de dados](docs/BANCO-DE-DADOS.md)
- [Requisitos funcionais do projeto](docs/REQUISITOS.md)
- [Requisitos gerais fornecidos pelo professor](docs/requisitos-projeto-final.pdf)
- [Conferência dos requisitos gerais](docs/CONFERENCIA-REQUISITOS.md)
- [Decisões de implementação](docs/DECISOES.md)

As entidades de negócio possuem CRUD com as restrições de integridade documentadas em [MATRIZ-CRUD.md](docs/MATRIZ-CRUD.md). A auditoria geral pode ser consultada pelo dono em Relatórios → Auditoria, incluindo registros excluídos. Consulte o [roteiro de apresentação](docs/ROTEIRO-APRESENTACAO.md) e a [configuração das integrações](docs/INTEGRACOES.md).


## Correções desta versão

Foram acrescentadas exclusões de aulas/relatórios, exclusão de planos, edição/exclusão de manutenções realizadas, gestão de contas dos dois perfis, remoção independente de metas/contato complementar e auditoria geral. As novas ações exigem autorização no backend, justificativa e integridade referencial. Veja `docs/CORRECOES.md`. Não houve mudança de esquema nem inclusão de testes.
