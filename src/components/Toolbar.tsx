import { useStore } from '../store/useStore';
import type { AIProvider } from '../types';

export function Toolbar() {
  const addTextNode = useStore((s) => s.addTextNode);
  const addChatNode = useStore((s) => s.addChatNode);
  const defaultProvider = useStore((s) => s.defaultProvider);
  const setDefaultProvider = useStore((s) => s.setDefaultProvider);

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
      </div>
      <div className="toolbar-provider">
        <label>Default:</label>
        <select
          value={defaultProvider}
          onChange={(e) => setDefaultProvider(e.target.value as AIProvider)}
        >
          <option value="claude">Claude</option>
          <option value="codex">Codex</option>
        </select>
      </div>
    </div>
  );
}
