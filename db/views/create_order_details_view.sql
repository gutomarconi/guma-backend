CREATE OR REPLACE VIEW public.vw_order_machine_detail AS
WITH item_machine AS (
  SELECT
    i.id AS item_id,
    i.item_code AS item_code,
    i.description AS item_description,
    i.barcode,
    i.has_cutting_po,
    i.has_drilling_po,
    i.has_bordering_po,
    i.has_packaging_po,

    i.order_number,
    i.batch_number,
    i.box_number,
    i.order_date,
    i.order_delivery_date,
    i."companyId" AS company_id,

    m.id as machine_id,

    CASE
      WHEN ih.id IS NOT NULL THEN 'DONE'
      ELSE 'PENDING'
    END AS machine_status

  FROM public."Item" i

  JOIN "Machine" m
    ON m."companyId" = i."companyId"

  JOIN "PO" p
    ON p.id = m."poId"
   AND p.description IN ('Corte','Borda','Furação','Embalagem')

  LEFT JOIN public."ItemHistory" ih
    ON ih."itemId" = i.id
   AND ih."machineId" = machine_id
),

order_totals AS (
  SELECT
    company_id,
    order_number,
    batch_number,
    box_number,
    order_date,
    order_delivery_date,

    COUNT(*) FILTER (WHERE machine_id = 1 and has_cutting_po = true) AS cutting_total,
    COUNT(*) FILTER (WHERE machine_id = 1 and has_cutting_po = true AND machine_status = 'DONE') AS cutting_done,

    COUNT(*) FILTER (WHERE machine_id = 2 and has_drilling_po = true) AS drilling_total,
    COUNT(*) FILTER (WHERE machine_id = 2 and has_drilling_po = true AND machine_status = 'DONE') AS drilling_done,

    COUNT(*) FILTER (WHERE machine_id = 3 and has_bordering_po = true) AS border_total,
    COUNT(*) FILTER (WHERE machine_id = 3 and has_bordering_po = true AND machine_status = 'DONE') AS border_done,

    COUNT(*) FILTER (WHERE machine_id = 4 and has_packaging_po = true) AS packing_total,
    COUNT(*) FILTER (WHERE machine_id = 4 and has_packaging_po = true AND machine_status = 'DONE') AS packing_done
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