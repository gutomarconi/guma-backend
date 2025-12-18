-- CreateTable
CREATE TABLE "FileMapping" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "mapping" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileMapping_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
