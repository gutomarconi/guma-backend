CREATE OR REPLACE VIEW public.vw_order_machine_detail AS
WITH item_machine AS (
  SELECT
    i.id AS item_id,
    i.item_code AS item_code,
    i.description AS item_description,
    i.barcode,

    i.order_number,
    i.batch_number,
    i.box_number,
    i.order_date,
    i.order_delivery_date,
    i."companyId" AS company_id,

    m.machine_id,

    CASE
      WHEN ih.id IS NOT NULL THEN 'DONE'
      ELSE 'PENDING'
    END AS machine_status

  FROM public."Item" i

  CROSS JOIN (
    SELECT 1 AS machine_id
    UNION ALL SELECT 2
    UNION ALL SELECT 3
    UNION ALL SELECT 4
  ) m

  LEFT JOIN public."ItemHistory" ih
    ON ih."itemId" = i.id
   AND ih."machineId" = m.machine_id
),

order_totals AS (
  SELECT
    company_id,
    order_number,
    batch_number,
    box_number,
    order_date,
    order_delivery_date,

    COUNT(*) FILTER (WHERE machine_id = 1) AS cutting_total,
    COUNT(*) FILTER (WHERE machine_id = 1 AND machine_status = 'DONE') AS cutting_done,

    COUNT(*) FILTER (WHERE machine_id = 2) AS drilling_total,
    COUNT(*) FILTER (WHERE machine_id = 2 AND machine_status = 'DONE') AS drilling_done,

    COUNT(*) FILTER (WHERE machine_id = 3) AS border_total,
    COUNT(*) FILTER (WHERE machine_id = 3 AND machine_status = 'DONE') AS border_done,

    COUNT(*) FILTER (WHERE machine_id = 4) AS packing_total,
    COUNT(*) FILTER (WHERE machine_id = 4 AND machine_status = 'DONE') AS packing_done

  FROM item_machine
  GROUP BY
    company_id,
    order_number,
    batch_number,
    box_number,
    order_date,
    order_delivery_date
)

SELECT
  ot.*,

  CASE
    WHEN
      (cutting_total = 0 OR cutting_done = cutting_total)
      AND (drilling_total = 0 OR drilling_done = drilling_total)
      AND (border_total = 0 OR border_done = border_total)
      AND (packing_total = 0 OR packing_done = packing_total)
    THEN 'DONE'
    ELSE 'PENDING'
  END AS order_status,

  json_agg(
    json_build_object(
      'itemId', im.item_id,
      'code', im.item_code,
      'description', im.item_description,
      'barcode', im.barcode,
      'machineId', im.machine_id,
      'status', im.machine_status
    )
    ORDER BY im.item_code, im.machine_id
  ) AS items

FROM order_totals ot
JOIN item_machine im
  ON im.company_id = ot.company_id
 AND im.order_number = ot.order_number

GROUP BY
  ot.company_id,
  ot.order_number,
  ot.batch_number,
  ot.box_number,
  ot.order_date,
  ot.order_delivery_date,
  ot.cutting_total,
  ot.cutting_done,
  ot.drilling_total,
  ot.drilling_done,
  ot.border_total,
  ot.border_done,
  ot.packing_total,
  ot.packing_done;