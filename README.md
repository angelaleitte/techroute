# TechRoute | Aplicativo de Agendamento e Logística Técnica

<p align="center">
  <img src="assets/readme/00-hero-wide.png" alt="TechRoute — agenda de visitas com status e filtros (tema claro)" width="920" />
</p>

<p align="center">
  <strong>Agende visitas técnicas com clareza.</strong><br />
  A home é a lista de visitas; inclusão e edição abrem em <strong>modal</strong> — com tema claro e escuro.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/entreg%C3%A1veis-4-ccff00?style=flat-square&labelColor=0b0c0f" alt="4 entregáveis" />
  <img src="https://img.shields.io/badge/atual-3.1%20Notas%20p%C3%B3s--visita-ccff00?style=flat-square&labelColor=0b0c0f" alt="Tarefa atual" />
  <img src="https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JS-0b0c0f?style=flat-square" alt="Stack" />
  <img src="https://img.shields.io/badge/backend-Node.js%20%2B%20Express-0b0c0f?style=flat-square" alt="Backend" />
  <img src="https://img.shields.io/badge/banco-SQLite-0b0c0f?style=flat-square" alt="Banco" />
  <img src="https://img.shields.io/badge/arquitetura-Clean%20Architecture-ccff00?style=flat-square&labelColor=0b0c0f" alt="Arquitetura" />
  <img src="https://img.shields.io/badge/design-Lime%20Night-ccff00?style=flat-square&labelColor=0b0c0f" alt="Design System" />
</p>

---

## Sobre o projeto

O **TechRoute** é um aplicativo web para **agendamento de visitas técnicas** e apoio à logística de campo.  
Foi desenvolvido como entrega de estágio **em etapas**: o repositório evolui de forma contínua; cada tarefa/entregável marca o que já está aceito naquele marco (tag Git).

### Fluxo de inclusão (versão atual)

Nesta versão, a tela inicial é a **agenda de Visitas** (cards ou tabela).  
A **inclusão de dados** (nova visita) e a **edição / visualização** acontecem em um **modal**, sem sair da lista:

1. A home lista as visitas já registradas (filtros por cliente e status, ordenação, modos card/lista).  
2. O botão **+** (Nova visita) abre o formulário em modal.  
3. Visualizar (olho) abre o mesmo modal em modo leitura; a partir dele é possível editar.  
4. No formulário, o **Checklist de recursos** permite marcar materiais, ferramentas e equipamentos da visita.  
5. Cancelar ou **Reagendar** visita também usam modal (motivo obrigatório).

Foco do produto:

- agenda de visitas como home, com inclusão/edição em **modal**;
- formulário completo de agendamento (cliente, contatos, local, data/hora, técnico, tipo de serviço);
- listagem e gestão das visitas (status, visualização, edição, reagendamento, cancelamento, conclusão);
- alocação de recursos (checklist no modal da visita);
- interface responsiva (mobile → desktop);
- temas **claro** e **escuro** com a identidade **Lime Night**;
- backend em Node.js com persistência em **SQLite**;
- organização em **Clean Architecture**.

---

## Entregáveis

O app pode estar mais avançado no código do que a tarefa oficial do momento.  
A lista abaixo espelha o **painel de entregas do estágio** (4 entregáveis).

### 1. Gerenciamento de Visitas Técnicas

| Tarefa | Descrição | Status | Tag sugerida |
|---|---|---|---|
| **1.1** Implementação do Formulário de Agendamento | Formulário para registrar visitas com data, hora, localização do cliente, técnico designado e tipo de serviço | Submetida | `v1.1` |
| **1.2** Alocação de Recursos | Checklist para seleção de materiais, ferramentas e equipamentos necessários para cada visita | Submetida | `v1.2` |

**Critérios de aceite — 1.1**

- Formulário deve capturar todas as informações necessárias para uma visita  
- A interface do formulário deve ser responsiva  

**Critérios de aceite — 1.2**

- Deve armazenar corretamente os itens selecionados  
- A checklist deve ser fácil de usar  

---

### 2. Gerenciamento de Status de Visita

| Tarefa | Descrição | Status | Tag sugerida |
|---|---|---|---|
| **2.1** Atualização de Status e Motivos | Permitir atualização de status da visita com marcação de tempo, além de motivos/comentários para reagendamento ou cancelamento | Submetida | `v2.1` |

**Critérios de aceite — 2.1**

- Status deve ser atualizado corretamente com marcação de tempo  
- Usuários devem poder adicionar motivos facilmente ao reagendar ou cancelar  

---

### 3. Notas Pós-Visita

| Tarefa | Descrição | Status | Tag sugerida |
|---|---|---|---|
| **3.1** Campo de Observações do Técnico | Campo de texto para o técnico registrar observações após cada visita | Pendente | `v3.1` |

**Critérios de aceite — 3.1**

- Técnicos devem conseguir salvar as observações sem erros  
- Observações devem ser fáceis de visualizar por supervisores  

---

### 4. Painel Semanal

| Tarefa | Descrição | Status | Tag sugerida |
|---|---|---|---|
| **4.1** Sistema de Filtros do Dashboard | Filtros por técnico e status no dashboard | Pendente | `v4.1` |
| **4.2** Implementação do Dashboard Calendário | Visão em calendário das visitas agendadas da semana atual e da próxima | Pendente | `v4.2` |

**Critérios de aceite — 4.1**

- Deve ser possível combinar múltiplos filtros  
- Filtros devem funcionar corretamente e ser intuitivos  

**Critérios de aceite — 4.2**

- Indicadores de status coloridos devem estar presentes  
- Deve exibir visitas agendadas de forma clara e organizada  

---

## Telas

### Home = Visitas (lista / cards)

A tela principal é a **agenda**. O botão **+** abre o modal de **Nova visita**; as ações Visualizar / Reagendar / Concluir / Cancelar atuam sobre cada registro.

### 1–2. Modal Nova visita — desktop (claro / escuro)

<table>
<tr>
<td width="55%" valign="top">

O formulário abre em **modal** sobre a agenda: cliente, contatos, localização, data, horário, técnico, tipo de serviço, checklist de recursos e observações.

No tema escuro, a mesma experiência com accent lima e superfícies escuras.

</td>
<td width="45%" valign="top" align="center">

<img src="assets/readme/01-02-temas.gif" alt="Alternância entre tema claro e escuro — modal Nova visita" width="420" />

</td>
</tr>
</table>

### 3. Mobile

<table>
<tr>
<td width="40%" valign="top" align="center">

<img src="assets/readme/04-mobile-scroll.gif" alt="Mobile — modal Nova visita com header fixo e rolagem" width="240" />

</td>
<td width="60%" valign="top">

No mobile e tablet (&lt; 1280px), a sidebar some e a navegação passa para um **header fixo** com menu hamburger. O drawer abre por overlay.

A home continua sendo a lista de visitas. O modal de **Nova visita** ocupa a tela com formulário em coluna única (alvos de toque ≥ 44px).

Layout fluido, sem barra de rolagem horizontal.

</td>
</tr>
</table>

### 4. Campos do modal (visita)

| Campo do formulário | O que registra |
|---|---|
| Cliente | Nome do cliente |
| Telefone / Telefone 2 | Contatos (principal e secundário) |
| E-mail | Contato digital |
| Localização | Endereço completo da visita |
| Data + Horário | Slot da visita |
| Técnico designado | Responsável em campo |
| Tipo de serviço | Instalação, Manutenção, Reparo ou Vistoria |
| Checklist de recursos | Materiais, ferramentas e equipamentos (opcional) |
| Observações | Notas opcionais |

---

## Funcionalidades

### Agenda (tela inicial)

- A home do app é a lista de **Visitas**, não uma página separada de formulário.  
- Exibe contador de registros (ou “X de Y” quando há filtro ativo).  
- Empty state quando não há visitas ou quando o filtro não retorna resultados.  
- Alternância entre visão **card** e **lista** (tabela responsiva).  
- Ordenação do cliente **A–Z** / **Z–A**.

### Inclusão e edição em modal

- Botão **+ Nova visita** abre o formulário em **modal** sobre a agenda.  
- **Visualizar** abre o mesmo modal em modo leitura; a partir dele é possível **editar**.  
- O modal captura: cliente, telefones, e-mail, localização, data, horário, técnico, tipo de serviço, recursos e observações.  
- Validação de campos obrigatórios e formato de contatos antes de salvar.  
- Persistência imediata na API / SQLite; a lista atualiza ao fechar o modal com sucesso.

### Checklist de recursos

- No modal da visita, seção **Checklist de recursos** (materiais, ferramentas, equipamentos).  
- Itens vindos do catálogo `resources` (seed); seleção múltipla.  
- Vínculos gravados na tabela de junção `appointment_resources` (N:N com FKs).

### Filtros da agenda

- **Cliente por nome** — dropdown pesquisável (estilo Select2): digite para filtrar a lista de clientes únicos e selecione um.  
- **Status** — Todos · Abertas · Reabertas · Remarcadas · Atrasadas · Fechadas · Canceladas.  
- Filtros combináveis; clique fora ou Escape fecha o painel do filtro de cliente.

### Status e ações da visita

- Status exibido com badges: **Aberta**, **Reaberta**, **Remarcada**, **Atrasada**, **Fechada**, **Cancelada**.  
- **Reagendar** abre modal com nova data/horário e **motivo** obrigatório; o evento entra no histórico.  
- **Concluir** fecha a visita (quando permitido pelo domínio).  
- **Cancelar** abre modal pedindo **motivo**; registra motivo e timestamp.  
- **Reabrir**: visita **cancelada** → status **Remarcada**; visita **fechada** → status **Reaberta** (motivo obrigatório; histórico preservado).  
- Em **Visualizar**, a seção **Histórico** lista criação, reagendamentos, cancelamento, reabertura e conclusão com timestamps.  
- Visitas canceladas também mostram o motivo na listagem em cards.

### Catálogos do formulário

- **Tipos de serviço** em cards selecionáveis com ícones (Instalação, Manutenção, Reparo, Vistoria).  
- **Técnicos** em select alinhado ao design system (apenas ativos do seed/catálogo).

### Interface e experiência

- Temas **claro** e **escuro** (Lime Night), preferência salva no navegador.  
- **Sidebar** no desktop (expansível / colapsável); some no mobile/tablet (&lt; 1280px).  
- **Header mobile** fixo + drawer de navegação por overlay.  
- **Tooltips** do design system (`.ds-tooltip`) em atalhos e ícones — sem `title=""` nativo.  
- Layout fluido mobile-first (375 → 768 → 1280 → 1920), alvos de toque ≥ 44px.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Interface | HTML, CSS, JavaScript (ES Modules) |
| Design system | Lime Night (`--ds-*` tokens) |
| API | Node.js + Express |
| Banco | SQLite (`better-sqlite3`) |
| Testes | Node.js Test Runner |
| Arquitetura | Clean Architecture (Core → Application → Infrastructure → API → Presentation) |

---

## Banco de dados

Persistência local em **SQLite** (`better-sqlite3`).  
Arquivo: `data/techroute.db` (criado automaticamente na primeira execução; ignorado no git).  
Schema e seed: `src/infrastructure/data/schema.js` e `seed.js`.

### Visão geral

| Tabela | Papel |
|---|---|
| `technicians` | Catálogo de técnicos (seed) |
| `service_types` | Catálogo de tipos de serviço (seed) |
| `resources` | Catálogo de materiais, ferramentas e equipamentos (seed) |
| `appointments` | Visitas agendadas (entidade principal) |
| `appointment_resources` | Junção N:N entre visita e recurso (`appointment_id` + `resource_id`) |

### Esquema visual (resumo)

<p align="center">
  <img src="assets/readme/05-db-schema.png" alt="Diagrama ER TechRoute — technicians, service_types, resources, appointments e appointment_resources" width="920" />
</p>

### Cardinalidade

| Relação | Tipo | Regra |
|---|---|---|
| `technicians` → `appointments` | 1:N | Um técnico pode ter várias visitas (`technician_id` FK) |
| `service_types` → `appointments` | 1:N | Um tipo classifica várias visitas (`service_type_id` FK) |
| `appointments` → `appointment_resources` | 1:N | Uma visita pode ter vários vínculos de recurso |
| `resources` → `appointment_resources` | 1:N | Um recurso pode estar em várias visitas |
| `resources` ↔ `appointments` | N:N | Via tabela de junção `appointment_resources` (FKs + PK composta) |

Integridade referencial via `FOREIGN KEY` no SQLite (técnico, tipo, visita↔recurso).

---

## Como executar

```bash
# 1. Instalar dependências
npm install

# 2. Subir o servidor
npm start

# 3. Abrir no navegador
# http://localhost:3000
```

| Script | Descrição |
|---|---|
| `npm start` | Sobe a API e os arquivos estáticos |
| `npm run dev` | Sobe com `--watch` (reinicia ao salvar) |
| `npm test` | Roda os testes do domínio / casos de uso |

> O banco SQLite é criado automaticamente em `data/techroute.db` na primeira execução, com seed de técnicos, tipos de serviço e recursos.

---

## Estrutura do repositório

```text
/
├── public/                          # Interface (HTML, CSS, JS)
│   ├── css/layout.css
│   ├── design-system/               # Tokens e componentes Lime Night (cópia para runtime)
│   ├── index.html
│   └── js/
│       ├── api/                     # HTTP, appointments, catalog
│       ├── components/              # app-shell, field, banner, ícones
│       └── pages/schedule-form.js   # Home Visitas + modais
├── src/
│   ├── core/
│   │   ├── entities/                # Appointment, Technician, ServiceType, Resource
│   │   ├── value-objects/
│   │   ├── repositories/contracts.js
│   │   └── common/Result.js
│   ├── application/
│   │   ├── services/                # Register, Update, Cancel, Close, Allocate, List…
│   │   ├── input-models/
│   │   └── view-models/
│   ├── infrastructure/
│   │   ├── data/                    # connection, schema, seed
│   │   └── repositories/            # Sqlite* (incl. SqliteResourceRepository)
│   └── api/                         # Express, controllers, composition
├── tests/                           # Domínio e casos de uso (incl. AllocateResources)
├── assets/readme/                   # Imagens do README publicado
├── data/                            # Banco local (.db ignorado no git)
└── package.json
```

---

## Design system

Identidade visual **Lime Night**:

- accent lima `#CCFF00` em CTAs, seleção e marca;
- tema escuro como padrão de produto;
- tema claro com textos/ícones mais escuros para contraste no branco;
- tokens semânticos `--ds-color-*`, tipografia, espaçamento e componentes `.ds-*`;
- **Tooltips:** `.ds-tooltip` + variantes de cor/posição — dicas de UI nunca usam `title=""`.

Catálogo e demo do design system ficam em `docs/design-system/` (quando a pasta de docs estiver disponível no ambiente de desenvolvimento).

---

## Autor

**Aluna:** Angela Leite  

Projeto de estágio — **TechRoute**  
Aplicativo de Agendamento e Logística Técnica

---

## Licença

Uso educacional / estágio. Ajuste a licença conforme a política da instituição ou do repositório.
