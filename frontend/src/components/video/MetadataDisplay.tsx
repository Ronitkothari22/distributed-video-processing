import React, { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Divider,
  Chip,
  CircularProgress,
  Button,
  useTheme,
  alpha,
  Zoom,
  Avatar
} from '@mui/material';
import { 
  ExpandMore, 
  FileDownloadOutlined, 
  Info, 
  DataObject, 
  Videocam, 
  ColorLens, 
  Speed, 
  Timer, 
  HighQuality 
} from '@mui/icons-material';
import { VideoMetadata } from '../../types';
import { formatBytes, formatDuration } from '../../utils/helpers';
import axios from 'axios';
import apiService from '../../services/ApiService';

interface MetadataDisplayProps {
  fileId: string;
}

const MetadataDisplay: React.FC<MetadataDisplayProps> = ({ fileId }) => {
  const theme = useTheme();
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const metadataUrl = apiService.getMetadataUrl(fileId);
  const [expanded, setExpanded] = useState<string | false>('panel1');

  const handleChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get<VideoMetadata>(metadataUrl);
        setMetadata(response.data);
      } catch (err) {
        console.error('Error fetching metadata:', err);
        setError('Failed to load metadata. The extraction may not be complete yet.');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [fileId, metadataUrl]);

  const handleDownloadMetadata = () => {
    if (!metadata) return;

    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `metadata_${metadata.filename}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
      <Box 
        sx={{ 
          p: 2, 
          backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)}, ${alpha(theme.palette.primary.main, 0.05)})`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            sx={{
              backgroundColor: alpha(theme.palette.secondary.main, 0.1),
              color: theme.palette.secondary.main,
              width: 32,
              height: 32,
              mr: 1.5
            }}
          >
            <DataObject fontSize="small" />
          </Avatar>
          <Typography variant="h6" component="h2" fontWeight={700}>
            Video Metadata
          </Typography>
        </Box>
        
        {metadata && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadOutlined />}
            onClick={handleDownloadMetadata}
            sx={{
              borderRadius: 3,
              fontWeight: 600
            }}
          >
            Download JSON
          </Button>
        )}
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 6 }}>
          <CircularProgress size={50} sx={{ mb: 2 }} />
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            Loading metadata...
          </Typography>
        </Box>
      ) : error ? (
        <Box 
          sx={{ 
            p: 4, 
            textAlign: 'center', 
            bgcolor: alpha(theme.palette.error.main, 0.05),
            borderRadius: 2,
            m: 2
          }}
        >
          <Info sx={{ color: theme.palette.error.main, fontSize: 40, mb: 1 }} />
          <Typography color="error" variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            Unable to Load Metadata
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {error}
          </Typography>
          <Button 
            variant="outlined" 
            color="primary"
            onClick={() => {
              setLoading(true);
              setError(null);
              setTimeout(() => {
                // Re-fetch metadata
                const fetchMetadata = async () => {
                  try {
                    const response = await axios.get<VideoMetadata>(metadataUrl);
                    setMetadata(response.data);
                    setLoading(false);
                  } catch (err) {
                    console.error('Error refetching metadata:', err);
                    setError('Failed to load metadata. The extraction may not be complete yet.');
                    setLoading(false);
                  }
                };
                fetchMetadata();
              }, 1000);
            }}
          >
            Try Again
          </Button>
        </Box>
      ) : metadata ? (
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <MetadataCard
              icon={<Videocam />}
              title="File Info"
              items={[
                { label: 'Filename', value: metadata.filename },
                { label: 'Format', value: metadata.format },
                { label: 'File Size', value: formatBytes(metadata.file_size_bytes) }
              ]}
              color={theme.palette.primary.main}
            />
            
            <MetadataCard
              icon={<HighQuality />}
              title="Resolution"
              items={[
                { label: 'Width', value: `${metadata.resolution.width}px` },
                { label: 'Height', value: `${metadata.resolution.height}px` },
                { label: 'Aspect Ratio', value: `${(metadata.resolution.width / metadata.resolution.height).toFixed(2)}:1` }
              ]}
              color={theme.palette.secondary.main}
            />
            
            <MetadataCard
              icon={<Timer />}
              title="Duration"
              items={[
                { label: 'Total Time', value: formatDuration(metadata.duration_seconds) },
                { label: 'Total Frames', value: metadata.frame_count.toLocaleString() }
              ]}
              color={theme.palette.success.main}
            />
            
            <MetadataCard
              icon={<Speed />}
              title="Playback Info"
              items={[
                { label: 'FPS', value: metadata.fps.toFixed(2) },
                { label: 'Bit Rate', value: metadata.bit_rate }
              ]}
              color={theme.palette.warning.main}
            />
          </Grid>
          
          <Box sx={{ mb: 3 }}>
            <Accordion 
              expanded={expanded === 'panel1'} 
              onChange={handleChange('panel1')}
              elevation={0}
              sx={{
                borderRadius: 3,
                mb: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.03),
                '&:before': { display: 'none' }
              }}
            >
              <AccordionSummary 
                expandIcon={<ExpandMore />}
                sx={{ 
                  borderRadius: expanded === 'panel1' ? '12px 12px 0 0' : 3,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.05)
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar
                    sx={{
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      width: 28,
                      height: 28,
                      mr: 1.5
                    }}
                  >
                    <ColorLens fontSize="small" />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight={600}>Color Profile</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Average Color
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box 
                    sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 2, 
                      mr: 2,
                      bgcolor: `rgb(${metadata.color_profile.average_color.r}, ${metadata.color_profile.average_color.g}, ${metadata.color_profile.average_color.b})`,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }} 
                  />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      RGB({metadata.color_profile.average_color.r}, {metadata.color_profile.average_color.g}, {metadata.color_profile.average_color.b})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Hex: #{metadata.color_profile.average_color.r.toString(16).padStart(2, '0')}
                      {metadata.color_profile.average_color.g.toString(16).padStart(2, '0')}
                      {metadata.color_profile.average_color.b.toString(16).padStart(2, '0')}
                    </Typography>
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Color Channels
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label="Red Channel"
                    sx={{ 
                      bgcolor: alpha('#f44336', 0.1), 
                      color: '#f44336',
                      fontWeight: 600
                    }}
                  />
                  <Chip 
                    label="Green Channel"
                    sx={{ 
                      bgcolor: alpha('#4caf50', 0.1), 
                      color: '#4caf50',
                      fontWeight: 600
                    }}
                  />
                  <Chip 
                    label="Blue Channel"
                    sx={{ 
                      bgcolor: alpha('#2196f3', 0.1), 
                      color: '#2196f3',
                      fontWeight: 600
                    }}
                  />
                </Box>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', fontStyle: 'italic' }}>
                  Full histogram data available in the JSON download
                </Typography>
              </AccordionDetails>
            </Accordion>
            
            {metadata.advanced && (
              <Accordion 
                expanded={expanded === 'panel2'} 
                onChange={handleChange('panel2')}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  backgroundColor: alpha(theme.palette.secondary.main, 0.03),
                  '&:before': { display: 'none' }
                }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMore />}
                  sx={{ 
                    borderRadius: expanded === 'panel2' ? '12px 12px 0 0' : 3,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.secondary.main, 0.05)
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                        color: theme.palette.secondary.main,
                        width: 28,
                        height: 28,
                        mr: 1.5
                      }}
                    >
                      <Info fontSize="small" />
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight={600}>Advanced Information</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 3, pb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Detailed technical information is available in the JSON download.
                  </Typography>
                  
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<FileDownloadOutlined />}
                    onClick={handleDownloadMetadata}
                  >
                    Download JSON Data
                  </Button>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        </Box>
      ) : null}
    </Paper>
  );
};

interface MetadataCardProps {
  icon: React.ReactNode;
  title: string;
  items: { label: string; value: string | number }[];
  color: string;
}

const MetadataCard: React.FC<MetadataCardProps> = ({ icon, title, items, color }) => {
  const theme = useTheme();
  
  return (
    <Grid item xs={12} sm={6} md={3}>
      <Zoom in style={{ transitionDelay: '100ms' }}>
        <Box 
          sx={{ 
            p: 2, 
            borderRadius: 3, 
            backgroundColor: alpha(theme.palette.background.paper, 0.4),
            border: `1px solid ${alpha(color, 0.1)}`,
            height: '100%'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              sx={{
                backgroundColor: alpha(color, 0.1),
                color: color,
                width: 36,
                height: 36,
                mr: 1
              }}
            >
              {icon}
            </Avatar>
            <Typography variant="subtitle1" fontWeight={600}>
              {title}
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <Box sx={{ pl: 1 }}>
            {items.map((item, index) => (
              <Box key={index} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {item.label}
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Zoom>
    </Grid>
  );
};

export default MetadataDisplay; 