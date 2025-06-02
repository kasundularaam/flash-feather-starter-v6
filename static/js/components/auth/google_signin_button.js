import { LitElement, html } from "https://esm.run/lit";

class GoogleSigninButton extends LitElement {
  static get properties() {
    return {
      loading: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.loading = false;
  }

  // Disable Shadow DOM for global styles
  createRenderRoot() {
    return this;
  }

  async handleGoogleSignin() {
    this.loading = true;

    try {
      // Redirect to Google OAuth endpoint
      window.location.href = "/api/auth/google";
    } catch (err) {
      console.error("Google sign-in error:", err);
      this.loading = false;
    }
  }

  render() {
    return html`
      <button
        class="google-signin-btn"
        @click=${this.handleGoogleSignin}
        ?disabled=${this.loading}
      >
        <i class="fab fa-google"></i>
        ${this.loading ? "Connecting..." : "Continue with Google"}
      </button>

      <style>
        .google-signin-btn {
          width: 100%;
          padding: 0.75rem;
          background: #ffffff;
          color: #333;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.3s;
        }

        .google-signin-btn:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #ccc;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .google-signin-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .google-signin-btn i {
          color: #4285f4;
          font-size: 1.1rem;
        }
      </style>
    `;
  }
}

customElements.define("google-signin-button", GoogleSigninButton);
