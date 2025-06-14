import { LitElement, html } from "https://esm.run/lit";

class AppHeader extends LitElement {
  static get properties() {
    return {
      user: { type: Object },
      loading: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.user = null;
    this.loading = false;
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadCurrentUser();
  }

  async loadCurrentUser() {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        this.user = await response.json();
      }
    } catch (error) {
      console.log("Not authenticated");
    }
  }

  async handleLogout() {
    this.loading = true;
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <div class="top-bar">
        <div class="top-bar-left">
          <ul class="dropdown menu" data-dropdown-menu>
            <li class="menu-text">
              <a href="/">
                <strong
                  ><i class="fas fa-feather-alt"></i> Flash Feather</strong
                >
              </a>
            </li>
          </ul>
        </div>

        <div class="top-bar-right">
          <ul class="menu">
            ${this.user
              ? html`
                  <li>
                    <span
                      ><i class="fas fa-user-circle"></i> ${this.user
                        .name}</span
                    >
                  </li>
                  <li>
                    <button
                      class="button alert small"
                      @click=${this.handleLogout}
                      ?disabled=${this.loading}
                    >
                      ${this.loading
                        ? html`
                            <i class="fas fa-spinner fa-spin"></i> Logging
                            out...
                          `
                        : html` <i class="fas fa-sign-out-alt"></i> Logout `}
                    </button>
                  </li>
                `
              : html`
                  <li>
                    <a href="/login" class="button primary small">
                      <i class="fas fa-sign-in-alt"></i> Login
                    </a>
                  </li>
                  <li>
                    <a href="/register" class="button success small">
                      <i class="fas fa-user-plus"></i> Register
                    </a>
                  </li>
                `}
          </ul>
        </div>
      </div>
    `;
  }
}

customElements.define("app-header", AppHeader);
