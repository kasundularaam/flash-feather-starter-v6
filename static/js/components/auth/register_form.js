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

  // Disable Shadow DOM for global styles
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
        // Cookies are set automatically by the server
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
      <form class="register-form-container" @submit=${this.handleSubmit}>
        <div class="register-form-group">
          <label for="name" class="register-form-label">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            placeholder="Enter your full name"
            class="register-form-input"
          />
        </div>

        <div class="register-form-group">
          <label for="email" class="register-form-label">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="Enter your email"
            class="register-form-input"
          />
        </div>

        <div class="register-form-group">
          <label for="password" class="register-form-label">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            placeholder="Enter a password (min 6 characters)"
            minlength="6"
            class="register-form-input"
          />
        </div>

        ${this.error
          ? html`<div class="register-form-error">${this.error}</div>`
          : ""}

        <button
          type="submit"
          ?disabled=${this.loading}
          class="register-form-btn"
        >
          ${this.loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <style>
        .register-form-container {
          width: 100%;
        }

        .register-form-group {
          margin-bottom: 1rem;
        }

        .register-form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #333;
        }

        .register-form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color 0.3s;
        }

        .register-form-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }

        .register-form-error {
          color: #e74c3c;
          margin: 1rem 0;
          padding: 0.75rem;
          background: #fdf2f2;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .register-form-btn {
          width: 100%;
          padding: 0.75rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .register-form-btn:hover:not(:disabled) {
          background: #5a6fd8;
        }

        .register-form-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      </style>
    `;
  }
}

customElements.define("register-form", RegisterForm);
