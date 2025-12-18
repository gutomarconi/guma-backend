export function parseDateDDMMYYYY(value: string): Date {
  const [day, month, year] = value.split('/').map(Number);

  // validação básica
  if (
    !day || !month || !year ||
    day < 1 || day > 31 ||
    month < 1 || month > 12
  ) {
    throw new Error('Data inválida');
  }

  // mês no JS começa em 0
  return new Date(year, month - 1, day);
}