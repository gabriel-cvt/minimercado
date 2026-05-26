# Estado de integração: Backend Minimercado x Frontend McDominus

Este documento registra as decisões de domínio e o estado atual da integração.
O contrato detalhado das rotas está em `api-routes.md` e `websocket-routes.md`.

## Decisões de domínio encerradas

- O número exibido ao público é o próprio `id` numérico do pedido. Não existe `displayNumber`.
- Todo produto segue o fluxo da cozinha. Não existe `requiresKitchenPreparation`, categoria ou praça de preparo.
- O período máximo das métricas gerenciais é de três dias, correspondente ao uso previsto do sistema.

## Funcionalidades integradas

| Parte do frontend | Backend utilizado | Situação |
| --- | --- | --- |
| Identificação e cadastro rápido do cliente, incluindo telefone | `GET /api/clients/cpf/{cpf}`, `POST /api/clients` | Integrado. |
| Gestão de produtos | `GET /api/products`, `GET /api/products/{id}`, `POST /api/products`, `PUT /api/products/{id}`, `PATCH /api/products/{id}/stock`, `DELETE /api/products/{id}` | Integrado na tela dedicada de produtos. |
| Checkout | `POST /api/orders` | Integrado; registra PIX ou dinheiro, mantendo pagamento pendente até confirmação. |
| Detalhamento operacional | `GET /api/orders`, `GET /api/orders/{id}`, `PUT /api/orders/{id}`, `PATCH /api/orders/{id}/pay`, `PATCH /api/orders/{id}/finish`, `PATCH /api/orders/{id}/cancel`, `/topic/orders` | Integrado; edição de pedido pronto o devolve à cozinha, retirada pode ocorrer pendente e ações inconsistentes em pedidos pagos são bloqueadas até existir estorno. |
| Cozinha | `GET /api/orders?status=PENDING`, `PATCH /api/orders/{id}/ready`, `/topic/kitchen/orders`, `/topic/orders`, `/topic/pickup/orders` | Integrado. |
| Painel público | `GET /api/orders` filtrado, `/topic/orders/public`, `readyAt` | Integrado; chamados prontos são exibidos por 5 minutos. |
| Home e dashboard básico | `GET /api/dashboard/summary`, `GET /api/orders`, `/topic/orders` | Integrado. |
| Analytics e pendências do dashboard | `GET /api/dashboard/analytics?days=3`, `GET /api/orders`, `PATCH /api/orders/{id}/pay` | Integrado; inclui tempo médio, rankings e confirmação agrupada de pendências, inclusive pedidos já retirados. |

## Suporte backend implementado para painel e dashboard

`OrderResponseDTO` expõe timestamps persistidos:

| Campo | Momento de preenchimento | Uso |
| --- | --- | --- |
| `readyAt` | Primeira transição para `READY_FOR_PICKUP`. | Janela de 5 minutos no painel e tempo de preparo. |
| `finishedAt` | Transição para `FINISHED`. | Contagem correta de finalizados hoje. |
| `paidAt` | Primeira confirmação de pagamento. | Faturamento diário e rankings pagos. |
| `cancelledAt` | Transição para `CANCELLED`. | Contagem correta de cancelados hoje. |

O dashboard não usa série financeira de sete dias. Para o período operacional curto,
as métricas prioritárias são:

- tempo médio de preparo;
- pedidos por hora, para identificar pico de atendimento;
- distribuição dos métodos de pagamento confirmados;
- top clientes por valor pago;
- top produtos por quantidade não cancelada.

## Ações existentes no backend ainda sem tela consumidora

| Rota | Situação no frontend |
| --- | --- |
| `GET /api/orders/client/{cpf}` | Checkout identifica cliente, mas não mostra seu histórico. |

## Realtime

O frontend conecta por STOMP/SockJS em `/ws` e consome:

| Tópico | Uso atual |
| --- | --- |
| `/topic/orders` | Atualização de home, dashboard, detalhamento e cozinha. |
| `/topic/orders/public` | Atualização do painel público. |
| `/topic/kitchen/orders` | Inclusão e alteração da fila de preparo. |
| `/topic/pickup/orders` | Remoção imediata da fila da cozinha ao marcar pronto. |
