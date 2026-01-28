// Mock transcript module to avoid heavy dependency chain
export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
  lang: string;
}

export interface TranscriptResult {
  content: TranscriptSegment[] | string;
  lang: string;
  availableLangs: string[];
  hasTimestamps: boolean;
}

export class TranscriptError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "TranscriptError";
  }
}

export async function fetchTranscript(): Promise<TranscriptResult> {
  throw new Error("Mock: fetchTranscript not implemented");
}
