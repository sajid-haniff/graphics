# Weighted Union-Find Algorithm

## Introduction

The Weighted Union-Find algorithm is an efficient data structure and algorithm for maintaining disjoint sets. It's particularly useful for solving connectivity problems in graphs, image processing, and network analysis. This algorithm provides near-constant time operations for unioning sets and checking if two elements are in the same set.

## Key Concepts

1. **Union**: The operation of merging two sets.
2. **Find**: The operation of determining which set an element belongs to.
3. **Weighting**: A strategy to keep the tree balanced by always attaching the smaller tree to the root of the larger tree during union operations.

## Algorithm Details

### Initialization

1. Create an array `id` where each element points to itself (each element is in its own set).
2. Create an array `sz` to keep track of the size of each tree, initially set to 1 for all elements.

```mermaid
graph TD
    0((0)) --> 0
    1((1)) --> 1
    2((2)) --> 2
    3((3)) --> 3
    4((4)) --> 4