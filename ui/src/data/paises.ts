export type Pais = { codigo: string; nombre: string }

// Códigos ISO 3166-1 numérico (3 dígitos), requeridos por RIPS / DANE
export const PAISES: Pais[] = [
  { codigo: '170', nombre: 'Colombia' },
  // América del Sur
  { codigo: '032', nombre: 'Argentina' },
  { codigo: '068', nombre: 'Bolivia' },
  { codigo: '076', nombre: 'Brasil' },
  { codigo: '152', nombre: 'Chile' },
  { codigo: '218', nombre: 'Ecuador' },
  { codigo: '600', nombre: 'Paraguay' },
  { codigo: '604', nombre: 'Perú' },
  { codigo: '858', nombre: 'Uruguay' },
  { codigo: '862', nombre: 'Venezuela' },
  // América Central y Caribe
  { codigo: '188', nombre: 'Costa Rica' },
  { codigo: '192', nombre: 'Cuba' },
  { codigo: '214', nombre: 'República Dominicana' },
  { codigo: '222', nombre: 'El Salvador' },
  { codigo: '320', nombre: 'Guatemala' },
  { codigo: '332', nombre: 'Haití' },
  { codigo: '340', nombre: 'Honduras' },
  { codigo: '484', nombre: 'México' },
  { codigo: '558', nombre: 'Nicaragua' },
  { codigo: '591', nombre: 'Panamá' },
  { codigo: '630', nombre: 'Puerto Rico' },
  // América del Norte
  { codigo: '124', nombre: 'Canadá' },
  { codigo: '840', nombre: 'Estados Unidos' },
  // Europa
  { codigo: '276', nombre: 'Alemania' },
  { codigo: '724', nombre: 'España' },
  { codigo: '250', nombre: 'Francia' },
  { codigo: '528', nombre: 'Países Bajos' },
  { codigo: '380', nombre: 'Italia' },
  { codigo: '620', nombre: 'Portugal' },
  { codigo: '826', nombre: 'Reino Unido' },
  { codigo: '642', nombre: 'Rumanía' },
  { codigo: '756', nombre: 'Suiza' },
  { codigo: '804', nombre: 'Ucrania' },
  { codigo: '643', nombre: 'Rusia' },
  { codigo: '616', nombre: 'Polonia' },
  // Asia
  { codigo: '156', nombre: 'China' },
  { codigo: '356', nombre: 'India' },
  { codigo: '392', nombre: 'Japón' },
  { codigo: '410', nombre: 'Corea del Sur' },
  // África
  { codigo: '818', nombre: 'Egipto' },
  { codigo: '566', nombre: 'Nigeria' },
  { codigo: '710', nombre: 'Sudáfrica' },
  { codigo: '012', nombre: 'Argelia' },
  { codigo: '504', nombre: 'Marruecos' },
  // Oceanía
  { codigo: '036', nombre: 'Australia' },
  // Otro
  { codigo: '000', nombre: 'Otro país' },
]

export function nombrePais(codigo: string): string {
  return PAISES.find(p => p.codigo === codigo)?.nombre ?? codigo
}
