from typing import Dict, Any, Optional
from datetime import datetime
import json
import os

class ProcessingState:
    def __init__(self):
        self.states: Dict[str, Dict[str, Any]] = {}
        self.states_file = "processing_states.json"
        self._load_states()

    def _load_states(self):
        if os.path.exists(self.states_file):
            with open(self.states_file, 'r') as f:
                self.states = json.load(f)

    def _save_states(self):
        with open(self.states_file, 'w') as f:
            json.dump(self.states, f)

    def create_state(self, file_id: str, client_id: str = None) -> Dict[str, Any]:
        """Create initial state for a file"""
        self.states[file_id] = {
            "client_id": client_id,
            "created_at": datetime.utcnow().isoformat(),
            "video_enhancement": {
                "status": "pending",
                "progress": 0,
                "error": None,
                "last_updated": datetime.utcnow().isoformat()
            },
            "metadata_extraction": {
                "status": "pending",
                "progress": 0,
                "error": None,
                "last_updated": datetime.utcnow().isoformat()
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

# Global state instance
processing_state = ProcessingState() 