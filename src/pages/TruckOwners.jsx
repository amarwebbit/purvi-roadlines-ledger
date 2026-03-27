import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { UsersRound, Pencil, Trash2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase.js'
import Modal from '../components/Modal.jsx'
import { formatCurrency, toNumber } from '../utils/helpers.js'

const emptyOwner = { name: '', phone: '', address: '' }

export default function TruckOwners() {
  const [owners, setOwners] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyOwner)
  const [editing, setEditing] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    const [ownerRes, deliveryRes] = await Promise.all([
      supabase.from('truck_owners').select('*').order('name'),
      supabase.from('deliveries').select('*'),
    ])

    if (ownerRes.error || deliveryRes.error) {
      toast.error('Unable to load truck owners')
    }

    setOwners(ownerRes.data || [])
    setDeliveries(deliveryRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const ownerStats = useMemo(() => {
    const stats = {}
    deliveries.forEach((item) => {
      const key = item.truck_owner_id
      if (!stats[key]) {
        stats[key] = { trips: 0, advance: 0, pending: 0 }
      }
      stats[key].trips += 1
      stats[key].advance += toNumber(item.advance_to_owner)
      stats[key].pending += Math.max(toNumber(item.balance_to_owner), 0)
    })
    return stats
  }, [deliveries])

  const openNewModal = () => {
    setEditing(null)
    setForm(emptyOwner)
    setShowModal(true)
  }

  const openEditModal = (owner) => {
    setEditing(owner)
    setForm({
      name: owner.name || '',
      phone: owner.phone || '',
      address: owner.address || '',
    })
    setShowModal(true)
  }

  const saveOwner = async () => {
    if (!form.name || !form.phone) {
      toast.error('Owner name and phone are required')
      return
    }

    if (editing) {
      const { error } = await supabase.from('truck_owners').update(form).eq('id', editing.id)
      if (error) {
        toast.error('Unable to update owner')
        return
      }
      toast.success('Owner updated')
    } else {
      const { error } = await supabase.from('truck_owners').insert(form)
      if (error) {
        toast.error('Unable to add owner')
        return
      }
      toast.success('Owner added')
    }
    setShowModal(false)
    await fetchData()
  }

  const deleteOwner = async (owner) => {
    const confirmed = window.confirm(`Delete ${owner.name}? This will not delete deliveries.`)
    if (!confirmed) return
    const { error } = await supabase.from('truck_owners').delete().eq('id', owner.id)
    if (error) {
      toast.error('Unable to delete owner')
      return
    }
    toast.success('Owner deleted')
    await fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Truck Owners</p>
          <h2 className="text-xl font-semibold text-white">Owner Ledger</h2>
        </div>
        <button
          type="button"
          onClick={openNewModal}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Add New Owner
        </button>
      </div>

      {loading && <p className="text-sm text-slate-300">Loading...</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {owners.map((owner) => {
          const stats = ownerStats[owner.id] || { trips: 0, advance: 0, pending: 0 }
          const noDues = stats.pending <= 0
          return (
            <div key={owner.id} className="rounded-2xl bg-white/10 p-5 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/20 p-2">
                  <UsersRound className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{owner.name}</p>
                  <p className="text-xs text-slate-300">{owner.phone || '-'}</p>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm text-slate-200">
                <p>Total Trips: {stats.trips}</p>
                <p>Total Advance: {formatCurrency(stats.advance)}</p>
                <p>Total Balance: {formatCurrency(stats.pending)}</p>
                {noDues && (
                  <span className="inline-flex rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                    NO DUES
                  </span>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to={`/owners/${owner.id}`}
                  className="rounded-lg bg-white/20 px-3 py-2 text-xs font-semibold text-white"
                >
                  View Details
                </Link>
                <button
                  type="button"
                  onClick={() => openEditModal(owner)}
                  className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white"
                >
                  <Pencil className="inline h-3 w-3" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteOwner(owner)}
                  className="rounded-lg bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-100"
                >
                  <Trash2 className="inline h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Owner' : 'Add New Owner'}>
        <div className="grid gap-4">
          <input
            type="text"
            placeholder="Owner name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
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
            onClick={saveOwner}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
          >
            {editing ? 'Update Owner' : 'Save Owner'}
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
