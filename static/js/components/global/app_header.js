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

  // Disable Shadow DOM for semantic styles
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
      <header class="app-header">
        <div class="container">
          <nav class="app-header-nav">
            <a href="/" class="app-header-logo">
              <i class="fas fa-feather-alt"></i>
              Flash Feather
            </a>

            <div class="app-header-actions">
              ${this.user
                ? html`
                    <span class="app-header-user"
                      >Hello, <strong>${this.user.name}</strong>!</span
                    >
                    <button
                      data-variant="ghost"
                      @click=${this.handleLogout}
                      ?disabled=${this.loading}
                    >
                      ${this.loading ? "Logging out..." : "Logout"}
                    </button>
                  `
                : html`
                    <a href="/login" data-variant="ghost">Login</a>
                    <a href="/register">Register</a>
                  `}
            </div>
          </nav>
        </div>
      </header>

      <style>
        .app-header {
          background: var(--white-05);
          border-bottom: 1px solid var(--white-10);
          backdrop-filter: blur(10px);
          margin-bottom: var(--space-6);
        }

        .app-header-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-4) 0;
        }

        .app-header-logo {
          font-family: var(--font-fancy);
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--white) !important;
          text-decoration: none !important;
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .app-header-logo i {
          color: var(--accent);
        }

        .app-header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .app-header-user {
          color: var(--white-70);
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .app-header-nav {
            flex-direction: column;
            gap: var(--space-4);
          }

          .app-header-actions {
            flex-direction: column;
            gap: var(--space-2);
            width: 100%;
          }

          .app-header-actions button,
          .app-header-actions a {
            width: 100%;
            text-align: center;
          }
        }
      </style>
    `;
  }
}

customElements.define("app-header", AppHeader);
