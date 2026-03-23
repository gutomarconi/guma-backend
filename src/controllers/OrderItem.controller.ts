import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { updateItemSchema } from '../schemas/item.schema';
import { ICreateItemBody } from '../types';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } 
  from '@prisma/client/runtime/library';
import { parseDateDDMMYYYY } from '../utils/dates';
/**
 * @swagger
 * tags:
 *   name: Items
 */
export const getOrderItems = async (req: Request, res: Response) => {
  const { companyId, order_number } = req.query;
  const where = {
    company_id: Number(companyId),
    ...(order_number ? { order_number: Number(order_number) } : {}),
  }

  const items = await prisma.orderItem.findMany({
    where,
  });
  res.json(items);
};

export const createOrderItem = async (req: Request, res: Response) => {
  try {
    const item: ICreateItemBody = req.body;

    if (!item.NroPedido || !item.Peca || !item.CodigoBarras) {
      return res.status(400).json({
        message: 'Campos obrigatórios ausentes em um ou mais itens',
      });
    }

    let order = await prisma.order.findFirst({ where: { order_number: Number(item.NroPedido) }})
    if (!order) {
        order = await prisma.order.create({
            data: {
                order_number: Number(item.NroPedido),
                batch_number: Number(item.NroLote),
                load_number: item.Carga,
                buy_order: item.OrdemCompra,
                company_id: req.user?.companyId ?? 1,
                delivery_date: parseDateDDMMYYYY(item.DataEntrega ?? ''),
                order_date: parseDateDDMMYYYY(item.DataEmissao ?? ''),
                customer_name: item.Cliente,
                box_mumber: Number(item.Box),
            },
        })
    }
    let product = await prisma.product.findFirst({ where: { item_code: item.Peca }})
    if (!product) {
        product = await prisma.product.create({
            data: {
                item_code: item.Peca,
                description: item.Descricao,
                company_id: req.user?.companyId ?? 999999,
                cubic_meter: item.MetroCubico,
                linear_meter: item.MetroLinear,
                square_meter: item.MetroQuadrado,
                material_cut: item.MaterialCorte,
                material_border: item.MaterialBorda,
            }
        });
    }
    if (item.Corte === '1' && !await prisma.productRoute.findFirst({ where: { po_id: 1, product_id: product.id }})) {
            await prisma.productRoute.create({
                data: {
                    sequence: 1,
                    po_id: 1,
                    product_id: product.id,
                }
            })
        }
        if (item.Borda === '1' && !await prisma.productRoute.findFirst({ where: { po_id: 2, product_id: product.id }})) {
            await prisma.productRoute.create({
                data: {
                    sequence: 2,
                    po_id: 2,
                    product_id: product.id,
                }
            })
        }
        if (item.Furacao === '1' && !await prisma.productRoute.findFirst({ where: { po_id: 3, product_id: product.id }})) {
            await prisma.productRoute.create({
                data: {
                    sequence: 3,
                    po_id: 3,
                    product_id: product.id,
                }
            })
        }
        if (item.Embalagem === '1' && !await prisma.productRoute.findFirst({ where: { po_id: 4, product_id: product.id }})) {
            await prisma.productRoute.create({
                data: {
                    sequence: 4,
                    po_id: 4,
                    product_id: product.id,
                }
            })
        }

    if (product && order) {
        await prisma.orderItem.create({
            data: {
                order_id: order.id,
                product_id: product.id,
                quantity: item.Quantidade,
                barcode: item.CodigoBarras,
                company_id: req.user.companyId,
            }
        });
        await prisma.orderProgress.upsert({
            where: { order_id: order.id },
            update: {
                total_items: { increment: 1 },
                cutting_total: item.Corte === '1' ? { increment: 1 } : undefined,
                drilling_total: item.Furacao === '1' ? { increment: 1 } : undefined,
                border_total: item.Borda === '1' ? { increment: 1 } : undefined,
                packaging_total: item.Embalagem === '1' ? { increment: 1 } : undefined,
            },
            create: {
                order_id: order.id,
                company_id: req.user.companyId,
                total_items: 1,
                cutting_total: item.Corte === '1' ? 1 : 0,
                drilling_total: item.Furacao === '1' ? 1 : 0,
                border_total: item.Borda === '1' ? 1 : 0,
                packaging_total: item.Embalagem === '1' ? 1 : 0,
            }
            });
    } 


    return res.status(201).json({
      message: 'Itens criados com sucesso',
      insertedCount: 1,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Erro ao criar os itens',
    });
  }
};

export const createOrderItems = async (req: Request, res: Response) => {
  try {
    const items: ICreateItemBody[] = req.body;
    const companyId = req.user.companyId;

    // validação básica
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'O body deve ser um array com ao menos um item',
      });
    }

    if (items.length > 300) {
      throw new Error("Maximum 300 items per request")
    }

    // opcional: validação mínima de campos obrigatórios
    for (const item of items) {
      if (!item.NroPedido || !item.Peca || !item.CodigoBarras) {
        return res.status(400).json({
          message: 'Campos obrigatórios ausentes em um ou mais itens',
        });
      }
    }
    const ordersMap = new Map();

    for (const item of items) {
        const key = `${companyId}_${item.NroPedido}`;
        if (!ordersMap.has(key)) {
            ordersMap.set(key, {
            company_id: companyId,
            order_number: Number(item.NroPedido),
            batch_number: Number(item.NroLote),
            load_number: item.Carga,
            buy_order: item.OrdemCompra,
            delivery_date: parseDateDDMMYYYY(item.DataEntrega),
            order_date: parseDateDDMMYYYY(item.DataEmissao),
            customer_name: item.Cliente,
            box_mumber: Number(item.Box),
            });
        }
    }

    const ordersToCreate = Array.from(ordersMap.values());

    const productsMap = new Map();

    for (const item of items) {
        const key = `${companyId}_${item.Peca}`;
        if (!productsMap.has(key)) {
            productsMap.set(key, {
            company_id: companyId,
            item_code: item.Peca,
            description: item.Descricao,
            cubic_meter: item.MetroCubico ?? 0,
            linear_meter: item.MetroLinear ?? 0,
            square_meter: item.MetroQuadrado ?? 0,
            material_cut: item.MaterialCorte ?? '',
            material_border: item.MaterialBorda ?? '',
            });
        }
    }

    const productsToCreate = Array.from(productsMap.values());

    await prisma.order.createMany({
        data: ordersToCreate,
        skipDuplicates: true,
    });

    await prisma.product.createMany({
        data: productsToCreate,
        skipDuplicates: true,
    });

    const orders = await prisma.order.findMany({
        where: {
            company_id: companyId,
            order_number: { in: items.map(i => Number(i.NroPedido)) }
        }
    });

    const products = await prisma.product.findMany({
        where: {
            company_id: companyId,
            item_code: { in: items.map(i => i.Peca) }
        }
    });

    const orderMap = new Map(orders.map(o => [o.order_number, o.id]));
    const productMap = new Map(products.map(p => [p.item_code, p.id]));

    const routes = [];

    for (const item of items) {
        const productId = productMap.get(item.Peca);

        if (item.Corte === '1') {
            routes.push({ product_id: productId, po_id: 1, sequence: 1 });
        }
        if (item.Borda === '1') {
            routes.push({ product_id: productId, po_id: 2, sequence: 2 });
        }
        if (item.Furacao === '1') {
            routes.push({ product_id: productId, po_id: 3, sequence: 3 });
        }
        if (item.Embalagem === '1') {
            routes.push({ product_id: productId, po_id: 4, sequence: 4 });
        }
    }

    await prisma.productRoute.createMany({
        data: routes,
        skipDuplicates: true,
    });

    const orderItems = items.map(item => ({
        company_id: companyId,
        order_id: orderMap.get(Number(item.NroPedido)),
        product_id: productMap.get(item.Peca),
        barcode: item.CodigoBarras,
        quantity: item.Quantidade,
    }));

    await prisma.orderItem.createMany({
        data: orderItems,
        skipDuplicates: true,
    });

    const routesByProduct = new Map<number, number[]>();

    for (const r of routes) {
        if (!routesByProduct.has(r.product_id)) {
            routesByProduct.set(r.product_id, []);
        }
        routesByProduct.get(r.product_id).push(r.po_id);
    }

    type ProgressAgg = {
        total_items: number;
        cutting_total: number;
        drilling_total: number;
        border_total: number;
        packaging_total: number;
    };

    const progressMap = new Map<number, ProgressAgg>();

    for (const item of items) {
        const orderId = orderMap.get(Number(item.NroPedido));
        const productId = productMap.get(item.Peca);
        const routes = routesByProduct.get(productId) || [];

        if (!progressMap.has(orderId)) {
            progressMap.set(orderId, {
            total_items: 0,
            cutting_total: 0,
            drilling_total: 0,
            border_total: 0,
            packaging_total: 0,
            });
        }

        const agg = progressMap.get(orderId);

        agg.total_items += 1;

        if (routes.includes(1)) agg.cutting_total += 1;
        if (routes.includes(2)) agg.border_total += 1;
        if (routes.includes(3)) agg.drilling_total += 1;
        if (routes.includes(4)) agg.packaging_total += 1;
    }

    await prisma.$transaction(
        Array.from(progressMap.entries()).map(([orderId, agg]) =>
            prisma.orderProgress.upsert({
            where: { order_id: orderId },
            update: {
                total_items: { increment: agg.total_items },
                cutting_total: { increment: agg.cutting_total },
                drilling_total: { increment: agg.drilling_total },
                border_total: { increment: agg.border_total },
                packaging_total: { increment: agg.packaging_total },
            },
            create: {
                order_id: orderId,
                company_id: companyId,
                total_items: agg.total_items,
                cutting_total: agg.cutting_total,
                drilling_total: agg.drilling_total,
                border_total: agg.border_total,
                packaging_total: agg.packaging_total,
            },
            })
        )
    );

    return res.status(201).json({
      message: 'Itens criados com sucesso',
      insertedCount: orderItems.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Erro ao criar os itens',
    });
  }
}
