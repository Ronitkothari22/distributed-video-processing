#!/usr/bin/env python3
"""
Script to generate OpenAPI documentation from the FastAPI app.
This creates a static HTML file with the API documentation.
"""

import os
import json
from fastapi.openapi.utils import get_openapi
from app.main import app

def generate_openapi_json():
    """Generate OpenAPI JSON schema from FastAPI app"""
    openapi_schema = get_openapi(
        title="Distributed Video Processing API",
        version="1.0.0",
        description="API for distributed video processing with real-time status updates",
        routes=app.routes,
    )
    
    # Add additional information
    openapi_schema["info"]["contact"] = {
        "name": "API Support",
        "email": "support@example.com",
        "url": "https://example.com/support",
    }
    
    openapi_schema["info"]["license"] = {
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    }
    
    # Add servers
    openapi_schema["servers"] = [
        {"url": "http://localhost:8000", "description": "Development server"},
    ]
    
    # Create docs directory if it doesn't exist
    os.makedirs("docs", exist_ok=True)
    
    # Write OpenAPI JSON to file
    with open("docs/openapi.json", "w") as f:
        json.dump(openapi_schema, f, indent=2)
    
    print(f"OpenAPI schema written to docs/openapi.json")
    
    # Create HTML file with Swagger UI
    create_swagger_html()
    
def create_swagger_html():
    """Create a HTML file with Swagger UI"""
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Distributed Video Processing API Documentation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui.css">
    <link rel="icon" type="image/png" href="https://fastapi.tiangolo.com/img/favicon.png">
    <style>
        body {
            margin: 0;
            padding: 0;
        }
        .swagger-ui .topbar {
            background-color: #2C3E50;
        }
        .swagger-ui .info .title {
            color: #2C3E50;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: "./openapi.json",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout"
            });
        };
    </script>
</body>
</html>
"""
    
    with open("docs/index.html", "w") as f:
        f.write(html_content)
    
    print(f"Swagger UI HTML written to docs/index.html")
    print("To view the documentation, run:")
    print("  cd docs && python -m http.server 8080")
    print("Then open http://localhost:8080 in your browser")

if __name__ == "__main__":
    generate_openapi_json() 