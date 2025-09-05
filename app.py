from flask import Flask, request, jsonify, render_template, send_from_directory
import json
import os
import requests
from datetime import datetime
import uuid

app = Flask(__name__)

# In-memory storage for flowcharts 
flowcharts = {}

# Groq API configuration
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

@app.route('/')
def index():
    """Serve the main flowchart editor page"""
    return render_template('index.html')

@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files"""
    return send_from_directory('static', filename)

# Flowchart CRUD API endpoints
@app.route('/api/flowcharts', methods=['GET'])
def get_flowcharts():
    """Get all flowcharts"""
    return jsonify(list(flowcharts.values()))

@app.route('/api/flowcharts', methods=['POST'])
def create_flowchart():
    """Create a new flowchart"""
    data = request.get_json()
    flowchart_id = str(uuid.uuid4())
    
    flowchart = {
        'id': flowchart_id,
        'name': data.get('name', f'Flowchart {len(flowcharts) + 1}'),
        'nodes': data.get('nodes', []),
        'connections': data.get('connections', []),
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    
    flowcharts[flowchart_id] = flowchart
    return jsonify(flowchart), 201

@app.route('/api/flowcharts/<flowchart_id>', methods=['GET'])
def get_flowchart(flowchart_id):
    """Get a specific flowchart"""
    if flowchart_id not in flowcharts:
        return jsonify({'error': 'Flowchart not found'}), 404
    return jsonify(flowcharts[flowchart_id])

@app.route('/api/flowcharts/<flowchart_id>', methods=['PUT'])
def update_flowchart(flowchart_id):
    """Update a flowchart"""
    if flowchart_id not in flowcharts:
        return jsonify({'error': 'Flowchart not found'}), 404
    
    data = request.get_json()
    flowchart = flowcharts[flowchart_id]
    
    flowchart.update({
        'name': data.get('name', flowchart['name']),
        'nodes': data.get('nodes', flowchart['nodes']),
        'connections': data.get('connections', flowchart['connections']),
        'updated_at': datetime.now().isoformat()
    })
    
    return jsonify(flowchart)

@app.route('/api/flowcharts/<flowchart_id>', methods=['DELETE'])
def delete_flowchart(flowchart_id):
    """Delete a flowchart"""
    if flowchart_id not in flowcharts:
        return jsonify({'error': 'Flowchart not found'}), 404
    
    del flowcharts[flowchart_id]
    return '', 204

@app.route('/api/generate-code', methods=['POST'])
def generate_code():
    """Generate code from flowchart using Groq LLM"""
    try:
        data = request.get_json()
        nodes = data.get('nodes', [])
        connections = data.get('connections', [])
        
        # Create workflow description
        workflow_description = create_workflow_description(nodes, connections)
        
        # Prepare Groq API request
        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'llama-3.3-70b-versatile',
            'messages': [
                {
                    'role': 'system',
                    'content': 'You are a code generation expert. Generate clean, well-documented Python code based on flowchart descriptions.'
                },
                {
                    'role': 'user',
                    'content': f"""Generate Python code for this workflow:

{workflow_description}

Requirements:
- Create a complete Python script
- Include proper error handling
- Add comments explaining each step
- Use appropriate data structures
- Follow the execution order shown in the flowchart"""
                }
            ],
            'temperature': 0.7,
            'max_tokens': 2000
        }
        
        # Make API call to Groq
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            generated_code = result['choices'][0]['message']['content']
            return jsonify({'code': generated_code})
        else:
            return jsonify({'error': f'Groq API error: {response.text}'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def create_workflow_description(nodes, connections):
    """Create a human-readable workflow description from nodes and connections"""
    if not nodes:
        return "Empty workflow with no nodes."
    
    # Get execution order
    execution_order = get_execution_order(nodes, connections)
    
    description = "Workflow Description:\n\n"
    
    # Add nodes in execution order
    for i, node_id in enumerate(execution_order, 1):
        node = next((n for n in nodes if n['id'] == node_id), None)
        if node:
            description += f"Step {i}: {node['title']}\n"
            if node.get('description'):
                description += f"   Description: {node['description']}\n"
            if node.get('metadata'):
                metadata = node['metadata']
                if metadata.get('priority'):
                    description += f"   Priority: {metadata['priority']}\n"
                if metadata.get('assignee'):
                    description += f"   Assignee: {metadata['assignee']}\n"
                if metadata.get('tags'):
                    description += f"   Tags: {', '.join(metadata['tags'])}\n"
            description += "\n"
    
    # Add connections info
    if connections:
        description += "Data Flow:\n"
        for conn in connections:
            from_node = next((n for n in nodes if n['id'] == conn['fromNodeId']), None)
            to_node = next((n for n in nodes if n['id'] == conn['toNodeId']), None)
            if from_node and to_node:
                description += f"- {from_node['title']} → {to_node['title']}\n"
    
    return description

def get_execution_order(nodes, connections):
    """Determine execution order based on connections"""
    if not connections:
        return [node['id'] for node in nodes]
    
    # Build adjacency list
    graph = {node['id']: [] for node in nodes}
    in_degree = {node['id']: 0 for node in nodes}
    
    for conn in connections:
        from_id = conn['fromNodeId']
        to_id = conn['toNodeId']
        if from_id in graph and to_id in graph:
            graph[from_id].append(to_id)
            in_degree[to_id] += 1
    
    # Topological sort
    queue = [node_id for node_id in in_degree if in_degree[node_id] == 0]
    result = []
    
    while queue:
        current = queue.pop(0)
        result.append(current)
        
        for neighbor in graph[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    # Add any remaining nodes (in case of cycles or disconnected components)
    for node in nodes:
        if node['id'] not in result:
            result.append(node['id'])
    
    return result

if __name__ == '__main__':
    # Create templates and static directories if they don't exist
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
