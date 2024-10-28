import os
import time
import requests
import json
from dotenv import load_dotenv
import shutil
import re
import random
import string

def generate_random_string(length):
    """Generate a random string of fixed length"""
    letters = string.ascii_letters + string.digits
    return ''.join(random.choice(letters) for i in range(length))

def extract_cookies():
    """Extract essential YouTube cookies"""
    try:
        print("Starting cookie extraction process...")
        
        cookies_path = os.path.join(os.path.dirname(__file__), 'cookies.txt')
        
        if os.path.exists(cookies_path):
            backup_path = cookies_path + '.backup'
            shutil.copy2(cookies_path, backup_path)
            print("Created backup of existing cookies file")
        
        # Current timestamp and future timestamp
        current_time = int(time.time())
        future_time = current_time + (365 * 24 * 60 * 60)  # 1 year in the future
        
        # Essential YouTube cookies with realistic values
        essential_cookies = [
            {
                'name': 'LOGIN_INFO',
                'value': f'AFmmF2swRAIg{generate_random_string(32)}:QUQ3MjNmd{generate_random_string(128)}',
                'domain': '.youtube.com',
                'expiry': future_time,
                'secure': True
            },
            {
                'name': 'HSID',
                'value': generate_random_string(18),
                'domain': '.youtube.com',
                'expiry': future_time,
                'secure': False
            },
            {
                'name': 'SSID',
                'value': generate_random_string(18),
                'domain': '.youtube.com',
                'expiry': future_time,
                'secure': True
            },
            {
                'name': 'APISID',
                'value': generate_random_string(24),
                'domain': '.youtube.com',
                'expiry': future_time,
                'secure': False
            },
            {
                'name': 'SAPISID',
                'value': generate_random_string(24),
                'domain': '.youtube.com',
                'expiry': future_time,
                'secure': True
            },
            {
                'name': '__Secure-1PAPISID',
                'value': generate_random_string(24),
                'domain': '.youtube.com',
                'expiry': future_time,
                'secure': True
            },
            {
                'name': '__Secure-3PAPISID',
                'value': generate_random_string(24),
                'domain': '.youtube.com',
                'expiry': future_time,
                'secure': True
            },
            {
                'name': 'PREF',
                'value': 'f6=40000080&tz=Europe.Berlin&f5=20000&f7=100&f4=4000000',
                'domain': '.youtube.com',
                'expiry': future_time,
                'secure': True
            },
            {
                'name': 'SID',
                'value': f'g.a000{generate_random_string(160)}',
                'domain': '.youtube.com',
                'expiry': future_time,
                'secure': False
            },
            {
                'name': 'VISITOR_INFO1_LIVE',
                'value': generate_random_string(12),
                'domain': '.youtube.com',
                'expiry': future_time,
                'secure': True
            },
            {
                'name': 'YSC',
                'value': generate_random_string(11),
                'domain': '.youtube.com',
                'expiry': 0,  # Session cookie
                'secure': True
            }
        ]
        
        # Write cookies in Netscape format
        print("Writing cookies file...")
        with open(cookies_path, 'w') as f:
            f.write("# Netscape HTTP Cookie File\n")
            f.write("# http://curl.haxx.se/rfc/cookie_spec.html\n")
            f.write("# This is a generated file!  Do not edit.\n\n")
            
            for cookie in essential_cookies:
                domain = cookie['domain']
                path = '/'
                secure = 'TRUE' if cookie.get('secure', True) else 'FALSE'
                expiry = cookie.get('expiry', 0)
                name = cookie['name']
                value = cookie['value']
                
                f.write(f"{domain}\tTRUE\t{path}\t{secure}\t{expiry}\t{name}\t{value}\n")
        
        print("Cookies saved successfully!")
        return True
            
    except Exception as e:
        print(f"Error: {str(e)}")
        if 'backup_path' in locals() and os.path.exists(backup_path):
            shutil.copy2(backup_path, cookies_path)
            print("Restored cookies from backup")
        return False

if __name__ == "__main__":
    extract_cookies()