import assert from 'node:assert/strict';
import { test } from 'node:test';

import { citasDemo, PALETA, profesionalesDemo } from './seed.ts';
import { diaSemanaDe, seSolapan } from './disponibilidad.ts';

const profesionales = profesionalesDemo();
const citas = citasDemo(new Date('2026-10-05T12:00:00Z'));

test('la demo trae exactamente 3 profesionales con colores distintos', () => {
  assert.equal(profesionales.length, 3);
  assert.equal(new Set(profesionales.map((p) => p.color)).size, 3);
  assert.deepEqual(profesionales.map((p) => p.color), [...PALETA]);
});

test('la demo genera una agenda con volumen realista', () => {
  assert.ok(citas.length > 60, `esperaba mas de 60 citas, hay ${citas.length}`);
});

test('ninguna cita termina despues del cierre de su profesional', () => {
  for (const c of citas) {
    const pro = profesionales.find((p) => p.id === c.profesionalId);
    assert.ok(pro, `profesional inexistente en la cita ${c.id}`);
    const h = pro.horarios.find((x) => x.dia === diaSemanaDe(c.fecha));
    assert.ok(h, `la cita ${c.id} cae en un dia en que ${pro.nombre} no trabaja`);
    assert.ok(
      c.inicio + c.duracion <= h.cierre,
      `la cita ${c.id} termina ${c.inicio + c.duracion} despues del cierre ${h.cierre}`,
    );
  }
});

test('ninguna cita se come la pausa de almuerzo', () => {
  for (const c of citas) {
    const pro = profesionales.find((p) => p.id === c.profesionalId);
    const h = pro?.horarios.find((x) => x.dia === diaSemanaDe(c.fecha));
    if (!h?.pausa) continue;
    const choca = seSolapan(
      { inicio: c.inicio, fin: c.inicio + c.duracion },
      { inicio: h.pausa.inicio, fin: h.pausa.fin },
    );
    assert.equal(choca, false, `la cita ${c.id} pisa la pausa`);
  }
});

test('no hay doble booking: dos citas activas del mismo profesional no se pisan', () => {
  const activas = citas.filter((c) => ['pendiente', 'confirmada', 'completada'].includes(c.estado));
  const porPro = new Map<string, typeof citas>();

  for (const c of activas) {
    const arr = porPro.get(c.profesionalId) ?? [];
    arr.push(c);
    porPro.set(c.profesionalId, arr);
  }

  for (const [proId, lista] of porPro) {
    const delDia = new Map<string, typeof citas>();
    for (const c of lista) {
      const arr = delDia.get(c.fecha) ?? [];
      arr.push(c);
      delDia.set(c.fecha, arr);
    }
    for (const [fecha, arr] of delDia) {
      arr.sort((a, b) => a.inicio - b.inicio);
      for (let i = 1; i < arr.length; i++) {
        const prev = arr[i - 1];
        const cur = arr[i];
        assert.ok(
          cur.inicio >= prev.inicio + prev.duracion,
          `choque el ${fecha} con ${proId}: ${prev.inicio}+${prev.duracion} vs ${cur.inicio}`,
        );
      }
    }
  }
});

test('solo los profesionales activos reciben citas', () => {
  for (const p of profesionales.filter((x) => !x.activo)) {
    assert.equal(citas.filter((c) => c.profesionalId === p.id).length, 0);
  }
});

test('los domingos no tienen citas', () => {
  for (const c of citas) {
    assert.notEqual(diaSemanaDe(c.fecha), 0, `hay cita el domingo ${c.fecha}`);
  }
});

test('las citas pasadas quedan completadas o marcadas como no asistio', () => {
  const hoy = '2026-10-05';
  for (const c of citas.filter((x) => x.fecha < hoy)) {
    assert.ok(
      ['completada', 'no_asistio'].includes(c.estado),
      `la cita pasada ${c.id} quedo en estado ${c.estado}`,
    );
  }
});

test('cada profesional tiene un horario por cada dia que atiende', () => {
  for (const p of profesionales) {
    assert.ok(p.horarios.length > 0, `${p.nombre} no tiene horarios`);
    for (const h of p.horarios) {
      assert.ok(h.cierre > h.apertura, `horario invalido en ${p.nombre}`);
      if (h.pausa) {
        assert.ok(
          h.pausa.inicio >= h.apertura && h.pausa.fin <= h.cierre,
          `la pausa de ${p.nombre} se sale del horario`,
        );
      }
    }
  }
});
