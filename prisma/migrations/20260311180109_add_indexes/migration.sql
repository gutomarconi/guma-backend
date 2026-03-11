CREATE INDEX IF NOT EXISTS idx_item_company_orderdate_ordernumber
ON "Item" ("companyId", order_date, order_number);

CREATE INDEX IF NOT EXISTS idx_itemhistory_item_machine
ON "ItemHistory" ("itemId", "machineId");

CREATE INDEX IF NOT EXISTS idx_machine_poid
ON "Machine" ("poId");