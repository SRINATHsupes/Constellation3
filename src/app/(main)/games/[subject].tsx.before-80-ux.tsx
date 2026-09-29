import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type SubjectId = 'vedic' | 'arts' | 'manufacturing';

type LevelState = 'completed' | 'current' | 'locked';

type Level = {
  number: number;
  title: string;
  description: string;
  object: string;
  concept: string;
  state: LevelState;
  route?: string;
};

type SubjectConfig = {
  title: string;
  subtitle: string;
  accent: string;
  accentLight: string;
  levels: {
    title: string;
    description: string;
    object: string;
    concept: string;
    route?: string;
  }[];
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MAP_WIDTH = Math.max(SCREEN_WIDTH, 360);
const MAP_HEIGHT = 920;

const SUBJECTS: Record<SubjectId, SubjectConfig> = {
  vedic: {
    title: 'Vedic Maths',
    subtitle: 'Numbers · Patterns · Mental Power',
    accent: '#9B83D7',
    accentLight: '#DCD1F0',

    levels: [
      {
        title: 'Number Sense',
        description: 'See numbers as patterns, not just symbols.',
        object: '123',
        concept: 'NUMBER PATTERN',
        route: '/play/vedic-escape?level=1',
      },
      {
        title: 'Number Patterns',
        description: 'Discover structure hidden inside numbers.',
        object: '×',
        concept: 'MULTIPLY',
        route: '/play/vedic-escape?level=2',
      },
      {
        title: 'Fast Calculation',
        description: 'Use clever patterns to calculate mentally.',
        object: '÷',
        concept: 'DIVIDE',
        route: '/play/vedic-escape?level=3',
      },
      {
        title: 'Vedic Challenge',
        description: 'Combine the ideas from the journey.',
        object: '∑',
        concept: 'COMBINE',
        route: '/play/vedic-escape?level=4',
      },
      {
        title: 'Number Escape',
        description: 'Use mathematical thinking to escape the room.',
        object: '99',
        concept: 'MASTER',
      },
    ],
  },

  arts: {
    title: 'Drawing & Arts',
    subtitle: 'Draw · Shape · Imagine',
    accent: '#E98FA3',
    accentLight: '#F4CBD5',

    levels: [
      {
        title: 'Lines & Shapes',
        description: 'Turn simple marks into shapes and pictures.',
        object: '✎',
        concept: 'LINE',
        route: '/play/arts-drawing',
      },
      {
        title: 'Shape Builder',
        description: 'Combine shapes to create something new.',
        object: '△',
        concept: 'SHAPE',
        route: '/play/arts-drawing?level=2',
      },
      {
        title: 'Color Workshop',
        description: 'Explore color, balance and visual patterns.',
        object: '●',
        concept: 'COLOR',
        route: '/play/arts-drawing?level=3',
      },
      {
        title: 'Picture Puzzle',
        description: 'Solve a visual puzzle using imagination.',
        object: '◯',
        concept: 'COMPOSE',
        route: '/play/arts-drawing?level=4',
      },
      {
        title: 'Creative Challenge',
        description: 'Bring your ideas together into a final creation.',
        object: '✦',
        concept: 'CREATE',
        route: '/play/arts-drawing?level=5',
      },
    ],
  },

  manufacturing: {
    title: 'Manufacturing',
    subtitle: 'Machines · Motion · Engineering',
    accent: '#D99461',
    accentLight: '#F0C8AA',

    levels: [
      {
        title: 'Gear Machine',
        description: 'Transfer motion from one gear to another.',
        object: '⚙',
        concept: 'MOTION',
        route: '/play/manufacturing?level=1',
      },
      {
        title: 'Bicycle Workshop',
        description: 'Build a bicycle from separate parts.',
        object: '🚲',
        concept: 'ASSEMBLY',
        route: '/play/manufacturing?level=2',
      },
      {
        title: 'Motor Lab',
        description: 'Turn electrical energy into mechanical motion.',
        object: '◉',
        concept: 'ENERGY',
        route: '/play/manufacturing?level=3',
      },
      {
        title: 'Motorcycle Workshop',
        description: 'Assemble a complete working machine.',
        object: '🏍',
        concept: 'SYSTEM',
        route: '/play/manufacturing?level=4',
      },
      {
        title: 'Advanced Robot Lab',
        description: 'Build an articulated robotic machine.',
        object: '🤖',
        concept: 'ROBOTICS',
        route: '/play/manufacturing?level=5',
      },
    ],
  },
};

function createLevels(
  subject: SubjectId,
  completedLevel: number,
): Level[] {
  return SUBJECTS[subject].levels.map((item, index) => {
    const number = index + 1;

    let state: LevelState;

    if (number <= completedLevel) {
      state = 'completed';
    } else if (number === completedLevel + 1) {
      state = 'current';
    } else {
      state = 'locked';
    }

    return {
      number,
      title: item.title,
      description: item.description,
      object: item.object,
      concept: item.concept,
      route: item.route,
      state,
    };
  });
}

/*
 * Organic knowledge-map positions.
 *
 * These deliberately avoid a left-right staircase.
 * The route feels like a concept flowing through a subject world.
 */
const LEVEL_POINTS = [
  { x: MAP_WIDTH * 0.28, y: 135 },
  { x: MAP_WIDTH * 0.62, y: 285 },
  { x: MAP_WIDTH * 0.42, y: 455 },
  { x: MAP_WIDTH * 0.72, y: 625 },
  { x: MAP_WIDTH * 0.47, y: 780 },
];

function getMainPaths() {
  const p = LEVEL_POINTS;

  return [
    `M ${p[0].x} ${p[0].y}
     C ${MAP_WIDTH * 0.37} 175,
       ${MAP_WIDTH * 0.57} 220,
       ${p[1].x} ${p[1].y}`,

    `M ${p[1].x} ${p[1].y}
     C ${MAP_WIDTH * 0.66} 350,
       ${MAP_WIDTH * 0.49} 390,
       ${p[2].x} ${p[2].y}`,

    `M ${p[2].x} ${p[2].y}
     C ${MAP_WIDTH * 0.38} 520,
       ${MAP_WIDTH * 0.61} 555,
       ${p[3].x} ${p[3].y}`,

    `M ${p[3].x} ${p[3].y}
     C ${MAP_WIDTH * 0.67} 690,
       ${MAP_WIDTH * 0.54} 735,
       ${p[4].x} ${p[4].y}`,
  ];
}

function SubjectObject({
  subject,
  object,
  accent,
}: {
  subject: SubjectId;
  object: string;
  accent: string;
}) {
  return (
    <View style={styles.objectCore}>
      <Text
        style={[
          styles.objectText,
          {
            color: accent,
            fontSize:
              subject === 'manufacturing' ? 34 : 31,
          },
        ]}
      >
        {object}
      </Text>
    </View>
  );
}

type WorldMark = {
  text: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  rotation: number;
};

const WORLD_MARKS: Record<SubjectId, WorldMark[]> = {
  vedic: [
    { text: '97 × 96', x: 8, y: 8, size: 13, opacity: 0.24, rotation: -7 },
    { text: '100 − 3', x: 70, y: 6, size: 12, opacity: 0.20, rotation: 5 },
    { text: '× ÷ + −', x: 43, y: 16, size: 14, opacity: 0.16, rotation: -3 },
    { text: '3 × 4', x: 79, y: 22, size: 11, opacity: 0.22, rotation: 8 },
    { text: '93 | 12', x: 7, y: 29, size: 12, opacity: 0.18, rotation: 4 },
    { text: 'NUMBER', x: 48, y: 30, size: 10, opacity: 0.15, rotation: -5 },
    { text: '96 × 94', x: 74, y: 39, size: 13, opacity: 0.19, rotation: -6 },
    { text: '100 − 7', x: 5, y: 47, size: 11, opacity: 0.17, rotation: 7 },
    { text: '× 9', x: 87, y: 53, size: 13, opacity: 0.20, rotation: -4 },
    { text: 'PATTERN', x: 14, y: 58, size: 10, opacity: 0.18, rotation: -8 },
    { text: '95 × 93', x: 72, y: 63, size: 12, opacity: 0.18, rotation: 5 },
    { text: '∑', x: 13, y: 70, size: 22, opacity: 0.13, rotation: -9 },
    { text: '94 × 92', x: 48, y: 75, size: 12, opacity: 0.17, rotation: 4 },
    { text: 'MENTAL MATH', x: 72, y: 82, size: 9, opacity: 0.15, rotation: -5 },
    { text: '÷ 8', x: 18, y: 88, size: 12, opacity: 0.18, rotation: 6 },
    { text: '123', x: 82, y: 91, size: 15, opacity: 0.17, rotation: -7 },
  ],

  arts: [
    { text: 'LINE', x: 8, y: 7, size: 12, opacity: 0.20, rotation: -8 },
    { text: 'COLOR', x: 72, y: 8, size: 11, opacity: 0.19, rotation: 6 },
    { text: '△', x: 44, y: 14, size: 19, opacity: 0.15, rotation: -6 },
    { text: 'SHAPE', x: 79, y: 21, size: 10, opacity: 0.18, rotation: 8 },
    { text: '✎', x: 8, y: 27, size: 22, opacity: 0.14, rotation: -12 },
    { text: 'CREATE', x: 45, y: 28, size: 10, opacity: 0.16, rotation: 4 },
    { text: '◯', x: 87, y: 34, size: 22, opacity: 0.14, rotation: 7 },
    { text: '🦋', x: 13, y: 39, size: 16, opacity: 0.15, rotation: -7 },
    { text: 'DRAW', x: 73, y: 43, size: 11, opacity: 0.17, rotation: -5 },
    { text: '△ ◯', x: 6, y: 52, size: 13, opacity: 0.15, rotation: 6 },
    { text: 'PALETTE', x: 77, y: 57, size: 9, opacity: 0.17, rotation: 5 },
    { text: '🐦', x: 16, y: 64, size: 15, opacity: 0.14, rotation: 8 },
    { text: 'FORM', x: 47, y: 67, size: 11, opacity: 0.17, rotation: -6 },
    { text: '✦', x: 87, y: 71, size: 20, opacity: 0.14, rotation: -8 },
    { text: '🦋', x: 8, y: 79, size: 15, opacity: 0.13, rotation: 6 },
    { text: 'IMAGINE', x: 67, y: 82, size: 10, opacity: 0.16, rotation: -4 },
    { text: '🐰', x: 86, y: 90, size: 15, opacity: 0.14, rotation: 7 },
  ],

  manufacturing: [
    { text: 'MOTION', x: 7, y: 7, size: 11, opacity: 0.20, rotation: -7 },
    { text: '⚙', x: 78, y: 7, size: 20, opacity: 0.14, rotation: 8 },
    { text: 'BUILD', x: 43, y: 13, size: 11, opacity: 0.17, rotation: 4 },
    { text: 'ENERGY', x: 81, y: 19, size: 10, opacity: 0.18, rotation: -5 },
    { text: '🔩', x: 10, y: 25, size: 17, opacity: 0.14, rotation: -10 },
    { text: 'ASSEMBLY', x: 46, y: 28, size: 9, opacity: 0.17, rotation: -4 },
    { text: 'MOTOR', x: 77, y: 31, size: 11, opacity: 0.19, rotation: 7 },
    { text: '⚙', x: 13, y: 38, size: 19, opacity: 0.13, rotation: -6 },
    { text: 'SYSTEM', x: 72, y: 43, size: 10, opacity: 0.18, rotation: -7 },
    { text: 'ROBOT', x: 7, y: 51, size: 11, opacity: 0.17, rotation: 5 },
    { text: '⚙', x: 88, y: 52, size: 21, opacity: 0.12, rotation: 12 },
    { text: 'MOTION', x: 15, y: 59, size: 9, opacity: 0.16, rotation: -5 },
    { text: 'BUILD', x: 48, y: 64, size: 11, opacity: 0.17, rotation: 6 },
    { text: '🔩', x: 83, y: 67, size: 16, opacity: 0.13, rotation: -8 },
    { text: 'MACHINE', x: 8, y: 74, size: 10, opacity: 0.18, rotation: 7 },
    { text: 'MOTOR', x: 53, y: 78, size: 10, opacity: 0.16, rotation: -5 },
    { text: '🤖', x: 84, y: 84, size: 16, opacity: 0.13, rotation: 6 },
    { text: 'SYSTEM', x: 20, y: 90, size: 9, opacity: 0.15, rotation: -6 },
  ],
};

type WorldObject = {
  text: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  rotation: number;
};

const WORLD_OBJECTS: Record<SubjectId, WorldObject[]> = {
  vedic: [
    { text: '🧮', x: 17, y: 14, size: 22, opacity: 0.22, rotation: -7 },
    { text: '⌁', x: 88, y: 27, size: 26, opacity: 0.18, rotation: 8 },
    { text: '∴', x: 18, y: 44, size: 25, opacity: 0.18, rotation: -5 },
    { text: '▢', x: 86, y: 46, size: 22, opacity: 0.16, rotation: 6 },
    { text: '123', x: 10, y: 67, size: 18, opacity: 0.22, rotation: -8 },
    { text: '◉', x: 89, y: 76, size: 22, opacity: 0.17, rotation: 5 },
    { text: '∑', x: 29, y: 84, size: 25, opacity: 0.17, rotation: 7 },
  ],

  arts: [
    { text: '🎨', x: 15, y: 15, size: 22, opacity: 0.22, rotation: -8 },
    { text: '🖌', x: 87, y: 25, size: 22, opacity: 0.20, rotation: 8 },
    { text: '🦋', x: 13, y: 47, size: 20, opacity: 0.20, rotation: -6 },
    { text: '◯', x: 87, y: 48, size: 25, opacity: 0.18, rotation: 7 },
    { text: '✂', x: 18, y: 67, size: 21, opacity: 0.19, rotation: -8 },
    { text: '🖍', x: 86, y: 73, size: 21, opacity: 0.19, rotation: 6 },
    { text: '🐦', x: 27, y: 88, size: 18, opacity: 0.18, rotation: 5 },
  ],

  manufacturing: [
    { text: '⚙', x: 15, y: 14, size: 25, opacity: 0.22, rotation: -8 },
    { text: '🔧', x: 87, y: 24, size: 21, opacity: 0.21, rotation: 8 },
    { text: '🤖', x: 13, y: 44, size: 21, opacity: 0.19, rotation: -5 },
    { text: '⚙', x: 88, y: 48, size: 27, opacity: 0.17, rotation: 8 },
    { text: '🔩', x: 17, y: 67, size: 21, opacity: 0.20, rotation: -7 },
    { text: '🚲', x: 86, y: 73, size: 21, opacity: 0.18, rotation: 5 },
    { text: '⚙', x: 29, y: 88, size: 24, opacity: 0.17, rotation: 6 },
  ],
};

function WorldObjects({
  subject,
}: {
  subject: SubjectId;
}) {
  return (
    <View pointerEvents="none" style={styles.worldObjectLayer}>
      {WORLD_OBJECTS[subject].map((object, index) => (
        <Text
          key={`${subject}-object-${index}`}
          style={[
            styles.worldObject,
            {
              left: `${object.x}%`,
              top: `${object.y}%`,
              fontSize: object.size,
              opacity: object.opacity,
              transform: [
                { rotate: `${object.rotation}deg` },
              ],
            },
          ]}
        >
          {object.text}
        </Text>
      ))}
    </View>
  );
}

function WorldTypography({
  subject,
  accent,
}: {
  subject: SubjectId;
  accent: string;
}) {
  return (
    <View pointerEvents="none" style={styles.worldLayer}>
      {WORLD_MARKS[subject].map((mark, index) => (
        <Text
          key={`${subject}-world-${index}`}
          style={[
            styles.worldMark,
            {
              left: `${mark.x}%`,
              top: `${mark.y}%`,
              fontSize: mark.size,
              color: accent,
              opacity: Math.min(mark.opacity * 1.35, 0.34),
              transform: [
                { rotate: `${mark.rotation}deg` },
              ],
            },
          ]}
        >
          {mark.text}
        </Text>
      ))}
    </View>
  );
}

function LevelNode({
  level,
  subject,
  accent,
  accentLight,
  selected,
  onPress,
}: {
  level: Level;
  subject: SubjectId;
  accent: string;
  accentLight: string;
  selected: boolean;
  onPress: () => void;
}) {
  const point = LEVEL_POINTS[level.number - 1];

  const isCurrent = level.state === 'current';
  const isCompleted = level.state === 'completed';
  const isLocked = level.state === 'locked';

  return (
    <Pressable
      disabled={isLocked || !level.route}
      onPress={onPress}
      style={[
        styles.nodeWrapper,
        {
          left: point.x - 61,
          top: point.y - 61,
        },
      ]}
    >
      {isCurrent && (
        <View style={styles.driver}>
          <View
            style={[
              styles.driverDot,
              { backgroundColor: accent },
            ]}
          />
          <Text
            style={[
              styles.driverText,
              { color: accent },
            ]}
          >
            YOU ARE HERE
          </Text>
        </View>
      )}

      <LinearGradient
        colors={
          isLocked
            ? ['#F0ECE8', '#FFFDFB', '#F5F1EE']
            : [
                accentLight + 'DD',
                '#FFFDFB',
                accentLight + '88',
              ]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.levelHole,
          {
            borderColor: isLocked
              ? '#D9D2CC'
              : accent + (isCurrent ? 'DD' : '70'),
          },
          isCurrent && {
            borderWidth: 3,
          },
          selected && {
            transform: [{ scale: 1.035 }],
          },
        ]}
      >
        <View
          style={[
            styles.innerRing,
            {
              borderColor: isLocked
                ? '#D8D0CA'
                : accent + '45',
            },
          ]}
        >
          {isLocked ? (
            <Text style={styles.lockIcon}>🔒</Text>
          ) : isCompleted ? (
            <View
              style={[
                styles.completedCircle,
                { backgroundColor: accent },
              ]}
            >
              <Text style={styles.check}>✓</Text>
            </View>
          ) : (
            <SubjectObject
              subject={subject}
              object={level.object}
              accent={accent}
            />
          )}
        </View>

        <View
          style={[
            styles.numberBadge,
            {
              backgroundColor: isLocked
                ? '#BDB5AE'
                : accent,
            },
          ]}
        >
          <Text style={styles.numberText}>
            {level.number}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.nodeLabel}>
        <Text
          style={[
            styles.concept,
            {
              color: isLocked
                ? '#AAA19A'
                : accent,
            },
          ]}
        >
          {level.concept}
        </Text>

        <Text style={styles.nodeTitle}>
          {level.title}
        </Text>

        <Text style={styles.nodeStatus}>
          {isCurrent
            ? 'READY TO PLAY'
            : isCompleted
            ? 'COMPLETED'
            : 'LOCKED'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function GamesSubjectScreen() {
  const params = useLocalSearchParams<{
    subject?: string;
    completed?: string;
  }>();

  const router = useRouter();

  const completedLevel = Math.max(
    0,
    Math.min(5, Number(params.completed ?? '0')),
  );

  const requestedSubject =
    String(params.subject ?? 'vedic').toLowerCase();

  const subject: SubjectId =
    requestedSubject === 'arts'
      ? 'arts'
      : requestedSubject === 'manufacturing' ||
        requestedSubject === 'tech'
      ? 'manufacturing'
      : 'vedic';

  const config = SUBJECTS[subject];

  const levels = useMemo(
    () => createLevels(subject, completedLevel),
    [subject, completedLevel],
  );

  const [selectedLevel, setSelectedLevel] =
    useState(Math.min(completedLevel + 1, 5));

  const [showTransition, setShowTransition] =
    useState(false);

  const transitionProgress = useState(
    new Animated.Value(0),
  )[0];

  useEffect(() => {
    setSelectedLevel(
      Math.min(completedLevel + 1, 5),
    );

    if (completedLevel > 0) {
      setShowTransition(true);
      transitionProgress.setValue(0);

      Animated.timing(transitionProgress, {
        toValue: 1,
        duration: 1100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        setShowTransition(false);
      }, 1700);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [completedLevel, transitionProgress]);

  const selected =
    levels[selectedLevel - 1] ?? levels[0];

  const paths = getMainPaths();

  const openLevel = (level: Level) => {
    setSelectedLevel(level.number);

    if (
      level.state !== 'current' ||
      !level.route
    ) {
      return;
    }

    router.push(level.route as any);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.subjectTitle}>
              {config.title}
            </Text>

            <Text style={styles.subjectSubtitle}>
              {config.subtitle}
            </Text>
          </View>

          <View
            style={[
              styles.worldOrb,
              {
                borderColor: config.accent,
                backgroundColor:
                  config.accentLight,
              },
            ]}
          />
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>
            YOUR JOURNEY
          </Text>

          <Text style={styles.introTitle}>
            Learn → discover → build
          </Text>

          <Text style={styles.introSubtitle}>
            Each level grows from the idea before it.
          </Text>
        </View>

        <View
          style={[
            styles.map,
            { width: MAP_WIDTH },
          ]}
        >
          <WorldObjects subject={subject} />

          <WorldTypography
            subject={subject}
            accent={config.accent}
          />

          <Svg
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          >
            {/* soft subject atmosphere */}

            <Circle
              cx={MAP_WIDTH * 0.27}
              cy={140}
              r={115}
              fill={config.accentLight}
              opacity={0.13}
            />

            <Circle
              cx={MAP_WIDTH * 0.70}
              cy={300}
              r={125}
              fill={config.accentLight}
              opacity={0.11}
            />

            <Circle
              cx={MAP_WIDTH * 0.35}
              cy={500}
              r={135}
              fill={config.accentLight}
              opacity={0.10}
            />

            <Circle
              cx={MAP_WIDTH * 0.70}
              cy={650}
              r={125}
              fill={config.accentLight}
              opacity={0.10}
            />

            {/* knowledge route */}

            {paths.map((path, index) => (
              <Path
                key={`future-${index}`}
                d={path}
                fill="none"
                stroke="#DDD6D0"
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}

            {paths
              .slice(0, completedLevel)
              .map((path, index) => (
                <Path
                  key={`done-${index}`}
                  d={path}
                  fill="none"
                  stroke={config.accent}
                  strokeOpacity={0.82}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              ))}

            {/* small conceptual marks, not level nodes */}

            <Circle
              cx={MAP_WIDTH * 0.12}
              cy={235}
              r={5}
              fill={config.accent}
              opacity={0.25}
            />

            <Circle
              cx={MAP_WIDTH * 0.86}
              cy={455}
              r={5}
              fill={config.accent}
              opacity={0.25}
            />

            <Circle
              cx={MAP_WIDTH * 0.16}
              cy={650}
              r={4}
              fill={config.accent}
              opacity={0.22}
            />
          </Svg>

          {levels.map((level) => (
            <LevelNode
              key={level.number}
              level={level}
              subject={subject}
              accent={config.accent}
              accentLight={config.accentLight}
              selected={
                selectedLevel === level.number
              }
              onPress={() => openLevel(level)}
            />
          ))}

          <View style={styles.premiumHorizon}>
            <View
              style={[
                styles.premiumLine,
                {
                  backgroundColor:
                    config.accentLight,
                },
              ]}
            />

            <Text style={styles.premiumEyebrow}>
              MORE DISCOVERIES
            </Text>

            <Text style={styles.premiumTitle}>
              Levels 6+
            </Text>

            <Text style={styles.premiumSubtitle}>
              Premium subject worlds
            </Text>

            <Text style={styles.premiumLock}>
              🔒
            </Text>
          </View>

          {showTransition && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.transitionBanner,
                {
                  opacity:
                    transitionProgress.interpolate({
                      inputRange: [0, 0.35, 1],
                      outputRange: [0, 1, 0],
                    }),
                  transform: [
                    {
                      translateY:
                        transitionProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [12, -8],
                        }),
                    },
                  ],
                },
              ]}
            >
              <Text
                style={[
                  styles.transitionTitle,
                  { color: config.accent },
                ]}
              >
                LEVEL {completedLevel} COMPLETE ✨
              </Text>

              <Text style={styles.transitionNext}>
                LEVEL{' '}
                {Math.min(
                  completedLevel + 1,
                  5,
                )}{' '}
                UNLOCKED
              </Text>
            </Animated.View>
          )}
        </View>

        <View style={styles.levelPanel}>
          <View style={styles.panelTop}>
            <View style={styles.panelTitles}>
              <Text
                style={[
                  styles.panelEyebrow,
                  { color: config.accent },
                ]}
              >
                LEVEL {selected.number}
              </Text>

              <Text style={styles.panelTitle}>
                {selected.title}
              </Text>
            </View>

            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor:
                    selected.state === 'locked'
                      ? '#BDB5AE'
                      : config.accent,
                },
              ]}
            >
              <Text style={styles.statusText}>
                {selected.state === 'current'
                  ? 'READY'
                  : selected.state === 'completed'
                  ? 'DONE'
                  : 'LOCKED'}
              </Text>
            </View>
          </View>

          <Text style={styles.description}>
            {selected.description}
          </Text>

          {selected.state === 'current' &&
          selected.route ? (
            <Pressable
              onPress={() => openLevel(selected)}
              style={[
                styles.beginButton,
                {
                  backgroundColor:
                    config.accent,
                },
              ]}
            >
              <Text style={styles.beginText}>
                PLAY LEVEL {selected.number}
              </Text>

              <Text style={styles.beginArrow}>
                →
              </Text>
            </Pressable>
          ) : selected.state === 'locked' ? (
            <View style={styles.lockMessage}>
              <Text style={styles.lockMessageIcon}>
                🔒
              </Text>

              <Text style={styles.lockMessageText}>
                Complete Level{' '}
                {Math.max(
                  1,
                  selected.number - 1,
                )}{' '}
                to unlock this discovery.
              </Text>
            </View>
          ) : (
            <View style={styles.doneMessage}>
              <Text
                style={[
                  styles.doneIcon,
                  {
                    backgroundColor:
                      config.accent,
                  },
                ]}
              >
                ✓
              </Text>

              <Text style={styles.doneMessageText}>
                You discovered this part of the
                subject world.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },

  scrollContent: {
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 10,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFDFB',
    borderWidth: 1,
    borderColor: '#E9E1DA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: 35,
    color: '#4A4542',
    lineHeight: 38,
    marginTop: -4,
  },

  headerText: {
    flex: 1,
    paddingHorizontal: 14,
  },

  subjectTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#34313A',
  },

  subjectSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#817873',
  },

  worldOrb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
  },

  intro: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: '#A39A94',
  },

  introTitle: {
    marginTop: 5,
    fontSize: 25,
    fontWeight: '800',
    color: '#34313A',
  },

  introSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#817873',
  },

  map: {
    height: MAP_HEIGHT,
    position: 'relative',
  },

  worldLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },

  worldObjectLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },

  worldObject: {
    position: 'absolute',
    fontWeight: '600',
  },

  worldMark: {
    position: 'absolute',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  nodeWrapper: {
    position: 'absolute',
    width: 122,
    alignItems: 'center',
    zIndex: 5,
  },

  levelHole: {
    width: 122,
    height: 122,
    borderRadius: 61,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,

    shadowColor: '#675B54',
    shadowOpacity: 0.13,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 5,
  },

  innerRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  objectCore: {
    minWidth: 65,
    minHeight: 56,
    borderRadius: 20,
    backgroundColor: '#FFFFFFB8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  objectText: {
    fontWeight: '900',
  },

  completedCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },

  check: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },

  lockIcon: {
    fontSize: 22,
    opacity: 0.62,
  },

  numberBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#FFFDFB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  numberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  nodeLabel: {
    width: 170,
    alignItems: 'center',
    marginTop: 8,
  },

  concept: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  nodeTitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    color: '#514A46',
    textAlign: 'center',
  },

  nodeStatus: {
    marginTop: 3,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#A09892',
  },

  driver: {
    position: 'absolute',
    bottom: 132,
    width: 150,
    alignItems: 'center',
    zIndex: 20,
  },

  driverDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginBottom: 4,
  },

  driverText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  premiumHorizon: {
    position: 'absolute',
    left: 28,
    right: 28,
    top: 835,
    alignItems: 'center',
  },

  premiumLine: {
    width: '100%',
    height: 2,
    marginBottom: 14,
    opacity: 0.7,
  },

  premiumEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#A09892',
  },

  premiumTitle: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '900',
    color: '#706861',
  },

  premiumSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#9B928B',
  },

  premiumLock: {
    marginTop: 5,
    fontSize: 18,
    opacity: 0.55,
  },

  transitionBanner: {
    position: 'absolute',
    top: 35,
    left: 30,
    right: 30,
    alignItems: 'center',
    backgroundColor: '#FFFDFB',
    borderRadius: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E9E1DA',
    elevation: 7,
  },

  transitionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  transitionNext: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: '900',
    color: '#34313A',
  },

  levelPanel: {
    marginHorizontal: 20,
    marginTop: 4,
    padding: 20,
    borderRadius: 26,
    backgroundColor: '#FFFDFB',
    borderWidth: 1,
    borderColor: '#E9E1DA',
  },

  panelTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  panelTitles: {
    flex: 1,
  },

  panelEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  panelTitle: {
    marginTop: 4,
    fontSize: 21,
    fontWeight: '900',
    color: '#34313A',
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 13,
  },

  statusText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  description: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: '#706861',
  },

  beginButton: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  beginText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  beginArrow: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },

  lockMessage: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F3EFEC',
    flexDirection: 'row',
    alignItems: 'center',
  },

  lockMessageIcon: {
    fontSize: 20,
    marginRight: 10,
  },

  lockMessageText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#766E68',
  },

  doneMessage: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  doneIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    color: '#FFFFFF',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 21,
    fontWeight: '900',
    marginRight: 10,
  },

  doneMessageText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#766E68',
  },

  bottomSpace: {
    height: 30,
  },
});
