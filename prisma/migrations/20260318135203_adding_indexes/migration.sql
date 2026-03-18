-- CreateIndex
CREATE INDEX "idx_machine_id" ON "Machine"("id");

-- CreateIndex
CREATE INDEX "idx_po_id" ON "PO"("id");

-- CreateIndex
CREATE INDEX "idx_user_id" ON "User"("id");

-- CreateIndex
CREATE INDEX "idx_po_companyid" ON "User"("companyId");
