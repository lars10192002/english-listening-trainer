from .text_compare import normalize_text, compute_wer


def compute_score(correct_answer: str, user_input: str) -> dict:
    norm_correct = normalize_text(correct_answer)
    norm_user = normalize_text(user_input)
    wer, _ = compute_wer(norm_correct, norm_user)
    score = max(0.0, round(100.0 * (1 - wer), 1))
    is_correct = norm_correct == norm_user
    return {"score": score, "wer": round(wer, 4), "is_correct": is_correct}
