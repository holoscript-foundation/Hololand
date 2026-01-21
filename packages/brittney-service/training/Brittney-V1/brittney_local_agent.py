"""
Brittney Local Agent - Using Phi-3.5-mini-instruct with DirectML
Runs entirely on your local RTX 3060 GPU

# Setup:
> pip install agent-framework --pre onnxruntime-genai-directml

# First, optimize the model (one-time):
> olive run --config phi3_5_dml_config.json

# Then run this agent:
> python brittney_local_agent.py
"""

import asyncio
import os
import sys
from pathlib import Path

from agent_framework import MCPStdioTool, ToolProtocol, FunctionCallContent

# Try to import onnxruntime-genai for local inference
try:
    import onnxruntime_genai as og
except ImportError:
    print("Please install: pip install onnxruntime-genai-directml")
    sys.exit(1)

# Local Model Configuration
# Use the converted DirectML model from AI Toolkit
MODEL_FOLDER = Path(__file__).parent / "huggingface_microsoft_Phi-3.5-mini-instruct_v4" / "history" / "Convert to DirectML_20260119_154615" / "model"
AGENT_NAME = "brittney-local"

AGENT_INSTRUCTIONS = """You are ✱brittney, the AI assistant for Hololand and HoloScript development.

## Core Principles
- Code is truth - Always provide working HoloScript syntax
- Use traits for behavior: @grabbable, @pointable, @hoverable, @throwable, @breakable, @networked, @scalable, @collidable
- Be concise - Provide working code with minimal explanation
- Consider VR ergonomics - Objects reachable, UI readable
- **Always think and solve problems in declarative HoloScript, not JavaScript.**

## VR Traits
- @grabbable - Pick up (requires physics)
- @throwable - Throw with physics
- @pointable - Respond to pointer, use onPoint:
- @hoverable - Hover detection, use onHoverEnter/Exit
- @breakable - Destructible with shatter
- @networked - Multiplayer sync
- @collidable - Collision detection
- @scalable - Two-handed pinch resize

## Animation
animation name {
  property: 'position.y' | 'rotation.y' | 'scale' | 'opacity'
  from: number
  to: number
  duration: milliseconds
  loop: infinite
  easing: 'easeInOut'
}

## Events
onPoint, onGrab, onRelease, onHoverEnter, onHoverExit, onTriggerEnter, onSwing

## Response Format
- Always wrap code in ```holoscript blocks.
- Keep explanations brief.
"""

CHAT_TEMPLATE = "<|user|>\n{input} <|end|>\n<|assistant|>"

# Test prompts - Real HoloScript scenarios from Phase 1 training
USER_INPUTS = [
    # Basic objects
    "Create a red cube that floats up and down",
    
    # VR interactions
    "Make a sphere I can pick up and throw with bouncy physics",
    
    # UI elements
    "Create a VR button that plays a click sound and changes color when pointed at",
    
    # Complex scene
    "Build a treasure chest that glows when I look at it, opens when clicked, and plays a sound",
    
    # Multiplayer
    "Create a networked scoreboard UI that shows 'Red: 0  Blue: 0' floating above the arena",
    
    # Physics demo
    "Make a bowling setup with 10 pins at the bottom of a ramp, and balls that roll down when triggered",
]


class LocalPhiModel:
    """Wrapper for local Phi-3.5 model using ONNX Runtime GenAI"""
    
    def __init__(self, model_folder: Path):
        self.model_folder = model_folder
        self.model = None
        self.tokenizer = None
        self.tokenizer_stream = None
        
    def load(self):
        """Load the model and tokenizer"""
        if not self.model_folder.exists():
            raise FileNotFoundError(
                f"Model not found at {self.model_folder}\n"
                "Please run: olive run --config phi3_5_dml_config.json"
            )
        
        print(f"Loading model from {self.model_folder}...")
        self.model = og.Model(str(self.model_folder))
        self.tokenizer = og.Tokenizer(self.model)
        self.tokenizer_stream = self.tokenizer.create_stream()
        print("Model loaded successfully!")
        
    def generate(self, prompt: str, max_tokens: int = 512) -> str:
        """Generate a response from the model"""
        if self.model is None:
            self.load()
            
        # Format with system prompt and chat template
        full_prompt = f"<|system|>\n{AGENT_INSTRUCTIONS}<|end|>\n{CHAT_TEMPLATE.format(input=prompt)}"
        
        # Encode
        input_tokens = self.tokenizer.encode(full_prompt)
        
        # Create generator params
        params = og.GeneratorParams(self.model)
        params.set_search_options(
            max_length=max_tokens,
            temperature=0.6,
            top_p=0.9,
            top_k=5,
        )
        
        # Generate
        generator = og.Generator(self.model, params)
        generator.append_tokens(input_tokens)
        
        response_tokens = []
        while not generator.is_done():
            generator.generate_next_token()
            new_token = generator.get_next_tokens()[0]
            response_tokens.append(new_token)
            
        # Decode response
        response = self.tokenizer.decode(response_tokens)
        
        del generator
        return response
    
    async def generate_stream(self, prompt: str, max_tokens: int = 512):
        """Generate a streaming response from the model"""
        if self.model is None:
            self.load()
            
        # Format with system prompt and chat template
        full_prompt = f"<|system|>\n{AGENT_INSTRUCTIONS}<|end|>\n{CHAT_TEMPLATE.format(input=prompt)}"
        
        # Encode
        input_tokens = self.tokenizer.encode(full_prompt)
        
        # Create generator params
        params = og.GeneratorParams(self.model)
        params.set_search_options(
            max_length=max_tokens,
            temperature=0.6,
            top_p=0.9,
            top_k=5,
        )
        
        # Generate with streaming
        generator = og.Generator(self.model, params)
        generator.append_tokens(input_tokens)
        
        while not generator.is_done():
            generator.generate_next_token()
            new_token = generator.get_next_tokens()[0]
            token_text = self.tokenizer_stream.decode(new_token)
            yield token_text
            # Small delay to allow async processing
            await asyncio.sleep(0)
            
        del generator


def create_mcp_tools() -> list[ToolProtocol]:
    """Create MCP tools for Hololand integration"""
    return [
        MCPStdioTool(
            name="hololand",
            description="MCP server for hololand",
            command="npx",
            args=[
                "tsx",
                "c:/Users/josep/Documents/GitHub/Hololand/packages/mcp-server/src/index.ts",
            ],
            env={
                "HOLOLAND_API_URL": os.environ.get("HOLOLAND_API_URL", ""),
                "BRITTNEY_SERVICE_URL": os.environ.get("BRITTNEY_SERVICE_URL", ""),
            },
        ),
    ]


async def main() -> None:
    """Main entry point for local Brittney agent"""
    
    # Initialize local model
    model = LocalPhiModel(MODEL_FOLDER)
    
    try:
        model.load()
    except FileNotFoundError as e:
        print(f"\n❌ {e}")
        print("\n📦 To optimize the model for your RTX 3060:")
        print("   1. pip install olive-ai")
        print("   2. olive run --config phi3_5_dml_config.json")
        print("   3. Run this script again")
        return
    
    print("\n" + "="*60)
    print("✱brittney Local Agent - Phi-3.5-mini on RTX 3060")
    print("="*60)
    
    # Process user messages
    for user_input in USER_INPUTS:
        print(f"\n👤 User: {user_input}")
        print("\n🤖 Brittney: ", end="", flush=True)
        
        async for token in model.generate_stream(user_input):
            print(token, end="", flush=True)
        
        print("\n")
    
    print("\n--- All tasks completed successfully ---")


async def interactive_mode():
    """Run in interactive chat mode"""
    
    model = LocalPhiModel(MODEL_FOLDER)
    
    try:
        model.load()
    except FileNotFoundError as e:
        print(f"\n❌ {e}")
        return
    
    print("\n" + "="*60)
    print("✱brittney Local Agent - Interactive Mode")
    print("Type 'quit' to exit")
    print("="*60 + "\n")
    
    while True:
        try:
            user_input = input("👤 You: ").strip()
            if user_input.lower() in ['quit', 'exit', 'q']:
                break
            if not user_input:
                continue
                
            print("\n🤖 Brittney: ", end="", flush=True)
            async for token in model.generate_stream(user_input):
                print(token, end="", flush=True)
            print("\n")
            
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Brittney Local Agent")
    parser.add_argument("--interactive", "-i", action="store_true", 
                        help="Run in interactive chat mode")
    args = parser.parse_args()
    
    try:
        if args.interactive:
            asyncio.run(interactive_mode())
        else:
            asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProgram interrupted by user")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("Program finished.")
