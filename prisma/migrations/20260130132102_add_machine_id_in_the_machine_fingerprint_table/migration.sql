/*
  Warnings:

  - Added the required column `machineId` to the `MachineFingerprint` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MachineFingerprint" ADD COLUMN     "machineId" INTEGER NOT NULL;
