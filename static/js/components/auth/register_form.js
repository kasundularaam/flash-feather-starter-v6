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
        <label>
          <i class="fas fa-user"></i> Full Name
          <input
            type="text"
            name="name"
            required
            placeholder="Enter your full name"
          />
        </label>

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
            placeholder="Enter a password (min 6 characters)"
            minlength="6"
          />
          <p class="help-text">Password must be at least 6 characters long</p>
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
          class="button success expanded"
          ?disabled=${this.loading}
        >
          ${this.loading
            ? html` <i class="fas fa-spinner fa-spin"></i> Creating account... `
            : html` <i class="fas fa-user-plus"></i> Create Account `}
        </button>
      </form>
    `;
  }
}

customElements.define("register-form", RegisterForm);
