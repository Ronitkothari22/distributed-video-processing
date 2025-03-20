from typing import Dict, Any, Optional
import json
import os
import time
import logging
import fcntl
from datetime import datetime

from ..config import PROCESSING_STATES_FILE

logger = logging.getLogger(__name__)

class ProcessingState:
    def __init__(self):
        self.states: Dict[str, Dict[str, Any]] = {}
        self.states_file = PROCESSING_STATES_FILE
        self._load_states()

    def _load_states(self):
        if os.path.exists(self.states_file):
            try:
                with open(self.states_file, 'r') as f:
                    # Acquire shared lock for reading
                    fcntl.flock(f, fcntl.LOCK_SH)
                    try:
                        self.states = json.load(f)
                    finally:
                        # Release lock
                        fcntl.flock(f, fcntl.LOCK_UN)
            except json.JSONDecodeError:
                logger.error(f"Error parsing {self.states_file}, starting with empty state")
                self.states = {}
            except Exception as e:
                logger.error(f"Error loading states: {str(e)}")
                self.states = {}

    def _save_states(self):
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(os.path.abspath(self.states_file)), exist_ok=True)
            
            # Use atomic write pattern with file locking
            temp_file = f"{self.states_file}.tmp"
            with open(temp_file, 'w') as f:
                # Acquire exclusive lock for writing
                fcntl.flock(f, fcntl.LOCK_EX)
                try:
                    json.dump(self.states, f)
                    f.flush()
                    os.fsync(f.fileno())  # Ensure data is written to disk
                finally:
                    # Release lock
                    fcntl.flock(f, fcntl.LOCK_UN)
            
            # Atomic rename
            os.replace(temp_file, self.states_file)
        except Exception as e:
            logger.error(f"Error saving states: {str(e)}")

    def create_state(self, file_id: str, client_id: str = None) -> Dict[str, Any]:
        """Create initial state for a file"""
        current_time = datetime.utcnow().isoformat()
        self.states[file_id] = {
            "client_id": client_id,
            "created_at": current_time,
            "video_enhancement": {
                "status": "pending",
                "progress": 0,
                "error": None,
                "last_updated": current_time
            },
            "metadata_extraction": {
                "status": "pending",
                "progress": 0,
                "error": None,
                "last_updated": current_time
            }
        }
        self._save_states()
        return self.states[file_id]

    def get_state(self, file_id: str) -> Dict[str, Any]:
        """Get current state for a file"""
        return self.states.get(file_id)

    def update_state(self, file_id: str, status: str, progress: int = 0, error: str = None, task_type: str = "video_enhancement"):
        """Update state for a file"""
        if file_id not in self.states:
            self.create_state(file_id)
        
        if task_type not in ["video_enhancement", "metadata_extraction"]:
            task_type = "video_enhancement"  # Default to video_enhancement if invalid
        
        self.states[file_id][task_type].update({
            "status": status,
            "progress": progress,
            "error": error,
            "last_updated": datetime.utcnow().isoformat()
        })
        self._save_states()
        return self.states[file_id]

    def update_processing_status(self, file_id: str, process_type: str, 
                               status: str, progress: int = 0, error: str = None) -> Optional[Dict[str, Any]]:
        if file_id not in self.states:
            return None
        
        update_data = {
            f"{process_type}": {
                "status": status,
                "progress": progress,
                "error": error
            }
        }
        
        if status == "completed":
            update_data["status"] = "completed"
        
        return self.update_state(file_id, update_data)

    def cleanup_old_states(self, max_age_hours: int = 24):
        """Clean up states older than max_age_hours"""
        now = datetime.utcnow()
        states_to_remove = []
        
        for file_id, state in self.states.items():
            created_at = datetime.fromisoformat(state["created_at"])
            age_hours = (now - created_at).total_seconds() / 3600
            
            if age_hours > max_age_hours:
                states_to_remove.append(file_id)
        
        for file_id in states_to_remove:
            del self.states[file_id]
        
        if states_to_remove:
            logger.info(f"Cleaned up {len(states_to_remove)} old processing states")
            self._save_states()

# Global state instance
processing_state = ProcessingState() 