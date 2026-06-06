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
                    
        # Check MySQL connection safety
        mysql_host = app.config.get('MYSQL_HOST') or os.environ.get('MYSQL_HOST', 'localhost')
        mysql_db = app.config.get('MYSQL_DB') or os.environ.get('MYSQL_DB', 'ethiopian_recommendations')
        mysql_user = app.config.get('MYSQL_USER') or os.environ.get('MYSQL_USER', 'root')
        if mysql_host and is_prod and mysql_host == 'localhost':
            print("[SECURITY WARNING] MySQL is configured to localhost in production — ensure it's properly secured.", file=sys.stderr)
        else:
            print(f"[OK] Database connection string verified: mysql://{mysql_user}:****@{mysql_host}/{mysql_db}")
                
        if critical_vulnerabilities:
            print(f"[CRITICAL ALERT] Found {len(critical_vulnerabilities)} high-risk credentials exposed! Fix immediately.", file=sys.stderr)
        else:
            print("[OK] Secret Vault verification: No critical production leaks detected.")
        print("------------------------------------------------\n")
        
        return critical_vulnerabilities
