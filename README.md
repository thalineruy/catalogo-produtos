# Catálogo de Produtos — Controle de Estoque Empresarial

Catálogo de produtos para uma ótica, com consulta por qualquer palavra do nome, imagem do produto, controle de quantidade e registro de saída.
Preparado para integração futura com o ERP.
Projeto Integrador II.

## Endereços públicos

- Telas: https://catalogo-produtos-eight.vercel.app
- API: https://catalogo-api-0vuy.onrender.com
- Banco: painel do Supabase, projeto catalogo-produtos

## O que o sistema faz

- **Catálogo** — cadastro de produtos com imagem, busca que ignora acentos e
  combina vários termos, filtros por categoria, estoque, status e imagem, e
  exportação da lista filtrada em CSV.
- **Saída manual** — baixa de estoque com registro de quem fez, quando e por
  quê. A baixa e a gravação acontecem numa transação: ou as duas valem, ou
  nenhuma, para o estoque nunca ficar errado.
- **Relatórios** — construtor onde se escolhem os campos e os filtros, com
  pré-visualização em A4 e saída para impressão ou PDF.
- **Logs de auditoria** — histórico de todas as operações, com filtros por
  período, operador e tipo de ação. Operador vê apenas as próprias.
- **Administração** — dados da empresa, logotipo, categorias, usuários,
  fila de pedidos de acesso e estatísticas com gráficos.
- **Convite de acesso** — o usuário cadastrado recebe por e-mail um link de
  uso único, válido por 48 horas, e define a própria senha. Nenhuma senha
  utilizável trafega por e-mail.
- **Acesso** — login com verificação em duas etapas (Google Authenticator),
  opção de confiar no computador por 30 dias, dois níveis de permissão
  (administrador e operador) e troca de senha pelo próprio usuário.
- **Menu da conta** — o crachá com as iniciais, no topo à direita, abre um
  menu com "Trocar minha senha" e "Sair da conta". Funciona em qualquer
  largura de tela.

## Tecnologias

**Servidor** — Node.js, Express, API REST, `pg` para PostgreSQL, JSON Web Token
para a sessão, bcrypt para as senhas, otplib e qrcode para a verificação em
duas etapas, multer para o upload do logotipo.

**Telas** — HTML, CSS e JavaScript sem framework, Fetch API, Chart.js nos
gráficos da Administração.

**Serviços** — PostgreSQL e Storage no Supabase, Resend para o envio de e-mail,
Vercel para as telas, Render para a API, GitHub.

**Testes** — Jest e Supertest.

## Como rodar localmente

1. Clone o repositório.
2. Entre na pasta do servidor e instale as dependências:
   ```bash
   cd servidor
   npm install
   ```
3. Copie `.env.example` para `.env` dentro de `servidor/` e preencha os valores.
4. Inicie o servidor:
   ```bash
   npm start
   ```
5. Sirva a pasta `telas/` por HTTP e abra no navegador, com o `telas/config.js`
   apontando para `http://localhost:3000`:
   ```bash
   cd telas
   python -m http.server 5500
   ```
   Abrir o arquivo direto (`file://`) não funciona: o navegador bloqueia as
   chamadas à API por política de origem.

   Para o login local funcionar, `CORS_ORIGIN` no `.env` do servidor precisa
   aceitar esse endereço (`http://localhost:5500`).

## Como recriar o banco

Execute os scripts na pasta `banco/`, **em ordem**, no SQL Editor do Supabase:

1. `01-tabelas.sql` — cria as tabelas.
2. `02-dados-exemplo.sql` — popula dados de exemplo.
3. `03-saidas-observacao.sql` — adiciona o campo de observação às saídas.
4. `04-empresa.sql` — cria a tabela com os dados da empresa usados no cabeçalho dos relatórios.
5. `05-autenticacao-duas-etapas.sql` — segredo TOTP e dispositivos confiáveis.
6. `06-ultimo-acesso-e-sigla.sql` — último acesso do usuário e sigla da marca.
7. `07-senha-atualizada-em.sql` — data da última troca de senha.
8. `08-busca-sem-acento.sql` — habilita a extensão `unaccent`, usada pela
   busca do catálogo e do histórico de saídas.
9. `09-convites-e-solicitacoes.sql` — convites de acesso de uso único e a
   fila de pedidos de recuperação.

Todos usam `IF NOT EXISTS`, então rodar de novo num banco já criado não
quebra nem apaga nada. Pular qualquer um dos scripts a partir do 05 faz o
sistema falhar no login, porque o código consulta colunas que não existiriam.

## Upload do logotipo (Supabase Storage)

O upload de logotipo (`POST /empresa/logotipo`) grava o arquivo direto no bucket
`logotipos` do Supabase Storage — nunca em disco no servidor. Para funcionar, é
preciso, uma vez só:
1. Criar o bucket `logotipos` (público) no painel do Supabase, em Storage.
2. Preencher `SUPABASE_KEY` em `servidor/.env` com a chave `service_role` do
   projeto (Project Settings → API). Sem essa chave, todas as outras
   funcionalidades funcionam normalmente — só o upload de logotipo falha.

## Envio de e-mail (Resend)

Ao cadastrar um usuário, o sistema cria um **convite de uso único** e manda
por e-mail um link para a pessoa definir a própria senha. Nenhuma senha
utilizável trafega por e-mail nem aparece na tela do administrador — é por
isso que o cadastro não devolve mais "senha temporária".

### O que é o Resend

O Resend é só o carteiro: um serviço que entrega e-mail. **Usuários do sistema
não são cadastrados lá** — continuam sendo cadastrados em Administração, como
sempre. O que o Resend faz é entregar a mensagem que o servidor manda.

No Resend, uma vez só:

1. Criar uma conta em [resend.com](https://resend.com) (plano gratuito,
   cerca de 3.000 e-mails por mês).
2. Ir em **API Keys** → **Create API Key** e copiar a chave.

Depois disso não se volta mais lá.

### Variáveis a preencher

Em `servidor/.env` para rodar local, e em **Environment** no Render para o que
está no ar:

- `URL_SISTEMA` — endereço público das telas, ex.: `https://catalogo-produtos-eight.vercel.app`.
  Sem isto o link do e-mail sai quebrado.
- `RESEND_API_KEY` — a chave copiada no passo 2 acima.
- `EMAIL_REMETENTE` — sem domínio próprio verificado, use
  `Catálogo de Produtos <onboarding@resend.dev>`, o remetente de teste do
  Resend. Com domínio próprio, a entrega melhora bastante; com o de teste, vale
  conferir a caixa de spam no primeiro envio.

A chave da API vai direto do painel do Resend para o do Render. Como qualquer
credencial, ela nunca pode entrar em arquivos da pasta `telas/`, que vão para o
navegador de quem acessa.

**Sem a chave o sistema não quebra.** Ele entra em modo simulado: registra no
console e devolve o link para o administrador repassar à mão. O mesmo vale
quando o envio falha por qualquer motivo — o cadastro do usuário nunca é
desfeito por causa de um e-mail que não saiu.

O botão "Reenviar link" na tela de Administração emite um convite novo e
invalida o anterior. O "Resetar senha" ao lado continua existindo como plano
B, para quem está sem acesso à própria caixa de entrada.

O link do e-mail abre a `telas/ativar.html`, que confere o convite antes de
pedir a senha e mostra os mesmos critérios da tela de troca de senha. Essa rota
é pública, então aceita no máximo 20 tentativas por hora do mesmo endereço IP —
o suficiente para ninguém ficar tentando adivinhar token.

Cada convite serve uma vez só: depois de definida a senha, o mesmo link passa a
responder "link inválido ou expirado".

## Pedidos de acesso

Quem não consegue entrar usa "Esqueci minha senha" na tela de entrada e
escolhe um motivo. O pedido entra numa fila visível em **Administração →
Solicitações de Acesso**, e a quantidade pendente aparece no sino do topo.

A tela mostra o que fazer em cada caso, porque dois dos três motivos não se
resolvem trocando a senha: quem perdeu o Google Authenticator ou trocou de
celular precisa de "Redefinir 2FA", não de uma senha nova.

Se o envio de e-mail estiver configurado, cada pedido também avisa os
administradores por e-mail. A rota é pública e aceita no máximo 5 pedidos por
hora vindos do mesmo endereço IP.

## Login para testes locais

Os usuários de exemplo em `02-dados-exemplo.sql` usam a senha `senha123`
(hash bcrypt já incluído no script). A tela de entrada é a `telas/index.html`;
use qualquer um dos e-mails cadastrados (ex.: `ana.souza@oticavisao.com` como
administrador, `beatriz.alves@oticavisao.com` como operador).

No primeiro acesso de cada usuário o sistema mostra um QR Code para cadastrar
a conta no Google Authenticator — sem ele não há como entrar, porque a
verificação em duas etapas é obrigatória. Se alguém perder o aplicativo, um
administrador usa "Redefinir 2FA" na tela de Administração, e um novo QR Code
aparece no acesso seguinte.

## Sair da conta

Pelo crachá com as iniciais, no canto direito do topo: ele abre um menu com
"Trocar minha senha" e "Sair da conta".

O rodapé do menu lateral também tem o botão de sair, mas esse rodapé é
escondido em telas abaixo de 901px. Por isso o menu do crachá existe — no
celular ele é o único caminho para encerrar a sessão. Nessa largura os avisos
do sistema, que também moram nesse rodapé, aparecem dentro do sino.

## Como rodar os testes

```bash
cd servidor
npm test
```

São 184 testes em 27 arquivos, e nenhum deles precisa de banco: os
repositórios são substituídos por dublês, então a suíte roda offline e sem
tocar em dado nenhum de verdade.

## Equipe

| Nome | Função |
| ---- | ------ |
|      | Coordenação e documentos |
|      | Banco de dados |
|      | Backend produtos e categorias |
|      | Backend estoque e permissões |
|      | Estudo de campo e testes |
|      | Frontend catálogo |
|      | Frontend relatórios e logs |
|      | Frontend administração |

## Avisos

- O servidor no plano gratuito do Render hiberna após inatividade; a primeira
  chamada pode levar cerca de um minuto. **Antes de uma apresentação, abra o
  sistema uns dois minutos antes** para acordar o servidor.
- O upload de logotipo depende do bucket `logotipos` e da chave `SUPABASE_KEY`
  (ver seção acima). Sem isso, o sistema usa a sigla da empresa como logotipo e
  todo o resto funciona normalmente.
- A chave `service_role` do Supabase dá acesso total ao banco: ela só pode
  existir nas variáveis de ambiente do servidor, nunca em arquivos da pasta
  `telas/`, que vão para o navegador de quem acessa. O mesmo vale para a
  `RESEND_API_KEY`.
- Sem a `RESEND_API_KEY` o cadastro de usuário continua funcionando: o link de
  ativação aparece no aviso da própria tela, para o administrador repassar à
  mão. Nada fica quebrado por falta do serviço de e-mail.
