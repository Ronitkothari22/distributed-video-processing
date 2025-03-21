import axios from 'axios';
import webSocketService from './WebSocketService';

// API configuration for development and production
const isDevelopment = import.meta.env.DEV;
const BACKEND_URL = isDevelopment ? 'http://localhost:8000' : '';

// API endpoints - ensure these match exactly with the backend routes
const ENDPOINTS = {
  UPLOAD: `${BACKEND_URL}/upload`,
  VIDEO_ENHANCEMENT_STATUS: `${BACKEND_URL}/internal/video-enhancement-status`,
  METADATA_EXTRACTION_STATUS: `${BACKEND_URL}/internal/metadata-extraction-status`,
  PROCESSED_VIDEOS: `${BACKEND_URL}/processed_videos`,
  METADATA_FILES: `${BACKEND_URL}/metadata`,
};

// Configure axios
const apiClient = axios.create({
  baseURL: '',  // We're using full URLs in the endpoints
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

class ApiService {
  /**
   * Upload a video file to the backend
   * @param file - The video file to upload
   * @returns Promise with the upload response
   */
  public async uploadVideo(file: File): Promise<{ file_id: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Get client ID to associate with this upload
    const clientId = webSocketService.getClientId();
    
    // Add client_id to both form data and URL query parameter for better compatibility
    formData.append('client_id', clientId);
    
    console.log(`Uploading file to ${ENDPOINTS.UPLOAD} with client ID: ${clientId}`);

    try {
      const response = await apiClient.post(`${ENDPOINTS.UPLOAD}?client_id=${clientId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          // Log upload progress
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          console.log(`Upload progress: ${percentCompleted}%`);
        },
        // Note: If withCredentials is true, the server must respond with a specific origin
        // in Access-Control-Allow-Origin, not a wildcard "*".
        // Set to true only if sessions/cookies are needed for authentication
        withCredentials: false,
      });

      console.log('Upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Get the video enhancement status for a file
   * @param fileId - The ID of the file
   * @returns Promise with the status
   */
  public async getVideoEnhancementStatus(fileId: string): Promise<{
    status: string;
    progress: number;
    error: string | null;
    last_updated: string;
  }> {
    const response = await apiClient.get(`${ENDPOINTS.VIDEO_ENHANCEMENT_STATUS}/${fileId}`);
    return response.data;
  }

  /**
   * Get the metadata extraction status for a file
   * @param fileId - The ID of the file
   * @returns Promise with the status
   */
  public async getMetadataExtractionStatus(fileId: string): Promise<{
    status: string;
    progress: number;
    error: string | null;
    last_updated: string;
  }> {
    const response = await apiClient.get(`${ENDPOINTS.METADATA_EXTRACTION_STATUS}/${fileId}`);
    return response.data;
  }

  /**
   * Get the URL for a processed video
   * @param fileId - The ID of the file
   * @returns URL to the processed video
   */
  public getProcessedVideoUrl(fileId: string): string {
    const url = `${ENDPOINTS.PROCESSED_VIDEOS}/${fileId}`;
    console.log(`ApiService: Generated processed video URL: ${url} for fileId: ${fileId}`);
    return url;
  }

  /**
   * Get the URL for a video's metadata JSON
   * @param fileId - The ID of the file
   * @returns URL to the metadata JSON
   */
  public getMetadataUrl(fileId: string): string {
    const url = `${ENDPOINTS.METADATA_FILES}/${fileId}.json`;
    console.log(`ApiService: Generated metadata URL: ${url} for fileId: ${fileId}`);
    return url;
  }
}

// Create a singleton instance
const apiService = new ApiService();
export default apiService; 