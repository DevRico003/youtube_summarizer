import os
import time
from datetime import datetime

def update_cookie_expiry():
    try:
        # Pfade definieren
        cookies_path = os.path.join(os.path.dirname(__file__), 'cookies.txt')
        temp_path = os.path.join(os.path.dirname(__file__), 'cookies_temp.txt')
        
        # Aktuelle Zeit und Zukunftsdaten berechnen
        current_time = int(time.time())
        one_year = current_time + (365 * 24 * 60 * 60)
        two_years = current_time + (2 * 365 * 24 * 60 * 60)
        
        # Cookie-Datei lesen und aktualisieren
        with open(cookies_path, 'r') as original, open(temp_path, 'w') as temp:
            # Header kopieren
            temp.write("# Netscape HTTP Cookie File\n")
            temp.write("# http://curl.haxx.se/rfc/cookie_spec.html\n")
            temp.write("# This is a generated file!  Do not edit.\n\n")
            
            # Cookies verarbeiten
            for line in original:
                if line.startswith('#') or not line.strip():
                    continue
                    
                parts = line.strip().split('\t')
                if len(parts) != 7:
                    continue
                
                domain, subdomain, path, secure, expiry, name, value = parts
                
                # Spezielle Behandlung für verschiedene Cookie-Typen
                if name in ['YSC']:
                    # Session-Cookie
                    expiry = '0'
                elif name in ['VISITOR_INFO1_LIVE', 'VISITOR_PRIVACY_METADATA']:
                    # Längere Gültigkeit
                    expiry = str(two_years)
                elif name.startswith('__Secure-') and name.endswith('PSIDTS'):
                    # Kurze Gültigkeit
                    expiry = str(current_time + 48 * 60 * 60)  # 48 Stunden
                elif name.startswith('__Secure-') and name.endswith('PSIDCC'):
                    # Mittlere Gültigkeit
                    expiry = str(current_time + 7 * 24 * 60 * 60)  # 7 Tage
                else:
                    # Standard-Gültigkeit
                    expiry = str(one_year)
                
                # Aktualisierte Cookie-Zeile schreiben
                temp.write(f"{domain}\t{subdomain}\t{path}\t{secure}\t{expiry}\t{name}\t{value}\n")
        
        # Temporäre Datei mit der originalen austauschen
        os.replace(temp_path, cookies_path)
        print(f"Cookies wurden erfolgreich aktualisiert: {datetime.now()}")
        
    except Exception as e:
        print(f"Fehler beim Aktualisieren der Cookies: {str(e)}")
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    update_cookie_expiry()
