from pathlib import Path
import tempfile


def speak_text(text: str) -> bool:
    try:
        import pyttsx3
    except Exception:
        return False

    try:
        engine = pyttsx3.init()
        engine.say(text)
        engine.runAndWait()
        return True
    except Exception:
        return False
