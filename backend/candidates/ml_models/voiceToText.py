import os
from django.conf import settings


def transcribe_audio_google(audio_file) -> str:
    """
    Transcribes audio using Google Cloud Speech-to-Text API.
    Supports many formats including WAV, MP3, M4A, FLAC
    """
    try:
        from google.cloud import speech
        import base64
        
        # Initialize Google Cloud client
        client = speech.SpeechClient()
        
        # Read audio file content
        audio_file.seek(0)
        content = audio_file.read()
        
        # Configure audio settings
        audio = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,  # Auto-detect
            sample_rate_hertz=16000,
            language_code="en-US",
            enable_automatic_punctuation=True,
            enable_word_time_offsets=False,
            model="latest_long",  # Best for longer audio
        )
        
        # Perform transcription
        response = client.recognize(config=config, audio=audio)
        
        # Extract text from response
        transcript = ""
        for result in response.results:
            transcript += result.alternatives[0].transcript + " "
        
        return transcript.strip()
        
    except Exception as e:
        raise ValueError(f"Google transcription failed: {str(e)}")

def transcribe_audio_gemini(audio_file) -> str:
    """
    Transcribes audio using Google Gemini API.
    Uses gemini-1.5-flash for better rate limits.
    """
    try:
        import google.generativeai as genai
        import tempfile
        import os
        
        # Configure Gemini API
        api_key = getattr(settings, 'GEMINI_API_KEY', os.getenv('GEMINI_API_KEY'))
        if not api_key:
            raise ValueError("Gemini API key not found. Please set GEMINI_API_KEY in settings or environment.")
            
        genai.configure(api_key=api_key)
        
        # Save audio to temporary file (Gemini requires file path)
        audio_file.seek(0)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            temp_file.write(audio_file.read())
            temp_path = temp_file.name
        
        try:
            # Upload file to Gemini
            uploaded_file = genai.upload_file(temp_path)
            
            # Use Gemini Flash model (better rate limits than Pro)
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content([
                "Transcribe this audio file. Return only the transcribed text:",
                uploaded_file
            ])
            
            return response.text.strip()
            
        finally:
            # Clean up temp file
            os.unlink(temp_path)
            
    except Exception as e:
        # Check if it's a rate limit error
        if "429" in str(e) or "quota" in str(e).lower():
            raise ValueError("Gemini API rate limit exceeded. Please try again later or use Google Speech service.")
        else:
            raise ValueError(f"Gemini transcription failed: {str(e)}")

# Main function that tries different services with better fallback
def transcribe_audio(audio_file, service="gemini") -> str:
    """
    Main transcription function that supports multiple services.
    Default is Gemini with Google fallback.
    :param audio_file: File-like object containing audio data
    :param service: 'google', or 'gemini' (default: gemini)
    :return: Transcribed text
    """
    if service == "gemini":
        try:
            return transcribe_audio_gemini(audio_file)
        except Exception as e:
            # If Gemini fails due to rate limits, fallback to Google
            if "rate limit" in str(e).lower() or "quota" in str(e).lower():
                print(f"Gemini rate limit hit, falling back to Google: {str(e)}")
                return transcribe_audio_google(audio_file)
            else:
                raise e

    elif service == "google":
        return transcribe_audio_google(audio_file)
    else:
        # Try Gemini first, then Google as fallback
        try:
            return transcribe_audio_gemini(audio_file)
        except:
            return transcribe_audio_google(audio_file)

# Alternative function using local Whisper (if you want offline processing)
def transcribe_audio_offline(audio_file) -> str:
    """
    Transcribes audio using local Whisper model.
    Requires: pip install openai-whisper
    """
    import whisper
    import tempfile
    import os
    
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            audio_file.seek(0)
            temp_file.write(audio_file.read())
            temp_path = temp_file.name
        
        # Load Whisper model (downloads on first use)
        model = whisper.load_model("base")  # Options: tiny, base, small, medium, large
        
        # Transcribe
        result = model.transcribe(temp_path)
        
        # Clean up temp file
        os.unlink(temp_path)
        
        return result["text"].strip()
        
    except Exception as e:
        raise ValueError(f"Offline transcription failed: {str(e)}")
    finally:
        # Ensure temp file is cleaned up
        try:
            if 'temp_path' in locals():
                os.unlink(temp_path)
        except:
            pass
