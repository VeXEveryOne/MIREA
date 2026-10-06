\set ON_ERROR_STOP on

COPY sellers (seller_id, seller_zip_code_prefix, seller_city, seller_state)
FROM '/import/sellers.csv' WITH (FORMAT csv, HEADER true);

COPY customers (customer_id, customer_unique_id, customer_zip_code_prefix, customer_city, customer_state)
FROM '/import/customers.csv' WITH (FORMAT csv, HEADER true);

COPY geolocation (geolocation_zip_code_prefix, geolocation_lat, geolocation_lng, geolocation_city, geolocation_state)
FROM '/import/geolocation.csv' WITH (FORMAT csv, HEADER true);

COPY leads_qualified (mql_id, first_contact_date, landing_page_id, origin)
FROM '/import/leads_qualified.csv' WITH (FORMAT csv, HEADER true);

COPY product_category_name_translation (product_category_name, product_category_name_english)
FROM '/import/product_category_name_translation.csv' WITH (FORMAT csv, HEADER true);

CREATE TEMP TABLE leads_closed_stage AS SELECT * FROM leads_closed WITH NO DATA;
COPY leads_closed_stage (mql_id, seller_id, sdr_id, sr_id, won_date, business_segment, lead_type,
  lead_behaviour_profile, has_company, has_gtin, average_stock, business_type,
  declared_product_catalog_size, declared_monthly_revenue)
FROM '/import/leads_closed.csv' WITH (FORMAT csv, HEADER true);
INSERT INTO leads_closed
SELECT s.mql_id,
       CASE WHEN v.seller_id IS NOT NULL THEN s.seller_id ELSE NULL END,
       s.sdr_id, s.sr_id, s.won_date, s.business_segment, s.lead_type,
       s.lead_behaviour_profile, s.has_company, s.has_gtin, s.average_stock,
       s.business_type, s.declared_product_catalog_size, s.declared_monthly_revenue
FROM leads_closed_stage s
LEFT JOIN sellers v ON v.seller_id = s.seller_id;

CREATE TEMP TABLE products_stage AS SELECT * FROM products WITH NO DATA;
COPY products_stage (product_id, product_category_name, product_name_lenght,
  product_description_lenght, product_photos_qty, product_weight_g,
  product_length_cm, product_height_cm, product_width_cm)
FROM '/import/products.csv' WITH (FORMAT csv, HEADER true);
INSERT INTO product_category_name_translation (product_category_name, product_category_name_english)
SELECT DISTINCT s.product_category_name, NULL
FROM products_stage s
LEFT JOIN product_category_name_translation t USING (product_category_name)
WHERE s.product_category_name IS NOT NULL AND t.product_category_name IS NULL;
INSERT INTO products SELECT * FROM products_stage;

COPY orders (order_id, customer_id, order_status, order_purchase_timestamp,
  order_approved_at, order_delivered_carrier_date, order_delivered_customer_date,
  order_estimated_delivery_date)
FROM '/import/orders.csv' WITH (FORMAT csv, HEADER true);

COPY order_items (order_id, order_item_id, product_id, seller_id,
  shipping_limit_date, price, freight_value)
FROM '/import/order_items.csv' WITH (FORMAT csv, HEADER true);

COPY order_reviews (review_id, order_id, review_score, review_comment_title,
  review_comment_message, review_creation_date, review_answer_timestamp)
FROM '/import/order_reviews.csv' WITH (FORMAT csv, HEADER true);

COPY order_payments (order_id, payment_sequential, payment_type,
  payment_installments, payment_value)
FROM '/import/order_payments.csv' WITH (FORMAT csv, HEADER true);

ANALYZE;
