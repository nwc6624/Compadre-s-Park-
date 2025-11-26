import './style.css'
import * as THREE from 'three'

// Game state
type GameState = 'READY' | 'PLAYING' | 'GAME_OVER'
const GameState = {
  READY: 'READY' as GameState,
  PLAYING: 'PLAYING' as GameState,
  GAME_OVER: 'GAME_OVER' as GameState,
}

let gameState: GameState = GameState.READY
let score = 0
let highScore = 0
let elapsedSinceStart = 0
let forwardSpeed = 10
const baseForwardSpeed = 10

// Lanes: left, center, right
const LANE_X_POSITIONS = [-1.5, 0, 1.5]
let currentLaneIndex = 1 // start in center
let targetLaneX = LANE_X_POSITIONS[currentLaneIndex]

// Three.js objects
let player: THREE.Mesh
const slideSegments: THREE.Mesh[] = []
const obstacles: THREE.Mesh[] = []

// Config
const SEGMENT_LENGTH = 20
const SEGMENT_COUNT = 8
const OBSTACLE_CHANCE_PER_SEGMENT = 0.5 // 50% chance

// Find the canvas element and HUD elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
if (!canvas) {
  throw new Error('Canvas element not found')
}

const tapOverlay = document.getElementById('tap-to-start-overlay') as HTMLDivElement | null
const scoreEl = document.getElementById('score') as HTMLDivElement | null
const highScoreEl = document.getElementById('high-score') as HTMLDivElement | null

function updateHud() {
  if (scoreEl) scoreEl.textContent = `Score: ${Math.floor(score)}`
  if (highScoreEl) highScoreEl.textContent = `Best: ${Math.floor(highScore)}`
}

// Hide loading text
const loadingElement = document.querySelector<HTMLDivElement>('#loading')
if (loadingElement) {
  loadingElement.style.display = 'none'
}

// Load high score from localStorage
function loadHighScore(): number {
  const saved = localStorage.getItem('blueSlideParkHighScore')
  return saved ? parseInt(saved, 10) : 0
}

function saveHighScore(score: number): void {
  localStorage.setItem('blueSlideParkHighScore', score.toString())
  highScore = score
  updateHud()
}

function updateScore(newScore: number): void {
  score = newScore
  if (score > highScore) {
    saveHighScore(score)
  }
  updateHud()
}

// Create scene with light sky blue background
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb) // Light sky blue

// Create camera
const camera = new THREE.PerspectiveCamera(
  75, // FOV
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1, // Near plane
  1000 // Far plane
)
camera.position.set(0, 2.5, 8)
camera.lookAt(0, 0, 0)

// Create renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  powerPreference: 'high-performance',
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Cap pixel ratio for performance
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(5, 10, 5)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.width = 1024
directionalLight.shadow.mapSize.height = 1024
scene.add(directionalLight)

// World setup
function createPlayer() {
  const geom = new THREE.SphereGeometry(0.5, 16, 16)
  const mat = new THREE.MeshPhongMaterial({ color: 0xffffff })
  player = new THREE.Mesh(geom, mat)
  player.position.set(0, 1, 5) // slightly in front of camera origin
  scene.add(player)
}

function createSlideSegment(zIndex: number): THREE.Mesh {
  const geom = new THREE.BoxGeometry(5, 0.2, SEGMENT_LENGTH)
  const mat = new THREE.MeshPhongMaterial({ color: 0x1e7be6 })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.position.set(0, 0, -zIndex * SEGMENT_LENGTH)
  mesh.receiveShadow = true
  scene.add(mesh)
  return mesh
}

function spawnObstacleOnSegment(segment: THREE.Mesh) {
  if (Math.random() > OBSTACLE_CHANCE_PER_SEGMENT) return

  const laneIndex = Math.floor(Math.random() * LANE_X_POSITIONS.length)
  const x = LANE_X_POSITIONS[laneIndex]

  const geom = new THREE.BoxGeometry(0.8, 0.8, 0.8)
  const mat = new THREE.MeshPhongMaterial({ color: 0xff4444 })
  const box = new THREE.Mesh(geom, mat)

  // Place slightly above the segment surface, somewhere along its length
  const localZ = Math.random() * SEGMENT_LENGTH - SEGMENT_LENGTH / 2
  box.position.set(x, 0.6, segment.position.z + localZ)

  scene.add(box)
  obstacles.push(box)
}

function createWorld() {
  // Clear any previous world (if restarting)
  slideSegments.forEach((seg) => scene.remove(seg))
  slideSegments.length = 0
  obstacles.forEach((o) => scene.remove(o))
  obstacles.length = 0

  // Create slide segments in a row
  for (let i = 0; i < SEGMENT_COUNT; i++) {
    const seg = createSlideSegment(i)
    slideSegments.push(seg)
    spawnObstacleOnSegment(seg)
  }

  // Player
  if (!player) {
    createPlayer()
  } else {
    player.position.set(0, 1, 5)
  }
}

// Input handling
let isDragging = false
let dragStartX = 0
let dragCurrentX = 0

function setLane(index: number) {
  currentLaneIndex = Math.max(0, Math.min(LANE_X_POSITIONS.length - 1, index))
  targetLaneX = LANE_X_POSITIONS[currentLaneIndex]
}

function onPointerDown(clientX: number) {
  // If we're not playing, treat this as a tap (start / restart)
  if (gameState !== GameState.PLAYING) {
    handleTap(new Event('pointerdown'))
    return
  }

  isDragging = true
  dragStartX = clientX
  dragCurrentX = clientX
}

function onPointerMove(clientX: number) {
  if (!isDragging) return
  dragCurrentX = clientX
}

function onPointerUp() {
  if (!isDragging) return
  const deltaX = dragCurrentX - dragStartX

  // Simple threshold swipe
  const SWIPE_THRESHOLD = 40
  if (deltaX > SWIPE_THRESHOLD) {
    setLane(currentLaneIndex + 1)
  } else if (deltaX < -SWIPE_THRESHOLD) {
    setLane(currentLaneIndex - 1)
  }

  isDragging = false
}

// Wire to mouse/touch events on the canvas
canvas.addEventListener('mousedown', (e) => {
  e.preventDefault()
  onPointerDown(e.clientX)
})

canvas.addEventListener('mousemove', (e) => {
  e.preventDefault()
  onPointerMove(e.clientX)
})

canvas.addEventListener('mouseup', (e) => {
  e.preventDefault()
  onPointerUp()
})

canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length > 0) {
    e.preventDefault()
    onPointerDown(e.touches[0].clientX)
  }
}, { passive: false })

canvas.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    e.preventDefault()
    onPointerMove(e.touches[0].clientX)
  }
}, { passive: false })

canvas.addEventListener('touchend', (e) => {
  e.preventDefault()
  onPointerUp()
}, { passive: false })

// Game functions
function resetGame() {
  score = 0
  elapsedSinceStart = 0
  forwardSpeed = baseForwardSpeed
  currentLaneIndex = 1
  targetLaneX = LANE_X_POSITIONS[currentLaneIndex]

  // Rebuild world (segments + obstacles + player position)
  createWorld()

  // Place player in the correct lane
  if (player) {
    player.position.x = targetLaneX
    player.position.y = 1
    player.position.z = 5
  }

  updateHud()
}

function startGame() {
  resetGame()
  gameState = GameState.PLAYING
  if (tapOverlay) tapOverlay.style.display = 'none'
}

function triggerGameOver() {
  gameState = GameState.GAME_OVER
  if (score > highScore) highScore = score
  updateHud()
  if (tapOverlay) {
    tapOverlay.style.display = 'flex'
    const text = tapOverlay.querySelector('.tap-text') as HTMLDivElement | null
    if (text) {
      text.textContent = 'Game Over – Tap to restart'
    }
  }
}

// Export for use in game logic
export { triggerGameOver as gameOver }

// Collision detection
function checkCollisions() {
  if (!player) return

  const playerPos = player.position
  const playerRadius = 0.5

  const toRemove: THREE.Mesh[] = []

  for (const o of obstacles) {
    const dx = o.position.x - playerPos.x
    const dy = o.position.y - playerPos.y
    const dz = o.position.z - playerPos.z
    const distSq = dx * dx + dy * dy + dz * dz

    const obstacleRadius = 0.6
    const combined = playerRadius + obstacleRadius

    // Hit if close enough in 3D
    if (distSq < combined * combined) {
      // Collision = game over
      triggerGameOver()
      return
    }

    // If obstacle is far behind camera, clean it up
    if (o.position.z > camera.position.z + 10) {
      toRemove.push(o)
    }
  }

  // Remove old obstacles
  if (toRemove.length > 0) {
    for (const o of toRemove) {
      const idx = obstacles.indexOf(o)
      if (idx !== -1) obstacles.splice(idx, 1)
      scene.remove(o)
    }
  }
}

// Initialize high score
highScore = loadHighScore()
updateHud()

// Initial world setup
createWorld()

// Game update function (called every frame while playing)
function updateGame(delta: number): void {
  if (gameState !== GameState.PLAYING) return

  // Increase difficulty slightly over time
  elapsedSinceStart += delta
  forwardSpeed = baseForwardSpeed + elapsedSinceStart * 0.5

  // Score based on time survived
  score += delta * 10
  updateHud()

  // Smoothly move player toward target lane X
  if (player) {
    const LERP_FACTOR = 10 // higher = snappier
    player.position.x += (targetLaneX - player.position.x) * Math.min(LERP_FACTOR * delta, 1)
  }

  // Move slide segments "toward" the camera
  slideSegments.forEach((seg) => {
    seg.position.z += forwardSpeed * delta

    // Recycle segment if it passes behind camera
    if (seg.position.z - SEGMENT_LENGTH / 2 > camera.position.z + 5) {
      seg.position.z -= SEGMENT_LENGTH * SEGMENT_COUNT

      // Random slight horizontal wiggle
      seg.position.x = (Math.random() - 0.5) * 1.0

      // Spawn new obstacle(s) for this recycled segment
      spawnObstacleOnSegment(seg)
    }
  })

  // Move obstacles along z as well
  obstacles.forEach((o) => {
    o.position.z += forwardSpeed * delta
  })

  // Collision detection
  checkCollisions()
}

// Handle window resize
function handleResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
window.addEventListener('resize', handleResize)

// Animation loop
let lastTime = 0

function animate(time: number) {
  requestAnimationFrame(animate)
  const delta = Math.min((time - lastTime) / 1000, 0.05)
  lastTime = time

  if (gameState === GameState.PLAYING) {
    updateGame(delta) // your movement logic
  }

  renderer.render(scene, camera)
}

requestAnimationFrame(animate)

// Tap-to-start / restart handlers
function handleTap(ev: Event) {
  ev.preventDefault()
  if (gameState === GameState.READY || gameState === GameState.GAME_OVER) {
    startGame()
  }
}

if (tapOverlay) {
  tapOverlay.addEventListener('click', handleTap)
  tapOverlay.addEventListener('touchstart', handleTap, { passive: false })
}
