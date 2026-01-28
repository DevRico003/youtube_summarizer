'use client';

import { useEffect, useState } from 'react';
import { Bot, Cpu, Sparkles, Brain, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

/**
 * Model information from the API
 */
interface ModelInfo {
  id: string;
  name: string;
  available: boolean;
}

/**
 * Model descriptions for tooltips
 */
const MODEL_DESCRIPTIONS: Record<string, string> = {
  "glm-4.7": "Z.AI's flagship model with optional thinking mode for enhanced reasoning",
  "gemini": "Google's fast and efficient model, good for general summarization",
  "groq": "Groq-hosted Llama 3.1, extremely fast inference speeds",
  "openai": "OpenAI's GPT-4o Mini, reliable and high-quality outputs",
};

/**
 * Model icons by ID
 */
const MODEL_ICONS: Record<string, typeof Bot> = {
  "glm-4.7": Brain,
  "gemini": Sparkles,
  "groq": Cpu,
  "openai": Bot,
};

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  thinkingMode?: boolean;
  onThinkingModeChange?: (enabled: boolean) => void;
  className?: string;
}

export function ModelSelector({
  value,
  onChange,
  thinkingMode = false,
  onThinkingModeChange,
  className
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchModelAvailability() {
      try {
        const response = await fetch('/api/summarize');
        const data = await response.json();
        setModels(data.models || []);

        // Auto-select first available model if no value set or current value is unavailable
        if (data.models?.length > 0) {
          const currentModel = data.models.find((m: ModelInfo) => m.id === value);
          if (!value || !currentModel?.available) {
            const firstAvailable = data.models.find((m: ModelInfo) => m.available);
            if (firstAvailable) {
              onChange(firstAvailable.id);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch model availability:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchModelAvailability();
  }, []);

  const selectedModel = models.find(m => m.id === value);
  const showThinkingMode = value === 'glm-4.7' && onThinkingModeChange;

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">AI Model</label>
        </div>
        <Select disabled>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Loading models..." />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">AI Model</label>
          {selectedModel && (
            <span className="text-xs text-muted-foreground">
              {selectedModel.available ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Available
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Not configured
                </span>
              )}
            </span>
          )}
        </div>

        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Select AI Model">
              {selectedModel && (
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = MODEL_ICONS[selectedModel.id] || Bot;
                    return <Icon className="h-4 w-4" />;
                  })()}
                  <span>{selectedModel.name}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => {
              const Icon = MODEL_ICONS[model.id] || Bot;
              const description = MODEL_DESCRIPTIONS[model.id] || 'AI language model';

              return (
                <SelectItem
                  key={model.id}
                  value={model.id}
                  disabled={!model.available}
                >
                  <div className="flex items-start gap-3 py-1">
                    <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.name}</span>
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            model.available ? "bg-green-500" : "bg-red-500"
                          )}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {description}
                        {!model.available && (
                          <span className="text-red-500 block mt-0.5">
                            API key not configured
                          </span>
                        )}
                      </p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>{description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {showThinkingMode && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-secondary">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <div>
                <span className="text-sm font-medium">Thinking Mode</span>
                <p className="text-xs text-muted-foreground">
                  Enhanced reasoning for complex content
                </p>
              </div>
            </div>
            <Switch
              checked={thinkingMode}
              onCheckedChange={onThinkingModeChange}
              aria-label="Toggle thinking mode"
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
