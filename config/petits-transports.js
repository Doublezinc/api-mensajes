// Configuración de los "Petits transports" (servicio de lunes y martes con tarifa fija).
// Los valores pueden ajustarse sin tocar la lógica de reservas.
module.exports = {
  timezone: 'America/Montreal',
  currency: 'CAD',
  // Días de la semana habilitados (0 = domingo, 1 = lunes, 2 = martes)
  weekdays: [1, 2],
  // Créneaux por día. Se deja margen entre servicios para desplazamiento, carga y descarga.
  slots: ['08:00', '10:30', '13:00', '15:30'],
  slotDurationMinutes: 120,
  // Precio de base (« à partir de ») según la cantidad de artículos (impuestos no incluidos)
  prices: { 1: 120, 2: 150, 3: 180 },
  maxItems: 3,
  // Cuántos días hacia adelante se muestran disponibles y a partir de cuándo se puede reservar
  bookingWindowDays: 28,
  minDaysAhead: 1,
  // Zona donde aplica la tarifa fija
  serviceArea: ['Montréal', 'Laval'],
  serviceAreaNote: "Tarif applicable pour les transports dans Montréal, Laval et secteurs admissibles. Des frais supplémentaires peuvent s'appliquer selon la distance, les escaliers, le poids ou les conditions particulières."
};
