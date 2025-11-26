import './style.css'
import * as THREE from 'three'

// Game state
type GameState = 'START' | 'PLAYING' | 'GAME_OVER'
const GameState = {
  START: 'START' as GameState,
  PLAYING: 'PLAYING' as GameState,
  GAME_OVER: 'GAME_OVER' as GameState
}

let gameState: GameState = GameState.START
let score: number = 0
let highScore: number = 0

// Performance: Reusable geometries and materials
const geometries: { [key: string]: THREE.BufferGeometry } = {}
const materials: { [key: string]: THREE.Material } = {}

// Delta time for frame-rate independent updates
let lastTime: number = performance.now()
const MAX_DELTA = 0.1 // Cap delta to prevent issues on low FPS (100ms max)

// Find the canvas element
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')
if (!canvas) {
  throw new Error('Canvas element not found')
}

// Hide loading text
const loadingElement = document.querySelector<HTMLDivElement>('#loading')
if (loadingElement) {
  loadingElement.style.display = 'none'
}

// UI Elements
const tapToStartOverlay = document.querySelector<HTMLDivElement>('#tap-to-start')
const gameOverOverlay = document.querySelector<HTMLDivElement>('#game-over')
const scoreElement = document.querySelector<HTMLSpanElement>('#score')
const highScoreElement = document.querySelector<HTMLSpanElement>('#high-score')
const highScoreHudElement = document.querySelector<HTMLSpanElement>('#high-score-hud')
const finalScoreElement = document.querySelector<HTMLSpanElement>('#final-score')

// Load high score from localStorage
function loadHighScore(): number {
  const saved = localStorage.getItem('blueSlideParkHighScore')
  return saved ? parseInt(saved, 10) : 0
}

function saveHighScore(score: number): void {
  localStorage.setItem('blueSlideParkHighScore', score.toString())
  highScore = score
  if (highScoreElement) highScoreElement.textContent = score.toString()
  if (highScoreHudElement) highScoreHudElement.textContent = score.toString()
}

function updateScore(newScore: number): void {
  score = newScore
  if (scoreElement) scoreElement.textContent = score.toString()
  if (score > highScore) {
    saveHighScore(score)
  }
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
camera.position.set(0, 5, 10)
camera.lookAt(0, 0, 0)

// Create renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  powerPreference: 'high-performance'
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Cap pixel ratio for performance
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

// Performance: Use minimal lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
directionalLight.position.set(5, 10, 5)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.width = 1024 // Reduced from 2048 for performance
directionalLight.shadow.mapSize.height = 1024
scene.add(directionalLight)

// Performance: Reusable geometry and material functions
function getGeometry(key: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geometries[key]) {
    geometries[key] = factory()
  }
  return geometries[key]
}

function getMaterial(key: string, factory: () => THREE.Material): THREE.Material {
  if (!materials[key]) {
    materials[key] = factory()
  }
  return materials[key]
}

// Create slide mesh with texture support
function createSlide(): THREE.Mesh {
  // Reuse geometry
  const slideGeometry = getGeometry('slide', () => {
    const geo = new THREE.PlaneGeometry(10, 15)
    geo.rotateX(-Math.PI / 6) // Rotate 30 degrees down
    geo.translate(0, -2, 0) // Move down a bit
    return geo
  })

  // Reuse material
  const slideMaterial = getMaterial('slide', () => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1e90ff, // Bright blue (DodgerBlue)
      metalness: 0.1,
      roughness: 0.3,
    })

    // Try to load texture, fallback to solid blue
    const textureLoader = new THREE.TextureLoader()
    textureLoader.load(
      '/assets/slide_texture.png',
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(2, 2)
        mat.map = texture
        mat.needsUpdate = true
      },
      undefined,
      () => {
        console.log('Slide texture not found, using solid blue color')
      }
    )

    return mat
  }) as THREE.MeshStandardMaterial

  const slide = new THREE.Mesh(slideGeometry, slideMaterial)
  slide.receiveShadow = true
  slide.castShadow = true

  return slide
}

// Add slide to scene
const slide = createSlide()
scene.add(slide)

// Add ground plane (reuse geometry and material)
const groundGeometry = getGeometry('ground', () => new THREE.PlaneGeometry(50, 50))
const groundMaterial = getMaterial('ground', () => new THREE.MeshStandardMaterial({
  color: 0xffffff, // White ground
  roughness: 0.8,
}))
const ground = new THREE.Mesh(groundGeometry, groundMaterial)
ground.rotation.x = -Math.PI / 2
ground.position.y = -5
ground.receiveShadow = true
scene.add(ground)

// Touch controls
let touchStartX: number = 0
let touchStartY: number = 0
let isDragging: boolean = false
let currentLane: number = 0 // -1 = left, 0 = center, 1 = right
// const laneWidth: number = 3 // Reserved for player movement implementation

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault()
  if (gameState === GameState.GAME_OVER) {
    restartGame()
    return
  }
  
  if (gameState === GameState.START) {
    startGame()
    return
  }

  const touch = e.touches[0]
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  isDragging = true
}

function handleTouchMove(e: TouchEvent): void {
  if (!isDragging || gameState !== GameState.PLAYING) return
  e.preventDefault()
  
  const touch = e.touches[0]
  const deltaX = touch.clientX - touchStartX
  const deltaY = touch.clientY - touchStartY
  
  // Only process horizontal swipes (ignore if vertical movement is greater)
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
    if (deltaX > 0 && currentLane < 1) {
      currentLane++
      touchStartX = touch.clientX // Update start position
    } else if (deltaX < 0 && currentLane > -1) {
      currentLane--
      touchStartX = touch.clientX // Update start position
    }
  }
}

function handleTouchEnd(e: TouchEvent): void {
  e.preventDefault()
  isDragging = false
}

// Mouse controls for desktop testing
function handleMouseDown(e: MouseEvent): void {
  if (gameState === GameState.GAME_OVER) {
    restartGame()
    return
  }
  
  if (gameState === GameState.START) {
    startGame()
    return
  }

  touchStartX = e.clientX
  touchStartY = e.clientY
  isDragging = true
}

function handleMouseMove(e: MouseEvent): void {
  if (!isDragging || gameState !== GameState.PLAYING) return
  
  const deltaX = e.clientX - touchStartX
  const deltaY = e.clientY - touchStartY
  
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
    if (deltaX > 0 && currentLane < 1) {
      currentLane++
      touchStartX = e.clientX
    } else if (deltaX < 0 && currentLane > -1) {
      currentLane--
      touchStartX = e.clientX
    }
  }
}

function handleMouseUp(): void {
  isDragging = false
}

// Add event listeners
canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
canvas.addEventListener('touchend', handleTouchEnd, { passive: false })
canvas.addEventListener('mousedown', handleMouseDown)
canvas.addEventListener('mousemove', handleMouseMove)
canvas.addEventListener('mouseup', handleMouseUp)

// Game functions
function startGame(): void {
  gameState = GameState.PLAYING
  if (tapToStartOverlay) {
    tapToStartOverlay.classList.add('hidden')
  }
  score = 0
  updateScore(0)
  currentLane = 0
}

function triggerGameOver(): void {
  gameState = GameState.GAME_OVER
  if (gameOverOverlay) {
    gameOverOverlay.classList.remove('hidden')
  }
  if (finalScoreElement) {
    finalScoreElement.textContent = score.toString()
  }
}

// Export for use in game logic
export { triggerGameOver as gameOver }

function restartGame(): void {
  gameState = GameState.START
  if (gameOverOverlay) {
    gameOverOverlay.classList.add('hidden')
  }
  if (tapToStartOverlay) {
    tapToStartOverlay.classList.remove('hidden')
  }
  score = 0
  updateScore(0)
  currentLane = 0
}

// Initialize high score
highScore = loadHighScore()
if (highScoreHudElement) highScoreHudElement.textContent = highScore.toString()
if (highScoreElement) highScoreElement.textContent = highScore.toString()

// Game update function (called every frame)
function update(deltaTime: number): void {
  if (gameState !== GameState.PLAYING) return

  // Update game logic here
  // For now, just increment score as a placeholder
  // In a real game, you'd update player position, obstacles, etc.
  
  // Example: Update player position based on lane
  // const targetX = currentLane * laneWidth
  // Smooth interpolation would go here (uncomment when implementing player movement)
  
  // Increment score (example - replace with actual game logic)
  updateScore(score + Math.floor(deltaTime * 10))
}

// Handle window resize
function handleResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
window.addEventListener('resize', handleResize)

// Animation loop with delta time
function animate(): void {
  requestAnimationFrame(animate)
  
  // Calculate delta time
  const currentTime = performance.now()
  let deltaTime = (currentTime - lastTime) / 1000 // Convert to seconds
  lastTime = currentTime
  
  // Clamp delta time to prevent issues on low FPS
  deltaTime = Math.min(deltaTime, MAX_DELTA)
  
  // Update game
  update(deltaTime)
  
  // Render
  renderer.render(scene, camera)
}

// Start animation loop (always runs, but game logic only updates when playing)
lastTime = performance.now()
animate()
