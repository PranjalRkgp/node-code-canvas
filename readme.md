
Node-Code-Canvas an intuitive web application that allows you to design flowcharts visually and then uses the power of Large Language Models (LLMs) via the Groq API to generate clean, well-documented Python code from them. It's built with Flask and modern JavaScript.

Access here: https://node-code-canvas.onrender.com/

## Features
Visual Flowchart Editor: An interactive canvas to drag, drop, and connect nodes to design your workflow.

CRUD Operations: Full Create, Read, Update, and Delete functionality for your flowcharts.

AI-Powered Code Generation: Leverages the Groq API with the llama-3.3-70b-versatile model to convert your flowchart into executable Python code.

Intelligent Execution Order: Automatically determines the correct sequence of steps using a topological sort algorithm.

Clean & Documented Code: Generates code with comments, error handling, and appropriate data structures.

RESTful API: A well-structured backend API for managing all flowchart data.


## Installation & Setup
Follow these steps to get a local copy up and running.

Prerequisites
Python 3.7+
flask
A Groq API key 

1. Clone the Repository
2. Configure API Key
Replace the placeholder Groq API key in app.py with your own:
GROQ_API_KEY = "YOUR_ACTUAL_GROQ_API_KEY_HERE"
For security best practices, consider using environment variables instead of hardcoding the key.
3. Run the Application
python app.py
The application will start on http://0.0.0.0:5000 or http://localhost:5000. Open this URL in your browser.

## How to Use
Create a New Flowchart: Click "New Flowchart" and give it a name.
Design Your Workflow:
Drag nodes from the sidebar onto the canvas.
Edit node titles, descriptions, and metadata (priority, assignee, tags) by double-clicking on them.
Connect nodes by dragging from an output anchor of one node to the input anchor of another.
Save Your Work: Changes are automatically saved to the server's memory.

Generate Code: Click the "Generate Code" button. The application will analyze the flowchart's structure and send a description to the Groq API.

View and Use Code: The generated Python code will appear in the code panel on the right. You can review, copy, and run it.
