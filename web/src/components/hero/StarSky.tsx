"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Sphere,
  Vector3,
  WebGLRenderer,
} from "three";
import { buildSky } from "./sky-geometry";

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntro;
  uniform float uT1;
  uniform float uT2;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uMotion;
  attribute vec3 aOrigin;
  attribute vec3 aHist;
  attribute vec3 aPull;
  attribute float aRating;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;

  vec3 ratingColor(float r) {
    if (r < 1.5) return vec3(0.898, 0.282, 0.302);
    if (r < 2.5) return vec3(0.886, 0.443, 0.114);
    if (r < 3.5) return vec3(0.64, 0.67, 0.72);
    if (r < 4.5) return vec3(0.96, 0.78, 0.3);
    return vec3(0.878, 0.631, 0.0);
  }

  float ease(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    float d = aSeed * 0.35;
    float i = ease(clamp((uIntro - d * 0.7) / 0.755, 0.0, 1.0));
    float a = ease(clamp((uT1 - d) / 0.65, 0.0, 1.0));
    float b = ease(clamp((uT2 - d) / 0.65, 0.0, 1.0));
    float low = 1.0 - step(2.5, aRating);

    vec3 p = mix(aOrigin, position, i);
    p = mix(p, aHist, a);
    vec3 pulled = aPull;
    float ang = uTime * 0.12 * low * uMotion;
    pulled.xy = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * pulled.xy;
    p = mix(p, pulled, b);
    p += uMotion * 0.03 * vec3(sin(uTime * 0.7 + aSeed * 40.0), cos(uTime * 0.6 + aSeed * 31.0), sin(uTime * 0.5 + aSeed * 17.0));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float twinkle = mix(1.0, 0.85 + 0.15 * sin(uTime * 2.1 + aSeed * 60.0), uMotion);
    float size = uSize * (1.0 + low * b * 0.7);
    gl_PointSize = size * twinkle * uPixelRatio * (10.0 / -mv.z);

    vec3 ink = vec3(0.055, 0.067, 0.086);
    vColor = mix(ink, ratingColor(aRating), a);
    vAlpha = mix(1.0, mix(0.1, 1.0, low), b) * (0.15 + 0.85 * i);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float edge = 1.0 - smoothstep(0.32, 0.5, d);
    gl_FragColor = vec4(vColor, vAlpha * edge);
  }
`;

export type SkyProgress = { t1: number; t2: number };

const FOV = 45;
const CAMERA_Z = 10;

export default function StarSky({
  ratings,
  progress,
  reduceMotion,
}: {
  ratings: number[];
  progress: RefObject<SkyProgress>;
  reduceMotion: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    } catch {
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    el.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
    camera.position.z = CAMERA_Z;

    const sky = buildSky(ratings);
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(sky.star, 3));
    geometry.setAttribute("aOrigin", new BufferAttribute(sky.origin, 3));
    geometry.setAttribute("aHist", new BufferAttribute(sky.hist, 3));
    geometry.setAttribute("aPull", new BufferAttribute(sky.pull, 3));
    geometry.setAttribute("aRating", new BufferAttribute(sky.rating, 1));
    geometry.setAttribute("aSeed", new BufferAttribute(sky.seed, 1));
    geometry.boundingSphere = new Sphere(new Vector3(), 20);

    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uIntro: { value: reduceMotion ? 1 : 0 },
        uT1: { value: 0 },
        uT2: { value: 0 },
        uPixelRatio: { value: dpr },
        uSize: { value: 4.6 },
        uMotion: { value: reduceMotion ? 0 : 1 },
      },
    });

    const points = new Points(geometry, material);
    points.frustumCulled = false;
    const group = new Group();
    group.add(points);
    scene.add(group);

    const view = { width: 1, height: 1 };
    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      view.height = 2 * Math.tan((FOV * Math.PI) / 360) * CAMERA_Z;
      view.width = view.height * camera.aspect;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const pointer = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let visible = true;
    let raf = 0;
    let last = performance.now();
    const u = material.uniforms;

    const introStart = performance.now();
    let lastActive = performance.now();
    const markActive = () => {
      lastActive = performance.now();
    };
    window.addEventListener("scroll", markActive, { passive: true });
    window.addEventListener("pointermove", markActive, { passive: true });

    const frame = (now: number) => {
      raf = 0;
      const settled = u.uIntro.value >= 1 && now - lastActive > 600;
      if (settled && now - last < 32) {
        if (visible && !document.hidden) raf = requestAnimationFrame(frame);
        return;
      }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      u.uTime.value += dt;
      if (u.uIntro.value < 1) u.uIntro.value = Math.min(1, (now - introStart) / 2200);
      const target = progress.current ?? { t1: 0, t2: 0 };
      const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 6);
      u.uT1.value += (target.t1 - u.uT1.value) * k;
      u.uT2.value += (target.t2 - u.uT2.value) * k;

      const wide = view.width > 9;
      group.position.x = (wide ? view.width * 0.2 : 0) + u.uT1.value * (1 - u.uT2.value) * (wide ? 0.55 : 0);
      group.position.y = wide ? 0 : view.height * 0.29;
      group.scale.setScalar(wide ? 1 : Math.min(0.64, view.width / 11));
      if (!reduceMotion) {
        group.rotation.y += (pointer.x * 0.18 - group.rotation.y) * k;
        group.rotation.x += (-pointer.y * 0.1 - group.rotation.x) * k;
      }
      renderer.render(scene, camera);
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (!raf && visible && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        start();
      },
      { rootMargin: "100px" },
    );
    io.observe(el);
    const onVisibility = () => start();
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", markActive);
      window.removeEventListener("pointermove", markActive);
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [ratings, progress, reduceMotion]);

  return <div ref={wrap} className="absolute inset-0" aria-hidden="true" />;
}
