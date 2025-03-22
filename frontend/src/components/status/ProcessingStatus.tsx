import React from 'react';
import { 
  Paper, 
  Box, 
  Typography, 
  LinearProgress, 
  Chip, 
  Stack, 
  
  useTheme,
  alpha,
  Card,
  Avatar
} from '@mui/material';
import { 
   
  CheckCircleOutline, 
  ErrorOutline, 
  HourglassTop,
  AutoFixHigh,
  DataArray
} from '@mui/icons-material';
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
        bgcolor: alpha(color, 0.1),
        color: color,
        fontWeight: 600,
        textTransform: 'capitalize',
        borderRadius: 2,
        py: 0.5,
        '& .MuiChip-label': {
          px: 1.5
        }
      }} 
      icon={
        status === 'completed' ? 
          <CheckCircleOutline style={{ color }} /> : 
        status === 'failed' ? 
          <ErrorOutline style={{ color }} /> : 
          <HourglassTop style={{ color }} />
      }
    />
  );
};

const ProgressBar: React.FC<{ progress: number; status: ProcessStatus }> = ({ 
  progress, 
  status 
}) => {
  const theme = useTheme();
  const color = getStatusColor(status);
  
  return (
    <Box sx={{ mb: 1, width: '100%' }}>
      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ 
          height: 10, 
          borderRadius: 5,
          backgroundColor: alpha(color, 0.1),
          '& .MuiLinearProgress-bar': {
            backgroundColor: color,
            borderRadius: 5,
            backgroundImage: status === 'processing' ? 
              `linear-gradient(45deg, ${alpha(color, 0.8)} 25%, ${color} 25%, ${color} 50%, ${alpha(color, 0.8)} 50%, ${alpha(color, 0.8)} 75%, ${color} 75%, ${color} 100%)` : 
              'none',
            backgroundSize: '20px 20px',
            animation: status === 'processing' ? 'moveStripes 1s linear infinite' : 'none',
          },
          '@keyframes moveStripes': {
            '0%': {
              backgroundPosition: '0 0',
            },
            '100%': {
              backgroundPosition: '20px 0',
            },
          }
        }} 
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.8 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color }}>
          {progress}%
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
          {status === 'completed' ? 'Completed' : status === 'failed' ? 'Failed' : 'Processing...'}
        </Typography>
      </Box>
    </Box>
  );
};

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ processingState }) => {
  const theme = useTheme();
  const { 
    file_id, 
    filename, 
    uploadTime, 
    videoEnhancement, 
    metadataExtraction 
  } = processingState;

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        borderRadius: 4,
        overflow: 'hidden' 
      }}
    >
      <Box 
        sx={{ 
          p: 2, 
          backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}
      >
        <Typography variant="h6" component="h2" fontWeight={700}>
          Processing Status
        </Typography>
      </Box>

      <Box sx={{ p: 3 }}>
        <Box 
          sx={{ 
            mb: 3,
            p: 2,
            borderRadius: 3,
            backgroundColor: alpha(theme.palette.background.default, 0.4),
            border: `1px solid ${alpha(theme.palette.divider, 0.05)}`
          }}
        >
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 70 }}>File:</Typography>
            <Typography variant="body2" fontWeight="medium" noWrap sx={{ color: theme.palette.text.primary }}>{filename}</Typography>
          </Stack>
          
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 70 }}>ID:</Typography>
            <Typography 
              variant="body2" 
              fontFamily="monospace" 
              sx={{ 
                color: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                px: 1,
                py: 0.3,
                borderRadius: 1,
                fontSize: '0.8rem'
              }}
            >
              {file_id}
            </Typography>
          </Stack>
          
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 70 }}>Uploaded:</Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>{formatTimestamp(uploadTime)}</Typography>
          </Stack>
        </Box>
        
        <ProcessCard 
          title="Video Enhancement"
          icon={<AutoFixHigh />}
          status={videoEnhancement.status}
          progress={videoEnhancement.progress}
          lastUpdated={videoEnhancement.last_updated}
          error={videoEnhancement.error}
        />
        
        <ProcessCard 
          title="Metadata Extraction"
          icon={<DataArray />}
          status={metadataExtraction.status}
          progress={metadataExtraction.progress}
          lastUpdated={metadataExtraction.last_updated}
          error={metadataExtraction.error}
        />
      </Box>
    </Paper>
  );
};

interface ProcessCardProps {
  title: string;
  icon: React.ReactNode;
  status: ProcessStatus;
  progress: number;
  lastUpdated: string;
  error: string | null;
}

const ProcessCard: React.FC<ProcessCardProps> = ({
  title,
  icon,
  status,
  progress,
  lastUpdated,
  error
}) => {
  const theme = useTheme();
  const color = getStatusColor(status);
  
  return (
    <Card
      elevation={0}
      sx={{
        mb: 2.5,
        borderRadius: 3,
        p: 2,
        backgroundColor: alpha(theme.palette.background.default, 0.3),
        border: `1px solid ${alpha(color, status === 'completed' ? 0.3 : 0.1)}`,
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'visible',
        '&:last-child': {
          mb: 0
        },
        ...(status === 'completed' && {
          boxShadow: `0 0 0 1px ${alpha(color, 0.05)}, 0 2px 8px ${alpha(color, 0.1)}`
        })
      }}
    >
      {status === 'completed' && (
        <Box
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 2px 4px ${alpha(color, 0.3)}`
          }}
        >
          <CheckCircleOutline sx={{ fontSize: 16, color: '#fff' }} />
        </Box>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              backgroundColor: alpha(color, 0.1),
              color: color,
              mr: 2
            }}
          >
            {icon}
          </Avatar>
          
          <Typography variant="subtitle1" fontWeight={600} sx={{ color: theme.palette.text.primary }}>
            {title}
          </Typography>
        </Box>
        
        <StatusIndicator status={status} />
      </Box>
      
      <ProgressBar 
        progress={progress} 
        status={status} 
      />
      
      {error && (
        <Box 
          sx={{ 
            mt: 1.5, 
            p: 1.5, 
            borderRadius: 2, 
            backgroundColor: alpha(theme.palette.error.main, 0.1) 
          }}
        >
          <Typography variant="body2" color="error" sx={{ fontWeight: 500 }}>
            Error: {error}
          </Typography>
        </Box>
      )}
      
      <Typography 
        variant="caption" 
        sx={{ 
          display: 'block',
          mt: 1,
          color: alpha(theme.palette.text.secondary, 0.8),
          fontStyle: 'italic'
        }}
      >
        Last updated: {formatTimestamp(lastUpdated)}
      </Typography>
    </Card>
  );
};

export default ProcessingStatus; 