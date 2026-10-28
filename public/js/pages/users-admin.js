import {
  createUser,
  fetchAvailableTechnicians,
  fetchUsers,
  resetUserPassword,
  updateUser,
} from "../api/users.js";
import { renderBanner } from "../components/banner.js";
import { escapeHtml } from "../components/field.js";

const DEFAULT_FORM = {
  username: "",
  displayName: "",
  role: "technician",
  technicianMode: "new",
  technicianId: "",
  specialty: "",
};

function roleLabel(role) {
  return role === "technician" ? "Técnico" : "Supervisor";
}

export async function mountUsersAdmin(root, { currentUserId, onUsersChanged } = {}) {
  const host = document.createElement("div");
  host.className = "app-page-host";
  root.replaceChildren(host);

  const state = {
    users: [],
    availableTechnicians: [],
    loading: true,
    saving: false,
    banner: null,
    form: { ...DEFAULT_FORM },
    formError: "",
    formOpen: false,
    editingId: null,
    editDisplayName: "",
    editActive: true,
  };

  async function load() {
    state.loading = true;
    paint();
    const [usersResult, techniciansResult] = await Promise.all([
      fetchUsers(),
      fetchAvailableTechnicians(),
    ]);
    state.loading = false;

    if (!usersResult.success) {
      state.banner = {
        tone: "danger",
        message: usersResult.error?.message || "Não foi possível carregar os usuários.",
      };
      paint();
      return;
    }

    state.users = usersResult.value;
    state.availableTechnicians = techniciansResult.success ? techniciansResult.value : [];
    paint();
    onUsersChanged?.(state.users);
  }

  function syncCreateFormFromDom() {
    const form = host.querySelector('[data-action="submit-create-user"]');
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    const data = new FormData(form);
    state.form = {
      username: String(data.get("username") || ""),
      displayName: String(data.get("displayName") || ""),
      role: String(data.get("role") || state.form.role || "technician"),
      technicianMode: String(data.get("technicianMode") || state.form.technicianMode || "new"),
      technicianId: String(data.get("technicianId") || ""),
      specialty: String(data.get("specialty") || ""),
    };
  }

  function openCreateForm() {
    state.formOpen = true;
    state.form = { ...DEFAULT_FORM };
    state.formError = "";
    document.body.classList.add("is-modal-open");
    paint();
    host.querySelector("#userUsername")?.focus();
  }

  function closeCreateForm() {
    state.formOpen = false;
    state.formError = "";
    document.body.classList.remove("is-modal-open");
    paint();
  }

  function openEdit(user) {
    state.editingId = user.id;
    state.editDisplayName = user.displayName;
    state.editActive = Boolean(user.active);
    paint();
    host.querySelector("#editDisplayName")?.focus();
  }

  function closeEdit() {
    state.editingId = null;
    paint();
  }

  function renderUserCard(user) {
    const isSelf = user.id === currentUserId;
    const editing = state.editingId === user.id;

    if (editing) {
      return `
        <article class="ds-card app-user-card is-editing" data-user-id="${escapeHtml(user.id)}">
          <form class="app-user-card__edit" data-action="submit-edit-user" data-id="${escapeHtml(user.id)}">
            <label class="ds-field">
              <span class="ds-field__label">Nome de exibição</span>
              <div class="ds-input-wrap">
                <input class="ds-input" id="editDisplayName" name="displayName" required value="${escapeHtml(state.editDisplayName)}">
              </div>
            </label>
            <label class="ds-option app-user-card__active">
              <input type="checkbox" name="active" ${state.editActive ? "checked" : ""} ${isSelf ? "disabled" : ""}>
              <span>Usuário ativo</span>
            </label>
            <div class="app-user-card__actions">
              <button class="ds-btn ds-btn--secondary" type="button" data-action="cancel-edit-user">Cancelar</button>
              <button class="ds-btn ds-btn--primary" type="submit" ${state.saving ? "disabled" : ""}>Salvar</button>
            </div>
          </form>
        </article>
      `;
    }

    return `
      <article class="ds-card app-user-card${!user.active ? " is-inactive" : ""}" data-user-id="${escapeHtml(user.id)}">
        <div class="ds-section__head">
          <div>
            <h2 class="app-user-card__name">${escapeHtml(user.displayName)}</h2>
            <p class="ds-small">@${escapeHtml(user.username)}</p>
          </div>
          <div class="app-user-card__badges">
            <span class="ds-badge ${user.role === "supervisor" ? "ds-badge--info" : "ds-badge--subtle"}">${escapeHtml(roleLabel(user.role))}</span>
            <span class="ds-badge ${user.active ? "ds-badge--success" : "ds-badge--danger"}">${user.active ? "Ativo" : "Inativo"}</span>
          </div>
        </div>
        ${
          user.role === "technician"
            ? `<p class="ds-small app-user-card__meta">${escapeHtml(user.technicianName || "Técnico")}${user.technicianSpecialty ? ` · ${escapeHtml(user.technicianSpecialty)}` : ""}</p>`
            : ""
        }
        <div class="app-user-card__actions">
          <button class="ds-btn ds-btn--secondary ds-btn--sm" type="button" data-action="edit-user" data-id="${escapeHtml(user.id)}">Editar</button>
          <button class="ds-btn ds-btn--secondary ds-btn--sm" type="button" data-action="reset-password" data-id="${escapeHtml(user.id)}">Resetar senha</button>
          ${
            isSelf
              ? ""
              : `<button class="ds-btn ds-btn--secondary ds-btn--sm" type="button" data-action="toggle-active" data-id="${escapeHtml(user.id)}" data-active="${user.active ? "false" : "true"}">
                  ${user.active ? "Desativar" : "Reativar"}
                </button>`
          }
        </div>
      </article>
    `;
  }

  function renderCreateModal() {
    if (!state.formOpen) {
      return "";
    }

    const showTechnicianFields = state.form.role === "technician";
    const linkExisting = state.form.technicianMode === "existing";

    return `
      <div class="app-modal" role="presentation">
        <div class="app-modal__backdrop" data-action="close-create-user"></div>
        <div
          class="app-modal__panel app-modal__panel--form ds-card app-users__modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-title"
        >
          <div class="app-modal__header">
            <div class="app-modal__heading">
              <h2 class="ds-heading" id="create-user-title">Novo usuário</h2>
              <p class="ds-small">A senha inicial padrão será <strong>TechRoute@123</strong>. O usuário pode alterá-la em Meu perfil.</p>
            </div>
            <button
              class="ds-icon-btn"
              type="button"
              data-action="close-create-user"
              aria-label="Fechar"
            >
              <svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12"></path></svg>
            </button>
          </div>
          <div class="app-modal__body">
            ${state.formError ? `<p class="ds-field__error" role="alert">${escapeHtml(state.formError)}</p>` : ""}
            <form class="app-users__form" id="create-user-form" data-action="submit-create-user">
              <label class="ds-field">
                <span class="ds-field__label">Login</span>
                <div class="ds-input-wrap">
                  <input class="ds-input" id="userUsername" name="username" autocomplete="off" required minlength="3" maxlength="32" value="${escapeHtml(state.form.username)}">
                </div>
              </label>
              <label class="ds-field">
                <span class="ds-field__label">Nome de exibição</span>
                <div class="ds-input-wrap">
                  <input class="ds-input" name="displayName" required value="${escapeHtml(state.form.displayName)}">
                </div>
              </label>
              <fieldset class="ds-field">
                <legend class="ds-field__label">Tipo de acesso</legend>
                <div class="app-users__roles">
                  <label class="ds-option">
                    <input type="radio" name="role" value="technician" ${state.form.role === "technician" ? "checked" : ""}>
                    <span>Técnico</span>
                  </label>
                  <label class="ds-option">
                    <input type="radio" name="role" value="supervisor" ${state.form.role === "supervisor" ? "checked" : ""}>
                    <span>Supervisor</span>
                  </label>
                </div>
              </fieldset>
              ${
                showTechnicianFields
                  ? `
                    <fieldset class="ds-field">
                      <legend class="ds-field__label">Vínculo técnico</legend>
                      <div class="app-users__roles">
                        <label class="ds-option">
                          <input type="radio" name="technicianMode" value="new" ${state.form.technicianMode === "new" ? "checked" : ""}>
                          <span>Criar novo técnico</span>
                        </label>
                        <label class="ds-option">
                          <input type="radio" name="technicianMode" value="existing" ${state.form.technicianMode === "existing" ? "checked" : ""}>
                          <span>Vincular técnico existente</span>
                        </label>
                      </div>
                    </fieldset>
                    ${
                      linkExisting
                        ? `
                          <label class="ds-field">
                            <span class="ds-field__label">Técnico</span>
                            <div class="ds-input-wrap">
                              <select class="ds-input" name="technicianId" required>
                                <option value="">Selecione</option>
                                ${state.availableTechnicians
                                  .map(
                                    (technician) => `
                                      <option value="${escapeHtml(technician.id)}" ${state.form.technicianId === technician.id ? "selected" : ""}>
                                        ${escapeHtml(technician.name)}
                                      </option>
                                    `,
                                  )
                                  .join("")}
                              </select>
                            </div>
                          </label>
                        `
                        : `
                          <label class="ds-field">
                            <span class="ds-field__label">Especialidade</span>
                            <div class="ds-input-wrap">
                              <input class="ds-input" name="specialty" value="${escapeHtml(state.form.specialty)}" placeholder="Ex.: Redes e cabeamento">
                            </div>
                          </label>
                        `
                    }
                  `
                  : ""
              }
            </form>
          </div>
          <div class="app-modal__actions">
            <button class="ds-btn ds-btn--secondary" type="button" data-action="close-create-user">Cancelar</button>
            <button
              class="ds-btn ds-btn--primary${state.saving ? " is-loading" : ""}"
              type="submit"
              form="create-user-form"
              ${state.saving ? "disabled" : ""}
            >
              Cadastrar
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function paint() {
    const body = state.loading
      ? `<p class="app-empty">Carregando usuários…</p>`
      : state.users.length === 0
        ? `<p class="app-empty">Nenhum usuário cadastrado.</p>`
        : `<div class="app-users__list">${state.users.map(renderUserCard).join("")}</div>`;

    document.body.classList.toggle("is-modal-open", state.formOpen);

    host.innerHTML = `
      <section class="ds-screen app-users" id="usuarios">
        <div class="ds-section__head">
          <span class="ds-eyebrow">Administração</span>
          <span class="ds-badge">${state.users.length} ${state.users.length === 1 ? "usuário" : "usuários"}</span>
        </div>
        <div class="app-users__title-row">
          <h1 class="ds-title">Funcionários</h1>
          <button class="ds-btn ds-btn--primary" type="button" data-action="open-create-user">Novo usuário</button>
        </div>
        <p class="ds-small">Cadastre supervisores e técnicos, defina o tipo de acesso e gerencie status e senha padrão.</p>
        ${renderBanner(state.banner)}
        ${body}
      </section>
      ${renderCreateModal()}
    `;
  }

  async function handleAction(event) {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl || !host.contains(actionEl)) {
      return;
    }

    const action = actionEl.dataset.action;
    const id = actionEl.dataset.id;

    if (action === "open-create-user") {
      openCreateForm();
      return;
    }

    if (action === "close-create-user") {
      closeCreateForm();
      return;
    }

    if (action === "edit-user") {
      const user = state.users.find((item) => item.id === id);
      if (user) {
        openEdit(user);
      }
      return;
    }

    if (action === "cancel-edit-user") {
      closeEdit();
      return;
    }

    if (action === "toggle-active") {
      if (id === currentUserId) {
        return;
      }
      state.saving = true;
      paint();
      const result = await updateUser(id, { active: actionEl.dataset.active === "true" });
      state.saving = false;
      if (!result.success) {
        state.banner = {
          tone: "danger",
          message: result.error?.message || "Não foi possível atualizar o status.",
        };
        paint();
        return;
      }
      state.banner = {
        tone: "success",
        message: result.value.user.active ? "Usuário reativado." : "Usuário desativado.",
      };
      await load();
      return;
    }

    if (action === "reset-password") {
      const confirmed = window.confirm(
        "Resetar a senha deste usuário para a senha padrão TechRoute@123?",
      );
      if (!confirmed) {
        return;
      }
      state.saving = true;
      paint();
      const result = await resetUserPassword(id);
      state.saving = false;
      if (!result.success) {
        state.banner = {
          tone: "danger",
          message: result.error?.message || "Não foi possível resetar a senha.",
        };
        paint();
        return;
      }
      state.banner = {
        tone: "success",
        message: `Senha resetada. Informe ao usuário: ${result.value.defaultPassword}`,
      };
      paint();
      return;
    }
  }

  host.addEventListener("click", (event) => {
    void handleAction(event);
  });

  host.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }
    if (!state.formOpen) {
      return;
    }
    if (target.name === "role" || target.name === "technicianMode") {
      syncCreateFormFromDom();
      if (target.name === "role") {
        state.form.role = target.value;
      }
      if (target.name === "technicianMode") {
        state.form.technicianMode = target.value;
      }
      paint();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !state.formOpen || !host.isConnected) {
      return;
    }
    event.preventDefault();
    closeCreateForm();
  });

  host.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !host.contains(form)) {
      return;
    }
    event.preventDefault();
    void (async () => {
      const action = form.dataset.action;
      const data = new FormData(form);

      if (action === "submit-create-user") {
        syncCreateFormFromDom();
        state.saving = true;
        state.formError = "";
        paint();
        const payload = {
          username: state.form.username,
          displayName: state.form.displayName,
          role: state.form.role || "technician",
        };
        if (payload.role === "technician") {
          if (state.form.technicianMode === "existing") {
            payload.technicianId = state.form.technicianId;
          } else {
            payload.specialty = state.form.specialty;
          }
        }
        const result = await createUser(payload);
        state.saving = false;
        if (!result.success) {
          state.formError = result.error?.message || "Não foi possível cadastrar.";
          paint();
          host.querySelector("#userUsername")?.focus();
          return;
        }
        closeCreateForm();
        state.banner = {
          tone: "success",
          message: `Usuário ${result.value.user.username} criado. Senha padrão: ${result.value.defaultPassword}`,
        };
        await load();
        return;
      }

      if (action === "submit-edit-user") {
        const userId = form.dataset.id;
        const isSelf = userId === currentUserId;
        state.saving = true;
        paint();
        const result = await updateUser(userId, {
          displayName: String(data.get("displayName") || ""),
          active: isSelf ? true : data.get("active") === "on",
        });
        state.saving = false;
        if (!result.success) {
          state.banner = {
            tone: "danger",
            message: result.error?.message || "Não foi possível salvar.",
          };
          paint();
          return;
        }
        state.editingId = null;
        state.banner = { tone: "success", message: "Usuário atualizado." };
        await load();
      }
    })();
  });

  await load();
}
