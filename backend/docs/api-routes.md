# Rotas da API REST

Este documento descreve as rotas REST existentes no backend do minimercado, seus parâmetros, payloads e comportamento esperado.

## Visão geral

- Base path: `/api`
- Formato de entrada e saída: JSON
- Paginação: endpoints paginados usam o padrão do Spring `Pageable`
- Datas em query params: formato ISO date-time, por exemplo `2026-05-20T14:30:00`

## Regra de cozinha

- Todo produto é preparado na cozinha; não existe campo ou filtro para separar itens fora desse fluxo.
- Em bancos criados antes desta mudança, remova a coluna legada antes de implantar a aplicação com perfil `prod`:

```sql
ALTER TABLE products DROP COLUMN IF EXISTS requires_kitchen_preparation;
```

## Timestamps operacionais

Pedidos registram `readyAt`, `finishedAt`, `paidAt` e `cancelledAt`. Como o perfil
`prod` valida o schema, bancos existentes precisam receber as novas colunas antes
do deploy:

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
```

## Enums

### `OrderStatus`

```text
PENDING
READY_FOR_PICKUP
FINISHED
CANCELLED
```

### `PaymentStatus`

```text
PENDING
PAID
CANCELLED
```

### `PaymentMethod`

```text
PIX
DINHEIRO
PENDING
```

## Paginação

Endpoints paginados aceitam os parâmetros padrão:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `page` | integer | Número da página, começando em `0`. |
| `size` | integer | Quantidade de itens por página. |
| `sort` | string | Campo de ordenação. Pode receber valores como `name,asc` ou `orderTime,desc`. |

Os parâmetros devem ser enviados na query string, por exemplo:
`?page=1&size=5&sort=id,asc`. No Swagger, preencha `sort` como string;
não envie o valor como array JSON (`["id,asc"]`).

Resposta paginada segue o formato `Page<T>` do Spring:

```json
{
  "content": [],
  "totalElements": 0,
  "totalPages": 0,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true,
  "empty": true
}
```

## Clientes

### `POST /api/clients`

Cria um cliente.

Body:

```json
{
  "name": "Maria Silva",
  "cpf": "12345678900",
  "phoneNumber": "85999999999"
}
```

Campos obrigatórios:

- `name`
- `cpf`

Resposta `201 Created`:

```json
{
  "id": 1,
  "name": "Maria Silva",
  "cpf": "12345678900",
  "phoneNumber": "85999999999"
}
```

### `GET /api/clients/cpf/{cpf}`

Busca um cliente pelo CPF.

Path params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `cpf` | string | CPF do cliente. |

Resposta `200 OK`:

```json
{
  "id": 1,
  "name": "Maria Silva",
  "cpf": "12345678900",
  "phoneNumber": "85999999999"
}
```

## Produtos

### `GET /api/products`

Lista produtos com paginação e filtros opcionais.

Query params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `name` | string | Filtra produtos por trecho do nome, ignorando maiúsculas/minúsculas. |
| `inStock` | boolean | Quando `true`, retorna produtos com estoque maior que zero. Quando `false`, retorna produtos sem estoque. |
| `page` | integer | Página. Padrão: `0`. |
| `size` | integer | Tamanho da página. Padrão do controller: `20`. |
| `sort` | string | Ordenação. Padrão: `name,asc`. Campos: `id`, `name`, `price`, `stockQuantity`. |

Exemplo:

```text
GET /api/products?name=cafe&inStock=true&page=0&size=20&sort=name,asc
```

Resposta `200 OK`:

```json
{
  "content": [
    {
      "id": 1,
      "name": "Café",
      "price": 4.5,
      "urlImage": "https://example.com/cafe.png",
      "stockQuantity": 30
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 20,
  "number": 0
}
```

### `GET /api/products/{id}`

Busca um produto pelo ID.

Path params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `id` | integer | ID do produto. |

Resposta `200 OK`:

```json
{
  "id": 1,
  "name": "Café",
  "price": 4.5,
  "urlImage": "https://example.com/cafe.png",
  "stockQuantity": 30
}
```

### `POST /api/products`

Cria um produto.

Body:

```json
{
  "name": "Sanduíche",
  "price": 12.9,
  "urlImage": "https://example.com/sanduiche.png",
  "stockQuantity": 20
}
```

Campos obrigatórios:

- `name`
- `price`
- `stockQuantity`

Observações:

- `stockQuantity` não pode ser negativo.
- Todo produto pertence ao fluxo de preparo da cozinha por definição de domínio.

Resposta `201 Created`:

```json
{
  "id": 2,
  "name": "Sanduíche",
  "price": 12.9,
  "urlImage": "https://example.com/sanduiche.png",
  "stockQuantity": 20
}
```

### `PUT /api/products/{id}`

Atualiza parcialmente os campos cadastrais de um produto.

Path params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `id` | integer | ID do produto. |

Body:

```json
{
  "name": "Sanduíche especial",
  "price": 15.9,
  "urlImage": "https://example.com/sanduiche-especial.png"
}
```

Observações:

- Todos os campos do body são opcionais.
- Campos não enviados permanecem com o valor atual.
- Este endpoint não altera `stockQuantity`; use `PATCH /api/products/{id}/stock`.

Resposta `200 OK`:

```json
{
  "id": 2,
  "name": "Sanduíche especial",
  "price": 15.9,
  "urlImage": "https://example.com/sanduiche-especial.png",
  "stockQuantity": 20
}
```

### `PATCH /api/products/{id}/stock`

Altera o estoque de um produto por diferença.

Path params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `id` | integer | ID do produto. |

Body:

```json
{
  "quantityChange": 5
}
```

Campos obrigatórios:

- `quantityChange`

Observações:

- `quantityChange` deve ser diferente de zero.
- Valor positivo aumenta o estoque.
- Valor negativo diminui o estoque.
- O estoque final não pode ficar negativo.

Resposta `200 OK`:

```json
{
  "id": 2,
  "name": "Sanduíche especial",
  "price": 15.9,
  "urlImage": "https://example.com/sanduiche-especial.png",
  "stockQuantity": 25
}
```

### `DELETE /api/products/{id}`

Remove um produto.

Path params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `id` | integer | ID do produto. |

Resposta:

```text
204 No Content
```

## Pedidos

### `GET /api/orders`

Lista pedidos com paginação e filtros opcionais.

Query params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `status` | `OrderStatus` | Filtra por status do pedido. |
| `paymentStatus` | `PaymentStatus` | Filtra por status do pagamento. |
| `clientCpf` | string | Filtra pedidos de um CPF específico. |
| `from` | date-time | Filtra pedidos com `orderTime` maior ou igual ao valor informado. |
| `to` | date-time | Filtra pedidos com `orderTime` menor ou igual ao valor informado. |
| `page` | integer | Página. Padrão: `0`. |
| `size` | integer | Tamanho da página. Padrão do controller: `10`. |
| `sort` | string | Ordenação. Padrão: `orderTime,asc`. Campos: `id`, `orderTime`, `readyAt`, `finishedAt`, `paidAt`, `cancelledAt`, `status`, `paymentStatus`, `paymentMethod`, `totalValue`. |

Exemplo:

```text
GET /api/orders?status=PENDING&paymentStatus=PENDING&page=0&size=10&sort=orderTime,desc
```

Resposta `200 OK`:

```json
{
  "content": [
    {
      "id": 10,
      "orderTime": "2026-05-20T14:30:00",
      "readyAt": null,
      "finishedAt": null,
      "paidAt": null,
      "cancelledAt": null,
      "status": "PENDING",
      "paymentStatus": "PENDING",
      "items": [
        {
          "productId": 2,
          "productName": "Sanduíche",
          "unitPrice": 12.9,
          "quantity": 2,
          "subtotal": 25.8
        }
      ],
      "client": {
        "id": 1,
        "name": "Maria Silva",
        "cpf": "12345678900",
        "phoneNumber": "85999999999"
      },
      "paymentMethod": "PENDING",
      "totalValue": 25.8
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 10,
  "number": 0
}
```

### `GET /api/orders/{id}`

Busca um pedido pelo ID.

Path params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `id` | integer | ID do pedido. |

Resposta `200 OK`:

```json
{
  "id": 10,
  "orderTime": "2026-05-20T14:30:00",
  "readyAt": null,
  "finishedAt": null,
  "paidAt": null,
  "cancelledAt": null,
  "status": "PENDING",
  "paymentStatus": "PENDING",
  "items": [
    {
      "productId": 2,
      "productName": "Sanduíche",
      "unitPrice": 12.9,
      "quantity": 2,
      "subtotal": 25.8
    }
  ],
  "client": {
    "id": 1,
    "name": "Maria Silva",
    "cpf": "12345678900",
    "phoneNumber": "85999999999"
  },
  "paymentMethod": "PENDING",
  "totalValue": 25.8
}
```

### `GET /api/orders/client/{cpf}`

Lista pedidos de um cliente pelo CPF.

Path params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `cpf` | string | CPF do cliente. |

Query params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `page` | integer | Página. Padrão: `0`. |
| `size` | integer | Tamanho da página. Padrão do controller: `10`. |
| `sort` | string | Ordenação. Padrão: `orderTime,asc`. Campos: `id`, `orderTime`, `readyAt`, `finishedAt`, `paidAt`, `cancelledAt`, `status`, `paymentStatus`, `paymentMethod`, `totalValue`. |

Resposta `200 OK`: `Page<OrderResponseDTO>`.

### `POST /api/orders`

Cria um pedido.

Body:

```json
{
  "items": [
    {
      "productId": 2,
      "quantity": 2
    }
  ],
  "clienteCpf": "12345678900",
  "paymentMethod": "PENDING"
}
```

Campos obrigatórios:

- `items`
- `items[].productId`
- `items[].quantity`
- `clienteCpf`
- `paymentMethod`

Observações:

- `items` não pode ser vazio.
- `items[].quantity` deve ser maior que zero.
- O cliente precisa existir.
- Cada produto precisa existir.
- O estoque dos itens é reduzido na criação.
- O pedido nasce com `status = PENDING`.
- Com `paymentMethod = PENDING`, mantém `paymentStatus = PENDING`.
- Com `paymentMethod = PIX` ou `DINHEIRO`, nasce com `paymentStatus = PAID` e registra `paidAt`.
- Publica evento WebSocket em `/topic/kitchen/orders`, pois todo item é preparado na cozinha.
- Sempre publica evento geral em `/topic/orders` e `/topic/orders/public`.

Resposta `201 Created`: `OrderResponseDTO`.

### `PUT /api/orders/{id}`

Atualiza um pedido.

Path params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `id` | integer | ID do pedido. |

Body:

```json
{
  "items": [
    {
      "productId": 2,
      "quantity": 1
    },
    {
      "productId": 3,
      "quantity": 2
    }
  ],
  "clienteCpf": "12345678900",
  "paymentMethod": "PIX"
}
```

Campos obrigatórios:

- `items`
- `clienteCpf`

Observações:

- Não é permitido editar pedido `CANCELLED` ou `FINISHED`.
- Não é permitido editar pedido já pago, pois não existe fluxo de ajuste financeiro/estorno.
- O backend recalcula diferenças de estoque entre a versão atual e a versão solicitada.
- O total do pedido é recalculado.
- Se o pedido já estiver `READY_FOR_PICKUP`, qualquer edição altera seu status para `PENDING`, limpa `readyAt` e o reenvia à cozinha para novo preparo.
- Publica evento em `/topic/kitchen/orders`.
- Sempre publica evento geral em `/topic/orders` e `/topic/orders/public`.
- Uma edição negada pelo estado atual responde `409 Conflict`.

Resposta `200 OK`: `OrderResponseDTO`.

### `PATCH /api/orders/{id}/pay`

Marca um pedido como pago.

Path params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `id` | integer | ID do pedido. |

Body opcional:

```json
{
  "paymentMethod": "PIX"
}
```

Observações:

- Não é permitido pagar pedido `CANCELLED`.
- Se o pedido já estiver pago, retorna o pedido sem alteração.
- Quando `paymentMethod` é enviado, o backend atualiza o método de pagamento antes de marcar como pago.
- Registra `paidAt` na primeira confirmação de pagamento.
- Publica evento `ORDER_PAID` em `/topic/orders`.
- O evento de pagamento não é publicado em `/topic/orders/public`.

Resposta `200 OK`: `OrderResponseDTO`.

### `PATCH /api/orders/{id}/ready`

Marca um pedido como pronto para retirada.

Path params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `id` | integer | ID do pedido. |

Observações:

- Não é permitido marcar como pronto um pedido `CANCELLED` ou `FINISHED`.
- Atualiza `status` para `READY_FOR_PICKUP`.
- Registra `readyAt` apenas na primeira transição para pronto; esse horário permite ao painel retirar a chamada após 5 minutos.
- Publica evento em `/topic/pickup/orders`.
- Publica evento geral em `/topic/orders` e `/topic/orders/public`.

Resposta `200 OK`: `OrderResponseDTO`.

### `PATCH /api/orders/{id}/finish`

Finaliza um pedido.

Path params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `id` | integer | ID do pedido. |

Observações:

- Só é permitido finalizar pedido com `status = READY_FOR_PICKUP`.
- Atualiza `status` para `FINISHED`.
- Registra `finishedAt`, usado para contar finalizações ocorridas hoje.
- Publica evento geral em `/topic/orders` e `/topic/orders/public`.

Resposta `200 OK`: `OrderResponseDTO`.

### `PATCH /api/orders/{id}/cancel`

Cancela um pedido.

Path params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `id` | integer | ID do pedido. |

Observações:

- Se o pedido já estiver `CANCELLED`, retorna o pedido sem alteração.
- Não é permitido cancelar pedido `FINISHED`.
- Não é permitido cancelar pedido já pago, pois não existe fluxo de estorno.
- O estoque dos itens é devolvido.
- Atualiza `status` para `CANCELLED`.
- Atualiza `paymentStatus` para `CANCELLED`.
- Registra `cancelledAt`, usado para contar cancelamentos ocorridos hoje.
- Publica evento em `/topic/kitchen/orders`.
- Publica evento geral em `/topic/orders` e `/topic/orders/public`.
- Um cancelamento negado porque o pedido já foi finalizado responde `409 Conflict`.

Resposta `200 OK`: `OrderResponseDTO`.

## Dashboard

### `GET /api/dashboard/summary`

Retorna um resumo operacional do dia.

Resposta `200 OK`:

```json
{
  "ordersToday": 12,
  "revenueToday": 320.5,
  "pendingPayments": 4,
  "preparingOrders": 3,
  "readyForPickupOrders": 2,
  "finishedToday": 6,
  "cancelledToday": 1,
  "averagePreparationMinutes": 8.4
}
```

Campos:

- `ordersToday`: quantidade de pedidos criados hoje.
- `revenueToday`: soma do valor total dos pedidos cuja confirmação de pagamento (`paidAt`) ocorreu hoje.
- `pendingPayments`: quantidade total de pedidos com pagamento pendente.
- `preparingOrders`: quantidade total de pedidos com `status = PENDING`.
- `readyForPickupOrders`: quantidade total de pedidos com `status = READY_FOR_PICKUP`.
- `finishedToday`: quantidade de pedidos cujo `finishedAt` ocorreu hoje.
- `cancelledToday`: quantidade de pedidos cujo `cancelledAt` ocorreu hoje.
- `averagePreparationMinutes`: média, em minutos, entre criação e `readyAt` para pedidos preparados hoje.

### `GET /api/dashboard/analytics`

Retorna métricas gerenciais agregadas para o período curto de operação do sistema.
O frontend utiliza esta rota para tempo médio de preparo, distribuição de pagamentos,
picos por hora, top clientes e top produtos. Não existe série de faturamento de 7 dias.

Query params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `days` | integer | Período móvel em dias, entre `1` e `3`. Padrão: `3`. |

Resposta `200 OK`:

```json
{
  "days": 3,
  "averagePreparationMinutes": 8.4,
  "averageTicket": 26.5,
  "paymentMethods": [
    { "paymentMethod": "PIX", "ordersCount": 8 }
  ],
  "ordersByHour": [
    { "hour": 14, "ordersCount": 5 }
  ],
  "topClients": [
    {
      "clientId": 1,
      "name": "Maria Silva",
      "cpf": "12345678900",
      "ordersCount": 3,
      "totalSpent": 95.7
    }
  ],
  "topProducts": [
    {
      "productId": 2,
      "name": "Sanduíche",
      "quantitySold": 12,
      "totalValue": 154.8
    }
  ]
}
```

Regras das métricas:

- Tempo de preparo considera pedidos que receberam `readyAt` no período.
- Ticket médio, métodos de pagamento e top clientes consideram pagamentos confirmados no período.
- Pedidos por hora e top produtos ignoram pedidos cancelados criados no período.

## Resumo de rotas

| Método | Rota | Função | Integrado no frontend |
| --- | --- | --- | --- |
| `POST` | `/api/clients` | Cria cliente. | Sim - cadastro rápido no checkout. |
| `GET` | `/api/clients/cpf/{cpf}` | Busca cliente por CPF. | Sim - identificação no checkout. |
| `GET` | `/api/products` | Lista produtos com filtros. | Sim - catálogo e gestão de produtos. |
| `GET` | `/api/products/{id}` | Busca produto por ID. | Sim - contrato disponível na gestão de produtos. |
| `POST` | `/api/products` | Cria produto. | Sim - gestão de produtos. |
| `PUT` | `/api/products/{id}` | Atualiza produto. | Sim - gestão de produtos. |
| `PATCH` | `/api/products/{id}/stock` | Ajusta estoque do produto. | Sim - gestão de produtos. |
| `DELETE` | `/api/products/{id}` | Remove produto. | Sim - gestão de produtos. |
| `GET` | `/api/orders` | Lista pedidos com filtros. | Sim - home, painel, cozinha, detalhamento e dashboard. |
| `GET` | `/api/orders/{id}` | Busca pedido por ID. | Sim - cozinha e detalhamento. |
| `GET` | `/api/orders/client/{cpf}` | Lista pedidos por CPF do cliente. | Não. |
| `POST` | `/api/orders` | Cria pedido. | Sim - finalização do checkout. |
| `PUT` | `/api/orders/{id}` | Atualiza pedido. | Sim - menu de ações no detalhamento. |
| `PATCH` | `/api/orders/{id}/pay` | Marca pedido como pago. | Sim - detalhamento e pendências no dashboard. |
| `PATCH` | `/api/orders/{id}/ready` | Marca pedido como pronto para retirada. | Sim - cozinha. |
| `PATCH` | `/api/orders/{id}/finish` | Finaliza pedido. | Sim - detalhamento. |
| `PATCH` | `/api/orders/{id}/cancel` | Cancela pedido. | Sim - menu de ações no detalhamento. |
| `GET` | `/api/dashboard/summary` | Retorna resumo operacional do dia. | Sim - home e dashboard. |
| `GET` | `/api/dashboard/analytics` | Retorna métricas gerenciais de ate 3 dias. | Sim - dashboard. |
