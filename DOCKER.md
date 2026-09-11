# Execucao local com Docker

O Compose executa quatro servicos:

- `frontend`: aplicacao TanStack Start servida localmente pelo Vite na porta `5173`.
- `backend`: API Spring Boot e WebSocket na porta `8080`.
- `db`: PostgreSQL na porta `5432`, com dados preservados no volume `mini_postgres_data`.
- `pgadmin`: interface web do PostgreSQL na porta `5050`, com configuracoes preservadas no volume `mini_pgadmin_data`.

## Ambiente

O backend seleciona seu profile pelo arquivo `backend/.env`:

```env
SPRING_PROFILES_ACTIVE=docker
DB_URL=jdbc:postgresql://db:5432/minimercado
DB_USER=minimercado
DB_PASS=troque_esta_senha
POSTGRES_DB=minimercado
POSTGRES_USER=minimercado
POSTGRES_PASSWORD=troque_esta_senha
PGADMIN_DEFAULT_EMAIL=admin@mini.com
PGADMIN_DEFAULT_PASSWORD=admin
APP_ADMIN_KEY=troque-esta-chave-operacional
APP_CORS_ALLOWED_ORIGINS=*
```

Os profiles `docker` e `prod` usam Flyway para evoluir o banco e `ddl-auto=validate` para detectar divergências.
Nesses profiles, Swagger e o documento OpenAPI ficam desabilitados; use o profile `dev` para inspecioná-los localmente.
Mantenha `DB_PASS` e `POSTGRES_PASSWORD` com o mesmo valor.
Defina `APP_ADMIN_KEY`; ela protege pedidos operacionais, pagamentos, produtos, cozinha, resultados e configurações. O CORS usa `APP_CORS_ALLOWED_ORIGINS=*` para aceitar navegadores de qualquer origem; a autorização das operações continua sendo feita pela chave operacional.

No frontend, configure `frontend/.env` com o IP ou hostname da maquina que executa os containers, acessivel pelos computadores conectados ao switch:

```env
VITE_API_URL=http://192.168.0.10:8080
VITE_WS_URL=http://192.168.0.10:8080/ws
```

`VITE_API_URL` e `VITE_WS_URL` sao os enderecos publicos acessados pelo navegador.
O frontend usa `VITE_API_URL` tanto no navegador quanto na renderizacao inicial.
No Compose, o frontend roda pelo servidor de desenvolvimento do Vite e le `frontend/.env` ao iniciar.
Depois de alterar `frontend/.env` ou `backend/.env`, recrie os containers com `docker compose down` e `docker compose up -d`.

## Subir

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edite os arquivos .env antes de subir.
docker compose up --build -d
```

O frontend fica disponivel em `http://IP_DA_MAQUINA:5173`.

O pgAdmin fica disponivel em `http://IP_DA_MAQUINA:5050`.

Login padrao:

```text
Email: admin@mini.com
Senha: admin
```

Para registrar o banco no pgAdmin, use:

```text
Host: db
Porta: 5432
Database: minimercado
Usuario: minimercado
Senha: o valor de POSTGRES_PASSWORD no backend/.env
```

Se quiser trocar o login do pgAdmin, altere `PGADMIN_DEFAULT_EMAIL` e `PGADMIN_DEFAULT_PASSWORD` em `backend/.env` antes de subir o Compose.

## Carga do cardapio por Docker

O script `scripts/seed_menu_products.py` tambem pode rodar em um container separado, sem Python instalado localmente.
Com backend e banco ja ativos, execute no PowerShell:

```powershell
.\scripts\run_seed_menu_products_docker.ps1
```

O wrapper constroi a imagem `minimercado-seed-menu-products:latest`, le `APP_ADMIN_KEY` de `backend/.env` quando a variavel nao foi informada no ambiente, e usa `http://host.docker.internal:8080` para chegar na API publicada pelo Compose.

Opcoes uteis:

```powershell
.\scripts\run_seed_menu_products_docker.ps1 -DryRun
.\scripts\run_seed_menu_products_docker.ps1 -CreateOnly
.\scripts\run_seed_menu_products_docker.ps1 -BaseUrl http://host.docker.internal:8080
.\scripts\run_seed_menu_products_docker.ps1 -NoBuild
```

## Operacao

```bash
docker compose logs -f
docker compose stop
docker compose start
docker compose down
```

`docker compose stop` e `docker compose start` nao recriam containers; use `docker compose down` seguido de `docker compose up -d` quando alterar arquivos `.env`.
`docker compose down` remove os containers, mas preserva o banco. Para apagar tambem os dados persistidos, use explicitamente `docker compose down -v`.
