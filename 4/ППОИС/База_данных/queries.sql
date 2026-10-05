-- Q01: eligible offers for each group position, including quantity and freshness.
SELECT s.line_no, c.sku, o.id AS offer_id, p.code AS supplier,
       o.unit_price_rub, o.stock, o.observed_at
FROM ppois.bom_slot s
JOIN ppois.component c ON (s.group_id IS NOT NULL AND c.group_id = s.group_id)
    OR (s.requested_component_id IS NOT NULL AND c.id = s.requested_component_id)
JOIN ppois.offer o ON o.component_id = c.id
JOIN ppois.supplier p ON p.id = o.supplier_id
WHERE s.configuration_id = '00000000-0000-0000-0000-000000000100'
  AND s.version_no = 1 AND o.stock >= s.quantity
  AND o.observed_at >= TIMESTAMPTZ '2026-10-05 10:00:00+03' - INTERVAL '24 hours'
  AND o.observed_at <= TIMESTAMPTZ '2026-10-05 10:00:00+03'
ORDER BY s.line_no, o.unit_price_rub, o.id;

-- Q02: component cost and physical mass from the selected concrete BOM.
SELECT s.configuration_id, s.version_no,
       SUM(s.quantity * o.unit_price_rub) AS component_cost_rub,
       SUM(s.quantity * c.mass_kg) AS component_mass_kg,
       COUNT(*) AS positions
FROM ppois.bom_slot s JOIN ppois.offer o ON o.id = s.offer_id
JOIN ppois.component c ON c.id = o.component_id
GROUP BY s.configuration_id, s.version_no;

-- Q03: card readiness and last publication outcome are independent states.
SELECT seller_code, revision_no, revision_state, price_rub, mass_kg,
       publication_state, external_task_id FROM ppois.card_status
ORDER BY seller_code, revision_no;

-- Q04: inverse impact of a changed component; no arbitrary card lookup by name.
SELECT DISTINCT c.seller_code, r.revision_no, r.state
FROM ppois.card_revision r JOIN ppois.card c ON c.id = r.card_id
JOIN ppois.bom_slot s ON (s.configuration_id, s.version_no) = (r.configuration_id, r.version_no)
JOIN ppois.offer o ON o.id=s.offer_id
WHERE o.component_id = '00000000-0000-0000-0000-000000000011'
ORDER BY c.seller_code, r.revision_no;

-- Q05: reconciliation queue; UNKNOWN is never treated as safe to resubmit.
SELECT c.seller_code, a.revision_no, a.attempt_no, a.state,
       a.external_task_id, a.confirmed_not_accepted, a.next_check_at
FROM ppois.publication_attempt a JOIN ppois.card c ON c.id = a.card_id
WHERE a.state IN ('ACCEPTED','UNKNOWN')
   OR (a.state = 'TEMP_ERROR' AND a.confirmed_not_accepted)
ORDER BY a.next_check_at NULLS FIRST, c.seller_code;

-- Q06: identify missing mandatory images on a revision.
SELECT c.seller_code, r.revision_no
FROM ppois.card_revision r JOIN ppois.card c ON c.id = r.card_id
LEFT JOIN ppois.revision_image ri ON (ri.card_id, ri.revision_no) = (r.card_id, r.revision_no)
GROUP BY c.seller_code, r.revision_no HAVING COUNT(ri.image_id) = 0;
