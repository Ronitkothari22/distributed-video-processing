import React, { useState, useRef } from 'react';
import { 
  Button, 
  Box, 
  Typography, 
  LinearProgress, 
  Paper, 
  Alert, 
  IconButton,
  Stack,
  useTheme,
  alpha,
  Grow,
  Zoom,
  Divider,
  Avatar,
  Grid
} from '@mui/material';
import { 
  CloudUpload, 
  VideoFile, 
  Close, 
  Upload, 
  FileUploadOutlined,
  MovieCreation,
  UploadFile 
} from '@mui/icons-material';
import apiService from '../../services/ApiService';
import { isVideoFile, formatBytes } from '../../utils/helpers';
import webSocketService from '../../services/WebSocketService';

interface VideoUploadProps {
  onUploadSuccess: (fileId: string, fileName: string) => void;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ onUploadSuccess }) => {
  const theme = useTheme();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragActive(false);
    setError(null);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      if (!isVideoFile(file)) {
        setError('Please drop a valid video file.');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        textAlign: 'center',
        py: 4
      }}
    >
      <Zoom in style={{ transitionDelay: '100ms' }}>
        <Avatar 
          sx={{ 
            width: 80, 
            height: 80, 
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.primary.main,
            mb: 3,
            p: 2,
          }}
        >
          <MovieCreation sx={{ fontSize: 42 }} />
        </Avatar>
      </Zoom>
      
      <Grow in timeout={600}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            mb: 1,
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Video Processing Hub
        </Typography>
      </Grow>
      
      <Grow in timeout={800}>
        <Typography
          variant="subtitle1"
          color="text.secondary"
          sx={{ 
            mb: 4, 
            maxWidth: 600,
            fontWeight: 400
          }}
        >
          Upload your video for AI-powered enhancement and metadata extraction
        </Typography>
      </Grow>
      
      {error && (
        <Zoom in>
          <Alert 
            severity="error" 
            variant="filled" 
            sx={{ 
              mb: 3, 
              borderRadius: 3,
              width: '100%',
              maxWidth: 600,
              fontWeight: 600
            }}
          >
            {error}
          </Alert>
        </Zoom>
      )}
      
      <Box 
        sx={{
          width: '100%',
          maxWidth: 600,
          mx: 'auto',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 4,
            background: theme.palette.background.paper,
            border: dragActive ? 
              `2px dashed ${theme.palette.primary.main}` : 
              `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            transition: 'all 0.2s ease-in-out',
            transform: dragActive ? 'scale(1.01)' : 'scale(1)',
            boxShadow: dragActive ? 
              `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}` : 
              undefined
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            ref={fileInputRef}
          />
          
          {!selectedFile ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 5,
                cursor: 'pointer'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadFile 
                sx={{ 
                  fontSize: 64, 
                  color: alpha(theme.palette.primary.main, 0.7),
                  mb: 2 
                }} 
              />
              
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Drag & Drop or Click to Upload
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Support for MP4, MOV, AVI and WebM formats
              </Typography>
              
              <Button
                variant="contained"
                disableElevation
                startIcon={<FileUploadOutlined />}
                sx={{ 
                  mt: 3,
                  px: 3,
                  py: 1.5,
                  borderRadius: 3,
                  fontWeight: 600,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                Select Video File
              </Button>
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  p: 2,
                  borderRadius: 3,
                }}
              >
                <Avatar
                  variant="rounded"
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    mr: 2
                  }}
                >
                  <VideoFile />
                </Avatar>
                
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={600} noWrap>
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
                  sx={{ 
                    color: theme.palette.text.secondary,
                    '&:hover': {
                      color: theme.palette.error.main
                    }
                  }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
              
              {uploading && (
                <Box sx={{ mt: 3 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={uploadProgress} 
                    sx={{ 
                      height: 12, 
                      borderRadius: 6,
                      mb: 1,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      '& .MuiLinearProgress-bar': {
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        borderRadius: 6
                      }
                    }} 
                  />
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
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
                startIcon={<CloudUpload />}
                fullWidth
                sx={{ 
                  mt: 3,
                  py: 1.2,
                  borderRadius: 3,
                  fontWeight: 600
                }}
              >
                {uploading ? 'Uploading...' : 'Upload and Process Video'}
              </Button>
            </Box>
          )}
        </Paper>
        
        <Box
          sx={{
            p: 3,
            borderRadius: 4,
            backgroundColor: alpha(theme.palette.background.paper, 0.5),
            border: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
            backdropFilter: 'blur(10px)'
          }}
        >
          <Typography
            variant="subtitle2"
            gutterBottom
            fontWeight={600}
            textAlign="center"
          >
            What happens after upload?
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Grid container>
            <GridItem 
              number={1}
              title="Video Enhancement"
              description="AI-powered enhancement to improve quality, color, and resolution"
            />
            <GridItem 
              number={2}
              title="Metadata Extraction"
              description="Detailed analysis of video properties and technical information"
            />
            <GridItem 
              number={3}
              title="Real-time Updates"
              description="Track processing status with live updates via WebSockets"
            />
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

interface GridItemProps {
  number: number;
  title: string;
  description: string;
}

const GridItem: React.FC<GridItemProps> = ({ number, title, description }) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        display: 'flex',
        mb: 2,
        width: '100%',
        '&:last-child': {
          mb: 0
        }
      }}
    >
      <Avatar
        sx={{ 
          width: 32, 
          height: 32, 
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.primary.main,
          mr: 2,
          fontSize: 16,
          fontWeight: 700
        }}
      >
        {number}
      </Avatar>
      
      <Box>
        <Typography variant="body1" fontWeight={600}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Box>
  );
};

export default VideoUpload; 