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
export const getItems = async (req: Request, res: Response) => {
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

export const createItem = async (req: Request, res: Response) => {
  try {
    const item: ICreateItemBody = req.body;

    if (!item.NroPedido || !item.Peca || !item.CodigoBarras) {
      return res.status(400).json({
        message: 'Campos obrigatórios ausentes em um ou mais itens',
      });
    }

    await prisma.item.create({
      data: {
        order_number: Number(item.NroPedido),
        batch_number: Number(item.NroLote),
        load_number: item.Carga,
        item_code: item.Peca,
        description: item.Descricao,
        quantity: item.Quantidade,
        buy_order: item.OrdemCompra,
        has_cutting_po: item.Corte === '1',
        has_bordering_po: item.Borda === '1',
        has_drilling_po: item.Furacao === '1',
        has_packaging_po: item.Embalagem === '1',
        barcode: item.CodigoBarras,
        rawData: '',
        companyId: req.user?.companyId ?? 1,
        order_delivery_date: parseDateDDMMYYYY(item.DataEntrega ?? ''),
        order_date: parseDateDDMMYYYY(item.DataEmissao ?? ''),
        cubic_meter: item.MetroCubico,
        linear_meter: item.MetroLinear,
        square_meter: item.MetroQuadrado,
        material_cut: item.MaterialCorte,
        material_border: item.MaterialBorda
      }
    });

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

export const createItems = async (req: Request, res: Response) => {
  try {
    const items: ICreateItemBody[] = req.body;

    // validação básica
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'O body deve ser um array com ao menos um item',
      });
    }

    // opcional: validação mínima de campos obrigatórios
    for (const item of items) {
      if (!item.NroPedido || !item.Peca || !item.CodigoBarras) {
        return res.status(400).json({
          message: 'Campos obrigatórios ausentes em um ou mais itens',
        });
      }
    }

    // cria todos os registros de uma vez
    const result = await prisma.item.createMany({
      data: items.map(item => ({
        order_number: Number(item.NroPedido),
        batch_number: Number(item.NroLote),
        load_number: item.Carga,
        item_code: item.Peca,
        description: item.Descricao,
        quantity: item.Quantidade,
        buy_order: item.OrdemCompra,
        has_cutting_po: item.Corte === '1',
        has_bordering_po: item.Borda === '1',
        has_drilling_po: item.Furacao === '1',
        has_packaging_po: item.Embalagem === '1',
        barcode: item.CodigoBarras,
        order_delivery_date: parseDateDDMMYYYY(item.DataEntrega ?? ''),
        order_date: parseDateDDMMYYYY(item.DataEmissao ?? ''),
        rawData: '',
        companyId: req.user?.companyId ?? 999999,
        cubic_meter: item.MetroCubico,
        linear_meter: item.MetroLinear,
        square_meter: item.MetroQuadrado,
        material_cut: item.MaterialCorte,
        material_border: item.MaterialBorda
      })),
      skipDuplicates: true,
    });

    return res.status(201).json({
      message: 'Itens criados com sucesso',
      insertedCount: result.count,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Erro ao criar os itens',
    });
  }
}

export const updateItem = async (req: Request, res: Response) => {
  const { id } = req.params;

  // 1. Validação
  const result = updateItemSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: 'Dados inválidos',
      errors: result.error.flatten(),
    });
  }

  try {
    // 2. Update
    const item = await prisma.item.update({
      where: { id: Number(id) },
      data: result.data,
    });

    return res.json(item);
  } catch (error: unknown) {
    // 3. Tratamento correto de erro do Prisma
    if (error instanceof PrismaClientKnownRequestError) {
      // if (error.code === 'P2025') {
        return res.status(404).json({
          message: 'Item não encontrado',
        });
      // }
    }

    console.error(error);
    return res.status(500).json({
      message: 'Erro ao atualizar item',
    });
  }
};