from flask import Flask, request, jsonify
import requests
import tempfile
import os

import pdfplumber
from PIL import Image
import torch
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

app = Flask(__name__)

# ---------- Load HuggingFace OCR (LIGHT MODEL) ----------
processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-printed")
model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-printed")

# ---------- Helpers ----------

def extract_text_from_pdf(path):
    text = ""
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()

def extract_text_from_image(path):
    image = Image.open(path).convert("RGB")
    pixel_values = processor(images=image, return_tensors="pt").pixel_values
    generated_ids = model.generate(pixel_values)
    text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    return text.strip()

# ---------- API ----------
@app.route("/ocr", methods=["POST"])
def ocr():
    try:
        data = request.get_json()
        url = data.get("url")

        if not url:
            return jsonify({"success": False, "error": "URL required"}), 400

        # Download file
        r = requests.get(url)
        suffix = ".pdf" if url.lower().endswith(".pdf") else ".png"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
            f.write(r.content)
            file_path = f.name

        # Decide strategy
        if suffix == ".pdf":
            text = extract_text_from_pdf(file_path)

            # If PDF has no text → fallback to OCR
            if not text.strip():
                return jsonify({
                    "success": False,
                    "error": "Scanned PDF detected. Use image OCR flow."
                }), 400
        else:
            text = extract_text_from_image(file_path)

        os.remove(file_path)

        return jsonify({
            "success": True,
            "pages": 1,
            "text": text
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    print("🚀 OCR service running at http://127.0.0.1:7000")
    app.run(port=7000)