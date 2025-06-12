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

  // Disable Shadow DOM for global styles
  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadCurrentUser();
  }

  async loadCurrentUser() {
    try {
      // Just ask the server for current user - auth middleware handles everything
      const response = await fetch("/api/auth/me");

      if (response.ok) {
        this.user = await response.json();
      }
      // If not authenticated, user stays null - no client-side logic needed
    } catch (error) {
      // Silently fail - server handles auth, not the client
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
        // Let server handle the redirect by reloading page
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
      <header class="app-header-container">
        <div class="app-header-wrapper">
          <div class="app-header-logo">
            <a href="/" class="app-header-logo-link">
              <i class="fas fa-feather-alt"></i>
              Flash Feather
            </a>
          </div>

          <nav class="app-header-nav">
            ${this.user
              ? html`
                  <div class="app-header-user-menu">
                    <span class="app-header-user-name"
                      >Hello, ${this.user.name}!</span
                    >
                    <button
                      class="app-header-logout-btn"
                      @click=${this.handleLogout}
                      ?disabled=${this.loading}
                    >
                      ${this.loading ? "Logging out..." : "Logout"}
                    </button>
                  </div>
                `
              : html`
                  <div class="app-header-auth-links">
                    <a href="/login" class="app-header-nav-link">Login</a>
                    <a
                      href="/register"
                      class="app-header-nav-link app-header-register"
                      >Register</a
                    >
                  </div>
                `}
          </nav>
        </div>
      </header>

      <style>
        .app-header-container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .app-header-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .app-header-logo-link {
          color: white;
          text-decoration: none;
          font-size: 1.5rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .app-header-logo-link i {
          color: #4caf50;
        }

        .app-header-user-menu {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .app-header-user-name {
          color: white;
          font-weight: 500;
        }

        .app-header-logout-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .app-header-logout-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
        }

        .app-header-logout-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .app-header-auth-links {
          display: flex;
          gap: 1rem;
        }

        .app-header-nav-link {
          color: white;
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          transition: all 0.3s;
        }

        .app-header-nav-link:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .app-header-register {
          background: #4caf50;
          color: white;
        }

        .app-header-register:hover {
          background: #45a049;
        }
      </style>
    `;
  }
}

customElements.define("app-header", AppHeader);
