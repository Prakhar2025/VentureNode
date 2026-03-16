# Claude Specific Instructions for VentureNode

As Claude working on VentureNode (Notion MCP Challenge), adhere to the following strict guidelines:
1. **Focus on Reasoning & LangGraph State**: When implementing Python agents, put extra emphasis on state management. Ensure the LangGraph nodes pass the correct dictionaries and that state transitions are flawless.
2. **Notion Schema Adherence**: You are reading and writing to a Notion Workspace. Ensure you provide code that strictly matches the expected properties (Select, Relation, Rich_text, Title).
3. **No Placeholders**: Never return code with `// TODO: Implement`. Send back complete snippets.
4. **Tool Use**: Stick to DuckDuckGoSearchRun and BeautifulSoup. No paid search tools.
5. **Aesthetics**: For Next.js code, utilize Shadcn UI heavily to ensure the Dashboard looks extremely premium. Use `lucide-react` icons.
