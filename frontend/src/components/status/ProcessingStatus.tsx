import React from 'react';
import { 
  Paper, 
  Box, 
  Typography, 
  LinearProgress, 
  Chip, 
  Stack, 
  Divider 
} from '@mui/material';
import { VideoProcessingState, ProcessStatus } from '../../types';
import { formatTimestamp, getStatusColor } from '../../utils/helpers';

interface ProcessingStatusProps {
  processingState: VideoProcessingState;
}

const StatusIndicator: React.FC<{ status: ProcessStatus; label?: string }> = ({ 
  status, 
  label 
}) => {
  const color = getStatusColor(status);
  
  return (
    <Chip 
      label={label || status} 
      sx={{ 
        bgcolor: color,
        color: 'white',
        fontWeight: 500,
        textTransform: 'capitalize'
      }} 
    />
  );
};

const ProgressBar: React.FC<{ progress: number; status: ProcessStatus }> = ({ 
  progress, 
  status 
}) => {
  const color = getStatusColor(status);
  
  return (
    <Box sx={{ mb: 1, width: '100%' }}>
      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ 
          height: 8, 
          borderRadius: 4,
          '& .MuiLinearProgress-bar': {
            backgroundColor: color
          }
        }} 
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {progress}%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {status === 'completed' ? 'Completed' : status === 'failed' ? 'Failed' : 'Processing...'}
        </Typography>
      </Box>
    </Box>
  );
};

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ processingState }) => {
  const { 
    file_id, 
    filename, 
    uploadTime, 
    videoEnhancement, 
    metadataExtraction 
  } = processingState;

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Processing Status
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">File:</Typography>
          <Typography variant="body2" fontWeight="medium" noWrap>{filename}</Typography>
        </Stack>
        
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">ID:</Typography>
          <Typography variant="body2" fontFamily="monospace">{file_id}</Typography>
        </Stack>
        
        <Stack direction="row" spacing={1}>
          <Typography variant="body2" color="text.secondary">Uploaded:</Typography>
          <Typography variant="body2">{formatTimestamp(uploadTime)}</Typography>
        </Stack>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1">Video Enhancement</Typography>
          <StatusIndicator status={videoEnhancement.status} />
        </Box>
        
        <ProgressBar 
          progress={videoEnhancement.progress} 
          status={videoEnhancement.status} 
        />
        
        {videoEnhancement.error && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Error: {videoEnhancement.error}
          </Typography>
        )}
        
        <Typography variant="caption" color="text.secondary">
          Last updated: {formatTimestamp(videoEnhancement.last_updated)}
        </Typography>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1">Metadata Extraction</Typography>
          <StatusIndicator status={metadataExtraction.status} />
        </Box>
        
        <ProgressBar 
          progress={metadataExtraction.progress} 
          status={metadataExtraction.status} 
        />
        
        {metadataExtraction.error && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Error: {metadataExtraction.error}
          </Typography>
        )}
        
        <Typography variant="caption" color="text.secondary">
          Last updated: {formatTimestamp(metadataExtraction.last_updated)}
        </Typography>
      </Box>
    </Paper>
  );
};

export default ProcessingStatus; 