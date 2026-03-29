import type { Node, Edge } from '@xyflow/react';
import type { TextBoxData, ChatBotData, FileBoxData } from '../types';

/**
 * Check if adding an edge from source to target would create a cycle.
 */
export function wouldCreateCycle(
  _nodes: Node[],
  edges: Edge[],
  target: string,
  source: string
): boolean {
  // Can we reach source from target by following edges?
  const visited = new Set<string>();
  const queue = [target];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === source) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const edge of edges) {
      if (edge.source === current) {
        queue.push(edge.target);
      }
    }
  }
  return false;
}

/**
 * Gather all upstream context for a given node by traversing edges backward.
 * Returns a formatted string of all ancestor node content in topological order.
 */
export function getUpstreamContext(
  nodeId: string,
  nodes: Node[],
  edges: Edge[]
): string {
  // Build reverse adjacency: target -> sources
  const reverseAdj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!reverseAdj.has(edge.target)) reverseAdj.set(edge.target, []);
    reverseAdj.get(edge.target)!.push(edge.source);
  }

  // BFS backward to find all ancestors
  const visited = new Set<string>();
  const queue: string[] = [];
  const ancestors: string[] = [];

  // Start from the direct parents of nodeId
  const parents = reverseAdj.get(nodeId) || [];
  for (const p of parents) queue.push(p);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    ancestors.push(current);

    const grandparents = reverseAdj.get(current) || [];
    for (const gp of grandparents) {
      if (!visited.has(gp)) queue.push(gp);
    }
  }

  // Topological sort ancestors (parents before children in the flow)
  const sorted = topologicalSort(ancestors, edges);

  // Build context string
  const contextParts: string[] = [];
  for (const id of sorted) {
    const node = nodes.find((n) => n.id === id);
    if (!node) continue;

    if (node.type === 'textBox') {
      const data = node.data as TextBoxData;
      if (data.content.trim()) {
        contextParts.push(`### ${data.label || 'Text Node'}\n${data.content}`);
      }
    } else if (node.type === 'chatBot' || node.type === 'codeBox') {
      const data = node.data as ChatBotData;
      if (data.messages.length > 0) {
        const conversation = data.messages
          .map((m) => `**${m.role}**: ${m.content}`)
          .join('\n\n');
        contextParts.push(`### ${data.label || 'Chat Node'}\n${conversation}`);
      }
    } else if (node.type === 'fileBox') {
      const data = node.data as FileBoxData;
      for (const file of data.files || []) {
        if (file.type === 'pdf' && file.extractedText) {
          contextParts.push(`### File: ${file.filename}\n${file.extractedText}`);
        } else if (file.type === 'image') {
          contextParts.push(`### File: ${file.filename}\n[Image attached]`);
        }
      }
    }
  }

  return contextParts.join('\n\n---\n\n');
}

function topologicalSort(nodeIds: string[], edges: Edge[]): string[] {
  const idSet = new Set(nodeIds);
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const edge of edges) {
    if (idSet.has(edge.source) && idSet.has(edge.target)) {
      adj.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adj.get(current) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return sorted;
}
