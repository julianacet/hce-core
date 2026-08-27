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
  // Emitir/editar fórmula es exclusivo de médico, aunque el resto de la ficha
  // del paciente sea visible para recepcionista/enfermeria.
  {
    element: <RutaProtegida recurso="nueva-consulta" />,
    children: [{ path: 'encuentros/:encId/formula', element: <NuevaFormula /> }],
  },
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

          {
            element: <RutaProtegida recurso="nueva-consulta" />,
            children: [
              { path: 'nueva-consulta', element: <EncuentrosGlobal /> },
              { path: 'nueva-consulta/nuevo', element: <NuevaConsulta /> },
            ],
          },
          {
            element: <RutaProtegida recurso="consentimientos" />,
            children: [
              { path: 'consentimientos', element: <Consentimientos /> },
              { path: 'consentimientos/nuevo', element: <NuevoConsentimiento /> },
            ],
          },
          {
            element: <RutaProtegida recurso="proveedores" />,
            children: [{ path: 'proveedores', element: <Proveedores /> }],
          },
          {
            element: <RutaProtegida recurso="eventos-adversos" />,
            children: [{ path: 'eventos-adversos', element: <EventosAdversos /> }],
          },

          {
            element: <RutaProtegida recurso="pacientes" />,
            children: [
              { path: 'pacientes', element: <ListaPacientes /> },
              { path: 'pacientes/nuevo', element: <NuevoPaciente /> },
              { path: 'pacientes/:id', element: <PacienteLayout />, children: pacienteChildren },
            ],
          },

          {
            element: <RutaProtegida recurso="agenda" />,
            children: [{ path: 'agenda', element: <Agenda /> }],
          },
          {
            element: <RutaProtegida recurso="inventario" />,
            children: [{ path: 'inventario', element: <Inventario /> }],
          },
          {
            element: <RutaProtegida recurso="encuestas" />,
            children: [{ path: 'encuestas', element: <Encuestas /> }],
          },

          {
            element: <RutaProtegida recurso="facturas" />,
            children: [
              { path: 'facturas', element: <Facturas /> },
              { path: 'facturas/nueva', element: <NuevaFactura /> },
              { path: 'facturas/:facturaId', element: <DetalleFactura /> },
            ],
          },

          {
            element: <RutaProtegida recurso="rips-mensual" />,
            children: [{ path: 'rips-mensual', element: <RipsMensual /> }],
          },
          {
            element: <RutaProtegida recurso="tarifas" />,
            children: [{ path: 'tarifas', element: <Tarifas /> }],
          },

          // admin + medico (la pestaña "Usuarios" se filtra dentro de PanelAdmin)
          {
            element: <RutaProtegida recurso="admin" />,
            children: [{ path: 'admin', element: <PanelAdmin /> }],
          },
          // Solo admin
          {
            element: <RutaProtegida recurso="historial" />,
            children: [{ path: 'historial', element: <Historial /> }],
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
