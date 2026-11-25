# Integrações e configuração local

| Serviço | Finalidade | Caminho no app | Dependência |
| --- | --- | --- | --- |
| ViaCEP | Consultar endereço a partir do CEP | Alunos → cadastrar/editar → buscar endereço | Internet e CEP válido |
| BrasilAPI | Consultar feriados nacionais | Agenda | Internet |
| Open-Meteo | Consultar clima atual e previsão na hora da aula | Visão geral / Meu dia / agendar ou remarcar | Internet e localização |
| Resend | Solicitar envio de lembrete ao aluno | Visão geral → lembretes de amanhã | Internet, chave e remetente autorizado |

São quatro fontes com finalidades distintas. Clima atual e previsão pertencem
à mesma integração e não são contados como duas para completar o requisito.
As chamadas reais ficam na classe `Integrations`, no processo principal.

## Resend

Crie/obtenha uma chave da sua conta Resend e um remetente autorizado pelo
serviço. Preencha somente no `.env` local:

```dotenv
RESEND_API_KEY=SUA_CHAVE_PRIVADA
REMINDER_FROM=Autoescola <SEU_REMETENTE_AUTORIZADO>
```

Os textos acima são campos a substituir, não credenciais funcionais.
Não coloque sua chave no código, em prints de apresentação ou no GitHub.
Feche e abra novamente o aplicativo depois de alterar o `.env`.

No app, entre como dono e cadastre o e-mail autorizado do aluno. Agende a aula
para amanhã, pois o lembrete só fica disponível na véspera. Em Visão geral,
confira destinatário e aula e confirme o envio. A tela informa se o serviço
aceitou a solicitação ou se houve erro. Aceitação pelo provedor não equivale
a confirmação de entrega na caixa de entrada.

Sem chave, remetente ou e-mail, a interface orienta a configuração e não simula
um envio bem-sucedido. Aulas, cadastros e relatórios continuam disponíveis.
A revisão feita nesta conversa não enviou e-mails nem verificou uma conta
Resend; essa configuração pertence ao ambiente de apresentação do grupo.

## Localização e previsão

Se necessário, configure `SCHOOL_CITY`, `SCHOOL_LATITUDE`, `SCHOOL_LONGITUDE`
e `APP_TIMEZONE` a partir do `.env.example`. A referência padrão é Limeira, SP.
A previsão da aula fica disponível por sete dias, incluindo hoje.
Falhas nas consultas exibem indisponibilidade; não são inventadas respostas.
