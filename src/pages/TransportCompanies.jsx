import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Pencil, Trash2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase.js'
import Modal from '../components/Modal.jsx'
import { formatCurrency, toNumber } from '../utils/helpers.js'

const emptyCompany = { name: '', contact_person: '', phone: '', address: '' }

export default function TransportCompanies() {
  const [companies, setCompanies] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyCompany)
  const [editing, setEditing] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    const [companyRes, deliveryRes] = await Promise.all([
      supabase.from('transport_companies').select('*').order('name'),
      supabase.from('deliveries').select('*'),
    ])

    if (companyRes.error || deliveryRes.error) {
      toast.error('Unable to load companies')
    }

    setCompanies(companyRes.data || [])
    setDeliveries(deliveryRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const companyStats = useMemo(() => {
    const stats = {}
    deliveries.forEach((item) => {
      const key = item.transport_company_id
      if (!stats[key]) {
        stats[key] = { trips: 0, revenue: 0, pending: 0 }
      }
      stats[key].trips += 1
      stats[key].revenue += toNumber(item.rate)
      stats[key].pending += Math.max(toNumber(item.balance_from_company), 0)
    })
    return stats
  }, [deliveries])

  const openNewModal = () => {
    setEditing(null)
    setForm(emptyCompany)
    setShowModal(true)
  }

  const openEditModal = (company) => {
    setEditing(company)
    setForm({
      name: company.name || '',
      contact_person: company.contact_person || '',
      phone: company.phone || '',
      address: company.address || '',
    })
    setShowModal(true)
  }

  const saveCompany = async () => {
    if (!form.name || !form.phone) {
      toast.error('Company name and phone are required')
      return
    }

    if (editing) {
      const { error } = await supabase
        .from('transport_companies')
        .update(form)
        .eq('id', editing.id)
      if (error) {
        toast.error('Unable to update company')
        return
      }
      toast.success('Company updated')
    } else {
      const { error } = await supabase.from('transport_companies').insert(form)
      if (error) {
        toast.error('Unable to add company')
        return
      }
      toast.success('Company added')
    }
    setShowModal(false)
    await fetchData()
  }

  const deleteCompany = async (company) => {
    const confirmed = window.confirm(`Delete ${company.name}? This will not delete deliveries.`)
    if (!confirmed) return
    const { error } = await supabase.from('transport_companies').delete().eq('id', company.id)
    if (error) {
      toast.error('Unable to delete company')
      return
    }
    toast.success('Company deleted')
    await fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Transport Companies</p>
          <h2 className="text-xl font-semibold text-white">Company Ledger</h2>
        </div>
        <button
          type="button"
          onClick={openNewModal}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Add New Company
        </button>
      </div>

      {loading && <p className="text-sm text-slate-300">Loading...</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {companies.map((company) => {
          const stats = companyStats[company.id] || { trips: 0, revenue: 0, pending: 0 }
          return (
            <div key={company.id} className="rounded-2xl bg-white/10 p-5 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/20 p-2">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{company.name}</p>
                  <p className="text-xs text-slate-300">{company.contact_person || 'Contact pending'}</p>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm text-slate-200">
                <p>Phone: {company.phone || '-'}</p>
                <p>Total Trips: {stats.trips}</p>
                <p>Total Revenue: {formatCurrency(stats.revenue)}</p>
                <p className="text-rose-200">Pending Amount: {formatCurrency(stats.pending)}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to={`/companies/${company.id}`}
                  className="rounded-lg bg-white/20 px-3 py-2 text-xs font-semibold text-white"
                >
                  View Details
                </Link>
                <button
                  type="button"
                  onClick={() => openEditModal(company)}
                  className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white"
                >
                  <Pencil className="inline h-3 w-3" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteCompany(company)}
                  className="rounded-lg bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-100"
                >
                  <Trash2 className="inline h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Company' : 'Add New Company'}
      >
        <div className="grid gap-4">
          <input
            type="text"
            placeholder="Company name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
          />
          <input
            type="text"
            placeholder="Contact person"
            value={form.contact_person}
            onChange={(e) => setForm((prev) => ({ ...prev, contact_person: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
          />
          <input
            type="text"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
          />
          <textarea
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            rows="3"
          />
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={saveCompany}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
          >
            {editing ? 'Update Company' : 'Save Company'}
          </button>
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  )
}
