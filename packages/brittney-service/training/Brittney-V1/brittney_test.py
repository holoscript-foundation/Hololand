"""
Brittney Local Test - Quick test of Phi-3.5-mini-instruct with DirectML
Run with: python brittney_test.py
"""

import onnxruntime_genai as og
from pathlib import Path

# Model path - use the converted DirectML model
MODEL_FOLDER = Path(__file__).parent / "huggingface_microsoft_Phi-3.5-mini-instruct_v4" / "history" / "Convert to DirectML_20260119_154615" / "model"

SYSTEM_PROMPT = """You are ✱brittney, the AI assistant for Hololand and HoloScript development.

## Core Principles
- Code is truth - Always provide working HoloScript syntax
- Use traits for behavior: @grabbable, @pointable, @hoverable, @throwable, @breakable, @networked
- Be concise - Provide working code with minimal explanation

## VR Traits
- @grabbable - Pick up (requires physics)
- @throwable - Throw with physics
- @pointable - Respond to pointer, use onPoint:
- @hoverable - Hover detection, use onHoverEnter/Exit

## Response Format
- Always wrap code in ```holoscript blocks.
- Keep explanations brief.
"""

CHAT_TEMPLATE = "<|system|>\n{system}<|end|>\n<|user|>\n{user}<|end|>\n<|assistant|>"

# Test prompts
TEST_PROMPTS = [
    "Create a red cube that floats up and down",
    "Make a sphere I can pick up and throw",
    "Create a VR button that plays a sound when clicked",
]


def main():
    print(f"\n{'='*60}")
    print("✱brittney Local Test - Phi-3.5-mini on DirectML")
    print(f"{'='*60}")
    
    print(f"\nLoading model from: {MODEL_FOLDER}")
    
    if not MODEL_FOLDER.exists():
        print(f"\n❌ Model not found at {MODEL_FOLDER}")
        return
    
    # Load model
    model = og.Model(str(MODEL_FOLDER))
    tokenizer = og.Tokenizer(model)
    tokenizer_stream = tokenizer.create_stream()
    
    print("✅ Model loaded successfully!\n")
    
    # Test each prompt
    for i, user_input in enumerate(TEST_PROMPTS, 1):
        print(f"\n{'─'*60}")
        print(f"Test {i}/{len(TEST_PROMPTS)}")
        print(f"{'─'*60}")
        print(f"👤 User: {user_input}")
        print(f"\n🤖 Brittney: ", end="", flush=True)
        
        # Format prompt
        prompt = CHAT_TEMPLATE.format(system=SYSTEM_PROMPT, user=user_input)
        
        # Encode
        input_tokens = tokenizer.encode(prompt)
        
        # Create generator
        params = og.GeneratorParams(model)
        params.set_search_options(
            max_length=512,
            temperature=0.6,
            top_p=0.9,
            top_k=5,
        )
        
        generator = og.Generator(model, params)
        generator.append_tokens(input_tokens)
        
        # Generate with streaming
        token_count = 0
        while not generator.is_done():
            generator.generate_next_token()
            new_token = generator.get_next_tokens()[0]
            token_text = tokenizer_stream.decode(new_token)
            print(token_text, end="", flush=True)
            token_count += 1
            
            # Stop after reasonable length
            if token_count > 300:
                break
        
        print("\n")
        del generator
    
    print(f"\n{'='*60}")
    print("✅ All tests completed!")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
