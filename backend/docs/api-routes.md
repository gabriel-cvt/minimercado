# Rotas da API REST

Este documento descreve as rotas REST existentes no backend do minimercado, seus parâmetros, payloads e comportamento esperado.

## Visão geral

- Base path: `/api`
- Formato de entrada e saída: JSON
- Paginação: endpoints paginados usam o padrão do Spring `Pageable`
- Datas em query params: formato ISO date-time, por exemplo `2026-05-20T14:30:00`

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
| `requiresKitchenPreparation` | boolean | Filtra produtos que exigem ou não preparo na cozinha. |
| `inStock` | boolean | Quando `true`, retorna produtos com estoque maior que zero. Quando `false`, retorna produtos sem estoque. |
| `page` | integer | Página. Padrão: `0`. |
| `size` | integer | Tamanho da página. Padrão do controller: `20`. |
| `sort` | string | Ordenação. Padrão do controller: `name`. |

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
      "requiresKitchenPreparation": false,
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
  "requiresKitchenPreparation": false,
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
  "requiresKitchenPreparation": true,
  "stockQuantity": 20
}
```

Campos obrigatórios:

- `name`
- `price`
- `stockQuantity`

Observações:

- `stockQuantity` não pode ser negativo.
- Se `requiresKitchenPreparation` não for enviado, o backend usa `true`.

Resposta `201 Created`:

```json
{
  "id": 2,
  "name": "Sanduíche",
  "price": 12.9,
  "urlImage": "https://example.com/sanduiche.png",
  "requiresKitchenPreparation": true,
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
  "urlImage": "https://example.com/sanduiche-especial.png",
  "requiresKitchenPreparation": true
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
  "requiresKitchenPreparation": true,
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
  "requiresKitchenPreparation": true,
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
| `requiresKitchenPreparation` | boolean | Filtra pedidos que possuem itens que exigem ou não preparo na cozinha. |
| `page` | integer | Página. Padrão: `0`. |
| `size` | integer | Tamanho da página. Padrão do controller: `10`. |
| `sort` | string | Ordenação. Padrão do controller: `orderTime`. |

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
      "status": "PENDING",
      "paymentStatus": "PENDING",
      "items": [
        {
          "productId": 2,
          "productName": "Sanduíche",
          "requiresKitchenPreparation": true,
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
  "status": "PENDING",
  "paymentStatus": "PENDING",
  "items": [
    {
      "productId": 2,
      "productName": "Sanduíche",
      "requiresKitchenPreparation": true,
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
| `sort` | string | Ordenação. Padrão do controller: `orderTime`. |

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
- O pedido nasce com `status = PENDING` e `paymentStatus = PENDING`.
- Se houver item com `requiresKitchenPreparation = true`, publica evento WebSocket em `/topic/kitchen/orders`.
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
- O backend recalcula diferenças de estoque entre a versão atual e a versão solicitada.
- O total do pedido é recalculado.
- Se o pedido tiver ou tiver tido itens de cozinha, publica evento em `/topic/kitchen/orders`.
- Sempre publica evento geral em `/topic/orders` e `/topic/orders/public`.

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
- O estoque dos itens é devolvido.
- Atualiza `status` para `CANCELLED`.
- Atualiza `paymentStatus` para `CANCELLED`.
- Se houver item com `requiresKitchenPreparation = true`, publica evento em `/topic/kitchen/orders`.
- Publica evento geral em `/topic/orders` e `/topic/orders/public`.

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
  "cancelledToday": 1
}
```

Campos:

- `ordersToday`: quantidade de pedidos criados hoje.
- `revenueToday`: soma do valor total dos pedidos pagos hoje.
- `pendingPayments`: quantidade total de pedidos com pagamento pendente.
- `preparingOrders`: quantidade total de pedidos com `status = PENDING`.
- `readyForPickupOrders`: quantidade total de pedidos com `status = READY_FOR_PICKUP`.
- `finishedToday`: quantidade de pedidos finalizados hoje.
- `cancelledToday`: quantidade de pedidos cancelados hoje.

## Resumo de rotas

| Método | Rota | Função |
| --- | --- | --- |
| `POST` | `/api/clients` | Cria cliente. |
| `GET` | `/api/clients/cpf/{cpf}` | Busca cliente por CPF. |
| `GET` | `/api/products` | Lista produtos com filtros. |
| `GET` | `/api/products/{id}` | Busca produto por ID. |
| `POST` | `/api/products` | Cria produto. |
| `PUT` | `/api/products/{id}` | Atualiza produto. |
| `PATCH` | `/api/products/{id}/stock` | Ajusta estoque do produto. |
| `DELETE` | `/api/products/{id}` | Remove produto. |
| `GET` | `/api/orders` | Lista pedidos com filtros. |
| `GET` | `/api/orders/{id}` | Busca pedido por ID. |
| `GET` | `/api/orders/client/{cpf}` | Lista pedidos por CPF do cliente. |
| `POST` | `/api/orders` | Cria pedido. |
| `PUT` | `/api/orders/{id}` | Atualiza pedido. |
| `PATCH` | `/api/orders/{id}/pay` | Marca pedido como pago. |
| `PATCH` | `/api/orders/{id}/ready` | Marca pedido como pronto para retirada. |
| `PATCH` | `/api/orders/{id}/finish` | Finaliza pedido. |
| `PATCH` | `/api/orders/{id}/cancel` | Cancela pedido. |
| `GET` | `/api/dashboard/summary` | Retorna resumo operacional do dia. |

