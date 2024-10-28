import os
from openai import OpenAI
import streamlit as st
from youtube_transcript_api import YouTubeTranscriptApi
from langchain.text_splitter import RecursiveCharacterTextSplitter
from dotenv import load_dotenv
import yt_dlp
import tempfile
import re  # Add this at the top with other imports

# Load environment variables
env_path = '/home/devrico003/youtube_summarizer/.env'  # Change the Path
load_dotenv(env_path)

# Initialize Groq client with OpenAI compatibility
groq_client = OpenAI(
    api_key=os.getenv('GROQ_API_KEY'),
    base_url="https://api.groq.com/openai/v1"
)

# Separate OpenAI client for Whisper
whisper_client = OpenAI(
    api_key=os.getenv('GROQ_API_KEY'),
    base_url="https://api.groq.com/openai/v1"
)

def download_audio(youtube_url):
    """Download audio from YouTube video"""
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': '%(id)s.%(ext)s',
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=True)
        audio_file = f"{info['id']}.mp3"
    return audio_file

def transcribe_audio(audio_file):
    """
    Transcribe audio using Groq's Whisper Large V3 Turbo
    """
    try:
        with open(audio_file, "rb") as audio:
            transcript = whisper_client.audio.transcriptions.create(
                model="whisper-large-v3-turbo",
                file=audio,
                response_format="text"
            )
        return transcript
    finally:
        if os.path.exists(audio_file):
            os.remove(audio_file)

def extract_video_id(youtube_url):
    """Extract video ID from different YouTube URL formats"""
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',  # Standard and shared URLs
        r'(?:embed\/)([0-9A-Za-z_-]{11})',   # Embed URLs
        r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})',  # Shortened URLs
        r'(?:shorts\/)([0-9A-Za-z_-]{11})',   # YouTube Shorts
    ]
    
    for pattern in patterns:
        match = re.search(pattern, youtube_url)
        if match:
            return match.group(1)
    
    raise ValueError("Could not extract video ID from URL")

def get_transcript(youtube_url):
    """Get transcript from YouTube or create one using Whisper"""
    try:
        video_id = extract_video_id(youtube_url)
        
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            try:
                transcript = transcript_list.find_manually_created_transcript()
            except:
                transcript = next(iter(transcript_list))
            
            full_transcript = " ".join([part['text'] for part in transcript.fetch()])
            language_code = transcript.language_code
            
        except Exception as e:
            st.warning("No YouTube transcript available. Creating transcript from audio...")
            audio_file = download_audio(youtube_url)
            full_transcript = transcribe_audio(audio_file)
            language_code = "en"
        
        return full_transcript, language_code
        
    except ValueError as e:
        st.error(f"Invalid YouTube URL: {str(e)}")
        return None, None

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
