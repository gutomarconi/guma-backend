/*
  Warnings:

  - You are about to drop the column `empresaId` on the `ApiKey` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `Machine` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `PO` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `nome` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Empresa` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Venda` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `companyId` to the `ApiKey` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Machine` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `PO` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "Venda" DROP CONSTRAINT "Venda_empresaId_fkey";

-- AlterTable
ALTER TABLE "ApiKey" DROP COLUMN "empresaId",
ADD COLUMN     "companyId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Machine" DROP COLUMN "empresaId",
ADD COLUMN     "companyId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PO" DROP COLUMN "empresaId",
ADD COLUMN     "companyId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "empresaId",
DROP COLUMN "nome",
ADD COLUMN     "companyId" INTEGER,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '';

-- DropTable
DROP TABLE "Empresa";

-- DropTable
DROP TABLE "Venda";

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
