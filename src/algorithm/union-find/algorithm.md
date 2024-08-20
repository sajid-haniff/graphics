# Weighted Union-Find Algorithm

The **Weighted Union-Find** algorithm is a data structure that efficiently handles dynamic connectivity queries, such as determining whether two elements are in the same connected component or merging two components.

## Key Concepts

- **Union**: Connects two elements by linking their components.
- **Find**: Identifies the root of the component containing a given element.
- **Weighting**: Ensures that smaller trees are always added under larger trees to keep the structure flat and efficient.

## Steps of the Algorithm

### 1. Initialization
Each element is initially its own root.
- The `id` array keeps track of the parent for each element.
- The `sz` array stores the size of the tree rooted at each element.

```mermaid
graph LR
A[0] --> A
B[1] --> B
C[2] --> C
D[3] --> D
E[4] --> E
