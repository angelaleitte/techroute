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
  });

  seed();
}
