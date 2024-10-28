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
        
        cookies_path = os.path.join(os.path.dirname(__file__), 'cookies.txt')
        
        if os.path.exists(cookies_path):
            backup_path = cookies_path + '.backup'
            shutil.copy2(cookies_path, backup_path)
            print("Created backup of existing cookies file")
        
        session = requests.Session()
        
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
        
        # Direct video URL
        video_url = 'https://www.youtube.com/watch?v=fr0uRT9mW5k'
        
        try:
            # First get the video page to get initial cookies
            print(f"Accessing video: {video_url}")
            response = session.get(video_url)
            
            if response.status_code != 200:
                raise Exception(f"Failed to access video: Status code {response.status_code}")
            
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
            
            # Verify cookies work by trying to access the video again
            print("Verifying cookies...")
            verify_response = session.get(video_url)
            if verify_response.status_code == 200:
                print("Cookies verified successfully!")
            else:
                print("Warning: Cookie verification failed")
            
            return True
            
        except Exception as e:
            print(f"Error during cookie extraction: {str(e)}")
            raise
            
    except Exception as e:
        print(f"Error: {str(e)}")
        if 'backup_path' in locals() and os.path.exists(backup_path):
            shutil.copy2(backup_path, cookies_path)
            print("Restored cookies from backup")
        return False

if __name__ == "__main__":
    extract_cookies()
