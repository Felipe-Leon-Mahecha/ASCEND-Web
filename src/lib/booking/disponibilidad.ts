import type {
  Cita,
  DiaSemana,
  MotivoBloqueo,
  Profesional,
  RangoOcupado,
  Slot,
} from './types';

export const ESTADOS_OCUPAN: ReadonlySet<string> = new Set([
  'pendiente',
  'confirmada',
  'completada',
]);

export function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export function aMinutos(hhmmStr: string): number {
  const [h, m] = hhmmStr.split(':').map(Number);
  return h * 60 + m;
}

export function diaSemanaDe(fecha: string): DiaSemana {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay() as DiaSemana;
}

export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

export function rangoOcupado(c: Cita, bufferMin: number): RangoOcupado {
  return { inicio: c.inicio, fin: c.inicio + c.duracion + bufferMin };
}

export function citasDelDia(citas: Cita[], fecha: string, profesionalId?: string): Cita[] {
  return citas.filter(
    (c) => c.fecha === fecha && (!profesionalId || c.profesionalId === profesionalId),
  );
}

export function citasOcupantes(citas: Cita[], fecha: string, profesionalId: string): RangoOcupado[] {
  return citas
    .filter(
      (c) =>
        c.fecha === fecha &&
        c.profesionalId === profesionalId &&
        ESTADOS_OCUPAN.has(c.estado) &&
        !c.esWalkIn,
    )
    .map((c) => rangoOcupado(c, 0));
}

export function seSolapan(a: RangoOcupado, b: RangoOcupado): boolean {
  return a.inicio < b.fin && b.inicio < a.fin;
}

interface Opciones {
  fecha: string;
  profesional: Profesional;
  citas: Cita[];
  duracionMin: number;
  slotMin: number;
  bufferMin: number;
  capacidadDiaria?: number;
  minimoAnticipacionMin?: number;
  ahoraMin?: number | null;
  ahoraEsHoy?: boolean;
}

export function generarSlots(opts: Opciones): Slot[] {
  const {
    fecha,
    profesional,
    citas,
    duracionMin,
    slotMin,
    bufferMin,
    minimoAnticipacionMin = 60,
    ahoraMin = null,
    ahoraEsHoy = false,
  } = opts;

  const dia = diaSemanaDe(fecha);
  const horario = profesional.horarios.find((h) => h.dia === dia);

  if (!horario || !profesional.activo || duracionMin <= 0) return [];

  const ocupados = citasOcupantes(citas, fecha, profesional.id);
  const capacidad = opts.capacidadDiaria ?? profesional.capacidadDiaria;

  const usadas = citas
    .filter(
      (c) =>
        c.fecha === fecha &&
        c.profesionalId === profesional.id &&
        ESTADOS_OCUPAN.has(c.estado) &&
        !c.esWalkIn,
    )
    .length;

  if (capacidad > 0 && usadas >= capacidad) {
    const bloqueo: MotivoBloqueo = 'capacidad-dia';
    const slots: Slot[] = [];
    for (let i = horario.apertura; i + slotMin <= horario.cierre; i += slotMin) {
      slots.push({
        inicio: i,
        fin: i + slotMin,
        finServicio: i,
        disponible: false,
        motivo: bloqueo,
        choques: [],
      });
    }
    return slots;
  }

  const finMaximo = horario.cierre;
  const slots: Slot[] = [];

  for (let inicio = horario.apertura; inicio + slotMin <= finMaximo; inicio += slotMin) {
    const finServicio = inicio + duracionMin;
    const finBloqueo = finServicio + bufferMin;

    let disponible = true;
    let motivo: MotivoBloqueo | undefined;
    const choques: string[] = [];

    if (finBloqueo > finMaximo) {
      disponible = false;
      motivo = 'sobrepasa-cierre';
    }

    if (horario.pausa) {
      const enPausa = seSolapan(
        { inicio, fin: finBloqueo },
        { inicio: horario.pausa.inicio, fin: horario.pausa.fin },
      );
      if (enPausa) {
        disponible = false;
        motivo = 'pausa';
      }
    }

    const candidato: RangoOcupado = { inicio, fin: finBloqueo };
    for (const oc of ocupados) {
      if (seSolapan(candidato, oc)) {
        disponible = false;
        motivo = 'ocupado';
        choques.push(hhmm(oc.inicio));
      }
    }

    if (ahoraEsHoy && ahoraMin !== null) {
      const limite = ahoraMin + minimoAnticipacionMin;
      if (finServicio <= limite) {
        disponible = false;
        motivo = 'sin-anticipacion';
      }
    }

    slots.push({
      inicio,
      fin: inicio + slotMin,
      finServicio,
      disponible,
      motivo,
      choques,
    });
  }

  return slots;
}

export function resumenDia(citas: Cita[], fecha: string, profesionalId: string, capacidad: number) {
  const delDia = citas
    .filter(
      (c) =>
        c.fecha === fecha &&
        c.profesionalId === profesionalId &&
        ESTADOS_OCUPAN.has(c.estado),
    )
    .sort((a, b) => a.inicio - b.inicio);

  const conCita = delDia.filter((c) => !c.esWalkIn).length;
  const walkIns = delDia.filter((c) => c.esWalkIn).length;
  const ingresos = delDia
    .filter((c) => !c.esWalkIn && c.estado === 'completada')
    .reduce((acc, c) => acc + c.precio, 0);

  const ocupadoMin = delDia.reduce((acc, c) => acc + c.duracion, 0);

  return {
    total: delDia.length,
    conCita,
    walkIns,
    capacidad,
    disponibles: Math.max(0, capacidad - conCita),
    ocupacionPct: capacidad > 0 ? Math.round((conCita / capacidad) * 100) : 0,
    ingresos,
    ocupadoMin,
  };
}

export function proximasCitas(citas: Cita[], desdeFecha: string, limite = 5): Cita[] {
  return citas
    .filter((c) => c.fecha >= desdeFecha && ESTADOS_OCUPAN.has(c.estado))
    .sort((a, b) => (a.fecha === b.fecha ? a.inicio - b.inicio : a.fecha < b.fecha ? -1 : 1))
    .slice(0, limite);
}

export function detectarColisiones(citas: Cita[], profesionalId: string): Cita[][] {
  const grupos: Cita[][] = [];
  const porFecha = new Map<string, Cita[]>();

  for (const c of citas) {
    if (c.profesionalId !== profesionalId || !ESTADOS_OCUPAN.has(c.estado)) continue;
    const arr = porFecha.get(c.fecha) ?? [];
    arr.push(c);
    porFecha.set(c.fecha, arr);
  }

  for (const delDia of porFecha.values()) {
    delDia.sort((a, b) => a.inicio - b.inicio);
    let grupo: Cita[] = [];
    let finPrevio = -1;

    for (const c of delDia) {
      if (c.inicio < finPrevio) {
        grupo.push(c);
      } else {
        if (grupo.length > 1) grupos.push(grupo);
        grupo = [c];
      }
      finPrevio = Math.max(finPrevio, c.inicio + c.duracion);
    }
    if (grupo.length > 1) grupos.push(grupo);
  }

  return grupos;
}
