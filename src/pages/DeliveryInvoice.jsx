import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase.js'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, toNumber } from '../utils/helpers.js'

export default function DeliveryInvoice() {
  const { id } = useParams()
  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('deliveries')
        .select('*, transport_companies(*), truck_owners(*)')
        .eq('id', id)
        .single()

      if (error) {
        toast.error('Unable to load invoice')
        setLoading(false)
        return
      }

      setDelivery(data)
      setLoading(false)
    }

    load()
  }, [id])

  const invoiceNumber = useMemo(() => {
    if (!delivery?.id) return ''
    return `PR-${delivery.id.slice(0, 8).toUpperCase()}`
  }, [delivery])

  if (loading) {
    return <p className="p-6 text-sm text-slate-300">Loading invoice...</p>
  }

  if (!delivery) {
    return <p className="p-6 text-sm text-slate-300">Invoice not found.</p>
  }

  const company = delivery.transport_companies
  const owner = delivery.truck_owners

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl space-y-6 rounded-3xl bg-white p-8 shadow-2xl print:rounded-none print:p-0 print:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6 print:hidden">
          <Link to="/deliveries" className="flex items-center gap-2 text-sm text-slate-600">
            <ArrowLeft className="h-4 w-4" /> Back to Deliveries
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            <Printer className="h-4 w-4" /> Print Invoice
          </button>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Purvi Roadlines</p>
            <h1 className="text-3xl font-semibold">Delivery Invoice</h1>
            <p className="mt-2 text-sm text-slate-500">Broker Ledger Summary</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Invoice</p>
            <p className="text-lg font-semibold text-slate-900">{invoiceNumber}</p>
            <p className="text-xs text-slate-500">Date: {formatDate(delivery.delivery_date)}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Transport Company</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{company?.name || '-'}</p>
            <p className="text-sm text-slate-600">Contact: {company?.contact_person || '-'}</p>
            <p className="text-sm text-slate-600">Phone: {company?.phone || '-'}</p>
            <p className="mt-2 text-xs text-slate-500">{company?.address || 'Address not provided'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Truck Owner</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{owner?.name || '-'}</p>
            <p className="text-sm text-slate-600">Phone: {owner?.phone || '-'}</p>
            <p className="mt-2 text-xs text-slate-500">{owner?.address || 'Address not provided'}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Trip Details</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Route</p>
              <p className="text-base font-semibold text-slate-900">
                {delivery.from_location} → {delivery.to_location}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Truck Number</p>
              <p className="text-base font-semibold text-slate-900">{delivery.truck_number || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Driver Name</p>
              <p className="text-base font-semibold text-slate-900">{delivery.driver_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Driver Mobile</p>
              <p className="text-base font-semibold text-slate-900">{delivery.driver_mobile || '-'}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Owner Hisaab</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Rate</span>
                <span className="font-semibold">{formatCurrency(delivery.rate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Advance Given</span>
                <span className="font-semibold">{formatCurrency(delivery.advance_to_owner)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Balance Remaining</span>
                <span className="font-semibold">{formatCurrency(Math.max(toNumber(delivery.balance_to_owner), 0))}</span>
              </div>
            </div>
            <span
              className={`mt-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(
                delivery.owner_payment_status
              )}`}
            >
              {getStatusLabel(delivery.owner_payment_status)}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Company Hisaab</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Rate</span>
                <span className="font-semibold">{formatCurrency(delivery.rate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Advance Received</span>
                <span className="font-semibold">{formatCurrency(delivery.advance_from_company)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Balance Pending</span>
                <span className="font-semibold">{formatCurrency(Math.max(toNumber(delivery.balance_from_company), 0))}</span>
              </div>
            </div>
            <span
              className={`mt-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(
                delivery.company_payment_status
              )}`}
            >
              {getStatusLabel(delivery.company_payment_status)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Notes</p>
          <p className="mt-2 text-sm text-slate-600">{delivery.notes || 'No notes added.'}</p>
        </div>

        <div className="text-xs text-slate-400">
          This invoice is generated by Purvi Roadlines for internal tracking and settlement clarity.
        </div>
      </div>
    </div>
  )
}
