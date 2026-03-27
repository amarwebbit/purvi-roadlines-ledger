import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NewDelivery from './pages/NewDelivery.jsx'
import TransportCompanies from './pages/TransportCompanies.jsx'
import CompanyDetail from './pages/CompanyDetail.jsx'
import TruckOwners from './pages/TruckOwners.jsx'
import OwnerDetail from './pages/OwnerDetail.jsx'
import Deliveries from './pages/Deliveries.jsx'
import DeliveryInvoice from './pages/DeliveryInvoice.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/deliveries/:id/print" element={<DeliveryInvoice />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/new-delivery" element={<NewDelivery />} />
        <Route path="/companies" element={<TransportCompanies />} />
        <Route path="/companies/:id" element={<CompanyDetail />} />
        <Route path="/owners" element={<TruckOwners />} />
        <Route path="/owners/:id" element={<OwnerDetail />} />
        <Route path="/deliveries" element={<Deliveries />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}
