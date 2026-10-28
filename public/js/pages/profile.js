import { changePassword, updateProfile } from "../api/auth.js";
import { renderBanner } from "../components/banner.js";
import { escapeHtml } from "../components/field.js";

function roleLabel(role) {
  return role === "technician" ? "Técnico" : "Supervisor";
}

export async function mountProfile(root, { user, onUserUpdated } = {}) {
  const host = document.createElement("div");
  host.className = "app-page-host";
  root.replaceChildren(host);

  const state = {
    user,
    displayName: user?.displayName || "",
    profileBanner: null,
    passwordBanner: null,
    profileSaving: false,
    passwordSaving: false,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };

  function paint() {
    host.innerHTML = `
      <section class="ds-screen app-profile" id="perfil">
        <div class="ds-section__head">
          <span class="ds-eyebrow">Conta</span>
          <span class="ds-badge ${state.user?.role === "supervisor" ? "ds-badge--info" : "ds-badge--subtle"}">${escapeHtml(roleLabel(state.user?.role))}</span>
        </div>
        <h1 class="ds-title">Meu perfil</h1>
        <p class="ds-small">Atualize seus dados de exibição e altere a senha quando quiser.</p>

        <div class="app-profile__grid">
          <section class="ds-card app-profile__card" aria-labelledby="profile-data-title">
            <h2 class="app-profile__card-title" id="profile-data-title">Dados do perfil</h2>
            ${renderBanner(state.profileBanner)}
            <form class="app-profile__form" data-action="submit-profile">
              <label class="ds-field">
                <span class="ds-field__label">Login</span>
                <div class="ds-input-wrap">
                  <input class="ds-input" value="${escapeHtml(state.user?.username || "")}" readonly>
                </div>
              </label>
              <label class="ds-field">
                <span class="ds-field__label">Tipo de acesso</span>
                <div class="ds-input-wrap">
                  <input class="ds-input" value="${escapeHtml(roleLabel(state.user?.role))}" readonly>
                </div>
              </label>
              <label class="ds-field">
                <span class="ds-field__label">Nome de exibição</span>
                <div class="ds-input-wrap">
                  <input class="ds-input" id="profileDisplayName" name="displayName" required value="${escapeHtml(state.displayName)}">
                </div>
              </label>
              <div class="app-profile__actions">
                <button class="ds-btn ds-btn--primary" type="submit" ${state.profileSaving ? "disabled" : ""}>
                  Salvar perfil
                </button>
              </div>
            </form>
          </section>

          <section class="ds-card app-profile__card" aria-labelledby="profile-password-title">
            <h2 class="app-profile__card-title" id="profile-password-title">Alterar senha</h2>
            <p class="ds-small">Se você recebeu a senha padrão no cadastro, troque por uma senha pessoal aqui.</p>
            ${renderBanner(state.passwordBanner)}
            <form class="app-profile__form" data-action="submit-password" autocomplete="off">
              <label class="ds-field">
                <span class="ds-field__label">Senha atual</span>
                <div class="ds-input-wrap">
                  <input class="ds-input" id="currentPassword" name="currentPassword" type="password" required autocomplete="current-password" value="${escapeHtml(state.currentPassword)}">
                </div>
              </label>
              <label class="ds-field">
                <span class="ds-field__label">Nova senha</span>
                <div class="ds-input-wrap">
                  <input class="ds-input" id="newPassword" name="newPassword" type="password" required minlength="6" autocomplete="new-password" value="${escapeHtml(state.newPassword)}">
                </div>
              </label>
              <label class="ds-field">
                <span class="ds-field__label">Confirmar nova senha</span>
                <div class="ds-input-wrap">
                  <input class="ds-input" id="confirmPassword" name="confirmPassword" type="password" required minlength="6" autocomplete="new-password" value="${escapeHtml(state.confirmPassword)}">
                </div>
              </label>
              <div class="app-profile__actions">
                <button class="ds-btn ds-btn--primary" type="submit" ${state.passwordSaving ? "disabled" : ""}>
                  Atualizar senha
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
    `;
  }

  host.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !host.contains(form)) {
      return;
    }
    event.preventDefault();
    void (async () => {
      const action = form.dataset.action;
      const data = new FormData(form);

      if (action === "submit-profile") {
        state.displayName = String(data.get("displayName") || "");
        state.profileSaving = true;
        state.profileBanner = null;
        paint();
        const result = await updateProfile(state.displayName);
        state.profileSaving = false;
        if (!result.success) {
          state.profileBanner = {
            tone: "danger",
            message: result.error?.message || "Não foi possível salvar o perfil.",
          };
          paint();
          return;
        }
        state.user = result.value.user;
        state.displayName = result.value.user.displayName;
        state.profileBanner = { tone: "success", message: "Perfil atualizado." };
        onUserUpdated?.(result.value.user);
        paint();
        return;
      }

      if (action === "submit-password") {
        state.currentPassword = String(data.get("currentPassword") || "");
        state.newPassword = String(data.get("newPassword") || "");
        state.confirmPassword = String(data.get("confirmPassword") || "");
        state.passwordBanner = null;

        if (state.newPassword !== state.confirmPassword) {
          state.passwordBanner = {
            tone: "danger",
            message: "A confirmação não confere com a nova senha.",
          };
          paint();
          return;
        }

        state.passwordSaving = true;
        paint();
        const result = await changePassword(state.currentPassword, state.newPassword);
        state.passwordSaving = false;
        if (!result.success) {
          state.passwordBanner = {
            tone: "danger",
            message: result.error?.message || "Não foi possível alterar a senha.",
          };
          paint();
          return;
        }
        state.currentPassword = "";
        state.newPassword = "";
        state.confirmPassword = "";
        state.passwordBanner = { tone: "success", message: "Senha alterada com sucesso." };
        paint();
      }
    })();
  });

  paint();
}
