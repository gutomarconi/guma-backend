-- CreateTable
CREATE TABLE "ItemHistoryFailed" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "machineId" INTEGER NOT NULL,
    "barcode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemHistoryFailed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_itemhistoryfailed_company_machine" ON "ItemHistoryFailed"("companyId", "machineId");
