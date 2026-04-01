import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase.js'
import { exportToExcel } from '../utils/exportExcel.js'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, toNumber } from '../utils/helpers.js'

const pieColors = {
  completed: '#34d399',
  partial: '#fbbf24',
  pending: '#f87171',
}

export default function CompanyDetail() {
  const { id } = useParams()
  const [company, setCompany] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const [companyRes, deliveriesRes] = await Promise.all([
      supabase.from('transport_companies').select('*').eq('id', id).single(),
      supabase
        .from('deliveries')
        .select('*, truck_owners(name)')
        .eq('transport_company_id', id)
        .order('delivery_date', { ascending: false }),
    ])

    if (companyRes.error || deliveriesRes.error) {
      toast.error('Unable to load company details')
      setLoading(false)
      return
    }

    setCompany(companyRes.data)
    setDeliveries(deliveriesRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [id])

  const summary = useMemo(() => {
    const totalBilled = deliveries.reduce((sum, item) => sum + toNumber(item.rate), 0)
    const totalAdvance = deliveries.reduce((sum, item) => sum + toNumber(item.advance_from_company), 0)
    const totalBalance = deliveries.reduce(
      (sum, item) => sum + Math.max(toNumber(item.balance_from_company), 0),
      0
    )
    return { totalBilled, totalAdvance, totalBalance }
  }, [deliveries])

  const pieData = useMemo(() => {
    const counts = { completed: 0, partial: 0, pending: 0 }
    deliveries.forEach((item) => {
      const key = item.company_payment_status || 'pending'
      counts[key] = (counts[key] || 0) + 1
    })
    return [
      { name: 'No Dues', value: counts.completed, key: 'completed' },
      { name: 'Partial', value: counts.partial, key: 'partial' },
      { name: 'Pending', value: counts.pending, key: 'pending' },
    ]
  }, [deliveries])

  const markNoDues = async (deliveryId, rate) => {
    const { error } = await supabase
      .from('deliveries')
      .update({
        advance_from_company: rate,
        balance_from_company: 0,
        company_payment_status: 'completed',
      })
      .eq('id', deliveryId)

    if (error) {
      toast.error('Unable to mark no dues')
      return
    }
    toast.success('Marked as No Dues')
    await loadData()
  }

  const handleExport = () => {
    if (!company) return
    const rows = deliveries.map((item) => ({
      Date: formatDate(item.delivery_date),
      Route: `${item.from_location} → ${item.to_location}`,
      'Truck Owner': item.truck_owners?.name || '-',
      Driver: item.driver_name || '-',
      Rate: toNumber(item.rate),
      Commission: toNumber(item.commission),
      Munsiyana: toNumber(item.munsiyana),
      'Advance Received': toNumber(item.advance_from_company),
      Balance: toNumber(item.balance_from_company),
      Status: getStatusLabel(item.company_payment_status),
    }))

    const fileName = `Purvi-Roadlines_${company.name}_${new Date().toISOString().slice(0, 10)}`
    exportToExcel({ data: rows, fileName, sheetName: 'Company Deliveries' })
  }

  if (loading) {
    return <p className="text-sm text-slate-300">Loading...</p>
  }

  if (!company) {
    return <p className="text-sm text-slate-300">Company not found.</p>
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white/10 p-6">
        <h2 className="text-2xl font-semibold text-white">{company.name}</h2>
        <p className="text-sm text-slate-300">{company.contact_person || 'Contact not set'}</p>
        <p className="text-sm text-slate-300">{company.phone || '-'}</p>
        <p className="mt-2 text-xs text-slate-400">{company.address || 'Address not added'}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Total Billed', value: formatCurrency(summary.totalBilled) },
          { label: 'Advance Received', value: formatCurrency(summary.totalAdvance) },
          { label: 'Balance Pending', value: formatCurrency(summary.totalBalance) },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-white/10 p-5 shadow-lg">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl bg-white/10 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Payment Status</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={pieColors[entry.key]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#f8fafc',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Deliveries</p>
              <p className="text-lg font-semibold text-white">All Trips</p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-xl bg-white/20 px-4 py-2 text-xs font-semibold text-white"
            >
              Export to Excel
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm text-slate-200">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Route</th>
                  <th className="pb-2">Truck Owner</th>
                  <th className="pb-2">Driver</th>
                  <th className="pb-2">Rate</th>
                  <th className="pb-2">Commission</th>
                  <th className="pb-2">Munsiyana</th>
                  <th className="pb-2">Advance</th>
                  <th className="pb-2">Balance</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.length === 0 && (
                  <tr>
                    <td colSpan="11" className="py-4 text-center text-slate-400">
                      No deliveries yet.
                    </td>
                  </tr>
                )}
                {deliveries.map((item) => (
                  <tr key={item.id} className="border-t border-white/10">
                    <td className="py-3">{formatDate(item.delivery_date)}</td>
                    <td className="py-3">
                      {item.from_location} → {item.to_location}
                    </td>
                    <td className="py-3">
                      <Link className="text-sky-300 hover:text-sky-200" to={`/owners/${item.truck_owner_id}`}>
                        {item.truck_owners?.name || '-'}
                      </Link>
                    </td>
                    <td className="py-3">{item.driver_name || '-'}</td>
                    <td className="py-3">{formatCurrency(item.rate)}</td>
                    <td className="py-3">{formatCurrency(item.commission)}</td>
                    <td className="py-3">{formatCurrency(item.munsiyana)}</td>
                    <td className="py-3">{formatCurrency(item.advance_from_company)}</td>
                    <td className="py-3">{formatCurrency(Math.max(toNumber(item.balance_from_company), 0))}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(
                          item.company_payment_status
                        )}`}
                      >
                        {getStatusLabel(item.company_payment_status)}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => markNoDues(item.id, toNumber(item.rate))}
                        className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100"
                      >
                        Mark No Dues
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}


