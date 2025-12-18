/*
  Warnings:

  - Added the required column `buy_order` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `has_bordering_po` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `has_cutting_po` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `has_drilling_po` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `has_packaging_po` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `item_code` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `load_number` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_delivery_date` to the `Item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "buy_order" TEXT NOT NULL,
ADD COLUMN     "has_bordering_po" BOOLEAN NOT NULL,
ADD COLUMN     "has_cutting_po" BOOLEAN NOT NULL,
ADD COLUMN     "has_drilling_po" BOOLEAN NOT NULL,
ADD COLUMN     "has_packaging_po" BOOLEAN NOT NULL,
ADD COLUMN     "item_code" TEXT NOT NULL,
ADD COLUMN     "load_number" TEXT NOT NULL,
ADD COLUMN     "order_delivery_date" TIMESTAMP(3) NOT NULL;
