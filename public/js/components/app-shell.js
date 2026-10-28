const DESKTOP_QUERY = "(min-width: 1280px)";
const SIDEBAR_KEY = "techroute-sidebar";

const icons = {
  calendar: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg>`,
  list: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path></svg>`,
  resources: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
  check: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
  users: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  profile: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 20a8 8 0 0 1 16 0"></path></svg>`,
  menu: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>`,
  close: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12"></path></svg>`,
  collapse: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"></path></svg>`,
  expand: `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg>`,
};

const shellState = {
  drawerOpen: false,
  options: {},
  mounted: false,
  desktopMedia: null,
};

function isDesktop() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getSidebarMode() {
  return localStorage.getItem(SIDEBAR_KEY) === "collapsed" ? "collapsed" : "expanded";
}

function setSidebarMode(mode) {
  localStorage.setItem(SIDEBAR_KEY, mode);
  document.documentElement.dataset.sidebar = mode;
}

function applySidebarMode(container, mode) {
  const sidebar = container.querySelector(".app-sidebar");
  if (!sidebar) {
    return;
  }

  const collapsed = mode === "collapsed";
  const toggleLabel = collapsed ? "Expandir menu lateral" : "Ocultar menu lateral";
  const toggle = sidebar.querySelector("[data-action='toggle-sidebar']");

  sidebar.classList.toggle("is-collapsed", collapsed);

  if (toggle) {
    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    toggle.setAttribute("aria-label", toggleLabel);
    toggle.setAttribute("data-tooltip", toggleLabel);
  }
}

function currentHash() {
  const hash = window.location.hash || "#visitas";
  if (hash === "#agendar" || hash === "#recursos") {
    return "#visitas";
  }
  if (hash === "#usuarios" || hash === "#perfil" || hash === "#visitas") {
    return hash;
  }
  return "#visitas";
}

export function getCurrentTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("techroute-theme", theme);
}

function brandMarkup() {
  return `
    <div class="app-brand">
      <span class="app-brand__mark" aria-hidden="true">TR</span>
      <span class="app-brand__name">TechRoute</span>
    </div>
  `;
}

function themeButton(theme, placement = "right") {
  const next = theme === "dark" ? "light" : "dark";
  const label = next === "light" ? "Ativar tema claro" : "Ativar tema escuro";
  const placeClass =
    placement === "left" ? " ds-tooltip--left" : placement === "bottom" ? " ds-tooltip--bottom" : " ds-tooltip--right";

  return `
    <button class="ds-icon-btn ds-tooltip${placeClass}" type="button" data-action="toggle-theme" data-tooltip="${label}" aria-label="${label}">
      <svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true">
        ${
          theme === "dark"
            ? '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>'
            : '<path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5Z"></path>'
        }
      </svg>
    </button>
  `;
}

function navMarkup(user) {
  const hash = currentHash();
  const isSupervisor = user?.role === "supervisor";

  return `
    <nav class="app-nav" aria-label="Principal">
      <a class="app-nav__link ds-tooltip ds-tooltip--right" href="#visitas" data-tooltip="Visitas" ${hash === "#visitas" ? 'aria-current="page"' : ""}>
        ${icons.list}
        <span class="app-nav__label">Visitas</span>
      </a>
      ${
        isSupervisor
          ? `<a class="app-nav__link ds-tooltip ds-tooltip--right" href="#usuarios" data-tooltip="Funcionários" ${hash === "#usuarios" ? 'aria-current="page"' : ""}>
              ${icons.users}
              <span class="app-nav__label">Funcionários</span>
            </a>`
          : ""
      }
      <a class="app-nav__link ds-tooltip ds-tooltip--right" href="#perfil" data-tooltip="Meu perfil" ${hash === "#perfil" ? 'aria-current="page"' : ""}>
        ${icons.profile}
        <span class="app-nav__label">Meu perfil</span>
      </a>
    </nav>
  `;
}

function userBlockMarkup(user) {
  if (!user) {
    return "";
  }
  const role = user.role === "technician" ? "Técnico" : "Supervisor";
  return `
    <div class="app-user">
      <div class="app-user__info">
        <span class="app-user__name">${escapeText(user.displayName)}</span>
        <span class="app-user__role">${role}</span>
      </div>
      <a class="ds-btn ds-btn--secondary ds-btn--sm app-user__profile" href="#perfil">Perfil</a>
      <button class="ds-btn ds-btn--secondary ds-btn--sm app-user__logout" type="button" data-action="logout">
        Sair
      </button>
    </div>
  `;
}

function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderDesktopSidebar(container, options = {}) {
  const theme = getCurrentTheme();
  const collapsed = getSidebarMode() === "collapsed";
  const toggleLabel = collapsed ? "Expandir menu lateral" : "Ocultar menu lateral";

  container.innerHTML = `
    <aside class="app-sidebar${collapsed ? " is-collapsed" : ""}" aria-label="Navegação">
      <div class="app-sidebar__top">
        ${brandMarkup()}
        <button
          class="ds-icon-btn ds-tooltip ds-tooltip--right app-sidebar__toggle"
          type="button"
          data-action="toggle-sidebar"
          aria-expanded="${collapsed ? "false" : "true"}"
          aria-label="${toggleLabel}"
          data-tooltip="${toggleLabel}"
        >
          ${icons.collapse}
        </button>
      </div>
      ${navMarkup(options.user)}
      <div class="app-sidebar__bottom">
        ${userBlockMarkup(options.user)}
        ${themeButton(theme)}
      </div>
    </aside>
  `;
}

function syncDrawer(container) {
  const open = shellState.drawerOpen;
  const backdrop = container.querySelector(".app-drawer-backdrop");
  const drawer = container.querySelector(".app-drawer");
  const toggle = container.querySelector("[data-action='toggle-drawer']");

  document.body.classList.toggle("is-drawer-open", open);
  backdrop?.classList.toggle("is-open", open);
  drawer?.classList.toggle("is-open", open);

  if (drawer) {
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    drawer.toggleAttribute("inert", !open);
  }

  if (toggle) {
    const drawerLabel = open ? "Fechar menu" : "Abrir menu";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", drawerLabel);
    toggle.setAttribute("data-tooltip", drawerLabel);
  }
}

function updateMobileNav(container) {
  const hash = currentHash();
  container.querySelectorAll(".app-nav__link").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === hash) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function renderMobileHeader(container, options = {}) {
  const theme = getCurrentTheme();

  container.innerHTML = `
    <header class="app-header">
      <button
        class="ds-icon-btn ds-tooltip"
        type="button"
        data-action="toggle-drawer"
        aria-expanded="false"
        aria-controls="app-drawer"
        aria-label="Abrir menu"
        data-tooltip="Abrir menu"
      >
        ${icons.menu}
      </button>
      ${brandMarkup()}
      ${themeButton(theme, "left")}
    </header>
    <div class="app-drawer-backdrop" data-action="close-drawer"></div>
    <aside
      class="app-drawer"
      id="app-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden="true"
      inert
    >
      <div class="app-sidebar__top">
        ${brandMarkup()}
        <button class="ds-icon-btn ds-tooltip" type="button" data-action="close-drawer" aria-label="Fechar menu" data-tooltip="Fechar menu">
          ${icons.close}
        </button>
      </div>
      ${navMarkup(options.user)}
      <div class="app-sidebar__bottom">
        ${userBlockMarkup(options.user)}
      </div>
    </aside>
  `;

  syncDrawer(container);
}

export function refreshAppShellUser(user) {
  shellState.options = { ...shellState.options, user };
  const container = document.getElementById("app-shell");
  if (container && shellState.mounted) {
    paint(container, shellState.options);
  }
}

function paint(container, options = {}) {
  if (isDesktop()) {
    shellState.drawerOpen = false;
    document.body.classList.remove("is-drawer-open");
    renderDesktopSidebar(container, options);
    return;
  }

  renderMobileHeader(container, options);
}

export function mountAppShell(container, options = {}) {
  shellState.options = options;
  setSidebarMode(getSidebarMode());
  paint(container, options);

  if (shellState.mounted) {
    return;
  }
  shellState.mounted = true;

  const desktop = window.matchMedia(DESKTOP_QUERY);
  shellState.desktopMedia = desktop;
  desktop.addEventListener("change", () => paint(container, shellState.options));
  window.addEventListener("hashchange", () => {
    if (isDesktop()) {
      paint(container, shellState.options);
      return;
    }

    updateMobileNav(container);

    if (shellState.drawerOpen) {
      shellState.drawerOpen = false;
      syncDrawer(container);
    }
  });

  container.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) {
      return;
    }

    if (action === "logout") {
      shellState.options?.onLogout?.();
      return;
    }

    if (action === "toggle-theme") {
      applyTheme(getCurrentTheme() === "dark" ? "light" : "dark");
      paint(container, shellState.options);
      return;
    }

    if (action === "toggle-sidebar") {
      const nextMode = getSidebarMode() === "collapsed" ? "expanded" : "collapsed";
      setSidebarMode(nextMode);
      applySidebarMode(container, nextMode);
      return;
    }

    if (action === "toggle-drawer") {
      shellState.drawerOpen = !shellState.drawerOpen;
      syncDrawer(container);
      if (shellState.drawerOpen) {
        container.querySelector(".app-drawer [data-action='close-drawer']")?.focus();
      }
      return;
    }

    if (action === "close-drawer") {
      shellState.drawerOpen = false;
      syncDrawer(container);
      container.querySelector("[data-action='toggle-drawer']")?.focus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && shellState.drawerOpen) {
      shellState.drawerOpen = false;
      syncDrawer(container);
      container.querySelector("[data-action='toggle-drawer']")?.focus();
    }
  });
}
