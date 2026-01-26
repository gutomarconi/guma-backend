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
  CubicMeter?: number;
  LinearMeter?: number;
  SquareMeter?: number;
  MaterialCut?: string;
  MaterialBorder?: string;
}

export interface ICreateItemHistory {
  barcode: string;
  machineId: string;
}
