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

  // Disable Shadow DOM for semantic styles
  createRenderRoot() {
    return this;
  }

  async handleGoogleSignin() {
    this.loading = true;
    try {
      window.location.href = "/api/auth/google";
    } catch (err) {
      console.error("Google sign-in error:", err);
      this.loading = false;
    }
  }

  render() {
    return html`
      <button
        data-variant="secondary"
        @click=${this.handleGoogleSignin}
        ?disabled=${this.loading}
        class="google-signin-btn"
      >
        ${this.loading
          ? html`<i class="fas fa-spinner fa-spin"></i> Connecting...`
          : html`<i class="fab fa-google"></i> Continue with Google`}
      </button>

      <style>
        .google-signin-btn {
          width: 100%;
          justify-content: center;
        }

        .google-signin-btn i {
          color: #4285f4;
        }

        .google-signin-btn:hover i {
          color: var(--white);
        }
      </style>
    `;
  }
}

customElements.define("google-signin-button", GoogleSigninButton);
