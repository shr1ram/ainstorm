import { useStore } from '../store/useStore';
import type { AIProvider } from '../types';

export function Toolbar() {
  const addTextNode = useStore((s) => s.addTextNode);
  const addChatNode = useStore((s) => s.addChatNode);
  const addFileNode = useStore((s) => s.addFileNode);
  const defaultProvider = useStore((s) => s.defaultProvider);
  const setDefaultProvider = useStore((s) => s.setDefaultProvider);
  const defaultFontSize = useStore((s) => s.defaultFontSize);
  const setDefaultFontSize = useStore((s) => s.setDefaultFontSize);

  return (
    <div className="toolbar">
      <div className="toolbar-title">ainstorm</div>
      <div className="toolbar-buttons">
        <button className="toolbar-btn" onClick={() => addTextNode()}>
          + Text Box
        </button>
        <button className="toolbar-btn toolbar-btn-chat" onClick={() => addChatNode()}>
          + Chat Box
        </button>
        <button className="toolbar-btn toolbar-btn-file" onClick={() => addFileNode()}>
          + File Box
        </button>
      </div>
      <div className="toolbar-provider">
        <label>AI:</label>
        <select
          value={defaultProvider}
          onChange={(e) => setDefaultProvider(e.target.value as AIProvider)}
        >
          <option value="claude">Claude</option>
          <option value="codex">Codex</option>
        </select>
      </div>
      <div className="toolbar-provider">
        <label>Font:</label>
        <input
          type="number"
          className="toolbar-font-input"
          value={defaultFontSize}
          onChange={(e) => setDefaultFontSize(Number(e.target.value) || 14)}
          min={8}
          max={32}
        />
        <span>px</span>
      </div>
    </div>
  );
}
