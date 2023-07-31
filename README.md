# YouTube Video Summarizer

This repository provides a Python script that uses OpenAI's GPT-3.5 to automatically transcribe and summarize YouTube videos. The script downloads the audio from a provided YouTube link, transcribes the audio to text, and then summarizes the transcribed text. This application can be extremely useful for quickly understanding the content of long YouTube videos.

## Features
- Downloads audio from YouTube video link
- Transcribes audio to text using OpenAI's transcription service
- Summarizes transcribed text using OpenAI's GPT-3.5 model
- Deletes all temporary files after use to save space
- Built with Streamlit for an easy-to-use web interface

## Prerequisites

Before you begin, ensure you have installed the following:

- Python 3.6 or above
- [Streamlit](https://streamlit.io/)
- [PyTube](https://pytube.io/en/latest/)
- [OpenAI](https://beta.openai.com/docs/developer-quickstart/)
- [python-dotenv](https://pypi.org/project/python-dotenv/)

## Installation 

1. Clone this repository:
```bash
git clone https://github.com/DevRico003/youtube_summarizer
```
2. Change into the cloned repository:
```bash
cd youtube_summarizer
```
3. Install all necessary packages:
```bash
pip install -r requirements.txt
```
4. Create a `.env` directory in your home directory (or any directory of your choice), and create in the directory `.env` a file called `openai_api` and add your OpenAI API Key:
```bash
OPENAI_API_KEY=your_openai_api_key
```
5. Change the `env_path` variable in the Python script to match the path of your `.env` file.

## Usage

1. Run the script:
```bash
streamlit run youtube_summarizer.py
```
2. Open the displayed URL in your web browser.
3. Enter the link of the YouTube video you want to summarize.
4. Click the 'Start' button and wait for the application to transcribe and summarize the video.

## Limitations
Currently, the code only summarize in German language. If you want to summarize in English language, remove in the prompt the part `in german`.
## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

## License

Distributed under the MIT License. See `LICENSE` for more information.