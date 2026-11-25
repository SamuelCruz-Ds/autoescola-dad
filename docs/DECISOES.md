# Decisões de implementação

Estas decisões implementam as convenções do protótipo e não substituem a entrevista nem estabelecem regras legais.

## Escopo e configurações

- Dois perfis: dono e instrutor. Alunos não recebem acesso.
- Nome provisório: Autoescola DAD. Nenhum nome definitivo foi presumido.
- Categorias são preenchidas pelo dono. Não há lista legal fixa embutida.
- Metas são informadas por aluno e tipo. Valores da demonstração são exemplos fictícios editáveis, sem valor legal.
- Cada agendamento informa início e fim. Não há duração ou intervalo obrigatório presumido.
- Aulas teóricas são representadas por agendamento de aluno; não foi criado módulo de turmas. A decisão final sobre turmas continua dependente da entrevista.
- Limite e margem de manutenção são informados por serviço e veículo. Não há intervalo mecânico universal nem manutenção automática por data.
- Correções de relatórios enviados são controladas pelo dono, com justificativa e histórico, conforme a convenção sugerida no documento de requisitos.

## Quilometragem e relatórios atrasados

O hodômetro atual é o último valor final aceito na ordem cronológica. Ele não é calculado somando novamente as distâncias de relatórios enviados. Quilômetros de aulas são a soma separada das distâncias dos movimentos de aula.

Ao inserir ou corrigir um movimento, o sistema verifica os vizinhos cronológicos. Não pode haver regressão do hodômetro nem sobreposição de percurso. Uma inserção atrasada pode preencher um intervalo ainda não documentado sem alterar o último hodômetro já conhecido. Os mesmos critérios valem para movimentos externos.

Uma lacuna de hodômetro não é convertida automaticamente em aula ou movimento externo. Ela deve aparecer como divergência na ficha do veículo, com orientação para regularizar os relatórios pendentes ou registrar um movimento justificado. A detecção é auditada; o histórico preserva as correções.

Uma aula que terminou sem registro de ocorrência continua agendada, com aviso de ocorrência a informar e relatório pendente. O fim do horário não comprova presença.

## Privacidade e progresso

O processo principal filtra o Workspace antes de enviá-lo à interface. Instrutores recebem somente suas aulas e relatórios, seus alunos vinculados e os dados operacionais necessários. O progresso total dos alunos autorizados é enviado como agregado, sem expor aulas e relatórios de outros instrutores.

Senhas são armazenadas com derivação criptográfica e salt. Hashes não são enviados à interface nem incluídos nos registros de auditoria.

## Persistência e concorrência

As entidades são persistidas em tabelas MySQL com chaves estrangeiras e restrições de unicidade. A disponibilidade semanal do instrutor é um pequeno documento JSON associado ao cadastro. Não existe um documento JSON único contendo o banco inteiro.

As mutações são serializadas por uma linha de coordenação bloqueada dentro da transação MySQL. Essa escolha facilita a integridade em múltiplas instâncias no volume de um projeto escolar; limita a concorrência de escrita e não foi pensada para grande escala. Apenas entidades modificadas são gravadas. Falhas causam rollback.

Datas de aulas usam o calendário operacional local, com precisão de minutos. A interface apresenta datas em português do Brasil e horários de 24 horas.

## Instalação em vários computadores

Cada instalação Electron pode se conectar ao mesmo MySQL pela configuração local. A topologia definitiva de rede e a distribuição dos acessos continuam dependentes do ambiente de apresentação. Não foi criada uma API web própria. O processo principal consome ViaCEP, BrasilAPI, Open-Meteo e Resend conforme os fluxos descritos no README.

Uma credencial MySQL configurada em um aplicativo desktop pode ser acessada por alguém com controle administrativo do computador. A permissão de dono/instrutor é aplicada pelo processo principal do aplicativo; uma futura implantação com computadores não confiáveis exigiria reavaliar a arquitetura. A configuração fornecida atende ao projeto escolar solicitado.


## Exclusão e correção de registros

Exclusões excepcionais são executadas pelo dono com justificativa, confirmação e snapshot anterior em auditoria. Relatório e movimento vinculado são removidos na mesma transação; a ocorrência da aula é preservada. Uma aula com relatório não é excluída antes dele. Planos com serviços e contas com autoria permanecem protegidos por vínculos. Cada recálculo de hodômetro verifica o intervalo das manutenções realizadas. Alterar serviço realizado não altera automaticamente a programação futura. Consulte `MATRIZ-CRUD.md`.

A área Acessos gerencia os dois perfis, exige senhas novas fortes e protege a própria conta e o último dono ativo. Hashes não são incluídos em auditoria. A troca da própria senha mantém a sessão atual; sessões anteriores são invalidadas na próxima requisição. A auditoria possui consulta geral e busca, sem comandos de alteração/exclusão pela interface.
