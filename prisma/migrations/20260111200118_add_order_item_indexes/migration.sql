-- This is an empty migration.-- Item: filtros principais
CREATE INDEX IF NOT EXISTS idx_item_company_date
ON public."Item" ("companyId", order_date);

CREATE INDEX IF NOT EXISTS idx_item_order_batch
ON public."Item" (order_number, batch_number);

CREATE INDEX IF NOT EXISTS idx_item_code_desc_barcode
ON public."Item" (item_code, description, barcode);

-- ItemHistory: lookup por item + machine
CREATE INDEX IF NOT EXISTS idx_itemhistory_item_machine
ON public."ItemHistory" ("itemId", "machineId");
