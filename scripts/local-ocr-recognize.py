#!/usr/bin/env python3
import argparse
import json
import sys


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    sys.exit(1)


def normalize_result(raw_result):
    if raw_result is None:
        return []

    # rapidocr_onnxruntime normally returns (result, elapsed). Newer RapidOCR
    # builds may return an object with txts/scores/boxes.
    if isinstance(raw_result, tuple):
        raw_result = raw_result[0]

    if hasattr(raw_result, "txts"):
        txts = list(getattr(raw_result, "txts", []) or [])
        scores = list(getattr(raw_result, "scores", []) or [])
        boxes = list(getattr(raw_result, "boxes", []) or [])
        return [
            {
                "text": str(text).strip(),
                "score": float(scores[index]) if index < len(scores) and scores[index] is not None else None,
                "box": boxes[index] if index < len(boxes) else None,
            }
            for index, text in enumerate(txts)
            if str(text).strip()
        ]

    items = []
    for item in raw_result or []:
        text = ""
        score = None
        box = None
        if isinstance(item, dict):
            text = str(item.get("text") or item.get("rec_txt") or item.get("label") or "").strip()
            score_value = item.get("score") or item.get("rec_score")
            score = float(score_value) if score_value is not None else None
            box = item.get("box") or item.get("dt_boxes")
        elif isinstance(item, (list, tuple)):
            box = item[0] if len(item) > 0 else None
            if len(item) > 1:
                text = str(item[1] or "").strip()
            if len(item) > 2 and item[2] is not None:
                score = float(item[2])
        if text:
            items.append({"text": text, "score": score, "box": box})
    return items


def run_rapidocr(image_path: str):
    try:
        from rapidocr_onnxruntime import RapidOCR
    except Exception as first_exc:
        try:
            from rapidocr import RapidOCR
        except Exception as second_exc:
            fail(
                "RapidOCR runtime missing. Install dependencies first: "
                "pip install rapidocr-onnxruntime. "
                f"Import errors: {first_exc}; {second_exc}"
            )

    engine = RapidOCR()
    return normalize_result(engine(image_path))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--request-id", required=False, default="")
    args = parser.parse_args()

    items = run_rapidocr(args.image)
    text = "\n".join([item["text"] for item in items if item.get("text")]).strip()
    print(json.dumps({
        "requestId": args.request_id,
        "engine": "rapidocr",
        "model": "rapidocr-onnxruntime",
        "text": text,
        "items": items,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
