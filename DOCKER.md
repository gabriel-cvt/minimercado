# Execucao local com Docker

O Compose executa quatro servicos:

- `frontend`: aplicacao TanStack Start servida localmente pelo Wrangler na porta `5173`.
- `backend`: API Spring Boot e WebSocket na porta `8080`.
- `db`: PostgreSQL na porta `5432`, com dados preservados no volume `mcdominus_postgres_data`.
- `pgadmin`: interface web do PostgreSQL na porta `5050`, com configuracoes preservadas no volume `mcdominus_pgadmin_data`.

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
```

O profile `docker` usa PostgreSQL e `ddl-auto=update`, adequado para o volume persistente local. O profile `prod` continua disponível para um banco cujo schema já tenha sido preparado manualmente.
Mantenha `DB_PASS` e `POSTGRES_PASSWORD` com o mesmo valor.

No frontend, configure `frontend/.env` com o IP ou hostname da maquina que executa os containers, acessivel pelos computadores conectados ao switch:

```env
VITE_API_URL=http://192.168.0.10:8080
VITE_WS_URL=http://192.168.0.10:8080/ws
```

As variaveis `VITE_*` sao incorporadas no build do frontend. Sempre execute o build novamente depois de trocar esse IP.

## Subir

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edite os arquivos .env antes do build.
docker compose up --build -d
```

O frontend fica disponivel em `http://IP_DA_MAQUINA:5173`.

O pgAdmin fica disponivel em `http://IP_DA_MAQUINA:5050`.

Login padrao:

```text
Email: admin@mcdominus.com
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

Se quiser trocar o login do pgAdmin, exporte `PGADMIN_DEFAULT_EMAIL` e `PGADMIN_DEFAULT_PASSWORD` antes de subir o Compose.

## Operacao

```bash
docker compose logs -f
docker compose stop
docker compose start
docker compose down
```

`docker compose down` remove os containers, mas preserva o banco. Para apagar tambem os dados persistidos, use explicitamente `docker compose down -v`.
