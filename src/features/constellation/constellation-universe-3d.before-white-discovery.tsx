import { GLView } from 'expo-gl';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as THREE from 'three';

type SubjectId =
  | 'vedic'
  | 'arts'
  | 'tech';

type Subject = {
  id: SubjectId;
  title: string;
  subtitle: string;
  color: string;
  position: [number, number, number];
};

type Discovery = {
  id: string;
  subjectId: SubjectId;
  title: string;
  subtitle: string;
  route: string;
  color: string;
  position: [number, number, number];
  unlocked: boolean;
};

const SUBJECTS: Subject[] = [
  {
    id: 'vedic',
    title: 'VEDIC MATHS',
    subtitle: 'Numbers · Patterns · Mental Power',
    color: '#B9A7F5',
    position: [-3.0, 1.2, -0.5],
  },
  {
    id: 'arts',
    title: 'ARTS',
    subtitle: 'Drawing · Create · Imagine',
    color: '#F3A6C7',
    position: [3.0, -1.2, 0.3],
  },
  {
    id: 'tech',
    title: 'TECH',
    subtitle: 'Build · Machines · Invent',
    color: '#8FC9E8',
    position: [3.0, 1.2, 0.1],
  },
];

const DISCOVERIES: Discovery[] = [
  {
    id: 'vedic-maths',
    subjectId: 'vedic',
    title: 'NUMBER SENSE',
    subtitle: 'Discover patterns in numbers',
    route: '/play/vedic-escape',
    color: '#B9A7F5',
    position: [-3.0, 1.2, -0.5],
    unlocked: true,
  },

  {
    id: 'drawing-shapes',
    subjectId: 'arts',
    title: 'ARTS',
    subtitle: 'Draw · Observe · Create',
    route: '/play/arts-drawing',
    color: '#F3A6C7',
    position: [3.0, -1.2, 0.3],
    unlocked: true,
  },

  {
    id: 'tech-build',
    subjectId: 'tech',
    title: 'TECH',
    subtitle: 'Build · Machines · Invent',
    route: '/play/manufacturing',
    color: '#8FC9E8',
    position: [3.0, 1.2, 0.1],
    unlocked: true,
  },
];


/*
 * ---------------------------------------------------------
 * RANDOM CONSTELLATION POSITION SYSTEM
 * ---------------------------------------------------------
 *
 * Each subject owns a region of the universe.
 * Stars are scattered organically inside that region.
 *
 * The random generator is seeded, so positions stay stable
 * between reloads.
 */

const CONSTELLATION_CENTERS: Record<
  SubjectId,
  [number, number, number]
> = {
  vedic: [-4.2, 2.2, 0],
  arts: [-4.2, -2.4, 0.3],
  tech: [3.6, 2.0, 0.1],
};

/*
 * Every subject gets its own constellation zone.
 *
 * These are normalized attachment points around the
 * central subject structure.
 *
 * Small deterministic variations make them feel organic
 * without destroying the constellation shape.
 */

const CONSTELLATION_PATTERNS: Record<
  SubjectId,
  [number, number, number][]
> = {
  vedic: [
    [0, -1.7, 0],
    [-1.5, -0.6, 0.15],
    [1.5, -0.6, -0.1],
    [-1.2, 1.0, 0.2],
    [1.3, 1.1, -0.15],
    [0, 1.8, 0.05],
  ],




  arts: [
    [-1.8, 0.9, 0],
    [-0.8, 1.7, 0.15],
    [0.8, 1.5, -0.1],
    [1.8, 0.4, 0.1],
    [0.7, -1.5, 0],
    [-1.2, -1.3, 0.2],
  ],

  tech: [
    [0, 1.7, 0],
    [-1.5, 0.7, 0.15],
    [1.5, 0.7, -0.1],
    [-1.2, -0.9, 0.2],
    [1.2, -0.9, -0.15],
    [0, -1.7, 0.05],
  ],




};

function seededRandom(seed: number) {
  const value =
    Math.sin(seed * 127.731) *
    43758.5453123;

  return value - Math.floor(value);
}

function getDiscoveryPosition(
  discovery: Discovery,
  subjectIndex: number,
): [number, number, number] {
  const center =
    CONSTELLATION_CENTERS[
      discovery.subjectId
    ];

  const pattern =
    CONSTELLATION_PATTERNS[
      discovery.subjectId
    ];

  const point =
    pattern[
      subjectIndex % pattern.length
    ];

  /*
   * Very small deterministic variation.
   * This keeps the designed constellation shape
   * while preventing it from looking perfectly artificial.
   */
  const randomX =
    (seededRandom(subjectIndex * 71 + 11) - 0.5) *
    0.28;

  const randomY =
    (seededRandom(subjectIndex * 113 + 17) - 0.5) *
    0.28;

  const randomZ =
    (seededRandom(subjectIndex * 157 + 23) - 0.5) *
    0.35;

  return [
    center[0] + point[0] + randomX,
    center[1] + point[1] + randomY,
    center[2] + point[2] + randomZ,
  ];
}

const SUBJECT_CONNECTIONS: [number, number][] = [];

function createBackgroundStars() {
  const positions: number[] = [];

  for (let i = 0; i < 850; i++) {
    const radius = 7 + Math.random() * 9;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
    );
  }

  return positions;
}

function addLine(
  group: THREE.Group,
  a: THREE.Vector3,
  b: THREE.Vector3,
  color: string,
  opacity: number,
) {
  const geometry = new THREE.BufferGeometry().setFromPoints([a, b]);

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  });

  const line = new THREE.Line(geometry, material);
  group.add(line);

  return line;
}

function addGlowRing(
  group: THREE.Group,
  radius: number,
  color: string,
  rotation: [number, number, number],
  opacity: number,
) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.012, 8, 64),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
    }),
  );

  ring.rotation.set(...rotation);
  group.add(ring);

  return ring;
}

/*
 * VEDIC MATHS
 *
 * Geometric crystal + number rays.
 */
function createVedicStructure(
  discovery: Discovery,
  index: number,
) {
  const group = new THREE.Group();

  const crystal = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.25, 1),
    new THREE.MeshBasicMaterial({
      color: discovery.color,
      transparent: true,
      opacity: 0.95,
    }),
  );

  group.add(crystal);

  addGlowRing(
    group,
    0.42,
    discovery.color,
    [Math.PI / 2, 0, 0],
    0.7,
  );

  addGlowRing(
    group,
    0.62,
    discovery.color,
    [0, Math.PI / 3, 0],
    0.45,
  );

  const rayCount = 8 + (index % 3) * 2;

  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2;

    addLine(
      group,
      new THREE.Vector3(
        Math.cos(angle) * 0.15,
        Math.sin(angle) * 0.15,
        0,
      ),
      new THREE.Vector3(
        Math.cos(angle) * 0.78,
        Math.sin(angle) * 0.78,
        0,
      ),
      discovery.color,
      0.35,
    );
  }

  for (let i = 0; i < 4; i++) {
    const node = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.065, 0),
      new THREE.MeshBasicMaterial({
        color: discovery.color,
      }),
    );

    const angle = (i / 4) * Math.PI * 2;

    node.position.set(
      Math.cos(angle) * 0.7,
      Math.sin(angle) * 0.7,
      0,
    );

    group.add(node);
  }

  return group;
}

/*
 * NUTRITION
 *
 * Organic molecule structure.
 */
function createNutritionStructure(discovery: Discovery) {
  const group = new THREE.Group();

  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 16, 16),
    new THREE.MeshBasicMaterial({
      color: discovery.color,
      transparent: true,
      opacity: 0.9,
    }),
  );

  group.add(center);

  const atoms = 6;

  for (let i = 0; i < atoms; i++) {
    const angle = (i / atoms) * Math.PI * 2;

    const atom = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 10),
      new THREE.MeshBasicMaterial({
        color: discovery.color,
      }),
    );

    atom.position.set(
      Math.cos(angle) * 0.72,
      Math.sin(angle) * 0.72,
      Math.sin(angle * 2) * 0.18,
    );

    group.add(atom);

    addLine(
      group,
      new THREE.Vector3(0, 0, 0),
      atom.position,
      discovery.color,
      0.3,
    );
  }

  addGlowRing(
    group,
    0.95,
    discovery.color,
    [Math.PI / 2, 0.3, 0],
    0.2,
  );

  return group;
}

/*
 * PHYSICS
 *
 * Atom + force field.
 */
function createPhysicsStructure(discovery: Discovery) {
  const group = new THREE.Group();

  const nucleus = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 12),
    new THREE.MeshBasicMaterial({
      color: discovery.color,
    }),
  );

  group.add(nucleus);

  const ring1 = addGlowRing(
    group,
    0.55,
    discovery.color,
    [Math.PI / 2, 0, 0],
    0.65,
  );

  const ring2 = addGlowRing(
    group,
    0.75,
    discovery.color,
    [0, Math.PI / 2, 0],
    0.45,
  );

  const ring3 = addGlowRing(
    group,
    0.95,
    discovery.color,
    [Math.PI / 4, Math.PI / 4, 0],
    0.25,
  );

  ring1.userData.orbit = true;
  ring2.userData.orbit = true;
  ring3.userData.orbit = true;

  return group;
}

/*
 * ELECTRONICS
 *
 * Circuit-board-like structure.
 */
function createElectronicsStructure(discovery: Discovery) {
  const group = new THREE.Group();

  const center = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.28, 0.28),
    new THREE.MeshBasicMaterial({
      color: discovery.color,
    }),
  );

  group.add(center);

  const points = [
    [-0.8, 0.45, 0],
    [0.8, 0.45, 0],
    [-0.8, -0.45, 0],
    [0.8, -0.45, 0],
  ];

  points.forEach(([x, y, z]) => {
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshBasicMaterial({
        color: discovery.color,
      }),
    );

    node.position.set(x, y, z);
    group.add(node);

    addLine(
      group,
      new THREE.Vector3(0, 0, 0),
      node.position,
      discovery.color,
      0.5,
    );
  });

  const circuitRing = addGlowRing(
    group,
    0.95,
    discovery.color,
    [Math.PI / 2, 0, 0],
    0.25,
  );

  circuitRing.scale.y = 0.65;

  return group;
}

/*
 * DRAWING
 *
 * Layered geometric canvas.
 */
function createDrawingStructure(discovery: Discovery) {
  const group = new THREE.Group();

  const shapes = [
    new THREE.TorusGeometry(0.7, 0.025, 6, 5),
    new THREE.TorusGeometry(0.48, 0.02, 6, 4),
    new THREE.TorusGeometry(0.25, 0.018, 6, 3),
  ];

  shapes.forEach((geometry, index) => {
    const shape = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: discovery.color,
        transparent: true,
        opacity: 0.75 - index * 0.12,
      }),
    );

    shape.rotation.x = index * 0.5;
    shape.rotation.y = index * 0.35;

    group.add(shape);
  });

  return group;
}

/*
 * MUSIC
 *
 * Waveform / resonance structure.
 */
function createMusicStructure(discovery: Discovery) {
  const group = new THREE.Group();

  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= 24; i++) {
    const x = -0.9 + (i / 24) * 1.8;
    const y = Math.sin(i * 0.7) * 0.3;
    points.push(new THREE.Vector3(x, y, 0));
  }

  const geometry =
    new THREE.BufferGeometry().setFromPoints(points);

  const waveform = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: discovery.color,
      transparent: true,
      opacity: 0.95,
    }),
  );

  group.add(waveform);

  addGlowRing(
    group,
    0.85,
    discovery.color,
    [Math.PI / 2, 0, 0],
    0.25,
  );

  return group;
}

function createManufacturingStructure(
  discovery: Discovery,
) {
  const group = new THREE.Group();

  const gearLarge = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.12, 10, 16),
    new THREE.MeshBasicMaterial({
      color: discovery.color,
      transparent: true,
      opacity: 0.95,
    }),
  );

  const gearSmall = new THREE.Mesh(
    new THREE.TorusGeometry(0.30, 0.09, 10, 16),
    new THREE.MeshBasicMaterial({
      color: discovery.color,
      transparent: true,
      opacity: 0.85,
    }),
  );

  gearSmall.position.set(0.62, -0.42, 0);

  group.add(gearLarge);
  group.add(gearSmall);

  const center = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.16, 0.16),
    new THREE.MeshBasicMaterial({
      color: '#FFE0C7',
    }),
  );

  gearLarge.add(center);

  addGlowRing(
    group,
    0.95,
    discovery.color,
    [Math.PI / 2, 0, 0],
    0.28,
  );

  return group;
}

function createHumanityStructure(
  discovery: Discovery,
) {
  const group = new THREE.Group();

  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 16),
    new THREE.MeshBasicMaterial({
      color: discovery.color,
      transparent: true,
      opacity: 0.95,
    }),
  );

  group.add(center);

  const people = [
    [-0.65, 0.35, 0],
    [0.65, 0.35, 0],
    [-0.55, -0.55, 0],
    [0.55, -0.55, 0],
  ];

  people.forEach(([x, y, z]) => {
    const person = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 10),
      new THREE.MeshBasicMaterial({
        color: discovery.color,
      }),
    );

    person.position.set(x, y, z);
    group.add(person);

    addLine(
      group,
      new THREE.Vector3(0, 0, 0),
      person.position,
      discovery.color,
      0.38,
    );
  });

  addGlowRing(
    group,
    0.92,
    discovery.color,
    [Math.PI / 2, 0, 0],
    0.3,
  );

  return group;
}

function createDiscoveryStructure(
  discovery: Discovery,
  index: number,
) {
  switch (discovery.subjectId) {
    case 'vedic':
      return createVedicStructure(discovery, index);

    case 'arts':
      return createDrawingStructure(discovery);

    case 'tech':
      return createManufacturingStructure(discovery);

    default:
      return createVedicStructure(discovery, index);
  }
}


type CreativeStarProps = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  onMove: (id: string, x: number, y: number) => void;
};

function CreativeStar({
  id,
  x,
  y,
  width,
  height,
  color,
  onMove,
}: CreativeStarProps) {
  const startRef = useRef({
    x,
    y,
    touchX: 0,
    touchY: 0,
  });

  const twinkle = useRef(
    new Animated.Value(0.7),
  ).current;

  useEffect(() => {
    const index = Number(
      id.replace('creative-star-', ''),
    );

    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(index * 160),

        Animated.timing(twinkle, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),

        Animated.timing(twinkle, {
          toValue: 0.35,
          duration: 850,
          useNativeDriver: true,
        }),

        Animated.timing(twinkle, {
          toValue: 0.72,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [id, twinkle]);

  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,

        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (event) => {
          startRef.current = {
            x,
            y,
            touchX: event.nativeEvent.pageX,
            touchY: event.nativeEvent.pageY,
          };
        },

        onPanResponderMove: (event) => {
          if (width <= 0 || height <= 0) {
            return;
          }

          const dx =
            event.nativeEvent.pageX -
            startRef.current.touchX;

          const dy =
            event.nativeEvent.pageY -
            startRef.current.touchY;

          const nextX =
            startRef.current.x +
            (dx / width) * 100;

          const nextY =
            startRef.current.y +
            (dy / height) * 100;

          onMove(
            id,
            Math.max(5, Math.min(95, nextX)),
            Math.max(12, Math.min(88, nextY)),
          );
        },
      }),
    [height, id, onMove, width, x, y],
  );

  const diamondScale = twinkle.interpolate({
    inputRange: [0.35, 1],
    outputRange: [0.82, 1.18],
  });

  const glowScale = twinkle.interpolate({
    inputRange: [0.35, 1],
    outputRange: [0.75, 1.35],
  });

  return (
    <View
      style={[
        styles.creativeStar,
        {
          left: `${x}%`,
          top: `${y}%`,
        },
      ]}
      {...responder.panHandlers}
      accessibilityRole="button"
      accessibilityLabel="Creative star"
    >
      <Animated.View
        style={[
          styles.creativeStarGlow,
          {
            backgroundColor: `${color}35`,
            opacity: twinkle,
            transform: [
              {
                scale: glowScale,
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.creativeStarDiamond,
          {
            backgroundColor: color,
            shadowColor: color,
            opacity: twinkle,
            transform: [
              {
                rotate: '45deg',
              },
              {
                scale: diamondScale,
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.creativeStarSpark,
          {
            opacity: twinkle,
          },
        ]}
      />
    </View>
  );
}
export function ConstellationUniverse3D() {
  const router = useRouter();

  const [selectedDiscovery, setSelectedDiscovery] =
    useState<Discovery>(DISCOVERIES[0]);

  const [selectedSubject, setSelectedSubject] =
    useState<SubjectId>('vedic');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const universeRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number | null>(null);

  const structuresRef = useRef<THREE.Group[]>([]);

  const constellationNodesRef =
    useRef<THREE.Mesh[]>([]);

  const draggingNodeRef =
    useRef<THREE.Mesh | null>(null);

  const [screenTargets, setScreenTargets] = useState<
    {
      id: string;
      x: number;
      y: number;
      visible: boolean;
    }[]
  >([]);

  const [freeStars, setFreeStars] = useState<
    {
      id: string;
      x: number;
      y: number;
    }[]
  >(() => {
    const stars = [
      [49.1, 49.0],
      [50.9, 49.1],
      [48.8, 50.5],
      [51.2, 50.4],
      [49.2, 51.3],
      [50.8, 51.5],
      [50.0, 48.4],
    ];

    return stars.map(([x, y], index) => ({
      id: `creative-star-${index}`,
      x,
      y,
    }));
  });

  const screenSizeRef = useRef({
    width: 0,
    height: 0,
  });

  const rotationRef = useRef({
    x: 0,
    y: 0,
  });

  const selectedRef = useRef<Discovery>(DISCOVERIES[0]);

  useEffect(() => {
    selectedRef.current = selectedDiscovery;
  }, [selectedDiscovery]);

  const creativeStarColors = [
    '#DCCBFF',
    '#FFD1DC',
    '#BFE8FF',
    '#C8F0D8',
    '#FFE2A8',
    '#F6C7E8',
    '#C9D7FF',
    '#D8F0C2',
    '#FFD0B5',
    '#C8E8F2',
    '#E3C7FF',
    '#F5D6A6',
  ];

  const moveCreativeStar = React.useCallback(
    (id: string, x: number, y: number) => {
      setFreeStars((current) =>
        current.map((star) =>
          star.id === id
            ? {
                ...star,
                x,
                y,
              }
            : star,
        ),
      );
    },
    [],
  );

  const selectDiscovery = (discoveryId: string) => {
    const discovery = DISCOVERIES.find(
      (item) => item.id === discoveryId,
    );

    if (!discovery) {
      return;
    }

    setSelectedDiscovery(discovery);
    setSelectedSubject(discovery.subjectId);
  };

  // eslint-disable-next-line react-hooks/refs
  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (event) => {
        const camera = cameraRef.current;
        const width = screenSizeRef.current.width;
        const height = screenSizeRef.current.height;

        draggingNodeRef.current = null;

        if (
          !camera ||
          width <= 0 ||
          height <= 0
        ) {
          return;
        }

        const pointer = new THREE.Vector2(
          (event.nativeEvent.locationX / width) * 2 - 1,
          -(event.nativeEvent.locationY / height) * 2 + 1,
        );

        const raycaster = new THREE.Raycaster();

        raycaster.setFromCamera(
          pointer,
          camera,
        );

        const hits =
          raycaster.intersectObjects(
            constellationNodesRef.current,
            false,
          );

        const hit = hits.find(
          (item) =>
            item.object.userData.constellationNode &&
            item.object.userData.draggable,
        );

        if (hit) {
          draggingNodeRef.current =
            hit.object as THREE.Mesh;
        }
      },

      onPanResponderMove: (_event, gesture) => {
        const node = draggingNodeRef.current;

        if (node) {
          const camera = cameraRef.current;
          const height = screenSizeRef.current.height;

          if (camera && height > 0) {
            const depth = 10;

            const worldHeight =
              2 *
              Math.tan(
                THREE.MathUtils.degToRad(
                  camera.fov,
                ) / 2,
              ) *
              depth;

            const worldPerPixel =
              worldHeight / height;

            node.position.x +=
              gesture.dx * worldPerPixel * 0.65;

            node.position.y -=
              gesture.dy * worldPerPixel * 0.65;
          }

          return;
        }

        if (
          Math.abs(gesture.dx) > 2 ||
          Math.abs(gesture.dy) > 2
        ) {
          rotationRef.current.y +=
            gesture.dx * 0.004;

          rotationRef.current.x +=
            gesture.dy * 0.004;

          rotationRef.current.x = Math.max(
            -0.8,
            Math.min(0.8, rotationRef.current.x),
          );
        }
      },

      onPanResponderRelease: () => {
        draggingNodeRef.current = null;
      },

      onPanResponderTerminate: () => {
        draggingNodeRef.current = null;
      },
    }),
  );

  useEffect(() => {
    const updateScreenTargets = () => {
      const camera = cameraRef.current;
      const universe = universeRef.current;

      const width = screenSizeRef.current.width;
      const height = screenSizeRef.current.height;

      if (
        !camera ||
        !universe ||
        width <= 0 ||
        height <= 0
      ) {
        return;
      }

      universe.updateMatrixWorld(true);

      const targets = structuresRef.current.map(
        (structure) => {
          const discoveryId =
            structure.userData.discoveryId;

          const worldPosition =
            new THREE.Vector3();

          structure.getWorldPosition(
            worldPosition,
          );

          const projected =
            worldPosition.clone().project(camera);

          const visible =
            projected.z >= -1 &&
            projected.z <= 1 &&
            projected.x >= -1.15 &&
            projected.x <= 1.15 &&
            projected.y >= -1.15 &&
            projected.y <= 1.15;

          return {
            id: discoveryId,
            x: (projected.x + 1) * 0.5 * width,
            y: (1 - projected.y) * 0.5 * height,
            visible,
          };
        },
      );

      setScreenTargets(targets);
    };

    const interval = setInterval(
      updateScreenTargets,
      50,
    );

    updateScreenTargets();

    return () => {
      clearInterval(interval);
    };
  }, []);

  const openLesson = () => {
    if (selectedDiscovery.subjectId === 'vedic') {
      router.push('/games/vedic');
      return;
    }

    if (selectedDiscovery.subjectId === 'arts') {
      router.push('/games/arts');
      return;
    }

    if (selectedDiscovery.subjectId === 'tech') {
      router.push('/games/manufacturing');
      return;
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      rendererRef.current?.dispose();
    };
  }, []);

  const onContextCreate = async (gl: any) => {
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;

    const scene = new THREE.Scene();

    scene.background = new THREE.Color('#17152E');

    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      55,
      width / height,
      0.1,
      100,
    );

    camera.position.set(0, 0, 10);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      context: gl,
      antialias: true,
    });

    renderer.setSize(width, height, false);
    rendererRef.current = renderer;

    const universe = new THREE.Group();

    universeRef.current = universe;
    scene.add(universe);

    /*
     * BACKGROUND
     */

    const backgroundGeometry = new THREE.BufferGeometry();

    backgroundGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        createBackgroundStars(),
        3,
      ),
    );

    const backgroundMaterial = new THREE.PointsMaterial({
      color: '#C9C3F6',
      size: 0.025,
      transparent: true,
      opacity: 0.55,
    });

    const backgroundStars = new THREE.Points(
      backgroundGeometry,
      backgroundMaterial,
    );

    universe.add(backgroundStars);

    /*
     * SUBJECT DISCOVERY STRUCTURES
     */

    const structures: THREE.Group[] = [];

    DISCOVERIES.forEach((discovery, index) => {
      const structure = createDiscoveryStructure(
        discovery,
        index,
      );

      const sameSubjectDiscoveries =
        DISCOVERIES.filter(
          (item) =>
            item.subjectId ===
            discovery.subjectId,
        );

      const subjectIndex =
        sameSubjectDiscoveries.findIndex(
          (item) =>
            item.id === discovery.id,
        );

      const randomPosition =
        getDiscoveryPosition(
          discovery,
          Math.max(subjectIndex, 0),
        );

      if (!structure) {
        return;
      }

      structure.position.set(
        randomPosition[0],
        randomPosition[1],
        randomPosition[2],
      );

      structure.userData.discoveryId = discovery.id;

      universe.add(structure);
      structures.push(structure);

    });

    structuresRef.current = structures;

    /*
     * SEPARATE SUBJECT CONSTELLATIONS
     *
     * Each subject gets its own small constellation.
     * The center is the existing lesson/discovery structure.
     * The surrounding nodes are visual constellation stars.
     */

    const constellationGroup = new THREE.Group();

    const constellationLayouts: Record<
      SubjectId,
      [number, number, number][]
    > = {
      vedic: [
        [-4.0, 1.9, 0],
        [-3.1, 2.8, -0.3],
        [-2.2, 1.9, 0.2],
        [-3.0, 1.0, -0.2],
        [-2.0, 0.9, 0.3],
        [-4.1, 0.8, -0.3],
      ],

    
    
    
      arts: [
        [-4.2, -2.3, 0.3],
        [-5.1, -1.6, 0],
        [-3.3, -1.3, -0.2],
        [-5.2, -2.9, 0.1],
        [-3.2, -3.1, -0.1],
        [-4.2, -3.7, 0.2],
      ],

      tech: [
        [3.5, 2.0, 0.1],
        [2.5, 2.9, -0.2],
        [4.7, 2.8, 0.15],
        [2.3, 1.1, 0],
        [4.8, 1.0, -0.2],
        [3.5, 0.2, 0.1],
      ],
    };

    const subjectColors: Record<SubjectId, string> = {
      vedic: '#B9A7F5',
      arts: '#F3A6C7',
      tech: '#8FC9E8',
    };

    const nodeColors: Record<SubjectId, string[]> = {
      vedic: [
        '#FFF3D6',
        '#B9A7F5',
        '#DDEBFF',
        '#FFF9F0',
        '#FFF0C7',
        '#FFF9F0',
      ],
      arts: [
        '#FFF3D6',
        '#F3A6C7',
        '#FFF0C7',
        '#FFF9F0',
        '#E6F5EC',
        '#FFF9F0',
      ],
      tech: [
        '#FFF9F0',
        '#8FC9E8',
        '#E8DFFF',
        '#FFF9F0',
        '#F2C96D',
        '#FFF9F0',
      ],
    };

    Object.entries(constellationLayouts).forEach(
      ([subjectId, points]) => {
        const color = subjectColors[subjectId as SubjectId];

        const constellationNodes: THREE.Mesh[] = [];

        points.forEach((point, index) => {
          const isCenter = index === 0;

          const node = new THREE.Mesh(
            new THREE.SphereGeometry(
              isCenter ? 0.18 : 0.045,
              12,
              12,
            ),
            new THREE.MeshBasicMaterial({
              color: isCenter
                ? color
                : nodeColors[subjectId as SubjectId][index],
              transparent: true,
              opacity: isCenter ? 0.95 : 0.92,
            }),
          );

          node.userData.constellationNode = true;
          node.userData.subjectId = subjectId;
          node.userData.nodeIndex = index;
          node.userData.draggable = !isCenter;

          node.position.set(
            point[0],
            point[1],
            point[2],
          );

          constellationGroup.add(node);
          constellationNodes.push(node);
          constellationNodesRef.current.push(node);
        });

        for (
          let i = 1;
          i < constellationNodes.length;
          i++
        ) {
          addLine(
            constellationGroup,
            constellationNodes[0].position,
            constellationNodes[i].position,
            color,
            0.24,
          );
        }

        for (
          let i = 1;
          i < constellationNodes.length - 1;
          i++
        ) {
          if (i % 2 === 0) {
            addLine(
              constellationGroup,
              constellationNodes[i].position,
              constellationNodes[i + 1].position,
              color,
              0.14,
            );
          }
        }
      },
    );

    universe.add(constellationGroup);

    /*
     * SUBJECT CONNECTIONS
     */

    const connectionGroup = new THREE.Group();

    SUBJECT_CONNECTIONS.forEach(([a, b]) => {
      const first = SUBJECTS[a];
      const second = SUBJECTS[b];

      addLine(
        connectionGroup,
        new THREE.Vector3(...first.position),
        new THREE.Vector3(...second.position),
        '#5D7195',
        0.11,
      );
    });

    universe.add(connectionGroup);

    /*
     * CENTRAL CONSTELLATION CORE
     */

    const centerGroup = new THREE.Group();

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.28, 1),
      new THREE.MeshBasicMaterial({
        color: '#FFF3D6',
        transparent: true,
        opacity: 0.9,
      }),
    );

    centerGroup.add(core);

    const centerRing1 = addGlowRing(
      centerGroup,
      0.75,
      '#BBD2F4',
      [Math.PI / 2, 0, 0],
      0.3,
    );

    const centerRing2 = addGlowRing(
      centerGroup,
      1.2,
      '#789BCF',
      [0, Math.PI / 3, 0],
      0.16,
    );

    const centerRing3 = addGlowRing(
      centerGroup,
      1.6,
      '#617FAE',
      [Math.PI / 3, Math.PI / 4, 0],
      0.1,
    );

    universe.add(centerGroup);

    /*
     * ANIMATION
     */

    const clock = new THREE.Clock();

    const animate = () => {
      animationRef.current =
        requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      universe.rotation.x = rotationRef.current.x;
      universe.rotation.y = rotationRef.current.y;

      backgroundStars.rotation.y = time * 0.002;

      structures.forEach((structure, index) => {
        structure.rotation.z +=
          0.001 +
          index * 0.00015;

        structure.rotation.y +=
          0.0005 +
          index * 0.00008;

        const discovery = DISCOVERIES[index];

        const selected =
          selectedRef.current.id === discovery.id;

        const pulse =
          1 +
          Math.sin(time * 1.5 + index) * 0.04;

        structure.scale.setScalar(
          selected
            ? pulse * 1.25
            : pulse,
        );


      });

      centerRing1.rotation.z = time * 0.02;
      centerRing2.rotation.z = -time * 0.014;
      centerRing3.rotation.z = time * 0.009;

      core.scale.setScalar(
        1 + Math.sin(time * 1.6) * 0.08,
      );

      renderer.render(scene, camera);

      gl.endFrameEXP();
    };

    animate();
  };

  const selectedSubjectData =
    SUBJECTS.find(
      (subject) =>
        subject.id === selectedSubject,
    ) ?? SUBJECTS[0];

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        screenSizeRef.current = {
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        };
      }}
    >
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
        {...panResponder.panHandlers}
      />

      <View
        pointerEvents="none"
        style={styles.topInfo}
      >
        <Text style={styles.title}>
          CONSTELLATION
        </Text>

        <Text
          style={[
            styles.subject,
            {
              color: selectedSubjectData.color,
            },
          ]}
        >
          {selectedSubjectData.title}
        </Text>

        <Text style={styles.level}>
          DISCOVER · LEARN · CREATE
        </Text>
      </View>

      <View
        pointerEvents="none"
        style={styles.legend}
      >
        <Text style={styles.legendText}>
          DRAG TO EXPLORE
        </Text>

        <Text style={styles.legendText}>
          TAP A STAR TO DISCOVER
        </Text>
      </View>

      <View
        pointerEvents="box-none"
        style={styles.freeStarLayer}
      >
        {freeStars.map((star) => (
          <CreativeStar
            key={star.id}
            id={star.id}
            x={star.x}
            y={star.y}
            width={screenSizeRef.current.width}
            height={screenSizeRef.current.height}
            color={
              creativeStarColors[
                Number(
                  star.id.replace('creative-star-', ''),
                ) % creativeStarColors.length
              ]
            }
            onMove={moveCreativeStar}
          />
        ))}

        {freeStars.map((star, index) => (
          <View
            key={`pleiades-name-${star.id}`}
            pointerEvents="none"
            style={[
              styles.srName,
              {
                left: `${star.x}%`,
                top: `${star.y}%`,
                transform: [
                  {
                    translateX:
                      index % 2 === 0 ? -30 : -24,
                  },
                  {
                    translateY:
                      index < 2 ? -17 : 9,
                  },
                ],
              },
            ]}
          >
            <Text style={styles.srNameText}>
              {
                [
                  'VASHISTHA',
                  'MARICHI',
                  'PULASTYA',
                  'PULAHA',
                  'ATRI',
                  'ANGIRAS',
                  'KRATU',
                ][index]
              }
            </Text>
          </View>
        ))}

        {freeStars.map((star, index) => (
          <View
            key={`sr-name-${star.id}`}
            pointerEvents="none"
            style={[
              styles.srName,
              {
                left: `${star.x}%`,
                top: `${star.y}%`,
                transform: [
                  {
                    translateX:
                      index % 2 === 0 ? -30 : -24,
                  },
                  {
                    translateY:
                      index < 2 ? -17 : 9,
                  },
                ],
              },
            ]}
          >
            <Text style={styles.srNameText}>
              {
                [
                  'VASHISTHA',
                  'MARICHI',
                  'PULASTYA',
                  'PULAHA',
                  'ATRI',
                  'ANGIRAS',
                  'KRATU',
                ][index]
              }
            </Text>
          </View>
        ))}
      </View>

      <View
        pointerEvents="box-none"
        style={styles.starTouchLayer}
      >
        {screenTargets.map((target) => {
          if (!target.visible) {
            return null;
          }

          const discovery =
            DISCOVERIES.find(
              (item) => item.id === target.id,
            );

          if (!discovery) {
            return null;
          }

          const selected =
            selectedDiscovery.id === discovery.id;

          return (
            <Pressable
              key={discovery.id}
              onPress={() =>
                selectDiscovery(discovery.id)
              }
              style={[
                styles.starHitButton,
                {
                  left: target.x - 38,
                  top: target.y - 38,
                  width: selected ? 82 : 76,
                  height: selected ? 82 : 76,
                  borderColor:
                    discovery.color,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                `Discover ${discovery.title}`
              }
            >
            </Pressable>
          );
        })}
      </View>

      <View
        pointerEvents="none"
        style={styles.selectionInfo}
      >
        <View
          style={[
            styles.selectionDot,
            {
              backgroundColor:
                selectedDiscovery.color,
            },
          ]}
        />

        <View style={styles.selectionTextBox}>
          <Text style={styles.selectionTitle}>
            {selectedDiscovery.title}
          </Text>

          <Text style={styles.selectionSubtitle}>
            {selectedDiscovery.subtitle}
          </Text>

          <Text style={styles.selectionStatus}>
            {selectedDiscovery.unlocked
              ? ' DISCOVERED · READY TO EXPLORE'
              : '✧ MYSTERIOUS · WAITING TO BE DISCOVERED'}
          </Text>
        </View>
      </View>

      <View
        pointerEvents="box-none"
        style={styles.bottomContainer}
      >
        <Pressable
          onPress={openLesson}
          style={({ pressed }) => [
            styles.exploreButton,
            {
              backgroundColor:
                selectedDiscovery.color,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text style={styles.exploreButtonText}>
            EXPLORE {selectedDiscovery.title}
          </Text>
        </Pressable>

        <Text style={styles.hint}>
          {selectedDiscovery.unlocked
            ? 'Enter this discovery and begin the lesson'
            : 'Explore the structure to begin discovering it'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#17152E',
  },

  glView: {
    flex: 1,
  },

  touchLayer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },

  starTouchLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },

  starHitButton: {
    position: 'absolute',
    borderWidth: 0,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  freeStarLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 25,
  },

  creativeStar: {
    position: 'absolute',
    width: 18,
    height: 18,
    marginLeft: -9,
    marginTop: -9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  creativeStarGlow: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  creativeStarDiamond: {
    width: 3,
    height: 3,
    borderRadius: 1,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },

  creativeStarSpark: {
    position: 'absolute',
    width: 1.5,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: '#FFF9F0',
  },

  srName: {
    position: 'absolute',
    zIndex: 27,
    minWidth: 55,
    alignItems: 'center',
  },

  srNameText: {
    fontSize: 5,
    letterSpacing: 0.7,
    fontWeight: '700',
    color: '#FFF9F0',
    opacity: 0.72,
  },


  topInfo: {
    position: 'absolute',
    top: 38,
    left: 24,
    right: 24,
    alignItems: 'center',
  },

  title: {
    color: '#FFF3D6',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 5,
  },

  subject: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 6,
  },

  level: {
    color: '#A9A4C2',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 5,
  },

  legend: {
    position: 'absolute',
    right: 18,
    top: 42,
    alignItems: 'flex-end',
  },

  legendText: {
    color: '#8F89AA',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },

  selectionInfo: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 145,
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectionDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    marginRight: 12,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },

  selectionTextBox: {
    flex: 1,
  },

  selectionTitle: {
    color: '#FFF9F0',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 1,
  },

  selectionSubtitle: {
    color: '#D8D2EA',
    fontSize: 12,
    marginTop: 3,
  },

  selectionStatus: {
    color: '#9D97B5',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 6,
  },

  bottomContainer: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 30,
    alignItems: 'center',
  },

  exploreButton: {
    borderRadius: 18,
    minHeight: 54,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 480,
  },

  exploreButtonText: {
    color: '#211D38',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },

  hint: {
    color: '#918BAA',
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
  },
});
