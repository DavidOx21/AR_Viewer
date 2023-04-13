import * as THREE from "./build/three.module.js";
import { OrbitControls } from "./jsm/controls/OrbitControls.js";
import { ARButton } from "./jsm/webxr/ARButton.js";
import { GLTFLoader } from "./jsm/loaders/GLTFLoader.js";

let container;
let camera, scene, renderer;
let selectedObject;
let previousTouchDist;
let initialScale;
let initialRotation;
let touchMode;
let initialTouchPosition;
let isARMode = false;

const loader = new GLTFLoader();

let group;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.set(0, 0, 3);

  const controls = new OrbitControls(camera, container);
  controls.minDistance = 0;
  controls.maxDistance = 8;

  scene.add(new THREE.HemisphereLight(0x808080, 0x606060));

  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(0, 6, 0);
  scene.add(light);

  group = new THREE.Group();
  scene.add(group);

  loader.load("./models/model.gltf", function (gltf) {
    const model = gltf.scene;
    model.scale.set(0.01, 0.01, 0.01);
    group.add(model);
  });

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  renderer.domElement.addEventListener("touchstart", onTouchStart, false);
  renderer.domElement.addEventListener("touchmove", onTouchMove, false);
  renderer.domElement.addEventListener("touchend", onTouchEnd, false);

  //window.addEventListener("touchstart", onTouchStart, false);
  //window.addEventListener("touchmove", onTouchMove, false);
  //window.addEventListener("touchend", onTouchEnd, false);

  document.body.appendChild(
    ARButton.createButton(renderer, {
      onSessionStart: () => {
        isARMode = true;
      },
      onSessionEnd: () => {
        isARMode = false;
      },
    })
  );

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}
function onTouchStart(event) {
  if (!isARMode) return;
  event.preventDefault();

  if (event.touches.length === 1) {
    const touch = event.touches[0];
    initialTouchPosition = new THREE.Vector2(touch.clientX, touch.clientY);
    selectedObject = group.children[0]; // Assumes there is only one child in the group
    touchMode = "move";
  } else if (event.touches.length === 2) {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];

    selectedObject = null;
    touchMode = "scale-rotate";

    previousTouchDist = touch1.clientX - touch2.clientX;
    initialScale = group.scale.x;
    initialRotation = group.rotation.z;
  }
}

function onTouchMove(event) {
  if (!isARMode) return;
  event.preventDefault();
  if (selectedObject && touchMode === "move") {
    const touch = event.touches[0];

    const deltaPosition = new THREE.Vector2(
      touch.clientX - initialTouchPosition.x,
      touch.clientY - initialTouchPosition.y
    );

    const screenDelta = new THREE.Vector3(
      (deltaPosition.x / window.innerWidth) * 2,
      (-deltaPosition.y / window.innerHeight) * 2,
      0
    );

    const worldDelta = screenDelta
      .clone()
      .unproject(camera)
      .sub(camera.position)
      .normalize()
      .multiplyScalar(camera.position.z);
    selectedObject.position.add(worldDelta);
    initialTouchPosition.set(touch.clientX, touch.clientY);
  } else if (touchMode === "scale-rotate" && event.touches.length === 2) {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];

    // Scaling
    const currentTouchDist = touch1.clientX - touch2.clientX;
    const scaleFactor = currentTouchDist / previousTouchDist;
    group.scale.set(
      initialScale * scaleFactor,
      initialScale * scaleFactor,
      initialScale * scaleFactor
    );

    // Rotation
    const initialAngle = Math.atan2(
      touch1.clientY - touch2.clientY,
      touch1.clientX - touch2.clientX
    );
    const currentAngle = Math.atan2(
      touch1.clientY - touch2.clientY,
      touch1.clientX - touch2.clientX
    );
    const deltaAngle = initialAngle - currentAngle;
    group.rotation.z = initialRotation - deltaAngle;
  }
}

function onTouchEnd(event) {
  event.preventDefault();
  touchMode = null;
  selectedObject = null;
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  //cleanIntersected();
  isARMode = renderer.xr.isPresenting;
  renderer.render(scene, camera);
}
