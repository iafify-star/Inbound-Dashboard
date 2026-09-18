const KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6KKDZg_IhwXCUhXfZj4tHGS6ZrcScDHAQvXSrTKbkyXew";
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-3.7-flash"];

function parseError(json, status){
  const err = json && json.error;
  if(!err) return "HTTP " + status;
  return [err.status, err.message].filter(Boolean).join(" — ");
}

export default async function handler(req, res){
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if(req.method === "OPTIONS") return res.status(204).end();
  if(req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { message, context, history } = req.body || {};
  if(!message) return res.status(400).json({ error: "missing message" });

  const contents = [
    ...(Array.isArray(history) ? history.map(m => ({ role: m.role, parts: [{ text: m.text }] })) : []),
    { role: "user", parts: [{ text: String(message) }] }
  ];
  const payload = {
    systemInstruction: { parts: [{ text: String(context || "Inbound receiving dashboard assistant.") }] },
    contents
  };

  let lastErr = "fail";
  for(const model of MODELS){
    try{
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
        body: JSON.stringify(payload)
      });
      const json = await r.json().catch(() => ({}));
      if(!r.ok) throw new Error(parseError(json, r.status));
      const text = (json.candidates?.[0]?.content?.parts || []).map(p => p.text).filter(Boolean).join("\n");
      if(text) return res.status(200).json({ text });
      lastErr = "empty response";
    }catch(e){
      lastErr = e.message || String(e);
    }
  }
  return res.status(500).json({ error: lastErr });
}
