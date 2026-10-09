import type { Cita, Profesional } from './types';

const K_PROFESIONALES = 'flws:francy:profesionales:v1';
const K_CITAS = 'flws:francy:citas:v1';
const K_CONFIG = 'flws:francy:config:v1';

export interface AgendaConfig {
  slotMin: number;
  bufferMin: number;
  minimoAnticipacionMin: number;
  maximoAnticipacionDias: number;
  activo: boolean;
}

export interface FiltroCitas {
  desde?: string;
  hasta?: string;
  profesionalId?: string;
}

export interface Repositorio {
  profesionales: {
    listar(): Promise<Profesional[]>;
    guardar(p: Profesional): Promise<void>;
    eliminar(id: string): Promise<void>;
  };
  citas: {
    listar(filtros?: FiltroCitas): Promise<Cita[]>;
    guardar(c: Cita): Promise<void>;
    eliminar(id: string): Promise<void>;
  };
  config: {
    leer(): Promise<AgendaConfig>;
    guardar(parcial: Partial<AgendaConfig>): Promise<void>;
  };
  vaciarTodo(): Promise<void>;
}

export const CONFIG_POR_DEFECTO: AgendaConfig = {
  slotMin: 15,
  bufferMin: 10,
  minimoAnticipacionMin: 60,
  maximoAnticipacionDias: 60,
  activo: true,
};

function leer<T>(clave: string, porDefecto: T): T {
  try {
    const raw = localStorage.getItem(clave);
    if (!raw) return porDefecto;
    return JSON.parse(raw) as T;
  } catch {
    return porDefecto;
  }
}

function escribir(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* cuota llena o modo privado: el panel sigue funcionando en memoria */
  }
}

class RepositorioLocal implements Repositorio {
  profesionales = {
    listar: async (): Promise<Profesional[]> => {
      return leer<Profesional[]>(K_PROFESIONALES, []);
    },
    guardar: async (p: Profesional): Promise<void> => {
      const lista = leer<Profesional[]>(K_PROFESIONALES, []);
      const i = lista.findIndex((x) => x.id === p.id);
      if (i >= 0) lista[i] = p;
      else lista.push(p);
      escribir(K_PROFESIONALES, lista);
    },
    eliminar: async (id: string): Promise<void> => {
      const lista = leer<Profesional[]>(K_PROFESIONALES, []).filter((p) => p.id !== id);
      escribir(K_PROFESIONALES, lista);
    },
  };

  citas = {
    listar: async (filtros: FiltroCitas = {}): Promise<Cita[]> => {
      const todas = leer<Cita[]>(K_CITAS, []);
      return todas.filter((c) => {
        if (filtros.profesionalId && c.profesionalId !== filtros.profesionalId) return false;
        if (filtros.desde && c.fecha < filtros.desde) return false;
        if (filtros.hasta && c.fecha > filtros.hasta) return false;
        return true;
      });
    },
    guardar: async (c: Cita): Promise<void> => {
      const lista = leer<Cita[]>(K_CITAS, []);
      const i = lista.findIndex((x) => x.id === c.id);
      if (i >= 0) lista[i] = c;
      else lista.push(c);
      escribir(K_CITAS, lista);
    },
    eliminar: async (id: string): Promise<void> => {
      const lista = leer<Cita[]>(K_CITAS, []).filter((c) => c.id !== id);
      escribir(K_CITAS, lista);
    },
  };

  config = {
    leer: async (): Promise<AgendaConfig> => {
      return { ...CONFIG_POR_DEFECTO, ...leer<Partial<AgendaConfig>>(K_CONFIG, {}) };
    },
    guardar: async (parcial: Partial<AgendaConfig>): Promise<void> => {
      const actual = { ...CONFIG_POR_DEFECTO, ...leer<Partial<AgendaConfig>>(K_CONFIG, {}) };
      escribir(K_CONFIG, { ...actual, ...parcial });
    },
  };

  async vaciarTodo(): Promise<void> {
    escribir(K_PROFESIONALES, []);
    escribir(K_CITAS, []);
    escribir(K_CONFIG, {});
  }
}

let instancia: Repositorio | undefined;

export function crearRepositorio(): Repositorio {
  if (!instancia) instancia = new RepositorioLocal();
  return instancia;
}
