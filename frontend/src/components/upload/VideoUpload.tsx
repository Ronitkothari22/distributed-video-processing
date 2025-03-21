import React, { useState, useRef } from 'react';
import { 
  Button, 
  Box, 
  Typography, 
  LinearProgress, 
  Paper, 
  Alert, 
  IconButton,
  Stack
} from '@mui/material';
import { CloudUpload, VideoFile, Close } from '@mui/icons-material';
import apiService from '../../services/ApiService';
import { isVideoFile, formatBytes } from '../../utils/helpers';
import webSocketService from '../../services/WebSocketService';

interface VideoUploadProps {
  onUploadSuccess: (fileId: string, fileName: string) => void;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setError(null);

    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    
    if (!isVideoFile(file)) {
      setError('Please select a valid video file.');
      return;
    }

    console.log(`Selected file: ${file.name}, type: ${file.type}, size: ${formatBytes(file.size)}`);
    setSelectedFile(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a video file first.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);
      
      // Set up a progress interval for visual feedback
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          return newProgress >= 90 ? 90 : newProgress; // Cap at 90% until complete
        });
      }, 300);

      console.log(`Starting upload of ${selectedFile.name}`);
      
      // Log client ID for debugging
      const clientId = webSocketService.getClientId();
      console.log(`Client ID for this upload: ${clientId}`);
      
      // Upload the file
      const result = await apiService.uploadVideo(selectedFile);
      
      // Complete the progress
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      console.log(`Upload successful. File ID: ${result.file_id}`);
      
      // Notify parent component
      onUploadSuccess(result.file_id, selectedFile.name);
      
      // Reset after a delay
      setTimeout(() => {
        setSelectedFile(null);
        setUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 1500);
      
    } catch (err: any) {
      console.error('Upload error:', err);
      
      // Extract error message for display
      let errorMessage = 'Failed to upload video. Please try again.';
      if (err.response) {
        // The request was made and the server responded with a status code outside of 2xx
        console.error('Error response:', err.response);
        errorMessage = `Server error: ${err.response.status} - ${err.response.data?.detail || err.response.statusText}`;
      } else if (err.request) {
        // The request was made but no response was received
        console.error('Error request:', err.request);
        errorMessage = 'No response from server. Please check your connection and try again.';
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = `Error: ${err.message}`;
      }
      
      setError(errorMessage);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Upload Video for Processing
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <input
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          ref={fileInputRef}
        />
        
        <Button
          variant="outlined"
          startIcon={<CloudUpload />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          sx={{ mb: 2 }}
        >
          Select Video File
        </Button>
        
        {selectedFile && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 1, 
            border: '1px solid #e0e0e0', 
            borderRadius: 1,
            mb: 2
          }}>
            <VideoFile sx={{ mr: 1, color: 'primary.main' }} />
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {selectedFile.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatBytes(selectedFile.size)}
              </Typography>
            </Stack>
            <IconButton 
              size="small" 
              onClick={clearSelectedFile}
              disabled={uploading}
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>
        )}
        
        {uploading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={uploadProgress} 
              sx={{ mb: 1, height: 8, borderRadius: 4 }} 
            />
            <Typography variant="caption" color="text.secondary">
              {uploadProgress === 100 
                ? 'Upload complete!' 
                : `Uploading: ${uploadProgress}%`}
            </Typography>
          </Box>
        )}
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          fullWidth
        >
          {uploading ? 'Uploading...' : 'Upload and Process Video'}
        </Button>
      </Box>
    </Paper>
  );
};

export default VideoUpload; 