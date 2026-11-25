# Conferência atualizada — Autoescola DAD

Data: 24/11/2026. Base: projeto fornecido em `Autoescola-v3-Pessoal-AGENTS.zip`
e requisitos gerais do professor em `requisitos-projeto-final.pdf`.

As lacunas de CRUD identificadas na revisão foram implementadas no backend e
nas telas. Esta entrega mantém as quatro integrações reais, as classes de
domínio, Electron, TypeScript e a versão sem testes.

## Situação dos requisitos

| Exigência do professor | Situação na implementação revisada | Evidência |
| --- | --- | --- |
| Banco relacional com ao menos seis tabelas relacionadas | Implementado | 14 tabelas MySQL: 12 de negócio e duas técnicas. Chaves estrangeiras em `database/schema.sql`. |
| CRUD das entidades de negócio | Implementado com restrições de integridade | Matriz completa em `docs/MATRIZ-CRUD.md`. Novas exclusões e correções também estão disponíveis na interface. |
| APIs em quatro situações distintas | Quatro integrações reais | ViaCEP para CEP, BrasilAPI para feriados, Open-Meteo para clima e Resend para lembretes. O Resend requer configuração privada local antes da demonstração. |
| Segurança e justificativas | Medidas implementadas e documentadas | Scrypt, validação, perfis, filtragem por sessão, IPC restrito, Electron isolado, SQL parametrizado, transações, auditoria e proteção de contas administrativas. |
| Lógica organizada em classes / POO | Implementado | `AppService`, `CatalogService`, `ScheduleService`, `LessonReportService`, `FleetService`, `ExamService` e `Integrations`. |
| Electron com lógica em TypeScript | Implementado | Código em `src/` e `scripts/` usa TypeScript; o build gerado não é incluído nos commits. |
| Repositório do grupo, professor colaborador e autoria dos quatro | A executar pelo grupo | As 12 etapas mantêm três commits por integrante. Convidar `willcotil` antes do primeiro commit. Nenhum push foi feito nesta revisão. |

## Correções entregues

- **Aulas:** exclusão pelo dono com justificativa; relatórios/movimentos dependentes precisam ser tratados antes. Cancelamento permanece como operação própria.
- **Relatórios:** exclusão com auditoria e remoção transacional do movimento associado. A ocorrência da aula continua registrada e o relatório volta a ficar pendente para o instrutor.
- **Planos de manutenção:** exclusão explícita de planos sem serviços dependentes; arquivamento continua disponível para preservar os vínculos.
- **Manutenções realizadas:** correção de serviço, data, hodômetro e observações; exclusão justificada. Autoria original e vínculo com o plano são preservados nas correções.
- **Acessos:** nova área Cadastros → Acessos com criação, consulta, edição e exclusão de contas de dono e instrutor. Contas com autoria devem ser desativadas. A própria conta e o último dono ativo ficam protegidos.
- **Metas e contato complementar:** exclusões independentes na ficha do aluno, com possibilidade de cadastrar novamente pela edição do aluno.
- **Auditoria:** nova área Relatórios → Auditoria, com busca, autor, justificativa e conteúdo anterior/posterior, incluindo registros removidos.
- **Quilometragem:** validação compartilhada impede que qualquer recálculo deixe manutenção fora do histórico de hodômetro do veículo.
- **Senhas:** novos acessos/redefinições exigem pelo menos 12 caracteres com maiúscula, minúscula, número e símbolo. Scrypt com salt permanece no armazenamento.
- **Sessões:** mudar a própria senha mantém a sessão que efetuou a operação e invalida as outras sessões com a senha anterior.
- **Execução dos scripts:** os comandos usam `node --import tsx`, evitando a criação do pipe auxiliar do CLI tsx no ambiente de compilação.

As exclusões novas são autorizadas no processo principal e executadas dentro
da transação MySQL existente. O registro é removido da respectiva tabela de
negócio, enquanto o conteúdo anterior permanece em auditoria. Não se trata
apenas de esconder o registro na tela ou de mudar uma legenda de botão.

## Restrições que continuam intencionais

Chaves estrangeiras, proteção do próprio acesso e preservação de autoria
continuam impedindo exclusões inconsistentes. Essas restrições fazem parte
das regras de negócio; não representam ausência dos comandos de CRUD.
O histórico técnico de auditoria não pode ser livremente alterado/excluído,
e a linha técnica de bloqueio não é um cadastro de usuário.

Correção normal de quilometragem deve usar a correção do relatório; excluir
relatório é uma ação excepcional do dono, confirmada e justificada.
Corrigir/excluir serviço realizado não reprograma o próximo serviço de forma
silenciosa. O plano deve ser revisado separadamente pelo dono.

O esquema de banco não mudou. Uma instalação existente não precisa de uma
nova migração para estas funcionalidades; suas credenciais e seus dados
não foram alterados por esta revisão.

## Verificações realizadas

| Verificação | Resultado |
| --- | --- |
| Instalação de dependências com scripts de instalação desabilitados | Concluída com `npm ci --ignore-scripts --no-audit --no-fund`. |
| TypeScript | `npm run typecheck` concluído sem erros. |
| Compilação | `npm run build` concluído: processos principal/preload e renderer produzidos. |
| Conferência do pacote | Montagem cumulativa das etapas igual ao código corrigido; dependências locais entre módulos resolvidas em cada etapa; ausência de arquivos de teste, `.env` pessoal, build e `node_modules`. |
| Testes automatizados | Não criados nem executados; não incluídos na distribuição, conforme solicitado. |

Compilar não comprova os fluxos em execução. Nesta revisão não foram
executados o aplicativo Electron, o MySQL, o instalador Windows nem chamadas
às APIs; não foram enviados e-mails. Os comportamentos de CRUD foram
implementados e revisados no código, mas dependem da apresentação no ambiente
configurado do grupo para demonstrar o resultado de ponta a ponta.

## Preparação que continua dependendo do grupo

1. Configurar seu `.env` e acesso ao MySQL.
2. Configurar chave e remetente Resend para apresentar a quarta integração.
3. Convidar `willcotil` e os integrantes antes de iniciar a sequência.
4. Cada integrante revisar e executar seus próprios commits, com nome/e-mail corretos.
5. Explicar as regras e a arquitetura usando `docs/ROTEIRO-APRESENTACAO.md`.

A entrevista específica com o professor não foi disponibilizada. O PDF
geral não exige testes automatizados; a especificação interna foi ajustada
para descrever as correções autorizadas nesta conversa. A divisão em etapas
não comprova participação passada nem desenvolvimento ao longo de um período
anterior. A nota final depende do professor, da demonstração, do entendimento
e do histórico real do grupo; não é garantida por esta entrega.
