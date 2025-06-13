import { LitElement, html } from "https://esm.run/lit";

class LoginForm extends LitElement {
  static get properties() {
    return {
      loading: { type: Boolean },
      error: { type: String },
    };
  }

  constructor() {
    super();
    this.loading = false;
    this.error = "";
  }

  // Disable Shadow DOM for semantic styles
  createRenderRoot() {
    return this;
  }

  async handleSubmit(e) {
    e.preventDefault();
    this.loading = true;
    this.error = "";

    const formData = new FormData(e.target);
    const loginData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      if (response.ok) {
        window.location.href = "/";
      } else {
        const error = await response.json();
        this.error = error.detail || "Login failed";
      }
    } catch (err) {
      this.error = "Network error occurred";
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <form @submit=${this.handleSubmit}>
        <div class="form-group">
          <label for="login-email">Email</label>
          <input
            type="email"
            id="login-email"
            name="email"
            required
            placeholder="Enter your email"
            ?disabled=${this.loading}
          />
        </div>

        <div class="form-group">
          <label for="login-password">Password</label>
          <input
            type="password"
            id="login-password"
            name="password"
            required
            placeholder="Enter your password"
            ?disabled=${this.loading}
          />
        </div>

        ${this.error
          ? html`<div class="error-message">
              <i class="fas fa-exclamation-circle"></i>
              ${this.error}
            </div>`
          : ""}

        <div class="form-group">
          <button type="submit" ?disabled=${this.loading}>
            ${this.loading
              ? html`<i class="fas fa-spinner fa-spin"></i> Signing in...`
              : html`<i class="fas fa-sign-in-alt"></i> Sign In`}
          </button>
        </div>
      </form>
    `;
  }
}

customElements.define("login-form", LoginForm);
