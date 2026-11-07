// Shared copy for the GPS device key cards in every UI.
export const GPS_KEY_HELP = 'GPS devices send this key in the X-Device-Key header when posting to /api/gps/ping. It is shown only once — store it in the device settings. Generating a new key stops the old one.'

export const gpsKeySummary = (status) =>
  status?.configured ? `Key active since ${new Date(status.createdAt).toLocaleString()}` : 'No key yet — trucks cannot report locations'

export const shipmentTotals = (shipments = []) => ({
  count: shipments.length,
  quintals: shipments.reduce((t, s) => t + Number(s.quintalsExported || 0), 0),
})
