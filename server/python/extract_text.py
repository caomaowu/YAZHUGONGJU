#!/usr/bin/env python3
import argparse
import json
import sys
from typing import Any, Dict, List

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

def _load_ocr_engine():
    try:
        from rapidocr_onnxruntime import RapidOCR  # type: ignore
        return RapidOCR()
    except Exception:
        return None


def _ocr_text(engine, image_obj) -> str:
    if engine is None:
        return ""
    try:
        import numpy as np  # type: ignore

        arr = np.array(image_obj)
        result, _ = engine(arr)
        if not result:
            return ""
        lines = []
        for item in result:
            if not isinstance(item, (list, tuple)) or len(item) < 2:
                continue
            text = str(item[1]).strip()
            if text:
                lines.append(text)
        return "\n".join(lines).strip()
    except Exception:
        return ""


def extract_pdf(file_path: str) -> Dict[str, Any]:
    try:
        import fitz  # type: ignore
        from PIL import Image  # type: ignore
    except Exception as exc:
        raise RuntimeError(
            "Missing dependencies for PDF extraction. Install: pymupdf Pillow rapidocr-onnxruntime"
        ) from exc

    doc = fitz.open(file_path)
    ocr_engine = _load_ocr_engine()
    pages: List[Dict[str, Any]] = []

    try:
        for idx in range(len(doc)):
            page = doc[idx]
            native = (page.get_text("text") or "").strip()
            final_text = native
            source = "native"

            if len(native) < 30:
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                ocr = _ocr_text(ocr_engine, image)
                if ocr:
                    final_text = ocr
                    source = "ocr"

            pages.append(
                {
                    "page": idx + 1,
                    "text": final_text,
                    "source": source,
                }
            )
    finally:
        doc.close()

    return {"pages": pages}


def extract_image(file_path: str) -> Dict[str, Any]:
    try:
        from PIL import Image  # type: ignore
    except Exception as exc:
        raise RuntimeError(
            "Missing dependencies for image extraction. Install: Pillow rapidocr-onnxruntime"
        ) from exc

    engine = _load_ocr_engine()
    if engine is None:
        raise RuntimeError("OCR engine not available. Install rapidocr-onnxruntime")

    image = Image.open(file_path).convert("RGB")
    text = _ocr_text(engine, image)
    return {"pages": [{"page": 1, "text": text, "source": "ocr"}]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, dest="file_path")
    parser.add_argument("--type", required=True, dest="file_type")
    args = parser.parse_args()

    file_type = str(args.file_type).lower().strip()
    if file_type == "pdf":
        data = extract_pdf(args.file_path)
    elif file_type == "image":
        data = extract_image(args.file_path)
    else:
        data = {"pages": []}

    sys.stdout.write(json.dumps(data, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        try:
            sys.stderr.write(str(err))
        except Exception:
            sys.stderr.buffer.write(str(err).encode("utf-8", errors="replace"))
        sys.exit(1)
