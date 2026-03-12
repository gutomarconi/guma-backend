-- CreateTable
CREATE TABLE "OrderStats" (
    "order_number" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "delivery_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_items" INTEGER NOT NULL,
    "items_done" INTEGER NOT NULL,
    "first_read_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStats_pkey" PRIMARY KEY ("companyId","order_number")
);

-- CreateIndex
CREATE INDEX "idx_order_stats_company" ON "OrderStats"("companyId");
