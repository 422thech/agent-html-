/* Small no-pan orbit controller. Angles are radians; update() takes seconds. */
function createOrbitController(options) {
  const { THREE, camera, element, onChange } = options;
  if (!THREE || !camera || !element) {
    throw new TypeError("THREE, camera and element are required.");
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
  const limits = Object.assign({
    minElevation: 20 * Math.PI / 180,
    maxElevation: 75 * Math.PI / 180,
    minZoom: 0.78,
    maxZoom: 2,
    damping: 11,
    rotationSpeed: 1,
    zoomSpeed: 0.0014
  }, options.limits || {});
  const center = new THREE.Vector3(0, 0, 0);
  function setCenter(value) {
    if (Array.isArray(value)) {
      center.set(finite(value[0], center.x), finite(value[1], center.y), finite(value[2], center.z));
    } else if (value) {
      center.set(finite(value.x, center.x), finite(value.y, center.y), finite(value.z, center.z));
    }
  }
  setCenter(options.target);

  const state = {
    radius: Math.max(0.01, finite(options.radius, 35)),
    elevation: clamp(finite(options.elevation, Math.PI / 4), limits.minElevation, limits.maxElevation),
    azimuth: finite(options.azimuth, Math.PI / 5),
    zoom: clamp(finite(options.zoom, 1), limits.minZoom, limits.maxZoom)
  };
  const goal = { ...state };
  const pointers = new Map();
  const listeners = [];
  const prior = {
    touchAction: element.style.touchAction,
    userSelect: element.style.userSelect,
    cursor: element.style.cursor,
    tabIndex: element.getAttribute("tabindex"),
    label: element.getAttribute("aria-label")
  };
  let width = Math.max(1, element.clientWidth || 800);
  let height = Math.max(1, element.clientHeight || 600);
  let disposed = false;

  element.style.touchAction = "none";
  element.style.userSelect = "none";
  element.style.cursor = "grab";
  if (prior.tabIndex === null) element.setAttribute("tabindex", "0");
  if (prior.label === null) {
    element.setAttribute("aria-label", "广西民族大学南门微缩模型，可拖动旋转、滚轮缩放，也可用方向键和加减键操作");
  }

  function getState() {
    return { ...state, target: { x: center.x, y: center.y, z: center.z } };
  }

  function apply() {
    const distance = camera.isOrthographicCamera ? state.radius : state.radius / state.zoom;
    const horizontal = distance * Math.cos(state.elevation);
    camera.position.set(
      center.x + horizontal * Math.sin(state.azimuth),
      center.y + distance * Math.sin(state.elevation),
      center.z + horizontal * Math.cos(state.azimuth)
    );
    if (camera.isOrthographicCamera && camera.zoom !== state.zoom) {
      camera.zoom = state.zoom;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(center);
    camera.updateMatrixWorld();
    if (onChange) onChange(camera, getState());
  }

  function update(dt = 1 / 60) {
    if (disposed) return false;
    const amount = 1 - Math.exp(-limits.damping * clamp(finite(dt, 1 / 60), 0, 0.1));
    let changed = false;
    for (const property of ["azimuth", "elevation", "zoom", "radius"]) {
      const difference = goal[property] - state[property];
      if (difference === 0) continue;
      state[property] = Math.abs(difference) < 0.000001
        ? goal[property]
        : state[property] + difference * amount;
      changed = true;
    }
    if (changed) apply();
    return changed;
  }

  function resize(newWidth, newHeight) {
    width = Math.max(1, finite(newWidth, width));
    height = Math.max(1, finite(newHeight, height));
  }

  function setState(partial = {}) {
    if (disposed) return;
    goal.radius = Math.max(0.01, finite(partial.radius, goal.radius));
    goal.elevation = clamp(finite(partial.elevation, goal.elevation), limits.minElevation, limits.maxElevation);
    goal.azimuth = finite(partial.azimuth, goal.azimuth);
    goal.zoom = clamp(finite(partial.zoom, goal.zoom), limits.minZoom, limits.maxZoom);
    if (partial.target) setCenter(partial.target);
    Object.assign(state, goal);
    apply();
  }

  function setZoom(value) {
    goal.zoom = clamp(value, limits.minZoom, limits.maxZoom);
  }

  function pairDistance() {
    const points = [...pointers.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  function pointerDown(event) {
    if (event.pointerType !== "touch" && event.button !== 0) return;
    event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    element.setPointerCapture(event.pointerId);
    element.style.cursor = "grabbing";
    element.focus({ preventScroll: true });
  }

  function pointerMove(event) {
    const old = pointers.get(event.pointerId);
    if (!old) return;
    event.preventDefault();
    const before = pairDistance();
    const dx = event.clientX - old.x;
    const dy = event.clientY - old.y;
    old.x = event.clientX;
    old.y = event.clientY;
    if (pointers.size >= 2) {
      const after = pairDistance();
      if (before > 4 && after > 4) setZoom(goal.zoom * after / before);
    } else {
      const scale = 2 * Math.PI * limits.rotationSpeed / Math.max(320, Math.min(width, height));
      goal.azimuth -= dx * scale;
      goal.elevation = clamp(goal.elevation + dy * scale, limits.minElevation, limits.maxElevation);
    }
  }

  function pointerEnd(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    if (!pointers.size) element.style.cursor = "grab";
  }

  function wheel(event) {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
    const delta = clamp(event.deltaY * unit, -1000, 1000);
    setZoom(goal.zoom * Math.exp(-delta * limits.zoomSpeed));
  }

  function keyDown(event) {
    const step = Math.PI / 24;
    switch (event.key) {
      case "ArrowLeft": goal.azimuth -= step; break;
      case "ArrowRight": goal.azimuth += step; break;
      case "ArrowUp": goal.elevation = clamp(goal.elevation + step, limits.minElevation, limits.maxElevation); break;
      case "ArrowDown": goal.elevation = clamp(goal.elevation - step, limits.minElevation, limits.maxElevation); break;
      case "+": case "=": setZoom(goal.zoom * 1.12); break;
      case "-": case "_": setZoom(goal.zoom / 1.12); break;
      default: return;
    }
    event.preventDefault();
  }

  function releaseAll() {
    for (const pointerId of [...pointers.keys()]) pointerEnd({ pointerId });
  }

  function listen(target, name, handler, configuration) {
    target.addEventListener(name, handler, configuration);
    listeners.push(() => target.removeEventListener(name, handler, configuration));
  }

  listen(element, "pointerdown", pointerDown, { passive: false });
  listen(element, "pointermove", pointerMove, { passive: false });
  listen(element, "pointerup", pointerEnd);
  listen(element, "pointercancel", pointerEnd);
  listen(element, "lostpointercapture", pointerEnd);
  listen(element, "wheel", wheel, { passive: false });
  listen(element, "keydown", keyDown);
  if (element.ownerDocument && element.ownerDocument.defaultView) {
    listen(element.ownerDocument.defaultView, "blur", releaseAll);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const remove of listeners) remove();
    releaseAll();
    element.style.touchAction = prior.touchAction;
    element.style.userSelect = prior.userSelect;
    element.style.cursor = prior.cursor;
    if (prior.tabIndex === null) element.removeAttribute("tabindex");
    else element.setAttribute("tabindex", prior.tabIndex);
    if (prior.label === null) element.removeAttribute("aria-label");
    else element.setAttribute("aria-label", prior.label);
  }

  apply();
  return { update, resize, dispose, getState, setState, limits };
}
globalThis.createOrbitController = createOrbitController;
