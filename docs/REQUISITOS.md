# Especificação de requisitos — Sistema de Gerenciamento de Autoescola
**Projeto:** trabalho de DAD — Grupo 4  
**Versão:** 1.0 — 19/11/2026  
**Finalidade:** documentar as funcionalidades e regras combinadas para orientar o protótipo e o desenvolvimento.

## 1. Objetivo e limites
Criar um sistema para o dono administrar a autoescola e para os instrutores acompanharem suas aulas e registrarem seus resultados. Centralizar alunos, instrutores, veículos, agenda, progresso dos alunos, relatórios de aula, quilometragem e manutenção.

Existem somente dois perfis de acesso: **dono/administrador** e **instrutor/professor**. Alunos possuem cadastro e histórico, mas **não possuem login nem portal**.

Este documento contém requisitos do produto. Não contém o prompt de criação dos agentes, a divisão da equipe de IA nem instruções de Scrum. A definição dos agentes será fornecida separadamente.

### 1.1 Escopo aprovado
- Painel gerencial do dono.
- Agenda geral e agenda individual dos instrutores.
- Cadastro e acompanhamento dos alunos.
- Cadastro e disponibilidade dos instrutores.
- Cadastro, disponibilidade e quilometragem dos veículos.
- Agendamento, remarcação e cancelamento de aulas.
- Registro de presença, realização e desempenho.
- Relatório obrigatório após cada aula.
- Acompanhamento dos relatórios pendentes.
- Atualização automática da quilometragem.
- Histórico e avisos de manutenção.
- Relatórios gerenciais.
- Gerenciamento de contas de dono e instrutor, com proteção do próprio acesso e da autoria.

### 1.2 Fora desta versão
- Acesso do aluno.
- Financeiro, mensalidades, pagamentos, cobranças, receitas e despesas.
- Integrações com órgãos de trânsito e serviços externos.
- Funcionalidades adicionais que não estejam descritas aqui.

## 2. Perfis e permissões
| Ação | Dono | Instrutor |
| --- | --- | --- |
| Ver painel geral e indicadores da autoescola | Sim | Não |
| Consultar agenda de todos os instrutores | Sim | Não |
| Consultar a própria agenda | Sim | Sim |
| Agendar, remarcar e cancelar aulas | Sim | Não |
| Gerenciar alunos, instrutores e veículos | Sim | Não |
| Consultar alunos | Todos | Somente os que atende |
| Consultar progresso dos alunos | Todos | Somente os que atende |
| Preencher relatório de aula | Acompanhar; correções conforme regra abaixo | Somente das próprias aulas |
| Consultar relatórios de aula | Todos | Somente das próprias aulas |
| Consultar pendências de relatórios | Todas | Somente as próprias |
| Gerenciar quilometragem e manutenção | Sim | Apenas registrar hodômetro em suas aulas |
| Registrar deslocamento fora de aula | Sim, com justificativa | Não |
| Ver relatórios gerenciais | Sim | Apenas resumo pessoal de aulas |
| Criar, editar, desativar e excluir acessos sem autoria | Sim | Não |

A permissão deve ser verificada na lógica do sistema, e não apenas pela exibição ou ocultação de botões. O instrutor não pode consultar dados de colegas alterando identificadores.

## 3. Organização e experiência de uso
### 3.1 Acesso
- Tela de login com identificação de usuário e senha.
- Após entrar, direcionar automaticamente à tela inicial do perfil.
- Exibir nome do usuário, perfil e opção de sair.
- Recusar acesso de contas desativadas.
- Mostrar mensagem clara quando as credenciais forem inválidas.

### 3.2 Padrões das telas
- Interface em português do Brasil, com datas em dia/mês/ano e horários de 24 horas.
- Navegação consistente, formulários organizados e nomes claros.
- Campos obrigatórios identificados.
- Mensagens específicas para erros, conflitos, salvamento e ausência de dados.
- Estados visíveis de carregamento, vazio e falha.
- Não depender somente de cores para indicar uma situação: usar texto e, quando útil, ícones.
- Permitir navegação por teclado e oferecer contraste e rótulos legíveis.
- Confirmar ações relevantes como cancelamento e desativação.
- Preservar o preenchimento quando uma validação falhar.

## 4. Sistema do dono
### 4.1 Painel inicial
Apresentar quatro cartões principais:
1. Aulas realizadas no mês.
2. Aulas de hoje.
3. Alunos ativos.
4. Cancelamentos no mês.

Abaixo dos cartões:
- Gráfico de quantidade de aulas realizadas por mês.
- Agenda do dia com horário, aluno, instrutor, tipo de aula, veículo quando aplicável e situação.
- Botão destacado **Agendar aula**.
- Resumo das aulas agendadas no período.
- Avisos de relatórios pendentes, com quantidade e acesso à lista.
- Avisos de veículos próximos da manutenção ou com manutenção atingida.

Os indicadores precisam corresponder aos registros da agenda. Distinguir aulas realizadas de relatórios entregues: uma aula pode ter ocorrido e continuar com relatório pendente.

**Convenção operacional para o protótipo:** o mês corrente é o filtro inicial; os filtros de período alteram os indicadores correspondentes. Aulas de hoje representam as aulas não canceladas previstas para a data. Cancelamentos por período consideram a data em que o cancelamento foi registrado, com esse critério identificado na tela.

### 4.2 Agenda geral
- Calendário por dia, semana e mês.
- Filtros por data/período, instrutor e veículo.
- Diferenciar visualmente aulas agendadas, realizadas, faltas e canceladas.
- Exibir situação do relatório separadamente.
- Abrir detalhes da aula ao selecioná-la.
- Permitir agendar, remarcar e cancelar.
- Preservar histórico das alterações e justificativa de cancelamento.

Dados de uma aula:
- Aluno.
- Instrutor.
- Tipo: teórica ou prática.
- Categoria correspondente ao acompanhamento do aluno.
- Data, horário de início e de término.
- Veículo, obrigatório para aula prática que utilize veículo.
- Observações de agendamento.
- Situação da aula.
- Situação do relatório.

Não presumir que aulas teóricas precisam de veículo. A organização das aulas teóricas em turmas ou individualmente ainda depende da entrevista; não implementar um módulo de turmas como requisito já aprovado.

### 4.3 Alunos
- Listar, pesquisar, cadastrar, editar e desativar alunos.
- Dados operacionais mínimos: nome, contato, categoria pretendida, situação e instrutor responsável.
- Consultar aulas agendadas, realizadas, faltas, cancelamentos e observações.
- Separar o acompanhamento por tipo de aula.
- Exibir quantidade necessária, realizada e restante.
- Permitir ao dono informar a quantidade necessária por aluno e por tipo, sem presumir um número legal fixo.
- Um instrutor responsável no cadastro não impede que outra aula seja atribuída a outro instrutor pelo dono.
- Não criar credenciais para alunos.

Documentos pessoais adicionais devem ser definidos na entrevista, sem inventar uma lista obrigatória.

### 4.4 Instrutores
- Listar, pesquisar, cadastrar, editar e desativar.
- Dados mínimos: nome, contato e situação.
- Informar horários disponíveis.
- Associar a conta de acesso ao cadastro.
- Consultar agenda, alunos atendidos e quantidade de aulas realizadas no mês.
- Consultar relatórios pendentes por instrutor.
- Impedir novas aulas para instrutores inativos.
- Ao desativar um instrutor com aulas futuras, sinalizar as aulas que precisam ser reorganizadas; não apagá-las silenciosamente.

### 4.5 Veículos
- Listar, pesquisar, cadastrar, editar e desativar.
- Dados mínimos: identificação/modelo, placa, categoria, quilometragem inicial e situação.
- Situações: disponível, em manutenção e inativo.
- Exibir quilometragem atual, histórico de uso e manutenções.
- Mostrar aulas vinculadas ao veículo.
- Impedir novos agendamentos durante indisponibilidade.
- Ao colocar um veículo em manutenção, avisar sobre aulas futuras vinculadas que precisam de outro veículo ou remarcação.
- Manter histórico ao desativar; não excluir registros de aulas passadas.

### 4.6 Relatórios gerenciais
Consultas com filtro por período e, conforme o relatório, por aluno, instrutor, veículo e tipo:
- Aulas realizadas por mês.
- Aulas por instrutor.
- Aulas por aluno.
- Faltas e cancelamentos.
- Progresso dos alunos.
- Aulas com relatórios pendentes e respectivos responsáveis.
- Quilômetros percorridos por veículo e por aula.
- Situação das manutenções.

Exibir totais coerentes com os filtros e permitir consultar os registros que compõem um total. Exportação de arquivos não foi definida como obrigatória nesta versão.

### 4.7 Gerenciamento de acessos
- Criar acesso de instrutor.
- Vincular ao instrutor correto.
- Redefinir senha.
- Desativar acesso.
- Preservar histórico das aulas e autoria dos relatórios após desativação.
- Não permitir que instrutores alterem o próprio perfil para administrador.

## 5. Sistema do instrutor
### 5.1 Tela Meu dia
- Cartão em destaque **Sua próxima aula**.
- Exibir horário, aluno, tipo de aula, veículo quando aplicável e botão **Ver aula**.
- Listar as demais aulas do dia em ordem de horário.
- Exibir quantidade de aulas concluídas e ainda previstas no dia.
- Destacar relatórios pendentes, inclusive de dias anteriores.
- Oferecer acesso direto ao preenchimento de cada relatório.
- Se não houver próxima aula, mostrar mensagem clara em vez de um cartão vazio.

### 5.2 Minha agenda
- Visualizações por dia, semana e mês.
- Somente aulas atribuídas ao instrutor autenticado.
- Detalhes de horário, aluno, tipo, veículo, situação e relatório.
- Consulta sem permissão de agendar, remarcar ou cancelar.

### 5.3 Detalhes e registro da aula
- Dados necessários do aluno e contato quando relevante.
- Horário, tipo, veículo e observações do agendamento.
- Progresso do aluno no tipo de aula.
- Ações para registrar realização ou falta e preencher relatório.
- Situação do relatório visível.
- Consulta ao relatório enviado.

### 5.4 Meus alunos
- Listar somente alunos com vínculo de atendimento ao instrutor.
- Consultar progresso e histórico pertinente.
- Consultar observações necessárias ao acompanhamento.
- Não permitir editar cadastros gerais ou abrir dados de alunos sem vínculo.

### 5.5 Meu resumo
- Total de aulas realizadas na semana.
- Total de aulas realizadas no mês.
- Total de relatórios pendentes.
- Acesso aos próprios registros, sem indicadores de outros instrutores.

## 6. Relatório obrigatório de cada aula
### 6.1 Regra central
Após cada aula, o instrutor responsável deve preencher um relatório. Enquanto não enviar um relatório válido, a aula aparece como **Relatório pendente**.

A situação da aula e a situação do relatório são independentes. O sistema deve identificar aulas que aconteceram, mas ainda não foram documentadas.

### 6.2 Conteúdo
| Campo | Comportamento |
| --- | --- |
| Aula, aluno e instrutor | Vinculados automaticamente à aula |
| Data e horário | Apresentados a partir do agendamento |
| Tipo de aula | Apresentado a partir do agendamento |
| Resultado/presença | Informar se foi realizada com presença ou se houve falta |
| Observações | Descrever a aula e o desempenho do aluno, quando realizada |
| Veículo utilizado | Vinculado ao veículo efetivamente utilizado na aula prática |
| Hodômetro inicial | Obrigatório quando houve uso de veículo |
| Hodômetro final | Obrigatório quando houve uso de veículo |
| Quilômetros percorridos | Calculados automaticamente |
| Data/hora de envio e autor | Registrados pelo sistema |

O instrutor deve registrar os valores do painel do veículo, em vez de informar apenas uma distância estimada. Não exigir quilometragem em aula teórica sem veículo.

**Detalhamento operacional proposto:** nas faltas sem utilização do veículo, registrar a ocorrência e observação, sem exigir hodômetro e sem alterar quilometragem. Uma aula cancelada não exige relatório de desempenho e não pode gerar distância automaticamente. Esses tratamentos não autorizam descartar deslocamentos reais, que devem ser registrados separadamente quando existirem.

### 6.3 Fluxo
1. O dono agenda a aula.
2. O instrutor consulta a aula.
3. A aula acontece ou tem sua ocorrência registrada.
4. Se estiver sem relatório, permanece pendente.
5. O instrutor preenche os campos aplicáveis.
6. O sistema valida permissões, presença, dados e quilometragem.
7. O envio válido marca o relatório como preenchido.
8. Quando houve uso de veículo, o sistema registra o movimento de quilometragem.
9. O dono passa a visualizar o relatório e a quilometragem atualizada.
10. Os indicadores de manutenção são recalculados.

O fim do horário previsto deve fazer uma aula sem relatório aparecer na lista de pendências, mas **não comprova presença nem realização automaticamente**. Mostrar que a ocorrência ainda precisa ser informada.

### 6.4 Pendências
- Exibir contagem e lista na tela inicial do instrutor.
- Manter pendências de dias anteriores até regularização.
- O dono pode consultar todas, filtrando por instrutor e período.
- Mostrar data, horário, aluno e instrutor.
- Não remover a pendência por apenas abrir ou começar a preencher o formulário.
- Não bloquear todas as outras funções do instrutor por haver pendências: esse bloqueio não foi solicitado.
- Um rascunho, se existir, continua pendente.

### 6.5 Correções e autoria
- Manter um relatório principal por aula, evitando duplicação.
- Preservar autor, horário de envio e histórico de correções relevantes.
- **Convenção sugerida para implementação:** instrutor preenche o próprio relatório; após envio, correções controladas pelo dono exigem justificativa e preservam o registro anterior.
- Usar a correção justificada do relatório para corrigir quilometragem. Exclusão é uma ação excepcional do dono, com confirmação, justificativa e conteúdo anterior preservado na auditoria.
- O dono deve conseguir distinguir o que foi informado pelo instrutor e o que foi corrigido posteriormente.

## 7. Quilometragem
### 7.1 Cálculo
**Distância da aula = hodômetro final − hodômetro inicial.**

Exemplo:
- Inicial: 42.150 km.
- Final: 42.172 km.
- Distância: 22 km.

Se a quilometragem anterior era 42.150 km e não há outros movimentos, o veículo passa a apresentar 42.172 km.

### 7.2 Regras de consistência
- Aceitar apenas números válidos e não negativos.
- Rejeitar hodômetro final menor que o inicial.
- Registrar a quilometragem inicial do veículo no cadastro.
- Não somar novamente a distância ao reenviar, atualizar a tela ou salvar duas vezes o mesmo relatório.
- Vincular cada movimento à sua origem: aula, deslocamento externo ou ajuste justificado.
- Não permitir dois relatórios concorrentes sobrescreverem ou duplicarem a atualização do mesmo veículo.
- Atualizar relatório e movimento de quilometragem de forma consistente: se ocorrer falha, não deixar somente metade do registro salva.
- Conferir a sequência cronológica dos hodômetros.
- Não substituir a quilometragem atual pelo final de um relatório antigo entregue com atraso.
- Não somar a distância de um relatório atrasado a uma quilometragem que já contém esse percurso.
- Divergências entre registros devem ser apresentadas para regularização justificada, preservando histórico.
- Não preencher lacunas de quilometragem silenciosamente como se fossem aulas.
- Correções de relatórios precisam recalcular a sequência e os avisos sem duplicar distância.

A quilometragem atual representa o último hodômetro validado na sequência do veículo. O total percorrido em aulas é a soma das distâncias válidas dessas aulas; os dois indicadores têm significados diferentes.

### 7.3 Deslocamentos fora das aulas
O dono pode registrar movimentação externa, por exemplo um deslocamento até oficina:
- Veículo.
- Data e horário.
- Hodômetro inicial e final.
- Distância calculada.
- Justificativa.
- Responsável pelo lançamento.

Aplicar as mesmas validações de continuidade e duplicação. Esses quilômetros atualizam o veículo e a manutenção, mas não contam como aulas realizadas.

### 7.4 Visualização do dono
Na ficha do veículo:
- Quilometragem atual.
- Histórico cronológico.
- Quilômetros por aula.
- Instrutor e aluno associados a cada aula.
- Movimentos externos e justificativas.
- Correções e responsáveis.
- Próximas manutenções e situação de cada uma.

## 8. Manutenção
### 8.1 Programação
O dono deve poder cadastrar manutenções por veículo, contendo:
- Descrição/tipo do serviço, por exemplo troca de óleo.
- Quilometragem prevista para a próxima manutenção.
- Margem de aviso em quilômetros, configurada pelo dono.
- Situação calculada.
- Observações.

Não utilizar um intervalo mecânico universal como regra fixa. O responsável informa os limites de cada veículo e serviço.

### 8.2 Avisos
- **Em dia:** ainda fora da margem de aviso.
- **Próxima:** entrou na margem definida.
- **Atingida:** chegou à quilometragem prevista.
- **Ultrapassada:** passou da quilometragem prevista.

Exemplo de configuração:
- Próxima troca de óleo: 45.000 km.
- Avisar a 500 km do limite.
- A partir de 44.500 km, mostrar aviso de proximidade.
- Em 45.000 km, indicar manutenção atingida.
- Acima de 45.000 km, indicar limite ultrapassado.

Exibir avisos no painel do dono e na ficha do veículo. Atualizar após relatórios, movimentos externos e correções de quilometragem.

### 8.3 Registro de manutenção realizada
- Veículo, serviço, data, hodômetro e observações.
- Manter histórico.
- Permitir definir a próxima manutenção daquele serviço.
- Concluir uma manutenção não conclui outras automaticamente.
- Atingir um limite gera aviso; não coloca automaticamente o veículo em manutenção. O dono controla sua disponibilidade.
- Um veículo marcado em manutenção não pode receber novas aulas no período de indisponibilidade.

## 9. Regras de agenda e progresso
### 9.1 Conflitos
Bloquear agendamentos com sobreposição de:
- Mesmo instrutor.
- Mesmo aluno.
- Mesmo veículo, quando aplicável.

Dois horários se sobrepõem quando o início de um ocorre antes do término do outro e o seu término ocorre depois do início do outro. Uma aula pode começar exatamente no término da anterior; intervalos adicionais não foram definidos.

Também verificar:
- Término posterior ao início.
- Instrutor ativo e disponível.
- Aluno ativo para novo agendamento.
- Veículo compatível com a categoria e disponível.
- Obrigatoriedade de veículo nas aulas práticas aplicáveis.

Revalidar ao remarcar, trocar recursos e salvar, inclusive quando outro usuário fizer alteração simultânea.

### 9.2 Estados separados
**Ocorrência da aula:**
- Agendada.
- Realizada.
- Falta.
- Cancelada.

**Relatório:**
- Pendente.
- Preenchido.
- Não aplicável, para aula cancelada.

Aula cujo horário terminou, mas cujo resultado ainda não foi informado, deve mostrar essa necessidade sem ser contabilizada automaticamente como realizada.

Remarcar deve preservar o histórico do horário anterior e não criar duas aulas contabilizáveis para a mesma ocorrência.

### 9.3 Progresso do aluno
- Contar uma aula como realizada somente com registro explícito de realização.
- Faltas, cancelamentos e agendamentos futuros não reduzem aulas restantes.
- Não contar novamente ao editar ou reenviar um relatório.
- Mostrar acompanhamento por tipo de aula.
- Restantes = máximo entre zero e necessárias menos realizadas.
- Se houver aulas além da quantidade necessária, preservar o total real realizado.
- Relatório pendente não deve esconder a ocorrência de aula já registrada como realizada.

As quantidades necessárias e a duração das aulas dependem dos requisitos da entrevista. Não presumir regras legais ou valores fixos.

## 10. Dados e integridade
### 10.1 Informações que precisam ser persistidas
| Conjunto | Informações principais |
| --- | --- |
| Usuários | Identificação, credencial protegida, perfil e situação |
| Alunos | Cadastro, contato, categoria, responsável e situação |
| Metas de aulas | Aluno, tipo e quantidade necessária |
| Instrutores | Cadastro, contato, situação e vínculo com usuário |
| Disponibilidade | Instrutor, dias e intervalos disponíveis |
| Veículos | Identificação, placa, categoria, hodômetro inicial e situação |
| Aulas | Aluno, instrutor, veículo aplicável, tipo, categoria, horários e ocorrência |
| Histórico da agenda | Alteração, valores anteriores, responsável, data e justificativa |
| Relatórios de aula | Presença, observações, hodômetros, autor, envio e situação |
| Movimentos de quilometragem | Veículo, origem, data, valores e responsável |
| Manutenções programadas | Veículo, serviço, limite e margem de aviso |
| Manutenções realizadas | Veículo, serviço, data, hodômetro e observações |
| Histórico de correções | Registro afetado, alteração, justificativa, responsável e data |

Esta tabela descreve os dados necessários, não impõe nomes de tabelas nem uma estrutura física definitiva.

### 10.2 Requisitos de qualidade
- Preservar relacionamentos e histórico.
- Preferir desativação quando exclusão afetar registros passados.
- Proteger senhas; não guardar em texto aberto.
- Validar dados e permissões também na camada responsável pelas regras.
- Evitar duplicidade de login, placa e relatório principal da mesma aula.
- Tratar falhas de conexão sem anunciar sucesso quando o banco não confirmou a gravação.
- Dados devem permanecer após fechar e reabrir o sistema.
- Usar dados fictícios identificados no protótipo.
- Indicadores, agenda e fichas devem refletir a mesma fonte de dados.
- Restringir os dados pessoais exibidos ao necessário para cada perfil.

## 11. Telas mínimas do protótipo
### 11.1 Acesso comum
1. Login.

### 11.2 Dono
1. Painel gerencial.
2. Agenda geral.
3. Formulário de agendamento/remarcação e detalhes da aula.
4. Lista e formulário de alunos.
5. Ficha do aluno com progresso e histórico.
6. Lista e formulário de instrutores.
7. Ficha do instrutor com disponibilidade e pendências.
8. Lista e formulário de veículos.
9. Ficha do veículo com quilometragem, movimentos e manutenção.
10. Cadastro de manutenção prevista e registro de manutenção realizada.
11. Lista de relatórios pendentes e consulta dos relatórios.
12. Relatórios gerenciais.
13. Gerenciamento de acessos.

### 11.3 Instrutor
1. Meu dia.
2. Minha agenda.
3. Detalhes da aula.
4. Formulário do relatório obrigatório.
5. Lista de relatórios pendentes.
6. Meus alunos e acompanhamento.
7. Meu resumo.

As telas podem usar abas ou janelas de formulário quando isso simplificar a navegação, sem retirar funcionalidades.

## 12. Critérios de aceitação
| ID | Cenário | Resultado esperado |
| --- | --- | --- |
| CA01 | Dono entra | Abre painel com indicadores gerais e agenda do dia |
| CA02 | Instrutor entra | Abre Meu dia, próxima aula e pendências próprias |
| CA03 | Aluno precisa de cadastro | É cadastrado sem gerar acesso |
| CA04 | Agendamento conflita com instrutor, aluno ou veículo | Salvamento bloqueado com identificação do conflito |
| CA05 | Aula é remarcada | Agenda atualizada, histórico preservado e sem duplicação de contagem |
| CA06 | Aula termina sem relatório | Aparece como relatório pendente, sem presumir presença |
| CA07 | Aula é registrada como realizada, mas sem relatório | Conta como realizada e continua visível nas pendências |
| CA08 | Relatório válido de aula prática é enviado | Relatório preenchido, distância registrada e veículo atualizado |
| CA09 | Hodômetros 42.150 e 42.172 | Distância de 22 km |
| CA10 | Hodômetro final menor que inicial | Envio bloqueado com mensagem clara |
| CA11 | Mesmo relatório é enviado duas vezes | Não duplica relatório, aula nem quilometragem |
| CA12 | Relatório antigo é entregue após um mais recente | Não reduz hodômetro atual nem soma percurso duas vezes |
| CA13 | Aula teórica sem veículo é registrada | Não exige hodômetro nem altera veículos |
| CA14 | Falta sem uso de veículo é registrada | Não reduz aulas restantes nem gera quilometragem |
| CA15 | Aula é cancelada | Preserva motivo/histórico e não conta como realizada |
| CA16 | Veículo entra em manutenção | Novos agendamentos bloqueados e aulas futuras sinalizadas |
| CA17 | Hodômetro entra na margem de manutenção | Dono visualiza aviso de proximidade |
| CA18 | Hodômetro atinge ou ultrapassa limite | Aviso corresponde à situação atual |
| CA19 | Dono registra deslocamento externo justificado | Atualiza hodômetro/manutenção sem contar como aula |
| CA20 | Instrutor tenta abrir dados de outro instrutor | Acesso negado |
| CA21 | Relatório salvo com falha no banco | Sem atualização parcial ou mensagem falsa de sucesso |
| CA22 | Conta ou cadastro é desativado | Histórico preservado e novos usos impedidos conforme perfil |
| CA23 | Aplicativo é reaberto | Dados persistidos continuam disponíveis |
| CA24 | Relatório é corrigido | Autoria/histórico preservados e totais recalculados corretamente |

## 13. Pontos a confirmar sem ampliar o escopo
Os itens abaixo não foram decididos na conversa e não devem ser tratados como respostas já dadas pelo usuário:
- Nome definitivo da autoescola/sistema.
- Campos documentais adicionais dos cadastros.
- Aulas teóricas individuais, em turmas ou ambas.
- Duração de aulas e eventuais intervalos.
- Quantidades necessárias por tipo e categoria.
- Quais categorias a autoescola atende.
- Tamanho da margem de aviso de cada manutenção.
- Necessidade de controlar também manutenção por data; nesta versão o compromisso é por quilometragem.
- Detalhe final da política de correções após envio, usando a sugestão deste documento como base de protótipo.
- Forma de instalação e compartilhamento dos dados entre os computadores.

Para o protótipo, utilizar exemplos fictícios e configurações editáveis onde houver indefinição. Não inventar regras da entrevista. Este documento não estabelece obrigações legais; qualquer requisito legal que venha a ser incorporado precisa de verificação própria.

## 14. Limite deste documento
A base aprovada é um sistema com duas visões: **dono, para gestão**, e **instrutor, para rotina e relatórios obrigatórios**. O controle de quilometragem deve conectar o relatório de cada aula ao histórico do veículo e aos avisos de manutenção. A implementação deve manter esse vínculo correto mesmo com pendências, reenvios, registros atrasados e correções.

A configuração técnica, os agentes de IA e seu modo de trabalho serão tratados no prompt separado.


## 15. CRUD e rastreabilidade da versão revisada

A versão revisada inclui exclusão de aulas/relatórios, planos e serviços realizados, gestão de contas de dono/instrutor e remoção independente de metas/contato complementar. Consulte `MATRIZ-CRUD.md` para as operações e restrições. Auditoria é consultável em Relatórios → Auditoria, inclusive para registros excluídos. As correções foram autorizadas nesta conversa e não são atribuídas como conteúdo da entrevista original.
