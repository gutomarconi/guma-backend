-- CreateTable
CREATE TABLE "MachineFingerprint" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MachineFingerprint_pkey" PRIMARY KEY ("id")
);
