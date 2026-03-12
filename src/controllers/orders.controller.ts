import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { number } from 'zod';
import { IItemModel } from '../types';

type IOrderDetails = {
	company_id: number; 
	order_number: number; 
	batch_number: number; 
	box_number?: number; 
	order_date: string; 
	order_delivery_date: string; 
	cutting_total: number; 
	cutting_done: number; 
	drilling_total: number; 
	drilling_done: number; 
	border_total: number; 
	border_done: number; 
	packing_total: number; 
	packing_done: number; 
	order_status: string; 
	items: Array<IItems>; 
	load_number: string; 
	cliente: string; 
}

type IItems = {
	itemId: number; 
	code: string; 
	description: string; 
	barcode: string; 
	machineId: number; 
	status: string; 
	machineDescription: string; 
	readingDate?: string; 
  poId: number;
}

// import dayjs from 'dayjs';
/**
 * @swagger
 * tags:
 *   name: Items
 */
export const getOrdersTotals = async (req: Request, res: Response) => {
  const { companyId, barcode, order_number } = req.query;
  const where = {
    companyId: Number(companyId),
    ...(barcode ? { barcode: { contains: barcode as string } } : {}),
    ...(order_number ? { order_number: Number(order_number) } : {}),
  }

  const items = await prisma.item.findMany({
    where,
    // include: { itemHistory: { include: { machine: true } } },
    orderBy: { order_date: 'desc' },
  });
  res.json(items);
};

export const getOrdersSummary = async (req: Request, res: Response) => {
  const { companyId } = req.body;
    if (!companyId) {
        return res.status(400).json({ error: 'Company id missing' });
    }
      try {
        const result = await prisma.$queryRaw`
            SELECT
            COUNT(*) AS total_orders,

            COUNT(*) FILTER (
              WHERE items_done = total_items
            ) AS finished_orders,

            COUNT(*) FILTER (
              WHERE items_done = 0
            ) AS pending_orders,

            COUNT(*) FILTER (
              WHERE items_done > 0
                AND items_done < total_items
            ) AS active_orders,

            COUNT(*) FILTER (
              WHERE delivery_date < CURRENT_DATE
                AND items_done < total_items
            ) AS late_orders

          FROM "OrderStats"
          WHERE "companyId" = ${companyId};
        `;
        const parsed: any[] = JSON.parse(
          JSON.stringify(result, (_, value) =>
            typeof value === 'bigint' ? Number(value) : value
          )
        );
        res.status(200).json(parsed.length > 0 ? parsed[0] : {});
    } catch(err:any) {
        console.log(err)
        res.status(500).json({ error: 'Erro ao tentar buscar summary ' });
    }

}

type GetOrderDetailsBody = {
  startDate: string;
  endDate: string;
  companyId: number;
  loadNumber?: number;
  orderNumber?: number;
  batchNumber?: number;
  status?: string[];
  searchItem?: string;
  poStatus?: Record<string, string[]>;
  poID?: number
};


const poStatusToMap = (
  poStatus?: Record<string, string[]>
): Map<number, string[]> => {
  const map = new Map<number, string[]>();

  if (!poStatus) return map;

  for (const [key, value] of Object.entries(poStatus)) {
    const numericKey = Number(key);

    if (!Number.isNaN(numericKey)) {
      map.set(numericKey, value);
    }
  }

  return map;
};

function aggregateOrders(
  items: IItemModel[],
  resultItems: IItems[],
  companyId: number,
  orderStatusFilter?: string,
): IOrderDetails[] {
  const orders = new Map<string, IOrderDetails>()

  const itemMap = new Map<number, IItemModel>()
  for (const item of items) {
    itemMap.set(item.id, item)
  }

  for (const ri of resultItems) {
    const item = itemMap.get(ri.itemId)
    
    const key =
      `${item.order_number}_${item.batch_number}_${item.load_number}`

    if (!orders.has(key)) {

      orders.set(key, {
        company_id: companyId,
        order_number: item.order_number,
        batch_number: item.batch_number,
        box_number: item.box_number ?? undefined,
        order_date: item.order_date.toISOString(),
        order_delivery_date: item.order_delivery_date.toISOString(),
        cutting_total: 0,
        cutting_done: 0,
        drilling_total: 0,
        drilling_done: 0,
        border_total: 0,
        border_done: 0,
        packing_total: 0,
        packing_done: 0,
        order_status: "PENDING",
        items: [],
        load_number: item.load_number,
        cliente: item.cliente
      })

    }

    const order = orders.get(key)
    order.items.push(ri)

    switch (ri.machineDescription) {

      case "Corte":
        order.cutting_total++
        if (ri.status === "DONE") order.cutting_done++
        break

      case "Furação":
        order.drilling_total++
        if (ri.status === "DONE") order.drilling_done++
        break

      case "Borda":
        order.border_total++
        if (ri.status === "DONE") order.border_done++
        break

      case "Embalagem":
        order.packing_total++
        if (ri.status === "DONE") order.packing_done++
        break
    }
  }

  for (const order of orders.values()) {

    const cuttingOk =
      order.cutting_total === order.cutting_done

    const drillingOk =
      order.drilling_total === order.drilling_done

    const borderOk =
      order.border_total === order.border_done

    const packingOk =
      order.packing_total === order.packing_done

    order.order_status =
      cuttingOk &&
      drillingOk &&
      borderOk &&
      packingOk
        ? "DONE"
        : "PENDING"
  }

  return orderStatusFilter ? Array.from(orders.values()).filter(order => order.order_status === orderStatusFilter) : Array.from(orders.values())
}

export const getOrderDetails = async (req: Request<{}, {}, GetOrderDetailsBody>, res: Response) => {
  const { startDate, endDate, status, companyId, orderNumber, batchNumber, searchItem, poStatus, loadNumber, poID } = req.body;
    if (!startDate || !endDate || !companyId) {
        return res.status(400).json({ error: 'Date filters are missing' });
    }

    try {
      const items: IItemModel[] = await prisma.item.findMany({
        where: {
          companyId: companyId,
          order_date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          },
          ...(orderNumber && { order_number: Number(orderNumber) }),
          ...(batchNumber && { batch_number: Number(batchNumber) }),
          ...(loadNumber && { load_number: String(loadNumber) }),
          ...(searchItem && {
            OR: [
              { barcode: { contains: searchItem } },
              { item_code: { contains: searchItem } },
              { description: { contains: searchItem, mode: "insensitive" } }
            ]
          })
        },
        select: {
          id: true,
          item_code: true,
          description: true,
          barcode: true,
          order_number: true,
          batch_number: true,
          box_number: true,
          order_date: true,
          order_delivery_date: true,
          cliente: true,
          load_number: true,
          has_cutting_po: true,
          has_drilling_po: true,
          has_bordering_po: true,
          has_packaging_po: true
        }
      });
      const poStatusMap = poStatusToMap(poStatus ?? {});
      const itemIds = items.map(i => i.id)

      const history = await prisma.itemHistory.findMany({
        where: {
          itemId: { in: itemIds }
        },
        select: {
          itemId: true,
          machineId: true,
          readDate: true
        }
      });

      const machines = await prisma.machine.findMany({
        where: {
          companyId: companyId,
          ...(poID && { poId: poID }),
        },
        include: {
          po: true
        }
      });

      const historyMap = new Map<string, boolean>();
      for (const h of history) {
        historyMap.set(`${h.itemId}_${h.machineId}`, true);
      }

      const resultItems: IItems[] = [];

      for (const item of items) {

        for (const machine of machines) {

          const required =
            (machine.po.description === "Corte" && item.has_cutting_po) ||
            (machine.po.description === "Furação" && item.has_drilling_po) ||
            (machine.po.description === "Borda" && item.has_bordering_po) ||
            (machine.po.description === "Embalagem" && item.has_packaging_po);

          if (!required) continue;

          const key = `${item.id}_${machine.id}`;

          const done =
            historyMap.has(key) ||
            history.some(h =>
              h.itemId === item.id &&
              machines.find(m => m.id === h.machineId)?.poId === machine.poId
            );

          if (poStatus) {
            const poStatusList = poStatusMap.get(machine.po.id);
            if (poStatusList.length === 1) {
              const [filteredStatus] = poStatusList;
              if (filteredStatus === 'DONE' && !done) continue;
              if (filteredStatus === 'PENDING' && done) continue;
            }
          }
          const indexOfItem = resultItems.findIndex(resultItem => resultItem.itemId === item.id && resultItem.poId === machine.poId);
          if (indexOfItem === -1) {
            resultItems.push({
              itemId: item.id,
              code: item.item_code,
              description: item.description,
              barcode: item.barcode,
              machineId: machine.id,
              machineDescription: machine.po.description,
              status: done ? "DONE" : "PENDING",
              poId: machine.poId
            });
          } else {
            resultItems[indexOfItem] = {
              ...resultItems[indexOfItem],
              status: done ? "DONE" : "PENDING"
            }
          }

        }
      }

      const response = aggregateOrders(
        items,
        resultItems,
        companyId,
        status?.length === 1 ? status[0] : undefined
      )
      
      res.status(200).json(response);
    } catch(err:any) {
        console.log(err)
        res.status(500).json({ error: 'Erro ao tentar buscar pedidos' });
    }
};

export const getActiveOrders = async (req: Request<{}, {}, GetOrderDetailsBody>, res: Response) => {
    const { companyId } = req.body;
    if (!companyId) {
        return res.status(400).json({ error: 'companyId is missing' });
    }

        try {
      const items: Partial<IItemModel>[] = await prisma.item.findMany({
        where: {
          companyId: companyId,
        },
        select: {
          id: true,
          order_number: true,
          has_cutting_po: true,
          has_drilling_po: true,
          has_bordering_po: true,
          has_packaging_po: true
        }
      });
      const itemIds = items.map(i => i.id)

      const history = await prisma.itemHistory.findMany({
        where: {
          itemId: { in: itemIds }
        },
        select: {
          itemId: true,
          machineId: true,
        }
      });

      const machines = await prisma.machine.findMany({
        where: {
          companyId: companyId,
        },
        include: {
          po: true
        }
      });

      const historyMap = new Map<string, boolean>();
      for (const h of history) {
        historyMap.set(`${h.itemId}_${h.machineId}`, true);
      }

      const resultItems: IItems[] = [];
      const ordersMap = new Set();

      for (const item of items) {

        for (const machine of machines) {

        const required =
          (machine.po.description === "Corte" && item.has_cutting_po) ||
          (machine.po.description === "Furação" && item.has_drilling_po) ||
          (machine.po.description === "Borda" && item.has_bordering_po) ||
          (machine.po.description === "Embalagem" && item.has_packaging_po);

        if (!required) continue;

        const key = `${item.id}_${machine.id}`;

        const done =
          historyMap.has(key) ||
          history.some(h =>
            h.itemId === item.id &&
            machines.find(m => m.id === h.machineId)?.poId === machine.poId
          );

          if (!done) {
            ordersMap.add(item.order_number);
          }
        }
      }

      res.status(200).json(ordersMap.size);
    } catch(err:any) {
        console.log(err)
        res.status(500).json({ error: 'Erro ao tentar buscar pedidos' });
    }


}
