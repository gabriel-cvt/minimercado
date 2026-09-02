# Minimercado

Sistema local para registrar pedidos, acompanhar a cozinha, exibir pedidos prontos e consultar resultados.

## Requisitos

- Docker com Docker Compose
- Acesso à internet na primeira instalação, para baixar e construir as imagens

## Configuração

Crie os arquivos de ambiente a partir dos exemplos:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

No `backend/.env`:

- defina uma senha para o banco em `DB_PASS` e `POSTGRES_PASSWORD`, usando o mesmo valor;
- defina a chave de acesso em `APP_ADMIN_KEY`;
- informe a URL do frontend em `APP_CORS_ALLOWED_ORIGINS`.

No `frontend/.env`, substitua o IP de exemplo pelo IP do computador que executará o Docker Compose.

## Subir os serviços

```bash
docker compose up --build -d
```

Depois, acesse:

- frontend: `http://IP_DO_SERVIDOR:5173`
- painel público: `http://IP_DO_SERVIDOR:5173/painel`
- API: `http://IP_DO_SERVIDOR:8080`
- pgAdmin: `http://IP_DO_SERVIDOR:5050`

## Comandos básicos

```bash
# Ver o estado dos serviços
docker compose ps

# Acompanhar os logs
docker compose logs -f

# Parar os serviços sem apagar os dados
docker compose down
```

Após a instalação inicial, o sistema pode funcionar somente pela rede local, sem acesso à internet.
