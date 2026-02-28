async function testBrittney() {
  console.log("Testing Brittney AI V43 Service Quality...\n");

  const prompt = `Create a complex HoloScript scene that deploys a single intelligent AI character. 
This agent should be utilizing the new V43 traits: @llm_agent, @rag_knowledge, and @stable_diffusion.
Show me exactly how to configure these traits with realistic parameters in your response.`;

  try {
    const res = await fetch('http://localhost:11435/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'brittney-qwen-v43-q8_0',
        messages: [
          { role: 'system', content: 'You are Brittney, an expert HoloScript architect. Provide only the requested HoloScript code and a brief explanation.' },
          { role: 'user', content: prompt }
        ],
        stream: false
      })
    });

    if (!res.ok) {
      console.log("Error status:", res.status);
      console.log(await res.text());
      return;
    }

    const data = await res.json();
    console.log("Generation output:\n");
    console.log(data.message?.content || data.response || JSON.stringify(data));
  } catch (error) {
    console.error("Connection failed:", error.message);
  }
}

testBrittney();
