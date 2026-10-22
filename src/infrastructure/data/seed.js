export const SEED_TECHNICIANS = [
  { id: "tech-ana", name: "Ana Souza", specialty: "Instalação residencial", active: 1 },
  { id: "tech-carlos", name: "Carlos Mendes", specialty: "Redes e cabeamento", active: 1 },
  { id: "tech-juliana", name: "Juliana Rocha", specialty: "Manutenção preventiva", active: 1 },
  { id: "tech-pedro", name: "Pedro Almeida", specialty: "Reparo em campo", active: 1 },
];

export const SEED_SERVICE_TYPES = [
  { id: "svc-instalacao", name: "Instalação", description: "Instalação de equipamentos e infraestrutura" },
  { id: "svc-manutencao", name: "Manutenção", description: "Manutenção preventiva ou corretiva" },
  { id: "svc-reparo", name: "Reparo", description: "Diagnóstico e correção de falhas" },
  { id: "svc-vistoria", name: "Vistoria", description: "Avaliação técnica no local do cliente" },
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

  const seed = db.transaction(() => {
    for (const technician of SEED_TECHNICIANS) {
      insertTechnician.run(technician);
    }
    for (const serviceType of SEED_SERVICE_TYPES) {
      insertServiceType.run(serviceType);
    }
  });

  seed();
}
