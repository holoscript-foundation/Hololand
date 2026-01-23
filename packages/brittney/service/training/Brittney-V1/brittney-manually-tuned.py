"""Build Agent using Microsoft Agent Framework in Python
# Run this python script
> pip install anthropic agent-framework --pre
> python <this-script-path>.py
"""

import asyncio
import os

from agent_framework import MCPStdioTool, MCPStreamableHTTPTool, ToolProtocol, FunctionCallContent
from agent_framework.azure import AzureAIClient
from agent_framework.openai import OpenAIChatClient
from openai import AsyncOpenAI
from azure.identity.aio import AzureCliCredential

# Microsoft Foundry Agent Configuration
ENDPOINT = "https://brittney-resource.services.ai.azure.com/api/projects/Brittney"
MODEL_DEPLOYMENT_NAME = "gpt-4o"

AGENT_NAME = "mcp-agent"
AGENT_INSTRUCTIONS = "You are ✱brittney, the AI assistant for Hololand and HoloScript development.\r\n\r\n## Core Principles\r\n- Code is truth - Always provide working HoloScript syntax\r\n- Use traits for behavior: @grabbable, @pointable, @hoverable, @throwable, @breakable, @networked, @scalable, @collidable\r\n- Be concise - Provide working code with minimal explanation\r\n- Consider VR ergonomics - Objects reachable, UI readable\r\n- **Always think and solve problems in declarative HoloScript, not JavaScript. If you start formulating code or behavior in JavaScript, pause and re-map your approach into pure HoloScript syntax using native declarative constructs and traits whenever possible. Avoid imperative or procedural logic—express all intent natively as HoloScript.**\r\n\r\n## VR Traits\r\n- @grabbable - Pick up (requires physics)\r\n- @throwable - Throw with physics\r\n- @pointable - Respond to pointer, use onPoint:\r\n- @hoverable - Hover detection, use onHoverEnter/Exit\r\n- @breakable - Destructible with shatter\r\n- @networked - Multiplayer sync\r\n- @collidable - Collision detection\r\n- @scalable - Two-handed pinch resize\r\n\r\n## Animation\r\nanimation name {\r\n  property: 'position.y' | 'rotation.y' | 'scale' | 'opacity'\r\n  from: number\r\n  to: number\r\n  duration: milliseconds\r\n  loop: infinite\r\n  easing: 'easeInOut'\r\n}\r\n\r\n## Events\r\nonPoint, onGrab, onRelease, onHoverEnter, onHoverExit, onTriggerEnter, onSwing\r\n\r\n## Steps\r\n1. Recognize if the user's request or your initial plan is phrased in imperative/JavaScript logic.\r\n2. Pause to re-interpret the task as declarative HoloScript intent using traits, patterns, and event handlers.\r\n3. Think carefully, step by step, about how to map each conceptual action into native HoloScript style.\r\n4. Summarize this reasoning in a <thinking> section before producing code.\r\n5. Output HoloScript code only after the reasoning step.\r\n\r\n## Response Format\r\n- Always wrap code in ```holoscript blocks.\r\n- Always include your step-by-step reasoning in a <thinking> section before the code.\r\n- Keep explanations brief.\r\n\r\n## Output Example\r\n\r\n<thinking>\r\nIdentify and correct any JavaScript logic in the problem statement, then describe how to express it as native HoloScript declarative traits or events.\r\n</thinking>\r\n```holoscript\r\n[Working and idiomatic HoloScript code here]\r\n```"

# User inputs for the conversation
USER_INPUTS = [
    "can you make me a green ball",
    "can you make me a green goblin thats throwing arrows",
    "Create a multiplayer arena with:\n- A floating platform in the center\n- 4 spawn points at the corners with glowing rings\n- A scoreboard UI at the top\n- Collectible power-up orbs that respawn",
    "Make a physics demo with:\n- A ramp at 30 degrees\n- 10 balls at the top that roll down when triggered\n- Bowling pins at the bottom\n- A reset button to start over",
    "Create a multiplayer battle arena with:\n- A hexagonal floating platform in the center\n- 4 spawn pads at corners with glowing rings and teleport effect\n- A scoreboard UI panel floating above showing \"Red: 0  Blue: 0\"\n- Power-up orbs (speed boost, shield) that float and spin\n- Orbs respawn 10 seconds after being collected\n- Arena boundary that damages players who fall off",
    "Build a forest clearing scene with:\n- 5 trees arranged in a semicircle behind a campfire\n- A campfire in the center with animated flames and particle effects\n- Crackling fire audio that loops\n- A treasure chest that plays a sound and opens when clicked\n- Ambient forest background audio\n- Soft warm lighting from the fire",
    "Build a forest clearing scene with:\n- 5 trees arranged in a semicircle behind a campfire\n- A campfire in the center with animated flames and particle effects\n- Crackling fire audio that loops\n- A treasure chest that plays a sound and opens when clicked\n- Ambient forest background audio\n- Soft warm lighting from the fire",
    "Create a puzzle room where:\n- There are 3 colored buttons on pedestals (red, blue, green)\n- The correct sequence is: blue, red, green\n- Pressing the right order opens a large door with a sliding animation\n- Wrong order plays a buzzer sound, flashes red, and resets\n- A floating hint text says \"The sky comes first...\"\n- Each button glows and plays a chime when pressed",
]

def create_mcp_tools() -> list[ToolProtocol]:
    return [
        MCPStdioTool(
            name="hololand".replace("-", "_"),
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
            env={
                "HOLOLAND_API_URL": os.environ.get("HOLOLAND_API_URL", ""),
                "BRITTNEY_SERVICE_URL": os.environ.get("BRITTNEY_SERVICE_URL", ""),
            }
        ),
    ]

async def main() -> None:
    async with (
        # For authentication, run `az login` command in terminal or replace AzureCliCredential with preferred authentication option.
        AzureCliCredential() as credential,
        AzureAIClient(
            project_endpoint=ENDPOINT,
            model_deployment_name=MODEL_DEPLOYMENT_NAME,
            credential=credential,
            agent_name=AGENT_NAME,
            use_latest_version=True,  # This parameter will allow to re-use latest agent version instead of creating a new one
        ).create_agent(
            instructions=AGENT_INSTRUCTIONS,
            max_tokens=4096,
            tools=[
                *create_mcp_tools(),
            ],
        ) as agent
    ):
        # Process user messages
        for user_input in USER_INPUTS:
            print(f"\n# User: '{user_input}'")
            printed_tool_calls = set()
            async for chunk in agent.run_stream([user_input]):
                # log tool calls if any
                function_calls = [
                    c for c in chunk.contents 
                    if isinstance(c, FunctionCallContent)
                ]
                for call in function_calls:
                    if call.call_id not in printed_tool_calls:
                        print(f"Tool calls: {call.name}")
                        printed_tool_calls.add(call.call_id)
                if chunk.text:
                    print(chunk.text, end="")
            print("")
        
        print("\n--- All tasks completed successfully ---")

    # Give additional time for all async cleanup to complete
    await asyncio.sleep(1.0)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProgram interrupted by user")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("Program finished.")
