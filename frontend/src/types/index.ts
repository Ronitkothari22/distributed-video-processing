// Status types for tracking video processing
export type ProcessStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Process types handled by the backend
export type ProcessType = 'video_enhancement' | 'metadata_extraction';

// WebSocket message types
export interface BaseMessage {
  type: string;
  timestamp: string;
}

export interface ConnectionMessage extends BaseMessage {
  type: 'connection';
  status: 'connected';
  client_id: string;
}

export interface UploadStatusMessage extends BaseMessage {
  type: 'upload_status';
  file_id: string;
  status: 'uploaded';
  message: string;
}

export interface StatusUpdateMessage extends BaseMessage {
  type: 'status_update';
  file_id: string;
  process_type: ProcessType;
  status: ProcessStatus;
  progress: number;
  error: string | null;
}

export type WebSocketMessage = ConnectionMessage | UploadStatusMessage | StatusUpdateMessage;

// Video metadata structure
export interface VideoMetadata {
  file_id: string;
  filename: string;
  format: string;
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
  frame_count: number;
  duration_seconds: number;
  file_size_bytes: number;
  bit_rate: string;
  color_profile: {
    histograms: {
      b: number[];
      g: number[];
      r: number[];
    };
    average_color: {
      b: number;
      g: number;
      r: number;
    };
  };
  advanced?: any;
}

// Video processing state
export interface VideoProcessingState {
  file_id: string;
  filename: string;
  uploadTime: string;
  videoEnhancement: {
    status: ProcessStatus;
    progress: number;
    error: string | null;
    last_updated: string;
  };
  metadataExtraction: {
    status: ProcessStatus;
    progress: number;
    error: string | null;
    last_updated: string;
  };
  metadata?: VideoMetadata;
} 