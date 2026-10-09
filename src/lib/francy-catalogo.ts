import raw from '../data/francy-servicios.json';

export interface Variante {
  id: string;
  nombre: string;
  precio: number;
  duracion_min: number | null;
}

export interface Servicio {
  id: string;
  categoria: string;
  nombre: string;
  descripcion: string;
  destacado?: boolean;
  variantes: Variante[];
}

export interface Categoria {
  id: string;
  nombre: string;
  icono: string;
  orden: number;
}

export interface Catalogo {
  version: number;
  moneda: string;
  fuente: string;
  duraciones_confirmadas: boolean;
  slot_min: number;
  buffer_min: number;
  categorias: Categoria[];
  servicios: Servicio[];
}

export const catalogo = raw as Catalogo;

export const categorias = [...catalogo.categorias].sort((a, b) => a.orden - b.orden);

export const serviciosPorCategoria = categorias.map((cat) => ({
  ...cat,
  servicios: catalogo.servicios.filter((s) => s.categoria === cat.id),
}));

export const precioMin = (s: Servicio) => Math.min(...s.variantes.map((v) => v.precio));
export const precioMax = (s: Servicio) => Math.max(...s.variantes.map((v) => v.precio));
export const esRango = (s: Servicio) => precioMin(s) !== precioMax(s);

export const totalOpciones = catalogo.servicios.reduce(
  (acc, s) => acc + s.variantes.length,
  0,
);

export function formatearPrecio(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
}

export function formatearPrecioServicio(s: Servicio): string {
  return esRango(s)
    ? `${formatearPrecio(precioMin(s))} – ${formatearPrecio(precioMax(s))}`
    : formatearPrecio(precioMin(s));
}

export function formatearDuracion(min: number | null): string {
  if (min === null) return 'Por confirmar';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export const DURACIONES_PENDIENTES = !catalogo.duraciones_confirmadas;
export const duracionFalta = catalogo.servicios.some((s) =>
  s.variantes.some((v) => v.duracion_min === null),
);
