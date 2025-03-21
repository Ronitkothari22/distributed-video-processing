/**
 * Format bytes to a human-readable string
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places
 * @returns Formatted string (e.g., '2.5 MB')
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Format seconds to a time string (HH:MM:SS)
 * @param seconds - Number of seconds
 * @returns Formatted time string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const parts = [];
  
  if (hours > 0) {
    parts.push(hours.toString().padStart(2, '0'));
  }
  
  parts.push(minutes.toString().padStart(2, '0'));
  parts.push(remainingSeconds.toString().padStart(2, '0'));
  
  return parts.join(':');
}

/**
 * Generates a color from a status string
 * @param status - The status string
 * @returns A color string for styling
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#f9a825'; // Amber
    case 'processing':
      return '#2196f3'; // Blue
    case 'completed':
      return '#4caf50'; // Green
    case 'failed':
      return '#f44336'; // Red
    default:
      return '#9e9e9e'; // Grey
  }
}

/**
 * Validate if a file is a video file
 * @param file - The file to validate
 * @returns True if the file is a video, false otherwise
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * Format a timestamp to a human-readable date and time
 * @param timestamp - ISO timestamp string
 * @returns Formatted date and time
 */
export function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch (e) {
    return timestamp;
  }
} 