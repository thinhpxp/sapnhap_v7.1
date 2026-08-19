// components/ui/ThemeToggle.jsx
// Nút chuyển đổi thủ công Light/Dark Mode
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="btn-icon"
      title={theme === 'light' ? 'Chuyển sang Dark Mode' : 'Chuyển sang Light Mode'}
      aria-label="Toggle theme"
    >
      {theme === 'light'
        ? <Moon size={16} />
        : <Sun size={16} />
      }
    </button>
  );
}
