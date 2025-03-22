import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  AppBar, 
  Toolbar, 
  Alert, 
  Snackbar,
  Grid,
  Button,
  Divider,
  useTheme,
  alpha,
  Avatar,
  Slide,
  Zoom,
  Badge
} from '@mui/material';
import { 
  VideoSettings as VideoIcon, 
  CloudDone as CloudDoneIcon,
  Upload as UploadIcon,
  GradingOutlined
} from '@mui/icons-material';
import VideoUpload from './components/upload/VideoUpload';
import ProcessingStatus from './components/status/ProcessingStatus';
import VideoPlayer from './components/video/VideoPlayer';
import MetadataDisplay from './components/video/MetadataDisplay';
import webSocketService from './services/WebSocketService';
import { VideoProcessingState, StatusUpdateMessage, WebSocketMessage } from './types';
import { formatTimestamp } from './utils/helpers';

const DEFAULT_PROCESSING_STATE = (fileId: string, filename: string, uploadTime: string): VideoProcessingState => ({
  file_id: fileId,
  filename: filename,
  uploadTime: uploadTime,
  videoEnhancement: {
    status: 'pending',
    progress: 0,
    error: null,
    last_updated: uploadTime
  },
  metadataExtraction: {
    status: 'pending',
    progress: 0,
    error: null,
    last_updated: uploadTime
  }
});

function App() {
  const theme = useTheme();
  const [videoProcessing, setVideoProcessing] = useState<VideoProcessingState | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await webSocketService.connect();
        setWsConnected(true);
        showNotification('Connected to server successfully', 'success');
      } catch (error) {
        console.error('WebSocket connection failed:', error);
        setWsConnected(false);
        showNotification('Failed to connect to server. Please refresh the page.', 'error');
      }
    };

    connectWebSocket();

    return () => {
      webSocketService.disconnect();
    };
  }, []);

  // Set up WebSocket message handler
  useEffect(() => {
    const handleWebSocketMessage = (message: WebSocketMessage) => {
      console.log('App: WebSocket message received:', message);

      if (message.type === 'upload_status') {
        console.log('App: Processing upload_status message');
        showNotification('Video uploaded successfully', 'success');
      }
      else if (message.type === 'status_update') {
        console.log('App: Processing status_update message');
        const statusMessage = message as StatusUpdateMessage;
        updateProcessingStatus(statusMessage);
      }
      else {
        console.log('App: Unhandled message type:', message.type);
      }
    };

    console.log('App: Adding WebSocket message listener');
    webSocketService.addMessageListener(handleWebSocketMessage);

    return () => {
      console.log('App: Removing WebSocket message listener');
      webSocketService.removeMessageListener(handleWebSocketMessage);
    };
  }, []);

  const updateProcessingStatus = (message: StatusUpdateMessage) => {
    const { file_id, process_type, status, progress, error } = message;
    console.log(`App: Updating processing status for file ${file_id}, process ${process_type}, status ${status}, progress ${progress}`);

    setVideoProcessing(prevState => {
      // If we don't have a processing state for this file yet, ignore it
      if (!prevState || prevState.file_id !== file_id) {
        console.log(`App: No matching state found for file_id ${file_id}, current state:`, prevState);
        return prevState;
      }

      console.log(`App: Updating state for file_id ${file_id}, current state:`, prevState);
      const newState = { ...prevState };

      if (process_type === 'video_enhancement') {
        newState.videoEnhancement = {
          status,
          progress,
          error,
          last_updated: message.timestamp
        };
        console.log(`App: Updated videoEnhancement state:`, newState.videoEnhancement);

        // Show notifications for important status changes
        if (status === 'completed') {
          showNotification('Video enhancement completed', 'success');
        } else if (status === 'failed') {
          showNotification(`Video enhancement failed: ${error}`, 'error');
        }
      } 
      else if (process_type === 'metadata_extraction') {
        newState.metadataExtraction = {
          status,
          progress,
          error,
          last_updated: message.timestamp
        };
        console.log(`App: Updated metadataExtraction state:`, newState.metadataExtraction);

        // Show notifications for important status changes
        if (status === 'completed') {
          showNotification('Metadata extraction completed', 'success');
        } else if (status === 'failed') {
          showNotification(`Metadata extraction failed: ${error}`, 'error');
        }
      }

      console.log(`App: Returning updated state:`, newState);
      return newState;
    });
  };

  const handleUploadSuccess = (fileId: string, fileName: string) => {
    const uploadTime = new Date().toISOString();
    console.log(`App: File upload successful! Setting up processing state for fileId: ${fileId}, fileName: ${fileName}`);
    
    const initialState = DEFAULT_PROCESSING_STATE(fileId, fileName, uploadTime);
    console.log('App: Initial processing state:', initialState);
    
    setVideoProcessing(initialState);
    showNotification('Video upload started', 'info');
  };

  const showNotification = (message: string, severity: 'success' | 'info' | 'warning' | 'error') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const handleReset = () => {
    setVideoProcessing(null);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.9)}, ${alpha(theme.palette.background.default, 0.98)})`,
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed'
    }}>
      <AppBar 
        position="sticky" 
        color="transparent" 
        elevation={0} 
        sx={{ 
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: alpha(theme.palette.background.paper, 0.7)
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              sx={{ 
                bgcolor: theme.palette.primary.main,
                color: '#fff',
                mr: 2,
                width: 40,
                height: 40
              }}
            >
              <VideoIcon />
            </Avatar>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 700,
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Distributed Video Processing
            </Typography>
          </Box>
          
          <Box sx={{ flexGrow: 1 }} />
          
          {wsConnected ? (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                py: 0.5,
                px: 1.5,
                borderRadius: 5,
                backgroundColor: alpha(theme.palette.success.main, 0.1)
              }}
            >
              <Badge
                variant="dot"
                overlap="circular"
                color="success"
                sx={{ 
                  '& .MuiBadge-badge': {
                    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                    '&::after': {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      animation: 'ripple 1.2s infinite ease-in-out',
                      border: '1px solid currentColor',
                      content: '""',
                    },
                  },
                  '@keyframes ripple': {
                    '0%': {
                      transform: 'scale(.8)',
                      opacity: 1,
                    },
                    '100%': {
                      transform: 'scale(2.4)',
                      opacity: 0,
                    },
                  },
                }}
              >
                <CloudDoneIcon sx={{ color: theme.palette.success.main, mr: 1 }} />
              </Badge>
              <Typography variant="body2" sx={{ color: theme.palette.success.main, fontWeight: 600 }}>
                Connected
              </Typography>
            </Box>
          ) : (
            <Alert 
              severity="warning" 
              variant="filled"
              sx={{ 
                py: 0, 
                borderRadius: 5,
                fontWeight: 600
              }}
            >
              Disconnected
            </Alert>
          )}
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ pt: 6, pb: 8 }}>
        <Snackbar 
          open={notification.open} 
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          TransitionComponent={Slide}
        >
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity}
            variant="filled"
            sx={{ 
              width: '100%',
              borderRadius: 3,
              fontWeight: 600
            }}
            iconMapping={{
              success: <Zoom in><CloudDoneIcon /></Zoom>,
              info: <Zoom in><GradingOutlined /></Zoom>,
              warning: <Zoom in><GradingOutlined /></Zoom>,
              error: <Zoom in><GradingOutlined /></Zoom>,
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
        
        {!videoProcessing ? (
          <Zoom in={!videoProcessing} style={{ transitionDelay: !videoProcessing ? '200ms' : '0ms' }}>
            <Box>
              <VideoUpload onUploadSuccess={handleUploadSuccess} />
            </Box>
          </Zoom>
        ) : (
          <>
            <Box sx={{ 
              mb: 4, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: alpha(theme.palette.background.paper, 0.7),
              backdropFilter: 'blur(10px)',
              borderRadius: 4,
              p: 2
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  variant="rounded"
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    mr: 2,
                    width: 48,
                    height: 48
                  }}
                >
                  <VideoIcon />
                </Avatar>
                <Box>
                  <Typography 
                    variant="h5" 
                    component="h1"
                    sx={{ 
                      fontWeight: 700,
                      color: theme.palette.text.primary
                    }}
                  >
                    {videoProcessing.filename}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Uploaded {formatTimestamp(videoProcessing.uploadTime)}
                  </Typography>
                </Box>
              </Box>
              
              <Button 
                variant="outlined" 
                startIcon={<UploadIcon />}
                onClick={handleReset}
                sx={{
                  borderRadius: 3,
                  fontWeight: 600
                }}
              >
                Process Another Video
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Zoom in style={{ transitionDelay: '100ms' }}>
                  <Box>
                    <ProcessingStatus processingState={videoProcessing} />
                  </Box>
                </Zoom>
              </Grid>
              
              <Grid item xs={12} md={8}>
                {videoProcessing.videoEnhancement.status === 'completed' && (
                  <Zoom in style={{ transitionDelay: '200ms' }}>
                    <Box>
                      <VideoPlayer 
                        fileId={videoProcessing.file_id} 
                        videoTitle={videoProcessing.filename} 
                      />
                    </Box>
                  </Zoom>
                )}
                
                {videoProcessing.metadataExtraction.status === 'completed' && (
                  <Zoom in style={{ transitionDelay: '300ms' }}>
                    <Box sx={{ mt: 3 }}>
                      <MetadataDisplay fileId={videoProcessing.file_id} />
                    </Box>
                  </Zoom>
                )}
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </Box>
  );
}

export default App;
