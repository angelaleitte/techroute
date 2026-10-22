const ICONS = {
  "svc-instalacao": `
    <path d="M12 22v-5"></path>
    <path d="M9 8V2"></path>
    <path d="M15 8V2"></path>
    <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"></path>
  `,
  "svc-manutencao": `
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
  `,
  "svc-reparo": `
    <path d="m15 12-8.37 8.37a1 1 0 0 1-3-3L12 9"></path>
    <path d="m18 15 4-4"></path>
    <path d="M21.5 11.5 19.6 9.6A2 2 0 0 1 19 8.2V7l-2.3-2.3a6 6 0 0 0-4.2-1.7L9 3l.9.8A6.2 6.2 0 0 1 12 8.4v1.6l2 2h2.5l2.3 1.9"></path>
  `,
  "svc-vistoria": `
    <rect x="8" y="2" width="8" height="4" rx="1"></rect>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <path d="m9 14 2 2 4-4"></path>
  `,
};

const FALLBACK = `
  <circle cx="12" cy="12" r="8"></circle>
  <path d="M12 8v4"></path>
  <path d="M12 16h.01"></path>
`;

function resolveIconKey(option) {
  if (option?.id && ICONS[option.id]) {
    return option.id;
  }

  const name = String(option?.name ?? "").toLowerCase();

  if (name.includes("instal")) return "svc-instalacao";
  if (name.includes("manut")) return "svc-manutencao";
  if (name.includes("repar")) return "svc-reparo";
  if (name.includes("vistor")) return "svc-vistoria";

  return "";
}

export function serviceTypeIcon(option) {
  const paths = ICONS[resolveIconKey(option)] || FALLBACK;

  return `
    <svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true">
      ${paths}
    </svg>
  `;
}
