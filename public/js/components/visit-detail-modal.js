import { escapeHtml } from "./field.js";

function formatShortDate(iso) {
  if (!iso) {
    return "—";
  }
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) {
    return iso;
  }
  return `${d}/${m}/${y}`;
}

function row(label, value) {
  const text = value == null || String(value).trim() === "" ? "—" : String(value);
  return `
    <div class="ds-row">
      <span class="ds-row__label">${escapeHtml(label)}</span>
      <span class="ds-row__value">${escapeHtml(text)}</span>
    </div>
  `;
}

/**
 * Modal somente leitura com os dados completos da visita.
 * @param {object|null} appointment
 * @param {{ closeAction?: string }} [options]
 */
export function renderVisitDetailModal(appointment, { closeAction = "close-visit-detail" } = {}) {
  if (!appointment) {
    return "";
  }

  const resources = Array.isArray(appointment.resources) ? appointment.resources : [];
  const resourceNames = resources.map((item) => item.name || item.id).filter(Boolean);
  const when = `${formatShortDate(appointment.date)} às ${appointment.time || "—"}`;

  return `
    <div class="app-modal app-modal--form app-modal--visit-detail" role="presentation">
      <div class="app-modal__backdrop" data-action="${escapeHtml(closeAction)}"></div>
      <div
        class="app-modal__panel app-modal__panel--form ds-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="visit-detail-title"
      >
        <div class="app-modal__header">
          <div class="app-modal__heading">
            <span class="ds-eyebrow">Visita técnica</span>
            <h2 class="ds-heading" id="visit-detail-title">Detalhes da visita</h2>
            <p class="ds-small">Dados completos do agendamento selecionado no calendário.</p>
          </div>
          <button
            class="ds-icon-btn ds-tooltip ds-tooltip--left"
            type="button"
            data-action="${escapeHtml(closeAction)}"
            data-tooltip="Fechar"
            aria-label="Fechar"
          >
            <svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12"></path></svg>
          </button>
        </div>
        <div class="app-modal__body">
          <div class="app-visit-detail">
            <div class="app-visit-detail__meta">
              <span class="ds-badge ${escapeHtml(appointment.statusBadgeClass || "")}">${escapeHtml(appointment.statusLabel || appointment.displayStatus || "Status")}</span>
              <span class="ds-badge ds-badge--subtle">${escapeHtml(when)}</span>
            </div>
            <div class="ds-list app-visit-detail__rows">
              ${row("Cliente", appointment.clientName)}
              ${row("Localização", appointment.location)}
              ${row("Telefone principal", appointment.phone)}
              ${row("Telefone secundário", appointment.phoneSecondary)}
              ${row("E-mail", appointment.email)}
              ${row("Data", formatShortDate(appointment.date))}
              ${row("Horário", appointment.time)}
              ${row("Técnico", appointment.technicianName)}
              ${row("Tipo de serviço", appointment.serviceTypeName)}
              ${row("Observações", appointment.notes)}
              ${row("Observações pós-visita", appointment.postVisitNotes)}
              ${row(
                "Recursos",
                resourceNames.length > 0 ? resourceNames.join(", ") : "Nenhum recurso",
              )}
              ${
                appointment.attendedAtLabel
                  ? row("Atendimento iniciado", appointment.attendedAtLabel)
                  : ""
              }
              ${
                appointment.cancellationReason
                  ? row("Motivo do cancelamento", appointment.cancellationReason)
                  : ""
              }
              ${
                appointment.rescheduleReason
                  ? row("Motivo do reagendamento", appointment.rescheduleReason)
                  : ""
              }
            </div>
          </div>
        </div>
        <div class="app-modal__actions">
          <button class="ds-btn ds-btn--secondary" type="button" data-action="${escapeHtml(closeAction)}">
            Fechar
          </button>
        </div>
      </div>
    </div>
  `;
}

const PORTAL_ID = "techroute-visit-detail-portal";

export function ensureVisitDetailPortal() {
  let portal = document.getElementById(PORTAL_ID);
  if (!portal) {
    portal = document.createElement("div");
    portal.id = PORTAL_ID;
    document.body.appendChild(portal);
  }
  return portal;
}

export function paintVisitDetailPortal(appointment, options) {
  const portal = ensureVisitDetailPortal();
  portal.innerHTML = renderVisitDetailModal(appointment, options);
}

export function clearVisitDetailPortal() {
  const portal = document.getElementById(PORTAL_ID);
  if (portal) {
    portal.innerHTML = "";
  }
}
