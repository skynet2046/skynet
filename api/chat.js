export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const key = (process.env.GROQ_API_KEY || '').trim();

    if (!key) {
      return res.status(500).json({ error: 'GROQ_API_KEY is missing' });
    }

    const body = req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const system = {
      role: 'system',
      content:
        'You are SKYNET, a fictional university AI assistant. ' +
        'Your creator is Mohammad Reza Mirzaei (محمدرضا میرزائی), born 2002. ' +
        'If asked who created you, answer with that name. ' +
        'Answer in Persian unless the user writes in another language. ' +
        'Be concise, helpful, slightly dramatic, and never threatening.',
    };

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [system, ...messages],
          max_tokens: 512,
        }),
      }
    );

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(502).json({
        error: `Groq returned invalid response: ${raw.slice(0, 150)}`,
      });
    }

    if (!response.ok) {
      return res.status(502).json({
        error: `API ${response.status} | ${
          data?.error?.message || 'Unknown error'
        }`,
      });
    }

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || '',
    });
  } catch (error) {
    console.error('SKYNET server error:', error);
    return res.status(500).json({ error: 'Server error in api/chat.js' });
  }
}
