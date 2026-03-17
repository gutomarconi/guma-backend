/*
  Warnings:

  - Changed the type of `userId` on the `PasswordResetToken` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "PasswordResetToken" DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL;
