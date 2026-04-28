export default function FichaPaciente() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Datos del paciente</h3>
      <div className="grid grid-cols-2 gap-4">
        {[
          ['Tipo de documento', 'CC'],
          ['Número de documento', '1234567890'],
          ['Primer nombre', 'María'],
          ['Segundo nombre', '—'],
          ['Primer apellido', 'García'],
          ['Segundo apellido', 'López'],
          ['Fecha de nacimiento', '12/03/1985'],
          ['Género', 'Femenino'],
          ['Municipio de residencia', 'Bogotá D.C.'],
          ['Zona de residencia', 'Urbana'],
          ['Tipo de usuario', 'Contributivo'],
          ['EPS', 'Sura'],
          ['Teléfono', '3001234567'],
          ['Correo electrónico', 'maria@ejemplo.com'],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-slate-400 mb-0.5">{label}</p>
            <p className="text-sm text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
        <button className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
          Editar información
        </button>
      </div>
    </div>
  )
}
