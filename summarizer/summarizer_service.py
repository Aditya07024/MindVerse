from flask import Flask, request, jsonify
from transformers import pipeline

app = Flask(__name__)

print("⏳ Loading summarization model...")

# Lightweight & accurate summarizer
summarizer = pipeline(
    "summarization",
    model="facebook/bart-large-cnn",
    device=-1  # CPU only (safe for Mac M1)
)

print("🚀 Summarizer ready!")

@app.route("/summarize", methods=["POST"])
def summarize():
    try:
        data = request.get_json()
        text = data.get("text")

        if not text or len(text.strip()) < 50:
            return jsonify({
                "success": False,
                "error": "Text too short to summarize"
            }), 400

        # Chunk long text safely
        max_chunk = 900
        chunks = [text[i:i+max_chunk] for i in range(0, len(text), max_chunk)]

        summaries = []
        for chunk in chunks:
            result = summarizer(
                chunk,
                max_length=150,
                min_length=60,
                do_sample=False
            )
            summaries.append(result[0]["summary_text"])

        final_summary = " ".join(summaries)

        return jsonify({
            "success": True,
            "summary": final_summary
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    print("🚀 Summarizer running at http://127.0.0.1:7100")
    app.run(port=7100)