# Matriz de CRUD e permissões

As entidades de negócio possuem criação, consulta, alteração e exclusão.
Os comandos mutáveis são autorizados em `AppService` antes da execução das
classes de domínio e da gravação transacional no MySQL.

| Entidade | Criar | Consultar | Alterar | Excluir | Local no app |
| --- | --- | --- | --- | --- | --- |
| Aluno | `student.save` | Lista / ficha | `student.save` com ID | `catalog.remove` | Cadastros → Alunos |
| E-mail e endereço do aluno | Formulário de aluno | Ficha do aluno | Formulário de aluno | `student.details.remove` | Ficha → Excluir e-mail e endereço |
| Meta de aulas | Formulário de aluno | Progresso / formulário | Formulário de aluno | `student.goal.remove` | Ficha → Excluir meta teórica/prática |
| Instrutor e disponibilidade | `instructor.save` | Lista / ficha | `instructor.save` com ID | `catalog.remove` | Cadastros → Instrutores |
| Conta de acesso | `access.save` | Lista de acessos | `access.save` com ID | `access.remove` | Cadastros → Acessos |
| Veículo | `vehicle.save` | Lista / ficha | `vehicle.save` com ID | `catalog.remove` | Frota |
| Aula | `lesson.save` | Agenda / detalhes | Remarcar / ocorrência | `lesson.remove` | Detalhes da aula → Excluir aula |
| Relatório de aula | `report.save` | Relatórios enviados | Correção justificada | `report.remove` | Consultar relatório → Excluir relatório |
| Exame | `exam.save` | Ficha do aluno | `exam.save` com ID | `exam.remove` | Ficha do aluno → Exames |
| Movimento externo / ajuste | `movement.save` | Ficha do veículo | `movement.save` com ID | `movement.remove` | Ficha → Movimentos |
| Movimento de aula | Envio do relatório | Ficha / relatório | Correção do relatório | Exclusão do relatório | Gerido junto ao relatório para manter consistência |
| Plano de manutenção | `maintenance.save` | Lista / detalhes | `maintenance.save` com ID | `maintenance.remove` | Programação → Excluir programação |
| Manutenção realizada | `maintenance.complete` | Ficha do veículo | `maintenance.record.save` | `maintenance.record.remove` | Ficha → Manutenções realizadas |

## Restrições de integridade

- Exclusões e gestão de contas são exclusivas do dono. O instrutor continua restrito às suas aulas e aos relatórios autorizados.
- Cadastros de aluno, instrutor e veículo com vínculos não são apagados em cascata. É necessário tratar os vínculos, ou desativar o cadastro para preservá-los.
- A exclusão de aula exige remover antes seu relatório/movimento. Cancelar é uma operação diferente e continua preservando a aula.
- Excluir um relatório remove seu movimento vinculado e recalcula o hodômetro na mesma transação. A ocorrência já informada da aula é mantida, e o relatório fica pendente para novo envio do instrutor.
- Qualquer recálculo de hodômetro é recusado se deixar manutenção fora do intervalo validado do veículo. O rollback preserva os dados anteriores.
- Planos com manutenções realizadas não são excluídos antes de tratar esses registros. Arquivar continua disponível.
- Corrigir ou excluir uma manutenção realizada não altera silenciosamente a próxima programação. O dono revisa o plano separadamente.
- Contas com autoria em relatórios, movimentos, serviços ou auditoria são desativadas em vez de excluídas. Não se exclui/desativa a própria conta nem se desativa o último dono ativo.
- Perfil e vínculo de contas existentes são imutáveis para preservar a autoria; crie outra conta quando necessário.
- Senhas novas/redefinidas usam de 12 a 256 caracteres, com maiúscula, minúscula, número e símbolo. Scrypt com salt permanece no armazenamento.
- As novas exclusões e correções exigem justificativa e preservam o conteúdo anterior em auditoria.

## Tabelas técnicas

`p2_audit_entries` é um registro automático, imutável pela interface, consultável
em Relatórios → Auditoria. Ele mantém evidência de alterações e exclusões.
`p2_app_lock` coordena as transações e não representa um cadastro do usuário.
Oferecer edição/exclusão livre dessas duas tabelas comprometeria o propósito
de integridade do sistema; elas não são entidades de negócio gerenciáveis.

As demais 12 tabelas correspondem às entidades da matriz. O endereço é um
campo composto de `p2_student_details`, e a disponibilidade é um campo composto
do instrutor; ambos são editados nos respectivos formulários.
