# YouTube Video Summarizer

This is a Python application that allows you to summarize the content of a YouTube video using OpenAI's GPT-3.5 language model. The application downloads the audio from the provided YouTube link, transcribes it, and then generates a summary in the selected language.

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
2. Once the web application starts, open it in your web browser.

3. Enter the link of the YouTube video you want to summarize in the provided text input.

4. Select the language in which you want the summary to be generated from the dropdown menu.

5. Click the "Start" button to begin the summarization process.

   - The application will download the audio from the YouTube video and transcribe it.
   - It will then use GPT-3.5 to generate a summary based on the transcribed text.
   - The generated summary will be displayed on the web page.

6. Note that the summarization process may take some time, depending on the length of the video and the GPT-3.5 model's response time.

7. The summary will be presented in the form of an informative and factual overview of the video's content, including bullet points if possible. It will also include an introduction and conclusion phrase.

## Supported Languages

The application currently supports summarization in the following languages:

- German
- English
- French
- Spanish
- Albanian
- Polish
- Italian
- Russian

## Cleaning Up

After the summary is generated, the application will automatically delete the downloaded audio and transcribed text files. This is to ensure that no sensitive information is left on the system.

## Example

![Example english](1.png)
![Example english](2.png)
## Disclaimer

Please note that this application relies on the OpenAI GPT-3.5 language model, and its performance and results are subject to the capabilities of the model and the quality of the provided data. The generated summaries may not always be perfect and may require manual editing for accuracy.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

## License

Distributed under the MIT License. See `LICENSE` for more information.