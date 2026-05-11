import { createBrowserRouter, RouterProvider, Navigate } from 'react-router'
import RutaProtegida from './components/RutaProtegida'
import RootLayout from './layouts/RootLayout'
import PacienteLayout from './layouts/PacienteLayout'
import Login from './pages/Login'
import Inicio from './pages/Inicio'
import NuevaConsulta from './pages/NuevaConsulta'
import ListaPacientes from './pages/ListaPacientes'
import Configuracion from './pages/Configuracion'
import PanelAdmin from './pages/admin/PanelAdmin'
import FichaPaciente from './pages/pacientes/FichaPaciente'
import HistorialEncuentros from './pages/pacientes/HistorialEncuentros'
import NuevoEncuentro from './pages/pacientes/NuevoEncuentro'
import DetalleEncuentro from './pages/pacientes/DetalleEncuentro'
import AuditoriaPaciente from './pages/pacientes/AuditoriaPaciente'
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
import Agenda from './pages/Agenda'

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },

  // Rutas protegidas — cualquier usuario autenticado
  {
    element: <RutaProtegida />,
    children: [
      {
        path: '/',
        element: <RootLayout />,
        children: [
          { index: true, element: <Inicio /> },
          { path: 'nueva-consulta', element: <NuevaConsulta /> },
          { path: 'pacientes', element: <ListaPacientes /> },
          { path: 'pacientes/nuevo', element: <NuevoPaciente /> },
          { path: 'configuracion', element: <Configuracion /> },
          { path: 'rips-mensual', element: <RipsMensual /> },
          { path: 'facturas', element: <Facturas /> },
          { path: 'facturas/nueva', element: <NuevaFactura /> },
          { path: 'facturas/:facturaId', element: <DetalleFactura /> },
          { path: 'encuestas', element: <Encuestas /> },
          { path: 'inventario', element: <Inventario /> },
          { path: 'eventos-adversos', element: <EventosAdversos /> },
          { path: 'proveedores', element: <Proveedores /> },
          { path: 'agenda', element: <Agenda /> },

          // Solo admin
          {
            element: <RutaProtegida roles={['admin']} />,
            children: [
              { path: 'admin', element: <PanelAdmin /> },
            ],
          },

          // Rutas del paciente
          {
            path: 'pacientes/:id',
            element: <PacienteLayout />,
            children: [
              { index: true, element: <FichaPaciente /> },
              { path: 'encuentros', element: <HistorialEncuentros /> },
              { path: 'encuentros/nuevo', element: <NuevoEncuentro /> },
              { path: 'encuentros/:encId', element: <DetalleEncuentro /> },
              { path: 'encuentros/:encId/formula', element: <NuevaFormula /> },
              { path: 'auditoria', element: <AuditoriaPaciente /> },
            ],
          },
        ],
      },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}
