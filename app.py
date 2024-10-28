import os
from openai import OpenAI
import streamlit as st
from googleapiclient.discovery import build
from langchain.text_splitter import RecursiveCharacterTextSplitter
from dotenv import load_dotenv
import re
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pytube import YouTube
import subprocess
import pafy
import youtube_dl

def load_environment():
    """Load environment variables"""
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
    
    required_vars = {
        'GROQ_API_KEY': "GROQ_API_KEY not found",
        'YOUTUBE_API_KEY': "YOUTUBE_API_KEY not found"
    }
    
    missing_vars = []
    env_vars = {}
    for var, message in required_vars.items():
        value = os.getenv(var)
        if not value:
            missing_vars.append(message)
        env_vars[var] = value
    
    if missing_vars:
        raise ValueError("\n".join(missing_vars))
    
    return env_vars

# Initialize Groq client
try:
    api_key = load_environment()['GROQ_API_KEY']
    groq_client = OpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1"
    )
except Exception as e:
    st.error(f"Error initializing API client: {str(e)}")
    st.stop()

def extract_video_id(youtube_url):
    """Extract video ID from different YouTube URL formats"""
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',  # Standard and shared URLs
        r'(?:embed\/)([0-9A-Za-z_-]{11})',   # Embed URLs
        r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})',  # Shortened URLs
        r'(?:shorts\/)([0-9A-Za-z_-]{11})',   # YouTube Shorts
        r'^([0-9A-Za-z_-]{11})$'  # Just the video ID
    ]
    
    youtube_url = youtube_url.strip()
    
    for pattern in patterns:
        match = re.search(pattern, youtube_url)
        if match:
            return match.group(1)
    
    raise ValueError("Could not extract video ID from URL")

def get_transcript(youtube_url):
    """Get transcript using YouTube Transcript API with Whisper fallback"""
    try:
        video_id = extract_video_id(youtube_url)
        st.info(f"Getting transcript for video: {video_id}")
        
        try:
            # First try with YouTube Transcript API
            from youtube_transcript_api import YouTubeTranscriptApi
            
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            try:
                transcript = transcript_list.find_manually_created_transcript()
                st.success("Found manual transcript!")
            except:
                transcript = next(iter(transcript_list))
                st.success("Found auto-generated transcript!")
            
            full_transcript = " ".join([part['text'] for part in transcript.fetch()])
            language_code = transcript.language_code
            
            return full_transcript, language_code
                
        except Exception as e:
            st.warning(f"YouTube transcript not available: {str(e)}")
            st.info("Attempting to transcribe audio with Whisper...")
            
            try:
                # Download audio using pytube
                st.info("Downloading audio...")
                yt = YouTube(youtube_url)
                
                # Get the audio stream
                audio_stream = yt.streams.filter(only_audio=True, file_extension='mp4').first()
                
                if not audio_stream:
                    raise Exception("No audio stream found")
                
                # Download to temporary file
                temp_file = audio_stream.download(
                    output_path=os.getenv('TMPDIR', '/tmp'),
                    filename=f"{video_id}_temp.mp4"
                )
                
                # Convert to MP3 using FFmpeg
                output_file = os.path.join(os.getenv('TMPDIR', '/tmp'), f"{video_id}.mp3")
                os.system(f'ffmpeg -i "{temp_file}" -vn -acodec libmp3lame -ab 192k -ar 44100 "{output_file}" -y')
                
                # Clean up temp file
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                
                if os.path.exists(output_file):
                    st.success("Audio downloaded successfully!")
                    
                    # Transcribe with Groq's Whisper
                    try:
                        with open(output_file, "rb") as audio:
                            transcript = groq_client.audio.transcriptions.create(
                                model="whisper-large-v3",
                                file=audio,
                                response_format="text"
                            )
                        st.success("Audio transcribed successfully!")
                        return transcript, 'en'  # Whisper defaults to English
                        
                    except Exception as e:
                        st.error(f"Transcription failed: {str(e)}")
                        return None, None
                    finally:
                        # Cleanup
                        if os.path.exists(output_file):
                            os.remove(output_file)
                else:
                    st.error("Audio conversion failed")
                    return None, None
                    
            except Exception as e:
                st.error(f"Audio download failed: {str(e)}")
                return None, None
            
    except Exception as e:
        st.error(f"Error processing video: {str(e)}")
        return None, None

def get_transcript_with_selenium(youtube_url):
    """Get transcript using Selenium with authentication"""
    try:
        options = webdriver.ChromeOptions()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        
        driver = webdriver.Chrome(options=options)
        
        # Login to Google first
        driver.get('https://accounts.google.com')
        
        # Login with credentials from env
        email = driver.find_element(By.NAME, "identifier")
        email.send_keys(os.getenv('GOOGLE_EMAIL'))
        email.submit()
        
        password = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "password"))
        )
        password.send_keys(os.getenv('GOOGLE_PASSWORD'))
        password.submit()
        
        # Now get the video
        driver.get(youtube_url)
        
        # Wait for and click the transcript button
        transcript_button = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "button[aria-label='Show transcript']"))
        )
        transcript_button.click()
        
        # Get transcript text
        transcript_elements = driver.find_elements(By.CSS_SELECTOR, "div.segment-text")
        transcript = " ".join([elem.text for elem in transcript_elements])
        
        # Get language
        language_code = 'en'  # Default to English
        
        return transcript, language_code
        
    except Exception as e:
        st.error(f"Error getting transcript with Selenium: {str(e)}")
        return None, None
    finally:
        driver.quit()

def get_available_languages():
    """Return a dictionary of available languages"""
    return {
        'English': 'en',
        'Deutsch': 'de',
        'Español': 'es',
        'Français': 'fr',
        'Italiano': 'it',
        'Nederlands': 'nl',
        'Polski': 'pl',
        'Português': 'pt',
        '日本語': 'ja',
        '中文': 'zh',
        '한국어': 'ko',
        'Русский': 'ru'
    }

def create_summary_prompt(text, target_language):
    """Create an optimized prompt for summarization in the target language"""
    language_prompts = {
        'en': {
            'title': 'TITLE',
            'overview': 'OVERVIEW',
            'key_points': 'KEY POINTS',
            'takeaways': 'MAIN TAKEAWAYS',
            'context': 'CONTEXT & IMPLICATIONS'
        },
        'de': {
            'title': 'TITEL',
            'overview': 'ÜBERBLICK',
            'key_points': 'KERNPUNKTE',
            'takeaways': 'HAUPTERKENNTNISSE',
            'context': 'KONTEXT & AUSWIRKUNGEN'
        },
        # Add more languages as needed...
    }

    # Default to English if language not in dictionary
    prompts = language_prompts.get(target_language, language_prompts['en'])

    system_prompt = f"""You are an expert content analyst and summarizer. Create a comprehensive 
    summary in {target_language}. Ensure all content is fully translated and culturally adapted 
    to the target language."""

    user_prompt = f"""Please provide a detailed summary of the following content in {target_language}. 
    Structure your response as follows:

    🎯 {prompts['title']}: Create a descriptive title

    📝 {prompts['overview']} (2-3 sentences):
    - Provide a brief context and main purpose

    🔑 {prompts['key_points']}:
    - Extract and explain the main arguments
    - Include specific examples
    - Highlight unique perspectives

    💡 {prompts['takeaways']}:
    - List 3-5 practical insights
    - Explain their significance

    🔄 {prompts['context']}:
    - Broader context discussion
    - Future implications

    Text to summarize: {text}

    Ensure the summary is comprehensive enough for someone who hasn't seen the original content."""

    return system_prompt, user_prompt

def summarize_with_langchain_and_openai(transcript, language_code, model_name='llama-3.1-8b-instant'):
    # Split the document if it's too long
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=2000,
        chunk_overlap=200,
        length_function=len
    )
    texts = text_splitter.split_text(transcript)
    text_to_summarize = " ".join(texts[:4])  # Adjust this as needed

    system_prompt, user_prompt = create_summary_prompt(text_to_summarize, language_code)

    # Create summary using Groq's Llama model
    try:
        response = groq_client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=4000  # Llama 3.2 1B has 8k token limit in preview
        )
        
        return response.choices[0].message.content
    except Exception as e:
        st.error(f"Error with Groq API: {str(e)}")
        return None

def download_audio(youtube_url):
    """Download audio using youtube-dl"""
    try:
        st.info("Downloading audio with youtube-dl...")
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': os.path.join(os.getenv('TMPDIR', '/tmp'), '%(id)s.%(ext)s'),
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'force_generic_extractor': False,
            'geo_bypass': True,
            'cachedir': False,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }
        
        with youtube_dl.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            output_file = os.path.join(os.getenv('TMPDIR', '/tmp'), f"{info['id']}.mp3")
            
            if os.path.exists(output_file):
                st.success("Audio downloaded successfully!")
                return output_file
            else:
                raise Exception("Download completed but file not found")
                
    except Exception as e:
        st.error(f"Error downloading audio: {str(e)}")
        return None

def main():
    st.title('📺 Advanced YouTube Video Summarizer')
    st.markdown("""
    This tool creates comprehensive summaries of YouTube videos using advanced AI technology.
    It works with both videos that have transcripts and those that don't!
    """)
    
    # Create two columns for input fields
    col1, col2 = st.columns([3, 1])
    
    with col1:
        link = st.text_input('🔗 Enter YouTube video URL:')
    
    with col2:
        # Language selector
        languages = get_available_languages()
        target_language = st.selectbox(
            '🌍 Select Summary Language:',
            options=list(languages.keys()),
            index=0  # Default to English
        )
        # Convert display language to language code
        target_language_code = languages[target_language]

    if st.button('Generate Summary'):
        if link:
            try:
                with st.spinner('Processing...'):
                    progress = st.progress(0)
                    status_text = st.empty()

                    status_text.text('📥 Fetching video transcript...')
                    progress.progress(25)

                    transcript, _ = get_transcript(link)  # Original language doesn't matter now

                    status_text.text(f'🤖 Generating {target_language} summary...')
                    progress.progress(75)

                    summary = summarize_with_langchain_and_openai(
                        transcript, 
                        target_language_code,
                        model_name='llama-3.1-8b-instant'
                    )

                    status_text.text('✨ Summary Ready!')
                    st.markdown(summary)
                    progress.progress(100)
            except Exception as e:
                st.error(f"An error occurred: {str(e)}")
        else:
            st.warning('Please enter a valid YouTube link.')

if __name__ == "__main__":
    main()
