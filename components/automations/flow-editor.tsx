"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Save, Zap, Play, Pause, History } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TriggerNode, ActionNode, ConditionNode, WaitNode, EndNode } from "./node-types";
import { BlockPanel } from "./block-panel";
import { NodeConfigPanel } from "./node-config-panel";
import { saveFlowVersion, updateFlowStatus } from "@/app/(app)/automations/actions";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  wait: WaitNode,
  end: EndNode,
};

type FlowBlock = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: { label?: string; kind?: string; config?: Record<string, unknown> };
};

type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
};

function toReactFlowNodes(blocks: FlowBlock[]): Node[] {
  return blocks.map((b) => ({
    id: b.id,
    type: b.type,
    position: b.position,
    data: b.data,
  }));
}

function toReactFlowEdges(connections: FlowEdge[]): Edge[] {
  return connections.map((c) => ({
    id: c.id,
    source: c.source,
    target: c.target,
    sourceHandle: c.sourceHandle ?? null,
    animated: true,
    style: { stroke: "hsl(var(--brand))", strokeWidth: 2 },
  }));
}

export function FlowEditor({
  flowId,
  flowName,
  flowStatus,
  initialBlocks,
  initialConnections,
}: {
  flowId: string;
  flowName: string;
  flowStatus: string;
  initialBlocks: FlowBlock[];
  initialConnections: FlowEdge[];
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toReactFlowNodes(initialBlocks));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toReactFlowEdges(initialConnections));
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "hsl(var(--brand))", strokeWidth: 2 },
          },
          eds,
        ),
      ),
    [setEdges],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  function addBlock(type: string, kind: string, label: string) {
    const id = `${type}_${Date.now()}`;
    const centerX = 250;
    const centerY = 150 + nodes.length * 120;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type,
        position: { x: centerX, y: centerY },
        data: { label, kind, config: {} },
      },
    ]);
  }

  function updateNodeConfig(nodeId: string, config: Record<string, unknown>) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, config } } : n,
      ),
    );
    setSelectedNode((prev) =>
      prev?.id === nodeId ? { ...prev, data: { ...prev.data, config } } : prev,
    );
  }

  async function handleSave() {
    setSaving(true);
    const blocks = nodes.map((n) => ({
      id: n.id,
      type: n.type ?? "action",
      position: n.position,
      data: n.data,
    }));
    const connections = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
    }));
    await saveFlowVersion(flowId, { blocks, connections });
    setSaving(false);
  }

  async function toggleStatus() {
    const next = flowStatus === "active" ? "paused" : "active";
    await updateFlowStatus(flowId, next);
  }

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Block palette */}
      <BlockPanel onAddBlock={addBlock} />

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="opacity-30" />
          <Controls />
          <MiniMap nodeColor={() => "hsl(var(--brand))"} className="!bg-card !border !border-border" />

          <Panel position="top-right" className="flex items-center gap-2">
            <Badge
              variant={flowStatus === "active" ? "default" : "outline"}
              className={flowStatus === "active" ? "bg-green-600" : ""}
            >
              {flowStatus === "active" ? "Ativo" : flowStatus === "paused" ? "Pausado" : "Rascunho"}
            </Badge>
            <Button variant="outline" size="sm" onClick={toggleStatus}>
              {flowStatus === "active" ? (
                <>
                  <Pause className="mr-1.5 h-3.5 w-3.5" /> Pausar
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Ativar
                </>
              )}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saving ? "Salvando..." : "Salvar e publicar"}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/automations/${flowId}/logs`}>
                <History className="mr-1.5 h-3.5 w-3.5" />
                Logs
              </Link>
            </Button>
          </Panel>

          <Panel position="top-left">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
              <Zap className="h-4 w-4 text-brand" />
              <span className="text-sm font-semibold">{flowName}</span>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Config panel */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={(config) => updateNodeConfig(selectedNode.id, config)}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
