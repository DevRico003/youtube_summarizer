'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GripVertical, RotateCcw, Save, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Topic {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  order: number;
}

interface TopicEditorProps {
  topics: Topic[];
  videoDuration: number; // in milliseconds
  onSave: (topics: Topic[]) => void;
}

// Color palette for topics (same as Timeline)
const TOPIC_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-cyan-500',
];

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Minimum topic duration in ms
const MIN_TOPIC_DURATION = 1000;

export function TopicEditor({ topics, videoDuration, onSave }: TopicEditorProps) {
  // Deep clone topics for editing
  const [editedTopics, setEditedTopics] = useState<Topic[]>(() =>
    topics.map(t => ({ ...t }))
  );
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragInfo, setDragInfo] = useState<{
    topicId: string;
    handle: 'start' | 'end';
    initialMs: number;
    initialX: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Sort topics by order
  const sortedTopics = useMemo(() => {
    return [...editedTopics].sort((a, b) => a.order - b.order);
  }, [editedTopics]);

  // Store original topics for revert
  const originalTopics = useRef<Topic[]>(topics.map(t => ({ ...t })));

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (originalTopics.current.length !== editedTopics.length) return true;
    return editedTopics.some((topic) => {
      const original = originalTopics.current.find(t => t.id === topic.id);
      if (!original) return true;
      return (
        topic.title !== original.title ||
        topic.startMs !== original.startMs ||
        topic.endMs !== original.endMs
      );
    });
  }, [editedTopics]);

  // Focus title input when editing
  useEffect(() => {
    if (editingTitleId && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitleId]);

  // Handle title double-click to edit
  const handleTitleDoubleClick = useCallback((topic: Topic) => {
    setEditingTitleId(topic.id);
    setEditingTitleValue(topic.title);
  }, []);

  // Handle title change
  const handleTitleSave = useCallback(() => {
    if (editingTitleId && editingTitleValue.trim()) {
      setEditedTopics(prev =>
        prev.map(t =>
          t.id === editingTitleId
            ? { ...t, title: editingTitleValue.trim() }
            : t
        )
      );
    }
    setEditingTitleId(null);
    setEditingTitleValue('');
  }, [editingTitleId, editingTitleValue]);

  // Handle title cancel
  const handleTitleCancel = useCallback(() => {
    setEditingTitleId(null);
    setEditingTitleValue('');
  }, []);

  // Handle key press in title input
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  }, [handleTitleSave, handleTitleCancel]);

  // Start dragging a boundary handle
  const handleDragStart = useCallback((
    e: React.MouseEvent,
    topicId: string,
    handle: 'start' | 'end'
  ) => {
    e.preventDefault();
    const topic = editedTopics.find(t => t.id === topicId);
    if (!topic) return;

    setIsDragging(true);
    setDragInfo({
      topicId,
      handle,
      initialMs: handle === 'start' ? topic.startMs : topic.endMs,
      initialX: e.clientX,
    });
  }, [editedTopics]);

  // Handle drag movement
  useEffect(() => {
    if (!isDragging || !dragInfo || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerRect = containerRef.current!.getBoundingClientRect();
      const containerWidth = containerRect.width;

      // Calculate ms per pixel
      const msPerPixel = videoDuration / containerWidth;

      // Calculate delta in ms
      const deltaX = e.clientX - dragInfo.initialX;
      const deltaMs = deltaX * msPerPixel;

      // Calculate new position
      let newMs = dragInfo.initialMs + deltaMs;

      // Enforce boundaries and contiguity
      setEditedTopics(prev => {
        const sorted = [...prev].sort((a, b) => a.order - b.order);
        const topicIndex = sorted.findIndex(t => t.id === dragInfo.topicId);
        const topic = sorted[topicIndex];

        if (!topic) return prev;

        if (dragInfo.handle === 'start') {
          // Start handle: constrained by previous topic's end and this topic's end
          const minMs = topicIndex > 0 ? sorted[topicIndex - 1].startMs + MIN_TOPIC_DURATION : 0;
          const maxMs = topic.endMs - MIN_TOPIC_DURATION;
          newMs = Math.max(minMs, Math.min(maxMs, newMs));

          // Snap to neighbor: update previous topic's end to match
          const updates = sorted.map((t, i) => {
            if (t.id === topic.id) {
              return { ...t, startMs: Math.round(newMs) };
            }
            if (i === topicIndex - 1) {
              // Snap previous topic's end to this topic's start
              return { ...t, endMs: Math.round(newMs) };
            }
            return t;
          });
          return updates;
        } else {
          // End handle: constrained by this topic's start and next topic's end
          const minMs = topic.startMs + MIN_TOPIC_DURATION;
          const maxMs = topicIndex < sorted.length - 1
            ? sorted[topicIndex + 1].endMs - MIN_TOPIC_DURATION
            : videoDuration;
          newMs = Math.max(minMs, Math.min(maxMs, newMs));

          // Snap to neighbor: update next topic's start to match
          const updates = sorted.map((t, i) => {
            if (t.id === topic.id) {
              return { ...t, endMs: Math.round(newMs) };
            }
            if (i === topicIndex + 1) {
              // Snap next topic's start to this topic's end
              return { ...t, startMs: Math.round(newMs) };
            }
            return t;
          });
          return updates;
        }
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragInfo(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragInfo, videoDuration]);

  // Revert to original
  const handleRevert = useCallback(() => {
    setEditedTopics(originalTopics.current.map(t => ({ ...t })));
    setEditingTitleId(null);
    setEditingTitleValue('');
  }, []);

  // Save changes
  const handleSave = useCallback(() => {
    onSave(editedTopics);
    // Update original reference after save
    originalTopics.current = editedTopics.map(t => ({ ...t }));
  }, [editedTopics, onSave]);

  if (!topics || topics.length === 0 || videoDuration <= 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Edit Topics
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevert}
            disabled={!hasChanges}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Revert
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Visual timeline editor */}
      <div
        ref={containerRef}
        className="relative w-full h-12 rounded-lg overflow-hidden border border-border bg-muted/30"
      >
        {sortedTopics.map((topic, index) => {
          const leftPercent = (topic.startMs / videoDuration) * 100;
          const widthPercent = ((topic.endMs - topic.startMs) / videoDuration) * 100;
          const colorClass = TOPIC_COLORS[index % TOPIC_COLORS.length];

          return (
            <div
              key={topic.id}
              className={`absolute top-0 h-full ${colorClass} opacity-80 hover:opacity-100 transition-opacity`}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
            >
              {/* Start handle */}
              <div
                className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize group"
                onMouseDown={(e) => handleDragStart(e, topic.id, 'start')}
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-white/50 group-hover:bg-white transition-colors" />
                <GripVertical className="absolute top-1/2 -translate-y-1/2 -left-1 w-4 h-4 text-white/70 group-hover:text-white" />
              </div>

              {/* End handle */}
              <div
                className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize group"
                onMouseDown={(e) => handleDragStart(e, topic.id, 'end')}
              >
                <div className="absolute inset-y-0 right-0 w-1 bg-white/50 group-hover:bg-white transition-colors" />
                <GripVertical className="absolute top-1/2 -translate-y-1/2 -right-1 w-4 h-4 text-white/70 group-hover:text-white" />
              </div>

              {/* Topic label (if wide enough) */}
              {widthPercent > 10 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium truncate px-4 pointer-events-none">
                  {topic.title}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Time markers */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatTime(0)}</span>
        <span>{formatTime(videoDuration)}</span>
      </div>

      {/* Topic list with editable titles */}
      <ul className="space-y-2">
        {sortedTopics.map((topic, index) => {
          const colorClass = TOPIC_COLORS[index % TOPIC_COLORS.length];
          const isEditing = editingTitleId === topic.id;

          return (
            <li
              key={topic.id}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              {/* Color indicator */}
              <div className={`w-3 h-3 rounded-full ${colorClass} flex-shrink-0`} />

              {/* Time range */}
              <span className="text-sm font-mono text-muted-foreground whitespace-nowrap w-28">
                {formatTime(topic.startMs)} - {formatTime(topic.endMs)}
              </span>

              {/* Title (editable) */}
              {isEditing ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    ref={titleInputRef}
                    value={editingTitleValue}
                    onChange={(e) => setEditingTitleValue(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    className="h-7 text-sm"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={handleTitleSave}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={handleTitleCancel}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <span
                  className="text-sm flex-1 cursor-pointer hover:text-primary transition-colors"
                  onDoubleClick={() => handleTitleDoubleClick(topic)}
                  title="Double-click to edit"
                >
                  {topic.title}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Double-click a title to edit. Drag the handles on the timeline to adjust boundaries.
      </p>
    </div>
  );
}
