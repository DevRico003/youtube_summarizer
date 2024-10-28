import os
import time
import requests
import json
from dotenv import load_dotenv
import shutil
import re

def load_credentials():
    """Load YouTube credentials from .env file"""
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if not os.path.exists(env_path):
        raise FileNotFoundError(".env file not found")
    
    load_dotenv(env_path)
    email = os.getenv('YOUTUBE_EMAIL')
    password = os.getenv('YOUTUBE_PASSWORD')
    
    if not email or not password:
        raise ValueError("YouTube credentials not found in .env file")
    
    return email, password

def extract_cookies():
    """Extract YouTube cookies using requests"""
    try:
        print("Starting cookie extraction process...")
        
        # Path for the cookies file
        cookies_path = os.path.join(os.path.dirname(__file__), 'cookies.txt')
        
        # Create backup if existing cookies file exists
        if os.path.exists(cookies_path):
            backup_path = cookies_path + '.backup'
            shutil.copy2(cookies_path, backup_path)
            print("Created backup of existing cookies file")
        
        # Create session
        session = requests.Session()
        
        # Headers to simulate browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1'
        }
        
        session.headers.update(headers)
        
        # Load credentials
        email, password = load_credentials()
        print("Credentials loaded successfully")
        
        try:
            # Get initial page and CSRF tokens
            print("Getting initial page...")
            response = session.get('https://accounts.google.com/ServiceLogin')
            
            # Extract CSRF token and other hidden fields
            csrf_token = re.search(r'data-initial-setup-data="(.+?)"', response.text)
            if csrf_token:
                csrf_token = csrf_token.group(1)
            
            # First step: Email
            print("Submitting email...")
            email_data = {
                'Email': email,
                'continue': 'https://www.youtube.com',
                'flowName': 'GlifWebSignIn',
                'flowEntry': 'ServiceLogin',
                'checkConnection': 'youtube',
                'GALX': csrf_token
            }
            
            response = session.post(
                'https://accounts.google.com/_/signin/identifier',
                data=email_data,
                allow_redirects=True
            )
            
            # Second step: Password
            print("Submitting password...")
            password_data = {
                'Passwd': password,
                'continue': 'https://www.youtube.com',
                'GALX': csrf_token
            }
            
            response = session.post(
                'https://accounts.google.com/_/signin/challenge',
                data=password_data,
                allow_redirects=True
            )
            
            # Follow redirects to YouTube
            print("Following redirects to YouTube...")
            response = session.get('https://www.youtube.com')
            
            # Get all cookies
            cookies = session.cookies
            
            print(f"Retrieved {len(cookies)} cookies")
            
            # Write cookies in Netscape format
            print("Writing cookies file...")
            with open(cookies_path, 'w') as f:
                f.write("# Netscape HTTP Cookie File\n")
                for cookie in cookies:
                    secure = "TRUE" if cookie.secure else "FALSE"
                    expiry = int(time.time()) + 365*24*60*60
                    domain = cookie.domain if cookie.domain.startswith('.') else '.' + cookie.domain
                    f.write(f"{domain}\tTRUE\t{cookie.path}\t{secure}\t{expiry}\t{cookie.name}\t{cookie.value}\n")
            
            print("Cookies saved successfully!")
            return True
            
        except Exception as e:
            print(f"Error during authentication process: {str(e)}")
            raise
            
    except Exception as e:
        print(f"Error extracting cookies: {str(e)}")
        # Restore backup if it exists
        if 'backup_path' in locals() and os.path.exists(backup_path):
            shutil.copy2(backup_path, cookies_path)
            print("Restored cookies from backup")
        return False

if __name__ == "__main__":
    extract_cookies()
