import os
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from fastapi import Request

# Check for required environment variables
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')

# OAuth configuration with proper setup
config_data = {
    'GOOGLE_CLIENT_ID': GOOGLE_CLIENT_ID,
    'GOOGLE_CLIENT_SECRET': GOOGLE_CLIENT_SECRET
}

config = Config(environ=config_data)
oauth = OAuth(config)

oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)


class GoogleAuthService:
    @staticmethod
    async def get_authorization_url(request: Request):
        """Get Google OAuth authorization URL"""
        # Create redirect URI - this must match what's in Google Console
        redirect_uri = request.url_for('google_callback')

        # Use proper authlib method
        return await oauth.google.authorize_redirect(request, redirect_uri)

    @staticmethod
    async def handle_callback(request: Request):
        """Handle Google OAuth callback"""
        try:
            # Get token from Google
            token = await oauth.google.authorize_access_token(request)

            # Get user info from token
            user_info = token.get('userinfo')

            if not user_info:
                raise Exception("Failed to get user info from Google")

            return {
                'email': user_info.get('email'),
                'name': user_info.get('name'),
                'picture': user_info.get('picture')
            }
        except Exception as e:
            raise Exception(f"Google OAuth callback failed: {str(e)}")
