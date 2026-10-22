import { serviceTypeIcon } from "./service-icons.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderField({
  id,
  label,
  controlHtml,
  error = "",
  hint = "",
  describedBy,
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const described = [error ? errorId : "", hint && !error ? hintId : "", describedBy]
    .filter(Boolean)
    .join(" ");

  return `
    <div class="ds-field" data-field="${escapeHtml(id)}">
      <label class="ds-field__label" for="${escapeHtml(id)}">${escapeHtml(label)}</label>
      <div class="ds-input-wrap${error ? " is-error" : ""}">
        ${controlHtml.replace("{{described}}", described ? `aria-describedby="${described}"` : "")}
      </div>
      ${error ? `<p class="ds-field__error" id="${errorId}">${escapeHtml(error)}</p>` : ""}
      ${hint && !error ? `<p class="ds-field__hint" id="${hintId}">${escapeHtml(hint)}</p>` : ""}
    </div>
  `;
}

function optionLabel(option) {
  return `${option.name}${option.specialty ? ` — ${option.specialty}` : ""}`;
}

export function renderSelectField({ id, label, options, value, error, placeholder, required }) {
  const placeholderText = placeholder || "Selecione";
  const selected = options.find((option) => option.id === value);
  const display = selected ? optionLabel(selected) : placeholderText;
  const listId = `${id}-listbox`;

  const nativeOptions = [
    `<option value="">${escapeHtml(placeholderText)}</option>`,
    ...options.map(
      (option) => `
        <option value="${escapeHtml(option.id)}" ${option.id === value ? "selected" : ""}>
          ${escapeHtml(optionLabel(option))}
        </option>
      `,
    ),
  ].join("");

  const menuOptions = [
    {
      id: "",
      label: placeholderText,
      selected: !value,
    },
    ...options.map((option) => ({
      id: option.id,
      label: optionLabel(option),
      selected: option.id === value,
    })),
  ]
    .map(
      (option) => `
        <li
          class="app-select__option${option.selected ? " is-selected" : ""}"
          role="option"
          tabindex="-1"
          data-value="${escapeHtml(option.id)}"
          aria-selected="${option.selected ? "true" : "false"}"
          id="${escapeHtml(id)}-opt-${escapeHtml(option.id || "empty")}"
        >
          ${escapeHtml(option.label)}
        </li>
      `,
    )
    .join("");

  return renderField({
    id,
    label,
    error,
    controlHtml: `
      <div class="app-select-wrap" data-custom-select>
        <select
          class="app-select-native"
          name="${escapeHtml(id)}"
          tabindex="-1"
          aria-hidden="true"
          ${required ? "required" : ""}
        >${nativeOptions}</select>
        <button
          class="ds-input app-select__trigger"
          type="button"
          id="${escapeHtml(id)}"
          {{described}}
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-controls="${escapeHtml(listId)}"
          ${error ? 'aria-invalid="true"' : ""}
          ${required ? 'aria-required="true"' : ""}
        >
          <span class="app-select__value${selected ? "" : " is-placeholder"}">${escapeHtml(display)}</span>
        </button>
        <svg class="ds-icon ds-icon--sm app-select__chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6"></path>
        </svg>
        <ul class="app-select__menu" id="${escapeHtml(listId)}" role="listbox" hidden>
          ${menuOptions}
        </ul>
      </div>
    `,
  });
}

function closeSelect(wrap) {
  const trigger = wrap.querySelector(".app-select__trigger");
  const menu = wrap.querySelector(".app-select__menu");
  if (!trigger || !menu) {
    return;
  }
  menu.hidden = true;
  trigger.setAttribute("aria-expanded", "false");
  wrap.classList.remove("is-open");
}

function openSelect(wrap) {
  document.querySelectorAll("[data-custom-select].is-open").forEach((openWrap) => {
    if (openWrap !== wrap) {
      closeSelect(openWrap);
    }
  });

  const trigger = wrap.querySelector(".app-select__trigger");
  const menu = wrap.querySelector(".app-select__menu");
  if (!trigger || !menu) {
    return;
  }

  menu.hidden = false;
  trigger.setAttribute("aria-expanded", "true");
  wrap.classList.add("is-open");

  const selected = menu.querySelector('[aria-selected="true"]') || menu.querySelector("[role='option']");
  selected?.focus?.();
  selected?.scrollIntoView({ block: "nearest" });
}

function selectOption(wrap, optionEl) {
  const native = wrap.querySelector(".app-select-native");
  const trigger = wrap.querySelector(".app-select__trigger");
  const valueEl = wrap.querySelector(".app-select__value");
  const menu = wrap.querySelector(".app-select__menu");
  const value = optionEl.dataset.value ?? "";
  const label = optionEl.textContent.trim();

  if (native) {
    native.value = value;
    native.dispatchEvent(new Event("input", { bubbles: true }));
    native.dispatchEvent(new Event("change", { bubbles: true }));
  }

  menu.querySelectorAll("[role='option']").forEach((item) => {
    const selected = item === optionEl;
    item.classList.toggle("is-selected", selected);
    item.setAttribute("aria-selected", selected ? "true" : "false");
  });

  if (valueEl) {
    valueEl.textContent = label;
    valueEl.classList.toggle("is-placeholder", value === "");
  }

  closeSelect(wrap);
  trigger?.focus();
}

export function bindSelectFields(root) {
  root.querySelectorAll("[data-custom-select]").forEach((wrap) => {
    if (wrap.dataset.bound === "true") {
      return;
    }
    wrap.dataset.bound = "true";

    const trigger = wrap.querySelector(".app-select__trigger");
    const menu = wrap.querySelector(".app-select__menu");
    if (!trigger || !menu) {
      return;
    }

    menu.querySelectorAll("[role='option']").forEach((option) => {
      option.tabIndex = -1;
    });

    wrap.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    trigger.addEventListener("click", () => {
      if (wrap.classList.contains("is-open")) {
        closeSelect(wrap);
      } else {
        openSelect(wrap);
      }
    });

    menu.addEventListener("click", (event) => {
      const option = event.target.closest("[role='option']");
      if (option) {
        selectOption(wrap, option);
      }
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openSelect(wrap);
      }
    });

    menu.addEventListener("keydown", (event) => {
      const options = [...menu.querySelectorAll("[role='option']")];
      const current = document.activeElement?.closest?.("[role='option']");
      const index = options.indexOf(current);

      if (event.key === "Escape") {
        event.preventDefault();
        closeSelect(wrap);
        trigger.focus();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const next = options[Math.min(index + 1, options.length - 1)] || options[0];
        next?.focus();
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const prev = options[Math.max(index - 1, 0)] || options[0];
        prev?.focus();
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (current) {
          selectOption(wrap, current);
        }
      }
    });
  });

  if (!root.dataset.selectOutsideBound) {
    root.dataset.selectOutsideBound = "true";
    document.addEventListener("click", (event) => {
      root.querySelectorAll("[data-custom-select].is-open").forEach((wrap) => {
        if (!wrap.contains(event.target)) {
          closeSelect(wrap);
        }
      });
    });
  }
}

export function renderOptionGroup({ name, legend, options, value, error }) {
  const errorId = `${name}-error`;

  return `
    <fieldset class="ds-field" data-field="${escapeHtml(name)}">
      <legend class="ds-field__label">${escapeHtml(legend)}</legend>
      <div class="ds-list" role="radiogroup" aria-label="${escapeHtml(legend)}" ${error ? `aria-describedby="${errorId}"` : ""}>
        ${options
          .map(
            (option) => `
              <button
                class="ds-option"
                type="button"
                role="radio"
                name="${escapeHtml(name)}"
                data-value="${escapeHtml(option.id)}"
                aria-checked="${option.id === value ? "true" : "false"}"
              >
                <span class="ds-icon-tile">
                  ${serviceTypeIcon(option)}
                </span>
                <span class="ds-option__body">
                  <span class="ds-option__title">${escapeHtml(option.name)}</span>
                  <span class="ds-option__sub">${escapeHtml(option.description || "")}</span>
                </span>
                <span class="ds-check${option.id === value ? " is-checked" : ""}">
                  <svg class="ds-icon ds-icon--sm" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m5 12 5 5 9-9"></path>
                  </svg>
                </span>
              </button>
            `,
          )
          .join("")}
      </div>
      ${error ? `<p class="ds-field__error" id="${errorId}">${escapeHtml(error)}</p>` : ""}
    </fieldset>
  `;
}

export { escapeHtml };
