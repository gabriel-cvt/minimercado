ALTER TABLE products ALTER COLUMN price TYPE NUMERIC(12, 2) USING price::numeric(12, 2);
ALTER TABLE orders ALTER COLUMN total_value TYPE NUMERIC(12, 2) USING total_value::numeric(12, 2);
ALTER TABLE order_items ALTER COLUMN unit_price TYPE NUMERIC(12, 2) USING unit_price::numeric(12, 2);

ALTER TABLE products ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
UPDATE app_settings SET font_family = 'system' WHERE font_family = 'inter';

UPDATE order_items oi SET unit_price = products.price
FROM products WHERE oi.product_id = products.id AND oi.unit_price IS NULL;
UPDATE order_items SET quantity = 1 WHERE quantity IS NULL;
UPDATE orders SET order_time = CURRENT_TIMESTAMP WHERE order_time IS NULL;
UPDATE orders SET status = 'PENDING' WHERE status IS NULL;
UPDATE orders SET payment_status = 'PENDING' WHERE payment_status IS NULL;
UPDATE orders SET total_value = 0 WHERE total_value IS NULL;

ALTER TABLE order_items ALTER COLUMN quantity SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN unit_price SET NOT NULL;
ALTER TABLE orders ALTER COLUMN order_time SET NOT NULL;
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
ALTER TABLE orders ALTER COLUMN payment_status SET NOT NULL;
ALTER TABLE orders ALTER COLUMN total_value SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_time ON orders(order_time);
CREATE INDEX IF NOT EXISTS idx_orders_ready_at ON orders(ready_at);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
