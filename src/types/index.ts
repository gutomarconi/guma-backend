export interface ICreateItemBody {
  NroPedido: string;
  NroLote: string;
  Carga: string;
  Box: string;
  Peca: string;
  Descricao: string;
  Quantidade: number;
  OrdemCompra: string;
  Corte?: string;
  Borda?: string;
  Furacao?: string;
  Embalagem?: string;
  CodigoBarras: string;
  DataEntrega?: string;
  DataEmissao?: string;
  MetroCubico?: number;
  MetroLinear?: number;
  MetroQuadrado?: number;
  MaterialCorte?: string;
  MaterialBorda?: string;
  Cliente?: string;
  Planejador?: string;
  ClienteCNPJ?: string;
}

export interface ICreateItemHistory {
  barcode: string;
  machineId: string;
  readDate: string;
}

export interface IItemModel {
  id: number,
  item_code: string,
  description: string,
  barcode: string,
  order_number: number,
  batch_number: number,
  box_number: number | null,
  order_date: Date,
  order_delivery_date: Date,
  cliente: string,
  load_number: string,
  has_cutting_po: boolean,
  has_drilling_po: boolean,
  has_bordering_po: boolean,
  has_packaging_po: boolean
  buy_order: string;
  material_cut: string;
}

export enum ICapacityUnity {
  UN = 'UN',
  M2 = 'M2',
  M3 = 'M3',
  M = 'M'
}

export interface IMachineModel {
  id: number;
  companyId: number;
  description: string;
  createdAt: Date
  poId: number
  capacity: number
  capacity_unity: string,
  unity_cost: number;
  po: IPOModel
}

export interface IPOModel {
  id: number;
  description: string;
}

export enum ReadingType {
  Retrabalho = 'Retrabalho',
  Refugo = 'Refugo',
  Normal = 'Normal',
  Outro = 'Outro'
}

export interface IOrderItemHistoryModel {
  company_id: number;
  order_item_id: number;
  product_id: number
  po_id: number
  machine_id: number
  read_date: string
  reading_type: ReadingType
}