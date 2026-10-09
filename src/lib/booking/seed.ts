import type { Cita, HorarioLaboral, Profesional } from './types';
import { diaSemanaDe, sumarDias } from './disponibilidad.ts';

export const PALETA = ['#8BA99A', '#E8A090', '#6D5BFF'] as const;

function semana(abre: number, cierra: number, pausa?: [number, number]): HorarioLaboral[] {
  return [1, 2, 3, 4, 5].map((dia) => ({
    dia: dia as 1 | 2 | 3 | 4 | 5,
    apertura: abre,
    cierre: cierra,
    ...(pausa ? { pausa: { inicio: pausa[0], fin: pausa[1] } } : {}),
  }));
}

export function profesionalesDemo(): Profesional[] {
  return [
    {
      id: 'pro-francy',
      nombre: 'Francy Molano',
      activo: true,
      color: PALETA[0],
      horarios: semana(9 * 60, 18 * 60, [13 * 60, 14 * 60]),
      serviciosIds: [
        'manos-esculpida-acrilico',
        'manos-esculpida-polygel',
        'manos-softgel',
        'manos-semipermanente',
        'pies-semipermanente',
        'pestanas-pelo-a-pelo',
        'cejas-laminado',
      ],
      capacidadDiaria: 7,
    },
    {
      id: 'pro-kelly',
      nombre: 'Kelly Ortiz',
      activo: true,
      color: PALETA[1],
      horarios: semana(10 * 60, 19 * 60),
      serviciosIds: [
        'manos-dipping',
        'manos-base-rubber',
        'manos-semipermanente',
        'manos-tradicional',
        'pestanas-punto-a-punto',
        'depilacion-axila',
        'depilacion-bikini-medio',
      ],
      capacidadDiaria: 7,
    },
    {
      id: 'pro-isabel',
      nombre: 'Isabel Rojas',
      activo: true,
      color: PALETA[2],
      horarios: [...semana(9 * 60, 14 * 60), { dia: 6, apertura: 9 * 60, cierre: 13 * 60 }],
      serviciosIds: [
        'manos-tradicional',
        'pies-tradicional',
        'pestanas-lifting',
        'cejas-depilacion',
        'cejas-henna',
        'depilacion-beso',
      ],
      capacidadDiaria: 5,
    },
  ];
}

interface PlantillaCita {
  profesionalId: string;
  inicio: number;
  duracion: number;
  precio: number;
  servicioId: string;
  varianteId: string;
  varianteNombre: string;
  cliente: string;
  telefono: string;
  estado?: Cita['estado'];
  esWalkIn?: boolean;
}

const CLIENTES = [
  'Ana María Restrepo',
  'Laura Gómez',
  'Sara Mendoza',
  'Carolina Ríos',
  'Andrea Silva',
  'Valentina Cruz',
  'Daniela Pérez',
  'Camila Torres',
  'Mariana López',
  'Jessica Duarte',
  'Sofía Cárdenas',
  'Isabella Núñez',
  'Lucia Vargas',
  'Paula Hernández',
  'Natalia Ortiz',
  'Gabriela Rojas',
];

const PLANTILLA: PlantillaCita[] = [
  { profesionalId: 'pro-francy', inicio: 9 * 60, duracion: 120, precio: 110000, servicioId: 'manos-esculpida-acrilico', varianteId: 'estandar', varianteNombre: 'Estándar', cliente: CLIENTES[0], telefono: '3105550101' },
  { profesionalId: 'pro-francy', inicio: 11 * 60 + 30, duracion: 60, precio: 50000, servicioId: 'manos-semipermanente', varianteId: 'estandar', varianteNombre: 'Estándar', cliente: CLIENTES[1], telefono: '3105550102' },
  { profesionalId: 'pro-francy', inicio: 14 * 60 + 30, duracion: 90, precio: 100000, servicioId: 'pestanas-pelo-a-pelo', varianteId: '3d', varianteNombre: '3D o tecnológico', cliente: CLIENTES[2], telefono: '3105550103' },
  { profesionalId: 'pro-francy', inicio: 16 * 60 + 15, duracion: 30, precio: 12000, servicioId: 'cejas-depilacion', varianteId: 'estandar', varianteNombre: 'Estándar', cliente: CLIENTES[3], telefono: '3105550104' },

  { profesionalId: 'pro-kelly', inicio: 10 * 60, duracion: 90, precio: 65000, servicioId: 'manos-dipping', varianteId: 'estandar', varianteNombre: 'Estándar', cliente: CLIENTES[4], telefono: '3105550105' },
  { profesionalId: 'pro-kelly', inicio: 12 * 60, duracion: 45, precio: 20000, servicioId: 'manos-secado-rapido', varianteId: 'estandar', varianteNombre: 'Estándar', cliente: CLIENTES[5], telefono: '3105550106' },
  { profesionalId: 'pro-kelly', inicio: 13 * 60, duracion: 60, precio: 55000, servicioId: 'pies-semipermanente', varianteId: 'estandar', varianteNombre: 'Estándar', cliente: CLIENTES[6], telefono: '3105550107' },
  { profesionalId: 'pro-kelly', inicio: 15 * 60, duracion: 75, precio: 40000, servicioId: 'depilacion-bikini-completo', varianteId: 'estandar', varianteNombre: 'Estándar', cliente: CLIENTES[7], telefono: '3105550108' },
  { profesionalId: 'pro-kelly', inicio: 17 * 60, duracion: 30, precio: 8000, servicioId: 'depilacion-beso', varianteId: 'estandar', varianteNombre: 'Estándar', cliente: CLIENTES[8], telefono: '3105550109' },

  { profesionalId: 'pro-isabel', inicio: 9 * 60 + 30, duracion: 60, precio: 18000, servicioId: 'manos-tradicional', varianteId: 'estandar', varianteNombre: 'Estándar', cliente: CLIENTES[9], telefono: '3105550110' },
  { profesionalId: 'pro-isabel', inicio: 11 * 60, duracion: 45, precio: 22000, servicioId: 'pestanas-lifting', varianteId: 'estandar', varianteNombre: 'Estándar', cliente: CLIENTES[10], telefono: '3105550111' },
  { profesionalId: 'pro-isabel', inicio: 12 * 60 + 30, duracion: 20, precio: 8000, servicioId: 'depilacion-beso', varianteId: 'estandar', varianteNombre: 'Estándar', cliente: CLIENTES[11], telefono: '3105550112', esWalkIn: true },
];

export function citasDemo(ancla = new Date()): Cita[] {
  const hoy = ancla.toISOString().slice(0, 10);
  const citas: Cita[] = [];
  const todos = profesionalesDemo();
  let n = 0;

  for (let offset = -21; offset <= 28; offset++) {
    const fecha = sumarDias(hoy, offset);
    const dia = diaSemanaDe(fecha);
    if (dia === 0) continue;

    const esSabado = dia === 6;
    const base = esSabado ? PLANTILLA.filter((p) => p.profesionalId === 'pro-isabel') : PLANTILLA;

    for (const plantilla of base) {
      const profesional = todos.find((p) => p.id === plantilla.profesionalId);
      if (!profesional || !profesional.activo) continue;

      const horario = profesional.horarios.find((h) => h.dia === dia);
      if (!horario) continue;

      const paso = Math.abs(offset);
      if (paso % 3 !== 0 && Math.random() > 0.72) continue;

      if (plantilla.inicio + plantilla.duracion > horario.cierre) continue;

      if (
        horario.pausa &&
        plantilla.inicio < horario.pausa.fin &&
        plantilla.inicio + plantilla.duracion > horario.pausa.inicio
      ) {
        continue;
      }

      let estado: Cita['estado'] = 'pendiente';
      if (offset < 0) estado = Math.random() > 0.12 ? 'completada' : 'no_asistio';
      else if (offset === 0) estado = plantilla.inicio < 11 * 60 ? 'completada' : 'pendiente';
      else if (Math.random() > 0.3) estado = 'confirmada';

      n++;
      citas.push({
        id: `demo-${n}`,
        profesionalId: plantilla.profesionalId,
        servicioId: plantilla.servicioId,
        varianteId: plantilla.varianteId,
        varianteNombre: plantilla.varianteNombre,
        clienteNombre: plantilla.cliente,
        clienteTelefono: plantilla.telefono,
        fecha,
        inicio: plantilla.inicio,
        duracion: plantilla.duracion,
        precio: plantilla.precio,
        estado,
        creadaEn: `${sumarDias(fecha, -2)}T10:00:00.000Z`,
        esWalkIn: plantilla.esWalkIn,
      });
    }
  }

  return citas;
}
