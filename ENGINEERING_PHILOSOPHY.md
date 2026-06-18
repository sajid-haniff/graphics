# ENGINEERING PHILOSOPHY.md

## Purpose

This repository is my personal **Computer Science Canon**.

The objective is **not** to build products.

The objective is to reconstruct and deepen my understanding of computer science, mathematics, graphics, algorithms, physics, AI, compilers, systems, and software engineering through implementation.

The primary goal is:

```text
Increase engineering agency through
first-principles understanding
and effective AI leverage.
```

AI should **accelerate implementation**, **reduce friction**, and **improve educational artifacts**, but should never replace understanding, architecture, judgment, or review.

---

# Core Philosophy

I care much more about:

```text
Representation
Transformation
Invariants
Abstraction
Emergence
```

than individual technologies.

Examples:

| Domain           | Underlying Idea          |
| ---------------- | ------------------------ |
| FFT              | Change representation    |
| Raytracer        | Change coordinate system |
| Compiler         | Transform representation |
| Fluid Simulation | Enforce invariants       |
| Union Find       | Connectivity invariant   |
| Geometry         | Geometric predicates     |
| RL               | Value estimation         |
| Boids            | Emergent behavior        |
| Scenegraph       | Hierarchical transforms  |

I strongly prefer implementations that resemble the mathematical derivation that generated them.

I dislike implementations where the derivation disappears behind opaque helper calls.

---

# Educational Workflow

Every artifact should follow:

```text
Mathematics
        ↓
Derivation
        ↓
Implementation
        ↓
Visualization
        ↓
Documentation
        ↓
Engineering Insight
```

Success is not merely having working code.

Success means someone can understand:

* The mathematics
* The algorithm
* The implementation
* The engineering decisions
* The visualization

from the repository.

---

# Preferred Repository Structure

Each topic should ideally contain:

```text
topic/

    algorithm.js

    algorithm-demo.js

    docs/

        topic.md

        svg/

```

Examples:

```text
union-find/

    weighted-quick-union.js

    union-find-demo.js

    docs/


fft/

    fft.js

    fft-demo.js

    docs/


triangle-circles/

    triangle-circles.js

    triangle-circles-demo.js

    docs/
```

---

# Coding Style

## Prefer

Functional style

Factory functions

Closures

Plain objects

Composable helpers

Small modules

Explicit transforms

Visible mathematics

Pure functions where practical

Parameterization

Educational readability

---

## Avoid

ES6 Classes

Framework abstractions

Premature optimization

SIMD tricks

Bit hacks

Clever code

Large inheritance hierarchies

Abstractions that hide mathematics

---

# p5.js

All p5 APIs must be accessed through `sk`.

Prefer:

```js
sk.stroke()

sk.fill()

sk.random()

sk.createVector()
```

Never:

```js
stroke()

fill()

random()
```

---

# Mathematics Libraries

## V

Use wrapper methods only.

Examples:

```js
V.create()

V.add()

V.sub()

V.scale()

V.distance()

V.normalize()
```

Do not invent methods.

---

## M2D

Use wrapper methods.

Examples:

```js
M2D.multiply()

M2D.compose()

M2D.makePixelToWorld()

M2D.toArgs()
```

Do not invent methods.

---

# Coordinate Conventions

World coordinates are:

```text
Y-up
```

Rendering uses:

```text
COMPOSITE

=
REFLECT_Y
· DEVICE
· WORLD
```

Apply:

```js
sk.resetMatrix();

sk.applyMatrix(
    ...M2D.toArgs(COMPOSITE)
);
```

Pixel consistency:

```js
const pixelToWorld =
    M2D.makePixelToWorld(COMPOSITE);
```

---

# Demo Structure

Demos should export a factory.

Example:

```js
export const createSomething = (
    sk,
    W = 640,
    H = 480
) => {

    return {

        setup(){},

        display(){}

    };

};
```

Register in:

```text
src/demos.js
```

using dynamic imports.

---

# Mathematical Preference

I strongly prefer implementations where:

```text
The implementation resembles the theorem.
```

Examples:

## Good

Incircle

```text
a = |BC|

b = |CA|

c = |AB|

I =
(aA+bB+cC)/(a+b+c)
```

Code:

```js
const I = ...
```

---

## Less Preferred

```js
ctx.incircle(...)
```

without visible derivation.

---

# Documentation Standards

There are two kinds of documentation.

---

## 1. Source Documentation

JSDoc

Small why-comments

Engineering decisions

Implementation rationale

Examples:

Good:

```js
// replicate padding
// avoids special border handling
```

Bad:

```js
// increment i
```

---

## 2. Educational Documentation

Markdown

SVG diagrams

Mathematics

Algorithm explanation

Implementation mapping

Complexity analysis

Interactive notes

---

Preferred structure:

```text
Motivation

Mathematics

Visual Walkthrough

Algorithm

Implementation Mapping

Engineering Decisions

Complexity

Demo Notes

Extensions
```

---

# AI Collaboration

Human responsibilities:

Architecture

Review

Taste

Judgment

Design

First-principles reasoning

AI responsibilities:

Implementation

Boilerplate

Refactoring

Documentation

SVG generation

Code comments

Build verification

---

# Development Workflow

1. Human defines objective.

2. AI creates feature branch.

3. AI implements.

4. AI updates demos.

5. AI builds.

6. Human reviews.

7. AI adds source docs.

8. Educational docs produced.

9. SVG diagrams created.

10. Human approves.

11. Merge into main.

---

# Long-Term Topics

Graphics

Raytracer

PHIGS renderer

Scenegraph

Rasterization

Computational Geometry

Delaunay

Voronoi

Incircle

Convex Hull

Algorithms

Sedgewick

Union Find

Trees

Graphs

AI

Norvig

Search

CSP

RL

Physics

Boids

Stable Fluids

Springs

Rigid Bodies

Compilers

Lexer

Recursive Descent

Pratt

LR

AST

Bytecode

Systems

Packet Sniffer

Filesystem

Kernel Module

Device Driver

Games

Asteroids

Breakout

Space Invaders

RL Environments

---

# Fundamental Principle

> The implementation should resemble the mathematical object that generated it.

Everything else in this repository follows from that principle.