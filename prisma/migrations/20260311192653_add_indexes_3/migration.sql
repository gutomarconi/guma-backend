-- CreateIndex
CREATE INDEX "idx_item_company_orderdate_ordernumber" ON "Item"("companyId", "order_date", "order_number");

-- CreateIndex
CREATE INDEX "idx_itemhistory_item_machine" ON "ItemHistory"("itemId", "machineId");

-- CreateIndex
CREATE INDEX "idx_machine_poid" ON "Machine"("poId");
