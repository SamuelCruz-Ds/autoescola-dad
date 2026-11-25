# Instalação e execução

## Código-fonte

Use Node.js 24 com npm, Git e MySQL 8.0.16 ou superior.
O GitHub contém código-fonte; os arquivos de build e as credenciais pessoais
não são distribuídos.

No Git Bash, na pasta clonada:

```bash
npm ci
cp .env.example .env
```

Edite o `.env` com host, porta, usuário, senha e nome do banco.
Defina `ADMIN_LOGIN` e uma `ADMIN_PASSWORD` própria com pelo menos 12 caracteres,
maiúscula, minúscula, número e símbolo. Não compartilhe esse arquivo pelo Git.
Prepare a conta MySQL conforme [BANCO-DE-DADOS.md](BANCO-DE-DADOS.md).

```bash
npm run db:setup
npm run dev
```

Entre com as credenciais locais do administrador. O dono gerencia as contas em Cadastros → Acessos. A criação de acesso de instrutor também continua disponível em Cadastros → Instrutores → Ver ficha.

## Compilação e instalador

```bash
npm run build
npm start
```

`npm start` abre o build local. Execute `build` antes, pois `dist/` não está no GitHub.
Para gerar o instalador Windows, no ambiente Windows:

```bash
npm run package
```

O instalador será gerado em `release/`. O instalador escolar não é assinado
digitalmente e não inclui servidor MySQL.

## Aplicativo instalado

No desenvolvimento, a configuração fica no `.env` da raiz. Na aplicação
empacotada, fica no `.env` da pasta de dados do aplicativo; no Windows,
normalmente `%APPDATA%\autoescola-dad\.env`. O código usa
`app.getPath('userData')` do Electron.

Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` e
`APP_TIMEZONE` nessa instalação. As credenciais do administrador ficam no banco
depois da preparação; `ADMIN_PASSWORD` só é necessária na criação inicial.

## APIs e demonstração

ViaCEP, BrasilAPI e Open-Meteo precisam de internet. Para enviar lembretes,
configure `RESEND_API_KEY` e `REMINDER_FROM` com remetente autorizado,
cadastre o e-mail do aluno e use uma aula de amanhã. O dono confirma o envio.

Depois do setup, `npm run db:demo` cria dados fictícios adicionais.
Consulte [DADOS-DEMONSTRACAO.md](DADOS-DEMONSTRACAO.md) para os acessos.

Cada computador pode usar um `.env` próprio apontando para o mesmo MySQL.
A configuração de rede e as permissões do servidor dependem do ambiente utilizado.
