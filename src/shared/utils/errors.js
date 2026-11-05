// Readable message from an axios/API error.
export const errorMessage = (e) => {
  const data = e?.response?.data
  if (data?.error) return data.error
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const first = Object.values(data).find(v => typeof v === 'string')
    if (first) return first
  }
  return e?.message || 'Something went wrong'
}
