import React, { useRef, useEffect, useState } from 'react';
import { 
  Paper, 
  Box, 
  Typography, 
  IconButton,
  Button,
  Tooltip,
  useTheme,
  alpha,
  Slider,
  CircularProgress,
  Stack
} from '@mui/material';
import { 
  PlayArrow, 
  Pause, 
  VolumeUp, 
  VolumeOff,
  FullscreenRounded,
  FileDownloadOutlined,

  Replay10,
  Forward10,
 
  Speed,

  PictureInPictureAlt
} from '@mui/icons-material';
import apiService from '../../services/ApiService';

interface VideoPlayerProps {
  fileId: string;
  videoTitle: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ fileId, videoTitle }) => {
  const theme = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
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
        setDuration(video.duration);
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
      
      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
      };
      
      const handleVolumeChange = () => {
        setVolume(video.volume);
        setIsMuted(video.muted);
      };
      
      const handlePlayPause = () => {
        setIsPlaying(!video.paused);
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('progress', handleProgress);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('volumechange', handleVolumeChange);
      video.addEventListener('play', handlePlayPause);
      video.addEventListener('pause', handlePlayPause);
      video.addEventListener('ended', handleEnded);

      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('progress', handleProgress);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('volumechange', handleVolumeChange);
        video.removeEventListener('play', handlePlayPause);
        video.removeEventListener('pause', handlePlayPause);
        video.removeEventListener('ended', handleEnded);
      };
    }
  }, [fileId, videoUrl, retryCount, maxRetries]);
  
  // Handle full screen change
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(document.fullscreenElement !== null);
    };
    
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

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

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    const video = videoRef.current;
    if (video) {
      const newVolume = newValue as number;
      video.volume = newVolume / 100;
      setVolume(newVolume / 100);
      
      if (newVolume === 0) {
        video.muted = true;
        setIsMuted(true);
      } else if (isMuted) {
        video.muted = false;
        setIsMuted(false);
      }
    }
  };

  const handleFullscreen = () => {
    const container = containerRef.current;
    if (container) {
      if (!isFullScreen) {
        if (container.requestFullscreen) {
          container.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }
  };

  const handlePictureInPicture = () => {
    const video = videoRef.current;
    if (video) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        video.requestPictureInPicture();
      }
    }
  };

  const handleTimeChange = (_event: Event, newValue: number | number[]) => {
    const video = videoRef.current;
    if (video) {
      const newTime = newValue as number;
      video.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };
  
  const skipForward = (seconds: number = 10) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.min(video.duration, video.currentTime + seconds);
    }
  };
  
  const skipBackward = (seconds: number = 10) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, video.currentTime - seconds);
    }
  };
  
  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = rate;
      setPlaybackRate(rate);
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
  
  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
      <Box 
        sx={{ 
          p: 2, 
          backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}
      >
        <Typography variant="h6" component="h2" fontWeight={700}>
          Enhanced Video
        </Typography>
      </Box>
      
      <Box 
        ref={containerRef}
        sx={{ 
          position: 'relative', 
          width: '100%',
          backgroundColor: '#000',
          borderRadius: isFullScreen ? 0 : 2,
          overflow: 'hidden'
        }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {loading && (
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              zIndex: 1
            }}
          >
            <CircularProgress 
              size={60} 
              color="primary" 
              sx={{ mb: 2 }} 
            />
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Loading video...
            </Typography>
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
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              color: 'white',
              zIndex: 1,
              p: 4
            }}
          >
            <Box sx={{ textAlign: 'center', maxWidth: 500 }}>
              <Typography variant="h6" sx={{ mb: 2, color: theme.palette.error.main }}>
                Unable to Play Video
              </Typography>
              <Typography align="center">{error}</Typography>
              
              <Button 
                variant="outlined" 
                color="primary" 
                sx={{ mt: 3 }}
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  setRetryCount(0);
                  if (videoRef.current) {
                    videoRef.current.load();
                  }
                }}
              >
                Try Again
              </Button>
            </Box>
          </Box>
        )}
        
        <Box
          onClick={togglePlay}
          sx={{ 
            cursor: 'pointer',
            position: 'relative',
            width: '100%',
            pt: '56.25%', // 16:9 aspect ratio
          }}
        >
          <video 
            ref={videoRef}
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain'
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
        
        {/* Custom Video Controls */}
        <Box 
          sx={{ 
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            padding: '30px 16px 8px',
            transition: 'opacity 0.3s ease',
            opacity: showControls || !isPlaying ? 1 : 0,
            zIndex: 10
          }}
        >
          {/* Progress Bar */}
          <Slider
            value={currentTime}
            max={duration || 100}
            onChange={handleTimeChange}
            aria-label="Video Progress"
            sx={{
              height: 4,
              mb: 1,
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
                transition: '0.3s',
                '&:before': {
                  boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)'
                },
                '&:hover, &.Mui-focusVisible': {
                  boxShadow: `0px 0px 0px 8px ${alpha(theme.palette.primary.main, 0.16)}`
                },
                '&.Mui-active': {
                  width: 16,
                  height: 16
                }
              },
              '& .MuiSlider-rail': {
                opacity: 0.3,
                backgroundColor: '#bfbfbf'
              }
            }}
          />
          
          {/* Bottom Controls */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <IconButton 
                onClick={() => skipBackward(10)} 
                color="inherit" 
                size="small"
                sx={{ color: 'white' }}
              >
                <Replay10 />
              </IconButton>
              
              <IconButton 
                onClick={togglePlay} 
                color="inherit"
                sx={{ color: 'white' }}
              >
                {isPlaying ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
              </IconButton>
              
              <IconButton 
                onClick={() => skipForward(10)} 
                color="inherit" 
                size="small"
                sx={{ color: 'white' }}
              >
                <Forward10 />
              </IconButton>
              
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1, width: 120 }}>
                <IconButton 
                  onClick={toggleMute} 
                  color="inherit" 
                  size="small"
                  sx={{ color: 'white' }}
                >
                  {isMuted || volume === 0 ? <VolumeOff /> : <VolumeUp />}
                </IconButton>
                
                <Slider
                  value={isMuted ? 0 : volume * 100}
                  onChange={handleVolumeChange}
                  aria-label="Volume"
                  size="small"
                  sx={{
                    width: 70,
                    color: 'white',
                    '& .MuiSlider-track': {
                      border: 'none'
                    },
                    '& .MuiSlider-thumb': {
                      width: 10,
                      height: 10,
                      backgroundColor: '#fff',
                      '&:before': {
                        boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)'
                      },
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: '0px 0px 0px 8px rgba(255,255,255,0.16)'
                      },
                      '&.Mui-active': {
                        width: 12,
                        height: 12
                      }
                    },
                    '& .MuiSlider-rail': {
                      opacity: 0.3,
                      backgroundColor: '#bfbfbf'
                    }
                  }}
                />
              </Box>
              
              <Typography variant="caption" sx={{ color: 'white', ml: 1 }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Typography>
            </Stack>
            
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Tooltip title={`Speed: ${playbackRate}x`}>
                <IconButton 
                  onClick={() => {
                    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
                    const currentIndex = rates.indexOf(playbackRate);
                    const nextIndex = (currentIndex + 1) % rates.length;
                    changePlaybackRate(rates[nextIndex]);
                  }} 
                  color="inherit" 
                  size="small"
                  sx={{ color: 'white' }}
                >
                  <Speed />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Picture-in-Picture">
                <IconButton 
                  onClick={handlePictureInPicture} 
                  color="inherit" 
                  size="small"
                  sx={{ color: 'white' }}
                >
                  <PictureInPictureAlt />
                </IconButton>
              </Tooltip>
              
              <Tooltip title={isFullScreen ? "Exit Full Screen" : "Full Screen"}>
                <IconButton 
                  onClick={handleFullscreen} 
                  color="inherit" 
                  size="small"
                  sx={{ color: 'white' }}
                >
                  <FullscreenRounded />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>
        
        {/* Play/Pause Overlay Button - only visible when video is loaded and not playing */}
        {!loading && !error && !isPlaying && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.primary.main, 0.7),
              width: 80,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 5,
              '&:hover': {
                bgcolor: theme.palette.primary.main,
                transform: 'translate(-50%, -50%) scale(1.05)'
              },
              transition: 'all 0.2s ease'
            }}
            onClick={togglePlay}
          >
            <PlayArrow sx={{ fontSize: 50, color: 'white' }} />
          </Box>
        )}
      </Box>
      
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body1" fontWeight={600}>
          {videoTitle}
        </Typography>
        
        <Button
          variant="outlined"
          size="small"
          startIcon={<FileDownloadOutlined />}
          onClick={handleDownload}
          sx={{ 
            borderRadius: 3,
            fontWeight: 600
          }}
        >
          Download Video
        </Button>
      </Box>
    </Paper>
  );
};

export default VideoPlayer; 