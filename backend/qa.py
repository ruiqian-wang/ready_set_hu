from typing import Any, Dict, Optional
import json
from google import genai
from .models import QAResponse
from .ruleset import get_ruleset
from .config import settings

def _is_zh(text: str) -> bool:
    return any("\u4e00" <= ch <= "\u9fff" for ch in (text or ""))


# Initialize Gemini client
_gemini_client = None

def _get_gemini_client():
    """initialization of Gemini client."""
    global _gemini_client
    if _gemini_client is None and settings.GEMINI_API_KEY:
        try:
            _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            print(f"Gemini client initialized with model: {settings.GEMINI_MODEL}")
        except Exception as e:
            print(f"Failed to initialize Gemini: {e}")
            _gemini_client = False  # Mark as failed to avoid retrying
    return _gemini_client if _gemini_client is not False else None


def _ask_gemini(question: str, ruleset: Dict[str, Any], is_zh: bool) -> Optional[str]:
    """Use Gemini to answer questions about Sichuan Mahjong."""
    client = _get_gemini_client()
    if not client:
        return None
    
    try:
        # Prepare context with ruleset information
        hands = ruleset.get("hands", [])
        factors = (ruleset.get("multipliers", {}).get("factors", []))
        
        # Create a simplified context for Gemini
        context_hands = []
        for h in hands[:10]:  # Limit to avoid token overflow
            context_hands.append({
                "name": h.get("name"),
                "description": h.get("description_one_line"),
                "base_multiplier": h.get("scoring", {}).get("base_multiplier")
            })
        
        context_factors = []
        for f in factors[:10]:
            context_factors.append({
                "name": f.get("name"),
                "description": f.get("description"),
                "type": f.get("type")
            })
        
        lang = "中文" if is_zh else "English"
        
        prompt = f"""You are a helpful assistant for a Sichuan Mahjong game app called "Ready, Set, Hu!".

Please answer the following question about Sichuan Mahjong rules in {lang}.

Context - Some example hands (番型):
{json.dumps(context_hands, ensure_ascii=False, indent=2)}

Context - Some example factors (加倍条件):
{json.dumps(context_factors, ensure_ascii=False, indent=2)}

Rules:
- Answer based on Sichuan Mahjong rules
- Keep your answer concise and clear
- If you're not sure about a specific rule, say so
- Use {lang} for your response

Question: {question}

Answer:"""

        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt
        )
        return response.text
    except Exception as e:
        print(f"Gemini API error: {e}")
        return None


def get_answer(question: str) -> QAResponse:
    """LLM-only Q&A using Gemini."""
    q = (question or "").strip()
    is_zh = _is_zh(q)

    ruleset = get_ruleset()
    gemini_answer = _ask_gemini(q, ruleset, is_zh)
    if gemini_answer:
        return QAResponse(answer=gemini_answer)
    
    # If Gemini is not configured or failed, return a clear message.
    if not settings.GEMINI_API_KEY:
        msg = "请在 backend/.env 配置 GEMINI_API_KEY 后重试。" if is_zh else "Please set GEMINI_API_KEY in backend/.env and try again."
    else:
        msg = "Gemini API 调用失败，请检查密钥或网络。" if is_zh else "Gemini API call failed. Please check API key or network."
    return QAResponse(answer=msg)

