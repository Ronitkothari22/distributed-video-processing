"""
Validation utilities for the video processing system.
"""
import os
import logging
import subprocess
from typing import Tuple, List

from ..config import SUPPORTED_VIDEO_FORMATS, MAX_FILE_SIZE_MB

logger = logging.getLogger('validators')

def check_ffprobe_availability() -> bool:
    """
    Check if ffprobe is available on the system
    
    Returns:
        bool: True if ffprobe is available, False otherwise
    """
    try:
        result = subprocess.run(
            ["ffprobe", "-version"], 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            logger.info(f"FFprobe available: {result.stdout.splitlines()[0]}")
            return True
        return False
    except (subprocess.SubprocessError, FileNotFoundError):
        logger.warning("FFprobe not found on system path")
        return False
    except Exception as e:
        logger.warning(f"Error checking ffprobe availability: {str(e)}")
        return False

def validate_video_file(file_path: str) -> Tuple[bool, str]:
    """
    Validate a video file for processing.
    
    Args:
        file_path (str): Path to the video file
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    # Check if file exists
    if not os.path.exists(file_path):
        return False, f"File not found at {file_path}"
    
    # Check file size
    try:
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        if file_size_mb > MAX_FILE_SIZE_MB:
            return False, f"File size ({file_size_mb:.2f} MB) exceeds maximum allowed size ({MAX_FILE_SIZE_MB} MB)"
    except Exception as e:
        logger.error(f"Error checking file size: {str(e)}")
        return False, f"Error checking file size: {str(e)}"
    
    # Check file extension
    _, extension = os.path.splitext(file_path)
    if extension.lower().lstrip('.') not in SUPPORTED_VIDEO_FORMATS:
        return False, f"Unsupported file format: {extension}. Supported formats: {', '.join(SUPPORTED_VIDEO_FORMATS)}"
    
    # Try to verify file integrity using ffprobe
    if check_ffprobe_availability():
        try:
            cmd = [
                "ffprobe",
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=codec_type",
                "-of", "default=noprint_wrappers=1:nokey=1",
                file_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            
            if result.returncode != 0:
                return False, f"FFprobe validation failed: {result.stderr.strip()}"
            
            if "video" not in result.stdout.strip():
                return False, f"File does not contain a valid video stream"
                
        except subprocess.TimeoutExpired:
            # Don't fail validation if ffprobe times out, just log a warning
            logger.warning(f"FFprobe validation timed out for {file_path}")
        except Exception as e:
            logger.warning(f"Error during ffprobe validation: {str(e)}")
    
    return True, ""

def get_supported_formats() -> List[str]:
    """
    Get list of supported video formats
    
    Returns:
        List[str]: List of supported format extensions (without the dot)
    """
    return SUPPORTED_VIDEO_FORMATS 