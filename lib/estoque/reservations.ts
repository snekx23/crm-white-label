export function availableStock(
  stockQuantity: number,
  reservations: Array<{ quantity: number; status: string }>,
) {
  return stockQuantity - reservations
    .filter((reservation) => reservation.status === "active")
    .reduce((sum, reservation) => sum + reservation.quantity, 0);
}

export function assertReservationFits(available: number, requested: number) {
  if (requested <= 0) throw new Error("Quantidade invalida");
  if (requested > available) throw new Error("Estoque insuficiente");
}
