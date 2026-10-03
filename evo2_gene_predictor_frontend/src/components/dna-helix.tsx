"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  Color,
  type Group,
  type InstancedMesh,
  Matrix4,
  Quaternion,
  TubeGeometry,
  Vector3,
} from "three";

// First 42 bases of the BRCA1 coding sequence (Met-Asp-Leu-Ser-Ala-Leu-Arg...)
const SEQUENCE = "ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTC";
const COMPLEMENT: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };

// Same base colors as the sequence viewer legend
const BASE_COLORS: Record<string, string> = {
  A: "#dc2626",
  T: "#2563eb",
  G: "#16a34a",
  C: "#d97706",
};

// --primary and --chart-2 from globals.css, as sRGB for three.js
const STRAND_COLORS = {
  light: ["#7235d0", "#c35dd9"],
  dark: ["#b27fff", "#e17af8"],
} as const;

// B-DNA proportions, with the helix radius as the unit of length
const RADIUS = 1;
const RISE_PER_BASE = 0.34;
const TWIST_PER_BASE = (2 * Math.PI) / 10.5;
// Strands sit less than half a turn apart, which gives the major and minor grooves
const STRAND_OFFSET = 2.3;
const BACKBONE_RADIUS = 0.11;
const RUNG_RADIUS = 0.065;

// Right-handed helix around the y axis
function backbonePoint(index: number, phase: number) {
  const angle = index * TWIST_PER_BASE + phase;
  return new Vector3(
    RADIUS * Math.sin(angle),
    (index - (SEQUENCE.length - 1) / 2) * RISE_PER_BASE,
    RADIUS * Math.cos(angle),
  );
}

function buildHelix() {
  const backbones = [0, STRAND_OFFSET].map((phase) => {
    const points: Vector3[] = [];
    for (let i = -1; i <= SEQUENCE.length; i += 0.25) {
      points.push(backbonePoint(i, phase));
    }
    return new TubeGeometry(
      new CatmullRomCurve3(points),
      points.length * 2,
      BACKBONE_RADIUS,
      12,
    );
  });

  // Each base pair is two half rungs meeting in the middle, one per base
  const up = new Vector3(0, 1, 0);
  const rungs = [...SEQUENCE].flatMap((base, i) => {
    const start = backbonePoint(i, 0);
    const end = backbonePoint(i, STRAND_OFFSET);
    const middle = start.clone().lerp(end, 0.5);

    return [
      { from: start, base },
      { from: end, base: COMPLEMENT[base]! },
    ].map(({ from, base }) => {
      const direction = middle.clone().sub(from);
      return {
        color: BASE_COLORS[base]!,
        matrix: new Matrix4().compose(
          from.clone().lerp(middle, 0.5),
          new Quaternion().setFromUnitVectors(
            up,
            direction.clone().normalize(),
          ),
          new Vector3(1, direction.length(), 1),
        ),
      };
    });
  });

  return { backbones, rungs };
}

function Helix({
  strandColors,
  spin,
}: {
  strandColors: readonly [string, string];
  spin: boolean;
}) {
  const spinGroup = useRef<Group>(null);
  const rungMesh = useRef<InstancedMesh>(null);
  const { backbones, rungs } = useMemo(buildHelix, []);

  useLayoutEffect(() => {
    const mesh = rungMesh.current;
    if (!mesh) return;

    const color = new Color();
    rungs.forEach((rung, i) => {
      mesh.setMatrixAt(i, rung.matrix);
      mesh.setColorAt(i, color.set(rung.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [rungs]);

  useFrame((_, delta) => {
    if (spin && spinGroup.current) spinGroup.current.rotation.y += delta * 0.45;
  });

  return (
    // Lay the helix on its side, tilted slightly toward the viewer
    <group rotation={[0.25, 0, -Math.PI / 2]}>
      <group ref={spinGroup}>
        {backbones.map((geometry, i) => (
          <mesh key={i} geometry={geometry}>
            <meshStandardMaterial
              color={strandColors[i]}
              roughness={0.35}
              metalness={0.15}
            />
          </mesh>
        ))}
        <instancedMesh
          ref={rungMesh}
          args={[undefined, undefined, rungs.length]}
        >
          <cylinderGeometry args={[RUNG_RADIUS, RUNG_RADIUS, 1, 10]} />
          <meshStandardMaterial roughness={0.5} />
        </instancedMesh>
      </group>
    </group>
  );
}

export function DnaHelix() {
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  return (
    <Canvas
      flat
      dpr={[1, 2]}
      // A long lens from far away keeps the ends of the helix from looking stretched
      camera={{ position: [0, 0, 13], fov: 14 }}
      frameloop={reduceMotion ? "demand" : "always"}
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={1.3} />
      <directionalLight position={[2, 6, 6]} intensity={1.9} />
      <directionalLight position={[-4, -3, 2]} intensity={0.5} />
      <Helix
        strandColors={
          STRAND_COLORS[resolvedTheme === "dark" ? "dark" : "light"]
        }
        spin={!reduceMotion}
      />
    </Canvas>
  );
}
