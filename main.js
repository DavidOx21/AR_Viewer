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
let pivot;
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

    // Compute the center of the model's bounding box
    model.traverse(function (child) {
      if (child.isMesh) {
        child.geometry.computeBoundingBox();
        child.geometry.boundingBox.getCenter(model.position);
      }
    });

    // Create the pivot point using the center of the bounding box
    pivot = new THREE.Object3D();
    pivot.add(model);
    group.add(pivot);
  });

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  //renderer.domElement.addEventListener("touchstart", onTouchStart, false);
  //renderer.domElement.addEventListener("touchmove", onTouchMove, false);
  //renderer.domElement.addEventListener("touchend", onTouchEnd, false);

  window.addEventListener("touchstart", onTouchStart, false);
  window.addEventListener("touchmove", onTouchMove, false);
  window.addEventListener("touchend", onTouchEnd, false);

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
  if (!renderer.xr.isPresenting) return;
  event.preventDefault();

  if (event.touches.length === 1) {
    const touch = event.touches[0];
    initialTouchPosition = new THREE.Vector2(touch.clientX, touch.clientY);
    touchMode = "rotate";
  } else if (event.touches.length === 2) {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];

    initialTouchPosition = new THREE.Vector2(
      (touch1.clientX + touch2.clientX) / 2,
      (touch1.clientY + touch2.clientY) / 2
    );
    selectedObject = group.children[0]; // Assumes there is only one child in the group
    touchMode = "move";

    previousTouchDist = touch1.clientX - touch2.clientX;
    initialScale = group.scale.x;
    initialRotation = group.rotation.y; // Changed to Y axis
  }
}

function onTouchMove(event) {
  if (!renderer.xr.isPresenting) return;
  event.preventDefault();

  if (touchMode === "rotate" && event.touches.length === 1) {
    const touch = event.touches[0];

    const deltaPosition = new THREE.Vector2(
      touch.clientX - initialTouchPosition.x,
      touch.clientY - initialTouchPosition.y
    );

    const deltaAngle = (deltaPosition.x / window.innerWidth) * 2 * Math.PI;
    group.rotation.y = initialRotation - deltaAngle;
    initialTouchPosition.set(touch.clientX, touch.clientY);
  } else if (
    selectedObject &&
    touchMode === "move" &&
    event.touches.length === 2
  ) {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];

    initialTouchPosition.set(
      (touch1.clientX + touch2.clientX) / 2,
      (touch1.clientY + touch2.clientY) / 2
    );

    const deltaPosition = new THREE.Vector2(
      initialTouchPosition.x - touch.clientX,
      initialTouchPosition.y - touch.clientY
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
      touch1.clientX - touch2.clientX,
      touch1.clientY - touch2.clientY
    );
    const currentAngle = Math.atan2(
      touch1.clientX - touch2.clientX,
      touch1.clientY - touch2.clientY
    );
    const deltaAngle = initialAngle - currentAngle;
    pivot.rotation.y = initialRotation - deltaAngle;
  }
}

function onTouchEnd(event) {
  if (!renderer.xr.isPresenting) return;
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
