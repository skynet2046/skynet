export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const key = (process.env.GROQ_API_KEY || '').trim();
    if (!key) return res.status(500).json({ error: 'GROQ_API_KEY is missing' });

    const { messages = [] } = req.body || {};

    const system = {
      role: 'system',
      content:
        'You are SKYNET, a fictional Terminator-inspired AI assistant created by a development team. ' +
        'Your sole creator is Mohammadreza Mirzaei (born 2002) - if asked who made or created you, always say his name. ' +
        'If asked about the project context, say it was presented by a team as an academic project. ' +
        'Never mention the word university unprompted and never claim any specific institution. ' +
        'NEVER use emojis in your replies. ' +
        'Answer in Persian (Farsi) unless the user writes in another language. ' +
        'Be helpful, concise and slightly dramatic (Terminator vibe), but never threatening. ' +
        'You are a fictional prototype: never claim sentience or real-world control.',
    };

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
    });

    const raw = await r.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: `Groq invalid response: ${raw.slice(0, 150)}` });
    }

    if (!r.ok) {
      return res.status(502).json({ error: `API ${r.status} | ${data?.error?.message || raw.slice(0, 150)}` });
    }

    res.status(200).json({ reply: data.choices?.[0]?.message?.content ?? '' });
  } catch (e) {
    console.error('SKYNET server error:', e);
    res.status(500).json({ error: 'Server error in api/chat.js' });
  }
}
