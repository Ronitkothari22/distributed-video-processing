import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Modern Gen Z color palette
const primaryColor = '#5865F2'; // Vibrant blue
const secondaryColor = '#8E44AD'; // Purple
const successColor = '#00DBBA'; // Teal
const errorColor = '#FE5E54'; // Coral red
const warningColor = '#FFB830'; // Golden orange
const infoColor = '#3ABFF8'; // Light blue
const backgroundColor = '#0E0E10'; // Dark background
const paperColor = '#1F1F23'; // Slightly lighter dark
const textPrimary = '#FFFFFF'; // White text
const textSecondary = '#ADADB8'; // Light gray text

// Define your theme
let theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: primaryColor,
      contrastText: '#ffffff',
    },
    secondary: {
      main: secondaryColor,
      contrastText: '#ffffff',
    },
    success: {
      main: successColor,
      contrastText: '#121212',
    },
    error: {
      main: errorColor,
      contrastText: '#ffffff',
    },
    warning: {
      main: warningColor,
      contrastText: '#121212',
    },
    info: {
      main: infoColor,
      contrastText: '#121212',
    },
    background: {
      default: backgroundColor,
      paper: paperColor,
    },
    text: {
      primary: textPrimary,
      secondary: textSecondary,
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    subtitle2: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 8px 20px rgba(88, 101, 242, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.05)',
        },
        elevation1: {
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        },
        elevation2: {
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        },
        elevation3: {
          boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 10,
          borderRadius: 5,
          backgroundColor: 'rgba(255,255,255,0.1)',
        },
        bar: {
          borderRadius: 5,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          height: 32,
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          overflow: 'hidden',
          '&:before': {
            display: 'none',
          },
          '&$expanded': {
            margin: 0,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.05)',
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255,255,255,0.05)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        standardSuccess: {
          backgroundColor: 'rgba(0, 219, 186, 0.1)',
          color: successColor,
        },
        standardError: {
          backgroundColor: 'rgba(254, 94, 84, 0.1)',
          color: errorColor,
        },
        standardWarning: {
          backgroundColor: 'rgba(255, 184, 48, 0.1)',
          color: warningColor,
        },
        standardInfo: {
          backgroundColor: 'rgba(58, 191, 248, 0.1)',
          color: infoColor,
        },
      },
    },
  },
});

// Make the theme responsive
theme = responsiveFontSizes(theme);

export default theme; 