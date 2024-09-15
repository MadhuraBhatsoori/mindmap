import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';

// Updated Toolbar component with styling options
const Toolbar = ({
  onAdd,
  onDelete,
  onUndo,
  onRedo,
  onCopy,
  onCut,
  onPaste,
  onStyleChange,
  currentStyle,
}) => (
  <div className="toolbar">
    <button onClick={onAdd}>+ Add</button>
    <button onClick={onDelete}>- Delete</button>
    <button onClick={onUndo}>Undo</button>
    <button onClick={onRedo}>Redo</button>
    <button onClick={onCopy}>Copy</button>
    <button onClick={onCut}>Cut</button>
    <button onClick={onPaste}>Paste</button>
    <label>
      Font size:
      <input
        type="number"
        value={currentStyle.fontSize || ''}
        onChange={(e) => onStyleChange('fontSize', e.target.value)}
      />
    </label>
    <label>
      Font style:
      <select
        value={currentStyle.fontStyle || 'normal'}
        onChange={(e) => onStyleChange('fontStyle', e.target.value)}
      >
        <option value="normal">Normal</option>
        <option value="bold">Bold</option>
        <option value="italic">Italic</option>
      </select>
    </label>
    <label>
      Font color:
      <input
        type="color"
        value={currentStyle.fontColor || '#000000'}
        onChange={(e) => onStyleChange('fontColor', e.target.value)}
      />
    </label>
    <label>
      Branch color:
      <input
        type="color"
        value={currentStyle.edgeColor || '#000000'}
        onChange={(e) => onStyleChange('edgeColor', e.target.value)}
      />
    </label>
  </div>
);

// CustomNode component
const CustomNode = ({ data, id }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);

  useEffect(() => {
    setLabel(data.label);
  }, [data.label]);

  const handleAddNode = () => {
    data.onAddNode(id);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleChange = (e) => {
    setLabel(e.target.value);
  };

  const handleBlur = () => {
    setIsEditing(false);
    data.onLabelChange(id, label);
  };

  return (
    <div
      style={{
        padding: '10px',
        borderRadius: '5px',
        background: '#fff',
        border: '1px solid #ddd',
        fontSize: data.fontSize || '12px',
        fontStyle: data.fontStyle || 'normal',
        color: data.fontColor || '#000',
        position: 'relative',
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <input
          type="text"
          value={label}
          onChange={handleChange}
          onBlur={handleBlur}
          autoFocus
          style={{
            width: '100%',
            fontSize: data.fontSize || '12px',
            fontStyle: data.fontStyle || 'normal',
            color: data.fontColor || '#000',
            border: '1px solid #ddd',
          }}
        />
      ) : (
        label
      )}
      <button
        style={{
          position: 'absolute',
          bottom: '-15px',
          right: '-15px',
          backgroundColor: '#4CAF50',
          borderRadius: '50%',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          width: '25px',
          height: '25px',
        }}
        onClick={handleAddNode}
      >
        +
      </button>
    </div>
  );
};

// Main App component
const App = () => {
  const handleLabelChange = useCallback((id, newLabel) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, label: newLabel } };
        }
        return node;
      })
    );
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: '1',
      type: 'custom',
      position: { x: 250, y: 250 },
      data: {
        label: 'Central Idea',
        onAddNode: (parentId) => handleAddNode(parentId),
        onLabelChange: handleLabelChange,
      },
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [clipboardData, setClipboardData] = useState(null);
  const historyRef = useRef({ past: [], present: { nodes, edges }, future: [] });

  const onConnect = useCallback(
    (params) => {
      const newEdge = { ...params, type: 'smoothstep' };
      setEdges((eds) => addEdge(newEdge, eds));
      updateHistory({ nodes, edges: [...edges, newEdge] });
    },
    [edges, nodes, setEdges]
  );

  const updateHistory = (newPresent) => {
    historyRef.current = {
      past: [...historyRef.current.past, historyRef.current.present],
      present: newPresent,
      future: [],
    };
  };

  const handleAddNode = useCallback(
    (parentId) => {
      const newNodeId = Date.now().toString();
      const parentNode = nodes.find((node) => node.id === parentId);
      const newNode = {
        id: newNodeId,
        type: 'custom',
        position: {
          x: parentNode.position.x + Math.random() * 100 - 50,
          y: parentNode.position.y + 100,
        },
        data: {
          label: 'New Idea',
          onAddNode: (id) => handleAddNode(id),
          onLabelChange: handleLabelChange,
        },
      };
      const newEdge = {
        id: `${parentId}-${newNodeId}`,
        source: parentId,
        target: newNodeId,
        type: 'smoothstep',
        style: { stroke: '#000' },
      };

      const newNodes = [...nodes, newNode];
      const newEdges = [...edges, newEdge];
      setNodes(newNodes);
      setEdges(newEdges);
      updateHistory({ nodes: newNodes, edges: newEdges });
    },
    [nodes, edges, setNodes, setEdges, handleLabelChange]
  );

  const handleDelete = useCallback(() => {
    if (selectedNodes.length === 0) return;

    const nodesToDelete = new Set(selectedNodes);
    const newNodes = nodes.filter((node) => !nodesToDelete.has(node.id));
    const newEdges = edges.filter(
      (edge) =>
        !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target)
    );

    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNodes([]);
    updateHistory({ nodes: newNodes, edges: newEdges });
  }, [nodes, edges, selectedNodes, setNodes, setEdges]);

  const handleUndo = useCallback(() => {
    if (historyRef.current.past.length === 0) return;

    const newPresent =
      historyRef.current.past[historyRef.current.past.length - 1];
    historyRef.current = {
      past: historyRef.current.past.slice(0, -1),
      present: newPresent,
      future: [historyRef.current.present, ...historyRef.current.future],
    };

    setNodes(newPresent.nodes);
    setEdges(newPresent.edges);
  }, [setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (historyRef.current.future.length === 0) return;

    const newPresent = historyRef.current.future[0];
    historyRef.current = {
      past: [...historyRef.current.past, historyRef.current.present],
      present: newPresent,
      future: historyRef.current.future.slice(1),
    };

    setNodes(newPresent.nodes);
    setEdges(newPresent.edges);
  }, [setNodes, setEdges]);

  const handleStyleChange = useCallback(
    (property, value) => {
      const newNodes = nodes.map((node) => ({
        ...node,
        data: { ...node.data, [property]: value },
      }));
      setNodes(newNodes);
      updateHistory({ nodes: newNodes, edges });
    },
    [nodes, edges, setNodes]
  );

  const onSelectionChange = (selection) => {
    if (!selection) return;
    setSelectedNodes(selection.nodes.map((node) => node.id));
  };

  const handleCopy = useCallback(async () => {
    if (selectedNodes.length === 0) return;

    const nodesToCopy = nodes.filter((node) => selectedNodes.includes(node.id));
    const edgesToCopy = edges.filter(
      (edge) =>
        selectedNodes.includes(edge.source) &&
        selectedNodes.includes(edge.target)
    );

    setClipboardData({ nodes: nodesToCopy, edges: edgesToCopy });
  }, [nodes, edges, selectedNodes]);

  const handlePaste = useCallback(() => {
    if (!clipboardData) return;

    const newNodes = clipboardData.nodes.map((node) => ({
      ...node,
      id: `${node.id}-${Date.now()}`,
      position: {
        x: node.position.x + Math.random() * 100 - 50,
        y: node.position.y + 100,
      },
    }));

    const newEdges = clipboardData.edges.map((edge) => ({
      ...edge,
      id: `${edge.id}-${Date.now()}`,
      source: `${edge.source}-${Date.now()}`,
      target: `${edge.target}-${Date.now()}`,
    }));

    setNodes([...nodes, ...newNodes]);
    setEdges([...edges, ...newEdges]);
    updateHistory({
      nodes: [...nodes, ...newNodes],
      edges: [...edges, ...newEdges],
    });
  }, [clipboardData, nodes, edges, setNodes, setEdges]);

  const handleCut = useCallback(() => {
    handleCopy();
    handleDelete();
  }, [handleCopy, handleDelete]);

  return (
    <div style={{ height: '100vh' }}>
      <Toolbar
        onAdd={() => handleAddNode('1')}
        onDelete={handleDelete}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onStyleChange={handleStyleChange}
        currentStyle={{}}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={{ custom: CustomNode }}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

export default App;
