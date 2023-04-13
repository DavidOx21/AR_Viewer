import * as THREE from "./build/three.module.js";
import { OrbitControls } from "./jsm/controls/OrbitControls.js";
import { TransformControls } from "./jsm/controls/TransformControls.js";
import { ARButton } from "./jsm/webxr/ARButton.js";
import { GLTFLoader } from "./jsm/loaders/GLTFLoader.js";

let container;
let camera, scene, renderer;
const loader = new GLTFLoader();
let controls, transformControls;
let model;

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

  controls = new OrbitControls(camera, container);
  controls.minDistance = 0;
  controls.maxDistance = 8;
  controls.enabled = true;

  scene.add(new THREE.HemisphereLight(0x808080, 0x606060));

  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(0, 6, 0);
  scene.add(light);

  loader.load("./models/model.gltf", function (gltf) {
    model = gltf.scene;
    model.scale.set(0.01, 0.01, 0.01);
    scene.add(model);

    // Initialize TransformControls after the model is loaded
    transformControls = new TransformControls(camera, container);
    transformControls.addEventListener("dragging-changed", function (event) {
      controls.enabled = !event.value;
    });
    transformControls.attach(model);
    scene.add(transformControls);
  });

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  const arButton = ARButton.createButton(renderer);
  arButton.addEventListener("sessionstart", () => (controls.enabled = false));
  arButton.addEventListener("sessionend", () => (controls.enabled = true));
  document.body.appendChild(arButton);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene,
      renderer.render(scene, camera);
    });
  }
  