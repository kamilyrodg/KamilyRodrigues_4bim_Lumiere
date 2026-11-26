# Lumière

## Executar o sistema

1. Copie `.env.example` para `.env` e configure as variáveis `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` para o PostgreSQL. O banco indicado em `DB_NAME` precisa existir. O arquivo `.env` é local e não deve ser versionado.
2. Se ainda não criou o banco, crie-o no PostgreSQL (por exemplo, `CREATE DATABASE lumiere;`, se `DB_NAME=lumiere`).
3. Execute `documentacao/bancodedados.sql` para criar as tabelas e carregar os produtos. O script preserva os usuários e as sessões, mas apaga e recria as demais tabelas — inclusive endereços, pedidos, favoritos e o catálogo. Use-o apenas em um banco novo ou quando puder perder esses dados. Em um banco existente que deve ser preservado, execute `documentacao/migracao-autenticacao.sql` para adicionar o nome completo e a tabela de sessões e `documentacao/migracao-lentes.sql` para adicionar o catálogo de lentes sem apagar os outros dados.
   Para corrigir os caminhos das imagens dos filmes em um catálogo já carregado, execute `documentacao/corrigir-imagens-catalogo.sql`; ele altera apenas o campo de imagem dos filmes e não apaga dados.
4. Inicie o servidor na raiz do projeto:

   ```bash
   npm.cmd start
   ```

   O servidor testa a conexão com o banco antes de iniciar e informa o erro no terminal caso o banco esteja indisponível.
5. Abra o `index.html` com a extensão Live Server do VS Code. O endereço normalmente será `http://localhost:5500`.

O Live Server serve apenas o frontend. Para login e cadastro funcionarem, mantenha o backend do passo anterior rodando em um terminal separado na porta 3000. O frontend detecta `localhost`/`127.0.0.1` em outra porta e envia as requisições de autenticação para `http://localhost:3000`; o backend permite essas origens locais durante o desenvolvimento. Não é necessário abrir a página pelo servidor Express.

O catálogo é carregado pelo backend nas rotas `GET /api/cameras` e `GET /api/filmes`. Para essas rotas retornarem produtos, o banco também precisa das tabelas e dos dados de catálogo definidos em `documentacao/bancodedados.sql`.

O cadastro e o login usam estas rotas em `/api/autenticacao`:

- `POST /cadastro` com `nome`, `email`, `username` e `senha`.
- `POST /login` com `identificador` (usuário ou e-mail) e `senha`.
- `GET /me` para consultar a sessão autenticada.
- `PUT /me` para atualizar nome, e-mail e nome de usuário da conta autenticada.
- `POST /logout` para encerrar a sessão.

Após o cadastro, a conta já inicia uma sessão e a tela solicita pelo menos um endereço. A tela separa rua, número, complemento, estado e CEP; esses dados são reunidos no campo `endereco` existente e enviados por `POST /api/enderecos` com `{ "enderecos": [{ "nome_endereco": "Casa", "endereco": "Endereço completo" }] }`. Todos os endereços enviados são salvos em uma transação e pertencem à conta autenticada.

Na área Minha conta, `GET /api/enderecos` lista os endereços da sessão autenticada, `POST /api/enderecos` permite adicionar novos e `PUT /api/enderecos/:id` salva a edição de cada endereço, verificando se ele pertence ao usuário atual.

As senhas são armazenadas com hash scrypt; a sessão é um cookie `HttpOnly` validado no banco de dados. Para usar uma origem de frontend diferente durante desenvolvimento, configure `FRONTEND_ORIGINS` no `.env` com as origens permitidas separadas por vírgula. As origens `http://localhost:5500` e `http://127.0.0.1:5500` já são permitidas por padrão; outras portas locais também são aceitas fora de produção. Em produção, informe explicitamente as origens permitidas em `FRONTEND_ORIGINS`.

Os favoritos da conta usam `GET /api/favoritos`, `POST /api/favoritos/:produtoId` e `DELETE /api/favoritos/:produtoId`.

A tela de checkout busca as formas de pagamento em `GET /api/finalizar-compra/formas-pagamento` e registra os pedidos em `POST /api/finalizar-compra`. Ao escolher Pix, o backend gera um BR Code com o valor total calculado pelo banco e um identificador exclusivo do pedido. O Pix é enviado diretamente para a chave configurada; a confirmação do recebimento é manual e o pedido fica com `status_pagamento = 'aguardando_pagamento'`.

Para habilitar o Pix, configure no `.env` local:

```env
PIX_CHAVE=sua-chave-pix
PIX_NOME_RECEBEDOR=Nome do recebedor
PIX_CIDADE_RECEBEDOR=Sua cidade
```

O nome deve ter até 25 caracteres e a cidade até 15. Não compartilhe nem versione o `.env`. Em bancos já existentes, execute `documentacao/migracao-status-pagamento-pix.sql` antes de reiniciar o backend. A opção Pix retorna erro explícito enquanto esses dados não estiverem configurados. O QR e o código copia e cola não confirmam pagamentos automaticamente; confira o recebimento na sua conta antes de considerar o pedido pago.

As contas antigas salvas no `localStorage` não são migradas para o banco. Ao carregar o novo fluxo, os registros locais antigos são removidos; os usuários devem se cadastrar novamente.