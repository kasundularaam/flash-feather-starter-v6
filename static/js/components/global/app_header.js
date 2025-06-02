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
      <header class="app-header">
        <div class="header-container">
          <div class="logo">
            <a href="/">
              <i class="fas fa-feather-alt"></i>
              Flash Feather
            </a>
          </div>

          <nav class="header-nav">
            ${this.user
              ? html`
                  <div class="user-menu">
                    <span class="user-name">Hello, ${this.user.name}!</span>
                    <button
                      class="logout-btn"
                      @click=${this.handleLogout}
                      ?disabled=${this.loading}
                    >
                      ${this.loading ? "Logging out..." : "Logout"}
                    </button>
                  </div>
                `
              : html`
                  <div class="auth-links">
                    <a href="/login" class="nav-link">Login</a>
                    <a href="/register" class="nav-link register">Register</a>
                  </div>
                `}
          </nav>
        </div>
      </header>

      <style>
        .app-header {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        .header-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo a {
          color: white;
          text-decoration: none;
          font-size: 1.5rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .logo i {
          color: #4caf50;
        }
        .user-menu {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .user-name {
          color: white;
          font-weight: 500;
        }
        .logout-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .logout-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
        }
        .logout-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .auth-links {
          display: flex;
          gap: 1rem;
        }
        .nav-link {
          color: white;
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          transition: all 0.3s;
        }
        .nav-link:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .nav-link.register {
          background: #4caf50;
          color: white;
        }
        .nav-link.register:hover {
          background: #45a049;
        }
      </style>
    `;
  }
}

customElements.define("app-header", AppHeader);
