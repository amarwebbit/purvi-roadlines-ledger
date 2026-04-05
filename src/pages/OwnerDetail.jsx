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

export default function OwnerDetail() {
  const { id } = useParams()
  const [owner, setOwner] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const [ownerRes, deliveriesRes] = await Promise.all([
      supabase.from('truck_owners').select('*').eq('id', id).single(),
      supabase
        .from('deliveries')
        .select('*, transport_companies(name)')
        .eq('truck_owner_id', id)
        .order('delivery_date', { ascending: false }),
    ])

    if (ownerRes.error || deliveriesRes.error) {
      toast.error('Unable to load owner details')
      setLoading(false)
      return
    }

    setOwner(ownerRes.data)
    setDeliveries(deliveriesRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [id])

  const summary = useMemo(() => {
    const totalEarnings = deliveries.reduce(
      (sum, item) =>
        sum + Math.max(toNumber(item.rate) - toNumber(item.commission) - toNumber(item.munsiyana), 0),
      0
    )
    const totalAdvance = deliveries.reduce((sum, item) => sum + toNumber(item.advance_to_owner), 0)
    const totalBalance = deliveries.reduce(
      (sum, item) => sum + Math.max(toNumber(item.balance_to_owner), 0),
      0
    )
    return { totalEarnings, totalAdvance, totalBalance }
  }, [deliveries])

  const pieData = useMemo(() => {
    const counts = { completed: 0, partial: 0, pending: 0 }
    deliveries.forEach((item) => {
      const key = item.owner_payment_status || 'pending'
      counts[key] = (counts[key] || 0) + 1
    })
    return [
      { name: 'No Dues', value: counts.completed, key: 'completed' },
      { name: 'Partial', value: counts.partial, key: 'partial' },
      { name: 'Pending', value: counts.pending, key: 'pending' },
    ]
  }, [deliveries])

  const companiesServed = useMemo(() => {
    const map = {}
    deliveries.forEach((item) => {
      const companyId = item.transport_company_id
      if (!map[companyId]) {
        map[companyId] = { name: item.transport_companies?.name || '-', count: 0, id: companyId }
      }
      map[companyId].count += 1
    })
    return Object.values(map)
  }, [deliveries])

  const markNoDues = async (delivery) => {
    const ownerRate = Math.max(
      toNumber(delivery.rate) - toNumber(delivery.commission) - toNumber(delivery.munsiyana),
      0
    )
    const { error } = await supabase
      .from('deliveries')
      .update({
        advance_to_owner: ownerRate,
        balance_to_owner: 0,
        owner_payment_status: 'completed',
      })
      .eq('id', delivery.id)

    if (error) {
      toast.error('Unable to mark no dues')
      return
    }
    toast.success('Marked as No Dues')
    await loadData()
  }

  const markAllNoDues = async () => {
    if (deliveries.length === 0) return
    const updates = deliveries.map((item) =>
      supabase
        .from('deliveries')
        .update({
          advance_to_owner: Math.max(
            toNumber(item.rate) - toNumber(item.commission) - toNumber(item.munsiyana),
            0
          ),
          balance_to_owner: 0,
          owner_payment_status: 'completed',
        })
        .eq('id', item.id)
    )

    const results = await Promise.all(updates)
    if (results.some((res) => res.error)) {
      toast.error('Unable to mark all as no dues')
      return
    }
    toast.success('All deliveries marked as No Dues')
    await loadData()
  }

  const handleExport = () => {
    if (!owner) return
    const rows = deliveries.map((item) => ({
      Date: formatDate(item.delivery_date),
      Route: `${item.from_location} → ${item.to_location}`,
      Company: item.transport_companies?.name || '-',
      Driver: item.driver_name || '-',
      Rate: toNumber(item.rate),
      Commission: toNumber(item.commission),
      Munsiyana: toNumber(item.munsiyana),
      'Advance Given': toNumber(item.advance_to_owner),
      Balance: toNumber(item.balance_to_owner),
      Status: getStatusLabel(item.owner_payment_status),
    }))

    const fileName = `Purvi-Roadlines_${owner.name}_${new Date().toISOString().slice(0, 10)}`
    exportToExcel({ data: rows, fileName, sheetName: 'Owner Deliveries' })
  }

  if (loading) {
    return <p className="text-sm text-slate-300">Loading...</p>
  }

  if (!owner) {
    return <p className="text-sm text-slate-300">Owner not found.</p>
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white/10 p-6">
        <h2 className="text-2xl font-semibold text-white">{owner.name}</h2>
        <p className="text-sm text-slate-300">{owner.phone || '-'}</p>
        <p className="mt-2 text-xs text-slate-400">{owner.address || 'Address not added'}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Total Earnings', value: formatCurrency(summary.totalEarnings) },
          { label: 'Advance Received', value: formatCurrency(summary.totalAdvance) },
          { label: 'Balance Remaining', value: formatCurrency(summary.totalBalance) },
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
          <button
            type="button"
            onClick={markAllNoDues}
            className="mt-4 w-full rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100"
          >
            Mark All No Dues
          </button>
        </div>

        <div className="rounded-2xl bg-white/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Companies Served</p>
              <p className="text-lg font-semibold text-white">Usage Breakdown</p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-xl bg-white/20 px-4 py-2 text-xs font-semibold text-white"
            >
              Export to Excel
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {companiesServed.length === 0 && <p className="text-sm text-slate-300">No companies yet.</p>}
            {companiesServed.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                <Link className="text-sky-300 hover:text-sky-200" to={`/companies/${item.id}`}>
                  {item.name}
                </Link>
                <span className="text-sm text-slate-200">{item.count} trips</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white/10 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Deliveries</p>
            <p className="text-lg font-semibold text-white">All Trips</p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm text-slate-200">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="pb-2">Date</th>
                <th className="pb-2">Company</th>
                <th className="pb-2">Route</th>
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
                    <Link className="text-sky-300 hover:text-sky-200" to={`/companies/${item.transport_company_id}`}>
                      {item.transport_companies?.name || '-'}
                    </Link>
                  </td>
                  <td className="py-3">
                    {item.from_location} → {item.to_location}
                  </td>
                  <td className="py-3">{item.driver_name || '-'}</td>
                  <td className="py-3">{formatCurrency(item.rate)}</td>
                  <td className="py-3">{formatCurrency(item.commission)}</td>
                  <td className="py-3">{formatCurrency(item.munsiyana)}</td>
                  <td className="py-3">{formatCurrency(item.advance_to_owner)}</td>
                  <td className="py-3">{formatCurrency(Math.max(toNumber(item.balance_to_owner), 0))}</td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(
                        item.owner_payment_status
                      )}`}
                    >
                      {getStatusLabel(item.owner_payment_status)}
                    </span>
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => markNoDues(item)}
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
      </section>
    </div>
  )
}
