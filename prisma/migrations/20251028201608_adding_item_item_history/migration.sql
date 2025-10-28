-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "order_number" INTEGER NOT NULL,
    "batch_number" INTEGER NOT NULL,
    "box_number" INTEGER,
    "barcode" TEXT NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemHistory" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "machineId" INTEGER NOT NULL,

    CONSTRAINT "ItemHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ItemHistory" ADD CONSTRAINT "ItemHistory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
