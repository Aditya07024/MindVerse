from flask import Flask, request, jsonify
from transformers import pipeline
import traceback
import json as _json

app = Flask(__name__)

print("⏳ Loading summarization model...")

# Lightweight & accurate summarizer
summarizer = pipeline(
    "summarization",
    model="sshleifer/distilbart-cnn-12-6",
    device=-1
)

print("🚀 Summarizer ready!")

@app.route("/summarize", methods=["POST"])
def summarize():
    try:
        raw = request.get_data(as_text=True)
        print("📥 /summarize raw length:", len(raw))
        # try to parse JSON safely
        data = request.get_json(silent=True)
        if data is None:
            try:
                data = _json.loads(raw)
            except Exception as pe:
                print("❌ Failed to parse JSON body:", pe)
                traceback.print_exc()
                return jsonify({
                    "success": False,
                    "error": "Invalid JSON in request"
                }), 400

        text = data.get("text")

        if not text or len(text.strip()) < 50:
            return jsonify({
                "success": False,
                "error": "Text too short to summarize"
            }), 400

        # Chunk long text safely (split by characters). Adjust max_chunk if CPU is slow.
        max_chunk = 1200
        chunks = [text[i:i+max_chunk] for i in range(0, len(text), max_chunk)]

        summaries = []
        import time
        for idx, chunk in enumerate(chunks):
            print(f"🔄 [SUMMARIZER] Processing chunk {idx+1}/{len(chunks)} length={len(chunk)}")
            start = time.time()
            result = summarizer(
                chunk,
                max_length=120,
                min_length=40,
                do_sample=False
            )
            took = time.time() - start
            print(f"✅ [SUMMARIZER] Chunk {idx+1} done in {took:.1f}s")
            summaries.append(result[0]["summary_text"])

        final_summary = " ".join(summaries)

        return jsonify({
            "success": True,
            "summary": final_summary
        })

    except Exception as e:
        print("❌ Exception in /summarize:", e)
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    print("🚀 Summarizer running at http://127.0.0.1:7100")
    app.run(port=7100)