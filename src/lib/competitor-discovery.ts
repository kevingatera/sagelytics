import { ChatGroq } from "@langchain/groq";

export async function discoverCompetitors(domain: string, knownCompetitors: string[] = []) {
  // Get Google Shopping results
  const googleResults = await fetchSerperResults(domain, knownCompetitors);
  
  // Get LLM analysis
  const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama3-70b-8192"
  });

  const prompt = knownCompetitors.length > 0 
    ? `Based on these competitors: ${knownCompetitors.join(", ")}, suggest 3 similar e-commerce competitors for ${domain}. Return only domain names separated by commas.`
    : `Suggest 5 potential e-commerce competitors for ${domain} based on market trends. Return only domain names separated by commas.`;

  const analysis = await llm.invoke(prompt);
  
  // Process results
  const llmCompetitors = typeof analysis.content === 'string' 
    ? analysis.content.split(',') 
    : analysis.content.map((c: any) => c.text).join(', ').split(',');
  
  return [
    ...new Set([
      ...extractDomains(googleResults),
      ...llmCompetitors.map(s => s.trim().toLowerCase())
    ])
  ].filter(s => s.length > 0);
}

async function fetchSerperResults(domain: string, knownCompetitors: string[] = []) {
  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY!,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: `top competitors of ${domain}`,
        gl: "us",
        hl: "en"
      })
    });

    if (!response.ok) throw new Error(`Serper API error: ${response.statusText}`);
    
    const data = await response.json();
    return data.organic?.map((result: any) => result.link) || [];
  } catch (error) {
    console.error("Failed to fetch Serper results:", error);
    return [];
  }
}

function extractDomains(urls: string[]) {
  return urls.map(url => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  });
} 