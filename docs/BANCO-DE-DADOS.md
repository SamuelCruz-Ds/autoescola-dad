# Banco de dados MySQL

O aplicativo utiliza MySQL real, com InnoDB, e requer MySQL 8.0.16 ou superior para as restrições `CHECK`. Não existe banco em memória para uso normal. O processo principal mantém as credenciais e o renderer recebe somente os dados autorizados pelo serviço.

## Configuração local

Copie `.env.example` para `.env` na raiz do repositório e configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`. O `.env` deve continuar fora do Git. O usuário padrão é `autoescola`; não há senha de administrador fixa no código.

O serviço MySQL precisa estar em execução. A conta usada na preparação deve poder criar o banco configurado e suas tabelas. Um administrador do MySQL pode, alternativamente, criar previamente o banco e conceder os privilégios somente sobre ele. Para o uso cotidiano bastam `SELECT`, `INSERT`, `UPDATE` e `DELETE` nas tabelas; a conta de preparação também necessita de `CREATE`, `INDEX` e `REFERENCES`. Não são necessárias permissões globais nem acesso ao banco de outros aplicativos.


Exemplo para executar uma vez com uma conta administradora do MySQL, substituindo a senha indicada por uma senha própria:

```sql
CREATE DATABASE autoescola CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'autoescola'@'localhost' IDENTIFIED BY 'SUBSTITUA_POR_SUA_SENHA';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, REFERENCES
  ON autoescola.* TO 'autoescola'@'localhost';
```

Configure a mesma senha em `DB_PASSWORD` no `.env`. Em outro computador, o endereço do servidor e o host permitido para a conta precisam corresponder à rede utilizada. A configuração de exemplo é local.

## Preparar esquema e primeiro administrador

Defina `ADMIN_LOGIN` e `ADMIN_PASSWORD` no ambiente local. A senha de preparação precisa ter pelo menos 12 caracteres, incluindo letra maiúscula, minúscula, número e símbolo. Escolha uma senha própria; os exemplos de configuração não são credenciais utilizáveis de demonstração.

```powershell
npm run db:setup
```

O comando cria o banco se permitido, aplica `database/schema.sql` e cria o primeiro administrador. Se já existir administrador, preserva sua senha e os registros existentes. Pode ser repetido para conferir a existência das tabelas. A criação das tabelas não apaga dados; `CREATE TABLE IF NOT EXISTS` não é um mecanismo de migração para futuras alterações de estrutura. Mudanças posteriores no esquema precisarão de um script explícito, revisado e documentado.

O esquema é preparado antes da transação que insere o administrador, pois DDL do MySQL possui comportamento de confirmação próprio. Uma falha de preparação deve ser corrigida antes de repetir o comando.

## Prefixo das tabelas e bases existentes

Todas as 14 tabelas do projeto usam o prefixo `p2_`, incluindo `p2_app_lock`. Uma base nova recebe esses nomes ao executar `npm run db:setup`.

Se a base foi criada com a versão anterior, faça backup, feche todas as instâncias do aplicativo e selecione o banco correto no cliente MySQL. Execute uma única vez o arquivo `database/migrations/001_prefix_p2.sql` antes de rodar `npm run db:setup` novamente. Use uma conta autorizada a renomear tabelas.

A migração renomeia as 12 tabelas originais em um único `RENAME TABLE`, preservando registros e vínculos. Ela exige todas as tabelas antigas e nenhum dos nomes de destino ocupado; não combina duas bases nem sobrescreve tabelas. Não execute essa migração em uma base nova ou já migrada. O `db:setup` cria as tabelas prefixadas, mas não transfere automaticamente dados das tabelas antigas.

## Dados fictícios opcionais

Depois da preparação, defina uma senha própria em `DEMO_PASSWORD`, com a mesma política da preparação, e execute:

```powershell
npm run db:seed
```

São criadas as contas `demo.ana` e `demo.bruno`, vinculadas a instrutores fictícios, além de alunos, dois veículos, aulas, relatórios, movimentos, planos e histórico de manutenção. As duas contas usam a senha definida localmente em `DEMO_PASSWORD`, que não é impressa. A conta do administrador permanece a criada na preparação.

Nomes e contatos são identificados como fictícios. As placas `DEMO001` e `DEMO002` são identificadores de demonstração. A disponibilidade de 07h a 20h e as metas iniciais de 3 aulas teóricas e 5 práticas são exemplos editáveis, sem significado legal. É possível definir `DEMO_THEORY_GOAL` e `DEMO_PRACTICE_GOAL` antes da primeira carga; os valores devem ser inteiros não negativos. Os limites e margens de manutenção são exemplos, sem recomendação mecânica.

As datas da carga são relativas ao dia local de execução: há aulas anteriores, de hoje e de amanhã. Uma aula realizada continua com relatório pendente; outra tem relatório prático e 22 km registrados; há falta sem veículo, cancelamento e veículo em manutenção com aula futura a reorganizar. São cenários para conferir as telas e não novos agendamentos feitos pelo serviço sem validação.

A carga programática inteira usa uma transação e identificadores estáveis. Reexecutá-la não duplica nem sobrescreve registros, senhas, metas ou alterações realizadas pela interface. Ela não limpa o banco. Se os logins reservados já estiverem em uso sem os registros da demonstração, a carga é recusada sem alterações.

## Organização das tabelas

| Tabelas | Responsabilidade |
| --- | --- |
| `p2_instructors`, `p2_users` | Instrutor e conta de acesso vinculada, com login único e hash de senha. A disponibilidade semanal é um pequeno campo JSON do instrutor. |
| `p2_students`, `p2_student_goals` | Cadastro sem credencial e meta inteira por aluno e tipo de aula. |
| `p2_student_details`, `p2_exams` | Contato por e-mail, endereço opcional e histórico de exames. O setup cria essas tabelas na atualização de uma base existente. |
| `p2_vehicles` | Identificação, placa única, disponibilidade e hodômetros. |
| `p2_lessons` | Agendamento, situação, cancelamento e vínculos com aluno, instrutor e veículo opcional. |
| `p2_lesson_reports` | Um relatório principal por aula, autor, envio, resultado e hodômetros quando aplicáveis. |
| `p2_mileage_movements` | Movimentos por veículo, com origem, cronologia e no máximo um movimento por aula. |
| `p2_maintenance_plans`, `p2_maintenance_records` | Programação independente por serviço e registros realizados ligados ao mesmo veículo do plano. |
| `p2_audit_entries` | Histórico de alterações, responsável, justificativa e valores anteriores/posteriores da entidade. |
| `p2_app_lock` | Linha estável de coordenação das mutações. |

Os dados de negócio ficam em colunas e tabelas relacionadas; não existe um documento JSON contendo o estado completo. Os textos anteriores/posteriores da auditoria preservam a revisão de uma entidade e não substituem as tabelas de negócio. As chaves estrangeiras não usam exclusão em cascata: cadastros históricos devem ser desativados pelo serviço, preservando vínculos.

Índices cobrem vínculos, horários por aluno/instrutor/veículo, cronologia de movimentos e consultas de auditoria/manutenção. Login, placa, meta aluno/tipo, relatório por aula e origem de movimento de aula têm unicidade no banco. As consultas de valores são parametrizadas; identificadores SQL vêm somente dos mapeamentos internos ou de `DB_NAME` validado.

## Transações e datas

`createDatabase()` devolve a interface `Database` compartilhada. O pool conecta sob demanda, permitindo que falhas de conexão sejam tratadas pelo login.

`read()` executa uma transação somente de leitura com snapshot consistente em `REPEATABLE READ`. Todas as tabelas pertencem à mesma visão confirmada, sem misturar momentos de duas alterações.

`transaction(callback)` inicia em `READ COMMITTED`, bloqueia a linha `p2_app_lock.id = 1` com `SELECT ... FOR UPDATE` e só então carrega os registros e chama as regras de negócio. O bloqueio pertence ao MySQL e protege instâncias diferentes conectadas ao mesmo banco. Após a validação, são gravadas apenas entidades inseridas, alteradas ou removidas, em ordem compatível com as chaves estrangeiras. Falhas do callback ou do SQL causam rollback; a conexão sempre retorna ao pool.

Esse bloqueio global privilegia simplicidade e integridade no volume escolar. Mutações longas fazem outras alterações aguardar; chamadas externas e esperas de interação não devem ocorrer dentro do callback. Leituras continuam disponíveis. O carregamento de um estado tipado completo também é uma escolha para o volume deste projeto; não é uma arquitetura destinada a grandes volumes.

Datas-horas são `DATETIME` local no MySQL e strings `AAAA-MM-DDTHH:mm` no contrato, sem conversão para UTC. O driver utiliza `dateStrings: true`; a data de manutenção é `DATE` / `AAAA-MM-DD`. Decimal de hodômetro retorna como número. Todas as estações devem usar a mesma convenção do calendário operacional. IDs são strings UUID estáveis, sem depender da posição nas listas.
