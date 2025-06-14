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
        class="button expanded secondary"
        @click=${this.handleGoogleSignin}
        ?disabled=${this.loading}
      >
        ${this.loading
          ? html` <i class="fas fa-spinner fa-spin"></i> Connecting... `
          : html` <i class="fab fa-google"></i> Continue with Google `}
      </button>
    `;
  }
}

customElements.define("google-signin-button", GoogleSigninButton);
