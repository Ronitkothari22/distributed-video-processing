import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  CssBaseline, 
  AppBar, 
  Toolbar, 
  Alert, 
  Snackbar,
  Grid,
  Paper,
  Button,
  Divider
} from '@mui/material';
import { 
  VideoSettings as VideoIcon, 
  CloudDone as CloudDoneIcon
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
    <>
      <CssBaseline />
      
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <VideoIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Distributed Video Processing
          </Typography>
          {wsConnected ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CloudDoneIcon sx={{ color: 'success.main', mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Connected
              </Typography>
            </Box>
          ) : (
            <Alert severity="warning" sx={{ py: 0 }}>Disconnected</Alert>
          )}
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Snackbar 
          open={notification.open} 
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
        
        {!videoProcessing ? (
          <VideoUpload onUploadSuccess={handleUploadSuccess} />
        ) : (
          <>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" component="h1">
                Processing: {videoProcessing.filename}
              </Typography>
              <Button variant="outlined" onClick={handleReset}>
                Process Another Video
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <ProcessingStatus processingState={videoProcessing} />
              </Grid>
              
              <Grid item xs={12} md={8}>
                {videoProcessing.videoEnhancement.status === 'completed' && (
                  <VideoPlayer 
                    fileId={videoProcessing.file_id} 
                    videoTitle={videoProcessing.filename} 
                  />
                )}
                
                {videoProcessing.metadataExtraction.status === 'completed' && (
                  <MetadataDisplay fileId={videoProcessing.file_id} />
                )}
                
                {videoProcessing.videoEnhancement.status !== 'completed' && 
                 videoProcessing.metadataExtraction.status !== 'completed' && (
                  <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      Your video is being processed. Results will appear here when ready.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Uploaded at {formatTimestamp(videoProcessing.uploadTime)}
                    </Typography>
                  </Paper>
                )}
              </Grid>
            </Grid>
          </>
        )}
        
        <Divider sx={{ my: 4 }} />
        
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Distributed Video Processing Pipeline
          </Typography>
        </Box>
      </Container>
    </>
  );
}

export default App;
