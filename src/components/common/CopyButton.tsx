import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  iconClassName?: string;
  showText?: boolean;
  tooltip?: string;
  variant?: 'ghost' | 'neutral' | 'dark' | 'outline';
  size?: 'sm' | 'md' | 'xs';
}

export default function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied!',
  className = '',
  iconClassName = '',
  showText = false,
  tooltip = 'Copy to clipboard',
  variant = 'ghost',
  size = 'sm'
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!text) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure context or iframe restrictions
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'neutral':
        return 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200';
      case 'dark':
        return 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700';
      case 'outline':
        return 'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 shadow-xs';
      case 'ghost':
      default:
        return 'hover:bg-neutral-100/80 text-neutral-500 hover:text-neutral-900';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return 'p-1 text-[11px] gap-1 rounded';
      case 'md':
        return 'p-2 text-sm gap-2 rounded-lg';
      case 'sm':
      default:
        return 'p-1.5 text-xs gap-1.5 rounded-md';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'xs':
        return 'w-3 h-3';
      case 'md':
        return 'w-4 h-4';
      case 'sm':
      default:
        return 'w-3.5 h-3.5';
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? copiedLabel : (tooltip || label)}
      aria-label={copied ? copiedLabel : (tooltip || label)}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer select-none active:scale-95 ${getVariantStyles()} ${getSizeStyles()} ${className}`}
    >
      {copied ? (
        <>
          <Check className={`${getIconSize()} text-emerald-600 animate-in zoom-in-50 duration-150 ${iconClassName}`} />
          {showText && <span className="text-emerald-600 font-semibold">{copiedLabel}</span>}
        </>
      ) : (
        <>
          <Copy className={`${getIconSize()} ${iconClassName}`} />
          {showText && <span>{label}</span>}
        </>
      )}
    </button>
  );
}
