/**
 * Test script for Brittney RAG
 * Tests various HoloScript query types
 */

const queries = [
  'Create a fire particle effect',
  'Make a health bar UI',
  'Add an explosion particle effect',
  'Create a weapon hammer',
  'Set up an indoor room scene',
  'Make a gem collectible',
  'Add ambient background music',
];

async function testQuery(query: string): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Query: ${query}`);
  console.log('='.repeat(60));

  try {
    const response = await fetch('http://localhost:11435/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: query }],
      }),
    });

    if (!response.ok) {
      console.log(`Error: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log(`\nResponse (${data.usage?.totalTokens || '?'} tokens):`);
    console.log(data.content?.slice(0, 800) + (data.content?.length > 800 ? '...' : ''));
  } catch (error) {
    console.log(`Error: ${error}`);
  }
}

async function main() {
  console.log('🧪 Testing Brittney RAG with various HoloScript queries...\n');

  // Run a subset of tests to save time
  const testQueries = queries.slice(0, 3);

  for (const query of testQueries) {
    await testQuery(query);
    // Small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n\n✅ Tests complete!');
}

main();
