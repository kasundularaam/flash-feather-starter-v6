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

  // Disable Shadow DOM for global styles
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
        // Cookies are set automatically by the server
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
      <form class="login-form" @submit=${this.handleSubmit}>
        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="Enter your email"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            placeholder="Enter your password"
          />
        </div>

        ${this.error ? html`<div class="error">${this.error}</div>` : ""}

        <button type="submit" ?disabled=${this.loading}>
          ${this.loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <style>
        .login-form {
          width: 100%;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #333;
        }
        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color 0.3s;
        }
        .form-group input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }
        .error {
          color: #e74c3c;
          margin: 1rem 0;
          padding: 0.75rem;
          background: #fdf2f2;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        button {
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
        button:hover:not(:disabled) {
          background: #5a6fd8;
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      </style>
    `;
  }
}

customElements.define("login-form", LoginForm);
