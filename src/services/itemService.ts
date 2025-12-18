import { prisma } from "../prisma";

export const getItemByBarcode = async (barcode: string) => {
  const where = { barcode: barcode };

  return await prisma.item.findFirst({
    where,
    orderBy: { id: 'desc' },
  }); 
};

export default {
    getItemByBarcode
}