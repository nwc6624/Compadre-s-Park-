import * as THREE from "three";



// ---------- Basic DOM setup ----------

// Target the game-root div inside the phone screen instead of clearing the body

const root = document.getElementById("game-root");

if (!root) {

  console.warn("No #game-root element found. The game will not mount.");

}

// DO NOT clear root.children anymore

// Use parent for appending (root or body as fallback)

const parent = root || document.body;



// Create score labels

const scoreLabel = document.createElement("div");

scoreLabel.id = "score-label";

scoreLabel.style.position = "absolute";

scoreLabel.style.top = "16px";

scoreLabel.style.left = "16px";

scoreLabel.style.zIndex = "10";

scoreLabel.style.color = "white";

scoreLabel.style.fontFamily = "sans-serif";

scoreLabel.style.fontSize = "20px";

scoreLabel.style.textShadow = "0 0 4px rgba(0,0,0,0.6)";

parent.appendChild(scoreLabel);



const bestLabel = document.createElement("div");

bestLabel.id = "best-label";

bestLabel.style.position = "absolute";

bestLabel.style.top = "40px";

bestLabel.style.left = "16px";

bestLabel.style.zIndex = "10";

bestLabel.style.color = "white";

bestLabel.style.fontFamily = "sans-serif";

bestLabel.style.fontSize = "20px";

bestLabel.style.textShadow = "0 0 4px rgba(0,0,0,0.6)";

parent.appendChild(bestLabel);



// Create overlay for tap-to-start / game-over text

const overlay = document.createElement("div");

overlay.id = "overlay";

overlay.style.position = "absolute";

overlay.style.top = "0";

overlay.style.left = "0";

overlay.style.right = "0";

overlay.style.bottom = "0";

overlay.style.zIndex = "20";

overlay.style.display = "flex";

overlay.style.alignItems = "center";

overlay.style.justifyContent = "center";

overlay.style.fontFamily = "sans-serif";

overlay.style.fontSize = "28px";

overlay.style.color = "white";

overlay.style.textShadow = "0 0 8px rgba(0,0,0,0.7)";

overlay.style.background = "rgba(0,0,0,0.35)";

overlay.textContent = "Tap to start";

parent.appendChild(overlay);



// Create renderer canvas

const canvas = document.createElement("canvas");

canvas.id = "game-canvas";

canvas.style.width = "100%";

canvas.style.height = "100%";

canvas.style.display = "block";

parent.appendChild(canvas);



// ---------- Three.js setup ----------

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x87cefa); // light sky



// Get parent container dimensions for camera and renderer

const parentBounds = parent.getBoundingClientRect();

const camera = new THREE.PerspectiveCamera(

  60,

  parentBounds.width / parentBounds.height,

  0.1,

  1000

);

camera.position.set(0, 3, 8);

camera.lookAt(0, 0, -10);



const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

// Use the parent container dimensions

renderer.setSize(parentBounds.width, parentBounds.height);

renderer.setPixelRatio(window.devicePixelRatio || 1);



const ambient = new THREE.AmbientLight(0xffffff, 0.8);

scene.add(ambient);

const dir = new THREE.DirectionalLight(0xffffff, 0.6);

dir.position.set(5, 10, 3);

scene.add(dir);



// ---------- Game state ----------

const GameState = {

  Menu: "MENU",

  Playing: "PLAYING",

  GameOver: "GAME_OVER",

} as const;

type GameState = typeof GameState[keyof typeof GameState];



let gameState: GameState = GameState.Menu;



let playerMesh: THREE.Mesh | null = null;

const trackSegments: THREE.Mesh[] = [];

const obstacles: THREE.Mesh[] = [];



let currentScore = 0;

let bestScore = 0;

let lastObstacleZ = 0;



const TRACK_SEGMENT_LENGTH = 10;

const TRACK_SPEED = 0.25;

const LANES = [-2, 0, 2];

let currentLaneIndex = 1;



// ---------- Helpers ----------

function updateScoreUI() {

  scoreLabel.textContent = `Score: ${Math.floor(currentScore)}`;

  bestLabel.textContent = `Best: ${Math.floor(bestScore)}`;

}



function setOverlay(text: string | null) {

  if (!text) {

    overlay.style.display = "none";

  } else {

    overlay.style.display = "flex";

    overlay.textContent = text;

  }

}



function createPlayer() {

  if (playerMesh) {

    scene.remove(playerMesh);

  }

  const geo = new THREE.SphereGeometry(0.5, 32, 32);

  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });

  playerMesh = new THREE.Mesh(geo, mat);

  currentLaneIndex = 1;

  playerMesh.position.set(LANES[currentLaneIndex], 0.5, 0);

  scene.add(playerMesh);

}



function createInitialTrack() {

  // Remove old

  while (trackSegments.length > 0) {

    const seg = trackSegments.pop();

    if (seg) scene.remove(seg);

  }

  while (obstacles.length > 0) {

    const ob = obstacles.pop();

    if (ob) scene.remove(ob);

  }



  lastObstacleZ = -20;



  const trackWidth = 6;

  const segmentCount = 20;



  for (let i = 0; i < segmentCount; i++) {

    const geo = new THREE.BoxGeometry(trackWidth, 0.2, TRACK_SEGMENT_LENGTH);

    const mat = new THREE.MeshStandardMaterial({ color: 0x0050a0 });

    const mesh = new THREE.Mesh(geo, mat);

    mesh.position.set(0, 0, -i * TRACK_SEGMENT_LENGTH);

    trackSegments.push(mesh);

    scene.add(mesh);

  }

}



function spawnObstacleRow(zPos: number) {

  const laneIndex = Math.floor(Math.random() * LANES.length);

  const xPos = LANES[laneIndex];



  const geo = new THREE.BoxGeometry(1, 1, 1);

  const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });

  const obstacle = new THREE.Mesh(geo, mat);

  obstacle.position.set(xPos, 0.5, zPos);

  obstacles.push(obstacle);

  scene.add(obstacle);

  lastObstacleZ = zPos;

}



function movePlayerToLane(index: number) {

  if (!playerMesh || gameState !== GameState.Playing) return;

  if (index < 0 || index >= LANES.length) return;

  currentLaneIndex = index;

  playerMesh.position.x = LANES[currentLaneIndex];

}



function startGame() {

  gameState = GameState.Playing;

  currentScore = 0;

  createPlayer();

  createInitialTrack();

  spawnObstacleRow(-25);

  updateScoreUI();

  setOverlay(null);

}



function endGame() {

  gameState = GameState.GameOver;

  if (currentScore > bestScore) {

    bestScore = currentScore;

  }

  updateScoreUI();

  setOverlay("Game Over – tap to restart");

}



// Expose for debugging if needed

(window as any).startGame = startGame;



// ---------- Input (tap to start / restart + swipe left/right) ----------

let touchStartX: number | null = null;



function handleTapOrClick() {

  if (gameState === GameState.Menu || gameState === GameState.GameOver) {

    startGame();

  }

}



window.addEventListener("pointerdown", (ev) => {

  touchStartX = ev.clientX;

});



window.addEventListener("pointerup", (ev) => {

  if (touchStartX === null) {

    handleTapOrClick();

    return;

  }



  const dx = ev.clientX - touchStartX;

  const absDx = Math.abs(dx);



  // Small movement = tap

  if (absDx < 20) {

    handleTapOrClick();

  } else if (gameState === GameState.Playing) {

    // Swipe

    if (dx < 0) {

      movePlayerToLane(currentLaneIndex - 1);

    } else {

      movePlayerToLane(currentLaneIndex + 1);

    }

  }



  touchStartX = null;

});



// ---------- Resize ----------

window.addEventListener("resize", () => {

  const bounds = parent.getBoundingClientRect();

  camera.aspect = bounds.width / bounds.height;

  camera.updateProjectionMatrix();

  renderer.setSize(bounds.width, bounds.height);

});



// ---------- Animation loop ----------

function animate() {

  requestAnimationFrame(animate);



  if (gameState === GameState.Playing) {

    // Move track

    trackSegments.forEach((seg) => {

      seg.position.z += TRACK_SPEED;

    });



    // Recycle segments

    const maxZ = 5;

    trackSegments.forEach((seg) => {

      if (seg.position.z > maxZ) {

        const minZ = Math.min(

          ...trackSegments.map((s) => s.position.z)

        );

        seg.position.z = minZ - TRACK_SEGMENT_LENGTH;

      }

    });



    // Move obstacles

      obstacles.forEach((o) => {

      o.position.z += TRACK_SPEED;

    });



    // Spawn new obstacles ahead

    const minTrackZ = Math.min(

      ...trackSegments.map((s) => s.position.z)

    );

    if (lastObstacleZ > minTrackZ - 20) {

      spawnObstacleRow(lastObstacleZ - 12);

    }



    // Update score

    currentScore += TRACK_SPEED * 0.1;

    updateScoreUI();



    // Collision detection

    if (playerMesh) {

      const playerBox = new THREE.Box3().setFromObject(playerMesh);

      for (const ob of obstacles) {

        const obBox = new THREE.Box3().setFromObject(ob);

        if (playerBox.intersectsBox(obBox)) {

          endGame();

          break;

        }

      }

    }

  }



  renderer.render(scene, camera);

}



// Initial UI state

updateScoreUI();

setOverlay("Tap to start");



animate();
