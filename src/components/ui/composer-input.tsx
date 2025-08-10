import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComposerInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ComposerInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Nachricht eingeben...",
  disabled = false,
  className
}: ComposerInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      onSubmit();
    } else if (e.key === "Enter" && e.shiftKey) {
      // Allow new line with Shift+Enter (default behavior)
      return;
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  React.useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <div className={cn("relative flex items-end gap-2 p-4 border-t bg-background", className)}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[44px] max-h-[120px] resize-none pr-12 focus-visible:ring-2 focus-visible:ring-primary"
        rows={1}
      />
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            size="icon"
            className="absolute right-6 bottom-6 h-8 w-8 rounded-full focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Absenden (↑)"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Absenden (↑)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}