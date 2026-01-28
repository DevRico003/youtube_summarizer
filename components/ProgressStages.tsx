'use client';

import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Stage =
  | 'fetching_transcript'
  | 'analyzing_topics'
  | 'generating_summary'
  | 'building_timeline';

const STAGES: { id: Stage; label: string }[] = [
  { id: 'fetching_transcript', label: 'Fetching Transcript' },
  { id: 'analyzing_topics', label: 'Analyzing Topics' },
  { id: 'generating_summary', label: 'Generating Summary' },
  { id: 'building_timeline', label: 'Building Timeline' },
];

interface ProgressStagesProps {
  currentStage: Stage | null;
  className?: string;
}

export function ProgressStages({ currentStage, className }: ProgressStagesProps) {
  const currentIndex = currentStage ? STAGES.findIndex(s => s.id === currentStage) : -1;

  return (
    <div className={cn('space-y-3', className)}>
      {STAGES.map((stage, index) => {
        const isCompleted = currentIndex > index;
        const isCurrent = currentIndex === index;
        const isPending = currentIndex < index;

        return (
          <div
            key={stage.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-colors',
              isCompleted && 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
              isCurrent && 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
              isPending && 'bg-muted/30 border-muted'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0',
                isCompleted && 'bg-green-500 text-white',
                isCurrent && 'bg-blue-500 text-white',
                isPending && 'bg-muted-foreground/30 text-muted-foreground'
              )}
            >
              {isCompleted && <Check className="w-4 h-4" />}
              {isCurrent && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending && <span className="text-xs font-medium">{index + 1}</span>}
            </div>

            <span
              className={cn(
                'text-sm font-medium',
                isCompleted && 'text-green-700 dark:text-green-400',
                isCurrent && 'text-blue-700 dark:text-blue-400',
                isPending && 'text-muted-foreground'
              )}
            >
              {stage.label}
            </span>

            {isCompleted && (
              <span className="ml-auto text-xs text-green-600 dark:text-green-500">
                Complete
              </span>
            )}
            {isCurrent && (
              <span className="ml-auto text-xs text-blue-600 dark:text-blue-500">
                In progress...
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
