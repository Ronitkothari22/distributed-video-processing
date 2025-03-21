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
  Button
} from '@mui/material';
import { ExpandMore, FileDownloadOutlined } from '@mui/icons-material';
import { VideoMetadata } from '../../types';
import { formatBytes, formatDuration } from '../../utils/helpers';
import axios from 'axios';
import apiService from '../../services/ApiService';

interface MetadataDisplayProps {
  fileId: string;
}

const MetadataDisplay: React.FC<MetadataDisplayProps> = ({ fileId }) => {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const metadataUrl = apiService.getMetadataUrl(fileId);

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
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Video Metadata
        </Typography>
        
        {metadata && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadOutlined />}
            onClick={handleDownloadMetadata}
          >
            Download JSON
          </Button>
        )}
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" sx={{ p: 2 }}>
          {error}
        </Typography>
      ) : metadata ? (
        <Box>
          {/* Basic Information */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Filename</Typography>
              <Typography variant="body1">{metadata.filename}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Format</Typography>
              <Typography variant="body1">{metadata.format}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Resolution</Typography>
              <Typography variant="body1">
                {metadata.resolution.width} × {metadata.resolution.height}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Duration</Typography>
              <Typography variant="body1">
                {formatDuration(metadata.duration_seconds)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">File Size</Typography>
              <Typography variant="body1">{formatBytes(metadata.file_size_bytes)}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">FPS</Typography>
              <Typography variant="body1">{metadata.fps.toFixed(2)}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Bit Rate</Typography>
              <Typography variant="body1">{metadata.bit_rate}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Total Frames</Typography>
              <Typography variant="body1">{metadata.frame_count.toLocaleString()}</Typography>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />

          {/* Color Profile */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1">Color Profile</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Average Color
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box 
                  sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 1, 
                    mr: 2,
                    bgcolor: `rgb(${metadata.color_profile.average_color.r}, ${metadata.color_profile.average_color.g}, ${metadata.color_profile.average_color.b})`
                  }} 
                />
                <Typography>
                  RGB({metadata.color_profile.average_color.r}, {metadata.color_profile.average_color.g}, {metadata.color_profile.average_color.b})
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Color Histograms
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label="Red Channel"
                  sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)', color: 'error.main' }}
                />
                <Chip 
                  label="Green Channel"
                  sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', color: 'success.main' }}
                />
                <Chip 
                  label="Blue Channel"
                  sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', color: 'primary.main' }}
                />
              </Box>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Full histogram data available in the JSON download
              </Typography>
            </AccordionDetails>
          </Accordion>
          
          {/* Advanced Information */}
          {metadata.advanced && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1">Advanced Information</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="caption" color="text.secondary">
                  Detailed technical information is available in the JSON download
                </Typography>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      ) : null}
    </Paper>
  );
};

export default MetadataDisplay; 