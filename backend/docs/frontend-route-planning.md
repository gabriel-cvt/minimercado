# Estado de integração: Backend Minimercado x Frontend

Este documento registra as decisões de domínio e o estado atual da integração.
O contrato detalhado das rotas está em `api-routes.md` e `websocket-routes.md`.

## Decisões de domínio encerradas

- O número exibido ao público é o próprio `id` numérico do pedido. Não existe `displayNumber`.
- Todo produto segue o fluxo da cozinha. Não existe `requiresKitchenPreparation`, categoria ou praça de preparo.
- Combos são cadastrados como produtos comuns, sem componentes, vínculo ou comportamento próprio.
- Produtos não possuem estoque; podem ser habilitados ou desabilitados para novas vendas.
- `quantitySold` fica restrito aos dados analíticos do dashboard e soma unidades de pedidos não cancelados.
- Produtos como tapioca e salgado podem ter variantes com preço único e disponibilidade individual.
- Produtos utilizam um ícone local selecionável (`GENERAL`, `SANDWICH`, `DRINK`, `DESSERT`, `SNACK`, `COMBO`, `MEAL`, `BAKERY`, `FROZEN_DESSERT` ou `HOT_DRINK`) em vez de URL de imagem.
- O pedido possui observação opcional, exibida no detalhamento e na cozinha.
- Métricas gerenciais de rankings e picos consideram todo o histórico disponível.

## Funcionalidades integradas

| Parte do frontend | Backend utilizado | Situação |
| --- | --- | --- |
| Gestão de produtos | `GET /api/products`, `GET /api/products/{id}`, `POST /api/products`, `PUT /api/products/{id}`, `PATCH /api/products/{id}/availability` | Integrado; cadastra produtos e controla habilitação para venda. |
| Checkout | `POST /api/orders` | Integrado; lista todos os produtos habilitados e confirma pagamentos imediatos na mesma transação com `confirmPayment`. |
| Detalhamento operacional | `GET /api/orders`, `GET /api/orders/{id}`, `PUT /api/orders/{id}`, `PATCH /api/orders/{id}/pay`, `PATCH /api/orders/{id}/finish`, `PATCH /api/orders/{id}/cancel`, `/topic/orders` | Integrado; exibe e edita observação e variantes por linha, inclusive sabores diferentes do mesmo produto. Edição de pedido pronto o devolve à cozinha. |
| Cozinha | `GET /api/orders?status=PENDING`, `PATCH /api/orders/{id}/ready`, `/topic/kitchen/orders`, `/topic/orders`, `/topic/pickup/orders` | Integrado; exibe variante e observação. |
| Painel público | `GET /api/orders` filtrado, `/topic/orders/public`, `readyAt` | Integrado; chamados prontos são exibidos por 5 minutos. |
| Home e dashboard básico | `GET /api/dashboard/summary`, `GET /api/orders`, `/topic/orders` | Integrado. |
| Analytics e pendências do dashboard | `GET /api/dashboard/analytics`, `GET /api/orders`, `PATCH /api/orders/{id}/pay` | Integrado; inclui tempo médio, rankings históricos e confirmação agrupada de pendências, inclusive pedidos já retirados. |
| Configurações e identidade | `GET /api/settings/public`, `PUT /api/settings` e reset | Integrado; nome, iniciais, textos, cores, fonte e arredondamento são persistidos globalmente por instalação. |

As telas operacionais exigem uma chave única por instalação. O painel `/painel` usa somente
`GET /api/orders/public` e `/topic/orders/public`, sem receber dados financeiros ou itens do pedido.

## Identidade configurável

- A rota `/configuracoes` oferece edição com prévia em tempo real, presets e restauração do padrão.
- O frontend aplica os dados por um provider único e mantém valores neutros caso a API esteja indisponível.
- Nome, iniciais, página inicial, dashboard, painel público, rodapé e título do documento usam a
  mesma configuração. O favicon é um arquivo estático do frontend.
- A chave operacional fica em `sessionStorage` somente durante a aba atual e protege pedidos,
  produtos, cozinha, dashboard e configurações.
- O rascunho de pedido usa a chave neutra `minimercado.orders.active-draft.v2`; o conteúdo salvo na
  antiga chave é migrado automaticamente na primeira leitura.
- A aplicação consulta novamente as configurações a cada 30 segundos para refletir alterações em
  painéis que já estejam abertos.

## Suporte backend implementado para painel e dashboard

`OrderResponseDTO` expõe timestamps persistidos:

| Campo | Momento de preenchimento | Uso |
| --- | --- | --- |
| `readyAt` | Primeira transição para `READY_FOR_PICKUP`. | Janela de 5 minutos no painel e tempo de preparo. |
| `finishedAt` | Transição para `FINISHED`. | Contagem correta de finalizados hoje. |
| `paidAt` | Primeira confirmação de pagamento. | Faturamento diário e rankings pagos. |
| `cancelledAt` | Transição para `CANCELLED`. | Contagem correta de cancelados hoje. |

O dashboard não usa série financeira de sete dias. Para o histórico operacional,
as métricas prioritárias são:

- tempo médio de preparo;
- pedidos por hora, para identificar pico de atendimento;
- distribuição dos métodos de pagamento confirmados;
- top produtos por quantidade não cancelada.

## Realtime

O frontend conecta por STOMP/SockJS em `/ws` e consome:

| Tópico | Uso atual |
| --- | --- |
| `/topic/orders` | Atualização de home, dashboard, detalhamento e cozinha. |
| `/topic/orders/public` | Atualização do painel público. |
| `/topic/kitchen/orders` | Inclusão e alteração da fila de preparo. |
| `/topic/pickup/orders` | Remoção imediata da fila da cozinha ao marcar pronto. |
