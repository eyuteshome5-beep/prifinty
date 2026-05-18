"""
Secrets Protection Vault & Environmental Auditing Utility (ASCII Safe)
"""
import os
import sys

class SecretVault:
    """
    Secrets Protection Vault Utility
    Validates, safeguards, and warns against exposing sensitive credentials or default keys.
    """
    
    DEFAULT_KEYS = {
        'JWT_SECRET_KEY': 'your-super-secret-key-change-this-in-production',
        'SMTP_USER': 'your-email@gmail.com',
        'SMTP_PASSWORD': 'your-app-password',
        'LASTFM_API_KEY': 'your_lastfm_api_key_here'
    }

    @classmethod
    def audit_environment(cls, app):
        """Audits the environment variable configurations for vulnerabilities"""
        env_mode = app.config.get('ENV', 'development')
        is_prod = env_mode == 'production' or os.environ.get('FLASK_ENV') == 'production'
        
        critical_vulnerabilities = []
        
        print("\n--- [SECURE] Prefinity Secret Vault Security Audit ---")
        for key, default in cls.DEFAULT_KEYS.items():
            current_val = app.config.get(key) or os.environ.get(key)
            if not current_val or current_val == default:
                if is_prod:
                    print(f"[SECURITY CRITICAL] '{key}' is using default template values in production!", file=sys.stderr)
                    critical_vulnerabilities.append(key)
                else:
                    print(f"[Security Alert] '{key}' is unconfigured or using template default value. (Non-critical in {env_mode} mode)")
                    
        # Check MongoDB URI safety
        mongo_uri = app.config.get('MONGO_URI') or os.environ.get('MONGO_URI')
        if mongo_uri:
            if 'localhost' in mongo_uri and is_prod:
                print("[SECURITY CRITICAL] Local database URI configured in production environment!", file=sys.stderr)
                critical_vulnerabilities.append('MONGO_URI')
            else:
                # Mask credentials in console outputs for privacy
                masked_uri = mongo_uri
                if '@' in mongo_uri:
                    parts = mongo_uri.split('@')
                    prefix_parts = parts[0].split('://')
                    if len(prefix_parts) > 1:
                        scheme = prefix_parts[0]
                        masked_uri = f"{scheme}://****:****@{parts[1]}"
                print(f"[OK] Database connection string verified: {masked_uri}")
                
        if critical_vulnerabilities:
            print(f"[CRITICAL ALERT] Found {len(critical_vulnerabilities)} high-risk credentials exposed! Fix immediately.", file=sys.stderr)
        else:
            print("[OK] Secret Vault verification: No critical production leaks detected.")
        print("------------------------------------------------\n")
        
        return critical_vulnerabilities
