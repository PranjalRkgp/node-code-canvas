class FlowchartEditor {
  constructor() {
    this.canvas = document.getElementById("flowchartCanvas")
    this.ctx = this.canvas.getContext("2d")
    this.nodes = []
    this.connections = []
    this.selectedNode = null
    this.draggedNode = null
    this.isConnecting = false
    this.connectingFrom = null
    this.mousePos = { x: 0, y: 0 }
    this.tempConnection = null
    this.currentFlowchartId = null

    this.init()
  }

  init() {
    this.setupEventListeners()
    this.resizeCanvas()
    this.draw()
    this.updateStatus('Ready - Click "Add Node" to start creating your flowchart')
  }

  setupEventListeners() {
    // Canvas events
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this))
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this))
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this))
    this.canvas.addEventListener("dblclick", this.handleDoubleClick.bind(this))

    // Button events
    document.getElementById("addNodeBtn").addEventListener("click", this.addNode.bind(this))
    document.getElementById("connectBtn").addEventListener("click", this.toggleConnectMode.bind(this))
    document.getElementById("saveBtn").addEventListener("click", this.saveFlowchart.bind(this))
    document.getElementById("loadBtn").addEventListener("click", this.loadFlowchart.bind(this))
    document.getElementById("generateCodeBtn").addEventListener("click", this.generateCode.bind(this))
    document.getElementById("exportBtn").addEventListener("click", this.exportJSON.bind(this))

    // Modal events
    document.getElementById("nodeEditForm").addEventListener("submit", this.saveNodeEdit.bind(this))
    document.getElementById("copyCodeBtn").addEventListener("click", this.copyCode.bind(this))

    // Close modal events
    document.querySelectorAll(".close").forEach((closeBtn) => {
      closeBtn.addEventListener("click", (e) => {
        const modal = e.target.closest(".modal")
        if (modal) {
          modal.style.display = "none"
        }
      })
    })

    // Window events
    window.addEventListener("resize", this.resizeCanvas.bind(this))
  }

  resizeCanvas() {
    const container = this.canvas.parentElement
    this.canvas.width = container.clientWidth - 32 // Account for padding
    this.canvas.height = container.clientHeight - 32
    this.draw()
  }

  draw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw grid
    this.drawGrid()

    // Draw connections
    this.connections.forEach((conn) => this.drawConnection(conn))

    // Draw temporary connection
    if (this.tempConnection) {
      this.drawTempConnection()
    }

    // Draw nodes
    this.nodes.forEach((node) => this.drawNode(node))
  }

  drawGrid() {
    const gridSize = 20
    this.ctx.strokeStyle = "#f1f5f9"
    this.ctx.lineWidth = 1

    // Vertical lines
    for (let x = 0; x <= this.canvas.width; x += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.canvas.height)
      this.ctx.stroke()
    }

    // Horizontal lines
    for (let y = 0; y <= this.canvas.height; y += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.canvas.width, y)
      this.ctx.stroke()
    }
  }

  drawNode(node) {
    const { x, y, width, height, title, type, color, metadata } = node

    this.ctx.save()

    // Node shadow
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.1)"
    this.ctx.shadowBlur = 4
    this.ctx.shadowOffsetX = 2
    this.ctx.shadowOffsetY = 2

    // Node background
    this.ctx.fillStyle = color || "#3b82f6"

    if (type === "circle") {
      const radius = Math.min(width, height) / 2
      this.ctx.beginPath()
      this.ctx.arc(x + width / 2, y + height / 2, radius, 0, 2 * Math.PI)
      this.ctx.fill()
    } else if (type === "diamond") {
      this.ctx.beginPath()
      this.ctx.moveTo(x + width / 2, y)
      this.ctx.lineTo(x + width, y + height / 2)
      this.ctx.lineTo(x + width / 2, y + height)
      this.ctx.lineTo(x, y + height / 2)
      this.ctx.closePath()
      this.ctx.fill()
    } else {
      // Rectangle (default)
      this.ctx.fillRect(x, y, width, height)
    }

    // Selection highlight
    if (this.selectedNode === node) {
      this.ctx.strokeStyle = "#f59e0b"
      this.ctx.lineWidth = 3
      this.ctx.stroke()
    }

    // Connection mode highlight
    if (this.isConnecting && this.connectingFrom === node) {
      this.ctx.strokeStyle = "#10b981"
      this.ctx.lineWidth = 3
      this.ctx.stroke()
    }

    this.ctx.restore()

    // Node text
    this.ctx.fillStyle = "white"
    this.ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "middle"

    // Title
    const titleLines = this.wrapText(title, width - 20)
    const lineHeight = 16
    const startY = y + height / 2 - ((titleLines.length - 1) * lineHeight) / 2

    titleLines.forEach((line, index) => {
      this.ctx.fillText(line, x + width / 2, startY + index * lineHeight)
    })

    // Priority indicator
    if (metadata && metadata.priority) {
      const priorityColors = {
        low: "#10b981",
        medium: "#f59e0b",
        high: "#ef4444",
      }

      this.ctx.fillStyle = priorityColors[metadata.priority] || "#6b7280"
      this.ctx.beginPath()
      this.ctx.arc(x + width - 8, y + 8, 4, 0, 2 * Math.PI)
      this.ctx.fill()
    }
  }

  drawConnection(connection) {
    const fromNode = this.nodes.find((n) => n.id === connection.fromNodeId)
    const toNode = this.nodes.find((n) => n.id === connection.toNodeId)

    if (!fromNode || !toNode) return

    const fromX = fromNode.x + fromNode.width / 2
    const fromY = fromNode.y + fromNode.height / 2
    const toX = toNode.x + toNode.width / 2
    const toY = toNode.y + toNode.height / 2

    // Draw line
    this.ctx.strokeStyle = "#6b7280"
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(fromX, fromY)
    this.ctx.lineTo(toX, toY)
    this.ctx.stroke()

    // Draw arrow
    const angle = Math.atan2(toY - fromY, toX - fromX)
    const arrowLength = 10

    this.ctx.fillStyle = "#6b7280"
    this.ctx.beginPath()
    this.ctx.moveTo(toX, toY)
    this.ctx.lineTo(
      toX - arrowLength * Math.cos(angle - Math.PI / 6),
      toY - arrowLength * Math.sin(angle - Math.PI / 6),
    )
    this.ctx.lineTo(
      toX - arrowLength * Math.cos(angle + Math.PI / 6),
      toY - arrowLength * Math.sin(angle + Math.PI / 6),
    )
    this.ctx.closePath()
    this.ctx.fill()
  }

  drawTempConnection() {
    if (!this.connectingFrom) return

    const fromX = this.connectingFrom.x + this.connectingFrom.width / 2
    const fromY = this.connectingFrom.y + this.connectingFrom.height / 2

    this.ctx.strokeStyle = "#10b981"
    this.ctx.lineWidth = 2
    this.ctx.setLineDash([5, 5])
    this.ctx.beginPath()
    this.ctx.moveTo(fromX, fromY)
    this.ctx.lineTo(this.mousePos.x, this.mousePos.y)
    this.ctx.stroke()
    this.ctx.setLineDash([])
  }

  wrapText(text, maxWidth) {
    const words = text.split(" ")
    const lines = []
    let currentLine = words[0]

    for (let i = 1; i < words.length; i++) {
      const word = words[i]
      const width = this.ctx.measureText(currentLine + " " + word).width
      if (width < maxWidth) {
        currentLine += " " + word
      } else {
        lines.push(currentLine)
        currentLine = word
      }
    }
    lines.push(currentLine)
    return lines
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  getNodeAt(x, y) {
    return this.nodes.find(
      (node) => x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height,
    )
  }

  handleMouseDown(e) {
    this.mousePos = this.getMousePos(e)
    const clickedNode = this.getNodeAt(this.mousePos.x, this.mousePos.y)

    if (this.isConnecting) {
      if (clickedNode) {
        if (!this.connectingFrom) {
          this.connectingFrom = clickedNode
          this.updateStatus("Click on another node to create connection")
        } else if (clickedNode !== this.connectingFrom) {
          this.createConnection(this.connectingFrom, clickedNode)
          this.connectingFrom = null
          this.tempConnection = null
          this.updateStatus("Connection created! Click another node or exit connect mode")
        }
      }
    } else {
      if (clickedNode) {
        this.selectedNode = clickedNode
        this.draggedNode = clickedNode
        this.updateStatus(`Selected: ${clickedNode.title}`)
      } else {
        this.selectedNode = null
        this.updateStatus('Ready - Click "Add Node" to start creating your flowchart')
      }
    }

    this.draw()
  }

  handleMouseMove(e) {
    this.mousePos = this.getMousePos(e)

    if (this.draggedNode && !this.isConnecting) {
      this.draggedNode.x = this.mousePos.x - this.draggedNode.width / 2
      this.draggedNode.y = this.mousePos.y - this.draggedNode.height / 2
      this.draw()
    }

    if (this.isConnecting && this.connectingFrom) {
      this.tempConnection = true
      this.draw()
    }
  }

  handleMouseUp(e) {
    this.draggedNode = null
  }

  handleDoubleClick(e) {
    const pos = this.getMousePos(e)
    const clickedNode = this.getNodeAt(pos.x, pos.y)

    if (clickedNode) {
      this.editNode(clickedNode)
    }
  }

  addNode() {
    const node = {
      id: "node_" + Date.now(),
      x: Math.random() * (this.canvas.width - 120) + 60,
      y: Math.random() * (this.canvas.height - 80) + 40,
      width: 120,
      height: 60,
      title: `Node ${this.nodes.length + 1}`,
      description: "",
      type: "rectangle",
      color: "#3b82f6",
      metadata: {
        priority: "",
        assignee: "",
        tags: [],
        notes: "",
      },
    }

    this.nodes.push(node)
    this.selectedNode = node
    this.draw()
    this.updateStatus(`Added new node: ${node.title}`)
  }

  toggleConnectMode() {
    this.isConnecting = !this.isConnecting
    this.connectingFrom = null
    this.tempConnection = null

    const btn = document.getElementById("connectBtn")
    if (this.isConnecting) {
      btn.textContent = "Exit Connect"
      btn.classList.add("btn-warning")
      btn.classList.remove("btn-secondary")
      this.updateStatus("Connect mode: Click on a node to start connection")
    } else {
      btn.textContent = "Connect Nodes"
      btn.classList.add("btn-secondary")
      btn.classList.remove("btn-warning")
      this.updateStatus('Ready - Click "Add Node" to start creating your flowchart')
    }

    this.draw()
  }

  createConnection(fromNode, toNode) {
    const connection = {
      id: "conn_" + Date.now(),
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
    }

    this.connections.push(connection)
  }

  editNode(node) {
    this.selectedNode = node

    // Populate form
    document.getElementById("nodeTitle").value = node.title
    document.getElementById("nodeDescription").value = node.description || ""
    document.getElementById("nodeType").value = node.type
    document.getElementById("nodeColor").value = node.color
    document.getElementById("nodePriority").value = node.metadata?.priority || ""
    document.getElementById("nodeAssignee").value = node.metadata?.assignee || ""
    document.getElementById("nodeTags").value = node.metadata?.tags?.join(", ") || ""
    document.getElementById("nodeNotes").value = node.metadata?.notes || ""

    // Show modal
    document.getElementById("nodeEditModal").style.display = "block"
  }

  saveNodeEdit(e) {
    e.preventDefault()

    if (!this.selectedNode) return

    // Update node
    this.selectedNode.title = document.getElementById("nodeTitle").value
    this.selectedNode.description = document.getElementById("nodeDescription").value
    this.selectedNode.type = document.getElementById("nodeType").value
    this.selectedNode.color = document.getElementById("nodeColor").value

    this.selectedNode.metadata = {
      priority: document.getElementById("nodePriority").value,
      assignee: document.getElementById("nodeAssignee").value,
      tags: document
        .getElementById("nodeTags")
        .value.split(",")
        .map((t) => t.trim())
        .filter((t) => t),
      notes: document.getElementById("nodeNotes").value,
    }

    // Close modal and redraw
    document.getElementById("nodeEditModal").style.display = "none"
    this.draw()
    this.updateStatus(`Updated node: ${this.selectedNode.title}`)
  }

  async saveFlowchart() {
    const name = prompt("Enter flowchart name:") || `Flowchart ${Date.now()}`

    const flowchartData = {
      name: name,
      nodes: this.nodes,
      connections: this.connections,
    }

    try {
      const response = await fetch("/api/flowcharts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flowchartData),
      })

      if (response.ok) {
        const result = await response.json()
        this.currentFlowchartId = result.id
        this.updateStatus(`Saved flowchart: ${name}`)
      } else {
        this.updateStatus("Error saving flowchart")
      }
    } catch (error) {
      this.updateStatus("Error saving flowchart")
      console.error("Save error:", error)
    }
  }

  async loadFlowchart() {
    try {
      const response = await fetch("/api/flowcharts")
      const flowcharts = await response.json()

      if (flowcharts.length === 0) {
        this.updateStatus("No saved flowcharts found")
        return
      }

      // Simple selection (in a real app, you'd want a proper dialog)
      const names = flowcharts.map((f, i) => `${i}: ${f.name}`).join("\n")
      const selection = prompt(`Select flowchart:\n${names}\n\nEnter number:`)

      if (selection !== null) {
        const index = Number.parseInt(selection)
        if (index >= 0 && index < flowcharts.length) {
          const flowchart = flowcharts[index]
          this.nodes = flowchart.nodes || []
          this.connections = flowchart.connections || []
          this.currentFlowchartId = flowchart.id
          this.draw()
          this.updateStatus(`Loaded flowchart: ${flowchart.name}`)
        }
      }
    } catch (error) {
      this.updateStatus("Error loading flowcharts")
      console.error("Load error:", error)
    }
  }

  async generateCode() {
    if (this.nodes.length === 0) {
      this.updateStatus("Add some nodes first!")
      return
    }

    this.updateStatus("Generating code...")

    try {
      const response = await fetch("/api/generate-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodes: this.nodes,
          connections: this.connections,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        document.getElementById("generatedCode").textContent = result.code
        document.getElementById("codeModal").style.display = "block"
        this.updateStatus("Code generated successfully!")
      } else {
        const error = await response.json()
        this.updateStatus(`Error generating code: ${error.error}`)
      }
    } catch (error) {
      this.updateStatus("Error generating code")
      console.error("Generate code error:", error)
    }
  }

  exportJSON() {
    const data = {
      nodes: this.nodes,
      connections: this.connections,
      exported_at: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "flowchart.json"
    a.click()
    URL.revokeObjectURL(url)

    this.updateStatus("Flowchart exported to JSON")
  }

  copyCode() {
    const code = document.getElementById("generatedCode").textContent
    navigator.clipboard.writeText(code).then(() => {
      this.updateStatus("Code copied to clipboard!")
    })
  }

  updateStatus(message) {
    document.getElementById("statusBar").textContent = message
  }
}

// Initialize the editor when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.flowchartEditor = new FlowchartEditor()
})

// Global function to close modals
function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none"
}
