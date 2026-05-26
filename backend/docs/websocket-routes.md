# Rotas WebSocket

Este documento descreve as rotas WebSocket/STOMP existentes no backend do minimercado e o papel de cada uma.

## Visão geral

O backend usa Spring WebSocket com STOMP e SockJS.

- Endpoint de conexão: `/ws`
- Broker habilitado para assinaturas: `/topic`
- Prefixo reservado para mensagens enviadas pelo cliente à aplicação: `/app`
- Origens permitidas: qualquer origem (`*`)
- Não há handlers de entrada com `@MessageMapping` no código atual. Portanto, os clientes apenas assinam tópicos e recebem eventos publicados pelo backend.

## Como conectar

O cliente deve abrir a conexão STOMP/SockJS em:

```text
/ws
```

Exemplo conceitual usando SockJS + STOMP:

```javascript
const socket = new SockJS("http://localhost:8080/ws");
const stompClient = Stomp.over(socket);

stompClient.connect({}, () => {
  stompClient.subscribe("/topic/kitchen/orders", (message) => {
    console.log(JSON.parse(message.body));
  });
});
```

## Tópicos disponíveis

### `/topic/orders`

Notifica mudanças gerais de pedido para telas operacionais.

Payload:

```json
{
  "orderId": 1,
  "type": "ORDER_STATUS_CHANGED",
  "status": "READY_FOR_PICKUP",
  "paymentStatus": "PENDING",
  "fromStatus": "PENDING",
  "toStatus": "READY_FOR_PICKUP"
}
```

Campos:

- `orderId`: identificador do pedido.
- `type`: tipo do evento. Valores atuais: `ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_STATUS_CHANGED`, `ORDER_PAID`, `ORDER_CANCELLED`.
- `status`: status atual do pedido.
- `paymentStatus`: status atual do pagamento.
- `fromStatus`: status anterior, quando o evento representa mudança de status.
- `toStatus`: novo status, quando o evento representa mudança de status.

Quando é publicado:

- Ao criar um pedido.
- Ao editar um pedido.
- Ao cancelar um pedido.
- Ao marcar um pedido como pago.
- Ao marcar um pedido como pronto para retirada.
- Ao finalizar um pedido.

Origem no código:

- Publicação WebSocket: `WebSocketOrderRealtimeNotifier`
- Evento de domínio: `OrderRealtimeEvent`
- Gatilhos: `OrderServiceImpl.create`, `OrderServiceImpl.edit`, `OrderServiceImpl.cancel`, `OrderServiceImpl.markAsPaid`, `OrderServiceImpl.markAsReady`, `OrderServiceImpl.finish`

### `/topic/orders/public`

Notifica mudanças de pedido para telas públicas, como painel de retirada.

Payload:

```json
{
  "orderId": 1,
  "type": "ORDER_STATUS_CHANGED",
  "status": "READY_FOR_PICKUP",
  "paymentStatus": "PENDING",
  "fromStatus": "PENDING",
  "toStatus": "READY_FOR_PICKUP"
}
```

Quando é publicado:

- Recebe os mesmos eventos de `/topic/orders`, exceto `ORDER_PAID`.
- O objetivo é evitar expor no painel público eventos puramente financeiros.

Origem no código:

- Publicação WebSocket: `WebSocketOrderRealtimeNotifier`
- Evento de domínio: `OrderRealtimeEvent`

### `/topic/kitchen/orders`

Notifica a cozinha sobre pedidos. Todo item pertence ao fluxo de preparo por definição de domínio.

Payload:

```json
{
  "orderId": 1,
  "type": "CREATED",
  "items": [
    {
      "productId": 10,
      "productName": "Sanduíche",
      "quantity": 2
    }
  ]
}
```

Campos:

- `orderId`: identificador do pedido.
- `type`: tipo do evento da cozinha. Valores possíveis: `CREATED`, `UPDATED`, `CANCELLED`.
- `items`: lista completa de itens do pedido.
- `items[].productId`: identificador do produto.
- `items[].productName`: nome do produto.
- `items[].quantity`: quantidade solicitada.

Quando é publicado:

- Ao criar um pedido.
- Ao editar um pedido.
- Ao cancelar um pedido.

Origem no código:

- Publicação WebSocket: `WebSocketKitchenNotifier`
- Evento de domínio: `OrderKitchenEvent`
- Gatilhos: `OrderServiceImpl.create`, `OrderServiceImpl.edit`, `OrderServiceImpl.cancel`

Rotas REST relacionadas:

- `POST /api/orders`: pode gerar evento `CREATED`.
- `PUT /api/orders/{id}`: pode gerar evento `UPDATED`.
- `PATCH /api/orders/{id}/cancel`: pode gerar evento `CANCELLED`.

Observações:

- A mensagem é enviada após o commit da transação.

### `/topic/pickup/orders`

Notifica que um pedido está pronto para retirada.

Payload:

```json
{
  "orderId": 1
}
```

Campos:

- `orderId`: identificador do pedido pronto para retirada.

Quando é publicado:

- Ao marcar um pedido como pronto para retirada.

Origem no código:

- Publicação WebSocket: `WebSocketPickupNotifier`
- Evento de domínio: `OrderReadyForPickupEvent`
- Gatilho: `OrderServiceImpl.markAsReady`

Rota REST relacionada:

- `PATCH /api/orders/{id}/ready`: gera a notificação para retirada.

Observações:

- A mensagem é enviada após o commit da transação.
- O pedido não pode estar cancelado nem finalizado.

## Rotas sem publicação WebSocket direta

As seguintes consultas não publicam eventos WebSocket no código atual:

- `GET /api/orders`: consulta pedidos, sem evento WebSocket.
- `GET /api/orders/{id}`: consulta pedido, sem evento WebSocket.
- `GET /api/orders/client/{cpf}`: consulta pedidos por cliente, sem evento WebSocket.

## Resumo

| Tipo | Rota/Destino | Direção | Função | Integrado no frontend |
| --- | --- | --- | --- | --- |
| Conexão | `/ws` | Cliente -> Backend | Abre a conexão STOMP/SockJS. | Sim. |
| Tópico | `/topic/orders` | Backend -> Cliente | Envia eventos gerais de pedidos para operação. | Sim - home, dashboard, cozinha e detalhamento. |
| Tópico | `/topic/orders/public` | Backend -> Cliente | Envia eventos de pedidos adequados para painel público. | Sim - painel. |
| Tópico | `/topic/kitchen/orders` | Backend -> Cliente | Envia eventos de pedidos para a cozinha. | Sim - cozinha. |
| Tópico | `/topic/pickup/orders` | Backend -> Cliente | Envia eventos de pedidos prontos para retirada. | Sim - cozinha. |
| Prefixo | `/app` | Cliente -> Backend | Prefixo configurado, mas sem handlers implementados atualmente. | Não aplicável. |
