export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages = [] } = req.body;
  const system = {
    role: 'system',
    content:
      'You are SKYNET, a fictional Terminator-inspired AI assistant built as a university project. ' +
      'Answer in Persian (Farsi) unless the user writes in another language. ' +
      'Be helpful, concise and slightly dramatic (Terminator vibe), but never threatening. ' +
      'You are a fictional prototype: never claim sentience or real-world control.',
  };

  try {
    const r = await fetch('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SAMBANOVA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'Meta-Llama-3.1-8B-Instruct', // اگر خطا داد، لیست مدل‌ها را در داشبورد ببین
        messages: [system, ...messages],
        max_tokens: 512,
      }),
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    const data = await r.json();
    res.status(200).json({ reply: data.choices?.[0]?.message?.content ?? '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
