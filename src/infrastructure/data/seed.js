import { hashPassword } from "../security/password.js";

export const SEED_TECHNICIANS = [
  { id: "tech-ana", name: "Ana Souza", specialty: "Instalação residencial", active: 1 },
  { id: "tech-carlos", name: "Carlos Mendes", specialty: "Redes e cabeamento", active: 1 },
  { id: "tech-juliana", name: "Juliana Rocha", specialty: "Manutenção preventiva", active: 1 },
  { id: "tech-pedro", name: "Pedro Almeida", specialty: "Reparo em campo", active: 1 },
];

/** Senha de demonstração para todos os usuários seed. */
export const SEED_DEMO_PASSWORD = "123456";

export const SEED_USERS = [
  {
    id: "user-supervisor",
    username: "supervisor",
    displayName: "Supervisor TechRoute",
    role: "supervisor",
    technicianId: null,
  },
  {
    id: "user-ana",
    username: "ana",
    displayName: "Ana Souza",
    role: "technician",
    technicianId: "tech-ana",
  },
  {
    id: "user-carlos",
    username: "carlos",
    displayName: "Carlos Mendes",
    role: "technician",
    technicianId: "tech-carlos",
  },
  {
    id: "user-juliana",
    username: "juliana",
    displayName: "Juliana Rocha",
    role: "technician",
    technicianId: "tech-juliana",
  },
  {
    id: "user-pedro",
    username: "pedro",
    displayName: "Pedro Almeida",
    role: "technician",
    technicianId: "tech-pedro",
  },
];

export const SEED_SERVICE_TYPES = [
  { id: "svc-instalacao", name: "Instalação", description: "Instalação de equipamentos e infraestrutura" },
  { id: "svc-manutencao", name: "Manutenção", description: "Manutenção preventiva ou corretiva" },
  { id: "svc-reparo", name: "Reparo", description: "Diagnóstico e correção de falhas" },
  { id: "svc-vistoria", name: "Vistoria", description: "Avaliação técnica no local do cliente" },
];

export const SEED_RESOURCES = [
  {
    id: "res-cabo-utp",
    name: "Cabo UTP Cat6",
    category: "material",
    description: "Bobina ou metro de cabo de rede",
  },
  {
    id: "res-conectores-rj45",
    name: "Conectores RJ45",
    category: "material",
    description: "Pacote de conectores para crimpagem",
  },
  {
    id: "res-fita-isolante",
    name: "Fita isolante",
    category: "material",
    description: "Isolamento e organização de cabos",
  },
  {
    id: "res-parafusos-buchas",
    name: "Parafusos e buchas",
    category: "material",
    description: "Fixação em parede e estrutura",
  },
  {
    id: "res-alicate-crimpar",
    name: "Alicate de crimpar",
    category: "ferramenta",
    description: "Crimpagem de conectores RJ45",
  },
  {
    id: "res-multimetro",
    name: "Multímetro",
    category: "ferramenta",
    description: "Medição elétrica e continuidade",
  },
  {
    id: "res-furadeira",
    name: "Furadeira",
    category: "ferramenta",
    description: "Furos para instalação e fixação",
  },
  {
    id: "res-chave-fenda",
    name: "Jogo de chaves",
    category: "ferramenta",
    description: "Chaves de fenda e Philips",
  },
  {
    id: "res-roteador-teste",
    name: "Roteador de teste",
    category: "equipamento",
    description: "Validação de conexão no local",
  },
  {
    id: "res-notebook-campo",
    name: "Notebook de campo",
    category: "equipamento",
    description: "Configuração e diagnósticos",
  },
  {
    id: "res-medidor-sinal",
    name: "Medidor de sinal",
    category: "equipamento",
    description: "Análise de qualidade de sinal",
  },
  {
    id: "res-escada",
    name: "Escada telescópica",
    category: "equipamento",
    description: "Acesso a pontos altos",
  },
];

function startOfWeek(date = new Date()) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  value.setHours(12, 0, 0, 0);
  return value;
}

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildDemoAppointments(now = new Date()) {
  const weekStart = startOfWeek(now);
  const createdAt = now.toISOString();

  return [
    {
      id: "seed-appt-week-mon-ana",
      clientName: "Mercado Bom Preço",
      location: "Av. Paulista, 1000 — Bela Vista",
      phone: "(11) 91111-1001",
      phoneSecondary: "",
      email: "ti@mercadobompreco.local",
      visitDate: toIsoDate(addDays(weekStart, 0)),
      visitTime: "09:00",
      technicianId: "tech-ana",
      serviceTypeId: "svc-instalacao",
      notes: "Instalação de ponto de rede no caixa 3.",
      status: "open",
    },
    {
      id: "seed-appt-week-tue-carlos",
      clientName: "Clínica Vida Clara",
      location: "Rua Augusta, 450 — Consolação",
      phone: "(11) 92222-2002",
      phoneSecondary: "(11) 92222-2003",
      email: "facilities@vidaclara.local",
      visitDate: toIsoDate(addDays(weekStart, 1)),
      visitTime: "11:30",
      technicianId: "tech-carlos",
      serviceTypeId: "svc-manutencao",
      notes: "Manutenção do switch do consultório.",
      status: "in_progress",
      attendedAt: createdAt,
    },
    {
      id: "seed-appt-week-wed-juliana",
      clientName: "Padaria Sol Nascente",
      location: "Rua da Consolação, 220 — Centro",
      phone: "(11) 93333-3003",
      phoneSecondary: "",
      email: "contato@solnascente.local",
      visitDate: toIsoDate(addDays(weekStart, 2)),
      visitTime: "14:00",
      technicianId: "tech-juliana",
      serviceTypeId: "svc-vistoria",
      notes: "Vistoria pré-instalação de CFTV.",
      status: "open",
    },
    {
      id: "seed-appt-week-thu-pedro",
      clientName: "Escritório Lima & Souza",
      location: "Alameda Santos, 780 — Jardins",
      phone: "(11) 94444-4004",
      phoneSecondary: "",
      email: "ops@limasouza.local",
      visitDate: toIsoDate(addDays(weekStart, 3)),
      visitTime: "10:00",
      technicianId: "tech-pedro",
      serviceTypeId: "svc-reparo",
      notes: "Reparo no AP da sala de reunião.",
      status: "rebooked",
      rescheduleReason: "Cliente pediu remarcação para a tarde.",
      rescheduledAt: createdAt,
    },
    {
      id: "seed-appt-week-fri-ana",
      clientName: "Studio Foto Norte",
      location: "Rua Voluntários da Pátria, 500 — Santana",
      phone: "(11) 95555-5005",
      phoneSecondary: "",
      email: "studio@fotonorte.local",
      visitDate: toIsoDate(addDays(weekStart, 4)),
      visitTime: "16:30",
      technicianId: "tech-ana",
      serviceTypeId: "svc-manutencao",
      notes: "Checagem de cabeamento do estúdio.",
      status: "open",
    },
    {
      id: "seed-appt-next-mon-carlos",
      clientName: "Loja Byte Center",
      location: "Rua Teodoro Sampaio, 310 — Pinheiros",
      phone: "(11) 96666-6006",
      phoneSecondary: "",
      email: "suporte@bytecenter.local",
      visitDate: toIsoDate(addDays(weekStart, 7)),
      visitTime: "09:30",
      technicianId: "tech-carlos",
      serviceTypeId: "svc-instalacao",
      notes: "Instalação de access points no mezanino.",
      status: "open",
    },
    {
      id: "seed-appt-next-tue-juliana",
      clientName: "Condomínio Parque Verde",
      location: "Av. Brasil, 1500 — Jardim América",
      phone: "(11) 97777-7007",
      phoneSecondary: "(11) 97777-7008",
      email: "sindico@parqueverde.local",
      visitDate: toIsoDate(addDays(weekStart, 8)),
      visitTime: "13:00",
      technicianId: "tech-juliana",
      serviceTypeId: "svc-manutencao",
      notes: "Manutenção preventiva na portaria.",
      status: "open",
    },
    {
      id: "seed-appt-next-wed-pedro",
      clientName: "Escola Horizonte",
      location: "Rua Vergueiro, 900 — Liberdade",
      phone: "(11) 98888-8008",
      phoneSecondary: "",
      email: "ti@escolahorizonte.local",
      visitDate: toIsoDate(addDays(weekStart, 9)),
      visitTime: "10:30",
      technicianId: "tech-pedro",
      serviceTypeId: "svc-reparo",
      notes: "Diagnóstico da rede do laboratório.",
      status: "open",
    },
    {
      id: "seed-appt-next-thu-ana",
      clientName: "Café Aurora",
      location: "Rua Oscar Freire, 120 — Jardins",
      phone: "(11) 99999-9009",
      phoneSecondary: "",
      email: "gerente@cafeaurora.local",
      visitDate: toIsoDate(addDays(weekStart, 10)),
      visitTime: "15:00",
      technicianId: "tech-ana",
      serviceTypeId: "svc-vistoria",
      notes: "Vistoria para expansão do Wi-Fi.",
      status: "open",
    },
    {
      id: "seed-appt-next-fri-carlos",
      clientName: "Oficina Motor Fácil",
      location: "Av. do Estado, 2200 — Mooca",
      phone: "(11) 91212-1212",
      phoneSecondary: "",
      email: "oficina@motorfacil.local",
      visitDate: toIsoDate(addDays(weekStart, 11)),
      visitTime: "08:30",
      technicianId: "tech-carlos",
      serviceTypeId: "svc-instalacao",
      notes: "Instalação de câmeras na oficina.",
      status: "open",
    },
  ].map((item) => ({
    ...item,
    postVisitNotes: "",
    cancellationReason: "",
    cancelledAt: null,
    rescheduleReason: item.rescheduleReason || "",
    rescheduledAt: item.rescheduledAt || null,
    attendedAt: item.attendedAt || null,
    createdAt,
    updatedAt: createdAt,
  }));
}

export function seedCatalog(db) {
  const insertTechnician = db.prepare(`
    INSERT OR IGNORE INTO technicians (id, name, specialty, active)
    VALUES (@id, @name, @specialty, @active)
  `);
  const insertServiceType = db.prepare(`
    INSERT OR IGNORE INTO service_types (id, name, description)
    VALUES (@id, @name, @description)
  `);
  const insertResource = db.prepare(`
    INSERT OR IGNORE INTO resources (id, name, category, description)
    VALUES (@id, @name, @category, @description)
  `);
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, username, password_hash, display_name, role, technician_id, active)
    VALUES (@id, @username, @passwordHash, @displayName, @role, @technicianId, 1)
  `);
  const insertAppointment = db.prepare(`
    INSERT INTO appointments (
      id, client_name, location, phone, phone_secondary, email, visit_date, visit_time,
      technician_id, service_type_id, notes, post_visit_notes,
      status, cancellation_reason, cancelled_at,
      reschedule_reason, rescheduled_at, attended_at, created_at, updated_at
    ) VALUES (
      @id, @clientName, @location, @phone, @phoneSecondary, @email, @visitDate, @visitTime,
      @technicianId, @serviceTypeId, @notes, @postVisitNotes,
      @status, @cancellationReason, @cancelledAt,
      @rescheduleReason, @rescheduledAt, @attendedAt, @createdAt, @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      client_name = excluded.client_name,
      location = excluded.location,
      phone = excluded.phone,
      phone_secondary = excluded.phone_secondary,
      email = excluded.email,
      visit_date = excluded.visit_date,
      visit_time = excluded.visit_time,
      technician_id = excluded.technician_id,
      service_type_id = excluded.service_type_id,
      notes = excluded.notes,
      post_visit_notes = excluded.post_visit_notes,
      status = excluded.status,
      cancellation_reason = excluded.cancellation_reason,
      cancelled_at = excluded.cancelled_at,
      reschedule_reason = excluded.reschedule_reason,
      rescheduled_at = excluded.rescheduled_at,
      attended_at = excluded.attended_at,
      updated_at = excluded.updated_at
  `);
  const insertEvent = db.prepare(`
    INSERT OR IGNORE INTO appointment_events (
      id, appointment_id, event_type, reason, from_date, from_time, to_date, to_time,
      user_id, actor_name, created_at
    ) VALUES (
      @id, @appointmentId, @eventType, @reason, @fromDate, @fromTime, @toDate, @toTime,
      @userId, @actorName, @createdAt
    )
  `);
  const insertResourceLink = db.prepare(`
    INSERT OR IGNORE INTO appointment_resources (appointment_id, resource_id)
    VALUES (?, ?)
  `);

  const seed = db.transaction(() => {
    for (const technician of SEED_TECHNICIANS) {
      insertTechnician.run(technician);
    }
    for (const serviceType of SEED_SERVICE_TYPES) {
      insertServiceType.run(serviceType);
    }
    for (const resource of SEED_RESOURCES) {
      insertResource.run(resource);
    }

    const passwordHash = hashPassword(SEED_DEMO_PASSWORD);
    for (const user of SEED_USERS) {
      insertUser.run({
        id: user.id,
        username: user.username,
        passwordHash,
        displayName: user.displayName,
        role: user.role,
        technicianId: user.technicianId,
      });
    }

    for (const appointment of buildDemoAppointments()) {
      insertAppointment.run(appointment);
      insertEvent.run({
        id: `evt-created-${appointment.id}`,
        appointmentId: appointment.id,
        eventType: "created",
        reason: "",
        fromDate: null,
        fromTime: null,
        toDate: appointment.visitDate,
        toTime: appointment.visitTime,
        userId: "user-supervisor",
        actorName: "Supervisor TechRoute",
        createdAt: appointment.createdAt,
      });
      insertResourceLink.run(appointment.id, "res-cabo-utp");
      insertResourceLink.run(appointment.id, "res-notebook-campo");
    }
  });

  seed();
}
