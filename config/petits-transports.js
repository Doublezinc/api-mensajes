// Configuración de los "Petits transports" (servicio todos los días con tarifa fija).
// Los valores pueden ajustarse sin tocar la lógica de reservas.
module.exports = {
  timezone: 'America/Montreal',
  currency: 'CAD',
  // Días de la semana habilitados (0 = domingo … 6 = sábado): todos los días
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  // Créneaux por día. Se deja margen entre servicios para desplazamiento, carga y descarga.
  slots: ['08:00', '10:30', '13:00', '15:30'],
  slotDurationMinutes: 120,
  // Precio de base (« à partir de ») según la cantidad de artículos (impuestos no incluidos)
  prices: { 1: 120, 2: 150, 3: 180 },
  maxItems: 3,
  // Cuántos días hacia adelante se muestran disponibles y a partir de cuándo se puede reservar
  bookingWindowDays: 28,
  minDaysAhead: 1,
  // Zona de servicio (los cargos por zona están en utils/petitTransportPricing.js)
  serviceArea: ['Montréal', 'Laval'],
  serviceAreaNote: "Prix calculé selon le nombre d'articles, la zone (ville la plus éloignée de Laval) et les escaliers sans ascenseur (20 $ par étage au-dessus du 1er). Hors des zones desservies, le prix final est confirmé par téléphone. Des frais peuvent s'ajouter pour un objet très lourd ou des conditions particulières."
};
