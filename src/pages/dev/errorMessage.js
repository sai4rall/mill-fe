export const errorMessage = (e) => e?.response?.data?.error || e?.message || 'Something went wrong'
