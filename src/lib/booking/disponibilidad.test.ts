import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  citasOcupantes,
  detectarColisiones,
  diaSemanaDe,
  generarSlots,
  hhmm,
  rangoOcupado,
  resumenDia,
  seSolapan,
  sumarDias,
} from './disponibilidad.ts';
import type { Cita, Profesional } from './types.ts';

const LUNES_A_VIERNES = [1, 2, 3, 4, 5].map((d) => ({
  dia: d as 1 | 2 | 3 | 4 | 5,
  apertura: 9 * 60,
  cierre: 18 * 60,
}));

const SATURDAY = [{ dia: 6 as const, apertura: 9 * 60, cierre: 14 * 60 }];

const profesional: Profesional = {
  id: 'p1',
  nombre: 'Francy',
  activo: true,
  color: '#8BA99A',
  horarios: [...LUNES_A_VIERNES, ...SATURDAY],
  serviciosIds: ['manos-semipermanente'],
  capacidadDiaria: 7,
};

function cita(over: Partial<Cita> = {}): Cita {
  return {
    id: 'c1',
    profesionalId: 'p1',
    servicioId: 'manos-semipermanente',
    varianteId: 'estandar',
    varianteNombre: 'Estándar',
    clienteNombre: 'Ana',
    clienteTelefono: '3000000000',
    fecha: '2026-10-05',
    inicio: 10 * 60,
    duracion: 60,
    precio: 50000,
    estado: 'pendiente',
    creadaEn: '2026-10-01',
    ...over,
  };
}

function opts(over: Record<string, unknown> = {}) {
  return {
    fecha: '2026-10-05',
    profesional,
    citas: [],
    duracionMin: 60,
    slotMin: 15,
    bufferMin: 10,
    ahoraMin: null,
    ahoraEsHoy: false,
    ...over,
  } as Parameters<typeof generarSlots>[0];
}

test('hhmm convierte minutos a hora legible', () => {
  assert.equal(hhmm(0), '00:00');
  assert.equal(hhmm(9 * 60), '09:00');
  assert.equal(hhmm(13 * 60 + 30), '13:30');
});

test('diaSemanaDe calcula el dia correcto sin desfase de zona horaria', () => {
  assert.equal(diaSemanaDe('2026-10-05'), 1);
  assert.equal(diaSemanaDe('2026-10-10'), 6);
  assert.equal(diaSemanaDe('2026-10-11'), 0);
});

test('sumarDias atraviesa el cambio de mes', () => {
  assert.equal(sumarDias('2026-10-31', 1), '2026-11-01');
  assert.equal(sumarDias('2026-12-31', 1), '2027-01-01');
});

test('seSolapan detecta solapamiento real y no toca los bordes', () => {
  assert.equal(seSolapan({ inicio: 0, fin: 60 }, { inicio: 30, fin: 90 }), true);
  assert.equal(seSolapan({ inicio: 0, fin: 60 }, { inicio: 60, fin: 90 }), false);
  assert.equal(seSolapan({ inicio: 0, fin: 60 }, { inicio: 90, fin: 120 }), false);
});

test('un dia sin horario no genera slots', () => {
  assert.deepEqual(generarSlots(opts({ fecha: '2026-10-11' })), []);
});

test('un profesional inactivo no genera slots', () => {
  assert.deepEqual(
    generarSlots(opts({ profesional: { ...profesional, activo: false } })),
    [],
  );
});

test('el ultimo slot del dia queda marcado cuando el servicio no cabe', () => {
  const slots = generarSlots(opts({ duracionMin: 60, bufferMin: 10 }));
  const ultimo = slots[slots.length - 1];

  assert.equal(ultimo.motivo, 'sobrepasa-cierre');
  assert.equal(ultimo.disponible, false);

  const ultimoLibre = [...slots].reverse().find((s) => s.disponible);
  assert.ok(ultimoLibre);
  assert.ok(
    ultimoLibre.finServicio + 10 <= 18 * 60,
    'el servicio del ultimo slot libre debe caber con buffer antes del cierre',
  );
});

test('con duracion 60 y buffer 10 el primer slot libre es 09:00', () => {
  const slots = generarSlots(opts());
  const libre = slots.find((s) => s.disponible);
  assert.equal(libre?.inicio, 9 * 60);
});

test('una cita bloquea su hora, las anteriores y las siguientes por el buffer', () => {
  const slots = generarSlots(opts({ citas: [cita({ inicio: 10 * 60, duracion: 60 })] }));

  // Cita 10:00-11:00 + 10 min de buffer.
  // Un servicio de 60 min + 10 min de buffer necesita terminar a las 10:00,
  // por eso el turno de las 09:00 tambien queda bloqueado.
  const bloqueados = slots.filter((s) => !s.disponible && s.motivo === 'ocupado');

  assert.equal(bloqueados.length, 8);
  assert.equal(bloqueados[0].inicio, 9 * 60);
  assert.equal(bloqueados[7].inicio, 10 * 60 + 45);

  const siguiente = slots.find((s) => s.inicio === 11 * 60);
  assert.equal(siguiente?.disponible, true);
});

test('un servicio largo bloquea mas cupos que uno corto', () => {
  const corto = generarSlots(opts({ duracionMin: 30, citas: [cita()] }));
  const largo = generarSlots(opts({ duracionMin: 120, citas: [cita()] }));

  const libresCorto = corto.filter((s) => s.disponible).length;
  const libresLargo = largo.filter((s) => s.disponible).length;

  assert.ok(libresLargo < libresCorto);
});

test('las citas canceladas no bloquean', () => {
  const slots = generarSlots(
    opts({ citas: [cita({ estado: 'cancelada' })] }),
  );
  assert.equal(slots.filter((s) => s.motivo === 'ocupado').length, 0);
});

test('las citas completadas si bloquean', () => {
  const slots = generarSlots(opts({ citas: [cita({ estado: 'completada' })] }));
  assert.ok(slots.filter((s) => s.motivo === 'ocupado').length > 0);
});

test('los walk-in no bloquean agenda online', () => {
  const slots = generarSlots(opts({ citas: [cita({ esWalkIn: true })] }));
  assert.equal(slots.filter((s) => s.motivo === 'ocupado').length, 0);
});

test('la pausa del almuerzo bloquea los slots que la tocan', () => {
  const conPausa: Profesional = {
    ...profesional,
    horarios: [{ dia: 1, apertura: 9 * 60, cierre: 18 * 60, pausa: { inicio: 12 * 60, fin: 13 * 60 } }],
  };
  const slots = generarSlots(opts({ profesional: conPausa }));

  assert.ok(slots.find((s) => s.inicio === 12 * 60)?.motivo === 'pausa');
  assert.equal(slots.find((s) => s.inicio === 13 * 60)?.disponible, true);
});

test('hoy no ofrece slots pasados ni dentro del anticipo minimo', () => {
  const slots = generarSlots(
    opts({ ahoraEsHoy: true, ahoraMin: 14 * 60, minimoAnticipacionMin: 120 }),
  );

  const de = (min: number) => slots.find((s) => s.inicio === min);

  // son las 14:00 y se exigen 2 h de anticipacion => nada que termine antes de las 16:00
  assert.equal(de(14 * 60)?.motivo, 'sin-anticipacion');
  assert.equal(de(14 * 60)?.disponible, false);

  // las 15:00 terminan el servicio justo a las 16:00, sigue siendo demasiado tarde
  assert.equal(de(15 * 60)?.motivo, 'sin-anticipacion');

  // las 15:15 terminan a las 16:15 => ya cumple
  assert.equal(de(15 * 60 + 15)?.disponible, true);
  assert.equal(de(15 * 60 + 15)?.motivo, undefined);

  // una hora de la manana que ya paso no se ofrece nunca
  assert.equal(de(10 * 60)?.motivo, 'sin-anticipacion');
  assert.equal(de(9 * 60)?.motivo, 'sin-anticipacion');
});

test('los dias futuros ignoran la hora actual', () => {
  const slots = generarSlots(
    opts({ ahoraEsHoy: false, ahoraMin: 23 * 60, minimoAnticipacionMin: 120 }),
  );
  assert.ok(slots.filter((s) => s.disponible).length > 0);
});

test('la capacidad diaria se respeta: 7 citas y no se ofrece mas', () => {
  const citas = Array.from({ length: 7 }, (_, i) =>
    cita({ id: `c${i}`, inicio: 9 * 60 + i * 60, duracion: 30 }),
  );
  const slots = generarSlots(opts({ citas, duracionMin: 30 }));

  assert.equal(slots.filter((s) => s.disponible).length, 0);
  assert.ok(slots.every((s) => s.motivo === 'capacidad-dia'));
});

test('la capacidad se cuenta por profesional, no global', () => {
  const citas = [
    ...Array.from({ length: 7 }, (_, i) =>
      cita({ id: `a${i}`, inicio: 9 * 60 + i * 60, duracion: 30 }),
    ),
    cita({ id: 'otra', profesionalId: 'p2', inicio: 9 * 60, duracion: 60 }),
  ];
  const slots = generarSlots(opts({ citas, duracionMin: 30 }));
  assert.equal(slots.filter((s) => s.disponible).length, 0);
});

test('las citas de otro dia no bloquean', () => {
  const slots = generarSlots(
    opts({ citas: [cita({ fecha: '2026-10-06' })], duracionMin: 60 }),
  );
  assert.equal(slots.filter((s) => s.motivo === 'ocupado').length, 0);
});

test('rangoOcupado y citasOcupantes alinean el buffer correctamente', () => {
  const c = cita({ inicio: 600, duracion: 60 });
  assert.deepEqual(rangoOcupado(c, 10), { inicio: 600, fin: 670 });
  assert.deepEqual(citasOcupantes([c], '2026-10-05', 'p1'), [{ inicio: 600, fin: 660 }]);
  assert.equal(citasOcupantes([c], '2026-10-05', 'p2').length, 0);
});

test('detectarColisiones encuentra el doble booking', () => {
  const citas = [
    cita({ id: 'a', inicio: 10 * 60, duracion: 60 }),
    cita({ id: 'b', inicio: 10 * 60 + 30, duracion: 60 }),
    cita({ id: 'c', inicio: 14 * 60, duracion: 60 }),
  ];
  const grupos = detectarColisiones(citas, 'p1');
  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].length, 2);
});

test('detectarColisiones no inventa choques en dias separados', () => {
  const citas = [
    cita({ id: 'a', inicio: 10 * 60, duracion: 60, fecha: '2026-10-05' }),
    cita({ id: 'b', inicio: 10 * 60, duracion: 60, fecha: '2026-10-06' }),
  ];
  assert.equal(detectarColisiones(citas, 'p1').length, 0);
});

test('resumenDia separa citas online de walk-ins y calcula ocupacion', () => {
  const citas = [
    cita({ id: 'a', inicio: 9 * 60, duracion: 60, precio: 50000, estado: 'completada' }),
    cita({ id: 'b', inicio: 11 * 60, duracion: 60, precio: 80000, estado: 'pendiente' }),
    cita({ id: 'w', inicio: 12 * 60, duracion: 30, esWalkIn: true, estado: 'completada' }),
  ];
  const r = resumenDia(citas, '2026-10-05', 'p1', 7);

  assert.equal(r.total, 3);
  assert.equal(r.conCita, 2);
  assert.equal(r.walkIns, 1);
  assert.equal(r.disponibles, 5);
  assert.equal(r.ocupacionPct, 29);
  assert.equal(r.ingresos, 50000);
  assert.equal(r.ocupadoMin, 150);
});

test('generarSlots devuelve slots cada step de slotMin', () => {
  const slots = generarSlots(opts({ slotMin: 30 }));
  const increments = new Set(slots.slice(1).map((s, i) => s.inicio - slots[i].inicio));
  assert.deepEqual([...increments], [30]);
});
