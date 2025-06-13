import { LitElement, html } from "https://esm.run/lit";

class RegisterForm extends LitElement {
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
    const registerData = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    // Basic validation
    if (registerData.password.length < 6) {
      this.error = "Password must be at least 6 characters long";
      this.loading = false;
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });

      if (response.ok) {
        window.location.href = "/";
      } else {
        const error = await response.json();
        this.error = error.detail || "Registration failed";
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
          <label for="register-name">Full Name</label>
          <input
            type="text"
            id="register-name"
            name="name"
            required
            placeholder="Enter your full name"
            ?disabled=${this.loading}
          />
        </div>

        <div class="form-group">
          <label for="register-email">Email</label>
          <input
            type="email"
            id="register-email"
            name="email"
            required
            placeholder="Enter your email"
            ?disabled=${this.loading}
          />
        </div>

        <div class="form-group">
          <label for="register-password">Password</label>
          <input
            type="password"
            id="register-password"
            name="password"
            required
            placeholder="Enter a password (min 6 characters)"
            minlength="6"
            ?disabled=${this.loading}
          />
          <small>Must be at least 6 characters long</small>
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
              ? html`<i class="fas fa-spinner fa-spin"></i> Creating account...`
              : html`<i class="fas fa-user-plus"></i> Create Account`}
          </button>
        </div>
      </form>
    `;
  }
}

customElements.define("register-form", RegisterForm);
