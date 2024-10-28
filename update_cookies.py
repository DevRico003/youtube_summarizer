import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from datetime import datetime
from dotenv import load_dotenv
import sys
from selenium.webdriver.common.keys import Keys

def wait_and_find_element(driver, selectors, timeout=20):
    """Versucht mehrere Selektoren nacheinander"""
    for by, selector in selectors:
        try:
            element = WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable((by, selector))
            )
            print(f"Element gefunden: {selector}")
            return element
        except Exception as e:
            print(f"Selector {selector} nicht gefunden, versuche nächsten...")
            continue
    raise Exception("Kein Element mit den gegebenen Selektoren gefunden")

def get_youtube_cookies():
    try:
        env_path = os.path.join(os.path.dirname(__file__), '.env')
        load_dotenv(env_path)
        
        email = os.getenv('YOUTUBE_EMAIL')
        password = os.getenv('YOUTUBE_PASSWORD')
        
        print(f"Verwende Email: {email}")
        
        chrome_options = Options()
        chrome_options.add_argument('--headless=new')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--start-maximized')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--lang=en-US,en')
        chrome_options.add_argument('--ignore-certificate-errors')
        chrome_options.add_argument('--allow-running-insecure-content')
        chrome_options.add_argument(f'--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        chrome_options.add_experimental_option('excludeSwitches', ['enable-automation', 'enable-logging'])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_experimental_option('prefs', {
            'credentials_enable_service': False,
            'profile.password_manager_enabled': False,
            'profile.default_content_setting_values.notifications': 2
        })
        
        driver = webdriver.Chrome(options=chrome_options)
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        driver.execute_cdp_cmd('Network.setUserAgentOverride', {
            "userAgent": 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        
        try:
            # Gehe zur Google Login Seite
            print("Navigiere zur Login-Seite...")
            driver.get('https://accounts.google.com/signin/v2/identifier?hl=en&flowName=GlifWebSignIn')
            time.sleep(3)
            
            # Email eingeben
            print("Email eingeben...")
            email_selectors = [
                (By.ID, "identifierId"),
                (By.NAME, "identifier"),
                (By.CSS_SELECTOR, 'input[type="email"]'),
                (By.XPATH, "//input[@type='email']")
            ]
            email_field = wait_and_find_element(driver, email_selectors)
            email_field.clear()
            email_field.send_keys(email)
            email_field.send_keys(Keys.RETURN)
            time.sleep(5)
            
            # Passwort eingeben
            print("Passwort eingeben...")
            password_selectors = [
                (By.NAME, "password"),
                (By.NAME, "Passwd"),
                (By.CSS_SELECTOR, 'input[type="password"]'),
                (By.CSS_SELECTOR, 'input[name="password"]'),
                (By.CSS_SELECTOR, 'input[name="Passwd"]'),
                (By.XPATH, "//input[@type='password']"),
                (By.XPATH, "//input[@name='password']"),
                (By.XPATH, "//input[@name='Passwd']"),
                (By.XPATH, "//div[@id='password']//input"),
                (By.CSS_SELECTOR, "#password input")
            ]
            
            # Warte und prüfe, ob wir auf der Passwort-Seite sind
            time.sleep(2)
            print(f"Aktuelle URL: {driver.current_url}")
            
            password_field = wait_and_find_element(driver, password_selectors)
            password_field.clear()
            password_field.send_keys(password)
            password_field.send_keys(Keys.RETURN)
            time.sleep(5)
            
            # Navigiere zum spezifischen Video
            print("Navigiere zum Video...")
            driver.get('https://www.youtube.com/watch?v=fr0uRT9mW5k')
            time.sleep(5)  # Warte auf Video-Ladung
            
            # Optional: Warte auf Video-Player
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.ID, "movie_player"))
                )
                print("Video-Player gefunden")
            except:
                print("Video-Player nicht gefunden, fahre trotzdem fort")
            
            # Cookies speichern
            cookies = driver.get_cookies()
            if not cookies:
                raise Exception("Keine Cookies gefunden")
            
            print(f"Gefundene Cookies: {len(cookies)}")
            
            cookies_path = os.path.join(os.path.dirname(__file__), 'cookies.txt')
            backup_path = cookies_path + '.backup'
            
            if os.path.exists(cookies_path):
                os.replace(cookies_path, backup_path)
            
            with open(cookies_path, 'w') as f:
                f.write("# Netscape HTTP Cookie File\n")
                f.write("# https://curl.haxx.se/rfc/cookie_spec.html\n")
                f.write("# This is a generated file!  Do not edit.\n\n")
                
                for cookie in cookies:
                    secure = "TRUE" if cookie.get('secure', False) else "FALSE"
                    domain = cookie.get('domain', '')
                    if not domain.startswith('.'):
                        domain = '.' + domain
                    path = cookie.get('path', '/')
                    expires = str(int(cookie.get('expiry', time.time() + 365*24*60*60)))
                    name = cookie.get('name', '')
                    value = cookie.get('value', '')
                    
                    f.write(f"{domain}\tTRUE\t{path}\t{secure}\t{expires}\t{name}\t{value}\n")
            
            print(f"Cookies erfolgreich gespeichert: {datetime.now()}")
            return True
            
        finally:
            print("Browser wird geschlossen...")
            driver.quit()
            
    except Exception as e:
        print(f"Fehler beim Cookie-Export: {str(e)}")
        print("Stack Trace:", file=sys.stderr)
        import traceback
        traceback.print_exc()
        
        if 'backup_path' in locals() and os.path.exists(backup_path):
            os.replace(backup_path, cookies_path)
            print("Backup wiederhergestellt")
        return False

if __name__ == "__main__":
    get_youtube_cookies()
