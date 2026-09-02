# Rotas da API REST

Este documento descreve as rotas REST existentes no backend do minimercado, seus parâmetros, payloads e comportamento esperado.

## Visão geral

- Base path: `/api`
- Formato de entrada e saída: JSON
- Paginação: resposta estável própria, com páginas entre 1 e 200 itens
- Datas em query params: formato ISO date-time, por exemplo `2026-05-20T14:30:00`

## Regra de cozinha

- Todo produto é preparado na cozinha; não existe campo ou filtro para separar itens fora desse fluxo.

## Acesso operacional

As rotas públicas são `GET /api/products/**`, `POST /api/orders`, `GET /api/orders/public` e
`GET /api/settings/public`. Todas as outras rotas `/api/**` exigem `X-Admin-Key` com o valor de
`APP_ADMIN_KEY`. Isso inclui consulta e alteração de pedidos, pagamentos, cancelamentos, gestão de
produtos, cozinha, dashboard e configurações.

`GET /api/auth/verify` valida a chave utilizada pelo frontend. Nos profiles `prod` e `docker`, o
backend não inicia se `APP_ADMIN_KEY` estiver vazia. CORS aceita todas as origens por meio de
`APP_CORS_ALLOWED_ORIGINS=*`; as rotas operacionais continuam protegidas pela chave.

## Disponibilidade dos produtos

- Produtos não possuem estoque ou limite de unidades.
- `available = true` habilita novas vendas; `available = false` retira o produto do cardápio sem apagar seu histórico.
- Produtos desabilitados continuam visíveis na gestão e nos pedidos anteriores.
- Quantidades vendidas pertencem exclusivamente aos endpoints analíticos do dashboard.

## Variantes e observações

- Variantes pertencem ao produto base, usam o mesmo preço dele e têm disponibilidade individual.
- Em produtos como tapioca ou salgado, `variantSelectionRequired = true` obriga a escolha do sabor/tipo no pedido.
- `variantSelectionMode` pode ser `SINGLE` ou `MULTIPLE`.
- Variantes persistidas devem ser desabilitadas, não removidas, para preservar pedidos históricos.
- Um combo não possui modelagem especial: é cadastrado como um produto comum com seu próprio nome e preço.
- O pedido guarda o nome do produto, a variante escolhida e uma observação opcional, preservando o que a cozinha recebeu no momento da compra mesmo se o catálogo for renomeado depois.

## Evolução do banco

A migration `V3__product_availability_and_current_schema.sql` cria o schema atual em bancos novos,
completa bancos existentes e remove a coluna legada `stock_quantity`. O profile `prod` executa
as migrations antes de validar o schema.

A migration `V4__app_settings.sql` adiciona a identidade visual global da instalação. A linha de
configuração usa o ID fixo `1`.

A migration `V5__data_integrity_and_indexes.sql` converte dinheiro para `NUMERIC(12,2)`, adiciona
controle de versão otimista, restrições obrigatórias e índices usados pelos filtros operacionais.

A migration `V6__remove_brand_image_assets.sql` remove as antigas colunas binárias de logo e ícone.
A logo passa a usar somente as iniciais configuradas, enquanto o favicon é um arquivo estático do
frontend.

## Personalização da instalação

A personalização é global por instalação. O sistema ainda não possui contas ou tenants, portanto
não existe uma identidade diferente por usuário autenticado.

Operações protegidas exigem o header:

```text
X-Admin-Key: sua-chave
```

Em produção e Docker, `APP_ADMIN_KEY` é obrigatória. Em `dev` e `test`, pode ficar vazia para
desenvolvimento isolado.

### `GET /api/settings/public`

Retorna textos, cores e aparência. Não exige autenticação, pois é consumida antes da renderização
das telas públicas.

Resposta `200 OK`:

```json
{
  "businessName": "Meu Estabelecimento",
  "shortName": "ME",
  "tagline": "Sistema de Pedidos",
  "description": "Sistema para registrar pedidos, acompanhar a cozinha e organizar retiradas.",
  "homeTitle": "Pedidos simples, operação organizada.",
  "homeDescription": "Registre pedidos, acompanhe a cozinha e organize a retirada em um só lugar.",
  "footerText": "Todos os direitos reservados.",
  "panelTitle": "Painel de Pedidos",
  "panelSubtitle": "Veja quando seu pedido estiver pronto",
  "primaryColor": "#B42318",
  "secondaryColor": "#F4B400",
  "accentColor": "#F7C948",
  "backgroundColor": "#FFFCF7",
  "surfaceColor": "#FFFFFF",
  "textColor": "#251C19",
  "mutedTextColor": "#73645F",
  "borderColor": "#E9E0DA",
  "preparingColor": "#E7A900",
  "readyColor": "#27935C",
  "destructiveColor": "#C7352A",
  "borderRadius": 14,
  "fontFamily": "system",
  "updatedAt": "2026-08-25T20:00:00Z"
}
```

### `PUT /api/settings`

Atualiza todos os campos textuais e visuais. Cores usam `#RRGGBB`, `borderRadius` aceita valores de
`4` a `24` e `fontFamily` aceita `system`, `serif`, `rounded` ou `mono`.

### `POST /api/settings/reset`

Restaura textos, cores e aparência para os valores neutros de fábrica.

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
CARTAO
```

`PaymentMethod` registra a forma escolhida; `PaymentStatus` registra se o pagamento
foi efetivamente confirmado. Bancos que possuam valores legados devem converter
o antigo pseudo-método `PENDING` para `NULL`; ao confirmar esses pedidos, a rota
de pagamento deve receber a forma efetivamente utilizada:

```sql
UPDATE orders SET payment_method = NULL WHERE payment_method = 'PENDING';
```

## Paginação

Endpoints paginados aceitam os parâmetros padrão:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `page` | integer | Número da página, começando em `0`. |
| `size` | integer | Quantidade de itens por página, de `1` a `200`. |
| `sort` | string | Campo de ordenação. Pode receber valores como `name,asc` ou `orderTime,desc`. |

Os parâmetros devem ser enviados na query string, por exemplo:
`?page=1&size=5&sort=id,asc`. No Swagger, preencha `sort` como string;
não envie o valor como array JSON (`["id,asc"]`).

Resposta paginada possui contrato estável próprio:

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

## Produtos

### `GET /api/products`

Lista produtos com paginação e filtros opcionais.

Query params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `name` | string | Filtra produtos por trecho do nome, ignorando maiúsculas/minúsculas. |
| `available` | boolean | Filtra produtos habilitados ou desabilitados para venda. |
| `page` | integer | Página. Padrão: `0`. |
| `size` | integer | Tamanho da página. Padrão do controller: `20`. |
| `sort` | string | Ordenação. Padrão: `name,asc`. Campos: `id`, `name`, `price`, `available`. |

Exemplo:

```text
GET /api/products?name=cafe&available=true&page=0&size=20&sort=name,asc
```

Resposta `200 OK`:

```json
{
  "content": [
    {
      "id": 1,
      "name": "Café",
      "price": 4.5,
      "icon": "DRINK",
      "available": true,
      "hasVariants": false,
      "variantType": null,
      "variantSelectionRequired": false,
      "variantSelectionMode": "SINGLE",
      "variants": []
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 20,
  "number": 0
}
```

### `GET /api/products/{id}`

Busca um produto pelo ID, inclusive quando estiver desabilitado.

Path params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `id` | integer | ID do produto. |

Resposta `200 OK`:

```json
{
  "id": 1,
  "name": "Tapioca",
  "price": 10.0,
  "icon": "SNACK",
  "available": true,
  "hasVariants": true,
  "variantType": "Recheio",
  "variantSelectionRequired": true,
  "variantSelectionMode": "SINGLE",
  "variants": [
    { "id": 11, "name": "Frango", "available": true },
    { "id": 12, "name": "Carne", "available": false }
  ]
}
```

### `POST /api/products`

Cria um produto.

Body:

```json
{
  "name": "Tapioca",
  "price": 10.0,
  "icon": "SNACK",
  "available": true,
  "hasVariants": true,
  "variantType": "Recheio",
  "variantSelectionRequired": true,
  "variantSelectionMode": "SINGLE",
  "variants": [
    { "name": "Frango", "available": true },
    { "name": "Carne", "available": false }
  ]
}
```

Campos obrigatórios:

- `name`
- `price`

Observações:

- `available` é opcional e assume `true`.
- `icon` é opcional e assume `GENERAL` quando omitido. Valores disponíveis: `GENERAL`, `SANDWICH`, `DRINK`, `DESSERT`, `SNACK`, `COMBO`, `MEAL`, `BAKERY`, `FROZEN_DESSERT` e `HOT_DRINK`.
- Os ícones são renderizados localmente no frontend; produtos não aceitam mais URL de imagem.
- Sugestões para o cardápio: `SANDWICH` para hambúrguer/misto quente; `SNACK` para tapioca/cuscuz/salgado; `MEAL` para espetinho/jantinha; `BAKERY` para pão, bolo e torta; `FROZEN_DESSERT` para açaí/dindin; `HOT_DRINK` para café/chocolate quente; `DRINK` para águas, refrigerantes e sucos; `COMBO` para combo.
- Todo produto pertence ao fluxo de preparo da cozinha por definição de domínio.
- `variants[].available = false` impede a seleção da opção em novos pedidos.
- As variantes não possuem preço próprio; o preço utilizado é sempre o do produto base.
- Um combo é criado com o mesmo payload simples de qualquer outro produto, sem componentes vinculados.

Resposta `201 Created`:

```json
{
  "id": 2,
  "name": "Tapioca",
  "price": 10.0,
  "icon": "SNACK",
  "available": true,
  "hasVariants": true,
  "variantType": "Recheio",
  "variantSelectionRequired": true,
  "variantSelectionMode": "SINGLE",
  "variants": [
    { "id": 31, "name": "Frango", "available": true },
    { "id": 32, "name": "Carne", "available": false }
  ]
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
  "icon": "SANDWICH",
  "available": true,
  "hasVariants": true,
  "variantType": "Recheio",
  "variantSelectionRequired": true,
  "variantSelectionMode": "SINGLE",
  "variants": [
    { "id": 31, "name": "Frango", "available": false },
    { "id": 32, "name": "Carne", "available": true }
  ]
}
```

Observações:

- Todos os campos do body são opcionais.
- Campos não enviados permanecem com o valor atual.
- Envie `variants[].id` ao editar uma variante existente para preservar sua identidade; omita `id` somente ao adicionar uma nova opção.
- Variantes existentes não podem ser removidas; marque `available = false`.

Resposta `200 OK`:

```json
{
  "id": 2,
  "name": "Sanduíche especial",
  "price": 15.9,
  "icon": "SANDWICH",
  "available": true
}
```

### `PATCH /api/products/{id}/availability`

Habilita ou desabilita o produto para novas vendas.

Path params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `id` | integer | ID do produto. |

Body:

```json
{
  "available": false
}
```

Campos obrigatórios:

- `available`

Observações:

- Produtos desabilitados deixam de aparecer no cardápio de venda.
- Pedidos anteriores e as métricas analíticas associadas são preservados.
- Em pedidos existentes, a quantidade já registrada pode ser mantida ou reduzida, mas não aumentada.

Resposta `200 OK`:

```json
{
  "id": 2,
  "name": "Sanduíche especial",
  "price": 15.9,
  "icon": "SANDWICH",
  "available": false
}
```

## Pedidos

### `GET /api/orders`

Lista pedidos com paginação e filtros opcionais.

Query params:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `status` | `OrderStatus` | Filtra por status do pedido. |
| `paymentStatus` | `PaymentStatus` | Filtra por status do pagamento. |
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
          "productName": "Tapioca",
          "unitPrice": 10.0,
          "quantity": 2,
          "subtotal": 20.0,
          "selectedVariantId": 31,
          "selectedVariantName": "Frango"
        }
      ],
      "paymentMethod": "PIX",
      "customerName": null,
      "customerPhoneNumber": null,
      "customerTeam": null,
      "totalValue": 20.0,
      "observation": "Sem molho"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 10,
  "number": 0
}
```

### `GET /api/orders/public`

Consulta pública exclusiva do painel de retirada. Aceita somente `status=PENDING` ou
`status=READY_FOR_PICKUP` e devolve apenas `id`, `orderTime`, `readyAt` e `status`; itens, dados da
pessoa e informações financeiras nunca são expostos. Não exige chave operacional.

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
      "productName": "Tapioca",
      "unitPrice": 10.0,
      "quantity": 1,
      "subtotal": 10.0,
      "selectedVariantId": 31,
      "selectedVariantName": "Frango"
    }
  ],
  "paymentMethod": "PIX",
  "customerName": null,
  "customerPhoneNumber": null,
  "customerTeam": null,
  "totalValue": 10.0,
  "observation": "Sem cebola"
}
```

### `POST /api/orders`

Cria um pedido.

Body:

```json
{
  "items": [
    {
      "productId": 2,
      "quantity": 2,
      "selectedVariantId": 31,
      "selectedVariantIds": [31]
    }
  ],
  "paymentMethod": "PIX",
  "confirmPayment": true,
  "observation": "Sem molho"
}
```

Campos obrigatórios:

- `items`
- `items[].productId`
- `items[].quantity`

Observações:

- `items` não pode ser vazio.
- `items[].quantity` deve ser maior que zero.
- Pedidos pagos na hora não exigem dados da pessoa.
- Para pedido fiado, omita `paymentMethod` e informe `customerName`, `customerPhoneNumber` e `customerTeam`.
- Cada produto precisa existir e estar habilitado para venda.
- `items[].selectedVariantId` é obrigatório quando o produto exige uma única variante.
- `items[].selectedVariantIds` aceita múltiplas opções quando `variantSelectionMode = MULTIPLE`.
- Variantes indisponíveis não podem ser incluídas em novos pedidos.
- `observation` é opcional e aceita até 500 caracteres.
- O pedido nasce com `status = PENDING`.
- `paymentMethod` aceita `PIX`, `DINHEIRO` ou `CARTAO` e representa apenas a forma escolhida.
- Com `confirmPayment = true`, `paymentMethod` é obrigatório e o pedido já nasce pago na mesma transação.
- Sem `confirmPayment`, o pedido nasce com `paymentStatus = PENDING` e pode ser pago posteriormente por `PATCH /api/orders/{id}/pay`.
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
      "quantity": 1,
      "selectedVariantId": 31
    },
    {
      "productId": 3,
      "quantity": 2
    }
  ],
  "paymentMethod": "PIX",
  "observation": "Sem molho e sem cebola"
}
```

Campos obrigatórios:

- `items`

Observações:

- Não é permitido editar pedido `CANCELLED` ou `FINISHED`.
- Não é permitido editar pedido já pago, pois não existe fluxo de ajuste financeiro/estorno.
- Produtos desabilitados já presentes no pedido podem ser mantidos ou reduzidos, mas não aumentados.
- Nome, preço e variantes das linhas existentes permanecem como snapshot da compra.
- Cada linha mantém sua variante, permitindo editar no mesmo pedido itens como tapioca de frango e tapioca de carne separadamente.
- Se uma variante for desativada após a compra, a quantidade já reservada pode ser mantida na edição, mas não aumentada.
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
- É permitido confirmar pagamento de pedido já retirado (`FINISHED`) que permaneceu pendente.
- Sem body, confirma a forma de pagamento já registrada no pedido.
- Quando `paymentMethod` é enviado, o backend corrige/atualiza a forma antes de marcar como pago.
- Pedidos legados sem forma registrada exigem `paymentMethod` no body.
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
- A retirada é permitida mesmo com `paymentStatus = PENDING`; o pedido continua nas pendências do dashboard até ser pago.
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
  "totalOrders": 350,
  "revenueToday": 320.5,
  "totalRevenue": 9430.75,
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
- `totalOrders`: quantidade de pedidos em todo o histórico.
- `revenueToday`: soma do valor total dos pedidos cuja confirmação de pagamento (`paidAt`) ocorreu hoje.
- `totalRevenue`: soma do valor total de todos os pagamentos confirmados.
- `pendingPayments`: quantidade total de pedidos com pagamento pendente.
- `preparingOrders`: quantidade total de pedidos com `status = PENDING`.
- `readyForPickupOrders`: quantidade total de pedidos com `status = READY_FOR_PICKUP`.
- `finishedToday`: quantidade de pedidos cujo `finishedAt` ocorreu hoje.
- `cancelledToday`: quantidade de pedidos cujo `cancelledAt` ocorreu hoje.
- `averagePreparationMinutes`: média, em minutos, entre criação e `readyAt` para pedidos preparados hoje.

### `GET /api/dashboard/analytics`

Retorna métricas gerenciais agregadas para todo o histórico de operação do sistema.
O frontend utiliza esta rota para tempo médio de preparo, distribuição de pagamentos,
picos por hora e top produtos. Não existe série de faturamento de 7 dias.

Resposta `200 OK`:

```json
{
  "averagePreparationMinutes": 8.4,
  "averageTicket": 26.5,
  "paymentMethods": [
    { "paymentMethod": "PIX", "ordersCount": 8 }
  ],
  "ordersByHour": [
    { "hour": 14, "ordersCount": 5 }
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

- Tempo de preparo considera pedidos que receberam `readyAt`.
- Ticket médio e métodos de pagamento consideram todos os pagamentos confirmados.
- Pedidos por hora e top produtos consideram todos os pedidos, ignorando os cancelados.
- `quantitySold` aparece somente em `topProducts` e representa a soma de unidades não canceladas.
- `statuses` contém a distribuição histórica por status sem exigir o carregamento de todos os pedidos no frontend.

### `GET /api/dashboard/top-products`

Retorna o ranking completo de produtos não cancelados, sem o limite de cinco itens aplicado em
`analytics.topProducts`. Usa o formato `{ productId, name, quantitySold, totalValue }` e atende à
exportação analítica do frontend.

## Resumo de rotas

| Método | Rota | Função | Integrado no frontend |
| --- | --- | --- | --- |
| `GET` | `/api/products` | Lista produtos com filtros. | Sim - catálogo e gestão de produtos. |
| `GET` | `/api/products/{id}` | Busca produto por ID. | Sim - contrato disponível na gestão de produtos. |
| `POST` | `/api/products` | Cria produto. | Sim - gestão de produtos. |
| `PUT` | `/api/products/{id}` | Atualiza produto. | Sim - gestão de produtos. |
| `PATCH` | `/api/products/{id}/availability` | Habilita ou desabilita novas vendas. | Sim - gestão de produtos. |
| `GET` | `/api/orders` | Lista pedidos com filtros. | Sim - home, painel, cozinha, detalhamento e dashboard. |
| `GET` | `/api/orders/{id}` | Busca pedido por ID. | Sim - cozinha e detalhamento. |
| `POST` | `/api/orders` | Cria pedido. | Sim - finalização do checkout. |
| `PUT` | `/api/orders/{id}` | Atualiza pedido. | Sim - menu de ações no detalhamento. |
| `PATCH` | `/api/orders/{id}/pay` | Marca pedido como pago. | Sim - detalhamento e pendências no dashboard. |
| `PATCH` | `/api/orders/{id}/ready` | Marca pedido como pronto para retirada. | Sim - cozinha. |
| `PATCH` | `/api/orders/{id}/finish` | Finaliza pedido. | Sim - detalhamento. |
| `PATCH` | `/api/orders/{id}/cancel` | Cancela pedido. | Sim - menu de ações no detalhamento. |
| `GET` | `/api/dashboard/summary` | Retorna resumo operacional do dia. | Sim - home e dashboard. |
| `GET` | `/api/dashboard/analytics` | Retorna métricas gerenciais do histórico. | Sim - dashboard. |
| `GET` | `/api/dashboard/top-products` | Retorna o ranking completo de produtos vendidos. | Sim - exportação do dashboard. |
