import React, { useRef, useEffect, useState } from 'react';
import { 
  Paper, 
  Box, 
  Typography, 
  IconButton,
  Button,
  Tooltip
} from '@mui/material';
import { 
  PlayArrow, 
  Pause, 
  VolumeUp, 
  VolumeOff,
  FullscreenRounded,
  FileDownloadOutlined
} from '@mui/icons-material';
import apiService from '../../services/ApiService';

interface VideoPlayerProps {
  fileId: string;
  videoTitle: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ fileId, videoTitle }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoUrl = apiService.getProcessedVideoUrl(fileId);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    const video = videoRef.current;
    console.log(`VideoPlayer: Attempting to load video from URL: ${videoUrl}`);
    
    if (video) {
      const handleCanPlay = () => {
        console.log(`VideoPlayer: Video can now play: ${videoUrl}`);
        setLoading(false);
      };

      const handleError = (e: Event) => {
        const videoElement = e.target as HTMLVideoElement;
        const errorCode = videoElement.error ? videoElement.error.code : 'unknown';
        const errorMessage = videoElement.error ? videoElement.error.message : 'unknown error';
        
        console.error(`VideoPlayer: Error loading video (code ${errorCode}): ${errorMessage}`);
        console.error(`VideoPlayer: Video URL that failed to load: ${videoUrl}`);
        
        setLoading(false);
        
        // Try to reload the video a few times before giving up
        if (retryCount < maxRetries) {
          setError(`Error loading video. Retrying... (${retryCount + 1}/${maxRetries})`);
          
          // Retry after a delay
          const retryDelay = 2000 * (retryCount + 1); // Increase delay with each retry
          console.log(`VideoPlayer: Will retry in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          
          setTimeout(() => {
            console.log(`VideoPlayer: Retrying video load (attempt ${retryCount + 1}/${maxRetries})`);
            setRetryCount(prev => prev + 1);
            
            // Force video element to try again
            if (videoRef.current) {
              videoRef.current.load();
              setLoading(true);
            }
          }, retryDelay);
        } else {
          setError(`Error loading video. The processing may not be complete yet. (Error: ${errorMessage})`);
          
          // Try to manually fetch the video to check server response
          fetch(videoUrl)
            .then(response => {
              console.log(`VideoPlayer: Fetch response for ${videoUrl}:`, {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
              });
              
              if (!response.ok) {
                setError(`Error loading video: Server returned ${response.status} ${response.statusText}`);
              }
            })
            .catch(fetchError => {
              console.error(`VideoPlayer: Fetch error for ${videoUrl}:`, fetchError);
              setError(`Error loading video: ${fetchError.message}`);
            });
        }
      };
      
      const handleLoadStart = () => {
        console.log(`VideoPlayer: Started loading video: ${videoUrl}`);
      };
      
      const handleProgress = () => {
        console.log(`VideoPlayer: Loading progress for ${videoUrl}`);
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('progress', handleProgress);

      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('progress', handleProgress);
      };
    }
  }, [fileId, videoUrl, retryCount, maxRetries]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (video) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      }
    }
  };

  const handleDownload = () => {
    // Create an anchor element and trigger download
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `enhanced_${videoTitle}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Enhanced Video
      </Typography>
      
      <Box sx={{ position: 'relative', width: '100%', mb: 2 }}>
        {loading && (
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              zIndex: 1
            }}
          >
            <Typography>Loading video...</Typography>
          </Box>
        )}
        
        {error && (
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              zIndex: 1,
              p: 2
            }}
          >
            <Typography align="center">{error}</Typography>
          </Box>
        )}
        
        <video 
          ref={videoRef}
          style={{ 
            width: '100%', 
            height: 'auto', 
            maxHeight: '450px',
            backgroundColor: '#000'
          }}
          controls={false}
          src={videoUrl}
          crossOrigin="anonymous"
          preload="auto"
          playsInline
        >
          {/* Multiple sources with different formats for better compatibility */}
          <source src={videoUrl} type="video/mp4; codecs=avc1.42E01E, mp4a.40.2" />
          <source src={videoUrl} type="video/mp4; codecs=h264" />
          <source src={videoUrl} type="video/mp4" />
          <source src={videoUrl} type="video/webm" />
          <p>Your browser doesn't support HTML5 video playback.</p>
        </video>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Tooltip title={isPlaying ? "Pause" : "Play"}>
            <IconButton onClick={togglePlay} color="primary">
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title={isMuted ? "Unmute" : "Mute"}>
            <IconButton onClick={toggleMute} color="primary">
              {isMuted ? <VolumeOff /> : <VolumeUp />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Fullscreen">
            <IconButton onClick={handleFullscreen} color="primary">
              <FullscreenRounded />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<FileDownloadOutlined />}
          onClick={handleDownload}
        >
          Download
        </Button>
      </Box>
      
      <Typography variant="body2" color="text.secondary">
        {videoTitle} (Enhanced)
      </Typography>
    </Paper>
  );
};

export default VideoPlayer; 