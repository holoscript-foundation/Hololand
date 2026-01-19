
const pattern = /add (?:a|an) (\w+)(?: (?:that|which) throws? (.+?) when I (\w+))?/;
const prompt = "add a troll which throws logs when I jump";
const matches = prompt.match(pattern);

console.log("Matches:", matches);
if (matches) {
  console.log("matches[1] (creature):", matches[1]);
  console.log("matches[2] (projectile):", matches[2]);
  console.log("matches[3] (gesture):", matches[3]);
}
