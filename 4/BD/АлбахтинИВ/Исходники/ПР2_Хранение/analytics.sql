-- 1. Top 10 categories by revenue with English translation.
SELECT
  p.product_category_name,
  COALESCE(t.product_category_name_english, 'not translated') AS category_en,
  ROUND(SUM(oi.price), 2) AS revenue,
  COUNT(DISTINCT oi.order_id) AS orders_count,
  COUNT(*) AS items_count
FROM order_items oi
JOIN products p ON p.product_id = oi.product_id
LEFT JOIN product_category_name_translation t
  ON t.product_category_name = p.product_category_name
GROUP BY p.product_category_name, t.product_category_name_english
ORDER BY revenue DESC
LIMIT 10;

-- 2. Payment behaviour.
SELECT
  payment_type,
  COUNT(*) AS payments_count,
  ROUND(AVG(payment_installments), 2) AS avg_installments,
  ROUND(AVG(payment_value), 2) AS avg_payment,
  ROUND(100.0 * COUNT(DISTINCT order_id)
    / (SELECT COUNT(DISTINCT order_id) FROM order_payments), 2) AS order_share_pct
FROM order_payments
GROUP BY payment_type
ORDER BY payments_count DESC;

-- 3. Review score depending on delivery speed.
WITH reviews AS (
  SELECT order_id, AVG(review_score) AS review_score
  FROM order_reviews
  GROUP BY order_id
), delivery AS (
  SELECT
    o.order_id,
    CASE
      WHEN o.order_delivered_customer_date::date - o.order_purchase_timestamp::date <= 5 THEN 'up to 5 days'
      WHEN o.order_delivered_customer_date::date - o.order_purchase_timestamp::date <= 10 THEN '6-10 days'
      ELSE 'more than 10 days'
    END AS delivery_group,
    CASE
      WHEN o.order_delivered_customer_date::date - o.order_purchase_timestamp::date <= 5 THEN 1
      WHEN o.order_delivered_customer_date::date - o.order_purchase_timestamp::date <= 10 THEN 2
      ELSE 3
    END AS sort_order,
    r.review_score
  FROM orders o
  JOIN reviews r ON r.order_id = o.order_id
  WHERE o.order_delivered_customer_date IS NOT NULL
)
SELECT delivery_group,
       COUNT(DISTINCT order_id) AS orders_count,
       ROUND(AVG(review_score), 2) AS avg_review_score
FROM delivery
GROUP BY delivery_group, sort_order
ORDER BY sort_order;

-- 4. Top 10 sellers by number of orders.
SELECT
  oi.seller_id,
  COUNT(DISTINCT oi.order_id) AS orders_count,
  COUNT(DISTINCT c.customer_unique_id) AS customers_count,
  COUNT(*) AS items_count,
  ROUND(SUM(oi.price), 2) AS revenue,
  ROUND(AVG(oi.freight_value), 2) AS avg_freight
FROM order_items oi
JOIN orders o ON o.order_id = oi.order_id
JOIN customers c ON c.customer_id = o.customer_id
GROUP BY oi.seller_id
ORDER BY orders_count DESC, revenue DESC
LIMIT 10;
