import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { IItemModel, IMachineModel } from '../types';
import dayjs from 'dayjs';

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
                WHERE items_finished = total_items
              ) AS finished_orders,

              COUNT(*) FILTER (
                WHERE items_started = 0
              ) AS pending_orders,

              COUNT(*) FILTER (
                WHERE items_started > 0
                  AND items_finished < total_items
              ) AS active_orders,

              COUNT(*) FILTER (
                WHERE delivery_date < CURRENT_DATE
                  AND items_finished < total_items
              ) AS late_orders

            FROM "OrderProgress" op
            JOIN "Order" o ON o.id = op.order_id
          WHERE op.company_id = ${companyId}
          and o.order_date >= ${startDate}::date and o.order_date <= (${endDate}::date + interval '1 day')
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

export interface IHistoryMap {
    order_item_id: number;
    machine_id: number;
    read_date: Date;
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
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    try {
      const orderItems = await prisma.orderItem.findMany({
        where: {
          company_id: companyId,
          order: {
            order_date: {
              gte: start,
              lte: end,
            },
            ...(orderNumber && { order_number: Number(orderNumber) }),
            ...(batchNumber && { batch_number: Number(batchNumber) }),
            ...(loadNumber && { load_number: String(loadNumber) }),
          },
          ...(searchItem && {
            OR: [
              { barcode: { contains: searchItem } },
              { product: { item_code: { contains: searchItem } } },
              { product: { description: { contains: searchItem, mode: "insensitive" } } }
            ]
          })
        },
        include: {
          order: true,
          product: true,
        }
      });

      const productIds = orderItems.map(i => i.product_id);

      const routes = await prisma.productRoute.findMany({
        where: {
          product_id: { in: productIds }
        }
      });
      const routesByProduct = new Map<number, number[]>();

      for (const r of routes) {
        if (!routesByProduct.has(r.product_id)) {
          routesByProduct.set(r.product_id, []);
        }
        routesByProduct.get(r.product_id).push(r.po_id);
      }

      const orderItemIds = orderItems.map(i => i.id);

      const history = await prisma.orderItemHistory.findMany({
        where: {
          order_item_id: { in: orderItemIds }
        },
        select: {
          order_item_id: true,
          machine_id: true,
          read_date: true
        }
      });

      const poStatusMap = poStatusToMap(poStatus ?? {});
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
      const historyByItemPo = new Map<string, IHistoryMap>();

      for (const h of history) {
        const machine = machinesById.get(h.machine_id);
        if (!machine) continue;

        const key = `${h.order_item_id}_${machine.poId}`;
        historyByItemPo.set(key, h);
      }

      const resultItems = new Map<string, IItemsV2>();
      const orderIds = new Set<number>();

      for (const orderItem of orderItems) {

        for (const machine of machines) {
          const poStatusList = poStatusMap.get(machine.po.id);
          const productRoutes = routesByProduct.get(orderItem.product_id);
          const required = productRoutes.includes(machine.poId) && poStatusList.length > 0;
          if (!required) continue;

          const key = `${orderItem.id}_${machine.poId}`;
          const historyRecord = historyByItemPo.get(key);

          const done = !!historyRecord;
          const readingDate = historyRecord?.read_date;
          const resultKey = `${orderItem.id}_${machine.poId}`;
          const existing = resultItems.get(resultKey);
          orderIds.add(orderItem.order.order_number);
          if (existing) {
            existing.status = done ? "DONE" : "PENDING";
          } else {
            resultItems.set(resultKey, {
              itemId: orderItem.id,
              code: orderItem.product.item_code,
              description: orderItem.product.description,
              barcode: orderItem.barcode,
              machineId: machine.id,
              machineDescription: machine.po.description,
              machineName: machine.description,
              status: done ? "DONE" : "PENDING",
              poId: machine.poId,
              readingDate: readingDate ? readingDate.toISOString() : undefined,
              batch_number: orderItem.order.batch_number,
              cliente: orderItem.order.customer_name,
              load_number: orderItem.order.load_number,
              order_date: orderItem.order.order_date ? orderItem.order.order_date.toISOString() : undefined,
              order_delivery_date: orderItem.order.delivery_date ? orderItem.order.delivery_date.toISOString() : undefined,
              order_number: orderItem.order.order_number,
              order_status: '',
              has_cutting_po: productRoutes.includes(machine.poId),
              has_bordering_po: productRoutes.includes(machine.poId),
              has_drilling_po: productRoutes.includes(machine.poId),
              has_packaging_po: productRoutes.includes(machine.poId),
              buy_order: orderItem.order.buy_order,
              material_cut: orderItem.product.material_cut,
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
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    try {
      const historytest = await prisma.orderItemHistory.findMany({
        where: {
          machine: {
            poId: poID,
            companyId: companyId,
          },
          read_date: {
            gte: start,
            lte: end,
          },
          orderItem:{
            order: {
              ...(orderNumber && { order_number: Number(orderNumber) }),
              ...(batchNumber && { batch_number: Number(batchNumber) }),
              ...(loadNumber && { load_number: String(loadNumber) }),
            },
            ...(searchItem && {
              OR: [
                { barcode: { contains: searchItem } },
                { product: { item_code: { contains: searchItem } } },
                { product: { description: { contains: searchItem, mode: "insensitive" } } }
              ]
            })
            
          }
        },
        include: {
          orderItem: {
            include: {
              product: true,
              order: true
            }
          },
          machine: {
            include: {
              po: true
            }
          }
        }
      });

      const orderIds = new Set<number>();
      const resultItems = new Map<string, IItemsV2>();
      for (const history of historytest) {
        const resultKey = `${history.order_item_id}_${history.machine.id}`;

        orderIds.add(history.orderItem.order.order_number);
        resultItems.set(resultKey, {
          barcode: history.orderItem.barcode,
          batch_number: history.orderItem.order.batch_number,
          buy_order: history.orderItem.order.buy_order,
          cliente: history.orderItem.order.customer_name,
          code: history.orderItem.product.item_code,
          description: history.orderItem.product.description,
          has_bordering_po: true,
          has_cutting_po: true,
          has_drilling_po: true,
          has_packaging_po: true,
          itemId: history.orderItem.product.id,
          load_number: history.orderItem.order.load_number,
          order_date: history.orderItem.order.order_date.toISOString(),
          order_delivery_date: history.orderItem.order.delivery_date.toISOString(),
          material_cut: history.orderItem.product.material_cut,
          machineDescription: history.machine.po.description,
          machineId: history.machine_id,
          machineName: history.machine.description,
          order_number: history.orderItem.order.order_number,
          order_status: '',
          poId: history.machine.poId,
          status: '',
          box_number: history.orderItem.order.box_mumber,
          readingDate: history.read_date.toISOString()
        })
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
