// --- Solar System Setup ---

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 60, 120);

const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 1;
controls.maxDistance = 1000;

// --- Textures ---
const textureLoader = new THREE.TextureLoader();
const planetData = [
  {
    name: "Sun",
    size: 16,
    color: 0xffcc00, // yellow
    orbit: 0,
    speed: 0,
    mesh: null,
    pos: new THREE.Vector3(0, 0, 0)
  },
  {
    name: "Mercury",
    size: 3,
    color: 0xaaaaaa, // gray
    orbit: 28,
    speed: 0.02,
    mesh: null,
    pos: new THREE.Vector3()
  },
  {
    name: "Venus",
    size: 4,
    color: 0xffb380, // orange
    orbit: 38,
    speed: 0.015,
    mesh: null,
    pos: new THREE.Vector3()
  },
  {
    name: "Earth",
    size: 5,
    color: 0x3399ff, // blue
    orbit: 50,
    speed: 0.012,
    mesh: null,
    pos: new THREE.Vector3()
  },
  {
    name: "Mars",
    size: 4,
    color: 0xff3300, // red
    orbit: 62,
    speed: 0.01,
    mesh: null,
    pos: new THREE.Vector3()
  },
  {
    name: "Jupiter",
    size: 11,
    color: 0xffe5b4, // light tan
    orbit: 80,
    speed: 0.008,
    mesh: null,
    pos: new THREE.Vector3()
  },
  {
    name: "Saturn",
    size: 9.5,
    color: 0xf7e7ce, // pale yellow
    orbit: 100,
    speed: 0.006,
    mesh: null,
    pos: new THREE.Vector3()
  },
  {
    name: "Uranus",
    size: 8,
    color: 0x7fffd4, // aquamarine
    orbit: 120,
    speed: 0.004,
    mesh: null,
    pos: new THREE.Vector3()
  },
  {
    name: "Neptune",
    size: 7.5,
    color: 0x4169e1, // royal blue
    orbit: 140,
    speed: 0.003,
    mesh: null,
    pos: new THREE.Vector3()
  }
];

// --- Assign unique orbital inclinations to each planet (except the Sun) ---
const planetInclinations = [
  0,    // Sun
  7,    // Mercury
  3.4,  // Venus
  0,    // Earth
  1.85, // Mars
  1.3,  // Jupiter
  2.5,  // Saturn
  0.8,  // Uranus
  1.8   // Neptune
];

function createPlanet(planet) {
  const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
  const material = new THREE.MeshBasicMaterial({ color: planet.color, wireframe: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = planet.name;
  mesh.position.copy(planet.pos);
  scene.add(mesh);
  planet.mesh = mesh;
}

// --- Create Planets ---
planetData.forEach(createPlanet);

// --- Raycaster for Hover ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let focusedPlanet = null;
let animatingToTarget = false;
let animationStart = 0;
let cameraStart = new THREE.Vector3();
let cameraTarget = new THREE.Vector3();
let controlsTargetStart = new THREE.Vector3();
let controlsTargetEnd = new THREE.Vector3();
let lastTime = performance.now();

// --- Animation Loop ---
function animate(now) {
  requestAnimationFrame(animate);
  const delta = (now - lastTime) / 1000; // seconds
  lastTime = now;

  // Orbit planets in 360-degree inclined planes
  const time = now * 0.001;
  planetData.forEach((planet, i) => {
    if (i === 0) return; // Sun doesn't orbit
    const angle = time * planet.speed;
    const inclination = THREE.MathUtils.degToRad(planetInclinations[i]);
    // Calculate position in the planet's orbital plane
    const x = Math.cos(angle) * planet.orbit;
    const y = Math.sin(angle) * planet.orbit * Math.sin(inclination);
    const z = Math.sin(angle) * planet.orbit * Math.cos(inclination);
    planet.mesh.position.set(x, y, z);
    planet.pos.copy(planet.mesh.position);
    planet.mesh.rotation.y += 0.5 * delta; // smoother, frame-rate independent
  });

  // Sun spins
  planetData[0].mesh.rotation.y += 0.25 * delta;

  // Animate camera to planet or reset
  if (animatingToTarget) {
    const duration = 1.2; // seconds
    const t = Math.min((performance.now() - animationStart) / (duration * 1000), 1);
    camera.position.lerpVectors(cameraStart, cameraTarget, t);
    controls.target.lerpVectors(controlsTargetStart, controlsTargetEnd, t);
    controls.update();
    if (t >= 1) animatingToTarget = false;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate(performance.now());

// --- Handle Hover ---
window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  // Only test planets, not the sun
  const planetMeshes = planetData.slice(1).map(p => p.mesh).filter(Boolean);
  const intersects = raycaster.intersectObjects(planetMeshes);
  if (intersects.length > 0) {
    const planet = planetData.find(p => p.mesh === intersects[0].object);
    if (planet && planet !== focusedPlanet) {
      focusOnPlanet(planet);
    }
  }
});

// --- Focus and Zoom on Planet ---
function focusOnPlanet(planet) {
  focusedPlanet = planet;
  animatingToTarget = true;
  animationStart = performance.now();
  cameraStart.copy(camera.position);
  controlsTargetStart.copy(controls.target);

  // Camera target: a bit away from the planet, looking at it
  // Always use the planet's current position
  const dir = new THREE.Vector3().subVectors(camera.position, planet.mesh.position).normalize();
  cameraTarget.copy(planet.mesh.position).add(dir.multiplyScalar(planet.size * 3));
  controlsTargetEnd.copy(planet.mesh.position);
}

// --- Reset Button ---
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    focusedPlanet = null;
    animatingToTarget = true;
    animationStart = performance.now();
    cameraStart.copy(camera.position);
    controlsTargetStart.copy(controls.target);
    cameraTarget.set(0, 60, 120);
    controlsTargetEnd.set(0, 0, 0);
  });
}

// --- Handle Window Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Starfield ---
function createStarfield(numStars = 500, radius = 800) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < numStars; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = 2 * Math.PI * Math.random();
    const r = radius * (0.7 + 0.3 * Math.random());
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: true });
  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
}
createStarfield();
