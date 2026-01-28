'use client';

import { cn } from '@/lib/utils';

const DETAIL_LEVELS = [
  { value: 1, label: 'Brief', description: 'Quick overview, key points only' },
  { value: 2, label: 'Concise', description: 'Main ideas with some detail' },
  { value: 3, label: 'Balanced', description: 'Good balance of brevity and depth' },
  { value: 4, label: 'Detailed', description: 'Thorough coverage of topics' },
  { value: 5, label: 'Comprehensive', description: 'In-depth analysis with all details' },
];

interface DetailSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function DetailSlider({ value, onChange, className }: DetailSliderProps) {
  const currentLevel = DETAIL_LEVELS.find(level => level.value === value) || DETAIL_LEVELS[2];

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Detail Level</label>
        <span className="text-sm font-semibold text-primary">{currentLevel.label}</span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
        />

        <div className="flex justify-between mt-1">
          {DETAIL_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => onChange(level.value)}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                value >= level.value ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
              aria-label={level.label}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{currentLevel.description}</p>
    </div>
  );
}
