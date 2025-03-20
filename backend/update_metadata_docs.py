#!/usr/bin/env python3
"""
Script to update the API_DOCUMENTATION.md with a sample metadata file.
This script extracts a real metadata file from the system (if available)
or creates a sample one, and then updates the documentation.
"""

import os
import json
import glob

def create_sample_metadata():
    """Create a sample metadata file structure"""
    return {
        "file_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "filename": "sample_video.mp4",
        "format": "mp4",
        "resolution": {
            "width": 1920,
            "height": 1080
        },
        "fps": 30.0,
        "frame_count": 3600,
        "duration_seconds": 120,
        "file_size_bytes": 15728640,
        "bit_rate": "1024000",
        "color_profile": {
            "histograms": {
                "b": [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1] + [0.0] * 246,
                "g": [0.01, 0.03, 0.05, 0.07, 0.09, 0.11, 0.13, 0.15, 0.17, 0.19] + [0.0] * 246,
                "r": [0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.2] + [0.0] * 246
            },
            "average_color": {
                "b": 120,
                "g": 130,
                "r": 140
            }
        },
        "advanced": {
            "format": {
                "filename": "sample_video.mp4",
                "nb_streams": 2,
                "nb_programs": 0,
                "format_name": "mov,mp4,m4a,3gp,3g2,mj2",
                "format_long_name": "QuickTime / MOV",
                "start_time": "0.000000",
                "duration": "120.000000",
                "size": "15728640",
                "bit_rate": "1024000",
                "probe_score": 100,
                "tags": {
                    "major_brand": "isom",
                    "minor_version": "512",
                    "compatible_brands": "isomiso2avc1mp41",
                    "encoder": "Lavf58.29.100"
                }
            },
            "streams": [
                {
                    "index": 0,
                    "codec_name": "h264",
                    "codec_long_name": "H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10",
                    "profile": "High",
                    "codec_type": "video",
                    "codec_time_base": "1/60",
                    "codec_tag_string": "avc1",
                    "codec_tag": "0x31637661",
                    "width": 1920,
                    "height": 1080,
                    "coded_width": 1920,
                    "coded_height": 1080,
                    "has_b_frames": 2,
                    "sample_aspect_ratio": "1:1",
                    "display_aspect_ratio": "16:9",
                    "pix_fmt": "yuv420p",
                    "level": 40,
                    "chroma_location": "left",
                    "refs": 1,
                    "is_avc": "true",
                    "nal_length_size": "4",
                    "r_frame_rate": "30/1",
                    "avg_frame_rate": "30/1",
                    "time_base": "1/15360",
                    "start_pts": 0,
                    "start_time": "0.000000",
                    "duration_ts": 1843200,
                    "duration": "120.000000",
                    "bit_rate": "960000",
                    "bits_per_raw_sample": "8",
                    "nb_frames": "3600",
                    "disposition": {
                        "default": 1,
                        "dub": 0,
                        "original": 0,
                        "comment": 0,
                        "lyrics": 0,
                        "karaoke": 0,
                        "forced": 0,
                        "hearing_impaired": 0,
                        "visual_impaired": 0,
                        "clean_effects": 0,
                        "attached_pic": 0,
                        "timed_thumbnails": 0
                    },
                    "tags": {
                        "language": "eng",
                        "handler_name": "VideoHandler"
                    }
                },
                {
                    "index": 1,
                    "codec_name": "aac",
                    "codec_long_name": "AAC (Advanced Audio Coding)",
                    "profile": "LC",
                    "codec_type": "audio",
                    "codec_time_base": "1/44100",
                    "codec_tag_string": "mp4a",
                    "codec_tag": "0x6134706d",
                    "sample_fmt": "fltp",
                    "sample_rate": "44100",
                    "channels": 2,
                    "channel_layout": "stereo",
                    "bits_per_sample": 0,
                    "r_frame_rate": "0/0",
                    "avg_frame_rate": "0/0",
                    "time_base": "1/44100",
                    "start_pts": 0,
                    "start_time": "0.000000",
                    "duration_ts": 5292000,
                    "duration": "120.000000",
                    "bit_rate": "64000",
                    "max_bit_rate": "64000",
                    "nb_frames": "5168",
                    "disposition": {
                        "default": 1,
                        "dub": 0,
                        "original": 0,
                        "comment": 0,
                        "lyrics": 0,
                        "karaoke": 0,
                        "forced": 0,
                        "hearing_impaired": 0,
                        "visual_impaired": 0,
                        "clean_effects": 0,
                        "attached_pic": 0,
                        "timed_thumbnails": 0
                    },
                    "tags": {
                        "language": "eng",
                        "handler_name": "SoundHandler"
                    }
                }
            ]
        }
    }

def get_real_metadata():
    """Try to find a real metadata file in the system"""
    metadata_files = glob.glob("processed_videos/metadata/*_metadata.json")
    if metadata_files:
        # Use the most recent metadata file
        latest_file = max(metadata_files, key=os.path.getmtime)
        try:
            with open(latest_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading metadata file: {e}")
    return None

def update_documentation():
    """Update the API_DOCUMENTATION.md with real or sample metadata"""
    # Try to get a real metadata file first
    metadata = get_real_metadata()
    
    # If no real metadata found, use the sample
    if not metadata:
        metadata = create_sample_metadata()
    
    # Pretty print the metadata
    metadata_json = json.dumps(metadata, indent=2)
    
    # Read the existing documentation
    try:
        with open("API_DOCUMENTATION.md", 'r') as f:
            content = f.read()
        
        # Find the metadata section
        start_marker = "```json\n"
        end_marker = "```\n\n## Error Handling"
        
        start_pos = content.find(start_marker, content.find("## Metadata Format"))
        if start_pos == -1:
            print("Could not find metadata section in documentation")
            return
        
        start_pos += len(start_marker)
        end_pos = content.find(end_marker, start_pos)
        if end_pos == -1:
            print("Could not find end of metadata section in documentation")
            return
        
        # Replace the metadata section
        new_content = content[:start_pos] + metadata_json + "\n" + content[end_pos:]
        
        # Write the updated documentation
        with open("API_DOCUMENTATION.md", 'w') as f:
            f.write(new_content)
        
        print("Documentation updated with metadata example")
        
    except Exception as e:
        print(f"Error updating documentation: {e}")

if __name__ == "__main__":
    update_documentation() 