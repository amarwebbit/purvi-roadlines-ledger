export const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0
  const num = Number(value)
  return Number.isNaN(num) ? 0 : num
}

export const formatCurrency = (value) => {
  const amount = toNumber(value)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

export const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export const getStatusLabel = (status) => {
  if (status === 'completed') return 'No Dues'
  if (status === 'partial') return 'Partial'
  return 'Pending'
}

export const getStatusColor = (status) => {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (status === 'partial') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-rose-100 text-rose-700 border-rose-200'
}

export const computeBalanceAndStatus = (rate, advance) => {
  const rateNum = toNumber(rate)
  const advanceNum = toNumber(advance)
  const balance = rateNum - advanceNum
  let status = 'pending'
  if (balance <= 0) status = 'completed'
  else if (advanceNum > 0) status = 'partial'
  return { balance, status }
}

export const monthLabel = (date) => {
  const dt = new Date(date)
  if (Number.isNaN(dt.getTime())) return ''
  return new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(dt)
}
