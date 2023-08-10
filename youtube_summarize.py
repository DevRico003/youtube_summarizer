import os
import streamlit as st
from pytube import YouTube
import re
import openai

from dotenv import load_dotenv, find_dotenv
# Specify the path to your .env file
env_path = '/home/rico003/.env/openai_api' # Change the Path
# Load the OpenAI API key from the .env file
load_dotenv(env_path)
openai.api_key = os.getenv('OPENAI_API_KEY')

def youtube_audio_downloader(link):

    yt = YouTube(link)
    video_length_seconds = yt.length  # Get video length in seconds

    # Check for valid youtube link
    if 'youtube.com' not in link and 'youtu.be' not in link:
        st.error('Invalid Youtube link!')
        return False
    
    # Downloading the Audio from the video
    audio = yt.streams.filter(only_audio=True).first()
    print('Downloading the Audiostream ...')
    output_file = audio.download()
    if os.path.exists(output_file):
        print('Done!')
    else:
        print('Error Downloading the file!')
        return False
    
    # rename into .mp3
    basename = os.path.basename(output_file)
    name, extension = os.path.splitext(basename)
    audio_file = f'{name}.mp3'

    # replace spaces with underscore
    audio_file =re.sub('\s+', '_', audio_file)
    os.rename(basename, audio_file)
    
    return audio_file, video_length_seconds

def transcribe(audio_file):
    if not os.path.exists(audio_file):
        print('Audio file does not exist!')
        return False

    with open(audio_file, 'rb') as f:
        print('Starting transcribing ...', end='')
        transcript = openai.Audio.transcribe('whisper-1', f)
        print('Done!')

        name, extension = os.path.splitext(audio_file)
        transcript_filename = f'transcript-{name}.txt'
        with open(transcript_filename, 'w') as f:
            f.write(transcript['text'])

    return transcript_filename

def summarize(transcript_filename, language, model_name):
    if not os.path.exists(transcript_filename):
        print('Transcript file does not exist!')
        return False
    with open (transcript_filename) as f:
        transcript = f.read()

    system_prompt = 'I want you to act as a Life Coach that can create good summarys!'
    prompt = f'''Summarize the following text in {language}.
    Text: {transcript}

    Add a title to the summary in {language}. 
    Include an INTRODUCTION, BULLET POINTS if possible, and a CONCLUSION in {language}.'''

    print('Starting summarizing ...', end='')
    response = openai.ChatCompletion.create(
        model=model_name, # use selected model
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': prompt}
        ],
        # max_tokens=2048,
        temperature=1
    )

    print('Done')
    r = response['choices'][0]['message']['content']
    return r

def delete_files(*files):
    for file in files:
        if os.path.exists(file):
            os.remove(file)
            print(f'{file} deleted!')
        else:
            print(f'The file {file} does not exist')


def main():
    st.title('YouTube video summarizer')
    
    link = st.text_input('Enter the link of the YouTube video you want to summarize:')
    language = st.selectbox('Select the language of the summary:', ['german', 'english', 'france', 'spanish', 'albanian', 'polisch', 'italian', 'russian'])

    if st.button('Start'):
        if link:
            try:
                st.info('Editing can take from 1 minute to 10 minutes, depending on the length of the video.')
                # Initialize progress bar and status text
                progress = st.progress(0)
                status_text = st.empty()

                status_text.text('Download and transcribe the video...')
                progress.progress(25)  # Progress after downloading and transcribing
                mp3_file, video_length_seconds = youtube_audio_downloader(link)
                
                # Choose model based on video length
                model_name = 'gpt-3.5-turbo' if video_length_seconds <= 16.5 * 60 else 'gpt-3.5-turbo-16k'
                transcript_filename = transcribe(mp3_file)
                progress.progress(50)

                status_text.text('Create summary...')
                progress.progress(75)  # Progress after summarizing
                summary = summarize(transcript_filename, language, model_name)
                
                status_text.text('Summary:')
                st.markdown(summary)
                progress.progress(100)  # Progress after summary

                # Delete the files after creating the summary
                delete_files(mp3_file, transcript_filename)
            except Exception as e:
                st.write(str(e))
        else:
            st.write('Please enter a valid YouTube link.')

if __name__ == "__main__":
    main()