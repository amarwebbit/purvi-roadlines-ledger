import { useEffect, useMemo, useState } from 'react'
import { Search, Pencil, Trash2, BadgeCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase.js'
import Modal from '../components/Modal.jsx'
import {
  computeBalanceAndStatus,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel,
  toNumber,
} from '../utils/helpers.js'
import { exportToExcel } from '../utils/exportExcel.js'

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([])
  const [companies, setCompanies] = useState([])
  const [owners, setOwners] = useState([])
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ advance_to_owner: '', advance_from_company: '' })

  const loadData = async () => {
    const [deliveryRes, companyRes, ownerRes] = await Promise.all([
      supabase
        .from('deliveries')
        .select('*, transport_companies(name), truck_owners(name)')
        .order('delivery_date', { ascending: false }),
      supabase.from('transport_companies').select('*').order('name'),
      supabase.from('truck_owners').select('*').order('name'),
    ])

    if (deliveryRes.error || companyRes.error || ownerRes.error) {
      toast.error('Unable to load deliveries')
      return
    }

    setDeliveries(deliveryRes.data || [])
    setCompanies(companyRes.data || [])
    setOwners(ownerRes.data || [])
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = useMemo(() => {
    const lower = search.toLowerCase()
    return deliveries.filter((item) => {
      if (companyFilter && item.transport_company_id !== companyFilter) return false
      if (ownerFilter && item.truck_owner_id !== ownerFilter) return false
      if (statusFilter && item.company_payment_status !== statusFilter) return false
      if (dateFrom && new Date(item.delivery_date) < new Date(dateFrom)) return false
      if (dateTo && new Date(item.delivery_date) > new Date(dateTo)) return false

      if (lower) {
        const haystack = `${item.transport_companies?.name || ''} ${item.truck_owners?.name || ''} ${
          item.from_location
        } ${item.to_location} ${item.truck_number || ''} ${item.driver_name || ''}`.toLowerCase()
        if (!haystack.includes(lower)) return false
      }

      return true
    })
  }, [deliveries, search, companyFilter, ownerFilter, statusFilter, dateFrom, dateTo])

  const openEdit = (delivery) => {
    setEditing(delivery)
    setEditForm({
      advance_to_owner: delivery.advance_to_owner ?? 0,
      advance_from_company: delivery.advance_from_company ?? 0,
    })
  }

  const saveEdit = async () => {
    if (!editing) return
    const ownerRate = Math.max(
      toNumber(editing.rate) - toNumber(editing.commission) - toNumber(editing.munsiyana),
      0
    )
    const ownerCalc = computeBalanceAndStatus(ownerRate, editForm.advance_to_owner)
    const companyCalc = computeBalanceAndStatus(editing.rate, editForm.advance_from_company)

    const { error } = await supabase
      .from('deliveries')
      .update({
        advance_to_owner: toNumber(editForm.advance_to_owner),
        balance_to_owner: ownerCalc.balance,
        owner_payment_status: ownerCalc.status,
        advance_from_company: toNumber(editForm.advance_from_company),
        balance_from_company: companyCalc.balance,
        company_payment_status: companyCalc.status,
      })
      .eq('id', editing.id)

    if (error) {
      toast.error('Unable to update delivery')
      return
    }
    toast.success('Delivery updated')
    setEditing(null)
    await loadData()
  }

  const markNoDuesOwner = async (delivery) => {
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
      toast.error('Unable to mark owner no dues')
      return
    }
    toast.success('Owner marked No Dues')
    await loadData()
  }

  const markNoDuesCompany = async (delivery) => {
    const { error } = await supabase
      .from('deliveries')
      .update({
        advance_from_company: toNumber(delivery.rate),
        balance_from_company: 0,
        company_payment_status: 'completed',
      })
      .eq('id', delivery.id)

    if (error) {
      toast.error('Unable to mark company no dues')
      return
    }
    toast.success('Company marked No Dues')
    await loadData()
  }

  const deleteDelivery = async (delivery) => {
    const confirmed = window.confirm('Delete this delivery record?')
    if (!confirmed) return
    const { error } = await supabase.from('deliveries').delete().eq('id', delivery.id)
    if (error) {
      toast.error('Unable to delete delivery')
      return
    }
    toast.success('Delivery deleted')
    await loadData()
  }

  const handleExport = () => {
    const rows = filtered.map((item) => ({
      Date: formatDate(item.delivery_date),
      Company: item.transport_companies?.name || '-',
      Route: `${item.from_location} → ${item.to_location}`,
      'Truck Owner': item.truck_owners?.name || '-',
      Driver: item.driver_name || '-',
      Rate: toNumber(item.rate),
      Commission: toNumber(item.commission),
      Munsiyana: toNumber(item.munsiyana),
      'Advance → Owner': toNumber(item.advance_to_owner),
      'Balance → Owner': toNumber(item.balance_to_owner),
      'Owner Status': getStatusLabel(item.owner_payment_status),
      'Advance ← Company': toNumber(item.advance_from_company),
      'Balance ← Company': toNumber(item.balance_from_company),
      'Company Status': getStatusLabel(item.company_payment_status),
    }))

    const fileName = `Purvi-Roadlines_Deliveries_${new Date().toISOString().slice(0, 10)}`
    exportToExcel({ data: rows, fileName, sheetName: 'Deliveries' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">All Records</p>
          <h2 className="text-xl font-semibold text-white">Deliveries Ledger</h2>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-xl bg-white/20 px-4 py-2 text-xs font-semibold text-white"
        >
          Export to Excel
        </button>
      </div>

      <div className="grid gap-4 rounded-2xl bg-white/10 p-5 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr]">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search company, owner, route, truck..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/20 py-2 pl-10 pr-3 text-sm text-white placeholder:text-slate-300"
          />
        </div>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/20 px-3 py-2 text-sm text-white"
        >
          <option value="">All Companies</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/20 px-3 py-2 text-sm text-white"
        >
          <option value="">All Owners</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/20 px-3 py-2 text-sm text-white"
        >
          <option value="">All Statuses</option>
          <option value="completed">No Dues</option>
          <option value="partial">Partial</option>
          <option value="pending">Pending</option>
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/20 px-2 py-2 text-xs text-white"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/20 px-2 py-2 text-xs text-white"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white/10 p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-200">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="pb-2">Date</th>
                <th className="pb-2">Company</th>
                <th className="pb-2">Route</th>
                <th className="pb-2">Truck Owner</th>
                <th className="pb-2">Driver</th>
                <th className="pb-2">Rate</th>
                <th className="pb-2">Commission</th>
                <th className="pb-2">Munsiyana</th>
                <th className="pb-2">Advance → Owner</th>
                <th className="pb-2">Balance → Owner</th>
                <th className="pb-2">Owner Status</th>
                <th className="pb-2">Advance ← Company</th>
                <th className="pb-2">Balance ← Company</th>
                <th className="pb-2">Company Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="15" className="py-4 text-center text-slate-400">
                    No deliveries found.
                  </td>
                </tr>
              )}
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="py-3">{formatDate(item.delivery_date)}</td>
                  <td className="py-3">{item.transport_companies?.name}</td>
                  <td className="py-3">
                    {item.from_location} → {item.to_location}
                  </td>
                  <td className="py-3">{item.truck_owners?.name}</td>
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
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white"
                      >
                        <Pencil className="inline h-3 w-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => markNoDuesOwner(item)}
                        className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100"
                      >
                        Owner No Dues
                      </button>
                      <button
                        type="button"
                        onClick={() => markNoDuesCompany(item)}
                        className="rounded-lg bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-100"
                      >
                        Company No Dues
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDelivery(item)}
                        className="rounded-lg bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-100"
                      >
                        <Trash2 className="inline h-3 w-3" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit Payment">
        <div className="grid gap-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Advance to Owner (₹)</label>
            <input
              type="number"
              min="0"
              value={editForm.advance_to_owner}
              onChange={(e) => setEditForm((prev) => ({ ...prev, advance_to_owner: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Advance from Company (₹)</label>
            <input
              type="number"
              min="0"
              value={editForm.advance_from_company}
              onChange={(e) => setEditForm((prev) => ({ ...prev, advance_from_company: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
            />
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
            {editing && (
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-emerald-500" />
                  Rate: {formatCurrency(editing.rate)}
                </span>
                <span>
                  Owner balance:{' '}
                  {formatCurrency(
                    Math.max(
                      toNumber(editing.rate) -
                        toNumber(editing.commission) -
                        toNumber(editing.munsiyana) -
                        toNumber(editForm.advance_to_owner),
                      0
                    )
                  )}
                </span>
                <span>
                  Company balance: {formatCurrency(Math.max(editing.rate - toNumber(editForm.advance_from_company), 0))}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={saveEdit}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  )
}
