import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const container = document.getElementById('pyramid-container');

if (container) {
    console.log('3D Container found, initializing Three.js...');

    // Scene setup
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffd86b, 3);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Debug Cube - to verify scene is rendering
    // If you see this red cube but not the pyramid, then the GLB is failing to load/display.
    // If you don't see this cube, the scene/camera/renderer is messed up.
    const debugGeo = new THREE.BoxGeometry(1, 1, 1);
    const debugMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const debugCube = new THREE.Mesh(debugGeo, debugMat);
    debugCube.position.set(2, 0, 0);
    scene.add(debugCube);

    // Mouse interaction variables
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - windowHalfX) * 0.001;
        mouseY = (event.clientY - windowHalfY) * 0.001;
    });

    // Load Model
    const loader = new GLTFLoader();
    let model;

    console.log('Attempting to load pyramid1.glb...');

    loader.load('pyramid1.glb', (gltf) => {
        console.log('Model loaded successfully!');
        model = gltf.scene;

        // Adjust scale and position - reduced from 30 to 3 to be safe
        model.scale.set(3, 3, 3);
        model.position.set(0, 0, 0);

        scene.add(model);

        // Initial rotation
        model.rotation.y = Math.PI / 4;

    }, (xhr) => {
        // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    }, (error) => {
        console.error('An error occurred loading the model:', error);
        console.error('This is likely a CORS issue if running from file:// protocol.');

        // Add a fallback red cube if model fails to load so SOMETHING is visible
        console.error('If you are seeing this, the 3D model failed to load.');
        alert('3D Model Failed to Load! If you are opening the file directly, this is a CORS issue. Use a local server (VS Code Live Server).');
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
    });

    // Animation Loop
    const animate = () => {
        requestAnimationFrame(animate);

        if (model) {
            // Smooth rotation based on mouse position
            targetRotationX = mouseY * 0.5;
            targetRotationY = mouseX * 0.5;

            // Interpolate current rotation towards target
            model.rotation.x += 0.05 * (targetRotationX - model.rotation.x);
            model.rotation.y += 0.05 * (targetRotationY - model.rotation.y + (Math.PI / 4));

            // Debug output for first few frames
            // if (Math.random() < 0.01) console.log('Model rotation:', model.rotation.y);
        }

        if (debugCube) {
            debugCube.rotation.x += 0.01;
            debugCube.rotation.y += 0.01;
        }

        renderer.render(scene, camera);
    };

    animate();

    // Handle Window Resize
    window.addEventListener('resize', () => {
        if (container) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    });
} else {
    console.error('3D Container #pyramid-container NOT found!');
}
