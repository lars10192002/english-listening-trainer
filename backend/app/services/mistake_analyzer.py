from typing import List, Dict
from .text_compare import normalize_text, levenshtein_distance, compute_wer

ARTICLES = {"a", "an", "the"}
PREPOSITIONS = {"in", "on", "at", "for", "to", "from", "with", "by", "of", "about", "above", "below", "under"}
COMMON_ED_VERBS = True  # heuristic: word + "d" or word + "ed"


def _is_plural_error(correct: str, wrong: str) -> bool:
    if correct.endswith("s") and correct[:-1] == wrong:
        return True
    if correct.endswith("es") and correct[:-2] == wrong:
        return True
    if correct.endswith("ies") and correct[:-3] + "y" == wrong:
        return True
    return False


def _is_tense_error(correct: str, wrong: str) -> bool:
    if correct.endswith("ed") and (correct[:-2] == wrong or correct[:-1] == wrong):
        return True
    if correct.endswith("d") and correct[:-1] == wrong:
        return True
    return False


def _classify_substitution(correct_word: str, wrong_word: str) -> Dict:
    correct_l = correct_word.lower()
    wrong_l = wrong_word.lower()

    if correct_l in ARTICLES or wrong_l in ARTICLES:
        return {"mistake_type": "article", "wrong_text": wrong_word, "correct_text": correct_word,
                "explanation": f"Article error: '{wrong_word}' should be '{correct_word}'."}

    if correct_l in PREPOSITIONS or wrong_l in PREPOSITIONS:
        return {"mistake_type": "preposition", "wrong_text": wrong_word, "correct_text": correct_word,
                "explanation": f"Preposition error: '{wrong_word}' should be '{correct_word}'."}

    if _is_plural_error(correct_l, wrong_l):
        return {"mistake_type": "plural", "wrong_text": wrong_word, "correct_text": correct_word,
                "explanation": f"Plural error: '{wrong_word}' should be '{correct_word}'."}

    if _is_tense_error(correct_l, wrong_l):
        return {"mistake_type": "tense", "wrong_text": wrong_word, "correct_text": correct_word,
                "explanation": f"Tense error: '{wrong_word}' should be '{correct_word}'."}

    dist = levenshtein_distance(correct_l, wrong_l)
    if dist <= 2:
        return {"mistake_type": "spelling", "wrong_text": wrong_word, "correct_text": correct_word,
                "explanation": f"Spelling error: '{wrong_word}' should be '{correct_word}'."}

    return {"mistake_type": "wrong_word", "wrong_text": wrong_word, "correct_text": correct_word,
            "explanation": f"Wrong word: '{wrong_word}' should be '{correct_word}'."}


def analyze_mistakes(correct_answer: str, user_input: str) -> List[Dict]:
    norm_correct = normalize_text(correct_answer)
    norm_user = normalize_text(user_input)

    wer, ops = compute_wer(norm_correct, norm_user)
    mistakes = []

    for op, ref_word, hyp_word in ops:
        if op == "substitution":
            mistakes.append(_classify_substitution(ref_word, hyp_word))
        elif op == "deletion":
            mistakes.append({
                "mistake_type": "missing_word",
                "wrong_text": None,
                "correct_text": ref_word,
                "explanation": f"Missing word: '{ref_word}' was not included."
            })
        elif op == "insertion":
            mistakes.append({
                "mistake_type": "extra_word",
                "wrong_text": hyp_word,
                "correct_text": None,
                "explanation": f"Extra word: '{hyp_word}' should not be here."
            })

    return mistakes


def check_word_limit(answer: str, word_limit_type: str) -> Dict:
    words = answer.strip().split()
    word_count = len(words)
    limits = {
        "one_word": 1,
        "two_words": 2,
        "three_words": 3,
        "two_words_or_number": 2,
    }
    if word_limit_type not in limits:
        return {"exceeded": False}
    limit = limits[word_limit_type]
    exceeded = word_count > limit
    return {"exceeded": exceeded, "word_count": word_count, "limit": limit}
