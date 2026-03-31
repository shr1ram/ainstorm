import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';

interface Props {
  nodeId: string;
}

interface MenuState {
  x: number;
  y: number;
  direction: 'top' | 'bottom' | 'left' | 'right';
}

function getZoom(): number {
  const viewport = document.querySelector('.react-flow__viewport');
  if (!viewport) return 1;
  const style = window.getComputedStyle(viewport);
  const matrix = new DOMMatrix(style.transform);
  return matrix.a; // scaleX = zoom
}

export function useNodeContextMenu(nodeId: string) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // Only show context menu when right-clicking on a handle
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isHandle = target.classList.contains('react-flow__handle') ||
        target.closest('.react-flow__handle') !== null;

      if (isHandle) {
        e.preventDefault();
        e.stopPropagation();

        const handle = target.classList.contains('react-flow__handle')
          ? target
          : target.closest('.react-flow__handle')!;
        const pos = handle.getAttribute('data-handlepos') as string;
        const dirMap: Record<string, 'top' | 'bottom' | 'left' | 'right'> = {
          top: 'top', bottom: 'bottom', left: 'left', right: 'right',
        };
        setMenu({ x: e.clientX, y: e.clientY, direction: dirMap[pos] || 'bottom' });
      } else {
        // Not a handle — suppress Chrome menu
        e.preventDefault();
      }
    };

    // Right-click drag: track movement and update node position directly
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return;

      const target = e.target as HTMLElement;
      const isHandle = target.classList.contains('react-flow__handle') ||
        target.closest('.react-flow__handle') !== null;
      if (isHandle) return;

      e.preventDefault();
      e.stopPropagation();

      const store = useStore.getState();
      const node = store.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startNodeX = node.position.x;
      const startNodeY = node.position.y;
      const zoom = getZoom();
      let moved = false;

      const handleMouseMove = (moveE: MouseEvent) => {
        moved = true;
        const dx = (moveE.clientX - startX) / zoom;
        const dy = (moveE.clientY - startY) / zoom;

        const currentStore = useStore.getState();
        const updatedNodes = currentStore.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, position: { x: startNodeX + dx, y: startNodeY + dy } }
            : n
        );
        useStore.setState({ nodes: updatedNodes });
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        if (moved) {
          useStore.getState().debouncedSave();
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    // Pinch-to-resize: trackpad pinch reports as wheel events with ctrlKey
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return; // only pinch gestures

      e.preventDefault();
      e.stopPropagation();

      const { nodes, resizeNode } = useStore.getState();
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const currentW = (node.style?.width as number) || 300;
      const currentH = (node.style?.height as number) || 200;

      // deltaY < 0 = pinch out (zoom in) = grow, deltaY > 0 = pinch in = shrink
      const scaleFactor = 1 - e.deltaY * 0.005;
      const newW = Math.max(150, Math.min(1200, Math.round(currentW * scaleFactor)));
      const newH = Math.max(80, Math.min(900, Math.round(currentH * scaleFactor)));

      if (newW === currentW && newH === currentH) return;

      resizeNode(nodeId, newW, newH);
    };

    el.addEventListener('contextmenu', handleContextMenu);
    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => {
      el.removeEventListener('contextmenu', handleContextMenu);
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, [nodeId]);

  const closeMenu = useCallback(() => setMenu(null), []);

  return { menu, wrapperRef, closeMenu };
}

export function NodeContextMenu({ nodeId, menu, onClose }: Props & { menu: MenuState; onClose: () => void }) {
  const forkNode = useStore((s) => s.forkNode);
  const deleteNode = useStore((s) => s.deleteNode);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick, true);
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('mousedown', handleClick, true);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="node-context-menu"
      style={{ left: menu.x, top: menu.y }}
    >
      <button
        className="context-menu-item"
        onClick={() => { forkNode(nodeId, 'chatBot', menu.direction); onClose(); }}
      >
        Fork as Chat
      </button>
      <button
        className="context-menu-item"
        onClick={() => { forkNode(nodeId, 'codeBox', menu.direction); onClose(); }}
      >
        Fork as Code
      </button>
      <div className="context-menu-separator" />
      <button
        className="context-menu-item context-menu-danger"
        onClick={() => { deleteNode(nodeId); onClose(); }}
      >
        Delete
      </button>
    </div>,
    document.body
  );
}
