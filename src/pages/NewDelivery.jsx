import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase.js'
import Modal from '../components/Modal.jsx'
import {
  computeBalanceAndStatus,
  formatCurrency,
  getStatusColor,
  getStatusLabel,
  toNumber,
} from '../utils/helpers.js'

const initialCompany = { name: '', contact_person: '', phone: '', address: '' }
const initialOwner = { name: '', phone: '', address: '' }

export default function NewDelivery() {
  const [companies, setCompanies] = useState([])
  const [owners, setOwners] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [showOwnerModal, setShowOwnerModal] = useState(false)
  const [newCompany, setNewCompany] = useState(initialCompany)
  const [newOwner, setNewOwner] = useState(initialOwner)
  const [commissionEdited, setCommissionEdited] = useState(false)
  const [munsiyanaEdited, setMunsiyanaEdited] = useState(false)

  const [form, setForm] = useState({
    delivery_date: new Date().toISOString().slice(0, 10),
    transport_company_id: '',
    from_location: '',
    to_location: '',
    truck_owner_id: '',
    truck_number: '',
    driver_name: '',
    driver_mobile: '',
    rate: '',
    commission: '',
    munsiyana: '',
    advance_to_owner: '',
    advance_from_company: '',
    notes: '',
  })

  const fetchCompanies = async () => {
    const { data, error } = await supabase.from('transport_companies').select('*').order('name')
    if (error) {
      toast.error('Unable to load companies')
      return
    }
    setCompanies(data || [])
  }

  const fetchOwners = async () => {
    const { data, error } = await supabase.from('truck_owners').select('*').order('name')
    if (error) {
      toast.error('Unable to load truck owners')
      return
    }
    setOwners(data || [])
  }

  useEffect(() => {
    fetchCompanies()
    fetchOwners()
  }, [])

  const ownerCalc = useMemo(
    () => {
      const rateNum = toNumber(form.rate)
      const commissionNum = toNumber(form.commission)
      const munsiyanaNum = toNumber(form.munsiyana)
      const ownerRate = Math.max(rateNum - commissionNum - munsiyanaNum, 0)
      return computeBalanceAndStatus(ownerRate, form.advance_to_owner)
    },
    [form.rate, form.commission, form.munsiyana, form.advance_to_owner]
  )

  const companyCalc = useMemo(
    () => computeBalanceAndStatus(form.rate, form.advance_from_company),
    [form.rate, form.advance_from_company]
  )

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.transport_company_id || !form.truck_owner_id || !form.from_location || !form.to_location) {
      toast.error('Please fill all required fields')
      return
    }

    const rateNum = toNumber(form.rate)
    const commissionNum = toNumber(form.commission)
    const munsiyanaNum = toNumber(form.munsiyana)
    if (rateNum <= 0) {
      toast.error('Rate should be greater than 0')
      return
    }

    const ownerRate = Math.max(rateNum - commissionNum - munsiyanaNum, 0)

    setLoading(true)
    const payload = {
      delivery_date: form.delivery_date,
      transport_company_id: form.transport_company_id,
      from_location: form.from_location,
      to_location: form.to_location,
      truck_owner_id: form.truck_owner_id,
      truck_number: form.truck_number,
      driver_name: form.driver_name,
      driver_mobile: form.driver_mobile,
      rate: rateNum,
      commission: toNumber(form.commission),
      munsiyana: toNumber(form.munsiyana),
      advance_to_owner: toNumber(form.advance_to_owner),
      balance_to_owner: computeBalanceAndStatus(ownerRate, form.advance_to_owner).balance,
      owner_payment_status: computeBalanceAndStatus(ownerRate, form.advance_to_owner).status,
      advance_from_company: toNumber(form.advance_from_company),
      balance_from_company: companyCalc.balance,
      company_payment_status: companyCalc.status,
      notes: form.notes,
    }

    const { error } = await supabase.from('deliveries').insert(payload)

    if (error) {
      toast.error('Unable to save delivery')
      setLoading(false)
      return
    }

    toast.success('Delivery saved successfully')
    setForm({
      ...form,
      from_location: '',
      to_location: '',
      truck_number: '',
      driver_name: '',
      driver_mobile: '',
      rate: '',
      commission: '',
      munsiyana: '',
      advance_to_owner: '',
      advance_from_company: '',
      notes: '',
    })
    setCommissionEdited(false)
    setMunsiyanaEdited(false)
    setLoading(false)
  }

  const addCompany = async () => {
    if (!newCompany.name || !newCompany.phone) {
      toast.error('Company name and phone are required')
      return
    }
    const { data, error } = await supabase.from('transport_companies').insert(newCompany).select('*')
    if (error) {
      toast.error('Unable to add company')
      return
    }
    toast.success('Company added')
    setShowCompanyModal(false)
    setNewCompany(initialCompany)
    await fetchCompanies()
    if (data && data[0]) {
      setForm((prev) => ({ ...prev, transport_company_id: data[0].id }))
    }
  }

  const addOwner = async () => {
    if (!newOwner.name || !newOwner.phone) {
      toast.error('Owner name and phone are required')
      return
    }
    const { data, error } = await supabase.from('truck_owners').insert(newOwner).select('*')
    if (error) {
      toast.error('Unable to add truck owner')
      return
    }
    toast.success('Truck owner added')
    setShowOwnerModal(false)
    setNewOwner(initialOwner)
    await fetchOwners()
    if (data && data[0]) {
      setForm((prev) => ({ ...prev, truck_owner_id: data[0].id }))
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="rounded-3xl bg-white/10 p-6 shadow-xl">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Date</label>
            <input
              type="date"
              value={form.delivery_date}
              onChange={(e) => setForm((prev) => ({ ...prev, delivery_date: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Transport Company</label>
            <div className="mt-2 flex gap-2">
              <select
                value={form.transport_company_id}
                onChange={(e) => setForm((prev) => ({ ...prev, transport_company_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900"
                required
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCompanyModal(true)}
                className="flex items-center gap-2 rounded-xl bg-white/20 px-4 text-sm text-white hover:bg-white/30"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-300">From Location</label>
            <input
              type="text"
              value={form.from_location}
              onChange={(e) => setForm((prev) => ({ ...prev, from_location: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900"
              placeholder="Origin city"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-300">To Location</label>
            <input
              type="text"
              value={form.to_location}
              onChange={(e) => setForm((prev) => ({ ...prev, to_location: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900"
              placeholder="Destination city"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Truck Owner</label>
            <div className="mt-2 flex gap-2">
              <select
                value={form.truck_owner_id}
                onChange={(e) => setForm((prev) => ({ ...prev, truck_owner_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900"
                required
              >
                <option value="">Select owner</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowOwnerModal(true)}
                className="flex items-center gap-2 rounded-xl bg-white/20 px-4 text-sm text-white hover:bg-white/30"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Truck Number</label>
            <input
              type="text"
              value={form.truck_number}
              onChange={(e) => setForm((prev) => ({ ...prev, truck_number: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900"
              placeholder="MH12 AB 1234"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Driver Name</label>
            <input
              type="text"
              value={form.driver_name}
              onChange={(e) => setForm((prev) => ({ ...prev, driver_name: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Driver Mobile</label>
            <input
              type="text"
              value={form.driver_mobile}
              onChange={(e) => setForm((prev) => ({ ...prev, driver_mobile: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Rate / Fare (₹)</label>
            <input
              type="number"
              min="0"
              value={form.rate}
              onChange={(e) => {
                const value = e.target.value
                const rateNum = toNumber(value)
                setForm((prev) => ({
                  ...prev,
                  rate: value,
                  commission: commissionEdited ? prev.commission : rateNum > 0 ? Math.min(500, rateNum) : '',
                  munsiyana: munsiyanaEdited ? prev.munsiyana : rateNum > 0 ? Math.min(250, rateNum) : '',
                }))
              }}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900"
              placeholder="0"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Commission (₹)</label>
            <input
              type="number"
              min="0"
              value={form.commission}
              onChange={(e) => {
                setCommissionEdited(true)
                setForm((prev) => ({ ...prev, commission: e.target.value }))
              }}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Munsiyana (₹)</label>
            <input
              type="number"
              min="0"
              value={form.munsiyana}
              onChange={(e) => {
                setMunsiyanaEdited(true)
                setForm((prev) => ({ ...prev, munsiyana: e.target.value }))
              }}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Advance Given to Owner (₹)</label>
            <input
              type="number"
              min="0"
              value={form.advance_to_owner}
              onChange={(e) => setForm((prev) => ({ ...prev, advance_to_owner: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Advance Received from Company (₹)</label>
            <input
              type="number"
              min="0"
              value={form.advance_from_company}
              onChange={(e) => setForm((prev) => ({ ...prev, advance_from_company: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900"
              placeholder="0"
            />
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Balance To Owner</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(Math.max(ownerCalc.balance, 0))}</p>
            <span
              className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(
                ownerCalc.status
              )}`}
            >
              {getStatusLabel(ownerCalc.status)}
            </span>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Balance From Company</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(Math.max(companyCalc.balance, 0))}</p>
            <span
              className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(
                companyCalc.status
              )}`}
            >
              {getStatusLabel(companyCalc.status)}
            </span>
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900"
              rows="3"
            />
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Save Delivery'}
          </button>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-xs text-slate-200">
            All balances and statuses update automatically based on the rate and advances.
          </div>
        </div>
      </form>

      <Modal open={showCompanyModal} onClose={() => setShowCompanyModal(false)} title="Add New Company">
        <div className="grid gap-4">
          <input
            type="text"
            placeholder="Company name"
            value={newCompany.name}
            onChange={(e) => setNewCompany((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
          />
          <input
            type="text"
            placeholder="Contact person"
            value={newCompany.contact_person}
            onChange={(e) => setNewCompany((prev) => ({ ...prev, contact_person: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
          />
          <input
            type="text"
            placeholder="Phone"
            value={newCompany.phone}
            onChange={(e) => setNewCompany((prev) => ({ ...prev, phone: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
          />
          <textarea
            placeholder="Address"
            value={newCompany.address}
            onChange={(e) => setNewCompany((prev) => ({ ...prev, address: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            rows="3"
          />
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={addCompany}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
          >
            Save Company
          </button>
          <button
            type="button"
            onClick={() => setShowCompanyModal(false)}
            className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal open={showOwnerModal} onClose={() => setShowOwnerModal(false)} title="Add New Truck Owner">
        <div className="grid gap-4">
          <input
            type="text"
            placeholder="Owner name"
            value={newOwner.name}
            onChange={(e) => setNewOwner((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
          />
          <input
            type="text"
            placeholder="Phone"
            value={newOwner.phone}
            onChange={(e) => setNewOwner((prev) => ({ ...prev, phone: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
          />
          <textarea
            placeholder="Address"
            value={newOwner.address}
            onChange={(e) => setNewOwner((prev) => ({ ...prev, address: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            rows="3"
          />
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={addOwner}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
          >
            Save Owner
          </button>
          <button
            type="button"
            onClick={() => setShowOwnerModal(false)}
            className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  )
}
