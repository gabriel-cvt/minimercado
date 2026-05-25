# Planejamento de rotas: Backend Minimercado x Frontend McDominus

Este planejamento cruza:

- a documentação OpenAPI atual (`redoc-static.html`);
- a documentação WebSocket em `docs/websocket-routes.md`;
- o comentário técnico do frontend;
- a implementação atual dos controllers, DTOs e services do backend.

## Diagnóstico rápido

O backend já cobre o CRUD operacional básico de produtos, clientes e pedidos. O maior gap para o frontend não é o cadastro de pedido em si, e sim a visibilidade operacional: listagem geral de pedidos, status explícito no retorno, filtros, painel público e métricas.

Realtime também não está totalmente ausente: já existe STOMP/SockJS em `/ws`, com publicações em `/topic/kitchen/orders` e `/topic/pickup/orders`. Portanto, a recomendação não é criar SSE agora, e sim completar os eventos STOMP existentes para cobrir as telas que precisam reagir a mudanças.

## Prioridade recomendada

### Fase 1 — Desbloquear frontend operacional

Objetivo: permitir que o frontend deixe de inferir status e consiga listar/operar pedidos reais.

1. Ajustar `GET /api/orders/client/{cpf}`.
2. Ajustar `OrderResponseDTO`.
3. Criar `GET /api/orders` com filtros.
4. Ajustar payloads de itens de pedido/produto para expor dados que a UI precisa.
5. Expandir WebSocket para eventos gerais de pedido.

### Fase 2 — Painel público e cozinha

Objetivo: alimentar `/painel` e fluxos de preparo sem mocks.

1. Reutilizar `GET /api/orders` com filtros públicos ou criar aliases públicos somente se houver regra de exposição diferente.
2. Aplicar a regra de domínio: todo produto passa pelo fluxo da cozinha, sem campo discriminador.
3. Ajustar eventos WebSocket para mudanças de status visíveis no painel.

### Fase 3 — Dashboard e analytics

Objetivo: alimentar telas gerenciais.

1. Criar primeiro `GET /api/dashboard/summary`.
2. Depois criar endpoints analíticos conforme gráficos realmente existentes no frontend.
3. Evitar criar todos os endpoints de analytics de uma vez antes de fechar os componentes e filtros finais.

## Rotas que estão faltando

| Prioridade | Rota | Motivo | Observação |
| --- | --- | --- | --- |
| P0 | `GET /api/orders?status=&paymentStatus=&clientCpf=&from=&to=&page=&size=&sort=` | Listagem geral de pedidos para detalhamento, dashboard, pendências e operação. | É o maior bloqueador REST. Deve retornar `Page<OrderResponseDTO>`. |
| P0 | `WS /topic/orders` | Evento geral para criação, edição, pagamento, troca de status e cancelamento. | Reaproveitar `/ws` e STOMP atual. Não criar outro endpoint WebSocket. |
| P0 | `WS /topic/orders/public` | Evento filtrado para painel público. | Pode publicar apenas pedidos em preparo/prontos/finalizados/cancelados quando isso afetar o painel. |
| P1 | `GET /api/dashboard/summary` | Boas-vindas e resumo do dia. | Começar enxuto: pedidos do dia, receita do dia, pendentes, prontos, em preparo. |
| P1 | `GET /api/dashboard/pending-payments?page=&size=&q=` | Tela de pendências de pagamento. | Alternativa: usar `GET /api/orders?paymentStatus=PENDING`. Criar só se precisar de DTO próprio. |
| P1 | `GET /api/dashboard/kpis?range=today\|7d\|30d` | KPIs agregados. | Pode ser fundido com `summary` no início. |
| P2 | `GET /api/dashboard/revenue?range=&granularity=hour\|day` | Série temporal de receita. | Só criar quando o gráfico existir no frontend. |
| P2 | `GET /api/dashboard/payment-methods?range=` | Distribuição por método de pagamento. | Endpoint analítico, não operacional. |
| P2 | `GET /api/dashboard/orders-by-hour?date=` | Pedidos por hora. | Pode derivar de `revenue` ou `kpis` se o dashboard for simples. |
| P2 | `GET /api/dashboard/top-customers?range=&limit=` | Ranking de clientes. | Conveniência gerencial. |
| P2 | `GET /api/dashboard/kitchen-performance?range=` | Tempo médio por praça. | Depende de timestamps como `readyAt` e de modelagem de praça/cozinha. |

## Rotas que precisam ser ajustadas

| Prioridade | Rota/Contrato | Ajuste necessário | Por quê |
| --- | --- | --- | --- |
| P0 | `GET /api/orders/client/{cpf}` | Corrigir controller de `@PathVariable("id")` para `@PathVariable("cpf")`. | A rota existe, mas o bind do path variable está incoerente com `ApiRoutes`. |
| P0 | `OrderResponseDTO` | Adicionar `status` e `paymentStatus`. | Frontend não deve inferir estado do pedido. |
| P0 | `OrderResponseDTO` | Adicionar timestamps operacionais, pelo menos `readyAt` e `finishedAt` se o painel/dash medirem tempo. | Necessário para dashboard e performance; requer campos na entidade. |
| P0 | `OrderItemResponseDTO` | Adicionar `productId`. | Permite edição e agrupamento visual; todos os itens pertencem à cozinha. |
| P0 | `ProductResponseDTO` | Não expor categoria ou flag de cozinha. | Todo produto segue o fluxo de preparo por regra de domínio. |
| P0 | `POST /api/clients` | Tornar `name` obrigatório no DTO se a regra de negócio exige nome. | OpenAPI hoje mostra só `cpf` como obrigatório. |
| P0 | `GET /api/products` | Adicionar filtros `name` e `inStock`. | Melhora busca e cadastro de pedidos. |
| P1 | `PATCH /api/orders/{id}/pay` | Aceitar body opcional `{ "paymentMethod": "PIX" }`. | Permite pedido criado como `PENDING` ser pago depois informando método real. |
| P1 | `POST /api/orders` e `PUT /api/orders/{id}` | Padronizar `clienteCpf` para `clientCpf`. | Consistência de contrato com o restante em inglês. Pode ser mudança breaking; fazer com cuidado. |
| P1 | `PATCH /api/orders/{id}/ready`, `/finish`, `/cancel`, `/pay` | Considerar retornar `OrderResponseDTO` em vez de `204/void`. | Facilita atualização otimista no frontend sem novo `GET`. |
| P1 | Erros da API | Padronizar envelope de erro ou usar RFC 7807 `ProblemDetail`. | Facilita interceptors e mensagens de UI. |
| P1 | Status de pedido | Alinhar nomes `PENDING` x `PREPARING`. | O frontend fala em `PREPARING`; o backend usa `PENDING`. Pode mapear no frontend ou renomear no backend. |
| P1 | WebSocket `/topic/kitchen/orders` | Incluir eventos de status quando necessário ou complementar com `/topic/orders`. | Hoje cobre cozinha e retirada, mas não todos os eventos de pedido. |
| P1 | WebSocket `/topic/pickup/orders` | Avaliar se payload deve incluir mais que `orderId`. | Para painel público, pode ser melhor enviar status, cliente/senha e timestamps. |

## Rotas que não são necessárias agora

| Rota proposta | Decisão | Motivo |
| --- | --- | --- |
| `GET /sse/orders` | Não criar agora. | O backend já usa STOMP/SockJS. Criar SSE em paralelo duplica infraestrutura realtime. |
| `GET /sse/orders/public` | Não criar agora. | Preferir `/topic/orders/public` no WebSocket existente. |
| `WS /ws/orders` | Não criar como novo endpoint de conexão. | A conexão já é `/ws`; em STOMP, o correto é adicionar tópicos, não outro endpoint por domínio. |
| `GET /api/orders/public/preparing` | Evitar inicialmente. | Pode ser substituído por `GET /api/orders?status=PENDING` ou `status=PREPARING` com filtro público. Criar alias só se houver regra pública diferente. |
| `GET /api/orders/public/ready` | Evitar inicialmente. | Mesmo motivo: `GET /api/orders?status=READY_FOR_PICKUP` resolve se não houver regra de exposição separada. |
| `GET /api/kitchens` | Depende da decisão de domínio. | Se `kitchen` for enum estático, o frontend pode ter lista fixa. Criar rota só se virar tabela/configuração administrável. |
| `GET /api/dashboard/pending-payments` | Pode não ser necessário. | `GET /api/orders?paymentStatus=PENDING` cobre o caso operacional. Criar endpoint específico apenas se precisar de agregações/campos diferentes. |
| Todos os endpoints `dashboard/*` de uma vez | Não criar em lote. | Melhor começar por `summary` e acrescentar gráficos reais. Evita API inchada e queries prematuras. |

## Realtime recomendado

Manter a arquitetura atual:

```text
Conexão: /ws
Broker: /topic
```

Tópicos atuais:

```text
/topic/kitchen/orders
/topic/pickup/orders
```

Tópicos a adicionar:

```text
/topic/orders
/topic/orders/public
```

Eventos sugeridos para `/topic/orders`:

```json
{
  "type": "ORDER_STATUS_CHANGED",
  "orderId": 1,
  "from": "PENDING",
  "to": "READY_FOR_PICKUP"
}
```

Tipos mínimos:

- `ORDER_CREATED`
- `ORDER_UPDATED`
- `ORDER_STATUS_CHANGED`
- `ORDER_PAID`
- `ORDER_CANCELLED`

Eventos de produto/estoque só entram se o frontend precisar atualizar catálogo em tempo real:

- `PRODUCT_CREATED`
- `PRODUCT_UPDATED`
- `PRODUCT_DELETED`
- `PRODUCT_STOCK_CHANGED`

## Plano de implementação sugerido

### Etapa 1

- Corrigir `GET /api/orders/client/{cpf}`.
- Adicionar `status` e `paymentStatus` em `OrderResponseDTO`.
- Adicionar `productId` em `OrderItemResponseDTO`.
- Criar `GET /api/orders` paginado com filtros básicos.
- Ajustar documentação OpenAPI.

### Etapa 2

- Adicionar `/topic/orders` e publicar eventos em:
  - `POST /api/orders`;
  - `PUT /api/orders/{id}`;
  - `PATCH /api/orders/{id}/pay`;
  - `PATCH /api/orders/{id}/ready`;
  - `PATCH /api/orders/{id}/finish`;
  - `PATCH /api/orders/{id}/cancel`.
- Adicionar `/topic/orders/public` para eventos que impactam o painel.

### Etapa 3

- Aplicar a regra de domínio de cozinha única: todos os produtos são preparados na cozinha.
- Não adicionar flag ou categoria de cozinha nos DTOs.
- Só criar `GET /api/kitchens` se futuramente houver áreas configuráveis.

### Etapa 4

- Criar `GET /api/dashboard/summary`.
- Reutilizar `GET /api/orders` para pendências e listas operacionais.
- Adicionar endpoints analíticos conforme os gráficos forem confirmados.

## Resultado esperado para o frontend

| Tela | Backend mínimo recomendado |
| --- | --- |
| Boas-vindas | `GET /api/dashboard/summary` |
| Pedido/checkout | `GET /api/clients/cpf/{cpf}`, `POST /api/clients`, `GET /api/products`, `POST /api/orders` |
| Cadastro de produtos | CRUD atual de produtos + filtros em `GET /api/products` |
| Detalhamento de pedidos | `GET /api/orders`, `GET /api/orders/{id}`, patches de status/pagamento/cancelamento |
| Dashboard | `GET /api/dashboard/summary` + `GET /api/orders?paymentStatus=PENDING`; demais analytics depois |
| Painel público | `GET /api/orders?status=PENDING`, `GET /api/orders?status=READY_FOR_PICKUP`, `/topic/orders/public` |
| Cozinha | `/topic/kitchen/orders` + `GET /api/orders?status=PENDING` se precisar reidratar estado |
