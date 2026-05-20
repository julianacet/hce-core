import { createBrowserRouter, RouterProvider, Navigate } from 'react-router'
import RutaProtegida from './components/RutaProtegida'
import RootLayout from './layouts/RootLayout'
import PacienteLayout from './layouts/PacienteLayout'
import Login from './pages/Login'
import Inicio from './pages/Inicio'
import NuevaConsulta from './pages/NuevaConsulta'
import EncuentrosGlobal from './pages/EncuentrosGlobal'
import ListaPacientes from './pages/ListaPacientes'
import PanelAdmin from './pages/admin/PanelAdmin'
import Historial from './pages/admin/Historial'
import FichaPaciente from './pages/pacientes/FichaPaciente'
import HistorialEncuentros from './pages/pacientes/HistorialEncuentros'
import DetalleEncuentro from './pages/pacientes/DetalleEncuentro'
import NuevaFormula from './pages/pacientes/NuevaFormula'
import Facturas from './pages/Facturas'
import NuevaFactura from './pages/NuevaFactura'
import DetalleFactura from './pages/DetalleFactura'
import NuevoPaciente from './pages/NuevoPaciente'
import RipsMensual from './pages/RipsMensual'
import Encuestas from './pages/Encuestas'
import Inventario from './pages/Inventario'
import EventosAdversos from './pages/EventosAdversos'
import Proveedores from './pages/Proveedores'
import Tarifas from './pages/Tarifas'
import Agenda from './pages/Agenda'
import Consentimientos from './pages/Consentimientos'
import NuevoConsentimiento from './pages/NuevoConsentimiento'

const pacienteChildren = [
  { index: true, element: <FichaPaciente /> },
  { path: 'encuentros', element: <HistorialEncuentros /> },
  { path: 'encuentros/:encId', element: <DetalleEncuentro /> },
  { path: 'encuentros/:encId/formula', element: <NuevaFormula /> },
]

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },

  {
    element: <RutaProtegida />,
    children: [
      {
        path: '/',
        element: <RootLayout />,
        children: [
          // Accesible por todos los roles autenticados
          { index: true, element: <Inicio /> },

          // medico (+ admin vía superrol)
          {
            element: <RutaProtegida roles={['medico']} />,
            children: [
              { path: 'nueva-consulta', element: <EncuentrosGlobal /> },
              { path: 'nueva-consulta/nuevo', element: <NuevaConsulta /> },
              { path: 'consentimientos', element: <Consentimientos /> },
              { path: 'consentimientos/nuevo', element: <NuevoConsentimiento /> },
              { path: 'proveedores', element: <Proveedores /> },
              { path: 'eventos-adversos', element: <EventosAdversos /> },
            ],
          },

          // medico + recepcionista + enfermeria (+ admin)
          {
            element: <RutaProtegida roles={['medico', 'recepcionista', 'enfermeria']} />,
            children: [
              { path: 'pacientes', element: <ListaPacientes /> },
              { path: 'pacientes/nuevo', element: <NuevoPaciente /> },
              { path: 'pacientes/:id', element: <PacienteLayout />, children: pacienteChildren },
            ],
          },

          // medico + recepcionista (+ admin)
          {
            element: <RutaProtegida roles={['medico', 'recepcionista']} />,
            children: [
              { path: 'agenda', element: <Agenda /> },
              { path: 'inventario', element: <Inventario /> },
              { path: 'encuestas', element: <Encuestas /> },
            ],
          },

          // medico + recepcionista + facturador (+ admin)
          {
            element: <RutaProtegida roles={['medico', 'recepcionista', 'facturador']} />,
            children: [
              { path: 'facturas', element: <Facturas /> },
              { path: 'facturas/nueva', element: <NuevaFactura /> },
              { path: 'facturas/:facturaId', element: <DetalleFactura /> },
            ],
          },

          // medico + facturador (+ admin)
          {
            element: <RutaProtegida roles={['medico', 'facturador']} />,
            children: [
              { path: 'rips-mensual', element: <RipsMensual /> },
              { path: 'tarifas', element: <Tarifas /> },
            ],
          },

          // Solo admin
          {
            element: <RutaProtegida roles={['admin']} />,
            children: [
              { path: 'admin', element: <PanelAdmin /> },
              { path: 'historial', element: <Historial /> },
            ],
          },

          { path: 'configuracion', element: <Navigate to="/admin" replace /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}
