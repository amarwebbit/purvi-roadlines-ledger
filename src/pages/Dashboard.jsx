import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabase.js'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, toNumber } from '../utils/helpers.js'
import toast from 'react-hot-toast'

const pieColors = {
  completed: '#34d399',
  partial: '#fbbf24',
  pending: '#f87171',
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState([])
  const [owners, setOwners] = useState([])
  const [deliveries, setDeliveries] = useState([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [companyRes, ownerRes, deliveryRes] = await Promise.all([
        supabase.from('transport_companies').select('*'),
        supabase.from('truck_owners').select('*'),
        supabase
          .from('deliveries')
          .select('*, transport_companies(name), truck_owners(name)')
          .order('delivery_date', { ascending: false }),
      ])

      if (companyRes.error || ownerRes.error || deliveryRes.error) {
        toast.error('Unable to load dashboard data')
      }

      setCompanies(companyRes.data || [])
      setOwners(ownerRes.data || [])
      setDeliveries(deliveryRes.data || [])
      setLoading(false)
    }

    load()
  }, [])

  const stats = useMemo(() => {
    const totalRevenue = deliveries.reduce((sum, item) => sum + toNumber(item.rate), 0)
    const pendingFromCompanies = deliveries.reduce(
      (sum, item) => sum + Math.max(toNumber(item.balance_from_company), 0),
      0
    )
    const pendingToOwners = deliveries.reduce(
      (sum, item) => sum + Math.max(toNumber(item.balance_to_owner), 0),
      0
    )

    return {
      totalRevenue,
      pendingFromCompanies,
      pendingToOwners,
    }
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

  const barData = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      return {
        key,
        label: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date),
        count: 0,
      }
    })

    deliveries.forEach((item) => {
      if (!item.delivery_date) return
      const date = new Date(item.delivery_date)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const month = months.find((m) => m.key === key)
      if (month) month.count += 1
    })

    return months
  }, [deliveries])

  const recentDeliveries = deliveries.slice(0, 8)

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Companies', value: companies.length },
          { label: 'Total Truck Owners', value: owners.length },
          { label: 'Total Deliveries', value: deliveries.length },
          { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl bg-white/10 p-5 text-white shadow-lg backdrop-blur transition hover:-translate-y-1 hover:bg-white/15"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{item.label}</p>
            <p className="mt-4 text-2xl font-semibold">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-rose-500/15 p-5 shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-200">Pending From Companies</p>
          <p className="mt-3 text-2xl font-semibold text-white">{formatCurrency(stats.pendingFromCompanies)}</p>
        </div>
        <div className="rounded-2xl bg-amber-400/15 p-5 shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Pending To Owners</p>
          <p className="mt-3 text-2xl font-semibold text-white">{formatCurrency(stats.pendingToOwners)}</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1.2fr]">
        <div className="rounded-2xl bg-white/10 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Payment Status</p>
              <p className="text-lg font-semibold text-white">Company Collections</p>
            </div>
            <div className="text-xs text-slate-300">Last 6 months</div>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
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

        <div className="rounded-2xl bg-white/10 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Deliveries</p>
              <p className="text-lg font-semibold text-white">Monthly Volume</p>
            </div>
            <div className="text-xs text-slate-300">Last 6 months</div>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="label" stroke="#cbd5f5" />
                <YAxis stroke="#cbd5f5" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="count" fill="#38bdf8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white/10 p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Recent Deliveries</p>
            <p className="text-lg font-semibold text-white">Latest 8 Records</p>
          </div>
          {loading && <span className="text-xs text-slate-300">Loading...</span>}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm text-slate-200">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="pb-2">Date</th>
                <th className="pb-2">Company</th>
                <th className="pb-2">Owner</th>
                <th className="pb-2">Route</th>
                <th className="pb-2">Rate</th>
                <th className="pb-2">Company Status</th>
              </tr>
            </thead>
            <tbody>
              {recentDeliveries.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-4 text-center text-slate-400">
                    No deliveries yet.
                  </td>
                </tr>
              )}
              {recentDeliveries.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="py-3">{formatDate(item.delivery_date)}</td>
                  <td className="py-3">{item.transport_companies?.name}</td>
                  <td className="py-3">{item.truck_owners?.name}</td>
                  <td className="py-3">
                    {item.from_location} → {item.to_location}
                  </td>
                  <td className="py-3">{formatCurrency(item.rate)}</td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(
                        item.company_payment_status
                      )}`}
                    >
                      {getStatusLabel(item.company_payment_status)}
                    </span>
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
