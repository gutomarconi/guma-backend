-- CreateEnum
CREATE TYPE "CapacityUnity" AS ENUM ('M2', 'UN');

-- CreateTable
CREATE TABLE "PO" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "poId" INTEGER NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "capacity_unity" "CapacityUnity" NOT NULL DEFAULT 'M2',
    "unity_cost" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);
