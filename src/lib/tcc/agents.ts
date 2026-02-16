// TCC Agent Configuration
// Fleet agent definitions with gateway connection details

export interface AgentConfig {
  id: string;
  name: string;
  emoji: string;
  model: string;
  role: string;
  tailscaleIp: string;
  gatewayPort: number;
}

export const AGENTS: AgentConfig[] = [
  {
    id: "damien",
    name: "Damien",
    emoji: "🎯",
    model: "Claude Sonnet 4.5",
    role: "Chief of Staff",
    tailscaleIp: "100.126.81.107",
    gatewayPort: 18789,
  },
  {
    id: "atlas",
    name: "Atlas",
    emoji: "🏗️",
    model: "Claude Opus 4",
    role: "DevOps Engineer",
    tailscaleIp: "100.83.224.111",
    gatewayPort: 18789,
  },
  {
    id: "remi",
    name: "Remi",
    emoji: "🔬",
    model: "Claude Sonnet 4.5",
    role: "Researcher",
    tailscaleIp: "100.119.75.110",
    gatewayPort: 18789,
  },
  {
    id: "topg",
    name: "TopG",
    emoji: "⚡",
    model: "Claude Sonnet 4.5",
    role: "Builder",
    tailscaleIp: "100.108.246.113",
    gatewayPort: 18789,
  },
];
