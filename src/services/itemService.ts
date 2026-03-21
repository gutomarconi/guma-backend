import { prisma } from "../prisma";

export const getOrderItemByBarcode = async (barcode: string) => {
  const where = { barcode: barcode };

  return await prisma.orderItem.findFirst({
    where,
    orderBy: { id: 'desc' },
  }); 
};
export default {
    getOrderItemByBarcode
}