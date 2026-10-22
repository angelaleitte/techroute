import { escapeHtml } from "./field.js";

export function renderBanner(banner) {
  if (!banner) {
    return "";
  }

  const variant =
    banner.tone === "danger"
      ? "app-banner--danger"
      : banner.tone === "info"
        ? "app-banner--info"
        : "app-banner--success";

  return `
    <div class="ds-banner ${variant}" role="status">
      <span class="ds-banner__dot" aria-hidden="true"></span>
      <span class="app-banner__text">${escapeHtml(banner.message)}</span>
    </div>
  `;
}
