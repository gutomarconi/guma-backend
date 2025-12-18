export interface ICreateItemBody {
  NroPedido: string;
  NroLote: string;
  Carga: string;
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
}