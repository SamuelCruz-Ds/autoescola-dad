# Roteiro de apresentação

Este roteiro organiza a exposição do trabalho. Cada integrante deve entender
o código que apresenta e explicar as decisões com suas próprias palavras.
Não há suíte nem comandos de testes nesta distribuição.

## Preparação do ambiente

1. Use Node.js 24 com npm e MySQL 8.0.16 ou superior.
2. Execute `npm ci`, copie `.env.example` para `.env` e preencha sua configuração local.
3. Execute `npm run db:setup` para criar as tabelas e o primeiro dono.
4. Se quiser dados fictícios adicionais, escolha `npm run db:demo`.
5. Abra com `npm run dev`; para usar `npm start`, execute antes `npm run build`.
6. Para a quarta API, configure o Resend conforme `INTEGRACOES.md` antes da apresentação.

Não é necessária alteração do esquema para estas correções. Uma instalação
existente preserva suas credenciais e seus dados. O `.env` pessoal não deve ser
enviado ao GitHub.

## Divisão sugerida da exposição

| Integrante | O que explicar |
| --- | --- |
| Samuel | Electron, estrutura de pastas, interface, comunicação IPC e cadastros |
| Lucas | Segurança, contas, restrições de exclusão, agenda e frota |
| Felipe | Esquema relacional, classes de regras, relatórios, manutenção e integrações |
| Tiago | Persistência MySQL, contratos TypeScript, auditoria, navegação e dados fictícios |

Essa divisão é uma sugestão de fala; os commits continuam na ordem aprovada.

## Sequência da demonstração

1. Mostre as tabelas e chaves estrangeiras de `database/schema.sql`. Explique que o banco possui 12 tabelas de negócio e duas técnicas.
2. Abra o app como dono. Mostre Cadastros → Alunos, Instrutores e Acessos; indique a criação, consulta, edição e exclusão em registros sem dependências.
3. Mostre na ficha de aluno as metas, contato complementar e exames. Explique a remoção desses dados sem excluir as aulas.
4. Abra a agenda. Explique disponibilidade, conflitos e a diferença entre cancelar e excluir aula.
5. Apresente a visão de instrutor e o envio do relatório de uma aula encerrada. Volte à visão do dono para mostrar consulta, correção e exclusão justificada do relatório.
6. Na ficha do veículo, mostre o vínculo entre relatório, movimento e hodômetro. Explique por que a exclusão pode ser bloqueada quando uma manutenção ficaria inconsistente.
7. Mostre programação, registro do serviço realizado, correção e exclusão. Explique que alterações do histórico não reprogramam automaticamente o próximo serviço.
8. Abra Relatórios → Auditoria. Mostre autoria, justificativa e conteúdo anterior/posterior, inclusive de registros excluídos.
9. Apresente as quatro APIs com as finalidades descritas em `INTEGRACOES.md`.
10. Mostre o histórico do GitHub e a autoria real dos quatro integrantes.

Use registros fictícios, separados de qualquer operação real da autoescola.
Somente faça envios de e-mail para destinatários que autorizaram o recebimento.

## Perguntas que o grupo precisa saber responder

- Por que o aplicativo usa Electron e por que o renderer não acessa diretamente o MySQL?
- Quais classes concentram as regras e como a interface chama esses serviços?
- Quais tabelas se relacionam e o que ocorre quando uma chave estrangeira impede exclusão?
- Como senhas são armazenadas e como o perfil do instrutor limita os dados recebidos?
- Por que cancelar, desativar e excluir são operações diferentes?
- Como o rollback evita apagar relatório sem ajustar a quilometragem?
- Quais são as quatro finalidades de API e o que acontece se a internet falhar?
- Como a auditoria preserva a responsabilidade de quem enviou ou corrigiu um registro?

A nota é definida pelo professor. O código, a demonstração, o entendimento
do grupo e os requisitos de colaboração/histórico precisam ser apresentados
de forma coerente; o pacote não representa uma garantia de nota.
