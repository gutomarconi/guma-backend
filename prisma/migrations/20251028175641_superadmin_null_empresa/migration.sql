-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_empresaId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "empresaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
