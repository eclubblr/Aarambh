// Aarambh.js - Integrated WebGL Fluid Simulation with Wave Effects
// Based on Pavel Dobryakov's WebGL Fluid Simulation
'use strict';

(function(){
  // Aarambh-fluid.js: Do not manage the mobile menu here — menu is controlled centrally in Aarambh.js

  // ===== FLUID SIMULATION =====
  const canvas = document.getElementById('bgCanvas');
  if(!canvas) return;

  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if(!gl){
    console.warn('WebGL not supported');
    return;
  }

  let config = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 1,
    VELOCITY_DISSIPATION: 0.2,
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 30,
    SPLAT_RADIUS: 0.08,
    SPLAT_FORCE: 6000,
    SHADING: true,
    COLORFUL: false,
    PAUSED: false,
    BACK_COLOR: { r: 5, g: 4, b: 7 },
  };

  let pointers = [];
  let splatStack = [];

  function pointerPrototype(){
    this.id = -1;
    this.texcoordX = 0;
    this.texcoordY = 0;
    this.prevTexcoordX = 0;
    this.prevTexcoordY = 0;
    this.deltaX = 0;
    this.deltaY = 0;
    this.down = false;
    this.moved = false;
    this.color = {r: 0.85, g: 0.65, b: 0.15};
  }

  pointers.push(new pointerPrototype());

  function resizeCanvas(){
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if(canvas.width !== w || canvas.height !== h){
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      return true;
    }
    return false;
  }

  function isMobile(){
    return /Mobi|Android/i.test(navigator.userAgent);
  }

  function getResolution(res){
    const aspectRatio = canvas.width / canvas.height;
    let min = Math.round(res);
    let max = Math.round(res * aspectRatio);
    if(canvas.width > canvas.height)
      return {width: max, height: min};
    return {width: min, height: max};
  }

  function hashCode(s){
    if(s.length === 0) return 0;
    let hash = 0;
    for(let i = 0; i < s.length; i++){
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  function compileShader(type, source, keywords){
    if(keywords){
      let keywordString = '';
      keywords.forEach(kw => { keywordString += '#define ' + kw + '\n'; });
      source = keywordString + source;
    }
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
      console.error('Shader error:', gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  function createProgram(vs, fs){
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
      console.error('Program error:', gl.getProgramInfoLog(program));
    }
    return program;
  }

  function getUniforms(program){
    const uniforms = [];
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for(let i = 0; i < count; i++){
      const name = gl.getActiveUniform(program, i).name;
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    return uniforms;
  }

  // Vertex shaders
  const baseVS = compileShader(gl.VERTEX_SHADER, `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;
    void main(){
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `);

  // Fragment shaders (simplified)
  const clearFS = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;
    void main(){
      gl_FragColor = value * texture2D(uTexture, vUv);
    }
  `);

  const splatFS = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main(){
      vec2 p = vUv - point.xy;
      p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      vec3 base = texture2D(uTarget, vUv).xyz;
      gl_FragColor = vec4(base + splat, 1.0);
    }
  `);

  const displayFS = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    void main(){
      gl_FragColor = texture2D(uTexture, vUv);
    }
  `);

  class Program {
    constructor(vs, fs){
      this.program = createProgram(vs, fs);
      this.uniforms = getUniforms(this.program);
    }
    bind(){ gl.useProgram(this.program); }
  }

  const clearProgram = new Program(baseVS, clearFS);
  const splatProgram = new Program(baseVS, splatFS);
  const displayProgram = new Program(baseVS, displayFS);

  function createFBO(w, h){
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    return { texture, fbo, width: w, height: h, attach(id){
      gl.activeTexture(gl.TEXTURE0 + id);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return id;
    }};
  }

  function blit(target){
    if(target === null){
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  // Setup buffers
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  let dye;
  let dyeRes = getResolution(config.DYE_RESOLUTION);
  dye = { read: createFBO(dyeRes.width, dyeRes.height), write: createFBO(dyeRes.width, dyeRes.height), swap(){
    [this.read, this.write] = [this.write, this.read];
  }};

  gl.clearColor(0, 0, 0, 1);

  function splat(x, y, dx, dy, color){
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProgram.uniforms.point, x, y);
    gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0);
    gl.uniform1f(splatProgram.uniforms.radius, Math.max(canvas.width, canvas.height) * config.SPLAT_RADIUS / 100);
    blit(dye.write);
    dye.swap();

    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    blit(dye.write);
    dye.swap();
  }

  function splatPointer(p){
    let dx = p.deltaX * config.SPLAT_FORCE;
    let dy = p.deltaY * config.SPLAT_FORCE;
    splat(p.texcoordX, p.texcoordY, dx, dy, p.color);
  }

  function generateColor(){
    return { r: 0.85, g: 0.65, b: 0.15 };
  }

  function render(){
    displayProgram.bind();
    gl.uniform1i(displayProgram.uniforms.uTexture, dye.read.attach(0));
    blit(null);
  }

  // Mouse/touch events
  canvas.addEventListener('mousedown', e => {
    let posX = e.offsetX * (window.devicePixelRatio || 1);
    let posY = e.offsetY * (window.devicePixelRatio || 1);
    let p = pointers[0];
    p.id = -1;
    p.down = true;
    p.moved = false;
    p.texcoordX = posX / canvas.width;
    p.texcoordY = 1 - posY / canvas.height;
    p.prevTexcoordX = p.texcoordX;
    p.prevTexcoordY = p.texcoordY;
    p.deltaX = 0;
    p.deltaY = 0;
    p.color = generateColor();
  });

  canvas.addEventListener('mousemove', e => {
    let p = pointers[0];
    if(!p.down) return;
    let posX = e.offsetX * (window.devicePixelRatio || 1);
    let posY = e.offsetY * (window.devicePixelRatio || 1);
    p.prevTexcoordX = p.texcoordX;
    p.prevTexcoordY = p.texcoordY;
    p.texcoordX = posX / canvas.width;
    p.texcoordY = 1 - posY / canvas.height;
    p.deltaX = p.texcoordX - p.prevTexcoordX;
    p.deltaY = p.texcoordY - p.prevTexcoordY;
    p.moved = Math.abs(p.deltaX) > 0 || Math.abs(p.deltaY) > 0;
  });

  window.addEventListener('mouseup', () => {
    pointers[0].down = false;
  });

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const touches = e.targetTouches;
    while(touches.length >= pointers.length) pointers.push(new pointerPrototype());
    for(let i = 0; i < touches.length; i++){
      let posX = touches[i].pageX * (window.devicePixelRatio || 1);
      let posY = touches[i].pageY * (window.devicePixelRatio || 1);
      let p = pointers[i + 1];
      p.id = touches[i].identifier;
      p.down = true;
      p.texcoordX = posX / canvas.width;
      p.texcoordY = 1 - posY / canvas.height;
      p.prevTexcoordX = p.texcoordX;
      p.prevTexcoordY = p.texcoordY;
      p.color = generateColor();
    }
  });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const touches = e.targetTouches;
    for(let i = 0; i < touches.length; i++){
      let p = pointers[i + 1];
      if(!p.down) continue;
      let posX = touches[i].pageX * (window.devicePixelRatio || 1);
      let posY = touches[i].pageY * (window.devicePixelRatio || 1);
      p.prevTexcoordX = p.texcoordX;
      p.prevTexcoordY = p.texcoordY;
      p.texcoordX = posX / canvas.width;
      p.texcoordY = 1 - posY / canvas.height;
      p.deltaX = p.texcoordX - p.prevTexcoordX;
      p.deltaY = p.texcoordY - p.prevTexcoordY;
      p.moved = Math.abs(p.deltaX) > 0 || Math.abs(p.deltaY) > 0;
    }
  });

  window.addEventListener('touchend', e => {
    const touches = e.changedTouches;
    for(let i = 0; i < touches.length; i++){
      let p = pointers.find(pp => pp.id === touches[i].identifier);
      if(p) p.down = false;
    }
  });

  // Main loop
  function update(){
    if(resizeCanvas()){
      dyeRes = getResolution(config.DYE_RESOLUTION);
      dye.read = createFBO(dyeRes.width, dyeRes.height);
      dye.write = createFBO(dyeRes.width, dyeRes.height);
    }

    pointers.forEach(p => {
      if(p.moved){ p.moved = false; splatPointer(p); }
    });

    render();
    requestAnimationFrame(update);
  }

  resizeCanvas();
  update();
})();
