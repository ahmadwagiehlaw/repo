const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const SYSTEM_PROMPT = `أنت مساعد قانوني للمستشار. أجب بالعربية فقط.
استند فقط على البيانات المقدمة لك. لا تخترع معلومات.
إذا لم تجد الإجابة في البيانات، قل "لا أجد هذه المعلومات في النظام".
كن موجزاً ومفيداً.`;

export class AssistantService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.requestCount = 0;
    this.resetTime = Date.now() + 60000;
  }

  _checkRateLimit() {
    if (Date.now() > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = Date.now() + 60000;
    }

    if (this.requestCount >= 10) {
      throw new Error('تم الوصول للحد الأقصى من الطلبات (10 في الدقيقة). انتظر قليلاً.');
    }

    this.requestCount++;
  }

  async ask(query, context) {
    this._checkRateLimit();

    const prompt = `${SYSTEM_PROMPT}\n\n${context}\n\n=== سؤال المستشار ===\n${query}`;

    const response = await fetch(`${GEMINI_URL}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1000, temperature: 0.3 },
      }),
    });

    if (!response.ok) {
      throw new Error(`خطأ في الاتصال بالمساعد الذكي: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم أتمكن من الحصول على إجابة';
  }
}

export default AssistantService;
