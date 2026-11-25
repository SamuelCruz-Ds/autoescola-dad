# Dados realistas para demonstrar o sistema

A carga `db:demo` utiliza o MySQL configurado localmente e abastece as visões do dono e dos professores a partir dos mesmos registros. Não existem listas fixas ou dados separados por tela.

Todos os nomes, contatos, placas, metas e exemplos de manutenção são fictícios e identificados como tal. As metas e os horários são editáveis, sem representar exigências legais ou recomendações mecânicas.

## Carregar

Depois de configurar o banco e criar o administrador:

```powershell
npm run db:setup
npm run db:demo
npm run dev
```

Se o aplicativo já estiver aberto, use **Atualizar dados**. A interface também consulta o banco ao navegar, recuperar o foco e periodicamente, preservando formulários em edição.

O `.env` e a conta atual do administrador não são alterados. A demonstração é adicional: não exclui nem substitui cadastros existentes. Em caso de colisão de identificadores, login ou placa, toda a inserção é recusada sem gravação parcial.

Um marcador é gravado na mesma transação dos dados. Reexecutar o comando preserva as datas originais, senhas e alterações feitas pela interface. O comando não recria nem reprograma aulas a cada abertura do aplicativo.

## Conteúdo da primeira carga

| Dados adicionais | Quantidade |
| --- | ---: |
| Professores e respectivas contas | 3 |
| Alunos | 12 |
| Metas por aluno e tipo | 24 |
| Veículos, incluindo categorias A e B | 3 |
| Aulas anteriores, de hoje e futuras | 60 |
| Relatórios enviados | 30 |
| Movimentos de quilometragem | 24 |
| Planos de manutenção, incluindo histórico | 6 |
| Manutenções realizadas | 3 |

Cada professor possui quatro alunos, vinte aulas e dez relatórios enviados. O dono consulta o conjunto completo; o professor recebe somente seus alunos e suas aulas/relatórios, conforme as permissões existentes.

Há aulas realizadas, faltas, cancelamentos e pendências de dias anteriores. Também há uma aula realizada com relatório pendente para distinguir ocorrência e documentação. As aulas de hoje continuam agendadas até o registro explícito da ocorrência: o horário vencido não comprova presença automaticamente.

O histórico abrange aproximadamente três meses anteriores à primeira carga, além de hoje e dias futuros. O painel inicia no mês corrente; amplie o filtro de período para consultar todo o histórico, inclusive cancelamentos de meses anteriores.

As agendas respeitam disponibilidade e categoria, sem sobreposição de professor, aluno ou veículo. Os hodômetros formam uma sequência contínua. Faltas, cancelamentos e aulas teóricas sem veículo não criam quilômetros. Movimentos externos têm justificativa e não contam como aulas.

As manutenções incluem exemplos em dia, próxima e atingida. Um aviso não altera automaticamente a disponibilidade: os veículos da carga permanecem disponíveis para as aulas futuras, conforme a regra aprovada do produto.

## Acessos dos professores

| Usuário | Professor fictício |
| --- | --- |
| `demo.marcos` | Marcos Oliveira |
| `demo.patricia` | Patrícia Souza |
| `demo.renato` | Renato Almeida |

Se `DEMO_PASSWORD` estiver definida no ambiente, a carga utiliza essa senha. Caso contrário, gera uma senha forte para as três contas e a salva apenas em `.demo-credentials.local.json`, na raiz do projeto. Esse arquivo é privado e ignorado pelo Git. Não é necessário alterar o `.env` para executar a carga.

O dono pode redefinir as senhas ou desativar as contas pelo gerenciamento de acessos. Reexecutar a demonstração não desfaz essas alterações. Se o arquivo de acessos tiver sido perdido, redefina as senhas pela interface, sem apagar os dados.

O comando anterior `db:seed` continua disponível para compatibilidade com os exemplos iniciais. Não é necessário executá-lo junto com `db:demo`. A carga antiga contém um exemplo proposital de veículo indisponível com aula futura a reorganizar; o conjunto novo é independente e não apaga dados que já tenham sido carregados.
