import { Menu } from "lucide-react";

export default function TopBar({ onToggleSidebar, title = "هايبر ماركت السعادة" }) {
  return (
    <header className="topbar">
      <div className="topbar-logo">🏪 <span>{title}</span></div>
      <button className="hamburger" onClick={onToggleSidebar} aria-label="Toggle menu">
        <Menu size={20} />
      </button>
    </header>
  );
}
