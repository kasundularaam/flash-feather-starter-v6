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
        <label>
          <i class="fas fa-envelope"></i> Email
          <input
            type="email"
            name="email"
            required
            placeholder="Enter your email"
          />
        </label>

        <label>
          <i class="fas fa-lock"></i> Password
          <input
            type="password"
            name="password"
            required
            placeholder="Enter your password"
          />
        </label>

        ${this.error
          ? html`
              <div class="callout alert">
                <i class="fas fa-exclamation-triangle"></i> ${this.error}
              </div>
            `
          : ""}

        <button
          type="submit"
          class="button primary expanded"
          ?disabled=${this.loading}
        >
          ${this.loading
            ? html` <i class="fas fa-spinner fa-spin"></i> Signing in... `
            : html` <i class="fas fa-sign-in-alt"></i> Sign In `}
        </button>
      </form>
    `;
  }
}

customElements.define("login-form", LoginForm);
