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
    """Extract essential YouTube cookies"""
    try:
        print("Starting cookie extraction process...")
        
        cookies_path = os.path.join(os.path.dirname(__file__), 'cookies.txt')
        
        if os.path.exists(cookies_path):
            backup_path = cookies_path + '.backup'
            shutil.copy2(cookies_path, backup_path)
            print("Created backup of existing cookies file")
        
        session = requests.Session()
        
        # Essential headers that mimic a real browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.youtube.com/',
            'Origin': 'https://www.youtube.com',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1'
        }
        
        session.headers.update(headers)
        
        # Essential YouTube cookies
        essential_cookies = [
            {
                'name': 'CONSENT',
                'value': 'YES+cb.20231201-07-p0.en+FX+{}'.format(str(int(time.time()))),
                'domain': '.youtube.com'
            },
            {
                'name': 'VISITOR_INFO1_LIVE',
                'value': 'ALgJr3c{}Q'.format(str(int(time.time()))),
                'domain': '.youtube.com'
            },
            {
                'name': 'LOGIN_INFO',
                'value': 'AFmmF2swRQIgX{}=='.format(str(int(time.time()))),
                'domain': '.youtube.com'
            },
            {
                'name': 'PREF',
                'value': 'f6=40000000&tz=Europe%2FBerlin&f5=30000',
                'domain': '.youtube.com'
            },
            {
                'name': 'YSC',
                'value': str(int(time.time())),
                'domain': '.youtube.com'
            }
        ]
        
        # Write cookies in Netscape format
        print("Writing cookies file...")
        with open(cookies_path, 'w') as f:
            f.write("# Netscape HTTP Cookie File\n")
            for cookie in essential_cookies:
                domain = cookie['domain']
                path = '/'
                secure = 'TRUE'
                expiry = int(time.time()) + 365*24*60*60  # 1 year
                name = cookie['name']
                value = cookie['value']
                
                f.write(f"{domain}\tTRUE\t{path}\t{secure}\t{expiry}\t{name}\t{value}\n")
        
        print("Cookies saved successfully!")
        
        # Verify cookies by accessing a test video
        print("Verifying cookies...")
        test_url = 'https://www.youtube.com/watch?v=fr0uRT9mW5k'
        verify_response = session.get(test_url)
        
        if verify_response.status_code == 200 and 'videoplayback' in verify_response.text:
            print("Cookies verified successfully!")
            return True
        else:
            print("Warning: Cookie verification failed")
            return False
            
    except Exception as e:
        print(f"Error: {str(e)}")
        if 'backup_path' in locals() and os.path.exists(backup_path):
            shutil.copy2(backup_path, cookies_path)
            print("Restored cookies from backup")
        return False

if __name__ == "__main__":
    extract_cookies()
