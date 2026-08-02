import React, { useState, useRef, useEffect } from 'react';

interface DropdownItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  target?: string;
  style?: React.CSSProperties;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
  triggerClassName?: string;
  triggerStyle?: React.CSSProperties;
}

export const Dropdown: React.FC<DropdownProps> = ({ 
  trigger, items, align = 'right', className = '', triggerClassName = '', triggerStyle = {} 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !menuRef.current) return;
      const menuItems = Array.from(menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]'));
      const activeIdx = menuItems.indexOf(document.activeElement as HTMLElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (activeIdx + 1) % menuItems.length;
        menuItems[next]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = activeIdx - 1 < 0 ? menuItems.length - 1 : activeIdx - 1;
        menuItems[prev]?.focus();
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus first item on open
      setTimeout(() => {
        const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
        first?.focus();
      }, 0);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }} className={className} onClick={e => e.stopPropagation()}>
      <button 
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...triggerStyle }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {trigger}
      </button>
      {isOpen && (
        <div 
          ref={menuRef}
          role="menu"
          className="bm-cat-dropdown-menu" 
          style={{ [align]: 0, top: '100%', marginTop: '4px', zIndex: 100 }}
        >
          {items.map((item) => {
            const ItemTag = item.href ? 'a' : 'button';
            return (
              <ItemTag
                key={item.id}
                role="menuitem"
                className="bm-cat-dropdown-item"
                style={{ ...item.style, display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                href={item.href}
                target={item.target}
                rel={item.target === '_blank' ? 'noreferrer' : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  item.onClick?.();
                }}
              >
                {item.icon}
                {item.label}
              </ItemTag>
            );
          })}
        </div>
      )}
    </div>
  );
}
