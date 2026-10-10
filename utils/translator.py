from data.translations import TRANSLATIONS


def t(language: str, key: str) -> str:
    return TRANSLATIONS.get(language, TRANSLATIONS["English"]).get(key, key)
