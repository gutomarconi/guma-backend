import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { IItemModel, IMachineModel } from '../types';
import dayjs from 'dayjs';

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

type IItemsV2 = {
	itemId: number; 
	code: string; 
	description: string; 
	barcode: string; 
	machineId: number; 
	status: string; 
	machineDescription: string; 
	readingDate?: string; 
  poId: number;
  order_number: number; 
	batch_number: number; 
	box_number?: number; 
	order_date: string; 
	order_delivery_date: string; 
	order_status: string; 
	load_number: string; 
	cliente: string; 
  has_cutting_po: boolean,
  has_bordering_po: boolean,
  has_drilling_po: boolean,
  has_packaging_po: boolean,
  machineName: string;
  buy_order: string;
  material_cut: string;
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
  const { companyId, startDate, endDate } = req.body;
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
          WHERE "companyId" = ${companyId}
          and delivery_date >= ${startDate}::date and delivery_date <= (${endDate}::date + interval '1 day')
          ;
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
  poID?: number;
  machineId?: number
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

interface IOrderStats {
  cuttingTotal: number,
  drillingTotal: number,
  borderingTotal: number,
  packagingTotal: number,
  cuttingDone: number,
  drillingDone: number,
  borderingDone: number,
  packagingDone: number,
}

export const getOrderDetailsV2 = async (req: Request<{}, {}, GetOrderDetailsBody>, res: Response) => {
  const { startDate, endDate, status, companyId, orderNumber, batchNumber, searchItem, poStatus, loadNumber, poID } = req.body;
    if (!startDate || !endDate || !companyId) {
        return res.status(400).json({ error: 'Date filters are missing' });
    }
    const pos = await prisma.pO.findMany({
        where: {
          companyId: companyId,
        },
      });
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
          has_packaging_po: true,
          buy_order: true,
          material_cut: true,
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

      const machinesById = new Map<number, IMachineModel>(machines.map(m => [m.id, m]));
      const historyByItemPo = new Map();

      for (const h of history) {
        const machine = machinesById.get(h.machineId);
        if (!machine) continue;

        const key = `${h.itemId}_${machine.poId}`;
        historyByItemPo.set(key, h);
      }

      const resultItems = new Map<string, IItemsV2>();
      const orderIds = new Set<number>();

      for (const item of items) {

        for (const machine of machines) {
          const poStatusList = poStatusMap.get(machine.po.id);
          const required =
            (machine.po.description === "Corte" && item.has_cutting_po && poStatusList.length > 0) ||
            (machine.po.description === "Furação" && item.has_drilling_po && poStatusList.length > 0) ||
            (machine.po.description === "Borda" && item.has_bordering_po && poStatusList.length > 0) ||
            (machine.po.description === "Embalagem" && item.has_packaging_po && poStatusList.length > 0);

          if (!required) continue;

          const key = `${item.id}_${machine.poId}`;
          const historyRecord = historyByItemPo.get(key);

          const done = !!historyRecord;
          const readingDate = historyRecord?.readDate;
          const resultKey = `${item.id}_${machine.poId}`;
          const existing = resultItems.get(resultKey);
          orderIds.add(item.order_number);
          if (existing) {
            existing.status = done ? "DONE" : "PENDING";
          } else {
            resultItems.set(resultKey, {
              itemId: item.id,
              code: item.item_code,
              description: item.description,
              barcode: item.barcode,
              machineId: machine.id,
              machineDescription: machine.po.description,
              machineName: machine.description,
              status: done ? "DONE" : "PENDING",
              poId: machine.poId,
              readingDate: readingDate ? readingDate.toISOString() : undefined,
              batch_number: item.batch_number,
              cliente: item.cliente,
              load_number: item.load_number,
              order_date: item.order_date ? item.order_date.toISOString() : undefined,
              order_delivery_date: item.order_delivery_date ? item.order_delivery_date.toISOString() : undefined,
              order_number: item.order_number,
              order_status: '',
              has_cutting_po: item.has_cutting_po,
              has_bordering_po: item.has_bordering_po,
              has_drilling_po: item.has_drilling_po,
              has_packaging_po: item.has_packaging_po,
              buy_order: item.buy_order,
              material_cut: item.material_cut,
            });
            
          }

        }
      }
      const orderStats: Record<string, IOrderStats> = {}
      for (const ri of resultItems.values()) {
        const order = ri.order_number

        if (!orderStats[order]) {
          orderStats[order] = {
            cuttingTotal: 0,
            drillingTotal: 0,
            borderingTotal: 0,
            packagingTotal: 0,
            cuttingDone: 0,
            drillingDone: 0,
            borderingDone: 0,
            packagingDone: 0,
          }
        }

        const stats = orderStats[order]

        switch (ri.machineDescription) {
          case "Corte":
            stats.cuttingTotal++
            if (ri.status === "DONE") stats.cuttingDone++
            break

          case "Furação":
            stats.drillingTotal++
            if (ri.status === "DONE") stats.drillingDone++
            break

          case "Borda":
            stats.borderingTotal++
            if (ri.status === "DONE") stats.borderingDone++
            break

          case "Embalagem":
            stats.packagingTotal++
            if (ri.status === "DONE") stats.packagingDone++
            break
          default:

        }
      }

      const orderStatusMap: Record<number, string> = {}
      for (const order of orderIds.values()) {
        const stats = orderStats[order]
        
        if (!stats) continue

        const cuttingOk = stats.cuttingTotal === stats.cuttingDone
        const drillingOk = stats.drillingTotal === stats.drillingDone
        const borderOk = stats.borderingTotal === stats.borderingDone
        const packingOk = stats.packagingTotal === stats.packagingDone

        orderStatusMap[order] =
          cuttingOk && drillingOk && borderOk && packingOk
            ? "DONE"
            : "PENDING"
      }

      for (const ri of resultItems.values()) {
        ri.order_status = orderStatusMap[ri.order_number]
      }

      const grouped = new Map<string, any>();

      for (const item of resultItems.values()) {
        const key = item.barcode;

        if (!grouped.has(key)) {
          grouped.set(key, {
            barcode: item.barcode,
            code: item.code,
            description: item.description,
            batch_number: item.batch_number,
            cliente: item.cliente,
            load_number: item.load_number,
            order_date: item.order_date,
            order_delivery_date: item.order_delivery_date,
            order_number: item.order_number,
            order_status: item.order_status,
            has_cutting_po: item.has_cutting_po,
            has_bordering_po: item.has_bordering_po,
            has_drilling_po: item.has_drilling_po,
            has_packaging_po: item.has_packaging_po,
            buy_order: item.buy_order,
            material_cut: item.material_cut
          });
        }

        const row = grouped.get(key);
        row[item.machineDescription] = {
          status: item.status,
          machineId: item.machineId,
          machineDescription: item.machineDescription,
          readDate: item.readingDate ?? '',
          machineName: item.machineName
        };
      }
      if (poStatus) {
        for (const item of grouped.values()) {
          for (const po of pos) {
            const poStatusList = poStatusMap.get(po.id);
            if (poStatusList.length === 1) {
              const [filteredStatus] = poStatusList;
              if (item[po.description]?.status !== filteredStatus) {
                grouped.delete(item.barcode)
              }
            }
          }
        }
      }
      res.status(200).json(Array.from(grouped.values()));
    } catch(err:any) {
        console.log(err)
        res.status(500).json({ error: 'Erro ao tentar buscar pedidos' });
    }
};


export const getOrderReadingsByPO = async (req: Request<{}, {}, GetOrderDetailsBody>, res: Response) => {
  const { startDate, endDate, status, companyId, orderNumber, batchNumber, searchItem, poStatus, loadNumber, poID, machineId } = req.body;
    if (!startDate || !endDate || !companyId || !poID) {
        return res.status(400).json({ error: 'Date/po filters are missing' });
    }
    try {
      const items: IItemModel[] = await prisma.item.findMany({
        where: {
          companyId: companyId,
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
          has_packaging_po: true,
          buy_order: true,
          material_cut: true,
        }
      });
      const poStatusMap = poStatusToMap(poStatus ?? {});
      const itemIds = items.map(i => i.id)
      const history = await prisma.itemHistory.findMany({
        where: {
          itemId: { in: itemIds },
          ...(machineId && { machineId: Number(machineId) }),
          readDate: {
            gte: new Date(startDate),
            lte: dayjs(endDate).add(1, 'day').toDate()
          },

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
          ...(machineId && { id: Number(machineId) }),
        },
        include: {
          po: true
        }
      });

      const machinesById = new Map<number, IMachineModel>(machines.map(m => [m.id, m]));
      const historyByItemPo = new Map();

      for (const h of history) {
        const machine = machinesById.get(h.machineId);
        if (!machine) continue;

        const key = `${h.itemId}_${machine.id}`;
        historyByItemPo.set(key, h);
      }

      const resultItems = new Map<string, IItemsV2>();
      const orderIds = new Set<number>();

      for (const item of items) {

        for (const machine of machines) {
          const poStatusList = poStatusMap.get(machine.po.id);

          const required =
            (machine.po.description === "Corte" && item.has_cutting_po && poStatusList.length > 0) ||
            (machine.po.description === "Furação" && item.has_drilling_po && poStatusList.length > 0) ||
            (machine.po.description === "Borda" && item.has_bordering_po && poStatusList.length > 0) ||
            (machine.po.description === "Embalagem" && item.has_packaging_po && poStatusList.length > 0);

          if (!required) continue;

          const key = `${item.id}_${machine.id}`;
          const historyRecord = historyByItemPo.get(key);

          const done = !!historyRecord;
          if (!done) continue;
          const readingDate = historyRecord?.readDate;

          if (poStatus) {
            const poStatusList = poStatusMap.get(machine.po.id);
            if (poStatusList.length === 1) {
              const [filteredStatus] = poStatusList;
              if (filteredStatus === 'DONE' && !done) continue;
              if (filteredStatus === 'PENDING' && done) continue;
            }
          }
          const resultKey = `${item.id}_${machine.id}`;
          const existing = resultItems.get(resultKey);
          orderIds.add(item.order_number);
          if (existing) {
            existing.status = done ? "DONE" : "PENDING";
          } else {
            resultItems.set(resultKey, {
              itemId: item.id,
              code: item.item_code,
              description: item.description,
              barcode: item.barcode,
              machineId: machine.id,
              machineDescription: machine.po.description,
              machineName: machine.description,
              status: done ? "DONE" : "PENDING",
              poId: machine.poId,
              readingDate: readingDate ? readingDate.toISOString() : undefined,
              batch_number: item.batch_number,
              cliente: item.cliente,
              load_number: item.load_number,
              order_date: item.order_date ? item.order_date.toISOString() : undefined,
              order_delivery_date: item.order_delivery_date ? item.order_delivery_date.toISOString() : undefined,
              order_number: item.order_number,
              order_status: '',
              has_cutting_po: machine.po.description === "Corte" && item.has_cutting_po,
              has_bordering_po: machine.po.description === "Borda" && item.has_bordering_po,
              has_drilling_po: machine.po.description === "Furação" && item.has_drilling_po,
              has_packaging_po: machine.po.description === "Embalagem" && item.has_packaging_po,
              buy_order: item.buy_order,
              material_cut: item.material_cut,
            });            
          }
        }
      }
      const orderStats: Record<string, IOrderStats> = {}
      for (const ri of resultItems.values()) {
        const order = ri.order_number

        if (!orderStats[order]) {
          orderStats[order] = {
            cuttingTotal: 0,
            drillingTotal: 0,
            borderingTotal: 0,
            packagingTotal: 0,
            cuttingDone: 0,
            drillingDone: 0,
            borderingDone: 0,
            packagingDone: 0,
          }
        }

        const stats = orderStats[order]

        switch (ri.machineDescription) {
          case "Corte":
            stats.cuttingTotal++
            if (ri.status === "DONE") stats.cuttingDone++
            break

          case "Furação":
            stats.drillingTotal++
            if (ri.status === "DONE") stats.drillingDone++
            break

          case "Borda":
            stats.borderingTotal++
            if (ri.status === "DONE") stats.borderingDone++
            break

          case "Embalagem":
            stats.packagingTotal++
            if (ri.status === "DONE") stats.packagingDone++
            break
          default:

        }
      }

      const orderStatusMap: Record<number, string> = {}
      for (const order of orderIds.values()) {
        const stats = orderStats[order]
        
        if (!stats) continue

        const cuttingOk = stats.cuttingTotal === stats.cuttingDone
        const drillingOk = stats.drillingTotal === stats.drillingDone
        const borderOk = stats.borderingTotal === stats.borderingDone
        const packingOk = stats.packagingTotal === stats.packagingDone

        orderStatusMap[order] =
          cuttingOk && drillingOk && borderOk && packingOk
            ? "DONE"
            : "PENDING"
      }

      for (const ri of resultItems.values()) {
        ri.order_status = orderStatusMap[ri.order_number]
      }

      const grouped = new Map<string, any>();

      for (const item of resultItems.values()) {
        const key = `${item.barcode}_${item.machineId}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            barcode: item.barcode,
            code: item.code,
            description: item.description,
            batch_number: item.batch_number,
            cliente: item.cliente,
            load_number: item.load_number,
            order_date: item.order_date,
            order_delivery_date: item.order_delivery_date,
            order_number: item.order_number,
            order_status: item.order_status,
            has_cutting_po: item.has_cutting_po,
            has_bordering_po: item.has_bordering_po,
            has_drilling_po: item.has_drilling_po,
            has_packaging_po: item.has_packaging_po,
            machineId: item.machineId,
            buy_order: item.buy_order,
            material_cut: item.material_cut,
          });
        }

        const row = grouped.get(key);

        row[item.machineDescription] = {
          status: item.status,
          machineId: item.machineId,
          machineDescription: item.machineDescription,
          readDate: item.readingDate ?? '',
          machineName: item.machineName
        };
      }
      res.status(200).json(Array.from(grouped.values()));
    } catch(err:any) {
        console.log(err)
        res.status(500).json({ error: 'Erro ao tentar buscar pedidos' });
    }
};
